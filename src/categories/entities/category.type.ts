import { ObjectType, Field } from '@nestjs/graphql';

import type { Category } from 'generated/prisma/client';

@ObjectType()
export class CategoryType implements Partial<Category> {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  color: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
