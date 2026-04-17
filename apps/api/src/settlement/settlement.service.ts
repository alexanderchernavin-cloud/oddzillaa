import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async settleMarket(
    marketSourceFeedId: string,
    matchFeedId: string,
    outcomes: Array<{ feedId: string; result: 'won' | 'lost' | 'void' }>,
  ): Promise<void> {
    const match = await this.prisma.match.findFirst({
      where: { feedId: matchFeedId, source: 'oddin' },
    });
    if (!match) {
      this.logger.warn(`Settlement: no match for feedId=${matchFeedId}`);
      return;
    }

    const market = await this.prisma.market.findFirst({
      where: { feedId: marketSourceFeedId, matchId: match.id, source: 'oddin' },
      include: { outcomes: true },
    });
    if (!market) {
      this.logger.warn(`Settlement: no market feedId=${marketSourceFeedId} for match=${matchFeedId}`);
      return;
    }

    for (const ocResult of outcomes) {
      const outcome = market.outcomes.find((o) => o.feedId === ocResult.feedId);
      if (outcome) {
        await this.prisma.outcome.update({
          where: { id: outcome.id },
          data: { result: ocResult.result as any },
        });
      }
    }

    await this.prisma.market.update({
      where: { id: market.id },
      data: { status: 'settled' },
    });

    await this.resolveTickets(market.outcomes.map((o) => o.id));

    this.logger.log(`Settled market ${marketSourceFeedId} for match ${matchFeedId}`);
  }

  async cancelMarket(marketFeedId: string, matchFeedId: string): Promise<void> {
    const match = await this.prisma.match.findFirst({
      where: { feedId: matchFeedId, source: 'oddin' },
    });
    if (!match) {
      this.logger.warn(`Cancel: no match for feedId=${matchFeedId}`);
      return;
    }

    const market = await this.prisma.market.findFirst({
      where: { feedId: marketFeedId, matchId: match.id, source: 'oddin' },
      include: { outcomes: true },
    });
    if (!market) {
      this.logger.warn(`Cancel: no market feedId=${marketFeedId} for match=${matchFeedId}`);
      return;
    }

    for (const outcome of market.outcomes) {
      await this.prisma.outcome.update({
        where: { id: outcome.id },
        data: { result: 'void' as any },
      });
    }

    await this.prisma.market.update({
      where: { id: market.id },
      data: { status: 'cancelled' },
    });

    await this.resolveTickets(market.outcomes.map((o) => o.id));

    this.logger.log(`Cancelled market ${marketFeedId} for match ${matchFeedId}`);
  }

  private async resolveTickets(outcomeIds: string[]): Promise<void> {
    const selections = await this.prisma.ticketSelection.findMany({
      where: { outcomeId: { in: outcomeIds } },
      include: {
        outcome: true,
        ticket: {
          include: { selections: { include: { outcome: true } } },
        },
      },
    });

    const ticketIds = new Set<string>();
    for (const sel of selections) {
      ticketIds.add(sel.ticketId);
    }

    for (const ticketId of ticketIds) {
      await this.resolveTicket(ticketId);
    }
  }

  private async resolveTicket(ticketId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { selections: { include: { outcome: true } } },
    });
    if (!ticket || ticket.status !== 'accepted') return;

    for (const sel of ticket.selections) {
      const r = sel.outcome.result;
      await this.prisma.ticketSelection.update({
        where: { id: sel.id },
        data: {
          status: r === 'won' ? 'won' : r === 'lost' ? 'lost' : r === 'void' ? 'void' : 'pending',
        },
      });
    }

    const allResolved = ticket.selections.every(
      (sel) => sel.outcome.result !== 'unsettled',
    );
    if (!allResolved) return;

    const anyLost = ticket.selections.some(
      (sel) => sel.outcome.result === 'lost',
    );
    const allVoid = ticket.selections.every(
      (sel) => sel.outcome.result === 'void',
    );

    let finalStatus: 'won' | 'lost' | 'void';
    if (allVoid) {
      finalStatus = 'void';
    } else if (anyLost) {
      finalStatus = 'lost';
    } else {
      finalStatus = 'won';
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: finalStatus, settledAt: new Date() },
    });

    const stake = Number(ticket.stakeUsdt);
    const odds = Number(ticket.totalOdds);
    let payout = 0;

    if (finalStatus === 'won') {
      payout = Number((stake * odds).toFixed(2));
      await this.wallet.payout(ticket.userId, payout);
    } else if (finalStatus === 'void') {
      payout = stake;
      await this.wallet.payout(ticket.userId, stake);
    }

    await this.redis.publish(
      `ticket:${ticket.userId}`,
      JSON.stringify({
        ticketId: ticket.id,
        status: finalStatus,
        payout,
      }),
    );
  }
}
