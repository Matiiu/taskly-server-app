import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, type TaskRole } from 'generated/prisma/client';

import { TaskRolesService } from '@/task-roles/task-roles.service';
import { TaskRolesRepository } from '@/task-roles/task-roles.repository';
import { DEFAULT_TASK_ROLES } from '@/task-roles/constants/task-role.constants';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createAppEventEmitterMock } from '@/common/testing/common/mocks/app-event-emitter.mock';
import { createPaginationMetaMock } from '@/common/testing/common/mocks/pagination.mock';
import { buildTaskRole } from '@/common/testing/task-roles/factories/task-roles.factory';

const WORKSPACE_ID = 'workspace-id-1';
const USER_ID = 'user-id-1';
const TASK_ROLE_ID = 'task-role-id-1';

const createTaskRolesRepositoryMock = () => ({
  findPage: jest.fn(),
  existsInWorkspace: jest.fn(),
  createMany: jest.fn(),
  findById: jest.fn(),
  countAssignees: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

/** The task role as the audit log stores it. */
const toSnapshot = ({ id, name, description, permissions }: TaskRole) => ({
  id,
  name,
  description,
  permissions,
});

describe('TaskRolesService', () => {
  let service: TaskRolesService;
  let taskRolesRepo: ReturnType<typeof createTaskRolesRepositoryMock>;
  let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

  beforeEach(async () => {
    taskRolesRepo = createTaskRolesRepositoryMock();
    appEventEmitter = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskRolesService,
        { provide: TaskRolesRepository, useValue: taskRolesRepo },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get(TaskRolesService);
  });

  describe('createDefaultTaskRoles', () => {
    it('does nothing and returns false when the workspace already has task roles', async () => {
      taskRolesRepo.existsInWorkspace.mockResolvedValue(true);

      await expect(service.createDefaultTaskRoles(WORKSPACE_ID)).resolves.toBe(false);
      expect(taskRolesRepo.createMany).not.toHaveBeenCalled();
    });

    it('seeds the default roles as system roles and returns true when all were created', async () => {
      taskRolesRepo.existsInWorkspace.mockResolvedValue(false);
      taskRolesRepo.createMany.mockResolvedValue(DEFAULT_TASK_ROLES.length);

      await expect(service.createDefaultTaskRoles(WORKSPACE_ID)).resolves.toBe(true);
      expect(taskRolesRepo.createMany).toHaveBeenCalledWith(
        WORKSPACE_ID,
        DEFAULT_TASK_ROLES.map(({ name, description, permissions }) => ({
          name,
          description,
          permissions: [...permissions],
          isSystem: true,
        })),
      );
    });

    it('returns false when not every default role was created', async () => {
      taskRolesRepo.existsInWorkspace.mockResolvedValue(false);
      taskRolesRepo.createMany.mockResolvedValue(DEFAULT_TASK_ROLES.length - 1);

      await expect(service.createDefaultTaskRoles(WORKSPACE_ID)).resolves.toBe(false);
    });
  });

  describe('findMany', () => {
    it('uses the default pagination and returns task roles with meta', async () => {
      const taskRole = buildTaskRole();
      taskRolesRepo.findPage.mockResolvedValue({ taskRoles: [taskRole], total: 1 });

      const result = await service.findMany(WORKSPACE_ID);

      expect(taskRolesRepo.findPage).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        page: 1,
        limit: 10,
        sortOrder: 'asc',
        search: null,
      });
      expect(result).toEqual({
        taskRoles: [service.toTaskRoleType(taskRole)],
        meta: createPaginationMetaMock(),
      });
    });

    it('passes pagination and search through', async () => {
      taskRolesRepo.findPage.mockResolvedValue({ taskRoles: [], total: 0 });

      await service.findMany(WORKSPACE_ID, { page: 2, limit: 5, sortOrder: 'desc' }, 'rev');

      expect(taskRolesRepo.findPage).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        page: 2,
        limit: 5,
        sortOrder: 'desc',
        search: 'rev',
      });
    });
  });

  describe('findOne', () => {
    it('returns the task role of the workspace', async () => {
      const taskRole = buildTaskRole();
      taskRolesRepo.findById.mockResolvedValue(taskRole);

      await expect(service.findOne(WORKSPACE_ID, TASK_ROLE_ID)).resolves.toEqual(
        service.toTaskRoleType(taskRole),
      );
      expect(taskRolesRepo.findById).toHaveBeenCalledWith(WORKSPACE_ID, TASK_ROLE_ID);
    });

    it('throws NotFoundException when the task role is not in the workspace', async () => {
      taskRolesRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(WORKSPACE_ID, 'missing')).rejects.toThrow(
        new NotFoundException('Task role not found'),
      );
    });
  });

  describe('create', () => {
    const input = { name: 'Reviewer', permissions: ['COMMENT_CREATE' as const] };

    it('creates the task role with a null description by default and logs it', async () => {
      const created = buildTaskRole({ description: null });
      taskRolesRepo.create.mockResolvedValue(created);

      const result = await service.create(WORKSPACE_ID, USER_ID, input);

      expect(result).toEqual(service.toTaskRoleType(created));
      expect(taskRolesRepo.create).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        name: 'Reviewer',
        description: null,
        permissions: ['COMMENT_CREATE'],
      });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          action: 'CREATE_TASK_ROLE',
          entityId: created.id,
          entity: 'TaskRole',
          after: {
            id: created.id,
            name: created.name,
            description: null,
            permissions: created.permissions,
          },
        }),
      );
    });

    it('throws ConflictException when the name already exists in the workspace', async () => {
      taskRolesRepo.create.mockRejectedValue(uniqueViolation());

      await expect(service.create(WORKSPACE_ID, USER_ID, input)).rejects.toThrow(
        new ConflictException('Task role Reviewer already exists'),
      );
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });

    it('rethrows other errors from the insert', async () => {
      const boom = new Error('db down');
      taskRolesRepo.create.mockRejectedValue(boom);

      await expect(service.create(WORKSPACE_ID, USER_ID, input)).rejects.toBe(boom);
    });
  });

  describe('update', () => {
    it('updates the task role and logs the before and after snapshots', async () => {
      const existing = buildTaskRole();
      const updated = buildTaskRole({ name: 'Lead' });
      taskRolesRepo.findById.mockResolvedValue(existing);
      taskRolesRepo.update.mockResolvedValue(updated);

      const result = await service.update(WORKSPACE_ID, USER_ID, TASK_ROLE_ID, { name: 'Lead' });

      expect(result).toEqual(service.toTaskRoleType(updated));
      expect(taskRolesRepo.update).toHaveBeenCalledWith(TASK_ROLE_ID, { name: 'Lead' });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          action: 'UPDATE_TASK_ROLE',
          before: toSnapshot(existing),
          after: toSnapshot(updated),
        }),
      );
    });

    it('throws NotFoundException without updating when the task role is not in the workspace', async () => {
      taskRolesRepo.findById.mockResolvedValue(null);

      await expect(
        service.update(WORKSPACE_ID, USER_ID, 'missing', { name: 'Lead' }),
      ).rejects.toThrow(NotFoundException);
      expect(taskRolesRepo.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException without updating a system task role', async () => {
      taskRolesRepo.findById.mockResolvedValue(buildTaskRole({ isSystem: true }));

      await expect(
        service.update(WORKSPACE_ID, USER_ID, TASK_ROLE_ID, { name: 'Lead' }),
      ).rejects.toThrow(new BadRequestException('System task roles cannot be modified'));
      expect(taskRolesRepo.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the new name already exists in the workspace', async () => {
      taskRolesRepo.findById.mockResolvedValue(buildTaskRole());
      taskRolesRepo.update.mockRejectedValue(uniqueViolation());

      await expect(
        service.update(WORKSPACE_ID, USER_ID, TASK_ROLE_ID, { name: 'Lead' }),
      ).rejects.toThrow(new ConflictException('Task role Lead already exists'));
    });
  });

  describe('remove', () => {
    it('deletes a task role with no assignees and logs it', async () => {
      const taskRole = buildTaskRole();
      taskRolesRepo.findById.mockResolvedValue(taskRole);
      taskRolesRepo.countAssignees.mockResolvedValue(0);
      taskRolesRepo.delete.mockResolvedValue(taskRole);

      const result = await service.remove(WORKSPACE_ID, USER_ID, TASK_ROLE_ID);

      expect(result).toEqual(service.toTaskRoleType(taskRole));
      expect(taskRolesRepo.delete).toHaveBeenCalledWith(TASK_ROLE_ID);
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          action: 'DELETE_TASK_ROLE',
          before: toSnapshot(taskRole),
        }),
      );
    });

    it('throws ConflictException without deleting when the task role has assignees', async () => {
      taskRolesRepo.findById.mockResolvedValue(buildTaskRole());
      taskRolesRepo.countAssignees.mockResolvedValue(2);

      await expect(service.remove(WORKSPACE_ID, USER_ID, TASK_ROLE_ID)).rejects.toThrow(
        new ConflictException('Task role is assigned to task members and cannot be removed'),
      );
      expect(taskRolesRepo.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException without deleting a system task role', async () => {
      taskRolesRepo.findById.mockResolvedValue(buildTaskRole({ isSystem: true }));

      await expect(service.remove(WORKSPACE_ID, USER_ID, TASK_ROLE_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(taskRolesRepo.delete).not.toHaveBeenCalled();
    });
  });

  it('toTaskRoleType exposes only the public fields', () => {
    const { id, name, description, permissions, isSystem, createdAt, updatedAt } = buildTaskRole();

    expect(service.toTaskRoleType(buildTaskRole())).toEqual({
      id,
      name,
      description,
      permissions,
      isSystem,
      createdAt,
      updatedAt,
    });
  });
});
