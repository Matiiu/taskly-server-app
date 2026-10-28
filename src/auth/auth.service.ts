import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';

import { RegisterInput } from '@/auth/dto/register.input';
import { AuthProvider } from 'generated/prisma/enums';
import { SignInInput } from '@/auth/dto/sign-in.input';
import { UsersService } from '@/users/users.service';
import { User } from 'generated/prisma/client';
import { hashPassword, comparePassword } from '@/common/utils/hash.util';
import { StatusesService } from '@/statuses/statuses.service';
import { RecoverPasswordInput } from '@/auth/dto/recover-password.input';
import { RecoverAccountInput } from '@/auth/dto/recover-account.input';
import { SuggestCodesInput } from '@/auth/dto/suggest-codes.input';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import {
  generateRandomNumericSuffix,
  normalizeCodeToken,
  toValidCodeLength,
  toValidCodeWithSuffix,
} from '@/common/utils/code-suggestion.util';
import { TokenService } from '@/auth/token.service';
import { UsersRepository } from '@/users/users.repository';
import { isUniqueViolation } from '@/prisma/prisma.errors';
import { AuthRepository } from '@/auth/auth.repository';
import { UserType } from '@/users/entities/user.type';
import { assertUserIsActive } from '@/users/utils/user-status.util';
import { toUserMinimalSnapshot, toUserSnapshot } from '@/users/utils/user-snapshot.util';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private static readonly SUGGESTION_BATCH_SIZE = 6;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly authRepo: AuthRepository,
    private readonly usersRepo: UsersRepository,
    private readonly usersService: UsersService,
    private readonly statusesService: StatusesService,
    private readonly appEventEmitter: AppEventEmitterService,
  ) {}

  async register(input: RegisterInput): Promise<UserType> {
    const existingUser = await this.authRepo.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    await this.usersService.assertDocumentAvailable(input.documentType, input.documentNumber);

    try {
      const hashedPassword = await hashPassword(input.password);
      const result = await this.usersRepo.create({
        ...input,
        password: hashedPassword,
        source: AuthProvider.LOCAL,
      });

      const user = this.usersService.toUserType(result);
      this.appEventEmitter.emitAuditLog({
        userId: user.id,
        action: 'REGISTER_USER',
        entityId: user.id,
        entity: 'User',
        after: toUserSnapshot(result),
      });
      return user;
    } catch (e) {
      // Email, document or code taken (e.g. by an inactive user, or a concurrent registration)
      if (isUniqueViolation(e)) {
        throw new ConflictException('User already exists');
      }

      this.logger.error('Failed to create user', e instanceof Error ? e.stack : '');
      throw new BadRequestException('Failed to create user');
    }
  }

  async signIn({ email, password }: SignInInput): Promise<string> {
    const user = await this.validateCredentials(email, password);

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
    const user = await this.usersRepo.findById(userId);
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
    const user = await this.authRepo.findById(userId);
    const isPasswordValid = user ? await comparePassword(password, user.password) : false;

    if (!user || !isPasswordValid) {
      throw new BadRequestException('Password is incorrect');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.usersRepo.setActive(user.id, false, tx);
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
   * Reactivates a soft-deleted account. The user can't sign in while inactive,
   * so ownership is proven with email + password instead.
   */
  async recoverAccount({ email, password }: RecoverAccountInput): Promise<string> {
    const user = await this.validateCredentials(email, password);

    if (user.active) {
      throw new ConflictException('Account is already active');
    }

    const reactivatedUser = await this.usersRepo.setActive(user.id, true);
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

  async recoverPassword({ email, password }: RecoverPasswordInput): Promise<string> {
    const user = await this.authRepo.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    assertUserIsActive(user);

    const isCurrentPassword = await comparePassword(password, user.password);

    if (isCurrentPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const passwordHash = await hashPassword(password);

    // Sign out every device that used the old password; the new token is issued after the cutoff.
    await this.prisma.$transaction(async (tx) => {
      await this.authRepo.updatePassword(user.id, passwordHash, tx);
      await this.tokenService.revokeAllSessions(user.id, tx);
    });

    const token = await this.tokenService.sign({ userId: user.id, userCode: user.code });

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

  async suggestCodes({ name, firstSurname, secondSurname }: SuggestCodesInput): Promise<string[]> {
    const normalizedName = normalizeCodeToken(name);
    const normalizedFirstSurname = normalizeCodeToken(firstSurname);
    const normalizedSecondSurname = secondSurname ? normalizeCodeToken(secondSurname) : '';
    const seeds = [
      `${normalizedName}_${normalizedFirstSurname}`,
      `${normalizedFirstSurname}_${normalizedName}`,
    ];

    if (normalizedSecondSurname) {
      seeds.push(`${normalizedName}_${normalizedSecondSurname}`);
    }
    const suggestions: string[] = [];
    const seenSuggestions = new Set<string>();

    for (const seed of seeds) {
      const suggestion = await this.findAvailableCode(seed, seenSuggestions);
      suggestions.push(suggestion);
      seenSuggestions.add(suggestion);
    }

    while (suggestions.length < AuthService.SUGGESTION_BATCH_SIZE) {
      const baseName = suggestions.length % 2 === 0 ? normalizedName : normalizedFirstSurname;
      const suggestion = await this.findAvailableCode(baseName, seenSuggestions, {
        suffixFirst: true,
      });
      suggestions.push(suggestion);
      seenSuggestions.add(suggestion);
    }

    return suggestions;
  }

  /**
   * Same error for unknown email and wrong password, so callers can't tell which accounts exist.
   */
  private async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.authRepo.findByEmail(email);
    const isPasswordValid = user ? await comparePassword(password, user.password) : false;

    if (!user || !isPasswordValid) {
      throw new BadRequestException('Email or password is incorrect');
    }

    return user;
  }

  /**
   * Tries the plain seed first (unless `suffixFirst`), then `seed_<4 digits>` variants.
   * The seed is trimmed to fit the suffix, so long names still get distinct candidates.
   */
  private async findAvailableCode(
    seed: string,
    exclude: Set<string>,
    { suffixFirst = false }: { suffixFirst?: boolean } = {},
  ): Promise<string> {
    let attempt = 0;

    while (attempt < 20) {
      const candidate =
        attempt === 0 && !suffixFirst
          ? toValidCodeLength(seed)
          : toValidCodeWithSuffix(seed, generateRandomNumericSuffix());

      if (!exclude.has(candidate) && !(await this.usersRepo.existsByCode(candidate))) {
        return candidate;
      }

      attempt++;
    }

    throw new ConflictException('Unable to generate enough unique code suggestions');
  }
}
