import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CategoriesService } from '@/categories/categories.service';
import { PaginatedCategoriesType } from '@/categories/entities/paginated-categories.type';
import { CategoryActionType } from '@/categories/entities/category-action.type';
import { UpdateCategoryColorInput } from '@/categories/dto/update-category-color.input';
import type { User, Category, Workspace } from 'generated/prisma/client';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import { Can } from '@/authorization/decorators/can.decorator';
import { PolicyGuard } from '@/authorization/guards/policy.guard';

// PolicyGuard checks the user against `workspaceId`; the service then only touches categories of that workspace.
@Resolver()
@UseGuards(JwtAuthGuard)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Query(() => PaginatedCategoriesType, { name: 'categories' })
  @Can('category.view')
  @UseGuards(PolicyGuard)
  findMany(
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('pagination', { type: () => PaginationArgsInput, nullable: true })
    pagination: PaginationArgsInput = {},
    @Args('search', { type: () => String, nullable: true }) search?: string | null,
  ): Promise<PaginatedCategoriesType> {
    return this.categoriesService.findMany(workspaceId, pagination, search ?? null);
  }

  @Mutation(() => CategoryActionType, { name: 'updateCategoryColor' })
  @Can('category.manage')
  @UseGuards(PolicyGuard)
  async updateColor(
    @CurrentUser('id') userId: User['id'],
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('id', { type: () => ID }) id: Category['id'],
    @Args('input') input: UpdateCategoryColorInput,
  ): Promise<CategoryActionType> {
    const category = await this.categoriesService.updateColor(workspaceId, userId, id, input);

    return {
      message: `Category ${category.name} color updated successfully`,
      category,
    };
  }

  @Mutation(() => CategoryActionType, { name: 'removeCategory' })
  @Can('category.manage')
  @UseGuards(PolicyGuard)
  async remove(
    @CurrentUser('id') userId: User['id'],
    @Args('workspaceId', { type: () => ID }) workspaceId: Workspace['id'],
    @Args('id', { type: () => ID }) id: Category['id'],
  ): Promise<CategoryActionType> {
    const category = await this.categoriesService.remove(workspaceId, userId, id);

    return {
      message: `Category ${category.name} removed successfully`,
      category,
    };
  }
}
