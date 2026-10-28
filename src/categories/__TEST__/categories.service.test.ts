import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import { CategoriesService } from '@/categories/categories.service';
import { CategoriesRepository } from '@/categories/categories.repository';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { buildCategory } from '@/common/testing/factories/domain.factory';
import { COLORS } from '@/common/constants/colors.contats';

const WORKSPACE_ID = 'workspace-id-1';
const USER_ID = 'user-id-1';

const createCategoriesRepositoryMock = () => ({
  findPage: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  updateColor: jest.fn(),
  delete: jest.fn(),
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoriesRepo: ReturnType<typeof createCategoriesRepositoryMock>;
  let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

  beforeEach(async () => {
    categoriesRepo = createCategoriesRepositoryMock();
    appEventEmitter = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: categoriesRepo },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  describe('findMany', () => {
    it('uses the default pagination and returns categories with meta', async () => {
      const category = buildCategory();
      categoriesRepo.findPage.mockResolvedValue({ categories: [category], total: 1 });

      const result = await service.findMany(WORKSPACE_ID);

      expect(categoriesRepo.findPage).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        page: 1,
        limit: 10,
        sortOrder: 'desc',
        search: null,
      });
      expect(result).toEqual({
        categories: [service.toCategoryType(category)],
        meta: createPaginationMetaMock(),
      });
    });

    it('passes pagination and search through', async () => {
      categoriesRepo.findPage.mockResolvedValue({ categories: [], total: 0 });

      await service.findMany(WORKSPACE_ID, { page: 2, limit: 5, sortOrder: 'asc' }, 'work');

      expect(categoriesRepo.findPage).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        page: 2,
        limit: 5,
        sortOrder: 'asc',
        search: 'work',
      });
    });
  });

  describe('create', () => {
    it('creates the category with the default color when neither id nor name exist', async () => {
      const created = buildCategory({ name: 'Personal' });
      categoriesRepo.findById.mockResolvedValue(null);
      categoriesRepo.findByName.mockResolvedValue(null);
      categoriesRepo.create.mockResolvedValue(created);

      const result = await service.create(WORKSPACE_ID, { id: 'missing', name: 'Personal' });

      expect(result).toBe(created);
      expect(categoriesRepo.findById).toHaveBeenCalledWith(WORKSPACE_ID, 'missing');
      expect(categoriesRepo.findByName).toHaveBeenCalledWith(WORKSPACE_ID, 'Personal');
      expect(categoriesRepo.create).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        name: 'Personal',
        color: COLORS.DEFAULT_INITIAL,
      });
    });

    it('skips the id lookup when no id is given', async () => {
      categoriesRepo.findByName.mockResolvedValue(null);
      categoriesRepo.create.mockResolvedValue(buildCategory({ name: 'Personal' }));

      await service.create(WORKSPACE_ID, { name: 'Personal' });

      expect(categoriesRepo.findById).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a category with that id already exists', async () => {
      categoriesRepo.findById.mockResolvedValue(buildCategory({ name: 'Work' }));

      await expect(
        service.create(WORKSPACE_ID, { id: 'category-id-1', name: 'Other' }),
      ).rejects.toThrow(new ConflictException('Category Work already exists'));
      expect(categoriesRepo.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a category with that name already exists', async () => {
      categoriesRepo.findByName.mockResolvedValue(buildCategory({ name: 'Work' }));

      await expect(service.create(WORKSPACE_ID, { name: 'Work' })).rejects.toThrow(
        new ConflictException('Category Work already exists'),
      );
      expect(categoriesRepo.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent request created the same name', async () => {
      categoriesRepo.findByName.mockResolvedValue(null);
      categoriesRepo.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.create(WORKSPACE_ID, { name: 'Personal' })).rejects.toThrow(
        new ConflictException('Category Personal already exists'),
      );
    });

    it('rethrows other errors from the insert', async () => {
      const boom = new Error('db down');
      categoriesRepo.findByName.mockResolvedValue(null);
      categoriesRepo.create.mockRejectedValue(boom);

      await expect(service.create(WORKSPACE_ID, { name: 'Personal' })).rejects.toBe(boom);
    });
  });

  describe('updateColor', () => {
    it('updates the color and logs the user who made the change', async () => {
      const existing = buildCategory({ color: '#000000' });
      const updated = buildCategory({ color: '#ffffff' });
      categoriesRepo.findById.mockResolvedValue(existing);
      categoriesRepo.updateColor.mockResolvedValue(updated);

      const result = await service.updateColor(WORKSPACE_ID, USER_ID, existing.id, {
        color: '#ffffff',
      });

      expect(result).toEqual(service.toCategoryType(updated));
      expect(categoriesRepo.findById).toHaveBeenCalledWith(WORKSPACE_ID, existing.id);
      expect(categoriesRepo.updateColor).toHaveBeenCalledWith(existing.id, '#ffffff');
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, action: 'UPDATE_COLOR_CATEGORY' }),
      );
    });

    it('throws NotFoundException without updating when the category is not in the workspace', async () => {
      categoriesRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateColor(WORKSPACE_ID, USER_ID, 'missing', { color: '#ffffff' }),
      ).rejects.toThrow(NotFoundException);
      expect(categoriesRepo.updateColor).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the update fails', async () => {
      categoriesRepo.findById.mockResolvedValue(buildCategory());
      categoriesRepo.updateColor.mockRejectedValue(new Error('db down'));

      await expect(
        service.updateColor(WORKSPACE_ID, USER_ID, 'category-id-1', { color: '#ffffff' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes the category and logs the user who made the change', async () => {
      const category = buildCategory();
      categoriesRepo.findById.mockResolvedValue(category);
      categoriesRepo.delete.mockResolvedValue(category);

      const result = await service.remove(WORKSPACE_ID, USER_ID, category.id);

      expect(result).toEqual(service.toCategoryType(category));
      expect(categoriesRepo.delete).toHaveBeenCalledWith(category.id);
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, action: 'DELETE_CATEGORY' }),
      );
    });

    it('throws NotFoundException without deleting when the category is not in the workspace', async () => {
      categoriesRepo.findById.mockResolvedValue(null);

      await expect(service.remove(WORKSPACE_ID, USER_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(categoriesRepo.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the delete fails', async () => {
      categoriesRepo.findById.mockResolvedValue(buildCategory());
      categoriesRepo.delete.mockRejectedValue(new Error('db down'));

      await expect(service.remove(WORKSPACE_ID, USER_ID, 'category-id-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('toCategoryType exposes only the public fields', () => {
    const { id, name, color, createdAt, updatedAt } = buildCategory();

    expect(service.toCategoryType(buildCategory())).toEqual({
      id,
      name,
      color,
      createdAt,
      updatedAt,
    });
  });
});
