import { Field, Int, ObjectType } from '@nestjs/graphql';

import type { PaginationMeta } from '@/common/types/pagination.type';

@ObjectType()
export class PaginationMetaType implements PaginationMeta {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Boolean)
  hasPreviousPage: boolean;
}
