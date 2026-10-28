import { ForbiddenException } from '@nestjs/common';

import { UserRole } from 'generated/prisma/client';
import { assertCanActOnUser, ONLY_ADMINS_MESSAGE } from '@/users/utils/user-access.util';

describe('assertCanActOnUser', () => {
  it('lets a user act on themselves', () => {
    expect(() => assertCanActOnUser({ id: 'me', role: UserRole.USER }, 'me')).not.toThrow();
  });

  it('lets an admin act on another user', () => {
    expect(() => assertCanActOnUser({ id: 'admin', role: UserRole.ADMIN }, 'other')).not.toThrow();
  });

  it('forbids a regular user from acting on another user', () => {
    expect(() => assertCanActOnUser({ id: 'me', role: UserRole.USER }, 'other')).toThrow(
      new ForbiddenException(ONLY_ADMINS_MESSAGE),
    );
  });
});
