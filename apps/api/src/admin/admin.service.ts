import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import type {
  AdminSettingDto,
  UserDetailDto,
  UserListDto,
  UpdateUserInput,
  PnlSummaryDto,
} from '@oddzilla/shared';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService,
  ) {}

  async getSettings(): Promise<AdminSettingDto[]> {
    const settings = await this.prisma.adminSetting.findMany();
    return settings.map((s) => ({
      key: s.key,
      value: s.value,
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async updateSetting(key: string, value: unknown): Promise<AdminSettingDto> {
    const setting = await this.prisma.adminSetting.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });
    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }

  async getUsers(page: number, pageSize: number): Promise<UserListDto> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { wallet: true },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map((u) => this.toUserDto(u)),
      total,
      page,
      pageSize,
    };
  }

  async getUser(id: string): Promise<UserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toUserDto(user);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<UserDetailDto> {
    await this.prisma.user.update({
      where: { id },
      data: {
        role: input.role as any,
        status: input.status as any,
        globalLimitUsdt: input.globalLimitUsdt !== undefined ? input.globalLimitUsdt : undefined,
        betDelaySeconds: input.betDelaySeconds,
      },
    });
    return this.getUser(id);
  }

  async creditUserWallet(
    userId: string,
    amount: number,
    reason: string,
    actorId: string,
  ): Promise<void> {
    await this.wallet.creditAdmin(userId, amount, reason, actorId);
  }

  async getPnlSummary(): Promise<PnlSummaryDto> {
    const [stakeAgg, payoutAgg, activeCount, totalCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { type: 'stake', status: 'confirmed' },
        _sum: { amountUsdt: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'payout', status: 'confirmed' },
        _sum: { amountUsdt: true },
      }),
      this.prisma.ticket.count({
        where: { status: { in: ['pending', 'accepted'] } },
      }),
      this.prisma.ticket.count(),
    ]);

    const totalStaked = Number(stakeAgg._sum.amountUsdt ?? 0);
    const totalPaidOut = Number(payoutAgg._sum.amountUsdt ?? 0);

    return {
      totalStaked,
      totalPaidOut,
      netPnl: Number((totalStaked - totalPaidOut).toFixed(2)),
      activeTickets: activeCount,
      totalTickets: totalCount,
    };
  }

  async getTickets(opts: { status?: string; userId?: string; page: number; pageSize: number }) {
    const where: any = {};
    if (opts.status) where.status = opts.status;
    if (opts.userId) where.userId = opts.userId;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
        include: {
          user: { select: { email: true, displayName: true } },
          selections: {
            include: {
              outcome: { include: { market: { include: { match: true } } } },
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      tickets: tickets.map((t: any) => ({
        id: t.id,
        userId: t.userId,
        userEmail: t.user.email,
        userDisplayName: t.user.displayName,
        stakeUsdt: Number(t.stakeUsdt),
        totalOdds: Number(t.totalOdds),
        potentialPayout: Number((Number(t.stakeUsdt) * Number(t.totalOdds)).toFixed(2)),
        status: t.status,
        rejectReason: t.rejectReason,
        submittedAt: t.submittedAt.toISOString(),
        acceptedAt: t.acceptedAt?.toISOString() ?? null,
        settledAt: t.settledAt?.toISOString() ?? null,
        selections: (t.selections ?? []).map((sel: any) => ({
          id: sel.id,
          outcomeLabel: sel.outcome?.label ?? '',
          marketType: sel.outcome?.market?.type ?? '',
          matchHome: sel.outcome?.market?.match?.homeName ?? '',
          matchAway: sel.outcome?.market?.match?.awayName ?? '',
          priceAtSubmit: Number(sel.priceAtSubmit),
          status: sel.status,
        })),
      })),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }

  async getTicketDetail(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { email: true, displayName: true } },
        selections: {
          include: {
            outcome: { include: { market: { include: { match: true } } } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return {
      id: ticket.id,
      userId: ticket.userId,
      userEmail: (ticket as any).user.email,
      stakeUsdt: Number(ticket.stakeUsdt),
      totalOdds: Number(ticket.totalOdds),
      potentialPayout: Number((Number(ticket.stakeUsdt) * Number(ticket.totalOdds)).toFixed(2)),
      status: ticket.status,
      rejectReason: ticket.rejectReason,
      submittedAt: ticket.submittedAt.toISOString(),
      acceptedAt: ticket.acceptedAt?.toISOString() ?? null,
      settledAt: ticket.settledAt?.toISOString() ?? null,
      selections: ticket.selections.map((sel) => ({
        id: sel.id,
        outcomeLabel: (sel as any).outcome?.label ?? '',
        marketType: (sel as any).outcome?.market?.type ?? '',
        matchHome: (sel as any).outcome?.market?.match?.homeName ?? '',
        matchAway: (sel as any).outcome?.market?.match?.awayName ?? '',
        priceAtSubmit: Number(sel.priceAtSubmit),
        status: sel.status,
      })),
    };
  }

  async voidTicket(ticketId: string, actorId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { selections: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'void') throw new BadRequestException('Ticket already voided');
    if (['won', 'lost'].includes(ticket.status)) {
      throw new BadRequestException('Cannot void a settled ticket');
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'void', settledAt: new Date() },
    });

    for (const sel of ticket.selections) {
      await this.prisma.ticketSelection.update({
        where: { id: sel.id },
        data: { status: 'void' },
      });
    }

    const stake = Number(ticket.stakeUsdt);
    if (ticket.status === 'accepted') {
      await this.wallet.payout(ticket.userId, stake);
    } else if (ticket.status === 'pending') {
      await this.wallet.unlockStake(ticket.userId, stake);
    }

    await this.audit.record({
      actorId,
      action: 'admin.void_ticket',
      targetType: 'Ticket',
      targetId: ticketId,
      after: { userId: ticket.userId, stake },
    });
  }

  async getTransactions(opts: { userId?: string; type?: string; page: number; pageSize: number }) {
    const where: any = {};
    if (opts.userId) where.userId = opts.userId;
    if (opts.type) where.type = opts.type;

    const [txns, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
        include: { user: { select: { email: true, displayName: true } } },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions: txns.map((t: any) => ({
        id: t.id,
        userId: t.userId,
        userEmail: t.user.email,
        type: t.type,
        amountUsdt: Number(t.amountUsdt),
        status: t.status,
        txHash: t.txHash,
        referenceId: t.referenceId,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }

  private toUserDto(u: any): UserDetailDto {
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      status: u.status,
      globalLimitUsdt: Number(u.globalLimitUsdt),
      betDelaySeconds: u.betDelaySeconds,
      usdtBalance: u.wallet ? Number(u.wallet.usdtBalance) : 0,
      lockedBalance: u.wallet ? Number(u.wallet.lockedBalance) : 0,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    };
  }
}
