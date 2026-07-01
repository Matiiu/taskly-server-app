import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { AuditLogService } from '@/audit-log/audit-log.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { AuditAction, AuditEntity } from 'generated/prisma/enums';

let prisma: ReturnType<typeof createPrismaMock>;

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(async () => {
    jest.restoreAllMocks();
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  describe('logAction', () => {
    const input = {
      userId: 'user-1',
      action: 'CREATE_TASK' as AuditAction,
      entityId: 'entity-1',
      entity: 'Task' as AuditEntity,
      description: 'Task created',
      before: null,
      after: null,
    };

    it('creates an audit log entry', async () => {
      prisma.auditLog.create.mockResolvedValue({});

      await expect(service.logAction(input)).resolves.toBeUndefined();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', action: 'CREATE_TASK' }) as unknown,
        }),
      );
    });

    it('throws BadRequestException when the database call fails', async () => {
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      await expect(service.logAction(input)).rejects.toThrow(BadRequestException);
    });
  });
});
