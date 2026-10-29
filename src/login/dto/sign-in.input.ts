import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

import { TrimLowerCase } from '@/common/transforms/string.transforms';

@InputType()
export class SignInInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  @TrimLowerCase()
  email: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  password: string;
}
