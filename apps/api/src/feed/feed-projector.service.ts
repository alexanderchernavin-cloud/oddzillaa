import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from './pricing.service';
import type { OddsChangeMsg, OddsChangeMarket, OddsChangeOutcome } from './xml-parser.service';
import { Prisma } from '@oddzilla/db';

const SRC = 'oddin' as const;

@Injectable()
export class FeedProjectorService {
  private readonly logger = new Logger(FeedProjectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async projectOddsChange(msg: OddsChangeMsg): Promise<void> {
    const eventId = msg.event_id;
    const match = await this.prisma.match.findFirst({
      where: { feedId: eventId, source: SRC },
    });

    if (!match) {
      this.logger.warn(`No match found for feedId=${eventId}, skipping odds_change`);
      return;
    }

    if (msg.sport_event_status) {
      const statusMap: Record<number, string> = {
        0: 'scheduled',
        1: 'live',
        3: 'finished',
        4: 'cancelled',
        5: 'postponed',
        100: 'finished',
      };
      const newStatus = statusMap[msg.sport_event_status.status];
      if (newStatus) {
        await this.prisma.match.update({
          where: { id: match.id },
          data: {
            status: newStatus as any,
            homeScore: msg.sport_event_status.home_score ?? undefined,
            awayScore: msg.sport_event_status.away_score ?? undefined,
          },
        });
      }
    }

    const markets = msg.odds?.market;
    if (!markets) return;

    const marketArr = Array.isArray(markets) ? markets : [markets];

    for (const mkt of marketArr) {
      await this.upsertMarket(match.id, mkt);
    }

    await this.pricing.priceAndPublish(match.id);
  }

  private async upsertMarket(matchId: string, mkt: OddsChangeMarket): Promise<void> {
    const feedId = String(mkt.id);
    const specifier = mkt.specifiers ?? '';
    const type = this.guessMarketType(mkt.id, specifier || null);
    const feedStatusMap: Record<number, 'open' | 'suspended' | 'settled' | 'cancelled'> = {
      1: 'open',
      0: 'suspended',
      '-1': 'suspended',
      2: 'open',
      3: 'settled',
      4: 'cancelled',
    };
    const status = feedStatusMap[mkt.status] ?? 'open';

    const market = await this.prisma.market.upsert({
      where: {
        source_feedId_matchId_specifier: {
          source: SRC,
          feedId,
          matchId,
          specifier,
        },
      },
      update: {
        status,
        favourite: !!mkt.favourite,
        feedStatus: mkt.status,
      },
      create: {
        source: SRC,
        feedId,
        matchId,
        type: type as any,
        specifier,
        status,
        favourite: !!mkt.favourite,
        feedStatus: mkt.status,
      },
    });

    const outcomes = mkt.outcome;
    if (!outcomes) return;
    const outcomeArr = Array.isArray(outcomes) ? outcomes : [outcomes];

    for (const oc of outcomeArr) {
      await this.upsertOutcome(market.id, oc);
    }
  }

  private async upsertOutcome(marketId: string, oc: OddsChangeOutcome): Promise<void> {
    const feedId = String(oc.id);
    const feedPrice = new Prisma.Decimal(oc.odds);
    const ocStatus = oc.active === 1 ? 'active' : 'inactive';

    await this.prisma.outcome.upsert({
      where: {
        source_feedId_marketId: {
          source: SRC,
          feedId,
          marketId,
        },
      },
      update: {
        feedPrice,
        status: ocStatus as any,
      },
      create: {
        source: SRC,
        feedId,
        marketId,
        label: this.labelFromId(feedId),
        feedPrice,
        status: ocStatus as any,
      },
    });
  }

  private guessMarketType(marketId: number, specifier: string | null): string {
    if (specifier && specifier.includes('map=')) return 'map_winner';
    return 'match_winner';
  }

  private labelFromId(feedId: string): string {
    if (feedId.includes('home')) return 'Home';
    if (feedId.includes('away')) return 'Away';
    if (feedId.includes('draw')) return 'Draw';
    return feedId;
  }
}
