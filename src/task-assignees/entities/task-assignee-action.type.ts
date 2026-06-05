import { Field, ObjectType } from '@nestjs/graphql';

import { TaskAssigneeType } from '@/task-assignees/entities/task-assignee.type';

@ObjectType()
export class TaskAssigneeActionType {
  @Field(() => String)
  message: string;

  @Field(() => TaskAssigneeType)
  assignee: TaskAssigneeType;
}
