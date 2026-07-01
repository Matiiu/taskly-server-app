import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { TaskAssigneesService } from '@/task-assignees/task-assignees.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { buildTaskRow, buildAssigneeType } from '@/common/testing/factories/domain.factory';

let prisma: ReturnType<typeof createPrismaMock>;
let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

describe('TaskAssigneesService', () => {
  let service: TaskAssigneesService;
  let meta: ReturnType<typeof createPaginationMetaMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    prisma = createPrismaMock();
    appEventEmitter = createAppEventEmitterMock();
    meta = createPaginationMetaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssigneesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get<TaskAssigneesService>(TaskAssigneesService);
  });

  describe('create', () => {
    it('creates the assignee, emits an audit log, and returns the user', async () => {
      const task = buildTaskRow();
      const assignee = buildAssigneeType();
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.user.findFirst.mockResolvedValue(assignee);
      prisma.taskAssignee.findUnique.mockResolvedValue(null);
      prisma.taskAssignee.create.mockResolvedValue({});

      const result = await service.create('user-1', { taskId: task.id, assigneeId: assignee.id });

      expect(result).toEqual(assignee);
      expect(prisma.taskAssignee.create).toHaveBeenCalledWith({
        data: { taskId: task.id, userId: assignee.id },
      });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ASSIGN_TASK', entity: 'TaskAssignee', entityId: task.id }),
      );
    });

    it('throws BadRequestException when the user is already assigned to the task', async () => {
      const task = buildTaskRow();
      const assignee = buildAssigneeType();
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.user.findFirst.mockResolvedValue(assignee);
      prisma.taskAssignee.findUnique.mockResolvedValue({ taskId: task.id, userId: assignee.id });

      await expect(service.create('user-1', { taskId: task.id, assigneeId: assignee.id })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.taskAssignee.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the task does not exist or is not owned by the user', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', { taskId: 'missing', assigneeId: 'user-2' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the assignee user does not exist', async () => {
      prisma.task.findFirst.mockResolvedValue(buildTaskRow());
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', { taskId: 'task-1', assigneeId: 'missing' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the DB insert fails', async () => {
      const task = buildTaskRow();
      const assignee = buildAssigneeType();
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.user.findFirst.mockResolvedValue(assignee);
      prisma.taskAssignee.findUnique.mockResolvedValue(null);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.taskAssignee.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create('user-1', { taskId: task.id, assigneeId: assignee.id })).rejects.toThrow(
        BadRequestException,
      );
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('returns paginated assignees for an owned task', async () => {
      const task = buildTaskRow();
      const assignee = buildAssigneeType();
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.taskAssignee.count.mockResolvedValue(meta.total);
      prisma.taskAssignee.findMany.mockResolvedValue([{ user: assignee }]);

      const result = await service.findMany('user-1', task.id);

      expect(result).toEqual({ assignees: [assignee], meta });
    });

    it('throws NotFoundException when the task does not exist or is not owned', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.findMany('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('applies query filter and pagination options', async () => {
      const task = buildTaskRow();
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.taskAssignee.count.mockResolvedValue(0);
      prisma.taskAssignee.findMany.mockResolvedValue([]);

      await service.findMany('user-1', task.id, { query: 'Jane', limit: 5, page: 2 });

      expect(prisma.taskAssignee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expect.objectContaining({
            user: expect.objectContaining({ OR: expect.any(Array) as unknown }) as unknown,
          }) as unknown,
        }),
      );
    });
  });

  describe('remove', () => {
    it('removes the assignee, emits an audit log, and returns the user', async () => {
      const task = buildTaskRow();
      const assignee = buildAssigneeType();
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.taskAssignee.findUnique.mockResolvedValue({ user: assignee });
      prisma.taskAssignee.delete.mockResolvedValue({});

      const result = await service.remove('user-1', task.id, assignee.id);

      expect(result).toEqual(assignee);
      expect(prisma.taskAssignee.delete).toHaveBeenCalledWith({
        where: { taskId_userId: { taskId: task.id, userId: assignee.id } },
      });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UNASSIGN_TASK', entity: 'TaskAssignee', entityId: task.id }),
      );
    });

    it('throws NotFoundException when the task does not belong to the user', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'missing-task', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the task assignee record does not exist', async () => {
      prisma.task.findFirst.mockResolvedValue(buildTaskRow());
      prisma.taskAssignee.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'task-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the DB delete fails', async () => {
      const task = buildTaskRow();
      const assignee = buildAssigneeType();
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.taskAssignee.findUnique.mockResolvedValue({ user: assignee });
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.taskAssignee.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.remove('user-1', task.id, assignee.id)).rejects.toThrow(BadRequestException);
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });
});
