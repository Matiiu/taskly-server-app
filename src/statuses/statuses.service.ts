import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import type { User, Status, Workspace } from 'generated/prisma/client';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constants';
import { paginationMeta } from '@/common/utils/pagination.util';
import { StatusType } from './entities/status.type';
import { PaginatedStatusesType } from './entities/paginated-statuses.type';
import { UpdateTaskStatusInput } from '@/tasks/dto/update-task-status.input';
import { UpdateStatusColorInput } from '@/statuses/dto/update-status-color.input';
import { DEFAULT_STATUSES, COLORS } from '@/common/constants/colors.contats';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { StatusesRepository } from '@/statuses/statuses.repository';
import { isUniqueViolation } from '@/prisma/prisma.errors';

@Injectable()
export class StatusesService {
  private readonly logger = new Logger(StatusesService.name);

  constructor(
    private readonly statusesRepo: StatusesRepository,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  /** Seeds the default statuses of a new workspace. Returns false if it already has statuses. */
  async createDefaultStatuses(workspaceId: Workspace['id']): Promise<boolean> {
    if (await this.statusesRepo.existsInWorkspace(workspaceId)) return false;

    const created = await this.statusesRepo.createMany(workspaceId, [...DEFAULT_STATUSES]);

    return created === DEFAULT_STATUSES.length;
  }

  async findMany(
    workspaceId: Workspace['id'],
    { limit = LIMIT_DEFAULT, page = PAGE_DEFAULT, sortOrder = 'asc' }: PaginationArgsInput = {},
    search: string | null = null,
  ): Promise<PaginatedStatusesType> {
    const { statuses, total } = await this.statusesRepo.findPage({
      workspaceId,
      page,
      limit,
      sortOrder,
      search,
    });

    return {
      statuses: statuses.map((status) => this.createResponse(status)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async findOne(workspaceId: Workspace['id'], id: Status['id']): Promise<StatusType> {
    return this.createResponse(await this.findInWorkspaceOrThrow(workspaceId, id));
  }

  /**
   * Creates a status in the workspace.
   * Throws ConflictException when one already exists with the given id or name.
   */
  async create(workspaceId: Workspace['id'], input: UpdateTaskStatusInput): Promise<Status> {
    const { id, name } = input;

    const existingStatus =
      (id ? await this.statusesRepo.findById(workspaceId, id) : null) ??
      (await this.statusesRepo.findByName(workspaceId, name));

    if (existingStatus) {
      throw new ConflictException(`Status ${existingStatus.name} already exists`);
    }

    try {
      return await this.statusesRepo.create({ workspaceId, name, color: COLORS.DEFAULT_INITIAL });
    } catch (e) {
      // Another request created the same name between the check and the insert
      if (isUniqueViolation(e)) throw new ConflictException(`Status ${name} already exists`);
      throw e;
    }
  }

  async updateColor(
    workspaceId: Workspace['id'],
    userId: User['id'],
    id: Status['id'],
    input: UpdateStatusColorInput,
  ): Promise<StatusType> {
    const existingStatus = await this.findInWorkspaceOrThrow(workspaceId, id);

    try {
      const updatedStatus = await this.statusesRepo.updateColor(id, input.color);

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'UPDATE_COLOR_STATUS',
        entityId: updatedStatus.id,
        entity: 'Status',
        description: `Status "${updatedStatus.name}" color updated from "${existingStatus.color ?? 'None'}" to "${updatedStatus.color ?? 'None'}"`,
        before: {
          id: existingStatus.id,
          name: existingStatus.name,
          color: existingStatus.color,
        },
        after: {
          id: updatedStatus.id,
          name: updatedStatus.name,
          color: updatedStatus.color,
        },
      });

      return this.createResponse(updatedStatus);
    } catch (e) {
      this.logger.error('Error updating status', e);
      throw new BadRequestException('Failed to update status');
    }
  }

  async remove(
    workspaceId: Workspace['id'],
    userId: User['id'],
    id: Status['id'],
  ): Promise<StatusType> {
    await this.findInWorkspaceOrThrow(workspaceId, id);

    try {
      const removedStatus = await this.statusesRepo.delete(id);

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'DELETE_STATUS',
        entityId: removedStatus.id,
        entity: 'Status',
        description: `Status "${removedStatus.name}" has been deleted`,
        before: {
          id: removedStatus.id,
          name: removedStatus.name,
          color: removedStatus.color,
        },
      });

      return this.createResponse(removedStatus);
    } catch (e) {
      this.logger.error('Error removing status', e);
      throw new BadRequestException('Failed to remove status');
    }
  }

  createResponse(status: Status): StatusType {
    const { id, name, color, createdAt, updatedAt } = status;
    return {
      id,
      name,
      color,
      createdAt,
      updatedAt,
    };
  }

  /** 404 when the status does not exist or belongs to another workspace. */
  private async findInWorkspaceOrThrow(
    workspaceId: Workspace['id'],
    id: Status['id'],
  ): Promise<Status> {
    const status = await this.statusesRepo.findById(workspaceId, id);

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    return status;
  }
}
