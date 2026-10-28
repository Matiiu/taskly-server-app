import { InputType, PickType } from '@nestjs/graphql';

import { RegisterInput } from '@/login/dto/register.input';

@InputType()
export class SuggestCodesInput extends PickType(RegisterInput, [
  'name',
  'firstSurname',
  'secondSurname',
] as const) {}
