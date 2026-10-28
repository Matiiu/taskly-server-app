import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { TaskPermission } from 'generated/prisma/enums';
import type { TaskRole } from 'generated/prisma/client';
import {
  TASK_ROLE_DESCRIPTION_MAX_LENGTH,
  TASK_ROLE_NAME_MAX_LENGTH,
} from '@/task-roles/constants/task-role.constants';

@InputType()
export class CreateTaskRoleInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MaxLength(TASK_ROLE_NAME_MAX_LENGTH)
  @Transform(({ value }: { value: string }) => value.trim())
  name: TaskRole['name'];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(TASK_ROLE_DESCRIPTION_MAX_LENGTH)
  @Transform(({ value }: { value?: string | null }) => value?.trim() || null)
  description?: TaskRole['description'];

  @Field(() => [TaskPermission])
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(TaskPermission, { each: true })
  permissions: TaskRole['permissions'];
}
