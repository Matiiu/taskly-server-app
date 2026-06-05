import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAuditLogInput } from '@/audit-log/dto/create-audit-log.input';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entityId: input.entityId,
          entity: input.entity,
          description: input.description ?? undefined,
          before: input.before ?? undefined,
          after: input.after ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log audit action', error);
      throw new BadRequestException('Failed to log audit action');
    }
  }
}
