import { CategoriesRepository } from '@/categories/categories.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';

describe('CategoriesRepository', () => {
  let repository: CategoriesRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new CategoriesRepository(prisma as unknown as PrismaService);
  });

  describe('findPage', () => {
    const base = { workspaceId: 'ws-1', page: 2, limit: 5, sortOrder: 'desc' as const };

    it('pages the categories of the workspace and counts with the same filter', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      prisma.category.count.mockResolvedValue(0);

      const result = await repository.findPage({ ...base, search: null });

      expect(result).toEqual({ categories: [], total: 0 });
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        where: { workspaceId: 'ws-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.category.count).toHaveBeenCalledWith({ where: { workspaceId: 'ws-1' } });
    });

    it('filters by name when there is a search term', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      prisma.category.count.mockResolvedValue(0);

      await repository.findPage({ ...base, search: '  work ' });

      expect(prisma.category.count).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1', name: { contains: 'work', mode: 'insensitive' } },
      });
    });
  });

  it('findById only matches categories of the workspace', async () => {
    await repository.findById('ws-1', 'category-1');

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: 'category-1', workspaceId: 'ws-1' },
    });
  });

  it('findByName uses the (workspaceId, name) unique key', async () => {
    await repository.findByName('ws-1', 'Work');

    expect(prisma.category.findUnique).toHaveBeenCalledWith({
      where: { workspaceId_name: { workspaceId: 'ws-1', name: 'Work' } },
    });
  });

  it('create, updateColor and delete pass the data through', async () => {
    await repository.create({ workspaceId: 'ws-1', name: 'Personal', color: '#808080' });
    await repository.updateColor('category-1', '#000000');
    await repository.delete('category-1');

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { workspaceId: 'ws-1', name: 'Personal', color: '#808080' },
    });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { color: '#000000' },
    });
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'category-1' } });
  });
});
