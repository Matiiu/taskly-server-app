import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import type { PasswordResetToken, User } from 'generated/prisma/client';
import type { SafeUser } from '@/users/types/users.type';
import { OMIT_PASSWORD } from '@/users/constants/users.constants';

type RevokeTokenData = {
  jti: string;
  userId: string;
  expiresAt: Date;
};

export type CreateResetTokenData = Pick<PasswordResetToken, 'tokenHash' | 'userId' | 'expiresAt'>;

/** An unused, unexpired reset token with its user (no password; may be inactive). */
export type ActiveResetToken = PasswordResetToken & { user: SafeUser };

/** Sessions and credentials: the only place that reads or writes a user's password hash. */
@Injectable()
export class LoginRepository {
  constructor(private readonly prisma: PrismaService) {}

  async revokeSession(
    { jti, userId, expiresAt }: RevokeTokenData,
    db: Db = this.prisma,
  ): Promise<void> {
    await db.revokedToken.upsert({
      where: { jti },
      update: { expiresAt, userId },
      create: {
        jti,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Ends every session of the user: JwtAuthGuard rejects tokens issued before this moment.
   */
  async revokeAllSessions(userId: string, db: Db = this.prisma): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: { sessionsRevokedAt: new Date() },
    });
  }

  /** The token's user, without the password. Inactive users are returned too: the caller decides. */
  findSessionUser(userId: string, db: Db = this.prisma): Promise<SafeUser | null> {
    return db.user.findUnique({ where: { id: userId }, omit: OMIT_PASSWORD });
  }

  async isTokenRevoked(jti: string, db: Db = this.prisma): Promise<boolean> {
    const token = await db.revokedToken.findFirst({
      where: { jti, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return token !== null;
  }

  findById(id: User['id'], db: Db = this.prisma): Promise<User | null> {
    return db.user.findUnique({ where: { id } });
  }

  /** Released accounts are gone for good: a new account may reuse their email. */
  findByEmail(email: User['email'], db: Db = this.prisma): Promise<User | null> {
    return db.user.findFirst({ where: { email, releasedAt: null } });
  }

  /** Saves the new hash and returns the updated user, without the password. */
  updatePassword(
    id: User['id'],
    passwordHash: User['password'],
    db: Db = this.prisma,
  ): Promise<SafeUser> {
    return db.user.update({
      where: { id },
      data: { password: passwordHash },
      omit: OMIT_PASSWORD,
    });
  }

  async createResetToken(data: CreateResetTokenData, db: Db = this.prisma): Promise<void> {
    await db.passwordResetToken.create({ data });
  }

  findActiveResetToken(
    tokenHash: PasswordResetToken['tokenHash'],
    db: Db = this.prisma,
  ): Promise<ActiveResetToken | null> {
    return db.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { omit: OMIT_PASSWORD } },
    });
  }

  /**
   * Marks the token used only if it still is unused, so two requests with the same link
   * can't both succeed. Returns false when another request used it first.
   */
  async markResetTokenUsed(id: PasswordResetToken['id'], db: Db = this.prisma): Promise<boolean> {
    const { count } = await db.passwordResetToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return count > 0;
  }

  /** Cancels every unused reset token of the user. */
  async invalidateResetTokens(userId: User['id'], db: Db = this.prisma): Promise<void> {
    await db.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
