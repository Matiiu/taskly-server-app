import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Task, TaskRole, User } from 'generated/prisma/client';

@InputType()
export class AddTaskAssigneeInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  taskId: Task['id'];

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  assigneeId: User['id'];

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  roleId: TaskRole['id'];
}
