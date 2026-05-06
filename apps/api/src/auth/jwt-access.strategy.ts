import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';

export type AuthRole = 'user' | 'admin' | 'seed';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: AuthRole;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AuthRole;
  mustChangePassword: boolean;
  status: 'active' | 'blocked';
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    @Inject(ENV_TOKEN) env: Env,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.status === 'blocked') throw new UnauthorizedException('Account blocked');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      status: user.status,
    };
  }
}
