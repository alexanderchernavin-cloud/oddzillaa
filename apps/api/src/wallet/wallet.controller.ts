import { Body, Controller, Get, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { creditWalletInput, type CreditWalletInput, type WalletDto } from '@oddzilla/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import { WalletService } from './wallet.service';
import { DepositService } from './deposit.service';
import { WithdrawalService } from './withdrawal.service';
import type { AuthenticatedUser } from '../auth/jwt-access.strategy';

type AuthedRequest = Request & { user: AuthenticatedUser };

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly deposit: DepositService,
    private readonly withdrawal: WithdrawalService,
  ) {}

  @Get('balance')
  @UseGuards(AuthGuard('jwt-access'))
  getBalance(@Req() req: AuthedRequest): Promise<WalletDto> {
    return this.wallet.getBalance(req.user.id);
  }

  @Post('admin-credit')
  @UseGuards(AuthGuard('jwt-access'), AdminGuard)
  @UsePipes(new ZodValidationPipe(creditWalletInput))
  async adminCredit(
    @Req() req: AuthedRequest,
    @Body() body: CreditWalletInput & { userId: string },
  ): Promise<{ ok: true }> {
    await this.wallet.creditAdmin(body.userId, body.amount, body.reason, req.user.id);
    return { ok: true };
  }

  @Get('deposit-address')
  @UseGuards(AuthGuard('jwt-access'))
  async getDepositAddress(@Req() req: AuthedRequest) {
    return this.deposit.getOrCreateAddress(req.user.id);
  }

  @Get('deposits')
  @UseGuards(AuthGuard('jwt-access'))
  async getDeposits(@Req() req: AuthedRequest) {
    const txns = await this.deposit.getDeposits(req.user.id);
    return txns.map((t) => ({
      id: t.id,
      amountUsdt: Number(t.amountUsdt),
      status: t.status,
      txHash: t.txHash,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  @Post('withdraw')
  @UseGuards(AuthGuard('jwt-access'))
  async requestWithdrawal(
    @Req() req: AuthedRequest,
    @Body() body: { amount: number; toAddress: string },
  ) {
    const result = await this.withdrawal.requestWithdrawal(
      req.user.id,
      body.amount,
      body.toAddress,
    );
    return {
      id: result.id,
      amountUsdt: Number(result.amountUsdt),
      status: result.status,
      toAddress: result.toAddress,
    };
  }

  @Get('withdrawals')
  @UseGuards(AuthGuard('jwt-access'))
  async getWithdrawals(@Req() req: AuthedRequest) {
    const reqs = await this.withdrawal.getUserRequests(req.user.id);
    return reqs.map((r) => ({
      id: r.id,
      amountUsdt: Number(r.amountUsdt),
      toAddress: r.toAddress,
      status: r.status,
      txHash: r.txHash,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
