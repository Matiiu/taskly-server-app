import { Field, InputType } from '@nestjs/graphql';
import { IsHexColor, IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateCategoryInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Field()
  @IsHexColor()
  color: string;
}
