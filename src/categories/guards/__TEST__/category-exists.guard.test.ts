import {
  BadRequestException,
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CategoryExistsGuard } from '@/categories/guards/category-exists.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';

describe('CategoryExistsGuard', () => {
  let guard: CategoryExistsGuard;
  let prisma: { category: { findFirst: jest.Mock } };
  let reflector: { getAllAndOverride: jest.Mock };

  const mockContext: ExecutionContext = buildGuardContext();

  beforeEach(() => {
    prisma = { category: { findFirst: jest.fn() } };
    reflector = { getAllAndOverride: jest.fn() };

    guard = new CategoryExistsGuard(
      prisma as unknown as PrismaService,
      reflector as unknown as Reflector,
    );
  });

  it('throws UnauthorizedException when no user on request', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({}, { id: 'category-1' });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('throws BadRequestException when lookup value is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, {});

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when category is not found', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 'category-1' });
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(NotFoundException);
  });

  it('returns true when category exists and belongs to the user', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 'category-1' });
    prisma.category.findFirst.mockResolvedValue({ id: 'category-1' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: 'category-1', userId: 'user-1' },
      select: { id: true },
    });
  });

  it('uses custom arg name to resolve lookup value', async () => {
    reflector.getAllAndOverride.mockReturnValue({ arg: 'categoryId' });
    mockGqlContext({ user: { sub: 'user-1' } }, { categoryId: 'category-42' });
    prisma.category.findFirst.mockResolvedValue({ id: 'category-42' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: 'category-42', userId: 'user-1' },
      select: { id: true },
    });
  });

  it('treats non-string arg values as missing', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 12345 });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });
});
