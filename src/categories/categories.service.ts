import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import type { Category, User, Workspace } from 'generated/prisma/client';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constants';
import { paginationMeta } from '@/common/utils/pagination.util';
import { UpdateTaskCategoryInput } from '@/tasks/dto/update-task-category.input';
import { CategoryType } from '@/categories/entities/category.type';
import { PaginatedCategoriesType } from '@/categories/entities/paginated-categories.type';
import { UpdateCategoryColorInput } from '@/categories/dto/update-category-color.input';
import { COLORS } from '@/common/constants/colors.contats';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { CategoriesRepository } from '@/categories/categories.repository';
import { isUniqueViolation } from '@/prisma/prisma.errors';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly categoriesRepo: CategoriesRepository,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  async findMany(
    workspaceId: Workspace['id'],
    { limit = LIMIT_DEFAULT, page = PAGE_DEFAULT, sortOrder = 'desc' }: PaginationArgsInput = {},
    search: string | null = null,
  ): Promise<PaginatedCategoriesType> {
    const { categories, total } = await this.categoriesRepo.findPage({
      workspaceId,
      page,
      limit,
      sortOrder,
      search,
    });

    return {
      categories: categories.map((category) => this.toCategoryType(category)),
      meta: paginationMeta(total, page, limit),
    };
  }

  /**
   * Creates a category in the workspace.
   * Throws ConflictException when one already exists with the given id or name.
   */
  async create(workspaceId: Workspace['id'], input: UpdateTaskCategoryInput): Promise<Category> {
    const { id, name } = input;

    const existingCategory =
      (id ? await this.categoriesRepo.findById(workspaceId, id) : null) ??
      (await this.categoriesRepo.findByName(workspaceId, name));

    if (existingCategory) {
      throw new ConflictException(`Category ${existingCategory.name} already exists`);
    }

    try {
      return await this.categoriesRepo.create({ workspaceId, name, color: COLORS.DEFAULT_INITIAL });
    } catch (e) {
      // Another request created the same name between the check and the insert
      if (isUniqueViolation(e)) throw new ConflictException(`Category ${name} already exists`);
      throw e;
    }
  }

  async updateColor(
    workspaceId: Workspace['id'],
    userId: User['id'],
    id: Category['id'],
    input: UpdateCategoryColorInput,
  ): Promise<CategoryType> {
    const existingCategory = await this.findInWorkspaceOrThrow(workspaceId, id);

    try {
      const updatedCategory = await this.categoriesRepo.updateColor(id, input.color);

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

      return this.toCategoryType(updatedCategory);
    } catch (e) {
      this.logger.error('Error updating category', e);
      throw new BadRequestException('Failed to update category');
    }
  }

  async remove(
    workspaceId: Workspace['id'],
    userId: User['id'],
    id: Category['id'],
  ): Promise<CategoryType> {
    await this.findInWorkspaceOrThrow(workspaceId, id);

    try {
      const removedCategory = await this.categoriesRepo.delete(id);

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

      return this.toCategoryType(removedCategory);
    } catch (e) {
      this.logger.error('Error removing category', e);
      throw new BadRequestException('Failed to remove category');
    }
  }

  toCategoryType(category: Category): CategoryType {
    const { id, name, color, createdAt, updatedAt } = category;
    return {
      id,
      name,
      color,
      createdAt,
      updatedAt,
    };
  }

  /** 404 when the category does not exist or belongs to another workspace. */
  private async findInWorkspaceOrThrow(
    workspaceId: Workspace['id'],
    id: Category['id'],
  ): Promise<Category> {
    const category = await this.categoriesRepo.findById(workspaceId, id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
