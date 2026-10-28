import { Field, ObjectType } from '@nestjs/graphql';

import type { Task } from 'generated/prisma/client';
import { TaskStatusType } from '@/tasks/entities/task-status.type';
import { TaskCategoryType } from '@/tasks/entities/task-category.type';
import { TaskRelation } from '@/tasks/enums/task-relation.enums';

@ObjectType()
export class TaskListItemType implements Partial<Task> {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  code: string;

  @Field(() => Date, { nullable: true })
  dueDate?: Date | null;

  @Field(() => TaskStatusType, { nullable: true })
  status: TaskStatusType | null;

  @Field(() => TaskCategoryType, { nullable: true })
  category: TaskCategoryType | null;

  /** How the current user relates to the task: CREATED, ASSIGNED, or both. */
  @Field(() => [TaskRelation])
  relations: TaskRelation[];
}
