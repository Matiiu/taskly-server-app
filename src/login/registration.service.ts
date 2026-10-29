import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import { hashPassword } from '@/common/utils/hash.util';
import {
  generateRandomNumericSuffix,
  normalizeCodeToken,
  toValidCodeLength,
  toValidCodeWithSuffix,
} from '@/common/utils/code-suggestion.util';
import { RegisterInput } from '@/login/dto/register.input';
import { SuggestCodesInput } from '@/login/dto/suggest-codes.input';
import { LoginRepository } from '@/login/login.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { isUniqueViolation } from '@/prisma/prisma.errors';
import { UsersService } from '@/users/users.service';
import { UserType } from '@/users/entities/user.type';
import type { SafeUser } from '@/users/types/users.type';
import { toUserSnapshot } from '@/users/utils/user-snapshot.util';
import { WorkspaceService } from '@/workspace/workspace.service';
import { AuthProvider } from 'generated/prisma/enums';
import type { Workspace } from 'generated/prisma/client';

const SUGGESTION_BATCH_SIZE = 6;
const MAX_CODE_ATTEMPTS = 20;

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loginRepo: LoginRepository,
    private readonly usersService: UsersService,
    private readonly workspaceService: WorkspaceService,
    private readonly appEventEmitter: AppEventEmitterService,
  ) {}

  async register(input: RegisterInput): Promise<UserType> {
    if (await this.loginRepo.findByEmail(input.email)) {
      throw new ConflictException('User already exists');
    }

    await this.usersService.assertDocumentAvailable(input.documentType, input.documentNumber);

    const { createdUser, workspace } = await this.createUserWithWorkspace(input);

    this.appEventEmitter.emitAuditLog({
      userId: createdUser.id,
      action: 'REGISTER_USER',
      entityId: createdUser.id,
      entity: 'User',
      after: toUserSnapshot(createdUser),
    });
    // After the commit, so the background seeding never runs for a rolled-back workspace
    this.workspaceService.notifyCreated(workspace, createdUser.id);

    return this.usersService.toUserType(createdUser);
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

    while (suggestions.length < SUGGESTION_BATCH_SIZE) {
      const baseName = suggestions.length % 2 === 0 ? normalizedName : normalizedFirstSurname;
      const suggestion = await this.findAvailableCode(baseName, seenSuggestions, {
        suffixFirst: true,
      });
      suggestions.push(suggestion);
      seenSuggestions.add(suggestion);
    }

    return suggestions;
  }

  /** The user and its default workspace are saved together: if one fails, neither exists. */
  private async createUserWithWorkspace(
    input: RegisterInput,
  ): Promise<{ createdUser: SafeUser; workspace: Workspace }> {
    try {
      const hashedPassword = await hashPassword(input.password);

      return await this.prisma.$transaction(async (tx) => {
        const createdUser = await this.usersService.create(
          { ...input, password: hashedPassword, source: AuthProvider.LOCAL },
          tx,
        );
        const workspace = await this.workspaceService.createDefault(createdUser.id, tx);

        return { createdUser, workspace };
      });
    } catch (e) {
      // Email, document or code taken (e.g. by an inactive user, or a concurrent registration)
      if (isUniqueViolation(e)) {
        throw new ConflictException('User already exists');
      }

      this.logger.error('Failed to create user', e instanceof Error ? e.stack : '');
      throw new BadRequestException('Failed to create user');
    }
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
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const candidate =
        attempt === 0 && !suffixFirst
          ? toValidCodeLength(seed)
          : toValidCodeWithSuffix(seed, generateRandomNumericSuffix());

      if (!exclude.has(candidate) && !(await this.usersService.existsByCode(candidate))) {
        return candidate;
      }
    }

    throw new ConflictException('Unable to generate enough unique code suggestions');
  }
}
