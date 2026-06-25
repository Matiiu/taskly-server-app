import * as bcrypt from 'bcrypt';

import { comparePassword, hashPassword } from '@/common/utils/hash.util';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('hash.util', () => {
  const bcryptMock = jest.mocked(bcrypt);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hashPassword uses bcrypt.hash with configured salt rounds', async () => {
    bcryptMock.hash.mockResolvedValue('hashed-value' as never);

    const result = await hashPassword('Password123!');

    expect(result).toBe('hashed-value');
    expect(bcryptMock.hash).toHaveBeenCalledWith('Password123!', 10);
  });

  it('comparePassword delegates to bcrypt.compare', async () => {
    bcryptMock.compare.mockResolvedValue(true as never);

    const result = await comparePassword('Password123!', 'hashed-value');

    expect(result).toBe(true);
    expect(bcryptMock.compare).toHaveBeenCalledWith('Password123!', 'hashed-value');
  });
});
