import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BettingController } from './betting.controller';
import { BettingService, BET_DELAY_QUEUE } from './betting.service';
import { BetDelayProcessor } from './bet-delay.processor';
import { WalletModule } from '../wallet/wallet.module';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

@Module({
  imports: [WalletModule],
  controllers: [BettingController],
  providers: [
    BettingService,
    BetDelayProcessor,
    {
      provide: BET_DELAY_QUEUE,
      useFactory: (env: Env) => {
        const redisUrl = new URL(env.REDIS_URL);
        return new Queue('bet-delay', {
          connection: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port || '6379', 10),
          },
        });
      },
      inject: [ENV_TOKEN],
    },
  ],
})
export class BettingModule {}
