import { WorkspaceRolesService } from '@/workspace-roles/workspace-roles.service';
import { WorkspaceRolesRepository } from '@/workspace-roles/workspace-roles.repository';
import { DEFAULT_WORKSPACE_ROLES } from '@/workspace-roles/constants/workspace-role.constants';

const WORKSPACE_ID = 'workspace-id-1';

describe('WorkspaceRolesService', () => {
  let service: WorkspaceRolesService;
  let workspaceRolesRepo: { existsInWorkspace: jest.Mock; createMany: jest.Mock };

  beforeEach(() => {
    workspaceRolesRepo = { existsInWorkspace: jest.fn(), createMany: jest.fn() };
    service = new WorkspaceRolesService(workspaceRolesRepo as unknown as WorkspaceRolesRepository);
  });

  describe('createDefaultWorkspaceRoles', () => {
    it('does nothing and returns false when the workspace already has roles', async () => {
      workspaceRolesRepo.existsInWorkspace.mockResolvedValue(true);

      await expect(service.createDefaultWorkspaceRoles(WORKSPACE_ID)).resolves.toBe(false);
      expect(workspaceRolesRepo.createMany).not.toHaveBeenCalled();
    });

    it('seeds the default roles as system roles and returns true when all were created', async () => {
      workspaceRolesRepo.existsInWorkspace.mockResolvedValue(false);
      workspaceRolesRepo.createMany.mockResolvedValue(DEFAULT_WORKSPACE_ROLES.length);

      await expect(service.createDefaultWorkspaceRoles(WORKSPACE_ID)).resolves.toBe(true);
      expect(workspaceRolesRepo.createMany).toHaveBeenCalledWith(
        WORKSPACE_ID,
        DEFAULT_WORKSPACE_ROLES.map(({ name, description, permissions }) => ({
          name,
          description,
          permissions: [...permissions],
          isSystem: true,
        })),
      );
    });

    it('returns false when not every default role was created', async () => {
      workspaceRolesRepo.existsInWorkspace.mockResolvedValue(false);
      workspaceRolesRepo.createMany.mockResolvedValue(DEFAULT_WORKSPACE_ROLES.length - 1);

      await expect(service.createDefaultWorkspaceRoles(WORKSPACE_ID)).resolves.toBe(false);
    });
  });
});
