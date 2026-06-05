import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CategoriesService } from '@/categories/categories.service';
import { PaginatedCategoriesType } from '@/categories/entities/paginated-categories.type';
import { CategoryType } from '@/categories/entities/category.type';
import { CategoryActionType } from '@/categories/entities/category-action.type';
import { UpdateCategoryColorInput } from '@/categories/dto/update-category-color.input';
import { CategoryExists } from '@/categories/decorators/category-exists.decorator';
import { CategoryExistsGuard } from '@/categories/guards/category-exists.guard';
import type { User, Category } from 'generated/prisma/client';

@Resolver()
@UseGuards(JwtAuthGuard)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Query(() => PaginatedCategoriesType, { name: 'myCategories' })
  findMyCategories(
    @CurrentUser('sub') userId: User['id'],
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('categoryName', { type: () => String, nullable: true }) categoryName?: string,
  ): Promise<PaginatedCategoriesType> {
    return this.categoriesService.findMany(userId, { limit, page, categoryName });
  }

  @Mutation(() => CategoryActionType, { name: 'updateMyCategoryColor' })
  @CategoryExists({ by: 'id', arg: 'id' })
  @UseGuards(CategoryExistsGuard)
  async updateColor(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Category['id'],
    @Args('input') input: UpdateCategoryColorInput,
  ): Promise<CategoryActionType> {
    const category = await this.categoriesService.updateColor(userId, id, input);

    return {
      message: `Category ${category.name} color updated successfully`,
      category,
    };
  }

  @Mutation(() => CategoryActionType, { name: 'removeMyCategory' })
  @CategoryExists({ by: 'id', arg: 'id' })
  @UseGuards(CategoryExistsGuard)
  async removeMyCategory(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Category['id'],
  ): Promise<CategoryActionType> {
    const category = await this.categoriesService.remove(userId, id);

    return {
      message: `Category ${category.name} removed successfully`,
      category,
    };
  }
}
