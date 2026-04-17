import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { MatchDto, SportDto } from '@oddzilla/shared';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSports(): Promise<SportDto[]> {
    const sports = await this.prisma.sport.findMany({
      include: { categories: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return sports.map((s) => ({
      id: s.id,
      name: s.name,
      categories: s.categories.map((c) => ({ id: c.id, name: c.name })),
    }));
  }

  async getMatches(opts: {
    status?: 'live' | 'scheduled' | 'finished';
    limit: number;
  }): Promise<MatchDto[]> {
    const where: any = {};
    if (opts.status) {
      where.status = opts.status;
    } else {
      where.status = { in: ['live', 'scheduled'] };
    }

    const matches = await this.prisma.match.findMany({
      where,
      take: Math.min(opts.limit, 100),
      orderBy: { startTime: 'asc' },
      include: {
        markets: {
          include: { outcomes: true },
        },
        tournament: {
          include: {
            category: {
              include: { sport: true },
            },
          },
        },
      },
    });

    return matches.map((m) => this.toDto(m));
  }

  async getMatch(id: string): Promise<MatchDto> {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        markets: {
          include: { outcomes: true },
        },
        tournament: {
          include: {
            category: {
              include: { sport: true },
            },
          },
        },
      },
    });

    if (!match) throw new NotFoundException('Match not found');
    return this.toDto(match);
  }

  private toDto(m: any): MatchDto {
    return {
      id: m.id,
      feedId: m.feedId,
      homeName: m.homeName,
      awayName: m.awayName,
      startTime: m.startTime.toISOString(),
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      sportName: m.tournament?.category?.sport?.name ?? 'Unknown',
      tournamentName: m.tournament?.name ?? 'Unknown',
      markets: (m.markets ?? []).map((mkt: any) => ({
        id: mkt.id,
        feedId: mkt.feedId,
        type: mkt.type,
        specifier: mkt.specifier || null,
        status: mkt.status,
        favourite: mkt.favourite,
        outcomes: (mkt.outcomes ?? []).map((oc: any) => ({
          id: oc.id,
          feedId: oc.feedId,
          label: oc.label,
          price: oc.adjustedPrice ? Number(oc.adjustedPrice) : null,
          status: oc.status,
          result: oc.result,
        })),
      })),
    };
  }
}
