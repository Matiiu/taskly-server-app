import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';

import { UserType } from '@/users/entities/user.type';
import { PaginatedUsersType } from '@/users/entities/paginated-users.type';
import { paginationMeta } from '@/common/utils/pagination.util';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constants';
import { UpdateUserInput } from '@/users/dto/update-user.type';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { UsersRepository, type CreateUserData } from '@/users/users.repository';
import type { Db } from '@/prisma/prisma.types';
import type { User } from 'generated/prisma/client';
import type { SafeUser } from '@/users/types/users.type';
import { toUserSnapshot } from '@/users/utils/user-snapshot.util';
import { assertCanActOnUser } from '@/users/utils/user-access.util';
import { isUniqueViolation } from '@/prisma/prisma.errors';
import { UserNotFoundException } from '@/common/exceptions/user-not-found.exception';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  async findMany(pagination: PaginationArgsInput = {}): Promise<PaginatedUsersType> {
    const { limit = LIMIT_DEFAULT, page = PAGE_DEFAULT, sortOrder = 'desc' } = pagination;
    const { users, total } = await this.usersRepo.findPage({ page, limit, sortOrder });

    return {
      users: users.map((user) => this.toUserType(user)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async findByCode(code: string): Promise<UserType> {
    const user = await this.usersRepo.findByCode(code);

    if (!user) {
      throw new UserNotFoundException({ code });
    }

    return this.toUserType(user);
  }

  /** Active user by id, or null (for callers where a missing user is not an error). */
  findById(id: User['id']): Promise<SafeUser | null> {
    return this.usersRepo.findById(id);
  }

  existsByCode(code: User['code']): Promise<boolean> {
    return this.usersRepo.existsByCode(code);
  }

  /**
   * Account state writes used by the login module. They take an optional `tx` so login can run
   * them inside its own transactions; audit logs stay with the caller, which knows the action.
   */
  create(data: CreateUserData, db?: Db): Promise<SafeUser> {
    return this.usersRepo.create(data, db);
  }

  deactivate(
    id: User['id'],
    recoveryDate: NonNullable<User['recoveryDate']>,
    db?: Db,
  ): Promise<SafeUser> {
    return this.usersRepo.deactivate(id, recoveryDate, db);
  }

  activate(id: User['id'], db?: Db): Promise<SafeUser> {
    return this.usersRepo.activate(id, db);
  }

  release(id: User['id'], db?: Db): Promise<SafeUser> {
    return this.usersRepo.release(id, db);
  }

  /**
   * Gives the user a new code. Codes are unique across every user (inactive ones included),
   * so a taken code is a 409; the user's own current code is a 400.
   */
  async changeCode(user: SafeUser, code: User['code']): Promise<UserType> {
    if (code === user.code) {
      throw new BadRequestException(`You already have the code ${code}`);
    }

    if (await this.usersRepo.existsByCode(code)) {
      throw new ConflictException(`Code ${code} is already taken`);
    }

    let updatedUser: SafeUser;
    try {
      updatedUser = await this.usersRepo.updateCode(user.id, code);
    } catch (e) {
      // Another request took the code between the check and the update
      if (isUniqueViolation(e)) throw new ConflictException(`Code ${code} is already taken`);
      throw e;
    }

    this.eventEmitter.emitAuditLog({
      userId: user.id,
      action: 'UPDATE_USER',
      entityId: user.id,
      entity: 'User',
      description: `Code changed from ${user.code} to ${code}`,
      before: toUserSnapshot(user),
      after: toUserSnapshot(updatedUser),
    });

    return this.toUserType(updatedUser);
  }

  /** Active user by id; 404 otherwise. */
  async findByIdOrThrow(id: User['id']): Promise<SafeUser> {
    const user = await this.usersRepo.findById(id);

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }

  /**
   * Updates the profile of `target`. `actor` is who makes the change:
   * the user themselves (default) or an admin editing someone else.
   */
  async update(
    target: SafeUser,
    input: UpdateUserInput,
    actor: SafeUser = target,
  ): Promise<UserType> {
    assertCanActOnUser(actor, target.id);

    await this.assertDocumentAvailable(
      input.documentType ?? target.documentType,
      input.documentNumber ?? target.documentNumber,
      target.id,
    );

    try {
      const updatedUser = await this.usersRepo.update(target.id, {
        name: input.name,
        firstSurname: input.firstSurname,
        secondSurname: input.secondSurname,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        email: input.email,
        phoneNumber: input.phoneNumber,
        phoneCountryCode: input.phoneCountryCode,
      });

      this.eventEmitter.emitAuditLog({
        userId: actor.id,
        action: 'UPDATE_USER',
        entityId: target.id,
        entity: 'User',
        before: toUserSnapshot(target),
        after: toUserSnapshot(updatedUser),
      });

      return this.toUserType(updatedUser);
    } catch (e) {
      // Email or document taken by another user (also covers a race with the check above)
      if (isUniqueViolation(e)) {
        throw new ConflictException('Email or document already belongs to another user');
      }

      this.logger.error('Failed to update user', e instanceof Error ? e.stack : '');
      throw new BadRequestException('Failed to update user');
    }
  }

  toUserType(user: SafeUser): UserType {
    return {
      id: user.id,
      name: user.name,
      firstSurname: user.firstSurname,
      secondSurname: user.secondSurname,
      role: user.role,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      email: user.email,
      code: user.code,
      phoneNumber: user.phoneNumber,
      phoneCountryCode: user.phoneCountryCode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async assertDocumentAvailable(
    documentType: User['documentType'],
    documentNumber: User['documentNumber'],
    excludeUserId?: User['id'],
  ): Promise<void> {
    if (await this.usersRepo.isExistingDocument(documentType, documentNumber, excludeUserId)) {
      throw new ConflictException(
        `Another user with document ${documentType} ${documentNumber} already exists`,
      );
    }
  }
}
