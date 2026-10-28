import { AuthorizationRepository } from '@/authorization/authorization.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { DEFAULT_TASK_SELECT } from '@/tasks/tasks.repository';

describe('AuthorizationRepository', () => {
  let repository: AuthorizationRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new AuthorizationRepository(prisma as unknown as PrismaService);
  });

  describe('hasWorkspacePermissions', () => {
    const base = { workspaceId: 'ws-1', userId: 'user-1' };

    it('matches the owner or a member whose role has any of the permissions', async () => {
      prisma.workspace.findFirst.mockResolvedValue({ id: 'ws-1' });

      const result = await repository.hasWorkspacePermissions({
        ...base,
        permissions: ['TASK_CREATE'],
        allowWorkspaceOwner: true,
        allowAnyMember: false,
      });

      expect(result).toBe(true);
      expect(prisma.workspace.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'ws-1',
          active: true,
          OR: [
            { ownerId: 'user-1' },
            {
              members: {
                some: { userId: 'user-1', role: { permissions: { hasSome: ['TASK_CREATE'] } } },
              },
            },
          ],
        },
        select: { id: true },
      });
    });

    it('leaves out the owner condition when the owner is not allowed', async () => {
      prisma.workspace.findFirst.mockResolvedValue(null);

      const result = await repository.hasWorkspacePermissions({
        ...base,
        permissions: ['TASK_CREATE'],
        allowWorkspaceOwner: false,
        allowAnyMember: false,
      });

      expect(result).toBe(false);
      expect(prisma.workspace.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              {
                members: {
                  some: { userId: 'user-1', role: { permissions: { hasSome: ['TASK_CREATE'] } } },
                },
              },
            ],
          }) as unknown,
        }),
      );
    });

    it('returns false without querying when nothing could grant access', async () => {
      const result = await repository.hasWorkspacePermissions({
        ...base,
        permissions: [],
        allowWorkspaceOwner: false,
        allowAnyMember: false,
      });

      expect(result).toBe(false);
      expect(prisma.workspace.findFirst).not.toHaveBeenCalled();
    });
    it('lets any member through, skipping the role check, when allowAnyMember is set', async () => {
      prisma.workspace.findFirst.mockResolvedValue({ id: 'ws-1' });

      const result = await repository.hasWorkspacePermissions({
        ...base,
        permissions: ['STATUS_MANAGE'],
        allowWorkspaceOwner: true,
        allowAnyMember: true,
      });

      expect(result).toBe(true);
      expect(prisma.workspace.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'ws-1',
          active: true,
          OR: [{ ownerId: 'user-1' }, { members: { some: { userId: 'user-1' } } }],
        },
        select: { id: true },
      });
    });
  });

  describe('findAuthorizedTask', () => {
    const base = { taskId: 'task-1', userId: 'user-1' };

    it('loads the task for the creator, the workspace owner, or an assignee whose role has any of the permissions', async () => {
      const task = { id: 'task-1', title: 'Write tests' };
      prisma.task.findFirst.mockResolvedValue(task);

      const result = await repository.findAuthorizedTask({
        ...base,
        workspacePermissions: [],
        taskPermissions: ['TASK_UPDATE'],
        allowTaskCreator: true,
        allowWorkspaceOwner: true,
        allowAnyAssignee: false,
      });

      expect(result).toBe(task);
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'task-1',
          active: true,
          workspace: { active: true },
          OR: [
            { createdById: 'user-1' },
            { workspace: { ownerId: 'user-1' } },
            {
              assignees: {
                some: { userId: 'user-1', role: { permissions: { hasSome: ['TASK_UPDATE'] } } },
              },
            },
          ],
        },
        select: DEFAULT_TASK_SELECT,
      });
    });

    it('returns null when no matching task is found', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      const result = await repository.findAuthorizedTask({
        ...base,
        workspacePermissions: [],
        taskPermissions: [],
        allowTaskCreator: true,
        allowWorkspaceOwner: false,
        allowAnyAssignee: false,
      });

      expect(result).toBeNull();
    });

    it('returns null without querying when nothing could grant access', async () => {
      const result = await repository.findAuthorizedTask({
        ...base,
        workspacePermissions: [],
        taskPermissions: [],
        allowTaskCreator: false,
        allowWorkspaceOwner: false,
        allowAnyAssignee: false,
      });

      expect(result).toBeNull();
      expect(prisma.task.findFirst).not.toHaveBeenCalled();
    });

    it('lets any assignee through, skipping the role check, when allowAnyAssignee is set', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: 'task-1' });

      await repository.findAuthorizedTask({
        ...base,
        workspacePermissions: [],
        taskPermissions: ['TASK_UPDATE'],
        allowTaskCreator: true,
        allowWorkspaceOwner: false,
        allowAnyAssignee: true,
      });

      expect(prisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ createdById: 'user-1' }, { assignees: { some: { userId: 'user-1' } } }],
          }) as unknown,
        }),
      );
    });

    it('lets workspace members through when their workspace role has any of the workspace permissions', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: 'task-1' });

      await repository.findAuthorizedTask({
        ...base,
        taskPermissions: ['TASK_CHANGE_STATUS', 'TASK_UPDATE'],
        workspacePermissions: ['TASK_UPDATE'],
        allowTaskCreator: false,
        allowWorkspaceOwner: false,
        allowAnyAssignee: false,
      });

      expect(prisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              {
                assignees: {
                  some: {
                    userId: 'user-1',
                    role: { permissions: { hasSome: ['TASK_CHANGE_STATUS', 'TASK_UPDATE'] } },
                  },
                },
              },
              {
                workspace: {
                  members: {
                    some: { userId: 'user-1', role: { permissions: { hasSome: ['TASK_UPDATE'] } } },
                  },
                },
              },
            ],
          }) as unknown,
        }),
      );
    });
  });
});
