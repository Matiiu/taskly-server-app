import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { AddTaskAssigneeInput } from '@/task-assignees/dto/add-task-assignee.input';
import { TaskAssigneeType } from '@/task-assignees/entities/task-assignee.type';
import type { Task, User } from 'generated/prisma/client';

@Injectable()
export class TaskAssigneesService {
  private readonly logger = new Logger(TaskAssigneesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  async create(userId: User['id'], input: AddTaskAssigneeInput): Promise<TaskAssigneeType> {
    const task = await this.findOwnedTaskOrThrow(userId, input.taskId);
    const assignee = await this.findAssigneeOrThrow(input.assigneeId);

    const existingTaskAssignee = await this.prisma.taskAssignee.findUnique({
      where: {
        taskId_userId: {
          taskId: input.taskId,
          userId: input.assigneeId,
        },
      },
    });

    if (existingTaskAssignee) {
      throw new BadRequestException('User is already assigned to this task');
    }

    try {
      await this.prisma.taskAssignee.create({
        data: {
          taskId: input.taskId,
          userId: input.assigneeId,
        },
      });
      this.eventEmitter.emitAuditLog({
        userId,
        action: 'ASSIGN_TASK',
        entityId: input.taskId,
        entity: 'TaskAssignee',
        description: `Assignee ${assignee.code} was added to task "${task.title}"`,
        after: {
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            category: task.category,
          },
          assignedUser: assignee,
        },
      });

      return assignee;
    } catch (e) {
      this.logger.error('Error adding task assignee', e);
      throw new BadRequestException('Failed to add task assignee');
    }
  }

  async findMany(
    userId: User['id'],
    taskId: Task['id'],
    query?: string,
  ): Promise<TaskAssigneeType[]> {
    await this.findOwnedTaskOrThrow(userId, taskId);

    const taskAssignees = await this.prisma.taskAssignee.findMany({
      where: {
        taskId,
        user: {
          active: true,
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' as const } },
                  { lastName: { contains: query, mode: 'insensitive' as const } },
                  { email: { contains: query, mode: 'insensitive' as const } },
                  { code: { contains: query, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            code: true,
          },
        },
      },
      orderBy: [{ user: { name: 'asc' } }, { user: { lastName: 'asc' } }],
    });

    return taskAssignees.map(({ user }) => user);
  }

  async remove(
    userId: User['id'],
    taskId: Task['id'],
    assigneeId: User['id'],
  ): Promise<TaskAssigneeType> {
    const task = await this.findOwnedTaskOrThrow(userId, taskId);

    const taskAssignee = await this.prisma.taskAssignee.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: assigneeId,
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            code: true,
          },
        },
      },
    });

    if (!taskAssignee) {
      throw new NotFoundException('Task assignee not found');
    }

    try {
      await this.prisma.taskAssignee.delete({
        where: {
          taskId_userId: {
            taskId,
            userId: assigneeId,
          },
        },
      });

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'UNASSIGN_TASK',
        entityId: taskId,
        entity: 'TaskAssignee',
        description: `Assignee ${taskAssignee.user.code} was removed from task "${task.title}"`,
        before: {
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            category: task.category,
          },
          unassignedUser: taskAssignee.user,
        },
      });

      return taskAssignee.user;
    } catch (e) {
      this.logger.error('Error removing task assignee', e);
      throw new BadRequestException('Failed to remove task assignee');
    }
  }

  private async findOwnedTaskOrThrow(
    userId: User['id'],
    taskId: Task['id'],
  ): Promise<{
    id: Task['id'];
    title: Task['title'];
    description: Task['description'];
    dueDate: Task['dueDate'];
    status: { id: string; name: string; color: string | null } | null;
    category: { id: string; name: string; color: string | null } | null;
  }> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, active: true },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        status: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async findAssigneeOrThrow(assigneeId: User['id']): Promise<TaskAssigneeType> {
    const assignee = await this.prisma.user.findFirst({
      where: {
        id: assigneeId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        code: true,
      },
    });

    if (!assignee) {
      throw new NotFoundException('User not found');
    }

    return assignee;
  }
}
