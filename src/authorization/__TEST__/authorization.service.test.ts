import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthorizationService } from '@/authorization/authorization.service';
import { AuthorizationRepository } from '@/authorization/authorization.repository';
import { TASK_POLICIES } from '@/authorization/policies/task.policies';
import type { Policy } from '@/authorization/types/policy.type';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let repository: { hasWorkspacePermissions: jest.Mock; findAuthorizedTask: jest.Mock };

  beforeEach(async () => {
    repository = {
      hasWorkspacePermissions: jest.fn(),
      findAuthorizedTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorizationService, { provide: AuthorizationRepository, useValue: repository }],
    }).compile();

    service = module.get(AuthorizationService);
  });

  it('returns the policy for an action', () => {
    expect(service.getPolicy('task.create')).toBe(TASK_POLICIES['task.create']);
  });

  describe('workspace scope (task.create)', () => {
    it('checks the workspace permission and allows the workspace owner', async () => {
      repository.hasWorkspacePermissions.mockResolvedValue(true);

      await expect(service.authorize('task.create', 'user-1', 'ws-1')).resolves.toBeNull();

      expect(repository.hasWorkspacePermissions).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-1',
        permissions: ['TASK_CREATE'],
        allowWorkspaceOwner: true,
        allowAnyMember: false,
      });
      expect(repository.findAuthorizedTask).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the user lacks the permission', async () => {
      repository.hasWorkspacePermissions.mockResolvedValue(false);

      await expect(service.authorize('task.create', 'user-1', 'ws-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('task scope', () => {
    const taskPolicy = (owner: Policy['owner'], task?: Policy['task']): Policy => ({
      scope: 'task',
      task,
      owner,
      arg: 'taskId',
    });

    it.each([
      ['taskCreator', true, false],
      ['workspaceOwner', false, true],
      ['any', true, true],
      ['none', false, false],
    ] as const)(
      'maps owner rule %s to allowTaskCreator=%s, allowWorkspaceOwner=%s',
      async (owner, allowTaskCreator, allowWorkspaceOwner) => {
        jest.spyOn(service, 'getPolicy').mockReturnValue(taskPolicy(owner, ['TASK_UPDATE']));
        const task = { id: 'task-1' };
        repository.findAuthorizedTask.mockResolvedValue(task);

        await expect(service.authorize('task.create', 'user-1', 'task-1')).resolves.toBe(task);

        expect(repository.findAuthorizedTask).toHaveBeenCalledWith({
          taskId: 'task-1',
          userId: 'user-1',
          taskPermissions: ['TASK_UPDATE'],
          workspacePermissions: [],
          allowTaskCreator,
          allowWorkspaceOwner,
          allowAnyAssignee: false,
        });
      },
    );

    it('passes an empty permission list when the policy has none', async () => {
      jest.spyOn(service, 'getPolicy').mockReturnValue(taskPolicy('taskCreator'));
      repository.findAuthorizedTask.mockResolvedValue(null);

      await expect(service.authorize('task.create', 'user-1', 'task-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.findAuthorizedTask).toHaveBeenCalledWith(
        expect.objectContaining({ taskPermissions: [], workspacePermissions: [] }),
      );
    });
  });

  it('passes allowAnyAssignee from the task.view policy and returns the task', async () => {
    const task = { id: 'task-1' };
    repository.findAuthorizedTask.mockResolvedValue(task);

    await expect(service.authorize('task.view', 'user-1', 'task-1')).resolves.toBe(task);
    expect(repository.findAuthorizedTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      userId: 'user-1',
      taskPermissions: [],
      workspacePermissions: [],
      allowTaskCreator: true,
      allowWorkspaceOwner: true,
      allowAnyAssignee: true,
    });
  });

  it('task.changeStatus accepts either task permission and the workspace TASK_UPDATE', async () => {
    const task = { id: 'task-1' };
    repository.findAuthorizedTask.mockResolvedValue(task);

    await expect(service.authorize('task.changeStatus', 'user-1', 'task-1')).resolves.toBe(task);
    expect(repository.findAuthorizedTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      userId: 'user-1',
      taskPermissions: ['TASK_CHANGE_STATUS', 'TASK_UPDATE'],
      workspacePermissions: ['TASK_UPDATE'],
      allowTaskCreator: true,
      allowWorkspaceOwner: true,
      allowAnyAssignee: false,
    });
  });

  it('task.delete allows creator, workspace owner and workspace TASK_DELETE, not assignees', async () => {
    repository.findAuthorizedTask.mockResolvedValue({ id: 'task-1' });

    await service.authorize('task.delete', 'user-1', 'task-1');
    expect(repository.findAuthorizedTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      userId: 'user-1',
      taskPermissions: [],
      workspacePermissions: ['TASK_DELETE'],
      allowTaskCreator: true,
      allowWorkspaceOwner: true,
      allowAnyAssignee: false,
    });
  });

  it('task.update only accepts TASK_UPDATE', async () => {
    repository.findAuthorizedTask.mockResolvedValue({ id: 'task-1' });

    await service.authorize('task.update', 'user-1', 'task-1');
    expect(repository.findAuthorizedTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskPermissions: ['TASK_UPDATE'],
        workspacePermissions: ['TASK_UPDATE'],
      }),
    );
  });

  it('status.view lets the owner and any member through', async () => {
    repository.hasWorkspacePermissions.mockResolvedValue(true);

    await expect(service.authorize('status.view', 'user-1', 'ws-1')).resolves.toBeNull();
    expect(repository.hasWorkspacePermissions).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      userId: 'user-1',
      permissions: [],
      allowWorkspaceOwner: true,
      allowAnyMember: true,
    });
  });

  it('status.manage requires the owner or STATUS_MANAGE', async () => {
    repository.hasWorkspacePermissions.mockResolvedValue(false);

    await expect(service.authorize('status.manage', 'user-1', 'ws-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.hasWorkspacePermissions).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      userId: 'user-1',
      permissions: ['STATUS_MANAGE'],
      allowWorkspaceOwner: true,
      allowAnyMember: false,
    });
  });

  it('category.view lets the owner and any member through', async () => {
    repository.hasWorkspacePermissions.mockResolvedValue(true);

    await expect(service.authorize('category.view', 'user-1', 'ws-1')).resolves.toBeNull();
    expect(repository.hasWorkspacePermissions).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: [], allowWorkspaceOwner: true, allowAnyMember: true }),
    );
  });

  it('category.manage requires the owner or CATEGORY_MANAGE', async () => {
    repository.hasWorkspacePermissions.mockResolvedValue(true);

    await service.authorize('category.manage', 'user-1', 'ws-1');
    expect(repository.hasWorkspacePermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: ['CATEGORY_MANAGE'],
        allowWorkspaceOwner: true,
        allowAnyMember: false,
      }),
    );
  });

  it('passes an empty permission list for a workspace policy without a permission', async () => {
    jest
      .spyOn(service, 'getPolicy')
      .mockReturnValue({ scope: 'workspace', owner: 'workspaceOwner', arg: 'workspaceId' });
    repository.hasWorkspacePermissions.mockResolvedValue(true);

    await service.authorize('task.create', 'user-1', 'ws-1');

    expect(repository.hasWorkspacePermissions).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: [] }),
    );
  });
});
