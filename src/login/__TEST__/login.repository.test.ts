import { LoginRepository } from '@/login/login.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { OMIT_PASSWORD } from '@/users/constants/users.constants';
import { buildSafeUser } from '@/common/testing/users/factories/users.factory';
import { createPrismaMock } from '@/common/testing/prisma/mocks/prisma.mock';

// Session queries are covered through token.service.test.ts; these cover the credential methods.
describe('LoginRepository', () => {
  let repository: LoginRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new LoginRepository(prisma as unknown as PrismaService);
    prisma.user.findUnique.mockResolvedValue(null);
  });

  describe('credential reads include the password and inactive users', () => {
    it('findById', async () => {
      await repository.findById('user-id-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-id-1' } });
    });

    it('findByEmail ignores released accounts', async () => {
      await repository.findByEmail('john@example.com');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@example.com', releasedAt: null },
      });
    });
  });

  it('updatePassword stores the new hash and returns the user without the password', async () => {
    const user = buildSafeUser();
    prisma.user.update.mockResolvedValue(user);

    await expect(repository.updatePassword('user-id-1', 'new-hash')).resolves.toBe(user);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id-1' },
      data: { password: 'new-hash' },
      omit: OMIT_PASSWORD,
    });
  });

  describe('password reset tokens', () => {
    const NOW = new Date('2026-11-18T12:00:00.000Z');
    const TOKEN_HASH = 'token-hash';

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(NOW);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('createResetToken stores the hash, user and expiry', async () => {
      const data = { tokenHash: TOKEN_HASH, userId: 'user-id-1', expiresAt: NOW };

      await expect(repository.createResetToken(data)).resolves.toBeUndefined();

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({ data });
    });

    it('findActiveResetToken only matches unused, unexpired tokens and includes the safe user', async () => {
      const found = { id: 'token-id-1', user: buildSafeUser() };
      prisma.passwordResetToken.findFirst.mockResolvedValue(found);

      await expect(repository.findActiveResetToken(TOKEN_HASH)).resolves.toBe(found);

      expect(prisma.passwordResetToken.findFirst).toHaveBeenCalledWith({
        where: { tokenHash: TOKEN_HASH, usedAt: null, expiresAt: { gt: NOW } },
        include: { user: { omit: OMIT_PASSWORD } },
      });
    });

    it('findActiveResetToken returns null when there is no active token', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(repository.findActiveResetToken(TOKEN_HASH)).resolves.toBeNull();
    });

    it('markResetTokenUsed returns true when it marked the token', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(repository.markResetTokenUsed('token-id-1')).resolves.toBe(true);

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'token-id-1', usedAt: null },
        data: { usedAt: NOW },
      });
    });

    it('markResetTokenUsed returns false when the token was already used', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.markResetTokenUsed('token-id-1')).resolves.toBe(false);
    });

    it('invalidateResetTokens marks every unused token of the user as used', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 2 });

      await expect(repository.invalidateResetTokens('user-id-1')).resolves.toBeUndefined();

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-1', usedAt: null },
        data: { usedAt: NOW },
      });
    });
  });
});
