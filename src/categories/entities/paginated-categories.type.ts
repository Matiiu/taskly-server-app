import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { CategoryType } from '@/categories/entities/category.type';

@ObjectType()
export class PaginatedCategoriesType {
  @Field(() => [CategoryType])
  categories: CategoryType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}