import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { randomBytes, randomInt, randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '@/prisma/prisma.service';
import { RegisterInput } from '@/auth/dto/register.input';
import { AuthProvider } from 'generated/prisma/enums';
import { SignInInput } from '@/auth/dto/sign-in.input';
import { RegisterType } from '@/auth/entities/register.type';
import { UsersService } from '@/users/users.service';
import { User } from 'generated/prisma/client';
import { hashPassword, comparePassword } from '@/common/utils/hash.util';
import { MIN_CODE_LENGTH, MAX_CODE_LENGTH } from '@/auth/constants/auth.constant';
import { StatusesService } from '@/statuses/statuses.service';
import { RecoverPasswordInput } from '@/auth/dto/recover-password.input';
import { AppEventEmitterService } from '@/common/event-emitter.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private static readonly SUGGESTION_BATCH_SIZE = 6;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly statusesService: StatusesService,
    private readonly appEventEmitter: AppEventEmitterService,
  ) {}

  async register(input: RegisterInput): Promise<RegisterType> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const code = input.code
      ? await this.ensureCodeIsAvailable(input.code)
      : await this.generateUniqueCode(
          () => `${input.name.toLocaleLowerCase()}_${randomBytes(4).toString('hex')}`,
        );

    try {
      const hashedPassword = await hashPassword(input.password);
      const result = await this.prisma.user.create({
        data: {
          name: input.name,
          lastName: input.lastName,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          email: input.email,
          password: hashedPassword,
          source: AuthProvider.LOCAL,
          phoneNumber: input.phoneNumber,
          phoneCountryCode: input.phoneCountryCode,
          code,
        },
      });

      const user = this.usersService.toUserType(result);
      const [token] = await Promise.all([
        this.generateToken({ userId: user.id, userCode: user.code }),
        this.statusesService.createDefaultStatuses(user.id),
      ]);
      this.appEventEmitter.emitAuditLog({
        userId: user.id,
        action: 'REGISTER_USER',
        entityId: user.id,
        entity: 'User',
        after: {
          id: user.id,
          email: user.email,
          code: user.code,
          name: user.name,
          lastName: user.lastName,
          documentType: user.documentType,
          documentNumber: user.documentNumber,
          phoneNumber: user.phoneNumber,
          phoneCountryCode: user.phoneCountryCode,
          source: result.source,
        },
      });
      return { user, token };
    } catch (e) {
      this.logger.error('Failed to create user', e instanceof Error ? e.stack : '');
      throw new BadRequestException('Failed to create user');
    }
  }

  async signIn({ email, password }: SignInInput): Promise<RegisterType> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('Email or password is incorrect');
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Email or password is incorrect');
    }
    const token = await this.generateToken({ userId: user.id, userCode: user.code });
    const responseUser = this.usersService.toUserType(user);

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'LOGIN_USER',
      entityId: user.id,
      entity: 'User',
      after: {
        id: responseUser.id,
        email: responseUser.email,
        code: responseUser.code,
        name: responseUser.name,
        lastName: responseUser.lastName,
      },
    });

    return { user: responseUser, token };
  }

  async logout({ jti, userId }: { jti: string; userId: User['id'] }): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    const responseUser = this.usersService.toUserType(user);

    await this.prisma.revokedToken.upsert({
      where: { jti },
      update: { expiresAt, userId },
      create: {
        jti,
        userId,
        expiresAt,
      },
    });

    this.appEventEmitter.emitAuditLog({
      userId,
      action: 'LOGOUT_USER',
      entityId: userId,
      entity: 'User',
      before: {
        id: responseUser.id,
        email: responseUser.email,
        code: responseUser.code,
        name: responseUser.name,
        lastName: responseUser.lastName,
      },
    });
  }

  async recoverPassword({ email, password }: RecoverPasswordInput): Promise<RegisterType> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const [token] = await Promise.all([
      this.generateToken({ userId: user.id, userCode: user.code }),
      this.prisma.user.update({
        where: { email },
        data: { password: await hashPassword(password) },
      }),
    ]);

    const isCurrentPassword = await comparePassword(password, user.password);

    if (isCurrentPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const responseUser = this.usersService.toUserType(user);

    this.appEventEmitter.emitAuditLog({
      userId: user.id,
      action: 'RECOVER_PASSWORD',
      entityId: user.id,
      entity: 'User',
      before: {
        id: responseUser.id,
        email: responseUser.email,
        code: responseUser.code,
        name: responseUser.name,
        lastName: responseUser.lastName,
      },
      after: {
        id: responseUser.id,
        email: responseUser.email,
        code: responseUser.code,
        name: responseUser.name,
        lastName: responseUser.lastName,
      },
    });

    return { user: responseUser, token };
  }

  async suggestCodes({ name, lastName }: { name: string; lastName: string }): Promise<string[]> {
    const normalizedName = this.normalizeCodeToken(name) || 'user';
    const normalizedLastName = this.normalizeCodeToken(lastName) || 'account';
    const seeds = [
      `${normalizedName}_${normalizedLastName}`,
      `${normalizedLastName}_${normalizedName}`,
    ];
    const suggestions: string[] = [];
    const seenSuggestions = new Set<string>();

    for (const seed of seeds) {
      const suggestion = await this.findAvailableCode(seed, seenSuggestions);
      suggestions.push(suggestion);
      seenSuggestions.add(suggestion);
    }

    while (suggestions.length < AuthService.SUGGESTION_BATCH_SIZE) {
      const randomSuffix = this.generateRandomNumericSuffix(normalizedName);
      const baseName = suggestions.length % 2 === 0 ? normalizedName : normalizedLastName;
      const suggestion = await this.findAvailableCode(
        `${baseName}_${randomSuffix}`,
        seenSuggestions,
      );
      suggestions.push(suggestion);
      seenSuggestions.add(suggestion);
    }

    return suggestions;
  }

  private async ensureCodeIsAvailable(value: string): Promise<string> {
    const code = this.toValidCodeLength(value);
    const exists = await this.codeExists(code);

    if (exists) {
      throw new ConflictException('Code already exists');
    }

    return code;
  }

  private async generateToken({
    userId,
    userCode,
  }: {
    userId: User['id'];
    userCode: User['code'];
  }): Promise<string> {
    return await this.jwtService.signAsync({
      jti: randomUUID(),
      sub: userId,
      code: userCode,
    });
  }

  private async generateUniqueCode(factory: () => string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = this.toValidCodeLength(factory());

      if (!(await this.codeExists(code))) {
        return code;
      }
    }

    throw new ConflictException('Unable to generate a unique code');
  }

  private async findAvailableCode(seed: string, exclude: Set<string>): Promise<string> {
    let attempt = 0;

    while (attempt < 20) {
      const candidate = this.toValidCodeLength(
        attempt === 0 ? seed : `${seed}_${this.generateRandomNumericSuffix(seed)}`,
      );

      if (!exclude.has(candidate) && !(await this.codeExists(candidate))) {
        return candidate;
      }

      attempt++;
    }

    throw new ConflictException('Unable to generate enough unique code suggestions');
  }

  private async codeExists(code: string): Promise<boolean> {
    const existingCode = await this.prisma.user.findUnique({
      where: { code },
      select: { id: true },
    });

    return Boolean(existingCode);
  }

  private normalizeCodeToken(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[^\p{L}\p{N}_]/gu, '')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private toValidCodeLength(value: string): string {
    const normalized = value.replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase();
    const maxBodyLength = MAX_CODE_LENGTH - 1;
    const minBodyLength = MIN_CODE_LENGTH - 1;
    const truncated = normalized.slice(0, maxBodyLength);
    const padded =
      truncated.length >= minBodyLength ? truncated : truncated.padEnd(minBodyLength, '0');

    return `@${padded}`;
  }

  private generateRandomNumericSuffix(normalizedName: string): string {
    const maxDigits = Math.max(1, MAX_CODE_LENGTH - normalizedName.length - 2);
    const digitCount = Math.min(6, maxDigits);
    const min = 10 ** Math.max(0, digitCount - 1);
    const max = 10 ** digitCount - 1;

    return String(randomInt(min, max + 1));
  }
}
