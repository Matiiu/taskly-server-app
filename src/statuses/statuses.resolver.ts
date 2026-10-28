import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';

import { StatusesService } from '@/statuses/statuses.service';
import { PaginatedStatusesType } from '@/statuses/entities/paginated-statuses.type';
import type { User, Status, Workspace } from 'generated/prisma/client';
import { CurrentUser } from '@/login/decorators/current-user.decorator';
import { StatusType } from '@/statuses/entities/status.type';
import { UpdateStatusColorInput } from '@/statuses/dto/update-status-color.input';
import { StatusActionType } from '@/statuses/entities/status-action.type';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { Can } from '@/authorization/decorators/can.decorator';
import { PolicyGuard } from '@/authorization/guards/policy.guard';

// PolicyGuard checks the user against `workspaceId`; the service then only reads statuses of that workspace.
@Resolver()
@UseGuards(JwtAuthGuard)
export class StatusesResolver {
  constructor(private readonly statusesService: StatusesService) {}

  @Query(() => PaginatedStatusesType, { name: 'statuses' })
  @Can('status.view')
  @UseGuards(PolicyGuard)
  findMany(
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('pagination', { type: () => PaginationArgsInput, nullable: true })
    pagination?: PaginationArgsInput,
    @Args('search', { type: () => String, nullable: true }) search?: string | null,
  ): Promise<PaginatedStatusesType> {
    return this.statusesService.findMany(workspaceId, pagination, search ?? null);
  }

  @Query(() => StatusType, { name: 'status' })
  @Can('status.view')
  @UseGuards(PolicyGuard)
  findOne(
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('id', { type: () => ID }) id: Status['id'],
  ): Promise<StatusType> {
    return this.statusesService.findOne(workspaceId, id);
  }

  @Mutation(() => StatusActionType, { name: 'updateStatusColor' })
  @Can('status.manage')
  @UseGuards(PolicyGuard)
  async updateColor(
    @CurrentUser('id') userId: User['id'],
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('id', { type: () => ID }) id: Status['id'],
    @Args('input') input: UpdateStatusColorInput,
  ): Promise<StatusActionType> {
    const status = await this.statusesService.updateColor(workspaceId, userId, id, input);

    return {
      message: `Status ${status.name} color updated successfully`,
      status,
    };
  }

  @Mutation(() => StatusActionType, { name: 'removeStatus' })
  @Can('status.manage')
  @UseGuards(PolicyGuard)
  async remove(
    @CurrentUser('id') userId: User['id'],
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('id', { type: () => ID }) id: Status['id'],
  ): Promise<StatusActionType> {
    const status = await this.statusesService.remove(workspaceId, userId, id);

    return {
      message: `Status ${status.name} removed successfully`,
      status,
    };
  }
}
