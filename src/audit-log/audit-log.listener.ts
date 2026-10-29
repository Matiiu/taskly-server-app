import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogService } from '@/audit-log/audit-log.service';
import { CreateAuditLogInput } from '@/audit-log/dto/create-audit-log.input';
import { EVENTS } from '@/common/constants/events.constants';

@Injectable()
export class AuditLogListener {
  private readonly logger = new Logger(AuditLogListener.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  // Runs in the background: writing the audit log must never block or fail the request.
  @OnEvent(EVENTS.AUDIT_LOG, { async: true })
  async handleAuditLog(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.auditLogService.logAction(input);
    } catch (e) {
      this.logger.error(`Failed to write audit log ${input.action} for ${input.entity}`, e);
    }
  }
}
