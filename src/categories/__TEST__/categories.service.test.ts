import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { CategoriesService } from '@/categories/categories.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { buildCategory } from '@/common/testing/factories/domain.factory';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';

let prisma: ReturnType<typeof createPrismaMock>;
let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

describe('CategoriesService', () => {
  let service: CategoriesService;
  let meta: ReturnType<typeof createPaginationMetaMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    prisma = createPrismaMock();
    appEventEmitter = createAppEventEmitterMock();
    meta = createPaginationMetaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('findMany', () => {
    it('returns paginated categories with default pagination', async () => {
      const category = buildCategory();
      prisma.category.findMany.mockResolvedValue([category]);
      prisma.category.count.mockResolvedValue(meta.total);

      const result = await service.findMany('user-1');

      expect(result).toEqual({ categories: [service.toCategoryType(category)], meta });
    });

    it('applies query filter when provided', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      prisma.category.count.mockResolvedValue(0);

      await service.findMany('user-1', { query: 'Work' });

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Work', mode: 'insensitive' },
          }) as unknown,
        }),
      );
    });

    it('omits name filter when no query is provided', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      prisma.category.count.mockResolvedValue(0);

      await service.findMany('user-1');

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('findByIdOrNameOrCreate', () => {
    it('returns existing category when found by id', async () => {
      const category = buildCategory();
      prisma.category.findFirst.mockResolvedValueOnce(category);

      const result = await service.findByIdOrNameOrCreate('user-1', { id: category.id, name: category.name });

      expect(result).toEqual(category);
      expect(prisma.category.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('falls back to name lookup when id lookup returns null', async () => {
      const category = buildCategory();
      prisma.category.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(category);

      const result = await service.findByIdOrNameOrCreate('user-1', { id: 'wrong-id', name: category.name });

      expect(result).toEqual(category);
      expect(prisma.category.findFirst).toHaveBeenCalledTimes(2);
    });

    it('creates a new category when neither id nor name match', async () => {
      const created = buildCategory({ name: 'New Category' });
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(created);

      const result = await service.findByIdOrNameOrCreate('user-1', { name: 'New Category' });

      expect(result).toEqual(created);
      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'New Category', userId: 'user-1' }) as unknown,
        }),
      );
    });

    it('skips id lookup and goes directly to name lookup when no id is provided', async () => {
      const category = buildCategory();
      prisma.category.findFirst.mockResolvedValueOnce(category);

      await service.findByIdOrNameOrCreate('user-1', { name: category.name });

      expect(prisma.category.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { name: category.name, userId: 'user-1' },
      });
    });
  });

  describe('updateColor', () => {
    it('updates the color, emits an audit log, and returns the mapped response', async () => {
      const existing = buildCategory();
      const updated = buildCategory({ color: '#ff0000' });
      prisma.category.findUniqueOrThrow.mockResolvedValue(existing);
      prisma.category.update.mockResolvedValue(updated);

      const result = await service.updateColor('user-1', existing.id, { color: '#ff0000' });

      expect(result).toEqual(service.toCategoryType(updated));
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: { color: '#ff0000' },
      });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_COLOR_CATEGORY', entity: 'Category', entityId: updated.id }),
      );
    });

    it('throws BadRequestException when the update fails', async () => {
      prisma.category.findUniqueOrThrow.mockResolvedValue(buildCategory());
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.category.update.mockRejectedValue(new Error('DB error'));

      await expect(service.updateColor('user-1', 'id', { color: '#fff' })).rejects.toThrow(BadRequestException);
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the category, emits an audit log, and returns the mapped response', async () => {
      const category = buildCategory();
      prisma.category.delete.mockResolvedValue(category);

      const result = await service.remove('user-1', category.id);

      expect(result).toEqual(service.toCategoryType(category));
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: category.id } });
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE_CATEGORY', entity: 'Category', entityId: category.id }),
      );
    });

    it('throws BadRequestException when delete fails', async () => {
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.category.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.remove('user-1', 'id')).rejects.toThrow(BadRequestException);
      expect(appEventEmitter.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('toCategoryType', () => {
    it('maps a Category entity to the response type', () => {
      const category = buildCategory();
      const { id, name, color, createdAt, updatedAt } = category;

      expect(service.toCategoryType(category)).toEqual({ id, name, color, createdAt, updatedAt });
    });
  });
});
