import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@oddzilla/db';

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getOrCreateAddress(userId: string, network = 'TRC20'): Promise<{ address: string; network: string }> {
    const existing = await this.prisma.depositAddress.findUnique({
      where: { userId_network: { userId, network } },
    });
    if (existing) return { address: existing.address, network: existing.network };

    const address = this.generateDeterministicAddress(userId, network);
    const record = await this.prisma.depositAddress.create({
      data: { userId, network, address },
    });
    return { address: record.address, network: record.network };
  }

  async getDeposits(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId, type: 'deposit' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async confirmDeposit(
    txHash: string,
    userId: string,
    amount: number,
    actorId: string,
  ): Promise<void> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found for user');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const dailyLimit = user.dailyDepositLimit ? Number(user.dailyDepositLimit) : null;
    const weeklyLimit = user.weeklyDepositLimit ? Number(user.weeklyDepositLimit) : null;

    if (dailyLimit !== null) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const agg = await this.prisma.transaction.aggregate({
        where: { userId, type: 'deposit', status: 'confirmed', createdAt: { gte: dayAgo } },
        _sum: { amountUsdt: true },
      });
      const todayTotal = Number(agg._sum.amountUsdt ?? 0);
      if (todayTotal + amount > dailyLimit) {
        throw new BadRequestException(`Exceeds daily deposit limit of ${dailyLimit} USDT`);
      }
    }

    if (weeklyLimit !== null) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const agg = await this.prisma.transaction.aggregate({
        where: { userId, type: 'deposit', status: 'confirmed', createdAt: { gte: weekAgo } },
        _sum: { amountUsdt: true },
      });
      const weekTotal = Number(agg._sum.amountUsdt ?? 0);
      if (weekTotal + amount > weeklyLimit) {
        throw new BadRequestException(`Exceeds weekly deposit limit of ${weeklyLimit} USDT`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { usdtBalance: { increment: new Prisma.Decimal(amount) } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'deposit',
          amountUsdt: new Prisma.Decimal(amount),
          status: 'confirmed',
          txHash,
          referenceId: `admin-confirm:${actorId}`,
        },
      });
    });

    await this.audit.record({
      actorId,
      action: 'deposit.confirm',
      targetType: 'Transaction',
      targetId: txHash,
      after: { userId, amount, txHash },
    });

    this.logger.log(`Deposit confirmed: user=${userId} amount=${amount} txHash=${txHash}`);
  }

  private generateDeterministicAddress(userId: string, network: string): string {
    const seed = randomBytes(8).toString('hex');
    const hash = createHash('sha256').update(`${userId}:${network}:${seed}`).digest('hex');
    const prefix = network === 'TRC20' ? 'T' : '0x';
    return `${prefix}${hash.slice(0, 33)}`;
  }
}
