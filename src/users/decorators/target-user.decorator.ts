import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { SafeUser, TargetUserRequest } from '@/users/types/users.type';

/**
 * The user TargetUserGuard resolved and authorized: yourself, or the user an admin targets by `id`.
 */
export const TargetUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SafeUser => {
    const request = GqlExecutionContext.create(context).getContext<{ req?: TargetUserRequest }>()
      .req;

    // Missing target means @TargetUser() is used without TargetUserGuard
    if (!request?.targetUser) {
      throw new InternalServerErrorException('@TargetUser() requires TargetUserGuard');
    }

    return request.targetUser;
  },
);
