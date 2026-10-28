import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { JwtPayload } from '@/auth/types/auth.type';
import { getVerifiedSession } from '@/auth/utils/verified-session.util';

/**
 * The verified JWT payload of the request (e.g. `jti` to end this session).
 * For the user itself use @CurrentUser().
 */
export const CurrentSession = createParamDecorator(
  (key: keyof JwtPayload | undefined, context: ExecutionContext) => {
    const { session } = getVerifiedSession(context);

    return key ? session[key] : session;
  },
);
