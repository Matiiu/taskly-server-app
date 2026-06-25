import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CategoriesResolver } from '@/categories/categories.resolver';
import { CategoriesService } from '@/categories/categories.service';
import { CategoryExistsGuard } from '@/categories/guards/category-exists.guard';
import { buildCategory } from '@/common/testing/factories/domain.factory';
import { createCategoriesServiceMock } from '@/common/testing/mocks/categories-service.mock';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';

describe('CategoriesResolver', () => {
  let resolver: CategoriesResolver;
  let categoriesServiceMock: ReturnType<typeof createCategoriesServiceMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    categoriesServiceMock = createCategoriesServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesResolver,
        { provide: CategoriesService, useValue: categoriesServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CategoryExistsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<CategoriesResolver>(CategoriesResolver);
  });

  describe('findMyCategories', () => {
    it('delegates to service and returns paginated categories', async () => {
      const category = buildCategory();
      const pagination = { page: 2, limit: 5, query: 'wo' };
      const expected = {
        categories: [category],
        meta: createPaginationMetaMock({ page: 2, limit: 5 }),
      };

      categoriesServiceMock.findMany.mockResolvedValue(expected);

      const result = await resolver.findMyCategories('user-id-1', pagination);

      expect(result).toEqual(expected);
      expect(categoriesServiceMock.findMany).toHaveBeenCalledWith('user-id-1', pagination);
    });
  });

  describe('updateColor', () => {
    it('updates color and returns action message', async () => {
      const category = buildCategory({ name: 'Personal', color: '#10b981' });
      const input = { color: '#10b981' };
      categoriesServiceMock.updateColor.mockResolvedValue(category);

      const result = await resolver.updateColor('user-id-1', category.id, input);

      expect(categoriesServiceMock.updateColor).toHaveBeenCalledWith(
        'user-id-1',
        category.id,
        input,
      );
      expect(result).toEqual({
        message: `Category ${category.name} color updated successfully`,
        category,
      });
    });

    it('propagates service errors', async () => {
      const boom = new InternalServerErrorException('failed update');
      categoriesServiceMock.updateColor.mockRejectedValue(boom);

      await expect(
        resolver.updateColor('user-id-1', 'category-id-1', { color: '#000000' }),
      ).rejects.toBe(boom);
    });
  });

  describe('removeMyCategory', () => {
    it('removes category and returns action message', async () => {
      const category = buildCategory({ name: 'Errands' });
      categoriesServiceMock.remove.mockResolvedValue(category);

      const result = await resolver.removeMyCategory('user-id-1', category.id);

      expect(categoriesServiceMock.remove).toHaveBeenCalledWith('user-id-1', category.id);
      expect(result).toEqual({
        message: `Category ${category.name} removed successfully`,
        category,
      });
    });
  });
});
