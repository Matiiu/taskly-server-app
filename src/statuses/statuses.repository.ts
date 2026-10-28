import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import type { Prisma, Status, Workspace } from 'generated/prisma/client';
import { SortOrder } from '@/common/enums/pagination.enum';

export type CreateStatusData = Pick<Status, 'workspaceId' | 'name' | 'color'>;

type FindPageData = {
  workspaceId: Workspace['id'];
  page: number;
  limit: number;
  sortOrder: SortOrder;
  search: string | null;
};

/** Every status query is scoped to a workspace: statuses never cross workspaces. */
@Injectable()
export class StatusesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsInWorkspace(workspaceId: Workspace['id'], db: Db = this.prisma): Promise<boolean> {
    const status = await db.status.findFirst({ where: { workspaceId }, select: { id: true } });
    return status !== null;
  }

  /** Returns how many statuses were created. */
  async createMany(
    workspaceId: Workspace['id'],
    statuses: Pick<Status, 'name' | 'color'>[],
    db: Db = this.prisma,
  ): Promise<number> {
    const { count } = await db.status.createMany({
      data: statuses.map(({ name, color }) => ({ workspaceId, name, color })),
    });
    return count;
  }

  /**
   * Not `db`-aware: the batch `$transaction([...])` form is not available on a transaction client.
   */
  async findPage({
    workspaceId,
    page,
    limit,
    sortOrder,
    search,
  }: FindPageData): Promise<{ statuses: Status[]; total: number }> {
    const where: Prisma.StatusWhereInput = {
      workspaceId,
      ...(search?.trim() && { name: { contains: search.trim(), mode: 'insensitive' } }),
    };

    const [statuses, total] = await this.prisma.$transaction([
      this.prisma.status.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy: { createdAt: sortOrder },
      }),
      this.prisma.status.count({ where }),
    ]);

    return { statuses, total };
  }

  findById(
    workspaceId: Workspace['id'],
    id: Status['id'],
    db: Db = this.prisma,
  ): Promise<Status | null> {
    return db.status.findFirst({ where: { id, workspaceId } });
  }

  findByName(
    workspaceId: Workspace['id'],
    name: Status['name'],
    db: Db = this.prisma,
  ): Promise<Status | null> {
    return db.status.findUnique({ where: { workspaceId_name: { workspaceId, name } } });
  }

  create({ workspaceId, name, color }: CreateStatusData, db: Db = this.prisma): Promise<Status> {
    return db.status.create({ data: { workspaceId, name, color } });
  }

  updateColor(id: Status['id'], color: Status['color'], db: Db = this.prisma): Promise<Status> {
    return db.status.update({ where: { id }, data: { color } });
  }

  delete(id: Status['id'], db: Db = this.prisma): Promise<Status> {
    return db.status.delete({ where: { id } });
  }
}
