import { HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { TokenService } from '@/login/token.service';
import { LoginRepository } from '@/login/login.repository';
import { PrismaService } from '@/prisma/prisma.service';
import type { JwtPayload } from '@/login/types/login.type';
import { createJwtValidPayloadMock } from '@/common/testing/mocks/jwt-auth.mock';
import { MOCK_TOKEN } from '@/common/testing/constants';
import { buildSafeUser } from '@/common/testing/factories/users.factory';

const SESSION_ENDED = new UnauthorizedException('Session ended. Please sign in again');

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let prisma: {
    revokedToken: { findFirst: jest.Mock; upsert: jest.Mock };
    user: { findUnique: jest.Mock; update: jest.Mock };
  };
  let validPayload: JwtPayload;

  beforeEach(async () => {
    jwtService = { signAsync: jest.fn().mockResolvedValue(MOCK_TOKEN), verifyAsync: jest.fn() };
    prisma = {
      revokedToken: { findFirst: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValue(buildSafeUser()),
        update: jest.fn(),
      },
    };
    validPayload = createJwtValidPayloadMock({ iat: 1_700_000_000 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        TokenService,
        LoginRepository,
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get<TokenService>(TokenService);
  });

  // -------------------------------------------------------------------------
  // sign
  // -------------------------------------------------------------------------

  describe('sign', () => {
    it('signs a token with a fresh jti, the user id as sub and the user code', async () => {
      const token = await service.sign({ userId: 'user-1', userCode: '@john' });

      expect(token).toBe(MOCK_TOKEN);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        jti: expect.any(String),
        sub: 'user-1',
        code: '@john',
      });
    });

    it('uses a different jti for every token', async () => {
      await service.sign({ userId: 'user-1', userCode: '@john' });
      await service.sign({ userId: 'user-1', userCode: '@john' });

      const [[first], [second]] = jwtService.signAsync.mock.calls as [[JwtPayload], [JwtPayload]];
      expect(first.jti).not.toBe(second.jti);
    });
  });

  // -------------------------------------------------------------------------
  // verify
  // -------------------------------------------------------------------------

  describe('verify', () => {
    it('returns the payload and the user when the token is valid and the session is alive', async () => {
      jwtService.verifyAsync.mockResolvedValue(validPayload);

      await expect(service.verify('good.token')).resolves.toEqual({
        session: validPayload,
        user: buildSafeUser(),
      });
      expect(prisma.revokedToken.findFirst).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: { jti: validPayload.jti, expiresAt: { gt: expect.any(Date) } },
        select: { id: true },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: validPayload.sub },
        omit: { password: true },
      });
    });

    it('throws when the jti is missing from the payload', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', code: 'some-code' });

      await expect(service.verify('no.jti')).rejects.toThrow(
        new UnauthorizedException('Invalid authorization token'),
      );
    });

    it('throws when the token has been revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue(validPayload);
      prisma.revokedToken.findFirst.mockResolvedValue({ id: 'revoked-1' });

      await expect(service.verify('revoked.token')).rejects.toThrow(SESSION_ENDED);
    });

    it('throws when the user no longer exists', async () => {
      jwtService.verifyAsync.mockResolvedValue(validPayload);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verify('good.token')).rejects.toThrow(SESSION_ENDED);
    });

    it('throws when the account is deactivated', async () => {
      jwtService.verifyAsync.mockResolvedValue(validPayload);
      prisma.user.findUnique.mockResolvedValue(buildSafeUser({ active: false }));

      await expect(service.verify('good.token')).rejects.toThrow(SESSION_ENDED);
    });

    it('throws when the token was issued before all sessions were revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue(validPayload);
      prisma.user.findUnique.mockResolvedValue(
        buildSafeUser({ sessionsRevokedAt: new Date((validPayload.iat! + 60) * 1000) }),
      );

      await expect(service.verify('old.token')).rejects.toThrow(SESSION_ENDED);
    });

    it('accepts a token issued after all sessions were revoked (e.g. after recovering the account)', async () => {
      jwtService.verifyAsync.mockResolvedValue(validPayload);
      const user = buildSafeUser({ sessionsRevokedAt: new Date((validPayload.iat! - 60) * 1000) });
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.verify('new.token')).resolves.toEqual({ session: validPayload, user });
    });

    it('maps a TokenExpiredError to a friendly message', async () => {
      jwtService.verifyAsync.mockRejectedValue({ name: 'TokenExpiredError' });

      await expect(service.verify('expired.token')).rejects.toThrow(
        new UnauthorizedException('Token expired. Please sign in again'),
      );
    });

    it('maps a JsonWebTokenError to "Invalid authorization token"', async () => {
      jwtService.verifyAsync.mockRejectedValue({ name: 'JsonWebTokenError' });

      await expect(service.verify('malformed.token')).rejects.toThrow(
        new UnauthorizedException('Invalid authorization token'),
      );
    });

    it('falls back to "Invalid or expired token" for any other error', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('database is down'));

      await expect(service.verify('weird.token')).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('re-throws an HttpException raised during the session checks unchanged', async () => {
      jwtService.verifyAsync.mockResolvedValue(validPayload);
      const boom = new HttpException('teapot', 418);
      prisma.revokedToken.findFirst.mockRejectedValue(boom);

      await expect(service.verify('good.token')).rejects.toBe(boom);
    });
  });

  // -------------------------------------------------------------------------
  // revokeSession / revokeAllSessions
  // -------------------------------------------------------------------------

  describe('revokeSession', () => {
    it('stores the jti as revoked with an expiry in the future', async () => {
      await service.revokeSession('token-jti', 'user-1');

      expect(prisma.revokedToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jti: 'token-jti' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          create: { jti: 'token-jti', userId: 'user-1', expiresAt: expect.any(Date) },
        }),
      );
      const [[{ create }]] = prisma.revokedToken.upsert.mock.calls as [
        [{ create: { expiresAt: Date } }],
      ];
      expect(create.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('revokeAllSessions', () => {
    it('stamps the session cutoff on the user', async () => {
      await service.revokeAllSessions('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { sessionsRevokedAt: expect.any(Date) },
      });
    });
  });
});
