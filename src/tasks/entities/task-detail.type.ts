import { ObjectType, Field } from '@nestjs/graphql';

import type { Task } from 'generated/prisma/client';
import { TaskStatusType } from '@/tasks/entities/task-status.type';
import { TaskCategoryType } from '@/tasks/entities/task-category.type';
import { TrimToNull } from '@/common/transforms/string.transforms';
import { TaskRelation } from '@/tasks/enums/task-relation.enums';

@ObjectType()
export class TaskDetailType implements Partial<Task> {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  code: string;

  @Field(() => String, { nullable: true })
  @TrimToNull()
  description: string | null;

  @Field(() => Date, { nullable: true })
  @TrimToNull()
  dueDate: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => TaskStatusType, { nullable: true })
  @TrimToNull()
  status: TaskStatusType | null;

  @Field(() => TaskCategoryType, { nullable: true })
  @TrimToNull()
  category: TaskCategoryType | null;

  /** How the current user relates to the task: CREATED, ASSIGNED, or both. */
  @Field(() => [TaskRelation])
  relations: TaskRelation[];
}
