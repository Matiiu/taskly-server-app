import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PolicyGuard } from '@/authorization/guards/policy.guard';
import { CategoriesResolver } from '@/categories/categories.resolver';
import { CategoriesService } from '@/categories/categories.service';
import { buildCategory } from '@/common/testing/factories/domain.factory';
import { createCategoriesServiceMock } from '@/common/testing/mocks/categories-service.mock';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';

const WORKSPACE_ID = 'workspace-id-1';
const USER_ID = 'user-id-1';

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
      .overrideGuard(PolicyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<CategoriesResolver>(CategoriesResolver);
  });

  describe('findMany', () => {
    it('delegates to service with the workspace, pagination and search', async () => {
      const pagination = { page: 2, limit: 5 };
      const expected = {
        categories: [buildCategory()],
        meta: createPaginationMetaMock({ page: 2, limit: 5 }),
      };
      categoriesServiceMock.findMany.mockResolvedValue(expected);

      const result = await resolver.findMany(WORKSPACE_ID, pagination, 'wo');

      expect(result).toEqual(expected);
      expect(categoriesServiceMock.findMany).toHaveBeenCalledWith(WORKSPACE_ID, pagination, 'wo');
    });

    it('uses empty pagination and a null search by default', async () => {
      categoriesServiceMock.findMany.mockResolvedValue({
        categories: [],
        meta: createPaginationMetaMock(),
      });

      await resolver.findMany(WORKSPACE_ID);

      expect(categoriesServiceMock.findMany).toHaveBeenCalledWith(WORKSPACE_ID, {}, null);
    });
  });

  describe('updateColor', () => {
    it('returns formatted action message', async () => {
      const category = buildCategory({ name: 'Work', color: '#22c55e' });
      categoriesServiceMock.updateColor.mockResolvedValue(category);

      const result = await resolver.updateColor(USER_ID, WORKSPACE_ID, category.id, {
        color: '#22c55e',
      });

      expect(result).toEqual({
        message: `Category ${category.name} color updated successfully`,
        category,
      });
      expect(categoriesServiceMock.updateColor).toHaveBeenCalledWith(
        WORKSPACE_ID,
        USER_ID,
        category.id,
        { color: '#22c55e' },
      );
    });

    it('propagates service errors', async () => {
      const boom = new InternalServerErrorException('category update failed');
      categoriesServiceMock.updateColor.mockRejectedValue(boom);

      await expect(
        resolver.updateColor(USER_ID, WORKSPACE_ID, 'category-id-1', { color: '#ef4444' }),
      ).rejects.toBe(boom);
    });
  });

  describe('remove', () => {
    it('returns formatted action message', async () => {
      const category = buildCategory({ name: 'Archived' });
      categoriesServiceMock.remove.mockResolvedValue(category);

      const result = await resolver.remove(USER_ID, WORKSPACE_ID, category.id);

      expect(result).toEqual({
        message: `Category ${category.name} removed successfully`,
        category,
      });
      expect(categoriesServiceMock.remove).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID, category.id);
    });
  });
});
