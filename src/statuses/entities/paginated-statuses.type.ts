import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { StatusType } from '@/statuses/entities/status.type';

@ObjectType()
export class PaginatedStatusesType {
  @Field(() => [StatusType])
  statuses: StatusType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
