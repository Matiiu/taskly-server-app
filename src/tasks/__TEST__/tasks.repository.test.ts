import { Test, TestingModule } from '@nestjs/testing';

import { TasksRepository } from '@/tasks/tasks.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { TaskRelation } from '@/tasks/enums/task-relation.enums';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';

const USER_ID = 'user-id-1';
const CREATED_WHERE = { createdById: USER_ID };
const ASSIGNED_WHERE = { assignees: { some: { userId: USER_ID } } };

const baseArgs = { userId: USER_ID, page: 1, limit: 10, sortOrder: 'desc' as const, search: null };

describe('TasksRepository', () => {
  let repository: TasksRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.task.findMany.mockResolvedValue([]);
    prisma.task.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repository = module.get(TasksRepository);
  });

  const lastWhere = () => {
    const [args] = jest.mocked(prisma.task.findMany).mock.calls[0] as [{ where: unknown }];
    return args.where;
  };

  describe('findPage', () => {
    it('returns tasks and total in the right order', async () => {
      const rows = [{ id: 'task-1' }];
      prisma.task.count.mockResolvedValue(7);
      prisma.task.findMany.mockResolvedValue(rows);

      const result = await repository.findPage(baseArgs);

      expect(result).toEqual({ tasks: rows, total: 7 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('filters active tasks and uses every relation when none is given', async () => {
      await repository.findPage(baseArgs);

      expect(lastWhere()).toEqual({
        active: true,
        AND: [{ OR: [CREATED_WHERE, ASSIGNED_WHERE] }],
      });
    });

    it('uses every relation when the list is empty', async () => {
      await repository.findPage({ ...baseArgs, relations: [] });

      expect(lastWhere()).toEqual({
        active: true,
        AND: [{ OR: [CREATED_WHERE, ASSIGNED_WHERE] }],
      });
    });

    it('uses only the selected relations', async () => {
      await repository.findPage({ ...baseArgs, relations: [TaskRelation.ASSIGNED] });

      expect(lastWhere()).toEqual({ active: true, AND: [{ OR: [ASSIGNED_WHERE] }] });
    });

    it('does not add a search condition when the search is blank', async () => {
      await repository.findPage({ ...baseArgs, search: '   ' });

      expect((lastWhere() as { AND: unknown[] }).AND).toHaveLength(1);
    });

    it('adds a title search condition when the search is not a task code', async () => {
      await repository.findPage({ ...baseArgs, search: ' report ' });

      expect((lastWhere() as { AND: unknown[] }).AND[1]).toEqual({
        OR: [{ title: { contains: 'report', mode: 'insensitive' } }],
      });
    });

    it('also matches the task code when the search looks like one', async () => {
      await repository.findPage({ ...baseArgs, search: 'TSK-12' });

      expect((lastWhere() as { AND: unknown[] }).AND[1]).toEqual({
        OR: [
          { title: { contains: 'TSK-12', mode: 'insensitive' } },
          {
            sequenceNumber: 12,
            workspace: { taskPrefix: { equals: 'TSK', mode: 'insensitive' } },
          },
        ],
      });
    });

    it('applies skip, take, ordering and the same where to count and findMany', async () => {
      await repository.findPage({ ...baseArgs, page: 3, limit: 5, sortOrder: 'asc' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5, orderBy: [{ createdAt: 'asc' }] }),
      );
      expect(prisma.task.count).toHaveBeenCalledWith({ where: lastWhere() });
    });
  });
});
