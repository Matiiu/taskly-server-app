import { MOCK_TOKEN } from '@/common/testing/constants';

export const createJwtServiceMock = (token: string = MOCK_TOKEN) => ({
  signAsync: jest.fn().mockResolvedValue(token),
});
