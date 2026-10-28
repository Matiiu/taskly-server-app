import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { AuthRepository } from '@/auth/auth.repository';
import type { JwtPayload, VerifiedSession } from '@/auth/types/auth.type';
import type { Db } from '@/prisma/prisma.types';
import type { User } from 'generated/prisma/client';

const SESSION_ENDED_MESSAGE = 'Session ended. Please sign in again';

/**
 * Everything JWT: issuing tokens, validating them on each request, and ending sessions.
 */
@Injectable()
export class TokenService {
  /** How long a single revoked token is remembered; must outlive the JWT expiry. */
  private static readonly REVOKED_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authRepo: AuthRepository,
  ) {}

  sign({ userId, userCode }: { userId: User['id']; userCode: User['code'] }): Promise<string> {
    return this.jwtService.signAsync({
      jti: randomUUID(),
      sub: userId,
      code: userCode,
    });
  }

  /**
   * Verifies signature and expiry, then checks the session is still alive:
   * the token isn't revoked, the user exists and is active, and the token
   * wasn't issued before the user's "revoke all sessions" cutoff.
   * Returns the payload and the user (no password), loaded in the same query.
   *
   * @throws UnauthorizedException with a client-friendly message on any failure.
   */
  async verify(token: string): Promise<VerifiedSession> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (!payload?.jti) {
        throw new UnauthorizedException('Invalid authorization token');
      }

      const [isRevoked, user] = await Promise.all([
        this.authRepo.isTokenRevoked(payload.jti),
        this.authRepo.findSessionUser(payload.sub),
      ]);

      if (
        isRevoked ||
        !user ||
        !user.active ||
        this.isIssuedBefore(payload, user.sessionsRevokedAt)
      ) {
        throw new UnauthorizedException(SESSION_ENDED_MESSAGE);
      }

      return { session: payload, user };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }

      if ((e as { name?: string })?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired. Please sign in again');
      }

      if ((e as { name?: string })?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid authorization token');
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Ends one session (logout on this device). */
  revokeSession(jti: string, userId: User['id'], db?: Db): Promise<void> {
    const expiresAt = new Date(Date.now() + TokenService.REVOKED_TOKEN_TTL_MS);

    return this.authRepo.revokeSession({ jti, userId, expiresAt }, db);
  }

  /** Ends every session of the user, on every device. */
  revokeAllSessions(userId: User['id'], db?: Db): Promise<void> {
    return this.authRepo.revokeAllSessions(userId, db);
  }

  /**
   * True when the token predates the user's "revoke all sessions" cutoff.
   * Compared in whole seconds (JWT `iat` precision), so a token issued in the same
   * second as the cutoff — e.g. right after recovering the account — stays valid.
   */
  private isIssuedBefore(payload: JwtPayload, cutoff: Date | null): boolean {
    if (!cutoff) {
      return false;
    }

    return (payload.iat ?? 0) < Math.floor(cutoff.getTime() / 1000);
  }
}
