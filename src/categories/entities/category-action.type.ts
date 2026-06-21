import { ObjectType, Field } from '@nestjs/graphql';

import { CategoryType } from '@/categories/entities/category.type';

@ObjectType()
export class CategoryActionType {
  @Field(() => String)
  message: string;

  @Field(() => CategoryType)
  category: CategoryType;
}
