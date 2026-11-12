import { Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TaskAssigneesService } from '@/task-assignees/task-assignees.service';
import { TaskAssigneesRepository } from '@/task-assignees/task-assignees.repository';
import { UsersService } from '@/users/users.service';
import { TaskRolesService } from '@/task-roles/task-roles.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createAppEventEmitterMock } from '@/common/testing/common/mocks/app-event-emitter.mock';
import { createPaginationMetaMock } from '@/common/testing/common/mocks/pagination.mock';
import { createUsersServiceMock } from '@/common/testing/users/mocks/users-service.mock';
import { buildSafeUser } from '@/common/testing/users/factories/users.factory';
import { createTaskRolesServiceMock } from '@/common/testing/task-roles/mocks/task-roles-service.mock';
import { buildTaskRole } from '@/common/testing/task-roles/factories/task-roles.factory';
import { buildAssigneeType } from '@/common/testing/task-assignees/factories/task-assignees.factory';

const USER_ID = 'user-id-1';
const ASSIGNEE_ID = 'user-id-2';
const TASK_ID = 'task-id-1';
const WORKSPACE_ID = 'workspace-id-1';

const createTaskAssigneesRepositoryMock = () => ({
  findOwnedTask: jest.fn(),
  findByTaskAndUser: jest.fn(),
  findPage: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});

const buildOwnedTask = () => ({
  id: TASK_ID,
  title: 'Write tests',
  description: null,
  dueDate: null,
  workspaceId: WORKSPACE_ID,
  status: null,
  category: null,
});

/** The owned task as the audit log stores it: without `workspaceId`. */
const TASK_SNAPSHOT = {
  id: TASK_ID,
  title: 'Write tests',
  description: null,
  dueDate: null,
  status: null,
  category: null,
};

