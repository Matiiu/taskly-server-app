import { JwtPayload } from '@/auth/types/auth.type';

export const createJwtValidPayloadMock = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  jti: 'token-id-123',
  sub: 'user-1',
  code: 'some-code',
  ...overrides,
});
