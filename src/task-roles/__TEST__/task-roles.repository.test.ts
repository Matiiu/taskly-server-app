import { TaskRolesRepository } from '@/task-roles/task-roles.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createPrismaMock } from '@/common/testing/prisma/mocks/prisma.mock';
import { buildTaskRole } from '@/common/testing/task-roles/factories/task-roles.factory';

const WORKSPACE_ID = 'workspace-id-1';
const TASK_ROLE_ID = 'task-role-id-1';

describe('TaskRolesRepository', () => {
  let repository: TaskRolesRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new TaskRolesRepository(prisma as unknown as PrismaService);
  });

  describe('findPage', () => {
    const base = { workspaceId: WORKSPACE_ID, page: 2, limit: 5, sortOrder: 'asc' as const };

    it('pages the task roles of the workspace and counts with the same filter', async () => {
      const taskRole = buildTaskRole();
      prisma.taskRole.findMany.mockResolvedValue([taskRole]);
      prisma.taskRole.count.mockResolvedValue(1);

      const result = await repository.findPage({ ...base, search: null });

      expect(result).toEqual({ taskRoles: [taskRole], total: 1 });
      expect(prisma.taskRole.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        where: { workspaceId: WORKSPACE_ID },
        orderBy: { createdAt: 'asc' },
      });
      expect(prisma.taskRole.count).toHaveBeenCalledWith({ where: { workspaceId: WORKSPACE_ID } });
    });

    it('filters by name when there is a search term', async () => {
      prisma.taskRole.findMany.mockResolvedValue([]);
      prisma.taskRole.count.mockResolvedValue(0);

      await repository.findPage({ ...base, search: '  review ' });

      expect(prisma.taskRole.count).toHaveBeenCalledWith({
        where: { workspaceId: WORKSPACE_ID, name: { contains: 'review', mode: 'insensitive' } },
      });
    });
  });

  describe('existsInWorkspace', () => {
    it('returns true when the workspace has a task role', async () => {
      prisma.taskRole.findFirst.mockResolvedValue({ id: TASK_ROLE_ID });

      await expect(repository.existsInWorkspace(WORKSPACE_ID)).resolves.toBe(true);
      expect(prisma.taskRole.findFirst).toHaveBeenCalledWith({
        where: { workspaceId: WORKSPACE_ID },
        select: { id: true },
      });
    });

    it('returns false when the workspace has no task roles', async () => {
      prisma.taskRole.findFirst.mockResolvedValue(null);

      await expect(repository.existsInWorkspace(WORKSPACE_ID)).resolves.toBe(false);
    });
  });

  it('createMany adds the workspace to every role and returns the count', async () => {
    const roles = [
      { name: 'Manager', description: null, permissions: [], isSystem: true },
      { name: 'Editor', description: null, permissions: [], isSystem: true },
    ];
    prisma.taskRole.createMany.mockResolvedValue({ count: 2 });

    const count = await repository.createMany(WORKSPACE_ID, roles);

    expect(count).toBe(2);
    expect(prisma.taskRole.createMany).toHaveBeenCalledWith({
      data: roles.map((role) => ({ workspaceId: WORKSPACE_ID, ...role })),
    });
  });

  it('findById only matches task roles of the workspace', async () => {
    await repository.findById(WORKSPACE_ID, TASK_ROLE_ID);

    expect(prisma.taskRole.findFirst).toHaveBeenCalledWith({
      where: { id: TASK_ROLE_ID, workspaceId: WORKSPACE_ID },
    });
  });

  it('countAssignees counts the task assignees with the role', async () => {
    prisma.taskAssignee.count.mockResolvedValue(3);

    await expect(repository.countAssignees(TASK_ROLE_ID)).resolves.toBe(3);
    expect(prisma.taskAssignee.count).toHaveBeenCalledWith({ where: { roleId: TASK_ROLE_ID } });
  });

  it('create, update and delete pass the data through', async () => {
    const data = {
      workspaceId: WORKSPACE_ID,
      name: 'Reviewer',
      description: null,
      permissions: [],
    };

    await repository.create(data);
    await repository.update(TASK_ROLE_ID, { name: 'Lead' });
    await repository.delete(TASK_ROLE_ID);

    expect(prisma.taskRole.create).toHaveBeenCalledWith({ data });
    expect(prisma.taskRole.update).toHaveBeenCalledWith({
      where: { id: TASK_ROLE_ID },
      data: { name: 'Lead' },
    });
    expect(prisma.taskRole.delete).toHaveBeenCalledWith({ where: { id: TASK_ROLE_ID } });
  });
});
