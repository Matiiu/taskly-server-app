import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import { User, Prisma } from 'generated/prisma/client';
import type { SafeUser } from '@/users/types/users.type';
import { OMIT_PASSWORD } from '@/users/constants/users.constants';
import { SortOrder } from '@/common/enums/pagination.enum';

export type CreateUserData = Pick<
  Prisma.UserCreateInput,
  | 'name'
  | 'firstSurname'
  | 'secondSurname'
  | 'documentType'
  | 'documentNumber'
  | 'email'
  | 'password'
  | 'source'
  | 'phoneNumber'
  | 'phoneCountryCode'
  | 'code'
>;

/** Profile fields a user can change. All optional: only the given ones are updated. */
export type UpdateUserData = Pick<
  Prisma.UserUpdateInput,
  | 'name'
  | 'firstSurname'
  | 'secondSurname'
  | 'documentType'
  | 'documentNumber'
  | 'email'
  | 'phoneNumber'
  | 'phoneCountryCode'
>;

type FindPageData = {
  page: number;
  limit: number;
  sortOrder: SortOrder;
};

/**
 * Reads return active users only (inactive ones belong to the future admin module).
 * Never returns the password hash: credential reads and writes live in LoginRepository.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateUserData, db: Db = this.prisma): Promise<SafeUser> {
    return db.user.create({
      data: {
        name: data.name,
        firstSurname: data.firstSurname,
        secondSurname: data.secondSurname,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        email: data.email,
        password: data.password,
        source: data.source,
        phoneNumber: data.phoneNumber,
        phoneCountryCode: data.phoneCountryCode,
        code: data.code,
      },
      omit: OMIT_PASSWORD,
    });
  }

  /**
   * Not `db`-aware: the batch `$transaction([...])` form is not available on a transaction client.
   */
  async findPage({
    page,
    limit,
    sortOrder,
  }: FindPageData): Promise<{ users: SafeUser[]; total: number }> {
    const where: Prisma.UserWhereInput = { active: true };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy: [{ name: sortOrder }, { firstSurname: sortOrder }, { secondSurname: sortOrder }],
        omit: OMIT_PASSWORD,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  findById(id: User['id'], db: Db = this.prisma): Promise<SafeUser | null> {
    return db.user.findUnique({ where: { id, active: true }, omit: OMIT_PASSWORD });
  }

  findByCode(code: User['code'], db: Db = this.prisma): Promise<SafeUser | null> {
    return db.user.findUnique({ where: { code, active: true }, omit: OMIT_PASSWORD });
  }

  /** True when the document belongs to a user other than `excludeId` (unique per type). */
  async isExistingDocument(
    documentType: User['documentType'],
    documentNumber: User['documentNumber'],
    excludeId?: User['id'],
    db: Db = this.prisma,
  ): Promise<boolean> {
    const owner = await db.user.findUnique({
      where: { documentType_documentNumber: { documentType, documentNumber } },
      select: { id: true },
    });
    return !!owner && owner.id !== excludeId;
  }

  async existsByCode(code: string, db: Db = this.prisma): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { code },
      select: { id: true },
    });
    return user !== null;
  }

  /** Soft delete: the account is kept but marked inactive. */
  deactivate(id: User['id'], db: Db = this.prisma): Promise<SafeUser> {
    return db.user.update({ where: { id }, data: { active: false }, omit: OMIT_PASSWORD });
  }

  activate(id: User['id'], db: Db = this.prisma): Promise<SafeUser> {
    return db.user.update({ where: { id }, data: { active: true }, omit: OMIT_PASSWORD });
  }

  update(id: User['id'], data: UpdateUserData, db: Db = this.prisma): Promise<SafeUser> {
    return db.user.update({
      where: { id },
      data: {
        name: data.name,
        firstSurname: data.firstSurname,
        secondSurname: data.secondSurname,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        email: data.email,
        phoneNumber: data.phoneNumber,
        phoneCountryCode: data.phoneCountryCode,
      },
      omit: OMIT_PASSWORD,
    });
  }
}
