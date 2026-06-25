import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { UserExistsGuard } from '@/users/guards/user-exists.guard';

import { UsersResolver } from '@/users/users.resolver';
import { UsersService } from '@/users/users.service';
import { buildUser, buildUserType } from '@/common/testing/factories/users.factory';
import { createUsersServiceMock } from '@/common/testing/mocks/users-service.mock';
import { SortOrder } from '@/common/enums/pagination.enum';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersServiceMock: ReturnType<typeof createUsersServiceMock>;
  let meta: ReturnType<typeof createPaginationMetaMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();

    usersServiceMock = createUsersServiceMock();
    meta = createPaginationMetaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersResolver, { provide: UsersService, useValue: usersServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserExistsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<UsersResolver>(UsersResolver);
  });

  describe('findMany', () => {
    it('delegates to the service and returns the paginated result', async () => {
      const user = buildUserType(buildUser());
      const paginationArgs = { limit: 10, page: 1, query: 'John', sortOrder: SortOrder.ASC };
      const expected = { users: [user], meta };

      usersServiceMock.findMany.mockResolvedValue(expected);

      const result = await resolver.findMany(paginationArgs);

      expect(result).toEqual(expected);
      expect(usersServiceMock.findMany).toHaveBeenCalledWith(paginationArgs);
      expect(usersServiceMock.findMany).toHaveBeenCalledTimes(1);
    });
  });

  it('forwards undefined when no pagination argument is provided', async () => {
    const expected = { users: [], meta: { ...meta, total: 0, totalPages: 0 } };
    usersServiceMock.findMany.mockResolvedValue(expected);

    const result = await resolver.findMany();

    expect(result).toEqual(expected);
    expect(usersServiceMock.findMany).toHaveBeenCalledWith(undefined);
  });

  it('propagates errors thrown by the service', async () => {
    const boom = new InternalServerErrorException('db down');
    usersServiceMock.findMany.mockRejectedValue(boom);

    await expect(resolver.findMany()).rejects.toBe(boom);
  });

  describe('findByCode', () => {
    it('delegates to the service with the given code and returns the user', async () => {
      const user = buildUserType(buildUser({ code: 'USR-001' }));
      usersServiceMock.findByCode.mockResolvedValue(user);

      const result = await resolver.findByCode('USR-001');

      expect(result).toBe(user);
      expect(usersServiceMock.findByCode).toHaveBeenCalledWith('USR-001');
      expect(usersServiceMock.findByCode).toHaveBeenCalledTimes(1);
    });

    it('propagates errors thrown by the service', async () => {
      const boom = new InternalServerErrorException('lookup failed');
      usersServiceMock.findByCode.mockRejectedValue(boom);

      await expect(resolver.findByCode('USR-001')).rejects.toBe(boom);
    });
  });

  describe('findMe', () => {
    it('looks up the current user by their code via findByCode', async () => {
      const user = buildUserType(buildUser({ code: 'ME-123' }));
      usersServiceMock.findByCode.mockResolvedValue(user);

      const result = await resolver.findMe('ME-123');

      expect(result).toBe(user);
      // findMe must resolve the *current user's* code, not call a different method
      expect(usersServiceMock.findByCode).toHaveBeenCalledWith('ME-123');
      expect(usersServiceMock.findByCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('updates the user and returns a formatted action message', async () => {
      const user = buildUserType(buildUser({ code: 'USR-007', name: 'Jane', lastName: 'Doe' }));
      const input = { name: 'Jane' }; // shape per your UpdateUserInput
      usersServiceMock.update.mockResolvedValue(user);

      const result = await resolver.update('user-id-1', input);

      expect(usersServiceMock.update).toHaveBeenCalledWith('user-id-1', input);
      expect(result).toEqual({
        message: `User ${user.code} updated successfully`,
        user,
      });
    });

    it('propagates errors thrown by the service', async () => {
      const boom = new InternalServerErrorException('update failed');
      usersServiceMock.update.mockRejectedValue(boom);

      await expect(resolver.update('user-id-1', {})).rejects.toBe(boom);
    });
  });
});
