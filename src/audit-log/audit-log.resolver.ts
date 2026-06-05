import { Resolver } from '@nestjs/graphql';

import { AuditLogService } from '@/audit-log/audit-log.service';

@Resolver()
export class AuditLogResolver {
  constructor(private readonly auditLogService: AuditLogService) {}
}
