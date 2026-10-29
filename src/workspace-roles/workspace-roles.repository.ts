import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import type { Workspace, WorkspaceRole } from 'generated/prisma/client';

export type CreateWorkspaceRoleData = Pick<
  WorkspaceRole,
  'name' | 'description' | 'permissions' | 'isSystem'
>;

/** Every workspace role query is scoped to a workspace: roles never cross workspaces. */
@Injectable()
export class WorkspaceRolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsInWorkspace(workspaceId: Workspace['id'], db: Db = this.prisma): Promise<boolean> {
    const role = await db.workspaceRole.findFirst({ where: { workspaceId }, select: { id: true } });
    return role !== null;
  }

  /** Returns how many workspace roles were created. */
  async createMany(
    workspaceId: Workspace['id'],
    roles: CreateWorkspaceRoleData[],
    db: Db = this.prisma,
  ): Promise<number> {
    const { count } = await db.workspaceRole.createMany({
      data: roles.map((role) => ({ workspaceId, ...role })),
    });
    return count;
  }
}
