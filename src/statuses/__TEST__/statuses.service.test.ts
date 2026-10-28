import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import { StatusesService } from '@/statuses/statuses.service';
import { StatusesRepository } from '@/statuses/statuses.repository';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { buildStatus } from '@/common/testing/factories/domain.factory';
import { COLORS, DEFAULT_STATUSES } from '@/common/constants/colors.contats';

const WORKSPACE_ID = 'workspace-id-1';
const USER_ID = 'user-id-1';

const createStatusesRepositoryMock = () => ({
  existsInWorkspace: jest.fn(),
  createMany: jest.fn(),
  findPage: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  updateColor: jest.fn(),
  delete: jest.fn(),
});

describe('StatusesService', () => {
  let service: StatusesService;
  let statusesRepo: ReturnType<typeof createStatusesRepositoryMock>;
  let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

  beforeEach(async () => {
    statusesRepo = createStatusesRepositoryMock();
    appEventEmitter = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusesService,
        { provide: StatusesRepository, useValue: statusesRepo },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get(StatusesService);
  });

  describe('createDefaultStatuses', () => {
    it('returns false without creating anything when the workspace already has statuses', async () => {
      statusesRepo.existsInWorkspace.mockResolvedValue(true);

      expect(await service.createDefaultStatuses(WORKSPACE_ID)).toBe(false);
      expect(statusesRepo.createMany).not.toHaveBeenCalled();
    });

    it('creates the default statuses and returns true when all were created', async () => {
      statusesRepo.existsInWorkspace.mockResolvedValue(false);
      statusesRepo.createMany.mockResolvedValue(DEFAULT_STATUSES.length);

      expect(await service.createDefaultStatuses(WORKSPACE_ID)).toBe(true);
      expect(statusesRepo.createMany).toHaveBeenCalledWith(WORKSPACE_ID, [...DEFAULT_STATUSES]);
    });

    it('returns false when fewer statuses than expected were created', async () => {
      statusesRepo.existsInWorkspace.mockResolvedValue(false);
      statusesRepo.createMany.mockResolvedValue(1);

      expect(await service.createDefaultStatuses(WORKSPACE_ID)).toBe(false);
    });
  });

  describe('findMany', () => {
    it('uses the default pagination and returns statuses with meta', async () => {
      const status = buildStatus();
      statusesRepo.findPage.mockResolvedValue({ statuses: [status], total: 1 });

      const result = await service.findMany(WORKSPACE_ID);

      expect(statusesRepo.findPage).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        page: 1,
        limit: 10,
        sortOrder: 'asc',
        search: null,
      });
      expect(result).toEqual({
        statuses: [service.createResponse(status)],
        meta: createPaginationMetaMock(),
      });
    });

    it('passes pagination and search through', async () => {
      statusesRepo.findPage.mockResolvedValue({ statuses: [], total: 0 });

      await service.findMany(WORKSPACE_ID, { page: 2, limit: 5, sortOrder: 'desc' }, 'done');

      expect(statusesRepo.findPage).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        page: 2,
        limit: 5,
        sortOrder: 'desc',
        search: 'done',
      });
    });
  });

  describe('findOne', () => {
    it('returns the status of the workspace', async () => {
      const status = buildStatus();
      statusesRepo.findById.mockResolvedValue(status);

      expect(await service.findOne(WORKSPACE_ID, status.id)).toEqual(
        service.createResponse(status),
      );
      expect(statusesRepo.findById).toHaveBeenCalledWith(WORKSPACE_ID, status.id);
    });

    it('throws NotFoundException when the status is not in the workspace', async () => {
      statusesRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(WORKSPACE_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates the status with the default color when neither id nor name exist', async () => {
      const created = buildStatus({ name: 'Blocked' });
      statusesRepo.findById.mockResolvedValue(null);
      statusesRepo.findByName.mockResolvedValue(null);
      statusesRepo.create.mockResolvedValue(created);

      const result = await service.create(WORKSPACE_ID, { id: 'missing', name: 'Blocked' });

      expect(result).toBe(created);
      expect(statusesRepo.findById).toHaveBeenCalledWith(WORKSPACE_ID, 'missing');
      expect(statusesRepo.findByName).toHaveBeenCalledWith(WORKSPACE_ID, 'Blocked');
      expect(statusesRepo.create).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        name: 'Blocked',
        color: COLORS.DEFAULT_INITIAL,
      });
    });

    it('skips the id lookup when no id is given', async () => {
      statusesRepo.findByName.mockResolvedValue(null);
      statusesRepo.create.mockResolvedValue(buildStatus({ name: 'Blocked' }));

      await service.create(WORKSPACE_ID, { name: 'Blocked' });

      expect(statusesRepo.findById).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a status with that id already exists', async () => {
      statusesRepo.findById.mockResolvedValue(buildStatus({ name: 'Pending' }));

      await expect(
        service.create(WORKSPACE_ID, { id: 'status-id-1', name: 'Other' }),
      ).rejects.toThrow(new ConflictException('Status Pending already exists'));
      expect(statusesRepo.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a status with that name already exists', async () => {
      statusesRepo.findByName.mockResolvedValue(buildStatus({ name: 'Pending' }));

      await expect(service.create(WORKSPACE_ID, { name: 'Pending' })).rejects.toThrow(
        new ConflictException('Status Pending already exists'),
      );
      expect(statusesRepo.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent request created the same name', async () => {
      statusesRepo.findByName.mockResolvedValue(null);
      statusesRepo.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.create(WORKSPACE_ID, { name: 'Blocked' })).rejects.toThrow(
        new ConflictException('Status Blocked already exists'),
      );
    });

    it('rethrows other errors from the insert', async () => {
      const boom = new Error('db down');
      statusesRepo.findByName.mockResolvedValue(null);
      statusesRepo.create.mockRejectedValue(boom);

      await expect(service.create(WORKSPACE_ID, { name: 'Blocked' })).rejects.toBe(boom);
    });
  });

  describe('updateColor', () => {
    it('updates the color and logs the user who made the change', async () => {
      const existing = buildStatus({ color: '#000000' });
      const updated = buildStatus({ color: '#ffffff' });
      statusesRepo.findById.mockResolvedValue(existing);
      statusesRepo.updateColor.mockResolvedValue(updated);

      const result = await service.updateColor(WORKSPACE_ID, USER_ID, existing.id, {
        color: '#ffffff',
      });

      expect(result).toEqual(service.createResponse(updated));
      expect(statusesRepo.updateColor).toHaveBeenCalledWith(existing.id, '#ffffff');
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, action: 'UPDATE_COLOR_STATUS' }),
      );
    });

    it('throws NotFoundException without updating when the status is not in the workspace', async () => {
      statusesRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateColor(WORKSPACE_ID, USER_ID, 'missing', { color: '#ffffff' }),
      ).rejects.toThrow(NotFoundException);
      expect(statusesRepo.updateColor).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the update fails', async () => {
      statusesRepo.findById.mockResolvedValue(buildStatus());
      statusesRepo.updateColor.mockRejectedValue(new Error('db down'));

      await expect(
        service.updateColor(WORKSPACE_ID, USER_ID, 'status-id-1', { color: '#ffffff' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes the status and logs the user who made the change', async () => {
      const status = buildStatus();
      statusesRepo.findById.mockResolvedValue(status);
      statusesRepo.delete.mockResolvedValue(status);

      const result = await service.remove(WORKSPACE_ID, USER_ID, status.id);

      expect(result).toEqual(service.createResponse(status));
      expect(statusesRepo.delete).toHaveBeenCalledWith(status.id);
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, action: 'DELETE_STATUS' }),
      );
    });

    it('throws NotFoundException without deleting when the status is not in the workspace', async () => {
      statusesRepo.findById.mockResolvedValue(null);

      await expect(service.remove(WORKSPACE_ID, USER_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(statusesRepo.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the delete fails', async () => {
      statusesRepo.findById.mockResolvedValue(buildStatus());
      statusesRepo.delete.mockRejectedValue(new Error('db down'));

      await expect(service.remove(WORKSPACE_ID, USER_ID, 'status-id-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('createResponse exposes only the public fields', () => {
    const { id, name, color, createdAt, updatedAt } = buildStatus();

    expect(service.createResponse(buildStatus())).toEqual({
      id,
      name,
      color,
      createdAt,
      updatedAt,
    });
  });
});
