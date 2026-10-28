import { InputType, PickType } from '@nestjs/graphql';

import { RegisterInput } from '@/login/dto/register.input';

@InputType()
export class RecoverPasswordInput extends PickType(RegisterInput, ['email', 'password'] as const) {}
