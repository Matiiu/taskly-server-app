import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_PATTERN,
} from '@/login/constants/login.constant';

/** The password rules of every input that sets a new password (register, recover, change). */
export const IsStrongPassword = () =>
  applyDecorators(
    IsNotEmpty(),
    IsString(),
    MinLength(MIN_PASSWORD_LENGTH, {
      message: `$property must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    }),
    MaxLength(MAX_PASSWORD_LENGTH, {
      message: `$property must be at most ${MAX_PASSWORD_LENGTH} characters long`,
    }),
    Matches(PASSWORD_PATTERN, {
      message:
        '$property must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  );
