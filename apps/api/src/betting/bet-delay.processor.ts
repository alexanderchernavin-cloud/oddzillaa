import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { BettingService } from './betting.service';

export interface BetDelayJobData {
  ticketId: string;
}

@Injectable()
export class BetDelayProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BetDelayProcessor.name);
  private worker!: Worker<BetDelayJobData>;

  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly betting: BettingService,
  ) {}

  onModuleInit(): void {
    const redisUrl = new URL(this.env.REDIS_URL);
    this.worker = new Worker<BetDelayJobData>(
      'bet-delay',
      async (job: Job<BetDelayJobData>) => {
        await this.betting.acceptOrReject(job.data.ticketId);
      },
      {
        connection: {
          host: redisUrl.hostname,
          port: parseInt(redisUrl.port || '6379', 10),
        },
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Bet delay job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('BetDelayProcessor started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
