import { Transform } from 'class-transformer';

const isString = (value: unknown): value is string => typeof value === 'string';

/** "  a  " → "a" */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => (isString(value) ? value.trim() : value));

export const ToLowerCase = () => Transform(({ value }: { value: string }) => value.toLowerCase());

/** "  " → null, " a " → "a" */
export const TrimToNull = () =>
  Transform(({ value }: { value: unknown }) => (isString(value) ? value.trim() || null : value));

/** "  maría   josé " → "maría josé" (keeps the user's casing, empty → null) */
export const NormalizeName = () =>
  Transform(({ value }: { value: unknown }) => {
    if (!isString(value)) return value;
    return value.trim().replace(/\s+/g, ' ') || null;
  });

/** " Mateo@X.com " → "mateo@x.com" */
export const TrimLowerCase = () =>
  Transform(({ value }: { value: unknown }) =>
    isString(value) ? value.trim().toLowerCase() : value,
  );
