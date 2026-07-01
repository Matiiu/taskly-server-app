import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { UsersService } from '@/users/users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { buildUser, buildUserType } from '@/common/testing/factories/users.factory';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { SortOrder } from '@/common/enums/pagination.enum';

let prisma: ReturnType<typeof createPrismaMock>;
let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

describe('UsersService', () => {
  let service: UsersService;
  let meta: ReturnType<typeof createPaginationMetaMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    appEventEmitter = createAppEventEmitterMock();
    prisma = createPrismaMock();
    meta = createPaginationMetaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findMany', () => {
    it('delegates to the service and returns the paginated result', async () => {
      const user = buildUser();
      const userType = buildUserType(user);
      const paginationArgs = { limit: 10, page: 1, query: 'John', sortOrder: SortOrder.ASC };
      const expected = { users: [userType], meta };

      prisma.user.findMany.mockResolvedValue([user]);
      prisma.user.count.mockResolvedValue(meta.total);

      const result = await service.findMany(paginationArgs);

      expect(result).toEqual(expected);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: [{ name: SortOrder.ASC }, { lastName: SortOrder.ASC }],
          where: expect.objectContaining({ active: true }) as unknown,
        }),
      );
    });

    it('builds one AND clause per search term', async () => {
      const user = buildUser();
      prisma.user.findMany.mockResolvedValue([user]);
      prisma.user.count.mockResolvedValue(meta.total);

      await service.findMany({ query: 'John  Doe', sortOrder: SortOrder.ASC });

      const callArg = prisma.user.findMany.mock.calls[0][0] as {
        where: { AND: unknown[] };
      };
      // 'John' and 'Doe' -> two AND entries (extra whitespace ignored)
      expect(callArg.where.AND).toHaveLength(2);
    });

    it('applies defaults and omits the search filter when no query is provided', async () => {
      const user = buildUser();
      prisma.user.findMany.mockResolvedValue([user]);
      prisma.user.count.mockResolvedValue(meta.total);

      await service.findMany();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true }, // no AND branch
          orderBy: [{ name: 'desc' }, { lastName: 'desc' }],
        }),
      );
    });

    it('returns an empty list when there are no users', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await service.findMany({ query: '   ' }); // whitespace-only -> no terms

      expect(result.users).toEqual([]);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } }),
      );
    });
  });

  describe('findByCode', () => {
    it('returns the user mapped to the response type', async () => {
      const user = buildUser();
      const expected = buildUserType(user);
      prisma.user.findUniqueOrThrow.mockResolvedValue(user);

      const result = await service.findByCode(user.code);

      expect(result).toEqual(expected);
      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { code: user.code },
      });
    });

    it('propagates the error when the user does not exist', async () => {
      prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));

      await expect(service.findByCode('missing')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('updates the user, emits an audit log and returns the response', async () => {
      const existingUser = buildUser();
      const updatedUser = buildUser({ ...existingUser, name: 'Updated' });
      const expected = buildUserType(updatedUser);
      const input = { name: 'Updated' };

      prisma.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(existingUser.id, input);

      expect(result).toEqual(expected);
      // document unchanged -> no uniqueness check
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: expect.objectContaining({ name: 'Updated' }),
      });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_USER',
          entity: 'User',
          entityId: existingUser.id,
        }),
      );
    });

    it('runs the uniqueness check and proceeds when no conflict exists', async () => {
      const existingUser = buildUser({ documentType: 'DNI', documentNumber: '123' });
      const updatedUser = buildUser({ ...existingUser, documentNumber: '999' });
      const input = { documentNumber: '999' };

      prisma.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(existingUser.id, input);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          documentType: existingUser.documentType,
          documentNumber: '999',
          active: true,
          id: { not: existingUser.id },
        },
      });
      expect(result).toEqual(buildUserType(updatedUser));
    });

    it('throws BadRequestException when another active user has the same document', async () => {
      const existingUser = buildUser({ documentType: 'DNI', documentNumber: '123' });
      const conflictingUser = buildUser({ documentType: 'DNI', documentNumber: '999' });
      const input = { documentNumber: '999' };

      prisma.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      prisma.user.findFirst.mockResolvedValue(conflictingUser);

      await expect(service.update(existingUser.id, input)).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });

    it('wraps update failures in a BadRequestException', async () => {
      const existingUser = buildUser();
      const input = { name: 'Updated' };

      // silence the logger.error call in the catch block
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      prisma.user.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update(existingUser.id, input)).rejects.toThrow('Faild to update user');
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });

    it('propagates when the user to update does not exist', async () => {
      prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));

      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow('Not found');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('toUserType', () => {
    it('maps a user entity to the response type', () => {
      const user = buildUser();

      expect(service.toUserType(user)).toEqual(buildUserType(user));
    });
  });
});
