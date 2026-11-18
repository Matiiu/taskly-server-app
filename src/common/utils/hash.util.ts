import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const SALT_ROUNDS = 10;

export const hashPassword = (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/** SHA-256 hex digest. For random, high-entropy tokens, where bcrypt's slow salted hash isn't needed. */
export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};
