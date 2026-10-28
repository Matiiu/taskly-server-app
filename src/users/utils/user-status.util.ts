import { ForbiddenException } from '@nestjs/common';
import type { User } from 'generated/prisma/client';

export const USER_DEACTIVATED_MESSAGE = 'Account is deactivated';

export function assertUserIsActive(user: Pick<User, 'active'>): void {
  if (!user.active) {
    throw new ForbiddenException(USER_DEACTIVATED_MESSAGE);
  }
}
