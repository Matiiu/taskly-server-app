import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EVENTS } from '@/common/constants/events.constants';
import type { WorkspaceCreatedEvent } from '@/common/types/events.types';
import { WorkspaceRolesService } from '@/workspace-roles/workspace-roles.service';

@Injectable()
export class WorkspaceRolesListener {
  private readonly logger = new Logger(WorkspaceRolesListener.name);

  constructor(private readonly workspaceRolesService: WorkspaceRolesService) {}

  // Runs in the background: a failure here must not reach the request that created the workspace.
  @OnEvent(EVENTS.WORKSPACE_CREATED, { async: true })
  async handleWorkspaceCreated({ workspaceId }: WorkspaceCreatedEvent): Promise<void> {
    try {
      await this.workspaceRolesService.createDefaultWorkspaceRoles(workspaceId);
    } catch (e) {
      this.logger.error(`Failed to create default workspace roles for workspace ${workspaceId}`, e);
    }
  }
}
