import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EVENTS } from '@/common/constants/events.constants';
import type { WorkspaceCreatedEvent } from '@/common/types/events.types';
import { StatusesService } from '@/statuses/statuses.service';

@Injectable()
export class StatusesListener {
  private readonly logger = new Logger(StatusesListener.name);

  constructor(private readonly statusesService: StatusesService) {}

  // Runs in the background: a failure here must not reach the request that created the workspace.
  @OnEvent(EVENTS.WORKSPACE_CREATED, { async: true })
  async handleWorkspaceCreated({ workspaceId }: WorkspaceCreatedEvent): Promise<void> {
    try {
      await this.statusesService.createDefaultStatuses(workspaceId);
    } catch (e) {
      this.logger.error(`Failed to create default statuses for workspace ${workspaceId}`, e);
    }
  }
}
