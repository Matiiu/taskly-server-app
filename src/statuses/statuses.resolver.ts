import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { StatusesService } from '@/statuses/statuses.service';
import { PaginatedStatusesType } from '@/statuses/entities/paginated-statuses.type';
import type { User, Status } from 'generated/prisma/client';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { StatusType } from '@/statuses/entities/status.type';
import { UpdateStatusColorInput } from '@/statuses/dto/update-status-color.input';
import { StatusActionType } from '@/statuses/entities/status-action.type';
import { StatusExists } from '@/statuses/decorators/status-exists.decorator';
import { StatusExistsGuard } from '@/statuses/guards/status-exists.guard';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';

@Resolver()
@UseGuards(JwtAuthGuard)
export class StatusesResolver {
  constructor(private readonly statusesService: StatusesService) {}

  @Query(() => PaginatedStatusesType, { name: 'myStatuses' })
  findMyStatuses(
    @CurrentUser('sub') userId: User['id'],
    @Args('pagination', { type: () => PaginationArgsInput, nullable: true })
    pagination?: PaginationArgsInput,
  ): Promise<PaginatedStatusesType> {
    return this.statusesService.findMany(userId, pagination);
  }

  @Query(() => StatusType, { name: 'myStatus' })
  @StatusExists({ by: 'id', arg: 'id' })
  @UseGuards(StatusExistsGuard)
  findMyStatus(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Status['id'],
  ): Promise<StatusType> {
    return this.statusesService.findOne(userId, id);
  }

  @Mutation(() => StatusActionType, { name: 'updateMyStatusColor' })
  @StatusExists({ by: 'id', arg: 'id' })
  @UseGuards(StatusExistsGuard)
  async updateColor(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Status['id'],
    @Args('input') input: UpdateStatusColorInput,
  ): Promise<StatusActionType> {
    const status = await this.statusesService.updateColor(userId, id, input);

    return {
      message: `Status ${status.name} color updated successfully`,
      status,
    };
  }

  @Mutation(() => StatusActionType, { name: 'removeMyStatus' })
  @StatusExists({ by: 'id', arg: 'id' })
  @UseGuards(StatusExistsGuard)
  async removeMyStatus(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Status['id'],
  ): Promise<StatusActionType> {
    const status = await this.statusesService.remove(userId, id);

    return {
      message: `Status ${status.name} removed successfully`,
      status,
    };
  }
}
