import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

import { IsStrongPassword } from '@/login/decorators/is-strong-password.decorator';

@InputType()
export class ChangePasswordInput {
  // Only required here: the service checks it against the stored hash
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @Field(() => String)
  @IsStrongPassword()
  newPassword: string;
}
