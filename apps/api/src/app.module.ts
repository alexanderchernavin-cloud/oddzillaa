import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FeedModule } from './feed/feed.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MatchesModule } from './matches/matches.module';
import { WalletModule } from './wallet/wallet.module';
import { BettingModule } from './betting/betting.module';
import { AdminModule } from './admin/admin.module';
import { RequestIdMiddleware } from './common/request-id.middleware';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AuditModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
        customProps: (req) => ({
          requestId: (req as unknown as { requestId?: string }).requestId,
        }),
        serializers: {
          req(req: { method?: string; url?: string }) {
            return { method: req.method, url: req.url };
          },
        },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    HealthModule,
    AuthModule,
    UsersModule,
    FeedModule,
    RealtimeModule,
    MatchesModule,
    WalletModule,
    BettingModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
