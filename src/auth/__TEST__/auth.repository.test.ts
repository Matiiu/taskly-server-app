import { AuthRepository } from '@/auth/auth.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';

// Session queries are covered through token.service.test.ts; these cover the credential methods.
describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new AuthRepository(prisma as unknown as PrismaService);
    prisma.user.findUnique.mockResolvedValue(null);
  });

  describe('credential reads include the password and inactive users', () => {
    it('findById', async () => {
      await repository.findById('user-id-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-id-1' } });
    });

    it('findByEmail', async () => {
      await repository.findByEmail('john@example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
    });
  });

  it('updatePassword stores the new hash', async () => {
    await expect(repository.updatePassword('user-id-1', 'new-hash')).resolves.toBeUndefined();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id-1' },
      data: { password: 'new-hash' },
    });
  });
});
