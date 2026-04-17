import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import type Redis from 'ioredis';
import * as amqp from 'amqplib';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

type DepStatus = 'ok' | 'down';

interface HealthPayload {
  status: 'ok' | 'degraded';
  checks: {
    db: DepStatus;
    redis: DepStatus;
    rabbitmq: DepStatus;
  };
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  @Get()
  async check(): Promise<HealthPayload> {
    const [db, redis, rabbit] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.checkRabbit(),
    ]);

    const allOk = db === 'ok' && redis === 'ok' && rabbit === 'ok';
    return {
      status: allOk ? 'ok' : 'degraded',
      checks: { db, redis, rabbitmq: rabbit },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDb(): Promise<DepStatus> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return 'ok';
    } catch (err) {
      console.error('db health check failed:', (err as Error).message);
      return 'down';
    }
  }

  private async checkRedis(): Promise<DepStatus> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'ok' : 'down';
    } catch {
      return 'down';
    }
  }

  private async checkRabbit(): Promise<DepStatus> {
    try {
      const conn = await amqp.connect(this.env.RABBITMQ_URL, {
        timeout: 2000,
      } as unknown as Record<string, unknown>);
      await conn.close();
      return 'ok';
    } catch {
      return 'down';
    }
  }
}
