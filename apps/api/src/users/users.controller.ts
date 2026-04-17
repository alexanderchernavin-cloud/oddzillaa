import { Body, Controller, Get, Patch, Req, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { updateProfileInputSchema, type UpdateProfileInput, type UserProfile } from '@oddzilla/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/jwt-access.strategy';

type AuthedRequest = Request & { user: AuthenticatedUser };

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt-access'))
  async me(@Req() req: AuthedRequest): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
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

  @Patch('me')
  @UseGuards(AuthGuard('jwt-access'))
  @UsePipes(new ZodValidationPipe(updateProfileInputSchema))
  async updateMe(
    @Req() req: AuthedRequest,
    @Body() body: UpdateProfileInput,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: req.user.id },
      data: { displayName: body.displayName },
    });
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

  @Patch('me/responsible-gambling')
  @UseGuards(AuthGuard('jwt-access'))
  async updateResponsibleGambling(
    @Req() req: AuthedRequest,
    @Body() body: {
      selfExcludeDays?: number;
      dailyDepositLimit?: number | null;
      weeklyDepositLimit?: number | null;
    },
  ) {
    const data: any = {};
    if (body.selfExcludeDays && body.selfExcludeDays > 0) {
      data.selfExcludedUntil = new Date(Date.now() + body.selfExcludeDays * 24 * 60 * 60 * 1000);
    }
    if (body.dailyDepositLimit !== undefined) {
      data.dailyDepositLimit = body.dailyDepositLimit;
    }
    if (body.weeklyDepositLimit !== undefined) {
      data.weeklyDepositLimit = body.weeklyDepositLimit;
    }

    const user = await this.prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    return {
      selfExcludedUntil: user.selfExcludedUntil?.toISOString() ?? null,
      dailyDepositLimit: user.dailyDepositLimit ? Number(user.dailyDepositLimit) : null,
      weeklyDepositLimit: user.weeklyDepositLimit ? Number(user.weeklyDepositLimit) : null,
    };
  }

  @Get('me/responsible-gambling')
  @UseGuards(AuthGuard('jwt-access'))
  async getResponsibleGambling(@Req() req: AuthedRequest) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
    return {
      selfExcludedUntil: user.selfExcludedUntil?.toISOString() ?? null,
      dailyDepositLimit: user.dailyDepositLimit ? Number(user.dailyDepositLimit) : null,
      weeklyDepositLimit: user.weeklyDepositLimit ? Number(user.weeklyDepositLimit) : null,
    };
  }
}
