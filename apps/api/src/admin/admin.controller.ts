import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import {
  updateSettingInput,
  updateUserInput,
  creditWalletInput,
  type UpdateSettingInput,
  type UpdateUserInput,
  type CreditWalletInput,
  type AdminSettingDto,
  type UserDetailDto,
  type UserListDto,
  type PnlSummaryDto,
} from '@oddzilla/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import { AdminService } from './admin.service';
import { DepositService } from '../wallet/deposit.service';
import { WithdrawalService } from '../wallet/withdrawal.service';
import type { AuthenticatedUser } from '../auth/jwt-access.strategy';

type AuthedRequest = Request & { user: AuthenticatedUser };

@Controller('admin')
@UseGuards(AuthGuard('jwt-access'), AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly deposits: DepositService,
    private readonly withdrawals: WithdrawalService,
  ) {}

  @Get('settings')
  getSettings(): Promise<AdminSettingDto[]> {
    return this.admin.getSettings();
  }

  @Patch('settings/:key')
  @UsePipes(new ZodValidationPipe(updateSettingInput))
  updateSetting(
    @Param('key') key: string,
    @Body() body: UpdateSettingInput,
  ): Promise<AdminSettingDto> {
    return this.admin.updateSetting(key, body.value);
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<UserListDto> {
    return this.admin.getUsers(
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(parseInt(pageSize, 10), 50) : 20,
    );
  }

  @Get('users/:id')
  getUser(@Param('id') id: string): Promise<UserDetailDto> {
    return this.admin.getUser(id);
  }

  @Patch('users/:id')
  @UsePipes(new ZodValidationPipe(updateUserInput))
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserInput,
  ): Promise<UserDetailDto> {
    return this.admin.updateUser(id, body);
  }

  @Post('users/:id/credit')
  @UsePipes(new ZodValidationPipe(creditWalletInput))
  async creditWallet(
    @Param('id') id: string,
    @Body() body: CreditWalletInput,
    @Req() req: AuthedRequest,
  ): Promise<{ ok: true }> {
    await this.admin.creditUserWallet(id, body.amount, body.reason, req.user.id);
    return { ok: true };
  }

  @Get('pnl')
  getPnl(): Promise<PnlSummaryDto> {
    return this.admin.getPnlSummary();
  }

  // --- Deposits ---
  @Post('deposits/confirm')
  async confirmDeposit(
    @Body() body: { txHash: string; userId: string; amount: number },
    @Req() req: AuthedRequest,
  ): Promise<{ ok: true }> {
    await this.deposits.confirmDeposit(body.txHash, body.userId, body.amount, req.user.id);
    return { ok: true };
  }

  // --- Withdrawals ---
  @Get('withdrawals')
  async getWithdrawals() {
    const reqs = await this.withdrawals.getPendingRequests();
    return reqs.map((r) => ({
      id: r.id,
      userId: r.userId,
      userEmail: r.user.email,
      userDisplayName: r.user.displayName,
      amountUsdt: Number(r.amountUsdt),
      toAddress: r.toAddress,
      network: r.network,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Post('withdrawals/:id/approve')
  async approveWithdrawal(
    @Param('id') id: string,
    @Body() body: { txHash?: string },
    @Req() req: AuthedRequest,
  ): Promise<{ ok: true }> {
    await this.withdrawals.approve(id, req.user.id, body.txHash);
    return { ok: true };
  }

  @Post('withdrawals/:id/reject')
  async rejectWithdrawal(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<{ ok: true }> {
    await this.withdrawals.reject(id, req.user.id);
    return { ok: true };
  }

  // --- Tickets ---
  @Get('tickets')
  getTickets(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.getTickets({
      status,
      userId,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? Math.min(parseInt(pageSize, 10), 50) : 20,
    });
  }

  @Get('tickets/:id')
  getTicket(@Param('id') id: string) {
    return this.admin.getTicketDetail(id);
  }

  @Post('tickets/:id/void')
  async voidTicket(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<{ ok: true }> {
    await this.admin.voidTicket(id, req.user.id);
    return { ok: true };
  }

  // --- Transactions ---
  @Get('transactions')
  getTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.getTransactions({
      userId,
      type,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? Math.min(parseInt(pageSize, 10), 50) : 20,
    });
  }
}
