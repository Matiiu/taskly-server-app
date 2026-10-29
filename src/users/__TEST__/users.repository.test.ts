import { Test, TestingModule } from '@nestjs/testing';

import { UsersRepository } from '@/users/users.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { OMIT_PASSWORD } from '@/users/constants/users.constants';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { buildSafeUser } from '@/common/testing/factories/users.factory';

const USER_ID = 'user-id-1';
const USER_CODE = '@johndoe';
const NEW_CODE = '@newcode';
const RECOVERY_DATE = new Date('2026-02-14T10:00:00.000Z');

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repository = module.get(UsersRepository);
  });

  describe('findPage', () => {
    it('queries active users with skip, take and ordering, and returns users and total', async () => {
      const user = buildSafeUser();
      prisma.user.findMany.mockResolvedValue([user]);
      prisma.user.count.mockResolvedValue(25);

      const result = await repository.findPage({
        page: 3,
        limit: 10,
        sortOrder: 'asc',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        where: { active: true },
        orderBy: [{ name: 'asc' }, { firstSurname: 'asc' }, { secondSurname: 'asc' }],
        omit: OMIT_PASSWORD,
      });
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { active: true } });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ users: [user], total: 25 });
    });
  });

  describe('findById', () => {
    it('finds an active user by id without the password', async () => {
      const user = buildSafeUser();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await repository.findById(USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ID, active: true },
        omit: OMIT_PASSWORD,
      });
      expect(result).toBe(user);
    });

    it('uses the given db client instead of prisma', async () => {
      const tx = createPrismaMock();
      tx.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById(USER_ID, tx as never);

      expect(tx.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('finds an active user by code without the password', async () => {
      const user = buildSafeUser();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await repository.findByCode(USER_CODE);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { code: USER_CODE, active: true },
        omit: OMIT_PASSWORD,
      });
      expect(result).toBe(user);
    });

    it('uses the given db client instead of prisma', async () => {
      const tx = createPrismaMock();
      tx.user.findUnique.mockResolvedValue(null);

      await repository.findByCode(USER_CODE, tx as never);

      expect(tx.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('sets active to false and saves the recovery date without returning the password', async () => {
      const user = buildSafeUser({ active: false });
      prisma.user.update.mockResolvedValue(user);

      const result = await repository.deactivate(USER_ID, RECOVERY_DATE);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { active: false, recoveryDate: RECOVERY_DATE },
        omit: OMIT_PASSWORD,
      });
      expect(result).toBe(user);
    });

    it('uses the given db client instead of prisma', async () => {
      const tx = createPrismaMock();

      await repository.deactivate(USER_ID, RECOVERY_DATE, tx as never);

      expect(tx.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('sets active to true and clears the recovery date without returning the password', async () => {
      const user = buildSafeUser();
      prisma.user.update.mockResolvedValue(user);

      const result = await repository.activate(USER_ID);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { active: true, recoveryDate: null },
        omit: OMIT_PASSWORD,
      });
      expect(result).toBe(user);
    });

    it('uses the given db client instead of prisma', async () => {
      const tx = createPrismaMock();

      await repository.activate(USER_ID, tx as never);

      expect(tx.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('release', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('sets releasedAt to now without returning the password', async () => {
      const now = new Date('2026-03-01T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      const user = buildSafeUser();
      prisma.user.update.mockResolvedValue(user);

      const result = await repository.release(USER_ID);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { releasedAt: now },
        omit: OMIT_PASSWORD,
      });
      expect(result).toBe(user);
    });

    it('uses the given db client instead of prisma', async () => {
      const tx = createPrismaMock();

      await repository.release(USER_ID, tx as never);

      expect(tx.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('updateCode', () => {
    it('updates only the code of the user without returning the password', async () => {
      const user = buildSafeUser({ code: NEW_CODE });
      prisma.user.update.mockResolvedValue(user);

      const result = await repository.updateCode(USER_ID, NEW_CODE);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { code: NEW_CODE },
        omit: OMIT_PASSWORD,
      });
      expect(result).toBe(user);
    });

    it('uses the given db client instead of prisma', async () => {
      const tx = createPrismaMock();

      await repository.updateCode(USER_ID, NEW_CODE, tx as never);

      expect(tx.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
