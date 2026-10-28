import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { TokenService } from '@/login/token.service';
import type { JwtPayload } from '@/login/types/login.type';
import { buildContext, buildReq } from '@/common/testing/factories/jwt-auth.factory';
import { createJwtValidPayloadMock } from '@/common/testing/mocks/jwt-auth.mock';
import { buildSafeUser } from '@/common/testing/factories/users.factory';

// Token validation itself is covered in token.service.test.ts;
// these tests only cover reading the header and attaching the session and user.
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let tokenService: { verify: jest.Mock };
  let validPayload: JwtPayload;

  beforeEach(async () => {
    tokenService = { verify: jest.fn() };
    validPayload = createJwtValidPayloadMock();

    const moduleRef = await Test.createTestingModule({
      providers: [JwtAuthGuard, { provide: TokenService, useValue: tokenService }],
    }).compile();

    guard = moduleRef.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('allows the request and attaches the verified session and user', async () => {
    const user = buildSafeUser();
    tokenService.verify.mockResolvedValue({ session: validPayload, user });

    const req = buildReq('Bearer good.token');
    const ctx = buildContext(req);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(tokenService.verify).toHaveBeenCalledWith('good.token');
    expect(req).toMatchObject({ session: validPayload, user });
  });

  it('propagates the error when the token fails verification', async () => {
    const error = new UnauthorizedException('Session ended. Please sign in again');
    tokenService.verify.mockRejectedValue(error);

    const req = buildReq('Bearer revoked.token');

    await expect(guard.canActivate(buildContext(req))).rejects.toBe(error);
    expect(req).not.toHaveProperty('user');
    expect(req).not.toHaveProperty('session');
  });

  it('throws when the GraphQL request is missing', async () => {
    const ctx = buildContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Request not found'),
    );
  });

  it('throws when the authorization header is missing entirely', async () => {
    const ctx = buildContext(buildReq());
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Missing authorization token'),
    );
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('throws when the auth scheme is not Bearer', async () => {
    const ctx = buildContext(buildReq('Basic abc123'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Missing authorization token'),
    );
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('throws when the authorization header is malformed', async () => {
    const ctx = buildContext(buildReq('Bearer'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Missing authorization token'),
    );
    expect(tokenService.verify).not.toHaveBeenCalled();
  });
});
