import { Resolver, Mutation, Args, Query, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { TasksService } from '@/tasks/tasks.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CreateTaskInput } from '@/tasks/dto/create-task.input';
import { UpdateTaskStatusInput } from '@/tasks/dto/update-task-status.input';
import { UpdateTaskCategoryInput } from '@/tasks/dto/update-task-category.input';
import { TaskActionType } from '@/tasks/entities/task-action-type';
import { PaginatedTaskSummaryType } from '@/tasks/entities/paginated-task-summary.type';
import { TaskDetailType } from '@/tasks/entities/task-detail.type';
import { TaskExists } from '@/tasks/decorators/task-exists.decorator';
import { TaskExistsGuard } from '@/tasks/guards/task-exists.guard';
import type { User, Task } from 'generated/prisma/client';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';

@Resolver()
@UseGuards(JwtAuthGuard)
export class TasksResolver {
  constructor(private readonly tasksService: TasksService) {}

  @Mutation(() => TaskActionType, { name: 'createMyTask' })
  async createMyTask(
    @CurrentUser('sub') userId: User['id'],
    @Args('input') input: CreateTaskInput,
  ): Promise<TaskActionType> {
    const task = await this.tasksService.create(userId, input);

    return {
      message: `Task ${task.title} created successfully`,
      task,
    };
  }

  @Query(() => PaginatedTaskSummaryType, { name: 'myTasks' })
  findMyTasks(
    @CurrentUser('sub') userId: User['id'],
    @Args('pagination', { type: () => PaginationArgsInput, nullable: true })
    pagination: PaginationArgsInput = {},
  ): Promise<PaginatedTaskSummaryType> {
    return this.tasksService.findMany(userId, pagination);
  }

  @Query(() => TaskDetailType, { name: 'myTask' })
  @TaskExists({ by: 'id', arg: 'id', ownerOnly: false })
  @UseGuards(TaskExistsGuard)
  findMyTask(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Task['id'],
  ): Promise<TaskDetailType> {
    return this.tasksService.findOne(userId, id);
  }

  @Mutation(() => TaskActionType, { name: 'updateMyTask' })
  @TaskExists({ by: 'id', arg: 'id' })
  @UseGuards(TaskExistsGuard)
  async updateMyTask(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Task['id'],
    @Args('input') input: CreateTaskInput,
  ): Promise<TaskActionType> {
    await this.tasksService.update(id, userId, input);

    const task = await this.tasksService.findOne(userId, id);

    return {
      message: `Task ${task.title} updated successfully`,
      task,
    };
  }

  @Mutation(() => TaskActionType, { name: 'updateMyTaskStatus' })
  @TaskExists({ by: 'id', arg: 'id' })
  @UseGuards(TaskExistsGuard)
  async updateMyStatus(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Task['id'],
    @Args('input') input: UpdateTaskStatusInput,
  ): Promise<TaskActionType> {
    const task = await this.tasksService.updateStatus(id, userId, input);

    return {
      message: `The status of task ${task.title} updated successfully to ${task.status?.name}`,
      task,
    };
  }

  @Mutation(() => TaskActionType, { name: 'updateMyTaskCategory' })
  @TaskExists({ by: 'id', arg: 'id' })
  @UseGuards(TaskExistsGuard)
  async updateMyCategory(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Task['id'],
    @Args('input') input: UpdateTaskCategoryInput,
  ): Promise<TaskActionType> {
    const task = await this.tasksService.updateCategory(id, userId, input);

    return {
      message: `The category of task ${task.title} updated successfully to ${task.category?.name}`,
      task,
    };
  }

  @Mutation(() => TaskActionType, { name: 'removeMyTask' })
  @TaskExists({ by: 'id', arg: 'id' })
  @UseGuards(TaskExistsGuard)
  async removeMyTask(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Task['id'],
  ): Promise<TaskActionType> {
    const task = await this.tasksService.remove(id);

    return {
      message: `Task ${task.title} removed successfully`,
      task,
    };
  }
}
