import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV_TOKEN],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
      }),
    }),
  ],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
