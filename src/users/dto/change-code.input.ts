import { Field, InputType } from '@nestjs/graphql';

import { IsUserCode } from '@/users/decorators/is-user-code.decorator';
import type { User } from 'generated/prisma/client';

@InputType()
export class ChangeCodeInput {
  @Field(() => String)
  @IsUserCode()
  code: User['code'];
}
