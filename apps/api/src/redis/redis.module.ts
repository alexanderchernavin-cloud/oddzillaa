import { Global, Inject, Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
class RedisLifecycle implements OnModuleDestroy {
  private readonly logger = new Logger('Redis');

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ENV_TOKEN],
      useFactory: (env: Env) => {
        const client = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 3 });
        client.on('error', (err) => {
          new Logger('Redis').error(err.message);
        });
        return client;
      },
    },
    RedisLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
