import { Resolver, Mutation, Args, Query, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/login/decorators/current-user.decorator';
import { TasksService } from '@/tasks/tasks.service';
import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { CreateTaskInput } from '@/tasks/dto/create-task.input';
import { UpdateTaskStatusInput } from '@/tasks/dto/update-task-status.input';
import { UpdateTaskCategoryInput } from '@/tasks/dto/update-task-category.input';
import { PaginatedTaskSummaryType } from '@/tasks/entities/paginated-task-summary.type';
import type { User, Task } from 'generated/prisma/client';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { Can } from '@/authorization/decorators/can.decorator';
import { PolicyGuard } from '@/authorization/guards/policy.guard';
import { CurrentTask } from '@/authorization/decorators/current-task.decorator';
import { TaskDetailType } from '@/tasks/entities/task-detail.type';
import type { TaskWithRelations } from '@/tasks/tasks.repository';
import type { Workspace } from 'generated/prisma/client';
import { MutationPayload } from '@/common/entities/mutation-payload.factory';
import { TasksFiltersInput } from '@/tasks/dto/tasks-filters.input';
import { TASK_MESSAGES } from '@/tasks/constants/tasks-messages.constants';

const CreateTaskPayload = MutationPayload('CreateTaskPayload', { task: TaskDetailType });
const UpdateTaskPayload = MutationPayload('UpdateTaskPayload', { task: TaskDetailType });
const UpdateTaskStatusPayload = MutationPayload('UpdateTaskStatusPayload', {
  task: TaskDetailType,
});
const UpdateTaskCategoryPayload = MutationPayload('UpdateTaskCategoryPayload', {
  task: TaskDetailType,
});
const RemoveTaskPayload = MutationPayload('RemoveTaskPayload', { task: TaskDetailType });

@Resolver()
@UseGuards(JwtAuthGuard)
export class TasksResolver {
  constructor(private readonly tasksService: TasksService) {}

  @Mutation(() => CreateTaskPayload, { name: 'createTask' })
  @Can('task.create')
  @UseGuards(PolicyGuard)
  async create(
    @CurrentUser('id') userId: User['id'],
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('input') input: CreateTaskInput,
  ): Promise<InstanceType<typeof CreateTaskPayload>> {
    const task = await this.tasksService.create(userId, workspaceId, input);
    return { message: TASK_MESSAGES.CREATED(task), task };
  }

  @Query(() => PaginatedTaskSummaryType, { name: 'tasks' })
  findMany(
    @CurrentUser('id') userId: User['id'],
    @Args('pagination', { type: () => PaginationArgsInput, nullable: true })
    pagination: PaginationArgsInput = {},
    @Args('filters', { type: () => TasksFiltersInput, nullable: true })
    filters: TasksFiltersInput = {},
  ): Promise<PaginatedTaskSummaryType> {
    return this.tasksService.findMany(userId, pagination, filters);
  }

  @Query(() => TaskDetailType, { name: 'task' })
  @Can('task.view')
  @UseGuards(PolicyGuard)
  findOne(
    @CurrentUser('id') userId: User['id'],
    @Args('id', { type: () => ID }) _id: Task['id'],
    @CurrentTask() task: TaskWithRelations,
  ): TaskDetailType {
    return this.tasksService.toDetail(task, userId);
  }

  @Mutation(() => UpdateTaskPayload, { name: 'updateTask' })
  @Can('task.update')
  @UseGuards(PolicyGuard)
  async update(
    @CurrentUser('id') userId: User['id'],
    @Args('id', { type: () => ID }) _id: Task['id'],
    @Args('input') input: CreateTaskInput,
    @CurrentTask() existingTask: TaskWithRelations,
  ): Promise<InstanceType<typeof UpdateTaskPayload>> {
    const task = await this.tasksService.update(existingTask, userId, input);

    return { message: TASK_MESSAGES.UPDATED(task), task };
  }

  @Mutation(() => UpdateTaskStatusPayload, { name: 'updateTaskStatus' })
  @Can('task.changeStatus')
  @UseGuards(PolicyGuard)
  async updateStatus(
    @CurrentUser('id') userId: User['id'],
    @Args('id', { type: () => ID }) _id: Task['id'],
    @Args('input') input: UpdateTaskStatusInput,
    @CurrentTask() existingTask: TaskWithRelations,
  ): Promise<InstanceType<typeof UpdateTaskStatusPayload>> {
    const task = await this.tasksService.updateStatus(existingTask, userId, input);

    return { message: TASK_MESSAGES.STATUS_UPDATED(task), task };
  }

  // No category-specific task permission: changing the category is editing the task
  @Mutation(() => UpdateTaskCategoryPayload, { name: 'updateTaskCategory' })
  @Can('task.update')
  @UseGuards(PolicyGuard)
  async updateCategory(
    @CurrentUser('id') userId: User['id'],
    @Args('id', { type: () => ID }) _id: Task['id'],
    @Args('input') input: UpdateTaskCategoryInput,
    @CurrentTask() existingTask: TaskWithRelations,
  ): Promise<InstanceType<typeof UpdateTaskCategoryPayload>> {
    const task = await this.tasksService.updateCategory(existingTask, userId, input);

    return { message: TASK_MESSAGES.CATEGORY_UPDATED(task), task };
  }

  @Mutation(() => RemoveTaskPayload, { name: 'removeTask' })
  @Can('task.delete')
  @UseGuards(PolicyGuard)
  async remove(
    @CurrentUser('id') userId: User['id'],
    @Args('id', { type: () => ID }) _id: Task['id'],
    @CurrentTask() existingTask: TaskWithRelations,
  ): Promise<InstanceType<typeof RemoveTaskPayload>> {
    const task = await this.tasksService.remove(existingTask, userId);

    return { message: TASK_MESSAGES.REMOVED(task), task };
  }
}
