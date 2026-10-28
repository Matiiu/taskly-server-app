import { ObjectType, Field } from '@nestjs/graphql';

import { CategoryType } from '@/categories/entities/category.type';
import { MutationResponseType } from '@/common/entities/mutation-response.type';

@ObjectType()
export class CategoryActionType extends MutationResponseType {
  @Field(() => CategoryType)
  category: CategoryType;
}
