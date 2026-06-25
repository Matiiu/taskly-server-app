import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogResolver } from '@/audit-log/audit-log.resolver';
import { AuditLogService } from '@/audit-log/audit-log.service';
import { createAuditLogServiceMock } from '@/common/testing/mocks/audit-log-service.mock';

describe('AuditLogResolver', () => {
  it('is defined', async () => {
    const auditLogServiceMock = createAuditLogServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogResolver, { provide: AuditLogService, useValue: auditLogServiceMock }],
    }).compile();

    const resolver = module.get<AuditLogResolver>(AuditLogResolver);

    expect(resolver).toBeDefined();
  });
});
