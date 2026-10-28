import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { UserRole } from 'generated/prisma/client';
import { TargetUserGuard } from '@/users/guards/target-user.guard';
import { UsersService } from '@/users/users.service';
import { AuthenticatedUserNotFoundException } from '@/common/exceptions/authenticated-user-not-found.exception';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';
import { buildSafeUser } from '@/common/testing/factories/users.factory';
import { createUsersServiceMock } from '@/common/testing/mocks/users-service.mock';

describe('TargetUserGuard', () => {
  const context = buildGuardContext();
  const me = buildSafeUser({ id: 'me', role: UserRole.USER });
  const admin = buildSafeUser({ id: 'admin', role: UserRole.ADMIN });
  const other = buildSafeUser({ id: 'other' });

  let guard: TargetUserGuard;
  let usersService: ReturnType<typeof createUsersServiceMock>;

  beforeEach(() => {
    jest.restoreAllMocks();
    usersService = createUsersServiceMock();
    guard = new TargetUserGuard(usersService as unknown as UsersService);
  });

  it.each([{}, { id: null }, { id: 'me' }])(
    'targets the current user when no other id is given (%o)',
    async (args) => {
      const request: Record<string, unknown> = { user: me };
      mockGqlContext(request, args);

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.targetUser).toBe(me);
      expect(usersService.findByIdOrThrow).not.toHaveBeenCalled();
    },
  );

  it('forbids a regular user from targeting someone else', async () => {
    const request: Record<string, unknown> = { user: me };
    mockGqlContext(request, { id: 'other' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(usersService.findByIdOrThrow).not.toHaveBeenCalled();
    expect(request).not.toHaveProperty('targetUser');
  });

  it('lets an admin target another user by id', async () => {
    const request: Record<string, unknown> = { user: admin };
    usersService.findByIdOrThrow.mockResolvedValue(other);
    mockGqlContext(request, { id: 'other' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(usersService.findByIdOrThrow).toHaveBeenCalledWith('other');
    expect(request.targetUser).toBe(other);
  });

  it('propagates NotFoundException when the admin targets an unknown user', async () => {
    usersService.findByIdOrThrow.mockRejectedValue(new NotFoundException('User not found'));
    mockGqlContext({ user: admin }, { id: 'missing' });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('throws AuthenticatedUserNotFoundException when JwtAuthGuard did not run', async () => {
    mockGqlContext({}, {});

    await expect(guard.canActivate(context)).rejects.toThrow(AuthenticatedUserNotFoundException);
  });
});
