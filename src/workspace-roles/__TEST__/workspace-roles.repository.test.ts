import { WorkspaceRolesRepository } from '@/workspace-roles/workspace-roles.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createPrismaMock } from '@/common/testing/prisma/mocks/prisma.mock';

const WORKSPACE_ID = 'workspace-id-1';

describe('WorkspaceRolesRepository', () => {
  let repository: WorkspaceRolesRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new WorkspaceRolesRepository(prisma as unknown as PrismaService);
  });

  describe('existsInWorkspace', () => {
    it('returns true when the workspace has a role', async () => {
      prisma.workspaceRole.findFirst.mockResolvedValue({ id: 'workspace-role-id-1' });

      await expect(repository.existsInWorkspace(WORKSPACE_ID)).resolves.toBe(true);
      expect(prisma.workspaceRole.findFirst).toHaveBeenCalledWith({
        where: { workspaceId: WORKSPACE_ID },
        select: { id: true },
      });
    });

    it('returns false when the workspace has no roles', async () => {
      prisma.workspaceRole.findFirst.mockResolvedValue(null);

      await expect(repository.existsInWorkspace(WORKSPACE_ID)).resolves.toBe(false);
    });
  });

  it('createMany adds the workspace to every role and returns the count', async () => {
    const roles = [
      { name: 'Admin', description: null, permissions: [], isSystem: true },
      { name: 'Viewer', description: null, permissions: [], isSystem: true },
    ];
    prisma.workspaceRole.createMany.mockResolvedValue({ count: 2 });

    await expect(repository.createMany(WORKSPACE_ID, roles)).resolves.toBe(2);
    expect(prisma.workspaceRole.createMany).toHaveBeenCalledWith({
      data: roles.map((role) => ({ workspaceId: WORKSPACE_ID, ...role })),
    });
  });
});
