import { BadRequestException, Injectable } from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import { comparePassword, hashPassword } from '@/common/utils/hash.util';
import { CredentialsService } from '@/login/credentials.service';
import { RecoverPasswordInput } from '@/login/dto/recover-password.input';
import { SignInInput } from '@/login/dto/sign-in.input';
import { ChangePasswordInput } from '@/login/dto/change-password.input';
import type { SafeUser } from '@/users/types/users.type';
import { LoginRepository } from '@/login/login.repository';
import { TokenService } from '@/login/token.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { assertUserIsActive } from '@/users/utils/user-status.util';
import { toUserMinimalSnapshot } from '@/users/utils/user-snapshot.util';
import type { User } from 'generated/prisma/client';

const SAME_PASSWORD_MESSAGE = 'New password must be different from the current password';

/** Sessions and passwords: sign in, logout, password recovery and change. */
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

  async recoverPassword({ email, password }: RecoverPasswordInput): Promise<string> {
    const user = await this.loginRepo.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    assertUserIsActive(user);

    if (await comparePassword(password, user.password)) {
      throw new BadRequestException(SAME_PASSWORD_MESSAGE);
    }

    const token = await this.replacePassword(user, password);

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'RECOVER_PASSWORD',
      entityId: user.id,
      entity: 'User',
      before: toUserMinimalSnapshot(user),
      after: toUserMinimalSnapshot(user),
    });

    return token;
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

    const token = await this.replacePassword(user, newPassword);

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
   * The returned token is issued after that cutoff, so it stays valid.
   */
  private async replacePassword(
    user: Pick<User, 'id' | 'code'>,
    newPassword: string,
  ): Promise<string> {
    const passwordHash = await hashPassword(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await this.loginRepo.updatePassword(user.id, passwordHash, tx);
      await this.tokenService.revokeAllSessions(user.id, tx);
    });

    return this.tokenService.sign({ userId: user.id, userCode: user.code });
  }
}
