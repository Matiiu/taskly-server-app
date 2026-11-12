import { Logger } from '@nestjs/common';

import { TaskRolesListener } from '@/task-roles/task-roles.listener';
import { TaskRolesService } from '@/task-roles/task-roles.service';

const WORKSPACE_ID = 'workspace-id-1';

describe('TaskRolesListener', () => {
  let listener: TaskRolesListener;
  let taskRolesService: { createDefaultTaskRoles: jest.Mock };

  beforeEach(() => {
    taskRolesService = { createDefaultTaskRoles: jest.fn() };
    listener = new TaskRolesListener(taskRolesService as unknown as TaskRolesService);
  });

  it('creates the default task roles of the new workspace', async () => {
    taskRolesService.createDefaultTaskRoles.mockResolvedValue(true);

    await listener.handleWorkspaceCreated({ workspaceId: WORKSPACE_ID });

    expect(taskRolesService.createDefaultTaskRoles).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it('logs and swallows a failure so it never reaches the request', async () => {
    const boom = new Error('db down');
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    taskRolesService.createDefaultTaskRoles.mockRejectedValue(boom);

    await expect(listener.handleWorkspaceCreated({ workspaceId: WORKSPACE_ID })).resolves.toBe(
      undefined,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      `Failed to create default task roles for workspace ${WORKSPACE_ID}`,
      boom,
    );
    errorSpy.mockRestore();
  });
});
