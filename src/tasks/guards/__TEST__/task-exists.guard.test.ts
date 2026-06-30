import {
  BadRequestException,
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TaskExistsGuard } from '@/tasks/guards/task-exists.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';

describe('TaskExistsGuard', () => {
  let guard: TaskExistsGuard;
  let prisma: { task: { findFirst: jest.Mock } };
  let reflector: { getAllAndOverride: jest.Mock };

  const mockContext: ExecutionContext = buildGuardContext();

  beforeEach(() => {
    prisma = { task: { findFirst: jest.fn() } };
    reflector = { getAllAndOverride: jest.fn() };

    guard = new TaskExistsGuard(
      prisma as unknown as PrismaService,
      reflector as unknown as Reflector,
    );
  });

  it('throws UnauthorizedException when no user on request', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({}, { id: 'task-1' });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('throws BadRequestException when lookup value is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, {});

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when task is not found', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 'task-1' });
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(NotFoundException);
  });

  it('returns true when task exists (default options: id, requireActive, ownerOnly)', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 'task-1' });
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: 'task-1', userId: 'user-1', active: true },
      select: { id: true },
    });
  });

  it('uses custom arg name to resolve lookup value', async () => {
    reflector.getAllAndOverride.mockReturnValue({ arg: 'taskId' });
    mockGqlContext({ user: { sub: 'user-1' } }, { taskId: 'task-42' });
    prisma.task.findFirst.mockResolvedValue({ id: 'task-42' });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: 'task-42', userId: 'user-1', active: true },
      select: { id: true },
    });
  });

  it('builds OR clause when ownerOnly is false', async () => {
    reflector.getAllAndOverride.mockReturnValue({ ownerOnly: false });
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 'task-1' });
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1' });

    await guard.canActivate(mockContext);

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
        OR: [{ userId: 'user-1' }, { assignees: { some: { userId: 'user-1' } } }],
        active: true,
      },
      select: { id: true },
    });
  });

  it('omits active filter when requireActive is false', async () => {
    reflector.getAllAndOverride.mockReturnValue({ requireActive: false });
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 'task-1' });
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1' });

    await guard.canActivate(mockContext);

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: 'task-1', userId: 'user-1' },
      select: { id: true },
    });
  });

  it('treats non-string arg values as missing', async () => {
    reflector.getAllAndOverride.mockReturnValue({});
    mockGqlContext({ user: { sub: 'user-1' } }, { id: 12345 });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });
});
