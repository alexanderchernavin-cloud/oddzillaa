import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import amqp from 'amqplib';
import type { Channel } from 'amqplib';
import { ENV_TOKEN } from '../../config/config.module';
import type { Env } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';

interface MockMatch {
  eventId: string;
  sportFeedId: string;
  home: string;
  away: string;
  markets: MockMarket[];
}

interface MockMarket {
  id: number;
  specifiers: string | null;
  outcomes: MockOutcome[];
  suspended: boolean;
  suspendCountdown: number;
}

interface MockOutcome {
  id: string;
  odds: number;
}

const MOCK_MATCHES_TEMPLATE: Array<{
  sportFeedId: string;
  eventId: string;
  home: string;
  away: string;
  extraMarkets: boolean;
}> = [
  { sportFeedId: 'sr:sport:cs2', eventId: 'od:match:1001', home: 'Navi', away: 'FaZe Clan', extraMarkets: false },
  { sportFeedId: 'sr:sport:dota2', eventId: 'od:match:1002', home: 'Team Spirit', away: 'Tundra Esports', extraMarkets: false },
  { sportFeedId: 'sr:sport:lol', eventId: 'od:match:1003', home: 'T1', away: 'Gen.G', extraMarkets: true },
  { sportFeedId: 'sr:sport:valorant', eventId: 'od:match:1004', home: 'Sentinels', away: 'LOUD', extraMarkets: true },
];

