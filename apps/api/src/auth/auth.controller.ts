import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  loginInputSchema,
  signupInputSchema,
  changePasswordInputSchema,
  type LoginInput,
  type SignupInput,
  type ChangePasswordInput,
  type AuthResponse,
  type UserProfile,
} from '@oddzilla/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService, type AuthTokensResult } from './auth.service';
import type { AuthenticatedUser } from './jwt-access.strategy';

type AuthedRequest = Request & { user: AuthenticatedUser };
const COOKIE_NAME = 'oddzilla_refresh';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(signupInputSchema))
  async signup(
    @Body() body: SignupInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.signup(body, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
    this.setRefreshCookie(res, result);
    return { accessToken: result.accessToken, expiresAt: result.expiresAt };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginInputSchema))
  async login(
    @Body() body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.login(body, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
    this.setRefreshCookie(res, result);
    return { accessToken: result.accessToken, expiresAt: result.expiresAt };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const token = (req.cookies as Record<string, string>)?.[COOKIE_NAME] ?? req.body?.refreshToken;
    if (!token) throw new UnauthorizedException('No refresh token');

    const result = await this.auth.refresh(token, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
    this.setRefreshCookie(res, result);
    return { accessToken: result.accessToken, expiresAt: result.expiresAt };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt-access'))
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = (req.cookies as Record<string, string>)?.[COOKIE_NAME];
    await this.auth.logout(token, req.user.id);
    res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt-access'))
  me(@Req() req: AuthedRequest): Promise<UserProfile> {
    return this.auth.getProfile(req.user.id);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { token: string }): Promise<{ ok: true }> {
    await this.auth.verifyEmail(body.token);
    return { ok: true };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-access'))
  async resendVerification(@Req() req: AuthedRequest): Promise<{ ok: true }> {
    await this.auth.resendVerification(req.user.id);
    return { ok: true };
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }): Promise<{ ok: true }> {
    await this.auth.forgotPassword(body.email);
    return { ok: true };
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; password: string }): Promise<{ ok: true }> {
    await this.auth.resetPassword(body.token, body.password);
    return { ok: true };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-access'))
  @UsePipes(new ZodValidationPipe(changePasswordInputSchema))
  async changePassword(
    @Req() req: AuthedRequest,
    @Body() body: ChangePasswordInput,
  ): Promise<{ ok: true }> {
    await this.auth.changePassword(req.user.id, body);
    return { ok: true };
  }

  private setRefreshCookie(res: Response, result: AuthTokensResult): void {
    res.cookie(COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth',
      secure: process.env.NODE_ENV === 'production',
      maxAge: result.refreshMaxAge,
    });
  }
}
