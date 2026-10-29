import { randomInt } from 'crypto';

import {
  CODE_PREFIX,
  MAX_CODE_LENGTH,
  MIN_CODE_LENGTH,
} from '@/common/constants/user-code.constants';

const SUFFIX_SEPARATOR = '_';
// Fixed width: 9,000 variants per seed, regardless of how long the name is
const SUFFIX_DIGITS = 4;

const sanitizeCode = (value: string): string => value.replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase();

export const normalizeCodeToken = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}_]/gu, '')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const toValidCodeLength = (value: string): string => {
  const normalized = sanitizeCode(value);
  const maxBodyLength = MAX_CODE_LENGTH - CODE_PREFIX.length;
  const minBodyLength = MIN_CODE_LENGTH - CODE_PREFIX.length;
  const truncated = normalized.slice(0, maxBodyLength);
  const padded =
    truncated.length >= minBodyLength ? truncated : truncated.padEnd(minBodyLength, '0');

  return `${CODE_PREFIX}${padded}`;
};

/**
 * Builds `@<seed>_<suffix>`, trimming the seed (not the suffix) so the result fits the max length.
 * Appending first and truncating afterwards would cut the suffix off long seeds,
 * producing the same code on every retry.
 */
export const toValidCodeWithSuffix = (seed: string, suffix: string): string => {
  const maxSeedLength =
    MAX_CODE_LENGTH - CODE_PREFIX.length - SUFFIX_SEPARATOR.length - suffix.length;
  // Drop trailing separators left by the trim, so it never ends up as "seed__1234"
  const body = sanitizeCode(seed).slice(0, maxSeedLength).replace(/_+$/, '');

  return toValidCodeLength(`${body}${SUFFIX_SEPARATOR}${suffix}`);
};

export const generateRandomNumericSuffix = (): string =>
  String(randomInt(10 ** (SUFFIX_DIGITS - 1), 10 ** SUFFIX_DIGITS));