@Injectable()
export class MockProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MockProducerService.name);
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: Channel | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private settlementTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelTimer: ReturnType<typeof setTimeout> | null = null;
  private finishedTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly matches: MockMatch[] = [];
  private rng: () => number;

  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {
    this.rng = this.seedRng(this.env.MOCK_FEED_SEED);
  }

  async onModuleInit(): Promise<void> {
    if (!this.env.ENABLE_MOCK_FEED) return;

    this.logger.log('Mock producer ENABLED - seeding synthetic matches and starting ticks');
    await this.connectAmqp();
    await this.startCycle();
  }

  private async startCycle(): Promise<void> {
    this.matches.length = 0;
    this.rng = this.seedRng(Date.now() % 2147483647 || 42);
    await this.seedMatches();
    this.startTicking();
    this.scheduleCancellation();
    this.scheduleSettlement();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.cancelTimer) clearTimeout(this.cancelTimer);
    if (this.settlementTimer) clearTimeout(this.settlementTimer);
    if (this.finishedTimer) clearTimeout(this.finishedTimer);
    if (this.restartTimer) clearTimeout(this.restartTimer);
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore
    }
  }

  private async seedMatches(): Promise<void> {
    for (const tpl of MOCK_MATCHES_TEMPLATE) {
      const sport = await this.prisma.sport.findFirst({
        where: { feedId: tpl.sportFeedId, source: 'oddin' },
        include: { categories: true },
      });
      if (!sport || sport.categories.length === 0) {
        this.logger.warn(`Sport ${tpl.sportFeedId} not seeded, skipping mock match`);
        continue;
      }

      let tournament = await this.prisma.tournament.findFirst({
        where: { feedId: `mock:tournament:${tpl.sportFeedId}`, source: 'oddin' },
      });
      if (!tournament) {
        tournament = await this.prisma.tournament.create({
          data: {
            categoryId: sport.categories[0]!.id,
            feedId: `mock:tournament:${tpl.sportFeedId}`,
            source: 'oddin',
            name: `${sport.name} Mock Cup`,
          },
        });
      }

      await this.prisma.match.upsert({
        where: { source_feedId: { source: 'oddin', feedId: tpl.eventId } },
        update: { status: 'live', startTime: new Date() },
        create: {
          tournamentId: tournament.id,
          feedId: tpl.eventId,
          source: 'oddin',
          homeName: tpl.home,
          awayName: tpl.away,
          startTime: new Date(),
          status: 'live',
        },
      });

      const markets: MockMarket[] = [
        {
          id: 1,
          specifiers: null,
          outcomes: [
            { id: 'od:player:home', odds: 1.6 + this.rng() * 0.8 },
            { id: 'od:player:away', odds: 1.6 + this.rng() * 0.8 },
          ],
          suspended: false,
          suspendCountdown: 0,
        },
      ];

      if (tpl.extraMarkets) {
        markets.push({
          id: 2,
          specifiers: 'map=1',
          outcomes: [
            { id: 'od:player:home:map1', odds: 1.5 + this.rng() * 1.0 },
            { id: 'od:player:away:map1', odds: 1.5 + this.rng() * 1.0 },
          ],
          suspended: false,
          suspendCountdown: 0,
        });
      }

      this.matches.push({
        eventId: tpl.eventId,
        sportFeedId: tpl.sportFeedId,
        home: tpl.home,
        away: tpl.away,
        markets,
      });
    }

    this.logger.log(`Seeded ${this.matches.length} mock matches in DB`);
  }

  private async connectAmqp(): Promise<void> {
    this.connection = await amqp.connect(this.env.RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.env.ODDIN_EXCHANGE, 'topic', { durable: true });
    this.logger.log(`Mock producer connected to ${this.env.ODDIN_EXCHANGE}`);
  }

  private startTicking(): void {
    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.error(`Mock tick failed: ${(err as Error).message}`),
      );
    }, this.env.MOCK_FEED_TICK_MS);
  }

  private async tick(): Promise<void> {
    if (!this.channel) return;

    for (const match of this.matches) {
      for (const mkt of match.markets) {
        if (mkt.suspended) {
          mkt.suspendCountdown--;
          if (mkt.suspendCountdown <= 0) {
            mkt.suspended = false;
          }
          continue;
        }

        // 5% chance of suspension
        if (this.rng() < 0.05) {
          mkt.suspended = true;
          mkt.suspendCountdown = 2;
        }

        // Drift prices
        for (const oc of mkt.outcomes) {
          const drift = (this.rng() - 0.5) * 0.16;
          oc.odds = Math.max(1.01, Number((oc.odds + drift).toFixed(2)));
        }
      }

      const xml = this.buildOddsChangeXml(match);
      const routingKey = `hi.-.live.odds_change.${match.sportFeedId}.${match.eventId}`;

      this.channel.publish(
        this.env.ODDIN_EXCHANGE,
        routingKey,
        Buffer.from(xml),
        { contentType: 'application/xml' },
      );
    }
  }

  private buildOddsChangeXml(match: MockMatch): string {
    const ts = Date.now();
    const marketsXml = match.markets
      .map((mkt) => {
        const status = mkt.suspended ? 0 : 1;
        const specAttr = mkt.specifiers ? ` specifiers="${mkt.specifiers}"` : '';
        const outcomesXml = mkt.outcomes
          .map(
            (oc) =>
              `<outcome id="${oc.id}" odds="${oc.odds.toFixed(2)}" probabilities="${(1 / oc.odds).toFixed(4)}" active="${mkt.suspended ? 0 : 1}"/>`,
          )
          .join('');
        return `<market id="${mkt.id}"${specAttr} status="${status}" favourite="0">${outcomesXml}</market>`;
      })
      .join('');

    return `<odds_change product="1" event_id="${match.eventId}" timestamp="${ts}" request_id="0"><odds>${marketsXml}</odds></odds_change>`;
  }

  private scheduleCancellation(): void {
    this.cancelTimer = setTimeout(() => {
      this.cancelMapWinner().catch((err) =>
        this.logger.error(`Mock cancellation failed: ${(err as Error).message}`),
      );
    }, 45_000);
  }

  private async cancelMapWinner(): Promise<void> {
    if (!this.channel) return;

    const match = this.matches.find((m) => m.markets.some((mkt) => mkt.id !== 1));
    if (!match) return;

    const mapWinner = match.markets.find((mkt) => mkt.id !== 1);
    if (!mapWinner) return;

    const ts = Date.now();
    const xml = `<bet_cancel product="1" event_id="${match.eventId}" timestamp="${ts}"><market id="${mapWinner.id}" void_reason="1"/></bet_cancel>`;
    const routingKey = `hi.-.live.bet_cancel.${match.sportFeedId}.${match.eventId}`;

    this.channel.publish(this.env.ODDIN_EXCHANGE, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
    });

    this.logger.log(`Mock bet_cancel published for match ${match.eventId}, market ${mapWinner.id}`);
  }

  private scheduleSettlement(): void {
    this.settlementTimer = setTimeout(() => {
      this.settleMatches().catch((err) =>
        this.logger.error(`Mock settlement failed: ${(err as Error).message}`),
      );
    }, 60_000);
  }

  private async settleMatches(): Promise<void> {
    if (!this.channel) return;

    for (const match of this.matches) {
      const matchWinner = match.markets.find((m) => m.id === 1);
      if (!matchWinner) continue;

      const winnerIdx = this.rng() < 0.5 ? 0 : 1;
      const xml = this.buildBetSettlementXml(match.eventId, matchWinner, winnerIdx);
      const routingKey = `hi.-.live.bet_settlement.${match.sportFeedId}.${match.eventId}`;

      this.channel.publish(
        this.env.ODDIN_EXCHANGE,
        routingKey,
        Buffer.from(xml),
        { contentType: 'application/xml' },
      );
    }

    this.logger.log('Mock settlement published for all matches');
    this.scheduleFinished();
  }

  private scheduleFinished(): void {
    this.finishedTimer = setTimeout(() => {
      this.publishFinished().catch((err) =>
        this.logger.error(`Mock finished failed: ${(err as Error).message}`),
      );
    }, 15_000);
  }

  private async publishFinished(): Promise<void> {
    if (!this.channel) return;

    for (const match of this.matches) {
      const ts = Date.now();
      const homeScore = Math.floor(this.rng() * 3);
      const awayScore = Math.floor(this.rng() * 3);
      const xml = `<odds_change product="1" event_id="${match.eventId}" timestamp="${ts}"><sport_event_status status="100" home_score="${homeScore}" away_score="${awayScore}"/><odds/></odds_change>`;
      const routingKey = `hi.-.live.odds_change.${match.sportFeedId}.${match.eventId}`;

      this.channel.publish(this.env.ODDIN_EXCHANGE, routingKey, Buffer.from(xml), {
        contentType: 'application/xml',
      });
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.logger.log('Mock finished status published — restarting cycle in 10 s');
    this.restartTimer = setTimeout(() => {
      this.startCycle().catch((err) =>
        this.logger.error(`Mock cycle restart failed: ${(err as Error).message}`),
      );
    }, 10_000);
  }

  private buildBetSettlementXml(eventId: string, mkt: MockMarket, winnerIdx: number): string {
    const ts = Date.now();
    const outcomesXml = mkt.outcomes
      .map((oc, i) => `<outcome id="${oc.id}" result="${i === winnerIdx ? 1 : 0}"/>`)
      .join('');
    return `<bet_settlement product="1" event_id="${eventId}" timestamp="${ts}"><outcomes><market id="${mkt.id}">${outcomesXml}</market></outcomes></bet_settlement>`;
  }

  private seedRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}
