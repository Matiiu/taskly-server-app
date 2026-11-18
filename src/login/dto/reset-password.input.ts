import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

import { IsStrongPassword } from '@/login/decorators/is-strong-password.decorator';

@InputType()
export class ResetPasswordInput {
  /** The raw token from the emailed link (`?token=`). */
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  token: string;

  @Field(() => String)
  @IsStrongPassword()
  newPassword: string;
}
