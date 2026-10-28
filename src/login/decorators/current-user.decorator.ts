import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { getVerifiedSession } from '@/login/utils/verified-session.util';
import type { SafeUser } from '@/users/types/users.type';

/**
 * The authenticated user (no password), loaded by JwtAuthGuard.
 * Pass a key to get a single field: `@CurrentUser('id') userId: User['id']`.
 */
export const CurrentUser = createParamDecorator(
  (key: keyof SafeUser | undefined, context: ExecutionContext) => {
    const { user } = getVerifiedSession(context);

    return key ? user[key] : user;
  },
);
