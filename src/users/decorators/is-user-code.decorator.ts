import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { ToLowerCase } from '@/common/transforms/string.transforms';
import {
  CODE_PATTERN,
  MAX_CODE_LENGTH,
  MIN_CODE_LENGTH,
} from '@/common/constants/user-code.constants';

/** The user code rules of every input that sets a code (register, changeCode). Lowercases it. */
export const IsUserCode = () =>
  applyDecorators(
    ToLowerCase(),
    IsNotEmpty(),
    IsString(),
    MinLength(MIN_CODE_LENGTH, {
      message: `$property must be at least ${MIN_CODE_LENGTH} characters long`,
    }),
    MaxLength(MAX_CODE_LENGTH, {
      message: `$property must be at most ${MAX_CODE_LENGTH} characters long`,
    }),
    Matches(CODE_PATTERN, {
      message: '$property must start with @ and contain only letters, numbers, and _',
    }),
  );
