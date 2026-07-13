import { randomInt } from 'crypto';

const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 20;

export const normalizeCodeToken = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}_]/gu, '')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const toValidCodeLength = (value: string): string => {
  const normalized = value.replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase();
  const maxBodyLength = MAX_CODE_LENGTH - 1;
  const minBodyLength = MIN_CODE_LENGTH - 1;
  const truncated = normalized.slice(0, maxBodyLength);
  const padded =
    truncated.length >= minBodyLength ? truncated : truncated.padEnd(minBodyLength, '0');

  return `@${padded}`;
};

export const generateRandomNumericSuffix = (normalizedName: string): string => {
  const maxDigits = Math.max(1, MAX_CODE_LENGTH - normalizedName.length - 2);
  const digitCount = Math.min(6, maxDigits);
  const min = 10 ** Math.max(0, digitCount - 1);
  const max = 10 ** digitCount - 1;

  return String(randomInt(min, max + 1));
};
