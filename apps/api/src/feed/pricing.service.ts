import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { Prisma } from '@oddzilla/db';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private cachedMargin: number | null = null;
  private marginCachedAt = 0;
  private readonly MARGIN_TTL_MS = 10_000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async priceAndPublish(matchId: string): Promise<void> {
    const margin = await this.getMargin();

    const markets = await this.prisma.market.findMany({
      where: { matchId },
      include: { outcomes: true },
    });

    for (const market of markets) {
      const pricedOutcomes = market.outcomes.filter((o) => o.feedPrice);
      if (pricedOutcomes.length === 0) continue;

      // Multi-outcome overround normalization:
      // sumImpProb = sum of implied probabilities from feed prices
      // targetOR = 1 + margin (the overround we want)
      // adjustedPrice[i] = feedPrice[i] * sumImpProb / targetOR
      const sumImpProb = pricedOutcomes.reduce(
        (sum, o) => sum + 1 / Number(o.feedPrice),
        0,
      );
      const targetOR = 1 + margin;

      for (const outcome of pricedOutcomes) {
        const feed = Number(outcome.feedPrice);
        const adjusted = Number((feed * sumImpProb / targetOR).toFixed(2));
        await this.prisma.outcome.update({
          where: { id: outcome.id },
          data: { adjustedPrice: new Prisma.Decimal(adjusted) },
        });
      }
    }

    const freshMarkets = await this.prisma.market.findMany({
      where: { matchId },
      include: { outcomes: true },
    });

    const delta = {
      matchId,
      markets: freshMarkets.map((m) => ({
        id: m.id,
        status: m.status,
        outcomes: m.outcomes.map((o) => ({
          id: o.id,
          price: o.adjustedPrice ? Number(o.adjustedPrice) : null,
          status: o.status,
        })),
      })),
      ts: new Date().toISOString(),
    };

    await this.redis.publish(`match:${matchId}`, JSON.stringify(delta));
  }

  private async getMargin(): Promise<number> {
    const now = Date.now();
    if (this.cachedMargin !== null && now - this.marginCachedAt < this.MARGIN_TTL_MS) {
      return this.cachedMargin;
    }

    const setting = await this.prisma.adminSetting.findUnique({
      where: { key: 'default_payback_margin' },
    });
    this.cachedMargin = setting?.value ? Number(setting.value) : 0.05;
    this.marginCachedAt = now;
    return this.cachedMargin;
  }
}
