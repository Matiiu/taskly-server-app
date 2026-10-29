import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { LoginService } from '@/login/login.service';
import { LoginRepository } from '@/login/login.repository';
import { CredentialsService } from '@/login/credentials.service';
import { TokenService } from '@/login/token.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import * as hashUtil from '@/common/utils/hash.util';
import { buildSafeUser, buildUser } from '@/common/testing/factories/users.factory';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createUsersServiceMock } from '@/common/testing/mocks/users-service.mock';
import { createCredentialsServiceMock } from '@/common/testing/mocks/credentials-service.mock';
import { createTokenServiceMock } from '@/common/testing/mocks/token-service.mock';
import { createLoginRepositoryMock } from '@/common/testing/mocks/login-repository.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { MOCK_TOKEN } from '@/common/testing/constants';
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

  describe('recoverPassword', () => {
    const recoverInput = { email: 'john@example.com', password: 'NewPassword123!' };

    it('should recover password successfully', async () => {
      const user = buildUser();
      loginRepoMock.findByEmail.mockResolvedValue(user);
      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('new-hashed');
      // new password is different from current
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      const result = await service.recoverPassword(recoverInput);

      expect(result).toBe(MOCK_TOKEN);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(loginRepoMock.updatePassword).toHaveBeenCalledWith(user.id, 'new-hashed', prismaMock);
      expect(tokenServiceMock.revokeAllSessions).toHaveBeenCalledWith(user.id, prismaMock);
      expect(tokenServiceMock.sign).toHaveBeenCalledWith({
        userId: user.id,
        userCode: user.code,
      });
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RECOVER_PASSWORD', userId: user.id }),
      );
    });

    it('should throw BadRequestException when user is not found', async () => {
      loginRepoMock.findByEmail.mockResolvedValue(null);

      await expect(service.recoverPassword(recoverInput)).rejects.toThrow(
        new BadRequestException('User not found'),
      );
    });

    it('should throw ForbiddenException when the account is deactivated', async () => {
      loginRepoMock.findByEmail.mockResolvedValue(buildUser({ active: false }));

      await expect(service.recoverPassword(recoverInput)).rejects.toThrow(
        new ForbiddenException(USER_DEACTIVATED_MESSAGE),
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new password equals the current password', async () => {
      loginRepoMock.findByEmail.mockResolvedValue(buildUser());
      // same password
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.recoverPassword(recoverInput)).rejects.toThrow(
        new BadRequestException('New password must be different from the current password'),
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(loginRepoMock.updatePassword).not.toHaveBeenCalled();
    });
  });
});
