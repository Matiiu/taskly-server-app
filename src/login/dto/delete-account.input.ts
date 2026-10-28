import { InputType, PickType } from '@nestjs/graphql';

import { SignInInput } from '@/login/dto/sign-in.input';

@InputType()
export class DeleteAccountInput extends PickType(SignInInput, ['password'] as const) {}
