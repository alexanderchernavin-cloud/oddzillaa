import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CommunityFeedDto,
  CommunityFeedSort,
  CommunityMeDto,
  CommunityProfileDto,
  ProfileTicketsDto,
  UpdateCommunityProfileInput,
} from '@oddzilla/shared';

const PROFILE_STATS_SAMPLE = 100;

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfileByNickname(nickname: string): Promise<CommunityProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { nickname } });
    if (!user || !user.ticketsPublic) {
      throw new NotFoundException('Profile not found');
    }

    const sample = await this.prisma.communityTicket.findMany({
      where: { userId: user.id },
      orderBy: { settledAt: 'desc' },
      take: PROFILE_STATS_SAMPLE,
      select: { status: true, stakeUsdt: true, payoutUsdt: true },
    });

    const settled = sample.filter((t) => t.status !== 'void');
    const won = settled.filter((t) => t.status === 'won');
    const winRate = settled.length === 0 ? 0 : won.length / settled.length;

    const totalStake = settled.reduce((acc, t) => acc + Number(t.stakeUsdt), 0);
    const totalPayout = settled.reduce((acc, t) => acc + Number(t.payoutUsdt), 0);
    const roi = totalStake === 0 ? 0 : (totalPayout - totalStake) / totalStake;

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

    const where = { userId: user.id };
    const [items, total] = await Promise.all([
      this.prisma.communityTicket.findMany({
        where,
        orderBy: { settledAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          ticket: {
            include: {
              selections: {
                include: {
                  outcome: { include: { market: { include: { match: true } } } },
                },
              },
            },
          },
        },
      }),
      this.prisma.communityTicket.count({ where }),
    ]);

    return {
      tickets: items.map((ct) => ({
        id: ct.ticketId,
        status: ct.status as 'won' | 'lost' | 'void',
        stakeUsdt: Number(ct.stakeUsdt),
        totalOdds: Number(ct.totalOdds),
        payoutUsdt: Number(ct.payoutUsdt),
        settledAt: ct.settledAt.toISOString(),
        selections: ct.ticket.selections.map((sel) => ({
          outcomeLabel: sel.outcome.label,
          matchHome: sel.outcome.market.match.homeName,
          matchAway: sel.outcome.market.match.awayName,
          priceAtSubmit: Number(sel.priceAtSubmit),
          status: sel.status,
        })),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getFeed(opts: {
    sortBy: CommunityFeedSort;
    sportId?: string;
    page: number;
    pageSize: number;
  }): Promise<CommunityFeedDto> {
    // Visibility + sport filter is hoisted; the settled-status filter is
    // inlined at each call site so Prisma's contextual typing narrows the
    // string-literal array to TicketStatus[].
    const visibilityWhere = {
      user: { ticketsPublic: true, nickname: { not: null } },
      ...(opts.sportId ? { sportIds: { has: opts.sportId } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.communityTicket.findMany({
        where: {
          ...visibilityWhere,
          status: { in: ['won', 'lost', 'void'] },
        },
        orderBy: { settledAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
        include: {
          user: { select: { displayName: true, nickname: true } },
          ticket: {
            include: {
              selections: {
                include: {
                  outcome: { include: { market: { include: { match: true } } } },
                },
              },
            },
          },
        },
      }),
      this.prisma.communityTicket.count({
        where: {
          ...visibilityWhere,
          status: { in: ['won', 'lost', 'void'] },
        },
      }),
    ]);

    return {
      tickets: items.map((ct) => ({
        id: ct.id,
        author: {
          displayName: ct.user.displayName,
          // The where-clause guarantees nickname is not null here.
          nickname: ct.user.nickname!,
        },
        status: ct.status as 'won' | 'lost' | 'void',
        stakeUsdt: Number(ct.stakeUsdt),
        payoutUsdt: Number(ct.payoutUsdt),
        totalOdds: Number(ct.totalOdds),
        numLegs: ct.numLegs,
        settledAt: ct.settledAt.toISOString(),
        selections: ct.ticket.selections.map((sel) => ({
          outcomeLabel: sel.outcome.label,
          matchHome: sel.outcome.market.match.homeName,
          matchAway: sel.outcome.market.match.awayName,
          priceAtSubmit: Number(sel.priceAtSubmit),
          status: sel.status,
        })),
      })),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }

  // Called by SettlementService after a ticket reaches a terminal status.
  // Idempotent on Ticket.id thanks to CommunityTicket.ticketId @unique.
  async recordSettledTicket(ticketId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        selections: {
          include: {
            outcome: {
              include: {
                market: {
                  include: {
                    match: {
                      include: {
                        tournament: { include: { category: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!ticket || !ticket.settledAt) return;
    if (ticket.status !== 'won' && ticket.status !== 'lost' && ticket.status !== 'void') return;

    const stake = Number(ticket.stakeUsdt);
    const odds = Number(ticket.totalOdds);
    const payout =
      ticket.status === 'won'
        ? Number((stake * odds).toFixed(2))
        : ticket.status === 'void'
          ? stake
          : 0;

    const sportIds = Array.from(
      new Set(
        ticket.selections.map(
          (s) => s.outcome.market.match.tournament.category.sportId,
        ),
      ),
    );

    const data = {
      userId: ticket.userId,
      stakeUsdt: ticket.stakeUsdt,
      payoutUsdt: payout,
      totalOdds: ticket.totalOdds,
      numLegs: ticket.selections.length,
      status: ticket.status,
      sportIds,
      settledAt: ticket.settledAt,
    };

    await this.prisma.communityTicket.upsert({
      where: { ticketId: ticket.id },
      create: { ticketId: ticket.id, ...data },
      update: data,
    });
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
