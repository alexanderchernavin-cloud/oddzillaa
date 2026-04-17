import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Prisma } from '@oddzilla/db';
import type { PlaceTicketInput, TicketDto, TicketListDto } from '@oddzilla/shared';
import type { BetDelayJobData } from './bet-delay.processor';

export const BET_DELAY_QUEUE = 'BET_DELAY_QUEUE';

@Injectable()
export class BettingService {
  private readonly logger = new Logger(BettingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    @Inject(BET_DELAY_QUEUE) private readonly betDelayQueue: Queue<BetDelayJobData>,
  ) {}

  async placeTicket(userId: string, input: PlaceTicketInput): Promise<TicketDto> {
    const outcomes = await this.prisma.outcome.findMany({
      where: { id: { in: input.selections.map((s) => s.outcomeId) } },
      include: {
        market: {
          include: {
            match: true,
          },
        },
      },
    });

    if (outcomes.length !== input.selections.length) {
      throw new BadRequestException('One or more outcomes not found');
    }

    const marketGroups = new Map<string, number>();
    for (const oc of outcomes) {
      marketGroups.set(oc.marketId, (marketGroups.get(oc.marketId) ?? 0) + 1);
    }
    for (const [, count] of marketGroups) {
      if (count > 1) {
        throw new BadRequestException('Cannot select multiple outcomes from the same market');
      }
    }

    for (const oc of outcomes) {
      if (oc.market.status !== 'open') {
        throw new BadRequestException(`Market ${oc.market.feedId} is not open`);
      }
      if (oc.status !== 'active') {
        throw new BadRequestException(`Outcome ${oc.feedId} is not active`);
      }
    }

    const selMap = new Map(input.selections.map((s) => [s.outcomeId, s.priceAtSubmit]));
    for (const oc of outcomes) {
      const submitted = selMap.get(oc.id)!;
      const current = Number(oc.adjustedPrice);
      if (!current || Math.abs(current - submitted) / current > 0.05) {
        throw new BadRequestException(
          `Price changed for outcome ${oc.feedId}: submitted ${submitted}, current ${current}`,
        );
      }
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.selfExcludedUntil && user.selfExcludedUntil > new Date()) {
      throw new BadRequestException('Account is self-excluded from betting');
    }

    const globalLimit = Number(user.globalLimitUsdt);
    if (globalLimit > 0 && input.stakeUsdt > globalLimit) {
      throw new BadRequestException(`Stake exceeds global limit of ${globalLimit} USDT`);
    }

    await this.wallet.lockStake(userId, input.stakeUsdt);

    let totalOdds = 1;
    for (const sel of input.selections) {
      totalOdds *= sel.priceAtSubmit;
    }
    totalOdds = Number(totalOdds.toFixed(4));

    const ticket = await this.prisma.ticket.create({
      data: {
        userId,
        stakeUsdt: new Prisma.Decimal(input.stakeUsdt),
        totalOdds: new Prisma.Decimal(totalOdds),
        status: 'pending',
        selections: {
          create: input.selections.map((sel) => ({
            outcomeId: sel.outcomeId,
            priceAtSubmit: new Prisma.Decimal(sel.priceAtSubmit),
          })),
        },
      },
      include: {
        selections: {
          include: {
            outcome: {
              include: {
                market: { include: { match: true } },
              },
            },
          },
        },
      },
    });

    const betDelay = user.betDelaySeconds * 1000;
    if (betDelay > 0) {
      await this.betDelayQueue.add(
        'accept-or-reject',
        { ticketId: ticket.id },
        { delay: betDelay },
      );
    } else {
      await this.acceptOrReject(ticket.id);
    }

    return this.toDto(ticket);
  }

  async acceptOrReject(ticketId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        selections: { include: { outcome: { include: { market: true } } } },
      },
    });
    if (!ticket || ticket.status !== 'pending') return;

    for (const sel of ticket.selections) {
      if (sel.outcome.market.status !== 'open' || sel.outcome.status !== 'active') {
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'rejected', rejectReason: 'Market or outcome became unavailable' },
        });
        await this.wallet.unlockStake(ticket.userId, Number(ticket.stakeUsdt));
        return;
      }

      const current = Number(sel.outcome.adjustedPrice);
      const submitted = Number(sel.priceAtSubmit);
      if (current && Math.abs(current - submitted) / current > 0.05) {
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'rejected', rejectReason: 'Price moved beyond tolerance' },
        });
        await this.wallet.unlockStake(ticket.userId, Number(ticket.stakeUsdt));
        return;
      }
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    await this.wallet.deductStake(ticket.userId, Number(ticket.stakeUsdt));
  }

  async getTickets(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<TicketListDto> {
    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          selections: {
            include: {
              outcome: {
                include: { market: { include: { match: true } } },
              },
            },
          },
        },
      }),
      this.prisma.ticket.count({ where: { userId } }),
    ]);

    return {
      tickets: tickets.map((t) => this.toDto(t)),
      total,
      page,
      pageSize,
    };
  }

  async getTicket(userId: string, ticketId: string): Promise<TicketDto> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, userId },
      include: {
        selections: {
          include: {
            outcome: {
              include: { market: { include: { match: true } } },
            },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.toDto(ticket);
  }

  private toDto(t: any): TicketDto {
    const stake = Number(t.stakeUsdt);
    const odds = Number(t.totalOdds);
    return {
      id: t.id,
      stakeUsdt: stake,
      totalOdds: odds,
      potentialPayout: Number((stake * odds).toFixed(2)),
      status: t.status,
      rejectReason: t.rejectReason,
      submittedAt: t.submittedAt.toISOString(),
      acceptedAt: t.acceptedAt?.toISOString() ?? null,
      settledAt: t.settledAt?.toISOString() ?? null,
      selections: (t.selections ?? []).map((sel: any) => ({
        id: sel.id,
        outcomeId: sel.outcomeId,
        outcomeFeedId: sel.outcome?.feedId ?? '',
        outcomeLabel: sel.outcome?.label ?? '',
        marketType: sel.outcome?.market?.type ?? '',
        matchHome: sel.outcome?.market?.match?.homeName ?? '',
        matchAway: sel.outcome?.market?.match?.awayName ?? '',
        priceAtSubmit: Number(sel.priceAtSubmit),
        status: sel.status,
      })),
    };
  }
}
