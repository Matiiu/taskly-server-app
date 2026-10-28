import { Field, InputType, ID } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { Status } from 'generated/prisma/client';

@InputType()
export class UpdateTaskStatusInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => value?.trim())
  id?: Status['id'];

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;
}
