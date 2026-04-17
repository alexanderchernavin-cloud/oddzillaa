import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import amqp from 'amqplib';
import type { Channel, ConsumeMessage } from 'amqplib';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { XmlParserService } from './xml-parser.service';
import { FeedProjectorService } from './feed-projector.service';
import { SettlementService } from '../settlement/settlement.service';

@Injectable()
export class FeedConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FeedConsumerService.name);
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: Channel | null = null;

  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly xmlParser: XmlParserService,
    private readonly projector: FeedProjectorService,
    @Optional() private readonly settlement?: SettlementService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore teardown errors
    }
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.env.RABBITMQ_URL);
      this.connection.on('error', (err: Error) =>
        this.logger.error(`AMQP connection error: ${err.message}`),
      );
      this.connection.on('close', () => {
        this.logger.warn('AMQP connection closed, attempting reconnect in 5s');
        setTimeout(() => this.connect(), 5000);
      });

      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(10);

      const exchange = this.env.ODDIN_EXCHANGE;
      const queueName = `${this.env.ODDIN_QUEUE_NAME}.${this.env.ODDIN_NODE_ID}`;

      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(queueName, exchange, this.env.ODDIN_ROUTING_KEY_PATTERN);

      await this.channel.consume(queueName, async (msg) => {
        if (!msg) return;
        try {
          await this.handleMessage(msg);
          this.channel?.ack(msg);
        } catch (err) {
          this.logger.error(`Failed to process feed message: ${(err as Error).message}`);
          this.channel?.nack(msg, false, false);
        }
      });

      this.logger.log(`Feed consumer started on queue ${queueName} (exchange=${exchange})`);
    } catch (err) {
      this.logger.error(`Failed to connect to AMQP: ${(err as Error).message}`);
      this.logger.warn('Retrying AMQP connection in 5s...');
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    const xml = msg.content.toString();
    const routingKey = msg.fields.routingKey;
    const msgType = this.xmlParser.detectMessageType(xml);

    if (!msgType) {
      this.logger.warn(`Could not detect message type, routingKey=${routingKey}`);
      return;
    }

    // Write raw feed message for auditability
    const producerId = 1; // TODO: extract from routing key in real integration
    const sourceMessageId = `${Date.now()}_${routingKey}`;

    await this.prisma.feedMessage.create({
      data: {
        producerId,
        messageType: this.mapMessageType(msgType),
        routingKey,
        sourceMessageId,
        payload: xml as any,
        receivedAt: new Date(),
        processedAt: (msgType === 'odds_change' || msgType === 'bet_settlement' || msgType === 'bet_cancel') ? new Date() : undefined,
        processingError:
          msgType !== 'odds_change' && msgType !== 'alive' && msgType !== 'bet_settlement' && msgType !== 'bet_cancel'
            ? 'unhandled message type'
            : undefined,
      },
    });

    if (msgType === 'odds_change') {
      const parsed = this.xmlParser.parseOddsChange(xml);
      if (parsed) {
        await this.projector.projectOddsChange(parsed);
      }
    } else if (msgType === 'bet_settlement' && this.settlement) {
      const parsed = this.xmlParser.parseBetSettlement(xml);
      if (parsed) {
        await this.processSettlement(parsed);
      }
    } else if (msgType === 'bet_cancel' && this.settlement) {
      const parsed = this.xmlParser.parseBetCancel(xml);
      if (parsed) {
        await this.processCancellation(parsed);
      }
    }
  }

  private async processCancellation(msg: import('./xml-parser.service').BetCancelMsg): Promise<void> {
    const markets = msg.market;
    if (!markets) return;
    const marketArr = Array.isArray(markets) ? markets : [markets];

    for (const mkt of marketArr) {
      await this.settlement!.cancelMarket(String(mkt.id), msg.event_id);
    }
  }

  private async processSettlement(msg: import('./xml-parser.service').BetSettlementMsg): Promise<void> {
    const markets = msg.outcomes?.market;
    if (!markets) return;
    const marketArr = Array.isArray(markets) ? markets : [markets];

    for (const mkt of marketArr) {
      const outcomes = mkt.outcome;
      if (!outcomes) continue;
      const outcomeArr = Array.isArray(outcomes) ? outcomes : [outcomes];

      const resultMap: Record<number, 'won' | 'lost' | 'void'> = {
        1: 'won',
        0: 'lost',
        '-1': 'void',
      };

      await this.settlement!.settleMarket(
        String(mkt.id),
        msg.event_id,
        outcomeArr.map((oc) => ({
          feedId: String(oc.id),
          result: resultMap[oc.result] ?? 'void',
        })),
      );
    }
  }

  private mapMessageType(
    type: string,
  ):
    | 'alive'
    | 'odds_change'
    | 'fixture_change'
    | 'bet_cancel'
    | 'bet_settlement'
    | 'rollback_bet_cancel'
    | 'rollback_bet_settlement'
    | 'snapshot_complete' {
    const map: Record<string, any> = {
      alive: 'alive',
      odds_change: 'odds_change',
      fixture_change: 'fixture_change',
      bet_cancel: 'bet_cancel',
      bet_settlement: 'bet_settlement',
      rollback_bet_cancel: 'rollback_bet_cancel',
      rollback_bet_settlement: 'rollback_bet_settlement',
      snapshot_complete: 'snapshot_complete',
    };
    return map[type] ?? 'alive';
  }
}
