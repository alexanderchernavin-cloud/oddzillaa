import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from './email.service';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import type { AuthRole } from './jwt-access.strategy';
import type { SignupInput, LoginInput, UserProfile, ChangePasswordInput } from '@oddzilla/shared';

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshMaxAge: number;
}

interface IssueTokensArgs {
  userId: string;
  email: string;
  role: AuthRole;
  familyId?: string;
  previousTokenId?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  async signup(input: SignupInput, ctx: { ipAddress?: string; userAgent?: string }): Promise<AuthTokensResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const emailVerifyToken = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        emailVerifyToken,
        wallet: { create: {} },
      },
    });

    await this.email.sendVerificationEmail(user.email, emailVerifyToken);

    await this.audit.record({
      actorId: user.id,
      action: 'user.signup',
      targetType: 'User',
      targetId: user.id,
      ipAddress: ctx.ipAddress,
    });

    return this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async login(
    input: LoginInput,
    ctx: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokensResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const fakeHash = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$invalidinvalidinvalid';
    const hash = user?.passwordHash ?? fakeHash;
    const ok = await argon2.verify(hash, input.password).catch(() => false);

    if (!user || !ok) {
      await this.audit.record({
        actorId: user?.id,
        action: 'user.login_failed',
        targetType: 'User',
        targetId: user?.id,
        ipAddress: ctx.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'blocked') {
      throw new UnauthorizedException('Account blocked');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'user.login',
      targetType: 'User',
      targetId: user.id,
      ipAddress: ctx.ipAddress,
    });

    return this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async refresh(
    refreshToken: string,
    ctx: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokensResult> {
    const tokenHash = hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      if (record?.familyId) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: record.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (record.user.status === 'blocked') {
      throw new UnauthorizedException('Account blocked');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      userId: record.userId,
      email: record.user.email,
      role: record.user.role,
      familyId: record.familyId,
      previousTokenId: record.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async logout(refreshToken: string | undefined, userId: string | undefined): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (record) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: record.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }
    if (userId) {
      await this.audit.record({
        actorId: userId,
        action: 'user.logout',
        targetType: 'User',
        targetId: userId,
      });
    }
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired verification token');
    if (user.emailVerified) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerified) throw new BadRequestException('Email already verified');

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifyToken: token },
    });

    await this.email.sendVerificationEmail(user.email, token);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // don't reveal whether the account exists

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpires: expires },
    });

    await this.email.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: token, resetPasswordExpires: { gte: new Date() } },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        mustChangePassword: false,
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, input.currentPassword).catch(() => false);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.audit.record({
      actorId: userId,
      action: 'user.change_password',
      targetType: 'User',
      targetId: userId,
    });
  }

  private async issueTokens(args: IssueTokensArgs): Promise<AuthTokensResult> {
    const accessToken = await this.jwt.signAsync({
      sub: args.userId,
      email: args.email,
      role: args.role,
    });

    const refreshPlain = randomBytes(48).toString('base64url');
    const tokenHash = hashToken(refreshPlain);
    const familyId = args.familyId ?? randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.env.JWT_REFRESH_TTL_SECONDS * 1000);

    const created = await this.prisma.refreshToken.create({
      data: {
        userId: args.userId,
        tokenHash,
        familyId,
        issuedAt: now,
        expiresAt,
        userAgent: args.userAgent ?? null,
        ipAddress: args.ipAddress ?? null,
      },
    });

    if (args.previousTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: args.previousTokenId },
        data: { replacedBy: created.id },
      });
    }

    const accessExpiresAt = new Date(now.getTime() + this.env.JWT_ACCESS_TTL_SECONDS * 1000);

    return {
      accessToken,
      refreshToken: refreshPlain,
      expiresAt: accessExpiresAt.toISOString(),
      refreshMaxAge: this.env.JWT_REFRESH_TTL_SECONDS * 1000,
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
