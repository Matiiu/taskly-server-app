import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  it('applies status and category filters', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { task: { findMany } } as unknown as PrismaService;

    const service = new TasksService(prisma);
    await service.findAll({ status: TaskStatus.DONE, categoryId: 5 });

    expect(findMany).toHaveBeenCalledWith({
      where: { status: TaskStatus.DONE, categoryId: 5 },
      include: { category: true },
      orderBy: { id: 'asc' },
    });
  });

  it('defaults status to PENDING on create', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 1, title: 'A', status: TaskStatus.PENDING });
    const prisma = { task: { create } } as unknown as PrismaService;

    const service = new TasksService(prisma);

    await service.create({
      title: 'A',
      description: 'B',
      categoryId: 1,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        title: 'A',
        description: 'B',
        categoryId: 1,
        status: TaskStatus.PENDING,
      },
      include: { category: true },
    });
  });
});
