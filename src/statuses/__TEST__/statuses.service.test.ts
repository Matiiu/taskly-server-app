import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { StatusesService } from '@/statuses/statuses.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { buildStatus } from '@/common/testing/factories/domain.factory';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { DEFAULT_STATUSES } from '@/common/constants/colors.contats';

let prisma: ReturnType<typeof createPrismaMock>;
let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

describe('StatusesService', () => {
  let service: StatusesService;
  let meta: ReturnType<typeof createPaginationMetaMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    prisma = createPrismaMock();
    appEventEmitter = createAppEventEmitterMock();
    meta = createPaginationMetaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get<StatusesService>(StatusesService);
  });

  describe('createDefaultStatuses', () => {
    it('returns false when statuses already exist for the user', async () => {
      prisma.status.findMany.mockResolvedValue([buildStatus()]);

      const result = await service.createDefaultStatuses('user-1');

      expect(result).toBe(false);
      expect(prisma.status.createMany).not.toHaveBeenCalled();
    });

    it('creates the default statuses and returns true when the full batch is inserted', async () => {
      prisma.status.findMany.mockResolvedValue([]);
      prisma.status.createMany.mockResolvedValue({ count: DEFAULT_STATUSES.length });

      const result = await service.createDefaultStatuses('user-1');

      expect(result).toBe(true);
      expect(prisma.status.createMany).toHaveBeenCalledWith({
        data: DEFAULT_STATUSES.map((s) => ({ ...s, userId: 'user-1' })),
      });
    });

    it('returns false when the inserted count does not match', async () => {
      prisma.status.findMany.mockResolvedValue([]);
      prisma.status.createMany.mockResolvedValue({ count: 0 });

      expect(await service.createDefaultStatuses('user-1')).toBe(false);
    });
  });

  describe('findMany', () => {
    it('returns paginated statuses with default pagination', async () => {
      const status = buildStatus();
      prisma.status.findMany.mockResolvedValue([status]);
      prisma.status.count.mockResolvedValue(meta.total);

      const result = await service.findMany('user-1');

      expect(result).toEqual({ statuses: [service.createResponse(status)], meta });
    });

    it('applies query filter when provided', async () => {
      prisma.status.findMany.mockResolvedValue([]);
      prisma.status.count.mockResolvedValue(0);

      await service.findMany('user-1', { query: 'Pending' });

      expect(prisma.status.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Pending', mode: 'insensitive' },
          }) as unknown,
        }),
      );
    });

    it('omits name filter when no query is provided', async () => {
      prisma.status.findMany.mockResolvedValue([]);
      prisma.status.count.mockResolvedValue(0);

      await service.findMany('user-1');

      expect(prisma.status.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the status when found', async () => {
      const status = buildStatus();
      prisma.status.findFirst.mockResolvedValue(status);

      const result = await service.findOne('user-1', status.id);

      expect(result).toEqual(service.createResponse(status));
      expect(prisma.status.findFirst).toHaveBeenCalledWith({
        where: { id: status.id, userId: 'user-1' },
      });
    });

    it('throws NotFoundException when status does not exist', async () => {
      prisma.status.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdOrNameOrCreate', () => {
    it('returns existing status when found by id', async () => {
      const status = buildStatus();
      prisma.status.findFirst.mockResolvedValueOnce(status);

      const result = await service.findByIdOrNameOrCreate('user-1', {
        id: status.id,
        name: status.name,
      });

      expect(result).toEqual(status);
      expect(prisma.status.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.status.create).not.toHaveBeenCalled();
    });

    it('falls back to name lookup when id lookup returns null', async () => {
      const status = buildStatus();
      prisma.status.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(status);

      const result = await service.findByIdOrNameOrCreate('user-1', {
        id: 'wrong-id',
        name: status.name,
      });

      expect(result).toEqual(status);
      expect(prisma.status.findFirst).toHaveBeenCalledTimes(2);
    });

    it('creates a new status when neither id nor name match', async () => {
      const created = buildStatus({ name: 'New Status' });
      prisma.status.findFirst.mockResolvedValue(null);
      prisma.status.create.mockResolvedValue(created);

      const result = await service.findByIdOrNameOrCreate('user-1', { name: 'New Status' });

      expect(result).toEqual(created);
      expect(prisma.status.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'New Status', userId: 'user-1' }) as unknown,
        }),
      );
    });

    it('skips id lookup and goes directly to name lookup when no id is provided', async () => {
      const status = buildStatus();
      prisma.status.findFirst.mockResolvedValueOnce(status);

      await service.findByIdOrNameOrCreate('user-1', { name: status.name });

      expect(prisma.status.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.status.findFirst).toHaveBeenCalledWith({
        where: { name: status.name, userId: 'user-1' },
      });
    });
  });

  describe('updateColor', () => {
    it('updates the color, emits an audit log, and returns the mapped response', async () => {
      const existing = buildStatus();
      const updated = buildStatus({ color: '#ff0000' });
      prisma.status.findUniqueOrThrow.mockResolvedValue(existing);
      prisma.status.update.mockResolvedValue(updated);

      const result = await service.updateColor('user-1', existing.id, { color: '#ff0000' });

      expect(result).toEqual(service.createResponse(updated));
      expect(prisma.status.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: { color: '#ff0000' },
      });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_COLOR_STATUS',
          entity: 'Status',
          entityId: updated.id,
        }),
      );
    });

    it('throws BadRequestException when the update fails', async () => {
      prisma.status.findUniqueOrThrow.mockResolvedValue(buildStatus());
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.status.update.mockRejectedValue(new Error('DB error'));

      await expect(service.updateColor('user-1', 'id', { color: '#fff' })).rejects.toThrow(
        BadRequestException,
      );
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the status, emits an audit log, and returns the mapped response', async () => {
      const status = buildStatus();
      prisma.status.delete.mockResolvedValue(status);

      const result = await service.remove('user-1', status.id);

      expect(result).toEqual(service.createResponse(status));
      expect(prisma.status.delete).toHaveBeenCalledWith({ where: { id: status.id } });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE_STATUS', entity: 'Status', entityId: status.id }),
      );
    });

    it('throws BadRequestException when delete fails', async () => {
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.status.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.remove('user-1', 'id')).rejects.toThrow(BadRequestException);
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('createResponse', () => {
    it('maps a Status entity to the response type', () => {
      const status = buildStatus();
      const { id, name, color, createdAt, updatedAt } = status;

      expect(service.createResponse(status)).toEqual({ id, name, color, createdAt, updatedAt });
    });
  });
});
