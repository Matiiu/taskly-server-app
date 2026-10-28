import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';

import { LIMIT_DEFAULT, PAGE_DEFAULT } from '@/common/constants/pagination.constants';

import { SortOrder } from '@/common/enums/pagination.enum';

@InputType()
export class PaginationArgsInput {
  @Field(() => Int, { nullable: true, defaultValue: PAGE_DEFAULT })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = PAGE_DEFAULT;

  @Field(() => Int, { nullable: true, defaultValue: LIMIT_DEFAULT })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = LIMIT_DEFAULT;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
