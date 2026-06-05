import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { UserType } from '@/users/entities/user.type';

@ObjectType()
export class PaginatedUsersType {
  @Field(() => [UserType])
  users: UserType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
