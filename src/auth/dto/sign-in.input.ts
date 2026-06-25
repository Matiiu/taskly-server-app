import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

@InputType()
export class SignInInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  email: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  password: string;
}
