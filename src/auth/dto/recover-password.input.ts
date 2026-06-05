import { InputType, PickType } from '@nestjs/graphql';

import { RegisterInput } from '@/auth/dto/register.input';

@InputType()
export class RecoverPasswordInput extends PickType(RegisterInput, ['email', 'password'] as const) {}
