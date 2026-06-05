import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Category } from 'generated/prisma/client';

@InputType()
export class UpdateCategoryColorInput implements Pick<Category, 'color'> {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  color: Category['color'];
}