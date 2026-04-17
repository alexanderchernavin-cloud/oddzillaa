import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { JwtAccessStrategy } from './jwt-access.strategy';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ENV_TOKEN],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: { expiresIn: env.JWT_ACCESS_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtAccessStrategy],
  exports: [AuthService, EmailService],
})
export class AuthModule {}
