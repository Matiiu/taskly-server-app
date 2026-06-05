import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { TaskType } from '@/tasks/entities/task.type';

@ObjectType()
export class PaginatedTaskType {
  @Field(() => [TaskType])
  tasks: TaskType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
