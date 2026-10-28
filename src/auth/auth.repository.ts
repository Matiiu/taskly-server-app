import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import type { User } from 'generated/prisma/client';
import type { SafeUser } from '@/users/types/users.type';
import { OMIT_PASSWORD } from '@/users/constants/users.constants';

type RevokeTokenData = {
  jti: string;
  userId: string;
  expiresAt: Date;
};

/** Sessions and credentials: the only place that reads or writes a user's password hash. */
@Injectable()
export class AuthRepository {
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

  findByEmail(email: User['email'], db: Db = this.prisma): Promise<User | null> {
    return db.user.findUnique({ where: { email } });
  }

  async updatePassword(
    id: User['id'],
    passwordHash: User['password'],
    db: Db = this.prisma,
  ): Promise<void> {
    await db.user.update({
      where: { id },
      data: { password: passwordHash },
    });
  }
}
