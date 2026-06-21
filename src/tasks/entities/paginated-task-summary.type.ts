import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { TaskSummaryType } from '@/tasks/entities/task-summary.type';

@ObjectType()
export class PaginatedTaskSummaryType {
  @Field(() => [TaskSummaryType])
  tasks: TaskSummaryType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