describe('TaskAssigneesService', () => {
  let service: TaskAssigneesService;
  let taskAssigneesRepo: ReturnType<typeof createTaskAssigneesRepositoryMock>;
  let usersService: ReturnType<typeof createUsersServiceMock>;
  let taskRolesService: ReturnType<typeof createTaskRolesServiceMock>;
  let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

  beforeEach(async () => {
    taskAssigneesRepo = createTaskAssigneesRepositoryMock();
    usersService = createUsersServiceMock();
    taskRolesService = createTaskRolesServiceMock();
    appEventEmitter = createAppEventEmitterMock();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssigneesService,
        { provide: TaskAssigneesRepository, useValue: taskAssigneesRepo },
        { provide: UsersService, useValue: usersService },
        { provide: TaskRolesService, useValue: taskRolesService },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get(TaskAssigneesService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    const input = { taskId: TASK_ID, assigneeId: ASSIGNEE_ID, roleId: 'task-role-id-1' };
    const assignee = buildAssigneeType({ id: ASSIGNEE_ID });
    const role = buildTaskRole();

    const arrangeValidAssignment = () => {
      taskAssigneesRepo.findOwnedTask.mockResolvedValue(buildOwnedTask());
      usersService.findByIdOrThrow.mockResolvedValue(buildSafeUser(assignee));
      taskRolesService.findInWorkspaceOrThrow.mockResolvedValue(role);
      taskAssigneesRepo.findByTaskAndUser.mockResolvedValue(null);
    };

    it('assigns the user with the role, logs it and returns the assignee', async () => {
      arrangeValidAssignment();

      const result = await service.create(USER_ID, input);

      expect(result).toEqual(assignee);
      expect(taskRolesService.findInWorkspaceOrThrow).toHaveBeenCalledWith(
        WORKSPACE_ID,
        input.roleId,
      );
      expect(taskAssigneesRepo.create).toHaveBeenCalledWith({
        taskId: TASK_ID,
        userId: ASSIGNEE_ID,
        roleId: role.id,
        assignedById: USER_ID,
      });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          action: 'ASSIGN_TASK',
          entityId: TASK_ID,
          entity: 'TaskAssignee',
          after: {
            task: TASK_SNAPSHOT,
            assignedUser: assignee,
            role: { id: role.id, name: role.name },
          },
        }),
      );
    });

    it('throws NotFoundException when the user does not own the task', async () => {
      taskAssigneesRepo.findOwnedTask.mockResolvedValue(null);

      await expect(service.create(USER_ID, input)).rejects.toThrow(
        new NotFoundException('Task not found'),
      );
      expect(taskAssigneesRepo.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the user is already assigned', async () => {
      arrangeValidAssignment();
      taskAssigneesRepo.findByTaskAndUser.mockResolvedValue({ user: assignee, role });

      await expect(service.create(USER_ID, input)).rejects.toThrow(
        new BadRequestException('User is already assigned to this task'),
      );
      expect(taskAssigneesRepo.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException without logging when the insert fails', async () => {
      arrangeValidAssignment();
      taskAssigneesRepo.create.mockRejectedValue(new Error('db down'));

      await expect(service.create(USER_ID, input)).rejects.toThrow(
        new BadRequestException('Failed to add task assignee'),
      );
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('uses the default pagination for a task the user owns', async () => {
      const assignee = buildAssigneeType();
      taskAssigneesRepo.findOwnedTask.mockResolvedValue(buildOwnedTask());
      taskAssigneesRepo.findPage.mockResolvedValue({ assignees: [assignee], total: 1 });

      const result = await service.findMany(USER_ID, TASK_ID);

      expect(taskAssigneesRepo.findPage).toHaveBeenCalledWith({
        taskId: TASK_ID,
        page: 1,
        limit: 10,
        sortOrder: 'asc',
        search: null,
      });
      expect(result).toEqual({ assignees: [assignee], meta: createPaginationMetaMock() });
    });

    it('passes pagination and search through', async () => {
      taskAssigneesRepo.findOwnedTask.mockResolvedValue(buildOwnedTask());
      taskAssigneesRepo.findPage.mockResolvedValue({ assignees: [], total: 0 });

      await service.findMany(USER_ID, TASK_ID, { page: 2, limit: 5, sortOrder: 'desc' }, 'jane');

      expect(taskAssigneesRepo.findPage).toHaveBeenCalledWith({
        taskId: TASK_ID,
        page: 2,
        limit: 5,
        sortOrder: 'desc',
        search: 'jane',
      });
    });

    it('throws NotFoundException when the user does not own the task', async () => {
      taskAssigneesRepo.findOwnedTask.mockResolvedValue(null);

      await expect(service.findMany(USER_ID, TASK_ID)).rejects.toThrow(NotFoundException);
      expect(taskAssigneesRepo.findPage).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const assignment = {
      user: buildAssigneeType({ id: ASSIGNEE_ID }),
      role: { id: 'r', name: 'Editor' },
    };

    it('unassigns the user, logs it and returns the removed assignee', async () => {
      taskAssigneesRepo.findOwnedTask.mockResolvedValue(buildOwnedTask());
      taskAssigneesRepo.findByTaskAndUser.mockResolvedValue(assignment);

      const result = await service.remove(USER_ID, TASK_ID, ASSIGNEE_ID);

      expect(result).toEqual(assignment.user);
      expect(taskAssigneesRepo.delete).toHaveBeenCalledWith(TASK_ID, ASSIGNEE_ID);
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          action: 'UNASSIGN_TASK',
          before: {
            task: TASK_SNAPSHOT,
            unassignedUser: assignment.user,
            role: assignment.role,
          },
        }),
      );
    });

    it('throws NotFoundException when the user is not assigned to the task', async () => {
      taskAssigneesRepo.findOwnedTask.mockResolvedValue(buildOwnedTask());
      taskAssigneesRepo.findByTaskAndUser.mockResolvedValue(null);

      await expect(service.remove(USER_ID, TASK_ID, ASSIGNEE_ID)).rejects.toThrow(
        new NotFoundException('Task assignee not found'),
      );
      expect(taskAssigneesRepo.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException without logging when the delete fails', async () => {
      taskAssigneesRepo.findOwnedTask.mockResolvedValue(buildOwnedTask());
      taskAssigneesRepo.findByTaskAndUser.mockResolvedValue(assignment);
      taskAssigneesRepo.delete.mockRejectedValue(new Error('db down'));

      await expect(service.remove(USER_ID, TASK_ID, ASSIGNEE_ID)).rejects.toThrow(
        new BadRequestException('Failed to remove task assignee'),
      );
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });
});
