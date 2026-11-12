import { TaskAssigneesRepository } from '@/task-assignees/task-assignees.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createPrismaMock } from '@/common/testing/prisma/mocks/prisma.mock';
import { buildAssigneeType } from '@/common/testing/task-assignees/factories/task-assignees.factory';

const USER_ID = 'user-id-1';
const ASSIGNEE_ID = 'user-id-2';
const TASK_ID = 'task-id-1';

const ASSIGNEE_USER_SELECT = {
  id: true,
  name: true,
  firstSurname: true,
  secondSurname: true,
  email: true,
  code: true,
};

describe('TaskAssigneesRepository', () => {
  let repository: TaskAssigneesRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new TaskAssigneesRepository(prisma as unknown as PrismaService);
  });

  it('findOwnedTask only matches active tasks created by the user', async () => {
    await repository.findOwnedTask(USER_ID, TASK_ID);

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: TASK_ID, createdById: USER_ID, active: true },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        workspaceId: true,
        status: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
  });

  it('findByTaskAndUser uses the (taskId, userId) key and selects the user and role', async () => {
    await repository.findByTaskAndUser(TASK_ID, ASSIGNEE_ID);

    expect(prisma.taskAssignee.findUnique).toHaveBeenCalledWith({
      where: { taskId_userId: { taskId: TASK_ID, userId: ASSIGNEE_ID } },
      select: {
        user: { select: ASSIGNEE_USER_SELECT },
        role: { select: { id: true, name: true } },
      },
    });
  });

  describe('findPage', () => {
    const base = { taskId: TASK_ID, page: 2, limit: 5, sortOrder: 'asc' as const };

    it('pages the active assignees of the task and returns their users', async () => {
      const assignee = buildAssigneeType();
      prisma.taskAssignee.findMany.mockResolvedValue([{ user: assignee }]);
      prisma.taskAssignee.count.mockResolvedValue(1);

      const result = await repository.findPage({ ...base, search: null });

      const where = { taskId: TASK_ID, user: { active: true } };
      expect(result).toEqual({ assignees: [assignee], total: 1 });
      expect(prisma.taskAssignee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where,
          orderBy: [
            { user: { name: 'asc' } },
            { user: { firstSurname: 'asc' } },
            { user: { secondSurname: 'asc' } },
          ],
          skip: 5,
          take: 5,
        }),
      );
      expect(prisma.taskAssignee.count).toHaveBeenCalledWith({ where });
    });

    it('searches by name, surnames, email or code when there is a search term', async () => {
      prisma.taskAssignee.findMany.mockResolvedValue([]);
      prisma.taskAssignee.count.mockResolvedValue(0);

      await repository.findPage({ ...base, search: '  jane ' });

      const contains = { contains: 'jane', mode: 'insensitive' };
      expect(prisma.taskAssignee.count).toHaveBeenCalledWith({
        where: {
          taskId: TASK_ID,
          user: {
            active: true,
            OR: [
              { name: contains },
              { firstSurname: contains },
              { secondSurname: contains },
              { email: contains },
              { code: contains },
            ],
          },
        },
      });
    });
  });

  it('create and delete pass the data through', async () => {
    const data = { taskId: TASK_ID, userId: ASSIGNEE_ID, roleId: 'role-1', assignedById: USER_ID };

    await repository.create(data);
    await repository.delete(TASK_ID, ASSIGNEE_ID);

    expect(prisma.taskAssignee.create).toHaveBeenCalledWith({ data });
    expect(prisma.taskAssignee.delete).toHaveBeenCalledWith({
      where: { taskId_userId: { taskId: TASK_ID, userId: ASSIGNEE_ID } },
    });
  });
});
