import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { AuthenticatedRequest, VerifiedSession } from '@/login/types/login.type';

/**
 * The session and user JwtAuthGuard stored on the request.
 * Missing means the handler reads them without JwtAuthGuard: a wiring mistake, not a client error.
 */
export function getVerifiedSession(context: ExecutionContext): VerifiedSession {
  const request = GqlExecutionContext.create(context).getContext<{ req?: AuthenticatedRequest }>()
    .req;

  if (!request?.session || !request.user) {
    throw new InternalServerErrorException(
      '@CurrentUser() and @CurrentSession() require JwtAuthGuard',
    );
  }

  return { session: request.session, user: request.user };
}
