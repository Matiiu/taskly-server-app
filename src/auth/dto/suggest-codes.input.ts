import { InputType, PickType } from '@nestjs/graphql';

import { RegisterInput } from '@/auth/dto/register.input';

@InputType()
export class SuggestCodesInput extends PickType(RegisterInput, [
  'name',
  'firstSurname',
  'secondSurname',
] as const) {}
