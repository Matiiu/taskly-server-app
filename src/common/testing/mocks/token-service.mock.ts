import { MOCK_TOKEN } from '@/common/testing/constants';

export const createTokenServiceMock = (token: string = MOCK_TOKEN) => ({
  sign: jest.fn().mockResolvedValue(token),
  revokeSession: jest.fn(),
  revokeAllSessions: jest.fn(),
});
