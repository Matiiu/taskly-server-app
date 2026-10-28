import { InputType, PickType } from '@nestjs/graphql';

import { SignInInput } from '@/auth/dto/sign-in.input';

@InputType()
export class RecoverAccountInput extends PickType(SignInInput, ['email', 'password'] as const) {}
