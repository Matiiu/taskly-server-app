import { Field, ObjectType } from '@nestjs/graphql';

import { TaskAssigneeType } from '@/task-assignees/entities/task-assignee.type';
import { MutationResponseType } from '@/common/entities/mutation-response.type';

@ObjectType()
export class TaskAssigneeActionType extends MutationResponseType {
  @Field(() => TaskAssigneeType)
  assignee: TaskAssigneeType;
}
