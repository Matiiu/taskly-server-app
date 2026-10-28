import { StatusesRepository } from '@/statuses/statuses.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';

describe('StatusesRepository', () => {
  let repository: StatusesRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new StatusesRepository(prisma as unknown as PrismaService);
  });

  describe('existsInWorkspace', () => {
    it.each([
      [{ id: 'status-1' }, true],
      [null, false],
    ])('returns whether the workspace has any status (%o → %s)', async (row, expected) => {
      prisma.status.findFirst.mockResolvedValue(row);

      expect(await repository.existsInWorkspace('ws-1')).toBe(expected);
      expect(prisma.status.findFirst).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1' },
        select: { id: true },
      });
    });
  });

  it('createMany creates the statuses in the workspace and returns the count', async () => {
    prisma.status.createMany.mockResolvedValue({ count: 2 });

    const count = await repository.createMany('ws-1', [
      { name: 'Pending', color: '#FFA500' },
      { name: 'Done', color: '#32CD32' },
    ]);

    expect(count).toBe(2);
    expect(prisma.status.createMany).toHaveBeenCalledWith({
      data: [
        { workspaceId: 'ws-1', name: 'Pending', color: '#FFA500' },
        { workspaceId: 'ws-1', name: 'Done', color: '#32CD32' },
      ],
    });
  });

  describe('findPage', () => {
    const base = { workspaceId: 'ws-1', page: 2, limit: 5, sortOrder: 'asc' as const };

    it('pages the statuses of the workspace and counts with the same filter', async () => {
      prisma.status.findMany.mockResolvedValue([]);
      prisma.status.count.mockResolvedValue(0);

      const result = await repository.findPage({ ...base, search: null });

      expect(result).toEqual({ statuses: [], total: 0 });
      expect(prisma.status.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        where: { workspaceId: 'ws-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(prisma.status.count).toHaveBeenCalledWith({ where: { workspaceId: 'ws-1' } });
    });

    it('filters by name when there is a search term', async () => {
      prisma.status.findMany.mockResolvedValue([]);
      prisma.status.count.mockResolvedValue(0);

      await repository.findPage({ ...base, search: '  done ' });

      expect(prisma.status.count).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1', name: { contains: 'done', mode: 'insensitive' } },
      });
    });
  });

  it('findById only matches statuses of the workspace', async () => {
    await repository.findById('ws-1', 'status-1');

    expect(prisma.status.findFirst).toHaveBeenCalledWith({
      where: { id: 'status-1', workspaceId: 'ws-1' },
    });
  });

  it('findByName uses the (workspaceId, name) unique key', async () => {
    await repository.findByName('ws-1', 'Done');

    expect(prisma.status.findUnique).toHaveBeenCalledWith({
      where: { workspaceId_name: { workspaceId: 'ws-1', name: 'Done' } },
    });
  });

  it('create, updateColor and delete pass the data through', async () => {
    await repository.create({ workspaceId: 'ws-1', name: 'Blocked', color: '#808080' });
    await repository.updateColor('status-1', '#000000');
    await repository.delete('status-1');

    expect(prisma.status.create).toHaveBeenCalledWith({
      data: { workspaceId: 'ws-1', name: 'Blocked', color: '#808080' },
    });
    expect(prisma.status.update).toHaveBeenCalledWith({
      where: { id: 'status-1' },
      data: { color: '#000000' },
    });
    expect(prisma.status.delete).toHaveBeenCalledWith({ where: { id: 'status-1' } });
  });
});
