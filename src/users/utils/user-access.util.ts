import { ForbiddenException } from '@nestjs/common';

import { UserRole, type User } from 'generated/prisma/client';

export const ONLY_ADMINS_MESSAGE = 'Only admins can act on other users';

/** Users may act on themselves; acting on someone else requires ADMIN. */
export function assertCanActOnUser(actor: Pick<User, 'id' | 'role'>, targetId: User['id']): void {
  if (actor.id !== targetId && actor.role !== UserRole.ADMIN) {
    throw new ForbiddenException(ONLY_ADMINS_MESSAGE);
  }
}
