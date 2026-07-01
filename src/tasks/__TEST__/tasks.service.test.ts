import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { TasksService } from '@/tasks/tasks.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { StatusesService } from '@/statuses/statuses.service';
import { CategoriesService } from '@/categories/categories.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { createStatusesServiceMock } from '@/common/testing/mocks/statuses-service.mock';
import { createCategoriesServiceMock } from '@/common/testing/mocks/categories-service.mock';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { buildStatus, buildCategory, buildTaskRow } from '@/common/testing/factories/domain.factory';

let prisma: ReturnType<typeof createPrismaMock>;
let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;
let statusesService: ReturnType<typeof createStatusesServiceMock>;
let categoriesService: ReturnType<typeof createCategoriesServiceMock>;

describe('TasksService', () => {
  let service: TasksService;
  let meta: ReturnType<typeof createPaginationMetaMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    prisma = createPrismaMock();
    appEventEmitter = createAppEventEmitterMock();
    statusesService = createStatusesServiceMock();
    categoriesService = createCategoriesServiceMock();
    meta = createPaginationMetaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
        { provide: StatusesService, useValue: statusesService },
        { provide: CategoriesService, useValue: categoriesService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('create', () => {
    it('creates a task, emits an audit log, and returns the mapped response', async () => {
      const task = buildTaskRow();
      const input = { title: task.title, description: task.description, dueDate: task.dueDate };
      prisma.task.create.mockResolvedValue(task);

      const result = await service.create(task.userId, input);

      expect(result).toEqual({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        status: task.status,
        category: task.category,
        isOwner: true,
      });
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: task.title, userId: task.userId }) as unknown }),
      );
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_TASK', entity: 'Task', entityId: task.id }),
      );
    });

    it('throws BadRequestException when the DB insert fails', async () => {
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.task.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create('user-1', { title: 'Test' })).rejects.toThrow(BadRequestException);
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('returns paginated tasks with default pagination', async () => {
      const task = buildTaskRow();
      prisma.task.count.mockResolvedValue(meta.total);
      prisma.task.findMany.mockResolvedValue([task]);

      const result = await service.findMany(task.userId);

      expect(result.meta).toEqual(meta);
      expect(result.tasks).toEqual([
        {
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          status: task.status,
          category: task.category,
        },
      ]);
    });

    it('applies query filter to the where clause', async () => {
      prisma.task.count.mockResolvedValue(0);
      prisma.task.findMany.mockResolvedValue([]);

      await service.findMany('user-1', { query: 'Meeting' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'Meeting', mode: 'insensitive' },
          }) as unknown,
        }),
      );
    });

    it('applies pagination options (skip, take, orderBy)', async () => {
      prisma.task.count.mockResolvedValue(0);
      prisma.task.findMany.mockResolvedValue([]);

      await service.findMany('user-1', { page: 2, limit: 5, sortOrder: 'asc' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5, orderBy: [{ createdAt: 'asc' }] }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the task with isOwner=true when the user is the owner', async () => {
      const task = buildTaskRow();
      prisma.task.findFirst.mockResolvedValue(task);

      const result = await service.findOne(task.userId, task.id);

      expect(result.isOwner).toBe(true);
      expect(result.id).toBe(task.id);
    });

    it('returns the task with isOwner=false when the user is an assignee', async () => {
      const task = buildTaskRow({ userId: 'owner-id' });
      prisma.task.findFirst.mockResolvedValue(task);

      const result = await service.findOne('assignee-id', task.id);

      expect(result.isOwner).toBe(false);
    });

    it('throws NotFoundException when the task is not found', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the task, emits an audit log, and returns the mapped response', async () => {
      const existing = buildTaskRow();
      const updated = buildTaskRow({ title: 'Updated Title' });
      prisma.task.findUniqueOrThrow.mockResolvedValue(existing);
      prisma.task.update.mockResolvedValue(updated);

      const result = await service.update(existing.id, existing.userId, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_TASK', entity: 'Task', entityId: existing.id }),
      );
    });

    it('throws BadRequestException when the DB update fails', async () => {
      prisma.task.findUniqueOrThrow.mockResolvedValue(buildTaskRow());
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.task.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update('task-1', 'user-1', { title: 'X' })).rejects.toThrow(BadRequestException);
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('returns immediately without updating when the status is already set', async () => {
      const status = buildStatus();
      const task = buildTaskRow({ statusId: status.id });
      prisma.task.findUniqueOrThrow.mockResolvedValue(task);
      statusesService.findByIdOrNameOrCreate.mockResolvedValue(status);

      const result = await service.updateStatus(task.id, task.userId, { name: status.name });

      expect(prisma.task.update).not.toHaveBeenCalled();
      expect(result.status?.id).toBe(status.id);
    });

    it('updates the task status, emits an audit log, and returns the response', async () => {
      const oldStatus = buildStatus({ id: 'old-status' });
      const newStatus = buildStatus({ id: 'new-status', name: 'Done' });
      const task = buildTaskRow({ statusId: oldStatus.id });
      const updatedTask = buildTaskRow({ status: { id: newStatus.id, name: newStatus.name, color: newStatus.color } });
      prisma.task.findUniqueOrThrow.mockResolvedValue(task);
      statusesService.findByIdOrNameOrCreate.mockResolvedValue(newStatus);
      prisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.updateStatus(task.id, task.userId, { name: 'Done' });

      expect(result.status?.id).toBe(newStatus.id);
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statusId: newStatus.id } }),
      );
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_TASK', entity: 'Task' }),
      );
    });

    it('throws BadRequestException when the DB update fails', async () => {
      const oldStatus = buildStatus({ id: 'old-status' });
      const newStatus = buildStatus({ id: 'new-status' });
      const task = buildTaskRow({ statusId: oldStatus.id });
      prisma.task.findUniqueOrThrow.mockResolvedValue(task);
      statusesService.findByIdOrNameOrCreate.mockResolvedValue(newStatus);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.task.update.mockRejectedValue(new Error('DB error'));

      await expect(service.updateStatus(task.id, task.userId, { name: 'Done' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCategory', () => {
    it('returns immediately without updating when the category is already set', async () => {
      const category = buildCategory();
      const task = buildTaskRow({ categoryId: category.id });
      prisma.task.findUniqueOrThrow.mockResolvedValue(task);
      categoriesService.findByIdOrNameOrCreate.mockResolvedValue(category);

      const result = await service.updateCategory(task.id, task.userId, { name: category.name });

      expect(prisma.task.update).not.toHaveBeenCalled();
      expect(result.category?.id).toBe(category.id);
    });

    it('updates the task category, emits an audit log, and returns the response', async () => {
      const oldCat = buildCategory({ id: 'old-cat' });
      const newCat = buildCategory({ id: 'new-cat', name: 'Personal' });
      const task = buildTaskRow({ categoryId: oldCat.id });
      const updatedTask = buildTaskRow({ category: { id: newCat.id, name: newCat.name, color: newCat.color } });
      prisma.task.findUniqueOrThrow.mockResolvedValue(task);
      categoriesService.findByIdOrNameOrCreate.mockResolvedValue(newCat);
      prisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.updateCategory(task.id, task.userId, { name: 'Personal' });

      expect(result.category?.id).toBe(newCat.id);
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_TASK', entity: 'Task' }),
      );
    });

    it('throws BadRequestException when the DB update fails', async () => {
      const oldCat = buildCategory({ id: 'old-cat' });
      const newCat = buildCategory({ id: 'new-cat' });
      const task = buildTaskRow({ categoryId: oldCat.id });
      prisma.task.findUniqueOrThrow.mockResolvedValue(task);
      categoriesService.findByIdOrNameOrCreate.mockResolvedValue(newCat);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.task.update.mockRejectedValue(new Error('DB error'));

      await expect(service.updateCategory(task.id, task.userId, { name: 'Personal' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('soft-deletes the task, emits an audit log, and returns the mapped response', async () => {
      const task = buildTaskRow();
      const removed = buildTaskRow({ active: false } as never);
      prisma.task.findUniqueOrThrow.mockResolvedValue(task);
      prisma.task.update.mockResolvedValue(removed);

      const result = await service.remove(task.id);

      expect(result.id).toBe(task.id);
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: task.id }, data: { active: false } }),
      );
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INACTIVATE_TASK', entity: 'Task', entityId: task.id }),
      );
    });

    it('throws BadRequestException when the DB update fails', async () => {
      prisma.task.findUniqueOrThrow.mockResolvedValue(buildTaskRow());
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.task.update.mockRejectedValue(new Error('DB error'));

      await expect(service.remove('task-1')).rejects.toThrow(BadRequestException);
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });
});
