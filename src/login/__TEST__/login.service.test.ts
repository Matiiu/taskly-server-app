import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { LoginService } from '@/login/login.service';
import { LoginRepository } from '@/login/login.repository';
import { CredentialsService } from '@/login/credentials.service';
import { TokenService } from '@/login/token.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { EVENTS } from '@/common/constants/events.constants';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import * as hashUtil from '@/common/utils/hash.util';
import {
  buildSafeUser,
  buildUser,
  buildUserType,
} from '@/common/testing/users/factories/users.factory';
import { createPrismaMock } from '@/common/testing/prisma/mocks/prisma.mock';
import { createUsersServiceMock } from '@/common/testing/users/mocks/users-service.mock';
import { createCredentialsServiceMock } from '@/common/testing/login/mocks/credentials-service.mock';
import { createTokenServiceMock } from '@/common/testing/login/mocks/token-service.mock';
import { createLoginRepositoryMock } from '@/common/testing/login/mocks/login-repository.mock';
import { createAppEventEmitterMock } from '@/common/testing/common/mocks/app-event-emitter.mock';
import { MOCK_TOKEN } from '@/common/testing/login/constants/login.constants';
import { toUserMinimalSnapshot } from '@/users/utils/user-snapshot.util';
import { USER_DEACTIVATED_MESSAGE } from '@/users/utils/user-status.util';

