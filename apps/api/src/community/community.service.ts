import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CommunityMeDto,
  CommunityProfileDto,
  ProfileTicketsDto,
  UpdateCommunityProfileInput,
} from '@oddzilla/shared';

const SETTLED_STATUSES = ['won', 'lost', 'void'] as const;

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileByNickname(nickname: string): Promise<CommunityProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { nickname } });
    if (!user || !user.ticketsPublic) {
      throw new NotFoundException('Profile not found');
    }

    // Stats computed over a recent sample of settled tickets. The
    // CommunityTicket projection in Phase C-2 replaces this scan with
    // an indexed denormalised read.
    const tickets = await this.prisma.ticket.findMany({
      where: { userId: user.id, status: { in: SETTLED_STATUSES } },
      orderBy: { settledAt: 'desc' },
      take: 100,
    });

    const settled = tickets.filter((t) => t.status !== 'void');
    const won = settled.filter((t) => t.status === 'won');
    const winRate = settled.length === 0 ? 0 : won.length / settled.length;

    const totalStake = settled.reduce((acc, t) => acc + Number(t.stakeUsdt), 0);
    const totalReturn = won.reduce(
      (acc, t) => acc + Number(t.stakeUsdt) * Number(t.totalOdds),
      0,
    );
    const roi = totalStake === 0 ? 0 : (totalReturn - totalStake) / totalStake;

    return {
      nickname: user.nickname!,
      displayName: user.displayName,
      bio: user.bio,
      joinedAt: user.createdAt.toISOString(),
      winRate: Number(winRate.toFixed(4)),
      roi: Number(roi.toFixed(4)),
      totalSettled: settled.length,
      badgeCount: 0,
    };
  }

  async getProfileTickets(
    nickname: string,
    page: number,
    pageSize: number,
  ): Promise<ProfileTicketsDto> {
    const user = await this.prisma.user.findUnique({ where: { nickname } });
    if (!user || !user.ticketsPublic) {
      throw new NotFoundException('Profile not found');
    }

    const where = {
      userId: user.id,
      status: { in: SETTLED_STATUSES },
    };

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { settledAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          selections: {
            include: {
              outcome: { include: { market: { include: { match: true } } } },
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      tickets: tickets.map((t) => {
        const stake = Number(t.stakeUsdt);
        const odds = Number(t.totalOdds);
        const payout =
          t.status === 'won'
            ? Number((stake * odds).toFixed(2))
            : t.status === 'void'
              ? stake
              : 0;
        return {
          id: t.id,
          status: t.status as 'won' | 'lost' | 'void',
          stakeUsdt: stake,
          totalOdds: odds,
          payoutUsdt: payout,
          settledAt: t.settledAt!.toISOString(),
          selections: t.selections.map((sel) => ({
            outcomeLabel: sel.outcome.label,
            matchHome: sel.outcome.market.match.homeName,
            matchAway: sel.outcome.market.match.awayName,
            priceAtSubmit: Number(sel.priceAtSubmit),
            status: sel.status,
          })),
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async getMe(userId: string): Promise<CommunityMeDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      nickname: user.nickname,
      bio: user.bio,
      ticketsPublic: user.ticketsPublic,
    };
  }

  async updateVisibility(userId: string, ticketsPublic: boolean): Promise<CommunityMeDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ticketsPublic },
    });
    return {
      nickname: user.nickname,
      bio: user.bio,
      ticketsPublic: user.ticketsPublic,
    };
  }

  async updateCommunityProfile(
    userId: string,
    input: UpdateCommunityProfileInput,
  ): Promise<CommunityMeDto> {
    const data: { nickname?: string | null; bio?: string | null } = {};
    if (input.nickname !== undefined) data.nickname = input.nickname;
    if (input.bio !== undefined) data.bio = input.bio;

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
      });
      return {
        nickname: user.nickname,
        bio: user.bio,
        ticketsPublic: user.ticketsPublic,
      };
    } catch (err: unknown) {
      const e = err as { code?: string; meta?: { target?: string[] | string } };
      const target = e?.meta?.target;
      const isNicknameConflict =
        e?.code === 'P2002' &&
        (Array.isArray(target) ? target.includes('nickname') : target === 'nickname');
      if (isNicknameConflict) {
        throw new ConflictException('Nickname is already taken');
      }
      throw err;
    }
  }
}
