import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, IsEnum, Min, Max, MaxLength } from 'class-validator';

import { LIMIT_DEFAULT, PAGE_DEFAULT } from '@/common/constants/pagination.constant';

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

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  query?: string | null;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
