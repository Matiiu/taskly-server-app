import { Logger } from '@nestjs/common';

import { WorkspaceRolesListener } from '@/workspace-roles/workspace-roles.listener';
import { WorkspaceRolesService } from '@/workspace-roles/workspace-roles.service';

const WORKSPACE_ID = 'workspace-id-1';

describe('WorkspaceRolesListener', () => {
  let listener: WorkspaceRolesListener;
  let workspaceRolesService: { createDefaultWorkspaceRoles: jest.Mock };

  beforeEach(() => {
    workspaceRolesService = { createDefaultWorkspaceRoles: jest.fn() };
    listener = new WorkspaceRolesListener(
      workspaceRolesService as unknown as WorkspaceRolesService,
    );
  });

  it('creates the default roles of the new workspace', async () => {
    workspaceRolesService.createDefaultWorkspaceRoles.mockResolvedValue(true);

    await listener.handleWorkspaceCreated({ workspaceId: WORKSPACE_ID });

    expect(workspaceRolesService.createDefaultWorkspaceRoles).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it('logs and swallows a failure so it never reaches the request', async () => {
    const boom = new Error('db down');
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    workspaceRolesService.createDefaultWorkspaceRoles.mockRejectedValue(boom);

    await expect(listener.handleWorkspaceCreated({ workspaceId: WORKSPACE_ID })).resolves.toBe(
      undefined,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      `Failed to create default workspace roles for workspace ${WORKSPACE_ID}`,
      boom,
    );
    errorSpy.mockRestore();
  });
});
