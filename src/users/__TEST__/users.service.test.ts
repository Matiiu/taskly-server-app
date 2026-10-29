import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import { UserNotFoundException } from '@/common/exceptions/user-not-found.exception';
import type { Db } from '@/prisma/prisma.types';
import { UsersService } from '@/users/users.service';
import { UsersRepository } from '@/users/users.repository';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { buildSafeUser, buildUserType } from '@/common/testing/factories/users.factory';
import { toUserSnapshot } from '@/users/utils/user-snapshot.util';
import { LIMIT_DEFAULT, PAGE_DEFAULT } from '@/common/constants/pagination.constants';

const USER_ID = 'user-id-1';
const USER_CODE = '@johndoe';
const NEW_CODE = '@newcode';
const TX = { tx: true } as unknown as Db;

const createUsersRepositoryMock = () => ({
  findPage: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  isExistingDocument: jest.fn(),
  update: jest.fn(),
  existsByCode: jest.fn(),
  create: jest.fn(),
  deactivate: jest.fn(),
  activate: jest.fn(),
  release: jest.fn(),
  updateCode: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: ReturnType<typeof createUsersRepositoryMock>;
  let eventEmitter: ReturnType<typeof createAppEventEmitterMock>;

  beforeEach(async () => {
    usersRepo = createUsersRepositoryMock();
    eventEmitter = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepo },
        { provide: AppEventEmitterService, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findMany', () => {
    it('uses default pagination and sort order when none is given', async () => {
      const user = buildSafeUser();
      usersRepo.findPage.mockResolvedValue({ users: [user], total: 1 });

      const result = await service.findMany();

      expect(usersRepo.findPage).toHaveBeenCalledWith({
        page: PAGE_DEFAULT,
        limit: LIMIT_DEFAULT,
        sortOrder: 'desc',
      });
      expect(result.users).toEqual([buildUserType(user)]);
      expect(result.meta).toMatchObject({ total: 1, page: PAGE_DEFAULT, limit: LIMIT_DEFAULT });
    });

    it('passes explicit pagination to the repository and builds the meta', async () => {
      usersRepo.findPage.mockResolvedValue({ users: [], total: 25 });

      const result = await service.findMany({ page: 2, limit: 5, sortOrder: 'asc' });

      expect(usersRepo.findPage).toHaveBeenCalledWith({ page: 2, limit: 5, sortOrder: 'asc' });
      expect(result.meta).toMatchObject({
        total: 25,
        page: 2,
        limit: 5,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('does not expose the password in the mapped users', async () => {
      usersRepo.findPage.mockResolvedValue({
        users: [{ ...buildSafeUser(), password: 'secret' }],
        total: 1,
      });

      const result = await service.findMany();

      expect(result.users[0]).not.toHaveProperty('password');
    });
  });

  describe('findByCode', () => {
    it('returns the mapped user when found', async () => {
      const user = buildSafeUser();
      usersRepo.findByCode.mockResolvedValue(user);

      const result = await service.findByCode(USER_CODE);

      expect(usersRepo.findByCode).toHaveBeenCalledWith(USER_CODE);
      expect(result).toEqual(buildUserType(user));
    });

    it('throws UserNotFoundException when the user does not exist', async () => {
      usersRepo.findByCode.mockResolvedValue(null);

      await expect(service.findByCode(USER_CODE)).rejects.toThrow(
        new UserNotFoundException({ code: USER_CODE }),
      );
    });
  });

  describe('findByIdOrThrow', () => {
    it('returns the user when found', async () => {
      const user = buildSafeUser();
      usersRepo.findById.mockResolvedValue(user);

      const result = await service.findByIdOrThrow(USER_ID);

      expect(usersRepo.findById).toHaveBeenCalledWith(USER_ID);
      expect(result).toBe(user);
    });

    it('throws UserNotFoundException when the user does not exist', async () => {
      usersRepo.findById.mockResolvedValue(null);

      await expect(service.findByIdOrThrow(USER_ID)).rejects.toThrow(new UserNotFoundException());
    });
  });

  describe('findById', () => {
    it('returns the repository result', async () => {
      const user = buildSafeUser();
      usersRepo.findById.mockResolvedValue(user);

      await expect(service.findById(USER_ID)).resolves.toBe(user);
      expect(usersRepo.findById).toHaveBeenCalledWith(USER_ID);
    });

    it('returns null when the user does not exist', async () => {
      usersRepo.findById.mockResolvedValue(null);

      await expect(service.findById(USER_ID)).resolves.toBeNull();
    });
  });

  describe('existsByCode', () => {
    it.each([true, false])('returns %s from the repository', async (exists) => {
      usersRepo.existsByCode.mockResolvedValue(exists);

      await expect(service.existsByCode(USER_CODE)).resolves.toBe(exists);
      expect(usersRepo.existsByCode).toHaveBeenCalledWith(USER_CODE);
    });
  });

  describe('create', () => {
    const data = {
      name: 'John',
      firstSurname: 'Doe',
      email: 'john@example.com',
      code: USER_CODE,
    } as unknown as Parameters<UsersService['create']>[0];

    it('delegates to the repository with the transaction client', async () => {
      const user = buildSafeUser();
      usersRepo.create.mockResolvedValue(user);

      await expect(service.create(data, TX)).resolves.toBe(user);
      expect(usersRepo.create).toHaveBeenCalledWith(data, TX);
    });

    it('delegates without a transaction client', async () => {
      usersRepo.create.mockResolvedValue(buildSafeUser());

      await service.create(data);

      expect(usersRepo.create).toHaveBeenCalledWith(data, undefined);
    });
  });

  describe('deactivate', () => {
    const recoveryDate = new Date('2026-02-14T10:00:00.000Z');

    it('delegates to the repository with the transaction client', async () => {
      const user = buildSafeUser({ active: false });
      usersRepo.deactivate.mockResolvedValue(user);

      await expect(service.deactivate(USER_ID, recoveryDate, TX)).resolves.toBe(user);
      expect(usersRepo.deactivate).toHaveBeenCalledWith(USER_ID, recoveryDate, TX);
    });

    it('delegates without a transaction client', async () => {
      usersRepo.deactivate.mockResolvedValue(buildSafeUser());

      await service.deactivate(USER_ID, recoveryDate);

      expect(usersRepo.deactivate).toHaveBeenCalledWith(USER_ID, recoveryDate, undefined);
    });
  });

  describe('activate', () => {
    it('delegates to the repository with the transaction client', async () => {
      const user = buildSafeUser();
      usersRepo.activate.mockResolvedValue(user);

      await expect(service.activate(USER_ID, TX)).resolves.toBe(user);
      expect(usersRepo.activate).toHaveBeenCalledWith(USER_ID, TX);
    });

    it('delegates without a transaction client', async () => {
      usersRepo.activate.mockResolvedValue(buildSafeUser());

      await service.activate(USER_ID);

      expect(usersRepo.activate).toHaveBeenCalledWith(USER_ID, undefined);
    });
  });

  describe('release', () => {
    it('delegates to the repository with the transaction client', async () => {
      const user = buildSafeUser();
      usersRepo.release.mockResolvedValue(user);

      await expect(service.release(USER_ID, TX)).resolves.toBe(user);
      expect(usersRepo.release).toHaveBeenCalledWith(USER_ID, TX);
    });

    it('delegates without a transaction client', async () => {
      usersRepo.release.mockResolvedValue(buildSafeUser());

      await service.release(USER_ID);

      expect(usersRepo.release).toHaveBeenCalledWith(USER_ID, undefined);
    });
  });

  describe('changeCode', () => {
    const user = buildSafeUser({ code: USER_CODE });
    const updatedUser = buildSafeUser({ code: NEW_CODE });
    const takenMessage = `Code ${NEW_CODE} is already taken`;
    const uniqueViolation = () =>
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });

    it('updates the code, logs the change and returns the mapped user', async () => {
      usersRepo.existsByCode.mockResolvedValue(false);
      usersRepo.updateCode.mockResolvedValue(updatedUser);

      const result = await service.changeCode(user, NEW_CODE);

      expect(usersRepo.existsByCode).toHaveBeenCalledWith(NEW_CODE);
      expect(usersRepo.updateCode).toHaveBeenCalledWith(user.id, NEW_CODE);
      expect(eventEmitter.emitAuditLog).toHaveBeenCalledWith({
        userId: user.id,
        action: 'UPDATE_USER',
        entityId: user.id,
        entity: 'User',
        description: `Code changed from ${USER_CODE} to ${NEW_CODE}`,
        before: toUserSnapshot(user),
        after: toUserSnapshot(updatedUser),
      });
      expect(result).toEqual(buildUserType(updatedUser));
    });

    it('throws BadRequestException when the code is the current one', async () => {
      await expect(service.changeCode(user, USER_CODE)).rejects.toThrow(
        new BadRequestException(`You already have the code ${USER_CODE}`),
      );
      expect(usersRepo.existsByCode).not.toHaveBeenCalled();
      expect(usersRepo.updateCode).not.toHaveBeenCalled();
      expect(eventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the code is already taken', async () => {
      usersRepo.existsByCode.mockResolvedValue(true);

      await expect(service.changeCode(user, NEW_CODE)).rejects.toThrow(
        new ConflictException(takenMessage),
      );
      expect(usersRepo.updateCode).not.toHaveBeenCalled();
      expect(eventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent request took the code', async () => {
      usersRepo.existsByCode.mockResolvedValue(false);
      usersRepo.updateCode.mockRejectedValue(uniqueViolation());

      await expect(service.changeCode(user, NEW_CODE)).rejects.toThrow(
        new ConflictException(takenMessage),
      );
      expect(eventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });

    it('rethrows other errors as they are', async () => {
      const error = new Error('db down');
      usersRepo.existsByCode.mockResolvedValue(false);
      usersRepo.updateCode.mockRejectedValue(error);

      await expect(service.changeCode(user, NEW_CODE)).rejects.toBe(error);
      expect(eventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });
});
