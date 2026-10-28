import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constants';
import { paginationMeta } from '@/common/utils/pagination.util';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { UsersService } from '@/users/users.service';
import { TaskRolesService } from '@/task-roles/task-roles.service';
import { AddTaskAssigneeInput } from '@/task-assignees/dto/add-task-assignee.input';
import { TaskAssigneeType } from '@/task-assignees/entities/task-assignee.type';
import { PaginatedTaskAssigneesType } from '@/task-assignees/entities/paginated-task-assignees.type';
import {
  TaskAssigneesRepository,
  type OwnedTask,
} from '@/task-assignees/task-assignees.repository';
import type { SafeUser } from '@/users/types/users.type';
import type { Task, User } from 'generated/prisma/client';

@Injectable()
export class TaskAssigneesService {
  private readonly logger = new Logger(TaskAssigneesService.name);

  constructor(
    private readonly taskAssigneesRepo: TaskAssigneesRepository,
    private readonly usersService: UsersService,
    private readonly taskRolesService: TaskRolesService,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  /** Assigns a user to the task with a task role that must exist in the task's workspace. */
  async create(userId: User['id'], input: AddTaskAssigneeInput): Promise<TaskAssigneeType> {
    const task = await this.findOwnedTaskOrThrow(userId, input.taskId);
    const assignee = this.toAssigneeType(await this.usersService.findByIdOrThrow(input.assigneeId));
    const role = await this.taskRolesService.findInWorkspaceOrThrow(task.workspaceId, input.roleId);

    if (await this.taskAssigneesRepo.findByTaskAndUser(task.id, assignee.id)) {
      throw new BadRequestException('User is already assigned to this task');
    }

    try {
      await this.taskAssigneesRepo.create({
        taskId: task.id,
        userId: assignee.id,
        roleId: role.id,
        assignedById: userId,
      });
    } catch (e) {
      this.logger.error('Error adding task assignee', e);
      throw new BadRequestException('Failed to add task assignee');
    }

    this.eventEmitter.emitAuditLog({
      userId,
      action: 'ASSIGN_TASK',
      entityId: task.id,
      entity: 'TaskAssignee',
      description: `Assignee ${assignee.code} was added to task "${task.title}" as "${role.name}"`,
      after: {
        task: this.toTaskSnapshot(task),
        assignedUser: assignee,
        role: { id: role.id, name: role.name },
      },
    });

    return assignee;
  }

  async findMany(
    userId: User['id'],
    taskId: Task['id'],
    { limit = LIMIT_DEFAULT, page = PAGE_DEFAULT, sortOrder = 'asc' }: PaginationArgsInput = {},
    search: string | null = null,
  ): Promise<PaginatedTaskAssigneesType> {
    await this.findOwnedTaskOrThrow(userId, taskId);

    const { assignees, total } = await this.taskAssigneesRepo.findPage({
      taskId,
      page,
      limit,
      sortOrder,
      search,
    });

    return {
      assignees,
      meta: paginationMeta(total, page, limit),
    };
  }

  async remove(
    userId: User['id'],
    taskId: Task['id'],
    assigneeId: User['id'],
  ): Promise<TaskAssigneeType> {
    const task = await this.findOwnedTaskOrThrow(userId, taskId);
    const assignment = await this.taskAssigneesRepo.findByTaskAndUser(taskId, assigneeId);

    if (!assignment) {
      throw new NotFoundException('Task assignee not found');
    }

    try {
      await this.taskAssigneesRepo.delete(taskId, assigneeId);
    } catch (e) {
      this.logger.error('Error removing task assignee', e);
      throw new BadRequestException('Failed to remove task assignee');
    }

    this.eventEmitter.emitAuditLog({
      userId,
      action: 'UNASSIGN_TASK',
      entityId: taskId,
      entity: 'TaskAssignee',
      description: `Assignee ${assignment.user.code} was removed from task "${task.title}"`,
      before: {
        task: this.toTaskSnapshot(task),
        unassignedUser: assignment.user,
        role: assignment.role,
      },
    });

    return assignment.user;
  }

  private async findOwnedTaskOrThrow(userId: User['id'], taskId: Task['id']): Promise<OwnedTask> {
    const task = await this.taskAssigneesRepo.findOwnedTask(userId, taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private toAssigneeType({
    id,
    name,
    firstSurname,
    secondSurname,
    email,
    code,
  }: SafeUser): TaskAssigneeType {
    return { id, name, firstSurname, secondSurname, email, code };
  }

  /** The audit snapshot leaves out `workspaceId`, which is only needed for the role check. */
  private toTaskSnapshot({ workspaceId: _workspaceId, ...snapshot }: OwnedTask) {
    return snapshot;
  }
}
