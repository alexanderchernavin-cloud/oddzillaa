import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditRecord {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(rec: AuditRecord): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: rec.actorId ?? null,
          action: rec.action,
          targetType: rec.targetType ?? null,
          targetId: rec.targetId ?? null,
          before: (rec.before ?? undefined) as never,
          after: (rec.after ?? undefined) as never,
          ipAddress: rec.ipAddress ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write AuditLog for action=${rec.action}: ${(err as Error).message}`,
      );
    }
  }
}