describe('LoginService', () => {
  let service: LoginService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let credentialsMock: ReturnType<typeof createCredentialsServiceMock>;
  let loginRepoMock: ReturnType<typeof createLoginRepositoryMock>;
  let usersServiceMock: ReturnType<typeof createUsersServiceMock>;
  let tokenServiceMock: ReturnType<typeof createTokenServiceMock>;
  let appEventEmitterMock: ReturnType<typeof createAppEventEmitterMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();

    prismaMock = createPrismaMock();
    // Interactive transactions: run the callback against the same mock as the tx client.
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock) as never,
    );
    credentialsMock = createCredentialsServiceMock();
    loginRepoMock = createLoginRepositoryMock();
    usersServiceMock = createUsersServiceMock();
    tokenServiceMock = createTokenServiceMock(MOCK_TOKEN);
    appEventEmitterMock = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CredentialsService, useValue: credentialsMock },
        { provide: LoginRepository, useValue: loginRepoMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: TokenService, useValue: tokenServiceMock },
        { provide: AppEventEmitterService, useValue: appEventEmitterMock },
      ],
    }).compile();

    service = module.get(LoginService);
  });

  describe('signIn', () => {
    const signInInput = { email: 'john@example.com', password: 'Password123!' };

    it('should sign in successfully with valid credentials', async () => {
      const user = buildUser();
      credentialsMock.validateByEmail.mockResolvedValue(user);

      const result = await service.signIn(signInInput);

      expect(result).toBe(MOCK_TOKEN);
      expect(credentialsMock.validateByEmail).toHaveBeenCalledWith(
        signInInput.email,
        signInInput.password,
      );
      expect(tokenServiceMock.sign).toHaveBeenCalledWith({
        userId: user.id,
        userCode: user.code,
      });
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_USER', userId: user.id }),
      );
    });

    it('should propagate BadRequestException when the credentials are invalid', async () => {
      credentialsMock.validateByEmail.mockRejectedValue(
        new BadRequestException('Email or password is incorrect'),
      );

      await expect(service.signIn(signInInput)).rejects.toThrow(
        new BadRequestException('Email or password is incorrect'),
      );
      expect(tokenServiceMock.sign).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the account is deactivated', async () => {
      credentialsMock.validateByEmail.mockResolvedValue(buildUser({ active: false }));

      await expect(service.signIn(signInInput)).rejects.toThrow(
        new ForbiddenException(USER_DEACTIVATED_MESSAGE),
      );
      expect(tokenServiceMock.sign).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const logoutInput = { jti: 'token-jti', userId: 'user-id-1' };

    it('should revoke the session and audit the logout', async () => {
      const user = buildSafeUser();
      usersServiceMock.findById.mockResolvedValue(user);

      await expect(service.logout(logoutInput)).resolves.toBeUndefined();

      expect(usersServiceMock.findById).toHaveBeenCalledWith(logoutInput.userId);
      expect(tokenServiceMock.revokeSession).toHaveBeenCalledWith(
        logoutInput.jti,
        logoutInput.userId,
      );
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT_USER', userId: logoutInput.userId }),
      );
    });

    it('should do nothing when user is not found', async () => {
      usersServiceMock.findById.mockResolvedValue(null);

      await expect(service.logout(logoutInput)).resolves.toBeUndefined();

      expect(tokenServiceMock.revokeSession).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    const input = { email: 'john@example.com' };

    it('should do nothing when the email is unknown', async () => {
      loginRepoMock.findByEmail.mockResolvedValue(null);

      await expect(service.requestPasswordReset(input)).resolves.toBeUndefined();

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emit).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('should do nothing when the user is inactive', async () => {
      loginRepoMock.findByEmail.mockResolvedValue(buildUser({ active: false }));

      await expect(service.requestPasswordReset(input)).resolves.toBeUndefined();

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emit).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    describe('when the user is active', () => {
      const NOW = new Date('2026-11-18T12:00:00.000Z');
      const user = buildUser();

      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(NOW);
        loginRepoMock.findByEmail.mockResolvedValue(user);
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should invalidate old tokens, then create the new one in one transaction', async () => {
        await service.requestPasswordReset(input);

        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(loginRepoMock.invalidateResetTokens).toHaveBeenCalledWith(user.id, prismaMock);
        expect(loginRepoMock.createResetToken).toHaveBeenCalledWith(
          expect.objectContaining({ userId: user.id }),
          prismaMock,
        );
        expect(loginRepoMock.invalidateResetTokens.mock.invocationCallOrder[0]).toBeLessThan(
          loginRepoMock.createResetToken.mock.invocationCallOrder[0],
        );
      });

      it('should store only the hash of the token it emits', async () => {
        await service.requestPasswordReset(input);

        const [{ tokenHash }] = loginRepoMock.createResetToken.mock.calls[0] as [
          { tokenHash: string },
        ];
        const [, { token }] = appEventEmitterMock.emit.mock.calls[0] as [string, { token: string }];

        expect(tokenHash).not.toBe(token);
        expect(tokenHash).toBe(hashUtil.hashToken(token));
      });

      it('should expire the token 30 minutes from now', async () => {
        await service.requestPasswordReset(input);

        const [{ expiresAt }] = loginRepoMock.createResetToken.mock.calls[0] as [
          { expiresAt: Date },
        ];

        expect(expiresAt).toEqual(new Date(NOW.getTime() + 30 * 60 * 1000));
      });

      it('should emit the reset event with the raw token and audit the request', async () => {
        await service.requestPasswordReset(input);

        expect(appEventEmitterMock.emit).toHaveBeenCalledWith(EVENTS.PASSWORD_RESET_REQUESTED, {
          email: user.email,
          name: user.name,
          token: expect.stringMatching(/^[0-9a-f]{64}$/) as string,
        });
        expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'REQUEST_PASSWORD_RESET',
            userId: user.id,
            entityId: user.id,
            entity: 'User',
          }),
        );
      });

      it('should not emit anything when the transaction fails', async () => {
        loginRepoMock.createResetToken.mockRejectedValue(new Error('db down'));

        await expect(service.requestPasswordReset(input)).rejects.toThrow('db down');

        expect(appEventEmitterMock.emit).not.toHaveBeenCalled();
        expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
      });
    });
  });

  describe('resetPassword', () => {
    const RAW_TOKEN = 'raw-reset-token';
    const NEW_PASSWORD = 'NewPassword123!';
    const NEW_HASH = 'new-hashed';
    const TOKEN_ID = 'reset-token-id-1';
    const input = { token: RAW_TOKEN, newPassword: NEW_PASSWORD };
    const INVALID_LINK = new BadRequestException('Invalid or expired reset link');

    it('should throw BadRequestException when there is no active token', async () => {
      loginRepoMock.findActiveResetToken.mockResolvedValue(null);

      await expect(service.resetPassword(input)).rejects.toThrow(INVALID_LINK);

      expect(loginRepoMock.findActiveResetToken).toHaveBeenCalledWith(
        hashUtil.hashToken(RAW_TOKEN),
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('should throw the same BadRequestException when the user is inactive', async () => {
      loginRepoMock.findActiveResetToken.mockResolvedValue({
        id: TOKEN_ID,
        user: buildSafeUser({ active: false }),
      });

      await expect(service.resetPassword(input)).rejects.toThrow(INVALID_LINK);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(loginRepoMock.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw and save nothing when another request used the token first', async () => {
      loginRepoMock.findActiveResetToken.mockResolvedValue({
        id: TOKEN_ID,
        user: buildSafeUser(),
      });
      loginRepoMock.markResetTokenUsed.mockResolvedValue(false);
      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue(NEW_HASH);

      await expect(service.resetPassword(input)).rejects.toThrow(INVALID_LINK);

      expect(loginRepoMock.updatePassword).not.toHaveBeenCalled();
      expect(tokenServiceMock.revokeAllSessions).not.toHaveBeenCalled();
      expect(tokenServiceMock.sign).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('should consume the token, revoke sessions, save the password and sign a new token', async () => {
      const user = buildSafeUser();
      const updatedUser = buildSafeUser({ updatedAt: new Date('2026-11-18T12:00:00.000Z') });
      const mappedUser = buildUserType(updatedUser);
      loginRepoMock.findActiveResetToken.mockResolvedValue({ id: TOKEN_ID, user });
      loginRepoMock.markResetTokenUsed.mockResolvedValue(true);
      loginRepoMock.updatePassword.mockResolvedValue(updatedUser);
      usersServiceMock.toUserType.mockReturnValue(mappedUser);
      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue(NEW_HASH);

      const result = await service.resetPassword(input);

      expect(result).toEqual({ user: mappedUser, token: MOCK_TOKEN });
      expect(usersServiceMock.toUserType).toHaveBeenCalledWith(updatedUser);
      expect(hashUtil.hashPassword).toHaveBeenCalledWith(NEW_PASSWORD);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(loginRepoMock.markResetTokenUsed).toHaveBeenCalledWith(TOKEN_ID, prismaMock);
      expect(tokenServiceMock.revokeAllSessions).toHaveBeenCalledWith(user.id, prismaMock);
      expect(loginRepoMock.updatePassword).toHaveBeenCalledWith(user.id, NEW_HASH, prismaMock);
      expect(loginRepoMock.markResetTokenUsed.mock.invocationCallOrder[0]).toBeLessThan(
        tokenServiceMock.revokeAllSessions.mock.invocationCallOrder[0],
      );
      expect(tokenServiceMock.revokeAllSessions.mock.invocationCallOrder[0]).toBeLessThan(
        loginRepoMock.updatePassword.mock.invocationCallOrder[0],
      );
      expect(tokenServiceMock.sign).toHaveBeenCalledWith({
        userId: user.id,
        userCode: user.code,
      });
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESET_PASSWORD',
          userId: user.id,
          entityId: user.id,
          entity: 'User',
          before: toUserMinimalSnapshot(user),
          after: toUserMinimalSnapshot(updatedUser),
        }),
      );
    });
  });

  describe('changePassword', () => {
    const CURRENT_PASSWORD = 'OldPassword123!';
    const NEW_PASSWORD = 'NewPassword123!';
    const NEW_HASH = 'new-hashed';
    const changeInput = { currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD };

    it('should replace the password, revoke sessions, audit and return a new token', async () => {
      const user = buildSafeUser();
      credentialsMock.validateById.mockResolvedValue(buildUser());
      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue(NEW_HASH);

      const result = await service.changePassword(user, changeInput);

      expect(result).toBe(MOCK_TOKEN);
      expect(credentialsMock.validateById).toHaveBeenCalledWith(user.id, CURRENT_PASSWORD);
      expect(hashUtil.hashPassword).toHaveBeenCalledWith(NEW_PASSWORD);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(loginRepoMock.updatePassword).toHaveBeenCalledWith(user.id, NEW_HASH, prismaMock);
      expect(tokenServiceMock.revokeAllSessions).toHaveBeenCalledWith(user.id, prismaMock);
      expect(tokenServiceMock.sign).toHaveBeenCalledWith({
        userId: user.id,
        userCode: user.code,
      });
      expect(tokenServiceMock.revokeAllSessions.mock.invocationCallOrder[0]).toBeLessThan(
        tokenServiceMock.sign.mock.invocationCallOrder[0],
      );
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CHANGE_PASSWORD',
          userId: user.id,
          entityId: user.id,
          entity: 'User',
        }),
      );
    });

    it('should propagate the error and change nothing when the current password is wrong', async () => {
      credentialsMock.validateById.mockRejectedValue(
        new BadRequestException('Password is incorrect'),
      );

      await expect(service.changePassword(buildSafeUser(), changeInput)).rejects.toThrow(
        new BadRequestException('Password is incorrect'),
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(loginRepoMock.updatePassword).not.toHaveBeenCalled();
      expect(tokenServiceMock.sign).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the new password equals the current one', async () => {
      credentialsMock.validateById.mockResolvedValue(buildUser());

      await expect(
        service.changePassword(buildSafeUser(), {
          currentPassword: CURRENT_PASSWORD,
          newPassword: CURRENT_PASSWORD,
        }),
      ).rejects.toThrow(
        new BadRequestException('New password must be different from the current password'),
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(loginRepoMock.updatePassword).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('should not sign a token nor audit when the transaction fails', async () => {
      credentialsMock.validateById.mockResolvedValue(buildUser());
      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue(NEW_HASH);
      loginRepoMock.updatePassword.mockRejectedValue(new Error('db down'));

      await expect(service.changePassword(buildSafeUser(), changeInput)).rejects.toThrow('db down');
      expect(tokenServiceMock.sign).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });
  });
});
