import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { TaskListItemType } from '@/tasks/entities/task-list.type';

@ObjectType()
export class PaginatedTaskSummaryType {
  @Field(() => [TaskListItemType])
  tasks: TaskListItemType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
