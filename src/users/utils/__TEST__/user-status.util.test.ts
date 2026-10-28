import { ForbiddenException } from '@nestjs/common';

import { assertUserIsActive, USER_DEACTIVATED_MESSAGE } from '@/users/utils/user-status.util';

describe('assertUserIsActive', () => {
  it('does not throw for an active user', () => {
    expect(() => assertUserIsActive({ active: true })).not.toThrow();
  });

  it('throws ForbiddenException with the shared message for an inactive user', () => {
    expect(() => assertUserIsActive({ active: false })).toThrow(
      new ForbiddenException(USER_DEACTIVATED_MESSAGE),
    );
  });
});
