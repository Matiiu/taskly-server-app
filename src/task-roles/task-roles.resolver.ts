import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { CurrentUser } from '@/login/decorators/current-user.decorator';
import { Can } from '@/authorization/decorators/can.decorator';
import { PolicyGuard } from '@/authorization/guards/policy.guard';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { MutationPayload } from '@/common/entities/mutation-payload.factory';
import { TaskRolesService } from '@/task-roles/task-roles.service';
import { CreateTaskRoleInput } from '@/task-roles/dto/create-task-role.input';
import { UpdateTaskRoleInput } from '@/task-roles/dto/update-task-role.input';
import { TaskRoleType } from '@/task-roles/entities/task-role.type';
import { PaginatedTaskRolesType } from '@/task-roles/entities/paginated-task-roles.type';
import type { TaskRole, User, Workspace } from 'generated/prisma/client';

const CreateTaskRolePayload = MutationPayload('CreateTaskRolePayload', {});
const UpdateTaskRolePayload = MutationPayload('UpdateTaskRolePayload', {});
const RemoveTaskRolePayload = MutationPayload('RemoveTaskRolePayload', {});

// PolicyGuard checks the user against `workspaceId`; the service then only touches roles of that workspace.
@Resolver()
@UseGuards(JwtAuthGuard)
export class TaskRolesResolver {
  constructor(private readonly taskRolesService: TaskRolesService) {}

  @Query(() => PaginatedTaskRolesType, { name: 'taskRoles' })
  @Can('taskRole.view')
  @UseGuards(PolicyGuard)
  findMany(
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('pagination', { type: () => PaginationArgsInput, nullable: true })
    pagination?: PaginationArgsInput,
    @Args('search', { type: () => String, nullable: true }) search?: string | null,
  ): Promise<PaginatedTaskRolesType> {
    return this.taskRolesService.findMany(workspaceId, pagination, search ?? null);
  }

  @Query(() => TaskRoleType, { name: 'taskRole' })
  @Can('taskRole.view')
  @UseGuards(PolicyGuard)
  findOne(
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('id', { type: () => ID }) id: TaskRole['id'],
  ): Promise<TaskRoleType> {
    return this.taskRolesService.findOne(workspaceId, id);
  }

  @Mutation(() => CreateTaskRolePayload, { name: 'createTaskRole' })
  @Can('taskRole.manage')
  @UseGuards(PolicyGuard)
  async create(
    @CurrentUser('id') userId: User['id'],
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('input') input: CreateTaskRoleInput,
  ): Promise<InstanceType<typeof CreateTaskRolePayload>> {
    const taskRole = await this.taskRolesService.create(workspaceId, userId, input);
    return { message: `Task role ${taskRole.name} created successfully` };
  }

  @Mutation(() => UpdateTaskRolePayload, { name: 'updateTaskRole' })
  @Can('taskRole.manage')
  @UseGuards(PolicyGuard)
  async update(
    @CurrentUser('id') userId: User['id'],
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('id', { type: () => ID }) id: TaskRole['id'],
    @Args('input') input: UpdateTaskRoleInput,
  ): Promise<InstanceType<typeof UpdateTaskRolePayload>> {
    const taskRole = await this.taskRolesService.update(workspaceId, userId, id, input);
    return { message: `Task role ${taskRole.name} updated successfully` };
  }

  @Mutation(() => RemoveTaskRolePayload, { name: 'removeTaskRole' })
  @Can('taskRole.manage')
  @UseGuards(PolicyGuard)
  async remove(
    @CurrentUser('id') userId: User['id'],
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('id', { type: () => ID }) id: TaskRole['id'],
  ): Promise<InstanceType<typeof RemoveTaskRolePayload>> {
    const taskRole = await this.taskRolesService.remove(workspaceId, userId, id);
    return { message: `Task role ${taskRole.name} removed successfully` };
  }
}
