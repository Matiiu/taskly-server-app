import {
  BadRequestException,
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserExistsGuard } from '@/users/guards/user-exists.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';

describe('UserExistsGuard', () => {
  let guard: UserExistsGuard;
  let prisma: { user: { findFirst: jest.Mock } };
  let reflector: { getAllAndOverride: jest.Mock };

  const mockContext: ExecutionContext = buildGuardContext();

  beforeEach(() => {
    prisma = { user: { findFirst: jest.fn() } };
    reflector = { getAllAndOverride: jest.fn() };

    guard = new UserExistsGuard(
      prisma as unknown as PrismaService,
      reflector as unknown as Reflector,
    );
  });

  it('throws UnauthorizedException when no user sub on request (default by=authSub)', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({}, {});

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('throws NotFoundException when user is not found', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, {});
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(NotFoundException);
  });

  it('returns true when user exists with default options (by=authSub, requireActive=true)', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, {});
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', active: true },
      select: { id: true },
    });
  });

  it('throws BadRequestException when lookup value is missing for by=id', async () => {
    reflector.getAllAndOverride.mockReturnValue({ by: 'id' });
    mockGqlContext({}, {});

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });

  it('returns true and builds where by id when by=id', async () => {
    reflector.getAllAndOverride.mockReturnValue({ by: 'id' });
    mockGqlContext({}, { id: 'user-42' });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-42' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-42', active: true },
      select: { id: true },
    });
  });

  it('returns true and builds where by code when by=code', async () => {
    reflector.getAllAndOverride.mockReturnValue({ by: 'code' });
    mockGqlContext({}, { code: 'USR-001' });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { code: 'USR-001', active: true },
      select: { id: true },
    });
  });

  it('returns true and builds where by documentNumber when by=documentNumber', async () => {
    reflector.getAllAndOverride.mockReturnValue({ by: 'documentNumber' });
    mockGqlContext({}, { documentNumber: '12345678' });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { documentNumber: '12345678', active: true },
      select: { id: true },
    });
  });

  it('uses custom arg name to resolve lookup value', async () => {
    reflector.getAllAndOverride.mockReturnValue({ by: 'id', arg: 'userId' });
    mockGqlContext({}, { userId: 'user-99' });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-99' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-99', active: true },
      select: { id: true },
    });
  });

  it('omits active filter when requireActive is false', async () => {
    reflector.getAllAndOverride.mockReturnValue({ requireActive: false });
    mockGqlContext({ user: { sub: 'user-1' } }, {});
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

    await guard.canActivate(mockContext);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true },
    });
  });

  it('treats non-string arg values as missing', async () => {
    reflector.getAllAndOverride.mockReturnValue({ by: 'id' });
    mockGqlContext({}, { id: 12345 });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });
});
