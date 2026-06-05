import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import type { Category, User } from 'generated/prisma/client';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constant';
import { paginationMeta } from '@/common/utils/pagination.util';
import { UpdateTaskCategoryInput } from '@/tasks/dto/update-task-category.input';
import { CategoryType } from '@/categories/entities/category.type';
import { PaginatedCategoriesType } from '@/categories/entities/paginated-categories.type';
import { UpdateCategoryColorInput } from '@/categories/dto/update-category-color.input';
import { COLORS } from '@/common/constants/colors.contats';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  async findMany(
    userId: User['id'],
    {
      limit = LIMIT_DEFAULT,
      page = PAGE_DEFAULT,
      categoryName,
    }: { limit?: number; page?: number; categoryName?: string } = {},
  ): Promise<PaginatedCategoriesType> {
    const where = {
      userId,
      ...(categoryName && { name: { contains: categoryName, mode: 'insensitive' as const } }),
    };

    const [categories, total]: [Category[], number] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    const categoriesResponse: CategoryType[] = categories.map(
      ({ id, name, color, createdAt, updatedAt }) => ({
        id,
        name,
        color,
        createdAt,
        updatedAt,
      }),
    );

    return {
      categories: categoriesResponse,
      meta: paginationMeta(total, page, limit),
    };
  }

  async findByIdOrNameOrCreate(
    userId: User['id'],
    input: UpdateTaskCategoryInput,
  ): Promise<Category> {
    const { id, name } = input;

    if (id) {
      const existingCategoryById = await this.prisma.category.findFirst({
        where: { id, userId },
      });

      if (existingCategoryById) {
        return existingCategoryById;
      }
    }

    const existingCategoryByName = await this.prisma.category.findFirst({
      where: { name, userId },
    });

    if (existingCategoryByName) {
      return existingCategoryByName;
    }

    return this.prisma.category.create({
      data: {
        userId,
        name,
        color: COLORS.DEFAULT_INITIAL,
      },
    });
  }

  async updateColor(
    userId: User['id'],
    id: Category['id'],
    input: Pick<UpdateCategoryColorInput, 'color'>,
  ): Promise<CategoryType> {
    const existingCategory = await this.prisma.category.findUniqueOrThrow({
      where: { id },
    });

    try {
      const color = input.color as string;
      const updatedCategory = await this.prisma.category.update({
        where: { id },
        data: { color },
      });

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'UPDATE_COLOR_CATEGORY',
        entityId: updatedCategory.id,
        entity: 'Category',
        description: `Category "${updatedCategory.name}" color updated from "${existingCategory.color ?? 'None'}" to "${updatedCategory.color ?? 'None'}"`,
        before: {
          id: existingCategory.id,
          name: existingCategory.name,
          color: existingCategory.color,
        },
        after: {
          id: updatedCategory.id,
          name: updatedCategory.name,
          color: updatedCategory.color,
        },
      });

      return this.createResponse(updatedCategory);
    } catch (e) {
      this.logger.error('Error updating category', e);
      throw new BadRequestException('Failed to update category');
    }
  }

  async remove(userId: User['id'], id: Category['id']): Promise<CategoryType> {
    try {
      const removedCategory = await this.prisma.category.delete({
        where: { id },
      });

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'DELETE_CATEGORY',
        entityId: removedCategory.id,
        entity: 'Category',
        description: `Category "${removedCategory.name}" has been deleted`,
        before: {
          id: removedCategory.id,
          name: removedCategory.name,
          color: removedCategory.color,
        },
      });

      return this.createResponse(removedCategory);
    } catch (e) {
      this.logger.error('Error removing category', e);
      throw new BadRequestException('Failed to remove category');
    }
  }

  createResponse(category: Category): CategoryType {
    const { id, name, color, createdAt, updatedAt } = category;
    return {
      id,
      name,
      color,
      createdAt,
      updatedAt,
    };
  }
}
