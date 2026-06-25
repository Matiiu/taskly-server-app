import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { TaskAssigneeType } from '@/task-assignees/entities/task-assignee.type';

@ObjectType()
export class PaginatedTaskAssigneesType {
  @Field(() => [TaskAssigneeType])
  assignees: TaskAssigneeType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
