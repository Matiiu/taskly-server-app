import { Global, Module } from '@nestjs/common';

import { AuditLogService } from '@/audit-log/audit-log.service';
import { AuditLogResolver } from '@/audit-log/audit-log.resolver';
import { AuditLogListener } from '@/audit-log/audit-log.listener';

@Global()
@Module({
  providers: [AuditLogService, AuditLogResolver, AuditLogListener],
  exports: [AuditLogService],
})
export class AuditLogModule {}
