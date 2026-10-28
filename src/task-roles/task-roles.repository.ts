import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import type { Prisma, TaskRole, Workspace } from 'generated/prisma/client';
import { SortOrder } from '@/common/enums/pagination.enum';

export type CreateTaskRoleData = Pick<
  TaskRole,
  'workspaceId' | 'name' | 'description' | 'permissions'
>;

export type UpdateTaskRoleData = Partial<Pick<TaskRole, 'name' | 'description' | 'permissions'>>;

type FindPageData = {
  workspaceId: Workspace['id'];
  page: number;
  limit: number;
  sortOrder: SortOrder;
  search: string | null;
};

/** Every task role query is scoped to a workspace: task roles never cross workspaces. */
@Injectable()
export class TaskRolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Not `db`-aware: the batch `$transaction([...])` form is not available on a transaction client.
   */
  async findPage({
    workspaceId,
    page,
    limit,
    sortOrder,
    search,
  }: FindPageData): Promise<{ taskRoles: TaskRole[]; total: number }> {
    const where: Prisma.TaskRoleWhereInput = {
      workspaceId,
      ...(search?.trim() && { name: { contains: search.trim(), mode: 'insensitive' } }),
    };

    const [taskRoles, total] = await this.prisma.$transaction([
      this.prisma.taskRole.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy: { createdAt: sortOrder },
      }),
      this.prisma.taskRole.count({ where }),
    ]);

    return { taskRoles, total };
  }

  findById(
    workspaceId: Workspace['id'],
    id: TaskRole['id'],
    db: Db = this.prisma,
  ): Promise<TaskRole | null> {
    return db.taskRole.findFirst({ where: { id, workspaceId } });
  }

  countAssignees(id: TaskRole['id'], db: Db = this.prisma): Promise<number> {
    return db.taskAssignee.count({ where: { roleId: id } });
  }

  create(
    { workspaceId, name, description, permissions }: CreateTaskRoleData,
    db: Db = this.prisma,
  ): Promise<TaskRole> {
    return db.taskRole.create({ data: { workspaceId, name, description, permissions } });
  }

  update(id: TaskRole['id'], data: UpdateTaskRoleData, db: Db = this.prisma): Promise<TaskRole> {
    return db.taskRole.update({ where: { id }, data });
  }

  delete(id: TaskRole['id'], db: Db = this.prisma): Promise<TaskRole> {
    return db.taskRole.delete({ where: { id } });
  }
}
