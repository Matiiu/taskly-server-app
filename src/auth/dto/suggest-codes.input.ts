import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

@InputType()
export class SuggestCodesInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  lastName: string;
}
