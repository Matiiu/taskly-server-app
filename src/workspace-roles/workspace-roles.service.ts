import { Injectable } from '@nestjs/common';

import { WorkspaceRolesRepository } from '@/workspace-roles/workspace-roles.repository';
import { DEFAULT_WORKSPACE_ROLES } from '@/workspace-roles/constants/workspace-role.constants';
import type { Workspace } from 'generated/prisma/client';

@Injectable()
export class WorkspaceRolesService {
  constructor(private readonly workspaceRolesRepo: WorkspaceRolesRepository) {}

  /** Seeds the default roles of a new workspace. Returns false if it already has roles. */
  async createDefaultWorkspaceRoles(workspaceId: Workspace['id']): Promise<boolean> {
    if (await this.workspaceRolesRepo.existsInWorkspace(workspaceId)) return false;

    const created = await this.workspaceRolesRepo.createMany(
      workspaceId,
      DEFAULT_WORKSPACE_ROLES.map(({ name, description, permissions }) => ({
        name,
        description,
        permissions: [...permissions],
        isSystem: true,
      })),
    );

    return created === DEFAULT_WORKSPACE_ROLES.length;
  }
}
