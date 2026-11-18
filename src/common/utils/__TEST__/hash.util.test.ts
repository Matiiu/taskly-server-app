import * as bcrypt from 'bcrypt';

import { comparePassword, hashPassword, hashToken } from '@/common/utils/hash.util';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// bcrypt's hash/compare are overloaded and jest.mocked() would type them from the callback
// overload (returns void), so mock the promise overloads that hash.util actually uses.
type HashFn = (data: string, saltOrRounds: number) => Promise<string>;
type CompareFn = (data: string, encrypted: string) => Promise<boolean>;

describe('hash.util', () => {
  const hashMock = jest.mocked(bcrypt.hash as HashFn);
  const compareMock = jest.mocked(bcrypt.compare as CompareFn);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hashPassword uses bcrypt.hash with configured salt rounds', async () => {
    hashMock.mockResolvedValue('hashed-value');

    const result = await hashPassword('Password123!');

    expect(result).toBe('hashed-value');
    expect(hashMock).toHaveBeenCalledWith('Password123!', 10);
  });

  it('comparePassword delegates to bcrypt.compare', async () => {
    compareMock.mockResolvedValue(true);

    const result = await comparePassword('Password123!', 'hashed-value');

    expect(result).toBe(true);
    expect(compareMock).toHaveBeenCalledWith('Password123!', 'hashed-value');
  });

  describe('hashToken', () => {
    it('returns the SHA-256 hex digest (64 hex chars)', () => {
      expect(hashToken('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
      expect(hashToken('some-token')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic and differs for different tokens', () => {
      expect(hashToken('token-a')).toBe(hashToken('token-a'));
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });
});
