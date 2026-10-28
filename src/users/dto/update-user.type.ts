import { InputType, OmitType, PartialType } from '@nestjs/graphql';

import { RegisterInput } from '@/login/dto/register.input';

@InputType()
export class UpdateUserInput extends PartialType(
  OmitType(RegisterInput, ['password', 'code'] as const),
) {}
