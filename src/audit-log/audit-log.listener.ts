import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogService } from '@/audit-log/audit-log.service';
import { CreateAuditLogInput } from '@/audit-log/dto/create-audit-log.input';
import { EVENTS } from '@/common/constants/events.constant';

@Injectable()
export class AuditLogListener {
  constructor(private readonly auditLogService: AuditLogService) {}

  @OnEvent(EVENTS.AUDIT_LOG)
  async handleAuditLog(input: CreateAuditLogInput) {
    await this.auditLogService.logAction(input);
  }
}
