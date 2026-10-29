import { Injectable } from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import { EVENTS } from '@/common/constants/events.constants';
import type { WorkspaceCreatedEvent } from '@/common/types/events.types';
import type { Db } from '@/prisma/prisma.types';
import { WorkspaceRepository } from '@/workspace/workspace.repository';
import { generateWorkspaceCode } from '@/workspace/utils/workspace-code.util';
import {
  DEFAULT_TASK_PREFIX,
  DEFAULT_WORKSPACE_NAME,
} from '@/workspace/constants/workspace.constants';
import type { User, Workspace } from 'generated/prisma/client';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  /**
   * Creates the owner's default workspace. Meant to run inside the registration transaction.
   * No retry on the code: it is unique per owner and a new user has no other workspaces.
   */
  createDefault(ownerId: User['id'], db?: Db): Promise<Workspace> {
    return this.workspaceRepo.create(
      {
        name: DEFAULT_WORKSPACE_NAME,
        code: generateWorkspaceCode(),
        taskPrefix: DEFAULT_TASK_PREFIX,
        description: null,
        isDefault: true,
        ownerId,
      },
      db,
    );
  }

  /** Call after the workspace is committed: logs it and lets listeners seed its defaults. */
  notifyCreated(workspace: Workspace, userId: User['id']): void {
    const { id, name, code, taskPrefix, description, isDefault, ownerId } = workspace;

    this.eventEmitter.emitAuditLog({
      userId,
      action: 'CREATE_WORKSPACE',
      entityId: id,
      entity: 'Workspace',
      description: `Workspace "${name}" was created`,
      after: { id, name, code, taskPrefix, description, isDefault, ownerId },
    });

    this.eventEmitter.emit<WorkspaceCreatedEvent>(EVENTS.WORKSPACE_CREATED, { workspaceId: id });
  }
}
