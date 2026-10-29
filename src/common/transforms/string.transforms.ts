import { Transform } from 'class-transformer';

import { NAME_PARTICLES } from '@/common/constants/name.constants';

const isString = (value: unknown): value is string => typeof value === 'string';

/** "  a  " → "a" */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => (isString(value) ? value.trim() : value));

export const ToLowerCase = () => Transform(({ value }: { value: string }) => value.toLowerCase());

/** "  " → null, " a " → "a" */
export const TrimToNull = () =>
  Transform(({ value }: { value: unknown }) => (isString(value) ? value.trim() || null : value));

// A letter that starts a word part: at the start, or after a hyphen or an apostrophe ("Jean-Pierre", "O'Neil")
const WORD_PART_START = /(^|[-'’])(\p{L})/gu;

const capitalizeWord = (word: string): string =>
  word.replace(WORD_PART_START, (_, separator: string, letter: string) => {
    return `${separator}${letter.toUpperCase()}`;
  });

/** Particles stay lowercase unless they are the first word. */
const toNameCase = (name: string): string =>
  name
    .toLowerCase()
    .split(' ')
    .map((word, index) => (index > 0 && NAME_PARTICLES.has(word) ? word : capitalizeWord(word)))
    .join(' ');

/**
 * "  maría   DE LA  cruz " → "María de la Cruz", "jean-pierre o'neil" → "Jean-Pierre O'Neil".
 * Collapses spaces and fixes the casing; blank → null.
 */
export const NormalizeName = () =>
  Transform(({ value }: { value: unknown }) => {
    if (!isString(value)) return value;

    const name = value.trim().replace(/\s+/g, ' ');
    return name ? toNameCase(name) : null;
  });

/** " Mateo@X.com " → "mateo@x.com" */
export const TrimLowerCase = () =>
  Transform(({ value }: { value: unknown }) =>
    isString(value) ? value.trim().toLowerCase() : value,
  );
