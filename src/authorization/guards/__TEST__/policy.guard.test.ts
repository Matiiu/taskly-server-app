import { BadRequestException, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedUserNotFoundException } from '@/common/exceptions/authenticated-user-not-found.exception';
import { PolicyGuard } from '@/authorization/guards/policy.guard';
import { AuthorizationService } from '@/authorization/authorization.service';
import { TASK_POLICIES } from '@/authorization/policies/task.policies';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';

describe('PolicyGuard', () => {
  let guard: PolicyGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let authorizationService: { getPolicy: jest.Mock; authorize: jest.Mock };

  const mockContext: ExecutionContext = buildGuardContext();

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue('task.create') };
    authorizationService = {
      getPolicy: jest.fn().mockReturnValue(TASK_POLICIES['task.create']),
      authorize: jest.fn().mockResolvedValue(null),
    };

    guard = new PolicyGuard(
      reflector as unknown as Reflector,
      authorizationService as unknown as AuthorizationService,
    );
  });

  it('throws ForbiddenException when the handler has no @Can() policy', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    mockGqlContext({ user: { id: 'user-1' } }, { workspaceId: 'ws-1' });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    expect(authorizationService.authorize).not.toHaveBeenCalled();
  });

  it('throws AuthenticatedUserNotFoundException when no user is on the request', async () => {
    mockGqlContext({}, { workspaceId: 'ws-1' });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      AuthenticatedUserNotFoundException,
    );
  });

  it.each([{}, { workspaceId: '' }, { workspaceId: 42 }])(
    'throws BadRequestException when the policy argument is missing or invalid (%o)',
    async (args) => {
      mockGqlContext({ user: { id: 'user-1' } }, args);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    },
  );

  it('authorizes the action against the argument named by the policy', async () => {
    const request: Record<string, unknown> = { user: { id: 'user-1' } };
    mockGqlContext(request, { workspaceId: 'ws-1' });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    expect(authorizationService.authorize).toHaveBeenCalledWith('task.create', 'user-1', 'ws-1');
    expect(request).not.toHaveProperty('task');
  });

  it('stores the authorized task on the request for task-scope policies', async () => {
    const task = { id: 'task-1', title: 'Write tests' };
    const request: Record<string, unknown> = { user: { id: 'user-1' } };
    authorizationService.getPolicy.mockReturnValue({
      scope: 'task',
      task: ['TASK_UPDATE'],
      owner: 'taskCreator',
      arg: 'id',
    });
    authorizationService.authorize.mockResolvedValue(task);
    mockGqlContext(request, { id: 'task-1' });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    expect(authorizationService.authorize).toHaveBeenCalledWith('task.create', 'user-1', 'task-1');
    expect(request.task).toBe(task);
  });

  it('propagates ForbiddenException from the authorization service', async () => {
    mockGqlContext({ user: { id: 'user-1' } }, { workspaceId: 'ws-1' });
    authorizationService.authorize.mockRejectedValue(new ForbiddenException());

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });
});
