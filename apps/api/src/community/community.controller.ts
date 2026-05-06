import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import {
  updateCommunityProfileInput,
  updateVisibilityInput,
  type CommunityMeDto,
  type CommunityProfileDto,
  type ProfileTicketsDto,
  type UpdateCommunityProfileInput,
  type UpdateVisibilityInput,
} from '@oddzilla/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CommunityService } from './community.service';
import type { AuthenticatedUser } from '../auth/jwt-access.strategy';

type AuthedRequest = Request & { user: AuthenticatedUser };

@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('users/:nickname/profile')
  getProfile(@Param('nickname') nickname: string): Promise<CommunityProfileDto> {
    if (!nickname) throw new NotFoundException();
    return this.community.getProfileByNickname(nickname);
  }

  @Get('users/:nickname/tickets')
  getProfileTickets(
    @Param('nickname') nickname: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ProfileTicketsDto> {
    if (!nickname) throw new NotFoundException();
    const p = page ? Math.max(1, parseInt(page, 10)) : 1;
    const ps = pageSize ? Math.min(50, Math.max(1, parseInt(pageSize, 10))) : 10;
    return this.community.getProfileTickets(nickname, p, ps);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt-access'))
  getMe(@Req() req: AuthedRequest): Promise<CommunityMeDto> {
    return this.community.getMe(req.user.id);
  }

  @Patch('me/visibility')
  @UseGuards(AuthGuard('jwt-access'))
  @UsePipes(new ZodValidationPipe(updateVisibilityInput))
  updateVisibility(
    @Req() req: AuthedRequest,
    @Body() body: UpdateVisibilityInput,
  ): Promise<CommunityMeDto> {
    return this.community.updateVisibility(req.user.id, body.ticketsPublic);
  }

  @Patch('me/profile')
  @UseGuards(AuthGuard('jwt-access'))
  @UsePipes(new ZodValidationPipe(updateCommunityProfileInput))
  updateProfile(
    @Req() req: AuthedRequest,
    @Body() body: UpdateCommunityProfileInput,
  ): Promise<CommunityMeDto> {
    return this.community.updateCommunityProfile(req.user.id, body);
  }
}
