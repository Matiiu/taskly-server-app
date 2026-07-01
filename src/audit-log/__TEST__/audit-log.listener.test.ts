import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogListener } from '@/audit-log/audit-log.listener';
import { AuditLogService } from '@/audit-log/audit-log.service';
import { AuditAction, AuditEntity } from 'generated/prisma/enums';

describe('AuditLogListener', () => {
  let listener: AuditLogListener;
  let auditLogService: { logAction: jest.Mock };

  beforeEach(async () => {
    auditLogService = { logAction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogListener,
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    listener = module.get<AuditLogListener>(AuditLogListener);
  });

  describe('handleAuditLog', () => {
    it('delegates to auditLogService.logAction', async () => {
      const input = {
        userId: 'user-1',
        action: 'CREATE_TASK' as AuditAction,
        entityId: 'entity-1',
        entity: 'Task' as AuditEntity,
        description: 'Task created',
        before: null,
        after: null,
      };
      auditLogService.logAction.mockResolvedValue(undefined);

      await listener.handleAuditLog(input);

      expect(auditLogService.logAction).toHaveBeenCalledWith(input);
    });
  });
});
