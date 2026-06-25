import { UnauthorizedException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard'; // adjust path
import { PrismaService } from '@/prisma/prisma.service';
import type { JwtPayload } from '@/auth/types/auth.type';
import { buildContext, buildReq } from '@/common/testing/factories/jwt-auth.factory';
import { createJwtValidPayloadMock } from '@/common/testing/mocks/jwt-auth.mock';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let prisma: { revokedToken: { findFirst: jest.Mock } };

  // Build a fake GraphQL ExecutionContext.
  // GqlExecutionContext.create(ctx).getContext() reads getArgByIndex(2),
  // because GraphQL resolver args are [root, args, context, info].

  let validPayload: JwtPayload;

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn() };
    prisma = { revokedToken: { findFirst: jest.fn() } };
    validPayload = createJwtValidPayloadMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = moduleRef.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('allows the request and attaches the user when the token is valid and not revoked', async () => {
    jwtService.verifyAsync.mockResolvedValue(validPayload);
    prisma.revokedToken.findFirst.mockResolvedValue(null);

    const req = buildReq('Bearer good.token');
    const ctx = buildContext(req);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const user = (req as Record<string, unknown>).user as JwtPayload;
    expect(user).toEqual(validPayload);
    expect(prisma.revokedToken.findFirst).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { jti: validPayload.jti, expiresAt: { gt: expect.any(Date) } },
      select: { id: true },
    });
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
  });

  it('throws when the auth scheme is not Bearer', async () => {
    const ctx = buildContext(buildReq('Basic abc123'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Missing authorization token'),
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws when the jti is missing from the payload', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', code: 'some-code' });
    const ctx = buildContext(buildReq('Bearer no.jti'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Invalid authorization token'),
    );
  });

  it('throws when the token has been revoked', async () => {
    jwtService.verifyAsync.mockResolvedValue(validPayload);
    prisma.revokedToken.findFirst.mockResolvedValue({ id: 'revoked-1' });

    const ctx = buildContext(buildReq('Bearer revoked.token'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Session ended. Please sign in again'),
    );
  });

  it('maps a TokenExpiredError to a friendly message', async () => {
    jwtService.verifyAsync.mockRejectedValue({ name: 'TokenExpiredError' });
    const ctx = buildContext(buildReq('Bearer expired.token'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Token expired. Please sign in again'),
    );
  });

  it('maps a JsonWebTokenError to "Invalid authorization token"', async () => {
    jwtService.verifyAsync.mockRejectedValue({ name: 'JsonWebTokenError' });
    const ctx = buildContext(buildReq('Bearer malformed.token'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Invalid authorization token'),
    );
  });

  it('falls back to "Invalid or expired token" for any other error', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('database is down'));
    const ctx = buildContext(buildReq('Bearer weird.token'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  it('re-throws an HttpException raised inside the try block unchanged', async () => {
    // verifyAsync succeeds, but findFirst throws an HttpException -> must be re-thrown as-is
    jwtService.verifyAsync.mockResolvedValue(validPayload);
    const boom = new HttpException('teapot', 418);
    prisma.revokedToken.findFirst.mockRejectedValue(boom);

    const ctx = buildContext(buildReq('Bearer good.token'));
    await expect(guard.canActivate(ctx)).rejects.toBe(boom);
  });

  it('throws when the authorization header is malformed', async () => {
    const ctx = buildContext(buildReq('Bearer'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Missing authorization token'),
    );
  });
});
