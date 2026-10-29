import { Test, TestingModule } from '@nestjs/testing';

import { UserNotFoundException } from '@/common/exceptions/user-not-found.exception';
import { UsersService } from '@/users/users.service';
import { UsersRepository } from '@/users/users.repository';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { buildSafeUser, buildUserType } from '@/common/testing/factories/users.factory';
import { LIMIT_DEFAULT, PAGE_DEFAULT } from '@/common/constants/pagination.constants';

const USER_ID = 'user-id-1';
const USER_CODE = '@johndoe';

const createUsersRepositoryMock = () => ({
  findPage: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  isExistingDocument: jest.fn(),
  update: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: ReturnType<typeof createUsersRepositoryMock>;

  beforeEach(async () => {
    usersRepo = createUsersRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepo },
        { provide: AppEventEmitterService, useValue: createAppEventEmitterMock() },
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
});
