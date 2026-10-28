import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import type { User } from 'generated/prisma/client';
import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { CurrentUser } from '@/login/decorators/current-user.decorator';
import { UsersService } from '@/users/users.service';
import { UserType } from '@/users/entities/user.type';
import { PaginatedUsersType } from '@/users/entities/paginated-users.type';
import { UpdateUserInput } from '@/users/dto/update-user.type';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { MutationPayload } from '@/common/entities/mutation-payload.factory';
import { TargetUserGuard } from '@/users/guards/target-user.guard';
import { TargetUser } from '@/users/decorators/target-user.decorator';
import type { SafeUser } from '@/users/types/users.type';

const UpdateUserPayload = MutationPayload('UpdateUserPayload', {});

@Resolver()
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => PaginatedUsersType, { name: 'users' })
  findMany(
    @Args('pagination', { type: () => PaginationArgsInput, nullable: true })
    pagination?: PaginationArgsInput,
  ): Promise<PaginatedUsersType> {
    return this.usersService.findMany(pagination);
  }

  @Query(() => UserType, { name: 'userByCode' })
  findByCode(@Args('code') code: string): Promise<UserType> {
    return this.usersService.findByCode(code);
  }

  @Query(() => UserType, { name: 'me' })
  findMe(@CurrentUser() me: SafeUser): UserType {
    return this.usersService.toUserType(me);
  }

  @Mutation(() => UpdateUserPayload, { name: 'updateUser' })
  @UseGuards(TargetUserGuard)
  async update(
    // Not used here, but it must stay: it declares `id` in the schema and TargetUserGuard reads it
    @Args('id', {
      type: () => ID,
      nullable: true,
      description: 'User to update. Omit it to update yourself; only admins can update others.',
    })
    _id: User['id'] | null,
    @TargetUser() target: SafeUser,
    @CurrentUser() actor: SafeUser,
    @Args('input') input: UpdateUserInput,
  ): Promise<InstanceType<typeof UpdateUserPayload>> {
    const user = await this.usersService.update(target, input, actor);

    return { message: `User ${user.code} updated successfully` };
  }
}
