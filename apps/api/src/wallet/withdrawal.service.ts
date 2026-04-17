import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@oddzilla/db';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async requestWithdrawal(
    userId: string,
    amount: number,
    toAddress: string,
    network = 'TRC20',
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (!toAddress || toAddress.length < 10) throw new BadRequestException('Invalid address');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (Number(wallet.usdtBalance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: {
          usdtBalance: { decrement: new Prisma.Decimal(amount) },
          lockedBalance: { increment: new Prisma.Decimal(amount) },
        },
      });

      const request = await tx.withdrawalRequest.create({
        data: { userId, amountUsdt: new Prisma.Decimal(amount), toAddress, network },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'withdrawal',
          amountUsdt: new Prisma.Decimal(amount),
          status: 'pending',
          referenceId: `withdrawal:${request.id}`,
        },
      });

      return request;
    });
  }

  async getUserRequests(userId: string) {
    return this.prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getPendingRequests() {
    return this.prisma.withdrawalRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true, displayName: true } } },
    });
  }

  async approve(requestId: string, actorId: string, txHash?: string) {
    const req = await this.prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Withdrawal request not found');
    if (req.status !== 'pending') throw new BadRequestException('Request is not pending');

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: requestId },
        data: { status: 'approved', txHash, reviewedBy: actorId },
      });

      await tx.wallet.update({
        where: { userId: req.userId },
        data: { lockedBalance: { decrement: req.amountUsdt } },
      });

      await tx.transaction.updateMany({
        where: { referenceId: `withdrawal:${requestId}`, status: 'pending' },
        data: { status: 'confirmed', txHash },
      });
    });

    await this.audit.record({
      actorId,
      action: 'withdrawal.approve',
      targetType: 'WithdrawalRequest',
      targetId: requestId,
      after: { userId: req.userId, amount: Number(req.amountUsdt), txHash },
    });
  }

  async reject(requestId: string, actorId: string) {
    const req = await this.prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Withdrawal request not found');
    if (req.status !== 'pending') throw new BadRequestException('Request is not pending');

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: requestId },
        data: { status: 'rejected', reviewedBy: actorId },
      });

      await tx.wallet.update({
        where: { userId: req.userId },
        data: {
          usdtBalance: { increment: req.amountUsdt },
          lockedBalance: { decrement: req.amountUsdt },
        },
      });

      await tx.transaction.updateMany({
        where: { referenceId: `withdrawal:${requestId}`, status: 'pending' },
        data: { status: 'rejected' },
      });
    });

    await this.audit.record({
      actorId,
      action: 'withdrawal.reject',
      targetType: 'WithdrawalRequest',
      targetId: requestId,
    });
  }
}
