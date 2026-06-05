import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AddTaskAssigneeInput } from '@/task-assignees/dto/add-task-assignee.input';
import { TaskAssigneeActionType } from '@/task-assignees/entities/task-assignee-action.type';
import { TaskAssigneeType } from '@/task-assignees/entities/task-assignee.type';
import { TaskAssigneesService } from '@/task-assignees/task-assignees.service';
import type { Task, User } from 'generated/prisma/client';

@Resolver()
@UseGuards(JwtAuthGuard)
export class TaskAssigneesResolver {
  constructor(private readonly taskAssigneesService: TaskAssigneesService) {}

  @Mutation(() => TaskAssigneeActionType, { name: 'addMyTaskAssignee' })
  async addMyTaskAssignee(
    @CurrentUser('sub') userId: User['id'],
    @Args('input') input: AddTaskAssigneeInput,
  ): Promise<TaskAssigneeActionType> {
    const assignee = await this.taskAssigneesService.create(userId, input);

    return {
      message: `Assignee ${assignee.code} added successfully`,
      assignee,
    };
  }

  @Query(() => [TaskAssigneeType], { name: 'myTaskAssignees' })
  findMyTaskAssignees(
    @CurrentUser('sub') userId: User['id'],
    @Args('taskId', { type: () => String }) taskId: Task['id'],
    @Args('query', { type: () => String, nullable: true }) query?: string,
  ): Promise<TaskAssigneeType[]> {
    return this.taskAssigneesService.findMany(userId, taskId, query);
  }

  @Mutation(() => TaskAssigneeActionType, { name: 'removeMyTaskAssignee' })
  async removeMyTaskAssignee(
    @CurrentUser('sub') userId: User['id'],
    @Args('taskId', { type: () => String }) taskId: Task['id'],
    @Args('assigneeId', { type: () => String }) assigneeId: User['id'],
  ): Promise<TaskAssigneeActionType> {
    const assignee = await this.taskAssigneesService.remove(userId, taskId, assigneeId);

    return {
      message: `Assignee ${assignee.code} removed successfully`,
      assignee,
    };
  }
}
