import { Module } from '@nestjs/common';

import { WorkspaceRolesService } from '@/workspace-roles/workspace-roles.service';
import { WorkspaceRolesRepository } from '@/workspace-roles/workspace-roles.repository';
import { WorkspaceRolesListener } from '@/workspace-roles/workspace-roles.listener';

// No resolver yet: workspace roles have no endpoints until the role CRUD is built.
@Module({
  providers: [WorkspaceRolesService, WorkspaceRolesRepository, WorkspaceRolesListener],
  exports: [WorkspaceRolesService],
})
export class WorkspaceRolesModule {}
