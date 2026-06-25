import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { UsersService } from '@/users/users.service';
import { UserExistsGuard } from '@/users/guards/user-exists.guard';
import { UserExists } from '@/users/decorators/user-exists.decorator';
import { UserType } from '@/users/entities/user.type';
import { PaginatedUsersType } from '@/users/entities/paginated-users.type';
import { UpdateUserInput } from './dto/update-user.type';
import { UserActionType } from '@/users/entities/user-action.type';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';

@Resolver()
@UseGuards(JwtAuthGuard, UserExistsGuard)
@UserExists({ by: 'authSub' })
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
  @UserExists({ by: 'code' })
  findByCode(@Args('code') code: string): Promise<UserType> {
    return this.usersService.findByCode(code);
  }

  @Query(() => UserType, { name: 'me' })
  findMe(@CurrentUser('code') code: string): Promise<UserType> {
    return this.usersService.findByCode(code);
  }

  @Mutation(() => UserActionType, { name: 'updateUser' })
  @UserExists({ by: 'id' })
  async update(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
  ): Promise<UserActionType> {
    const user = await this.usersService.update(id, input);

    return {
      message: `User ${user.code} updated successfully`,
      user,
    };
  }
}
