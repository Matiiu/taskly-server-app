import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import type { Category } from 'generated/prisma/client';

@InputType()
export class UpdateTaskCategoryInput implements Partial<Category> {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => value?.trim())
  id?: Category['id'];

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  name: Category['name'];
}
