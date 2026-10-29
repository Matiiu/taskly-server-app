import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { TargetUserGuard } from '@/users/guards/target-user.guard';
import { UsersResolver } from '@/users/users.resolver';
import { UsersService } from '@/users/users.service';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { buildSafeUser, buildUserType } from '@/common/testing/factories/users.factory';
import { createUsersServiceMock } from '@/common/testing/mocks/users-service.mock';

const USER_CODE = '@johndoe';
const ACTOR_ID = 'actor-id';
const TARGET_ID = 'target-id';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersServiceMock: ReturnType<typeof createUsersServiceMock>;

  beforeEach(async () => {
    usersServiceMock = createUsersServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersResolver, { provide: UsersService, useValue: usersServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TargetUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get(UsersResolver);
  });

  describe('findMany', () => {
    it('passes the pagination through and returns the service result', async () => {
      const pagination: PaginationArgsInput = { page: 2, limit: 5 };
      const page = { data: [], meta: {} };
      usersServiceMock.findMany.mockResolvedValue(page);

      const result = await resolver.findMany(pagination);

      expect(usersServiceMock.findMany).toHaveBeenCalledWith(pagination);
      expect(result).toBe(page);
    });
  });

  describe('findByCode', () => {
    it('passes the code through and returns the service result', async () => {
      const userType = buildUserType(buildSafeUser());
      usersServiceMock.findByCode.mockResolvedValue(userType);

      const result = await resolver.findByCode(USER_CODE);

      expect(usersServiceMock.findByCode).toHaveBeenCalledWith(USER_CODE);
      expect(result).toBe(userType);
    });
  });

  describe('findMe', () => {
    it('returns the current user mapped with toUserType', () => {
      const me = buildSafeUser();
      const userType = buildUserType(me);
      usersServiceMock.toUserType.mockReturnValue(userType);

      const result = resolver.findMe(me);

      expect(usersServiceMock.toUserType).toHaveBeenCalledWith(me);
      expect(result).toBe(userType);
    });
  });

  describe('update', () => {
    it('updates the target as the actor and returns message and user', async () => {
      const target = buildSafeUser({ id: TARGET_ID });
      const actor = buildSafeUser({ id: ACTOR_ID });
      const input = { name: 'Jane' };
      const user = { ...buildUserType(buildSafeUser({ id: TARGET_ID })), code: USER_CODE };
      usersServiceMock.update.mockResolvedValue(user);

      const result = await resolver.update(TARGET_ID, target, actor, input);

      expect(usersServiceMock.update).toHaveBeenCalledWith(target, input, actor);
      expect(result).toEqual({ message: `User ${USER_CODE} updated successfully`, user });
      expect(result.user).toBe(user);
    });
  });
});
