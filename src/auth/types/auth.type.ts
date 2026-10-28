import type { Request } from 'express';

import type { SafeUser } from '@/users/types/users.type';

export type JwtPayload = {
  jti: string;
  sub: string;
  code: string;
  /** Issued-at, in seconds. Added automatically by jsonwebtoken when signing. */
  iat?: number;
};

/** A token that passed TokenService.verify, with the user it belongs to. */
export type VerifiedSession = {
  session: JwtPayload;
  user: SafeUser;
};

/** Request after JwtAuthGuard: read with @CurrentUser() and @CurrentSession(). */
export type AuthenticatedRequest = Request & Partial<VerifiedSession>;
