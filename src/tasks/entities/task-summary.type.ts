import { Field, ObjectType } from '@nestjs/graphql';

import type { Task } from 'generated/prisma/client';
import { TaskStatusType } from '@/tasks/entities/task-status.type';
import { TaskCategoryType } from '@/tasks/entities/task-category.type';

@ObjectType()
export class TaskSummaryType implements Partial<Task> {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Date, { nullable: true })
  dueDate?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => TaskStatusType, { nullable: true })
  status: TaskStatusType | null;

  @Field(() => TaskCategoryType, { nullable: true })
  category: TaskCategoryType | null;
}
