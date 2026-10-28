import { ObjectType, Field } from '@nestjs/graphql';

import { TaskDetailType } from '@/tasks/entities/task-detail.type';

@ObjectType()
export class TaskActionType {
  @Field(() => TaskDetailType)
  task: TaskDetailType;
}
