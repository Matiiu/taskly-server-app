import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Task } from 'generated/prisma/client';

@InputType()
export class CreateCommentInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  taskId: Task['id'];

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  content: string;
}
