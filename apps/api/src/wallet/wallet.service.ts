import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@oddzilla/db';
import type { WalletDto } from '@oddzilla/shared';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getBalance(userId: string): Promise<WalletDto> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return {
      usdtBalance: Number(wallet.usdtBalance),
      lockedBalance: Number(wallet.lockedBalance),
    };
  }

  async creditAdmin(
    userId: string,
    amount: number,
    reason: string,
    actorId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      await tx.wallet.update({
        where: { userId },
        data: {
          usdtBalance: { increment: new Prisma.Decimal(amount) },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'deposit',
          amountUsdt: new Prisma.Decimal(amount),
          status: 'confirmed',
          referenceId: `admin-credit:${actorId}:${Date.now()}`,
        },
      });
    });

    await this.audit.record({
      actorId,
      action: 'wallet.admin_credit',
      targetType: 'Wallet',
      targetId: userId,
      after: { amount, reason },
    });
  }

  async lockStake(userId: string, amount: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      if (Number(wallet.usdtBalance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      await tx.wallet.update({
        where: { userId },
        data: {
          usdtBalance: { decrement: new Prisma.Decimal(amount) },
          lockedBalance: { increment: new Prisma.Decimal(amount) },
        },
      });
    });
  }

  async unlockStake(userId: string, amount: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: {
          usdtBalance: { increment: new Prisma.Decimal(amount) },
          lockedBalance: { decrement: new Prisma.Decimal(amount) },
        },
      });
    });
  }

  async deductStake(userId: string, amount: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: {
          lockedBalance: { decrement: new Prisma.Decimal(amount) },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'stake',
          amountUsdt: new Prisma.Decimal(amount),
          status: 'confirmed',
        },
      });
    });
  }

  async payout(userId: string, amount: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: {
          usdtBalance: { increment: new Prisma.Decimal(amount) },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'payout',
          amountUsdt: new Prisma.Decimal(amount),
          status: 'confirmed',
        },
      });
    });
  }
}
