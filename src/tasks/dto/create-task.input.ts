import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

import type { Task } from 'generated/prisma/client';

@InputType()
export class CreateTaskInput implements Partial<Task> {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  title: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  dueDate?: Date | null;
}
