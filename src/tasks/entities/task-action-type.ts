import { ObjectType, Field } from '@nestjs/graphql';

import { TaskType } from '@/tasks/entities/task.type';

@ObjectType()
export class TaskActionType {
  @Field(() => String)
  message: string;

  @Field(() => TaskType)
  task: TaskType;
}
