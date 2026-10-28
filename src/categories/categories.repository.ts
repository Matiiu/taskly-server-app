import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import type { Category, Prisma, Workspace } from 'generated/prisma/client';
import { SortOrder } from '@/common/enums/pagination.enum';

export type CreateCategoryData = Pick<Category, 'workspaceId' | 'name' | 'color'>;

type FindPageData = {
  workspaceId: Workspace['id'];
  page: number;
  limit: number;
  sortOrder: SortOrder;
  search: string | null;
};

/** Every category query is scoped to a workspace: categories never cross workspaces. */
@Injectable()
export class CategoriesRepository {
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
  }: FindPageData): Promise<{ categories: Category[]; total: number }> {
    const where: Prisma.CategoryWhereInput = {
      workspaceId,
      ...(search?.trim() && { name: { contains: search.trim(), mode: 'insensitive' } }),
    };

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy: { createdAt: sortOrder },
      }),
      this.prisma.category.count({ where }),
    ]);

    return { categories, total };
  }

  findById(
    workspaceId: Workspace['id'],
    id: Category['id'],
    db: Db = this.prisma,
  ): Promise<Category | null> {
    return db.category.findFirst({ where: { id, workspaceId } });
  }

  findByName(
    workspaceId: Workspace['id'],
    name: Category['name'],
    db: Db = this.prisma,
  ): Promise<Category | null> {
    return db.category.findUnique({ where: { workspaceId_name: { workspaceId, name } } });
  }

  create(
    { workspaceId, name, color }: CreateCategoryData,
    db: Db = this.prisma,
  ): Promise<Category> {
    return db.category.create({ data: { workspaceId, name, color } });
  }

  updateColor(
    id: Category['id'],
    color: Category['color'],
    db: Db = this.prisma,
  ): Promise<Category> {
    return db.category.update({ where: { id }, data: { color } });
  }

  delete(id: Category['id'], db: Db = this.prisma): Promise<Category> {
    return db.category.delete({ where: { id } });
  }
}
