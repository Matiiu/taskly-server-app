import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EVENTS } from '@/common/constants/events.constants';
import type { WorkspaceCreatedEvent } from '@/common/types/events.types';
import { TaskRolesService } from '@/task-roles/task-roles.service';

@Injectable()
export class TaskRolesListener {
  private readonly logger = new Logger(TaskRolesListener.name);

  constructor(private readonly taskRolesService: TaskRolesService) {}

  // Runs in the background: a failure here must not reach the request that created the workspace.
  @OnEvent(EVENTS.WORKSPACE_CREATED, { async: true })
  async handleWorkspaceCreated({ workspaceId }: WorkspaceCreatedEvent): Promise<void> {
    try {
      await this.taskRolesService.createDefaultTaskRoles(workspaceId);
    } catch (e) {
      this.logger.error(`Failed to create default task roles for workspace ${workspaceId}`, e);
    }
  }
}
