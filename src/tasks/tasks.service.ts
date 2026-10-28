import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import { CreateTaskInput } from '@/tasks/dto/create-task.input';
import { UpdateTaskStatusInput } from '@/tasks/dto/update-task-status.input';
import { UpdateTaskCategoryInput } from '@/tasks/dto/update-task-category.input';
import { TaskDetailType } from '@/tasks/entities/task-detail.type';
import type { User, Workspace } from 'generated/prisma/client';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constants';
import { paginationMeta } from '@/common/utils/pagination.util';
import { PaginatedTaskSummaryType } from './entities/paginated-task-summary.type';
import { StatusesService } from '@/statuses/statuses.service';
import { CategoriesService } from '@/categories/categories.service';
import { TaskListItemType } from '@/tasks/entities/task-list.type';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { TasksRepository, type TaskListRow, type TaskWithRelations } from './tasks.repository';
import { TasksFiltersInput } from './dto/tasks-filters.input';
import { TaskRelation } from '@/tasks/enums/task-relation.enums';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly eventEmitter: AppEventEmitterService,
    private readonly statusesService: StatusesService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    userId: User['id'],
    workspaceId: Workspace['id'],
    input: CreateTaskInput,
  ): Promise<TaskDetailType> {
    try {
      const task = await this.tasksRepo.create({
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        createdById: userId,
        sequenceNumber: 1,
        workspaceId,
        statusId: null,
      });

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'CREATE_TASK',
        entityId: task.id,
        entity: 'Task',
        description: `Task "${task.title}" has been created`,
        after: {
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: null,
          category: null,
        },
      });

      return this.toDetail(task, userId);
    } catch (e) {
      this.logger.error('Error creating task', e);
      throw new BadRequestException('Failed to create task');
    }
  }

  async findMany(
    userId: User['id'],
    { limit = LIMIT_DEFAULT, page = PAGE_DEFAULT, sortOrder = 'desc' }: PaginationArgsInput = {},
    { search = null, relations }: TasksFiltersInput = {},
  ): Promise<PaginatedTaskSummaryType> {
    const { tasks, total } = await this.tasksRepo.findPageForUser({
      limit,
      page,
      sortOrder,
      userId,
      search,
      relations,
      active: true,
    });

    return {
      tasks: tasks.map((task) => this.toListItem(task, userId)),
      meta: paginationMeta(total, page, limit),
    };
  }

  /**
   * Updates a task that was already loaded and authorized (PolicyGuard + @CurrentTask()).
   */
  async update(
    existingTask: TaskWithRelations,
    userId: User['id'],
    input: Partial<CreateTaskInput>,
  ): Promise<TaskDetailType> {
    try {
      const updatedTask = await this.tasksRepo.update(existingTask.id, {
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
      });

      this.eventEmitter.emitAuditLog({
        // The user who made the change, not the creator: assignees with TASK_UPDATE can update too
        userId,
        action: 'UPDATE_TASK',
        entityId: existingTask.id,
        entity: 'Task',
        description: `Task "${existingTask.title}" has been updated`,
        before: {
          id: existingTask.id,
          title: existingTask.title,
          description: existingTask.description,
          dueDate: existingTask.dueDate,
          status: existingTask.status,
          category: existingTask.category,
        },
        after: {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          dueDate: updatedTask.dueDate,
          status: updatedTask.status,
          category: updatedTask.category,
        },
      });

      return this.toDetail(updatedTask, userId);
    } catch (e) {
      this.logger.error('Error updating task', e);
      throw new BadRequestException('Failed to update task');
    }
  }

  /**
   * Changes the status of a task that was already loaded and authorized (PolicyGuard + @CurrentTask()).
   */
  async updateStatus(
    userTask: TaskWithRelations,
    userId: User['id'],
    input: UpdateTaskStatusInput,
  ): Promise<TaskDetailType> {
    const status = await this.statusesService.create(userTask.workspaceId, input);

    try {
      const updatedTask = await this.tasksRepo.update(userTask.id, { statusId: status.id });

      this.eventEmitter.emitAuditLog({
        // The user who made the change, not the creator: assignees can change the status too
        userId,
        action: 'UPDATE_TASK',
        entityId: userTask.id,
        entity: 'Task',
        description: `Status from "${userTask.status?.name ?? 'None'}" to "${status.name}"`,
        before: {
          id: userTask.id,
          title: userTask.title,
          description: userTask.description,
          dueDate: userTask.dueDate,
          status: userTask.status,
          category: userTask.category,
        },
        after: {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          dueDate: updatedTask.dueDate,
          status: updatedTask.status,
          category: updatedTask.category,
        },
      });

      return this.toDetail(updatedTask, userId);
    } catch (e) {
      this.logger.error('Error updating task status', e);
      throw new BadRequestException('Failed to update task status');
    }
  }

  /**
   * Changes the category of a task that was already loaded and authorized (PolicyGuard + @CurrentTask()).
   */
  async updateCategory(
    userTask: TaskWithRelations,
    userId: User['id'],
    input: UpdateTaskCategoryInput,
  ): Promise<TaskDetailType> {
    const category = await this.categoriesService.create(userTask.workspaceId, input);

    try {
      const updatedTask = await this.tasksRepo.update(userTask.id, { categoryId: category.id });

      this.eventEmitter.emitAuditLog({
        // The user who made the change, not the creator: anyone allowed by task.update can change it
        userId,
        action: 'UPDATE_TASK',
        entityId: userTask.id,
        entity: 'Task',
        description: `Category from "${userTask.category?.name ?? 'None'}" to "${category.name}"`,
        before: {
          id: userTask.id,
          title: userTask.title,
          description: userTask.description,
          dueDate: userTask.dueDate,
          status: userTask.status,
          category: userTask.category,
        },
        after: {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          dueDate: updatedTask.dueDate,
          status: updatedTask.status,
          category: updatedTask.category,
        },
      });

      return this.toDetail(updatedTask, userId);
    } catch (e) {
      this.logger.error('Error updating task category', e);
      throw new BadRequestException('Failed to update task category');
    }
  }

  /**
   * Soft-deletes a task that was already loaded and authorized (PolicyGuard + @CurrentTask()).
   */
  async remove(userTask: TaskWithRelations, userId: User['id']): Promise<TaskDetailType> {
    try {
      const removedTask = await this.tasksRepo.deactivate(userTask.id);

      this.eventEmitter.emitAuditLog({
        // The user who made the change, not the creator: members with TASK_DELETE can delete too
        userId,
        action: 'INACTIVATE_TASK',
        entityId: userTask.id,
        entity: 'Task',
        description: `Task "${userTask.title}" has been inactivated`,
        before: {
          id: userTask.id,
          title: userTask.title,
          description: userTask.description,
          dueDate: userTask.dueDate,
          status: userTask.status,
          category: userTask.category,
        },
        after: {
          id: removedTask.id,
          title: removedTask.title,
          description: removedTask.description,
          dueDate: removedTask.dueDate,
          status: removedTask.status,
          category: removedTask.category,
        },
      });

      return this.toDetail(removedTask, userId);
    } catch (e) {
      this.logger.error('Error removing task', e);
      throw new BadRequestException('Failed to remove task');
    }
  }

  toDetail(task: TaskWithRelations, currentUserId: User['id']): TaskDetailType {
    return {
      id: task.id,
      title: task.title,
      code: this.toTaskCode(task),
      description: task.description,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      status: task.status,
      category: task.category,
      relations: this.toRelations(task, currentUserId),
    };
  }

  toListItem(task: TaskListRow, currentUserId: User['id']): TaskListItemType {
    return {
      id: task.id,
      title: task.title,
      code: this.toTaskCode(task),
      dueDate: task.dueDate,
      status: task.status,
      category: task.category,
      relations: this.toRelations(task, currentUserId),
    };
  }

  private toTaskCode(task: Pick<TaskListRow, 'sequenceNumber' | 'workspace'>): string {
    return `${task.workspace.taskPrefix}-${task.sequenceNumber}`;
  }

  /**
   * Works for the detail (all assignees loaded) and the list (assignees pre-filtered to the user),
   * since both only need to know whether the current user is among them.
   */
  private toRelations(
    task: Pick<TaskListRow, 'createdById' | 'assignees'>,
    currentUserId: User['id'],
  ): TaskRelation[] {
    const relations: TaskRelation[] = [];
    if (task.createdById === currentUserId) relations.push(TaskRelation.CREATED);
    if (task.assignees.some(({ userId }) => userId === currentUserId)) {
      relations.push(TaskRelation.ASSIGNED);
    }
    return relations;
  }
}
