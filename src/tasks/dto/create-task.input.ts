import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsDate } from 'class-validator';
import { TrimToNull, Trim } from '@/common/transforms/string.transforms';

@InputType()
export class CreateTaskInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Trim()
  title: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @TrimToNull()
  description: string | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  dueDate: Date | null;
}
