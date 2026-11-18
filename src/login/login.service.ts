import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { EVENTS } from '@/common/constants/events.constants';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import type { PasswordResetRequestedEvent } from '@/common/types/events.types';
import { addMinutes } from '@/common/utils/date.util';
import { hashPassword, hashToken } from '@/common/utils/hash.util';
import {
  INVALID_RESET_LINK_MESSAGE,
  RESET_TOKEN_BYTES,
  RESET_TOKEN_TTL_MINUTES,
} from '@/login/constants/login.constant';
import { CredentialsService } from '@/login/credentials.service';
import { RequestPasswordResetInput } from '@/login/dto/request-password-reset.input';
import { ResetPasswordInput } from '@/login/dto/reset-password.input';
import { SignInInput } from '@/login/dto/sign-in.input';
import { ChangePasswordInput } from '@/login/dto/change-password.input';
import type { SafeUser } from '@/users/types/users.type';
import { UserType } from '@/users/entities/user.type';
import { LoginRepository } from '@/login/login.repository';
import { TokenService } from '@/login/token.service';
import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import { UsersService } from '@/users/users.service';
import { assertUserIsActive } from '@/users/utils/user-status.util';
import { toUserMinimalSnapshot } from '@/users/utils/user-snapshot.util';
import type { PasswordResetToken, User } from 'generated/prisma/client';

const SAME_PASSWORD_MESSAGE = 'New password must be different from the current password';

/** Sessions and passwords: sign in, logout, password reset and change. */
@Injectable()
export class LoginService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: CredentialsService,
    private readonly loginRepo: LoginRepository,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly appEventEmitter: AppEventEmitterService,
  ) {}

  async signIn({ email, password }: SignInInput): Promise<string> {
    const user = await this.credentialsService.validateByEmail(email, password);

    assertUserIsActive(user);

    const token = await this.tokenService.sign({ userId: user.id, userCode: user.code });

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'LOGIN_USER',
      entityId: user.id,
      entity: 'User',
      after: toUserMinimalSnapshot(user),
    });

    return token;
  }

  async logout({ jti, userId }: { jti: string; userId: User['id'] }): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) return;

    await this.tokenService.revokeSession(jti, userId);
    this.appEventEmitter.emitAuditLog({
      userId,
      action: 'LOGOUT_USER',
      entityId: userId,
      entity: 'User',
      before: toUserMinimalSnapshot(user),
    });
  }

  /**
   * Emails a single-use reset link to an active user. Unknown or inactive emails do nothing:
   * the caller gets the same answer either way, so it can't tell whether an account exists.
   */
  async requestPasswordReset({ email }: RequestPasswordResetInput): Promise<void> {
    const user = await this.loginRepo.findByEmail(email);
    if (!user || !user.active) return;

    // Only the hash is stored: a database leak doesn't expose usable links
    const token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const expiresAt = addMinutes(new Date(), RESET_TOKEN_TTL_MINUTES);

    await this.prisma.$transaction(async (tx) => {
      await this.loginRepo.invalidateResetTokens(user.id, tx);
      await this.loginRepo.createResetToken(
        { tokenHash: hashToken(token), userId: user.id, expiresAt },
        tx,
      );
    });

    this.appEventEmitter.emit<PasswordResetRequestedEvent>(EVENTS.PASSWORD_RESET_REQUESTED, {
      email: user.email,
      name: user.name,
      token,
    });
    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'REQUEST_PASSWORD_RESET',
      entityId: user.id,
      entity: 'User',
      after: toUserMinimalSnapshot(user),
    });
  }

  /**
   * Sets a new password from an emailed reset link, ends every session and signs the user in.
   * Every failure (unknown, expired or used token, inactive user) gets the same 400.
   */
  async resetPassword({
    token,
    newPassword,
  }: ResetPasswordInput): Promise<{ user: UserType; token: string }> {
    const resetToken = await this.loginRepo.findActiveResetToken(hashToken(token));
    if (!resetToken || !resetToken.user.active) {
      throw new BadRequestException(INVALID_RESET_LINK_MESSAGE);
    }

    const { user } = resetToken;
    const result = await this.replacePassword(user, newPassword, (tx) =>
      this.consumeResetToken(resetToken.id, tx),
    );

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'RESET_PASSWORD',
      entityId: user.id,
      entity: 'User',
      before: toUserMinimalSnapshot(user),
      after: toUserMinimalSnapshot(result.user),
    });

    return { user: this.usersService.toUserType(result.user), token: result.token };
  }

  /** Signed-in user: proves the current password, then sets the new one. */
  async changePassword(
    user: SafeUser,
    { currentPassword, newPassword }: ChangePasswordInput,
  ): Promise<string> {
    await this.credentialsService.validateById(user.id, currentPassword);

    if (newPassword === currentPassword) {
      throw new BadRequestException(SAME_PASSWORD_MESSAGE);
    }

    const { token } = await this.replacePassword(user, newPassword);

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entityId: user.id,
      entity: 'User',
      before: toUserMinimalSnapshot(user),
      after: toUserMinimalSnapshot(user),
    });

    return token;
  }

  /**
   * Saves the new hash and signs out every device that used the old password.
   * `beforeUpdate` runs first in the same transaction (e.g. consuming a reset token),
   * so if it throws nothing is saved.
   * The returned token is issued after that cutoff, so it stays valid.
   */
  private async replacePassword(
    user: Pick<User, 'id' | 'code'>,
    newPassword: string,
    beforeUpdate?: (tx: Db) => Promise<void>,
  ): Promise<{ user: SafeUser; token: string }> {
    const passwordHash = await hashPassword(newPassword);

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await beforeUpdate?.(tx);
      await this.tokenService.revokeAllSessions(user.id, tx);
      return this.loginRepo.updatePassword(user.id, passwordHash, tx);
    });

    const token = await this.tokenService.sign({ userId: user.id, userCode: user.code });

    return { user: updatedUser, token };
  }

  /** Marks the token used; loses the race (400) if another request used the same link first. */
  private async consumeResetToken(id: PasswordResetToken['id'], tx: Db): Promise<void> {
    const consumed = await this.loginRepo.markResetTokenUsed(id, tx);
    if (!consumed) {
      throw new BadRequestException(INVALID_RESET_LINK_MESSAGE);
    }
  }
}
