import { ConflictException, GoneException, Injectable } from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import { addDays } from '@/common/utils/date.util';
import { CredentialsService } from '@/login/credentials.service';
import { RecoverAccountInput } from '@/login/dto/recover-account.input';
import { TokenService } from '@/login/token.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ACCOUNT_RECOVERY_DAYS } from '@/users/constants/users.constants';
import { UsersService } from '@/users/users.service';
import { toUserSnapshot } from '@/users/utils/user-snapshot.util';
import type { User } from 'generated/prisma/client';

/** Account lifecycle: soft delete, recovery within the window, and release once it expires. */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: CredentialsService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly appEventEmitter: AppEventEmitterService,
  ) {}

  /**
   * Soft delete: deactivates the account and ends all of its sessions, on every device.
   * Requires the password again so a stolen token alone can't delete the account.
   */
  async deleteAccount({
    userId,
    password,
  }: {
    userId: User['id'];
    password: string;
  }): Promise<void> {
    const user = await this.credentialsService.validateById(userId, password);

    await this.prisma.$transaction(async (tx) => {
      const recoveryDate = addDays(new Date(), ACCOUNT_RECOVERY_DAYS);
      await this.usersService.deactivate(user.id, recoveryDate, tx);
      await this.tokenService.revokeAllSessions(user.id, tx);
    });

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'INACTIVATE_USER',
      entityId: user.id,
      entity: 'User',
      before: toUserSnapshot(user),
      after: null,
    });
  }

  /**
   * Reactivates a soft-deleted account within its recovery window. The user can't sign in
   * while inactive, so ownership is proven with email + password instead.
   * Released accounts are not found at all (see `loginRepo.findByEmail`).
   */
  async recoverAccount({ email, password }: RecoverAccountInput): Promise<string> {
    const user = await this.credentialsService.validateByEmail(email, password);

    await this.releaseIfRecoveryExpired(user);

    if (user.active) {
      throw new ConflictException('Account is already active');
    }

    const reactivatedUser = await this.usersService.activate(user.id);
    const token = await this.tokenService.sign({ userId: user.id, userCode: user.code });

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'REACTIVATE_USER',
      entityId: user.id,
      entity: 'User',
      before: null,
      after: toUserSnapshot(reactivatedUser),
    });

    return token;
  }

  /**
   * Past the recovery deadline the account is released for good (outside any transaction,
   * so the release is kept even though the request fails). No deadline: nothing to check.
   */
  private async releaseIfRecoveryExpired(user: User): Promise<void> {
    if (!user.recoveryDate || user.recoveryDate > new Date()) return;

    await this.usersService.release(user.id);

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'RELEASE_USER',
      entityId: user.id,
      entity: 'User',
      description: 'Recovery period expired: the account was permanently deleted',
      before: toUserSnapshot(user),
      after: null,
    });

    throw new GoneException('The recovery period has expired; the account was permanently deleted');
  }
}
