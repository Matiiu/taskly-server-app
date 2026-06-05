import { Field, ObjectType } from '@nestjs/graphql';

import type { Category } from 'generated/prisma/client';

@ObjectType()
export class TaskCategoryType implements Partial<Category> {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  color: string | null;
}
