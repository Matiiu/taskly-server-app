import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import type { User, Status } from 'generated/prisma/client';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constant';
import { paginationMeta } from '@/common/utils/pagination.util';
import { StatusType } from './entities/status.type';
import { PaginatedStatusesType } from './entities/paginated-statuses.type';
import { UpdateTaskStatusInput } from '@/tasks/dto/update-task-status.input';
import { UpdateStatusColorInput } from '@/statuses/dto/update-status-color.input';
import { DEFAULT_STATUSES, COLORS } from '@/common/constants/colors.contats';

@Injectable()
export class StatusesService {
  private readonly logger = new Logger(StatusesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  async createDefaultStatuses(userId: User['id']): Promise<boolean> {
    const existingStatuses = await this.prisma.status.findMany({
      where: { userId },
    });

    if (existingStatuses.length > 0) return false;

    const createdStatuses = await this.prisma.status.createMany({
      data: DEFAULT_STATUSES.map((status) => ({
        ...status,
        userId,
      })),
    });

    return createdStatuses.count === DEFAULT_STATUSES.length;
  }

  async findMany(
    userId: User['id'],
    {
      limit = LIMIT_DEFAULT,
      page = PAGE_DEFAULT,
      statusName,
    }: { limit?: number; page?: number; statusName?: string } = {},
  ): Promise<PaginatedStatusesType> {
    const where = {
      userId,
      ...(statusName && { name: { contains: statusName, mode: 'insensitive' as const } }),
    };

    const [statuses, total] = await this.prisma.$transaction([
      this.prisma.status.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.status.count({ where }),
    ]);

    return {
      statuses: statuses.map((status) => this.createResponse(status)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async findOne(userId: User['id'], id: Status['id']): Promise<StatusType> {
    const status = await this.prisma.status.findFirst({
      where: { id, userId },
    });

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    return this.createResponse(status);
  }

  async findByIdOrNameOrCreate(userId: User['id'], input: UpdateTaskStatusInput): Promise<Status> {
    const { id, name } = input;

    if (id) {
      const existingStatusById = await this.prisma.status.findFirst({
        where: { id, userId },
      });

      if (existingStatusById) {
        return existingStatusById;
      }
    }

    const existingStatusByName = await this.prisma.status.findFirst({
      where: { name, userId },
    });

    if (existingStatusByName) {
      return existingStatusByName;
    }

    return this.prisma.status.create({
      data: {
        userId,
        name,
        color: COLORS.DEFAULT_INITIAL,
      },
    });
  }

  async updateColor(
    userId: User['id'],
    id: Status['id'],
    input: UpdateStatusColorInput,
  ): Promise<StatusType> {
    const existingStatus = await this.prisma.status.findUniqueOrThrow({
      where: { id },
    });

    try {
      const updatedStatus = await this.prisma.status.update({
        where: { id },
        data: { color: input.color },
      });

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

  async remove(userId: User['id'], id: Status['id']): Promise<StatusType> {
    try {
      const removedStatus = await this.prisma.status.delete({
        where: { id },
      });

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
}
