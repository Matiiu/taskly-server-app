import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { JwtPayload } from '@/auth/types/auth.type';

type CurrentUserKey = keyof JwtPayload;

export const CurrentUser = createParamDecorator(
  (
    data: CurrentUserKey | undefined,
    context: ExecutionContext,
  ): JwtPayload | JwtPayload[CurrentUserKey] => {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext<{ req?: { user?: JwtPayload } }>().req;

    if (!request?.user) {
      throw new UnauthorizedException('User not found in request context');
    }

    if (!data) {
      return request.user;
    }

    return request.user[data];
  },
);
