import {
  BadRequestException,
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { StatusExistsGuard } from '@/statuses/guards/status-exists.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';

describe('StatusExistsGuard', () => {
  let guard: StatusExistsGuard;
  let prisma: { status: { findFirst: jest.Mock } };
  let reflector: { getAllAndOverride: jest.Mock };

  const mockContext: ExecutionContext = buildGuardContext();

  beforeEach(() => {
    prisma = { status: { findFirst: jest.fn() } };
    reflector = { getAllAndOverride: jest.fn() };

    guard = new StatusExistsGuard(
      prisma as unknown as PrismaService,
      reflector as unknown as Reflector,
    );
  });

  it('throws UnauthorizedException when no user on request', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({}, { id: 'status-1' });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('throws BadRequestException when lookup value is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, {});

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when status is not found', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 'status-1' });
    prisma.status.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(NotFoundException);
  });

  it('returns true when status exists and belongs to the user', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 'status-1' });
    prisma.status.findFirst.mockResolvedValue({ id: 'status-1' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.status.findFirst).toHaveBeenCalledWith({
      where: { id: 'status-1', userId: 'user-1' },
      select: { id: true },
    });
  });

  it('uses custom arg name to resolve lookup value', async () => {
    reflector.getAllAndOverride.mockReturnValue({ arg: 'statusId' });
    mockGqlContext({ user: { sub: 'user-1' } }, { statusId: 'status-42' });
    prisma.status.findFirst.mockResolvedValue({ id: 'status-42' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.status.findFirst).toHaveBeenCalledWith({
      where: { id: 'status-42', userId: 'user-1' },
      select: { id: true },
    });
  });

  it('treats non-string arg values as missing', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 12345 });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });
});
