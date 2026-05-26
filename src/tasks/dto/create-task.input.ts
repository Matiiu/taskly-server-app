import { Field, GraphQLISODateTime, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';

@InputType()
export class CreateTaskInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field(() => TaskStatus, { nullable: true, defaultValue: TaskStatus.PENDING })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  dueDate?: Date;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  categoryId: number;
}
