import { Body, Controller, Get, Param, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { placeTicketInput, type PlaceTicketInput, type TicketDto, type TicketListDto } from '@oddzilla/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BettingService } from './betting.service';
import type { AuthenticatedUser } from '../auth/jwt-access.strategy';

type AuthedRequest = Request & { user: AuthenticatedUser };

@Controller('betting')
@UseGuards(AuthGuard('jwt-access'))
export class BettingController {
  constructor(private readonly betting: BettingService) {}

  @Post('tickets')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(placeTicketInput))
  placeTicket(
    @Req() req: AuthedRequest,
    @Body() body: PlaceTicketInput,
  ): Promise<TicketDto> {
    return this.betting.placeTicket(req.user.id, body);
  }

  @Get('tickets')
  getTickets(
    @Req() req: AuthedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TicketListDto> {
    return this.betting.getTickets(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(parseInt(pageSize, 10), 50) : 20,
    );
  }

  @Get('tickets/:id')
  getTicket(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<TicketDto> {
    return this.betting.getTicket(req.user.id, id);
  }
}
