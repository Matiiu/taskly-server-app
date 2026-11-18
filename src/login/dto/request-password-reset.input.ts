import { InputType, PickType } from '@nestjs/graphql';

import { RegisterInput } from '@/login/dto/register.input';

@InputType()
export class RequestPasswordResetInput extends PickType(RegisterInput, ['email'] as const) {}
