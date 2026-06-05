import { Injectable, BadRequestException, Logger } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import type { User } from 'generated/prisma/client';
import { UserType } from '@/users/entities/user.type';
import { DocumentType } from 'generated/prisma/enums';
import { PaginatedUsersType } from '@/users/entities/paginated-users.type';
import { paginationMeta } from '@/common/utils/pagination.util';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constant';
import { UpdateUserInput } from '@/users/dto/update-user.type';
import { AppEventEmitterService } from '@/common/event-emitter.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  async findAll({
    limit = LIMIT_DEFAULT,
    page = PAGE_DEFAULT,
  }: {
    limit?: number;
    page?: number;
  } = {}): Promise<PaginatedUsersType> {
    const [usersResponse, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { active: true },
        orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.user.count({ where: { active: true } }),
    ]);
    const users = usersResponse.map((user) => this.createResponse(user));
    const meta = paginationMeta(total, page, limit);
    return { users, meta };
  }

  async findByCode(code: string): Promise<UserType> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { code } });

    return this.createResponse(user);
  }

  async findByDocument(documentType: DocumentType, documentNumber: string): Promise<UserType> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: {
        documentType,
        documentNumber,
        active: true,
      },
    });

    return this.createResponse(user);
  }

  async update(id: User['id'], input: UpdateUserInput): Promise<UserType> {
    const existingUser = await this.prisma.user.findUniqueOrThrow({ where: { id } });

    // Validate Document Uniqueness
    if (
      (input.documentType && input.documentType !== existingUser.documentType) ||
      (input.documentNumber && input.documentNumber !== existingUser.documentNumber)
    ) {
      const conflictingUser = await this.prisma.user.findFirst({
        where: {
          documentType: input.documentType || existingUser.documentType,
          documentNumber: input.documentNumber || existingUser.documentNumber,
          active: true,
          id: { not: id },
        },
      });

      if (conflictingUser) {
        throw new BadRequestException(
          `Another user with document ${input.documentType || existingUser.documentType} ${
            input.documentNumber || existingUser.documentNumber
          } already exists`,
        );
      }
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          name: input.name,
          lastName: input.lastName,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          email: input.email,
          phoneNumber: input.phoneNumber,
          phoneCountryCode: input.phoneCountryCode,
        },
      });

      const responseUser = this.createResponse(user);

      this.eventEmitter.emitAuditLog({
        userId: existingUser.id,
        action: 'UPDATE_USER',
        entityId: existingUser.id,
        entity: 'User',
        before: {
          id: existingUser.id,
          name: existingUser.name,
          lastName: existingUser.lastName,
          documentType: existingUser.documentType,
          documentNumber: existingUser.documentNumber,
          email: existingUser.email,
          code: existingUser.code,
          phoneNumber: existingUser.phoneNumber,
          phoneCountryCode: existingUser.phoneCountryCode,
          source: existingUser.source,
        },
        after: {
          id: responseUser.id,
          name: responseUser.name,
          lastName: responseUser.lastName,
          documentType: responseUser.documentType,
          documentNumber: responseUser.documentNumber,
          email: responseUser.email,
          code: responseUser.code,
          phoneNumber: responseUser.phoneNumber,
          phoneCountryCode: responseUser.phoneCountryCode,
          source: existingUser.source,
        },
      });
      return responseUser;
    } catch (e) {
      this.logger.error('Failed to update user', e instanceof Error ? e.stack : '');
      throw new BadRequestException('Faild to update user');
    }
  }

  createResponse(user: User): UserType {
    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
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
}
