import { MOCK_TOKEN } from '@/common/testing/login/constants/login.constants';

export const createTokenServiceMock = (token: string = MOCK_TOKEN) => ({
  sign: jest.fn().mockResolvedValue(token),
  revokeSession: jest.fn(),
  revokeAllSessions: jest.fn(),
});
