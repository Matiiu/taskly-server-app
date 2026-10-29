import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, GoneException } from '@nestjs/common';

import { AccountService } from '@/login/account.service';
import { CredentialsService } from '@/login/credentials.service';
import { TokenService } from '@/login/token.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { buildSafeUser, buildUser } from '@/common/testing/factories/users.factory';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createUsersServiceMock } from '@/common/testing/mocks/users-service.mock';
import { createCredentialsServiceMock } from '@/common/testing/mocks/credentials-service.mock';
import { createTokenServiceMock } from '@/common/testing/mocks/token-service.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { MOCK_TOKEN } from '@/common/testing/constants';
import { addDays } from '@/common/utils/date.util';
import { ACCOUNT_RECOVERY_DAYS } from '@/users/constants/users.constants';
import { toUserSnapshot } from '@/users/utils/user-snapshot.util';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const USER_ID = 'user-id-1';
const PASSWORD = 'Password123!';

describe('AccountService', () => {
  let service: AccountService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let credentialsMock: ReturnType<typeof createCredentialsServiceMock>;
  let usersServiceMock: ReturnType<typeof createUsersServiceMock>;
  let tokenServiceMock: ReturnType<typeof createTokenServiceMock>;
  let appEventEmitterMock: ReturnType<typeof createAppEventEmitterMock>;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.restoreAllMocks();

    prismaMock = createPrismaMock();
    // Interactive transactions: run the callback against the same mock as the tx client.
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock) as never,
    );
    credentialsMock = createCredentialsServiceMock();
    usersServiceMock = createUsersServiceMock();
    tokenServiceMock = createTokenServiceMock(MOCK_TOKEN);
    appEventEmitterMock = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CredentialsService, useValue: credentialsMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: TokenService, useValue: tokenServiceMock },
        { provide: AppEventEmitterService, useValue: appEventEmitterMock },
      ],
    }).compile();

    service = module.get(AccountService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('deleteAccount', () => {
    const deleteInput = { userId: USER_ID, password: PASSWORD };

    it('deactivates the account 30 days ahead, revokes all sessions and emits INACTIVATE_USER', async () => {
      const user = buildUser();
      credentialsMock.validateById.mockResolvedValue(user);

      await expect(service.deleteAccount(deleteInput)).resolves.toBeUndefined();

      expect(credentialsMock.validateById).toHaveBeenCalledWith(USER_ID, PASSWORD);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(usersServiceMock.deactivate).toHaveBeenCalledWith(
        user.id,
        addDays(NOW, ACCOUNT_RECOVERY_DAYS),
        prismaMock,
      );
      expect(tokenServiceMock.revokeAllSessions).toHaveBeenCalledWith(user.id, prismaMock);
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INACTIVATE_USER',
          userId: user.id,
          entity: 'User',
          entityId: user.id,
          before: toUserSnapshot(user),
          after: null,
        }),
      );
    });

    it('sets the recovery date exactly 30 days from now', async () => {
      credentialsMock.validateById.mockResolvedValue(buildUser());

      await service.deleteAccount(deleteInput);

      expect(usersServiceMock.deactivate).toHaveBeenCalledWith(
        USER_ID,
        new Date(NOW.getTime() + 30 * ONE_DAY_MS),
        prismaMock,
      );
    });

    it('changes nothing when the password check fails', async () => {
      credentialsMock.validateById.mockRejectedValue(
        new BadRequestException('Password is incorrect'),
      );

      await expect(service.deleteAccount(deleteInput)).rejects.toThrow(
        new BadRequestException('Password is incorrect'),
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(usersServiceMock.deactivate).not.toHaveBeenCalled();
      expect(tokenServiceMock.revokeAllSessions).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('does not audit when the transaction fails', async () => {
      credentialsMock.validateById.mockResolvedValue(buildUser());
      tokenServiceMock.revokeAllSessions.mockRejectedValue(new Error('DB error'));

      await expect(service.deleteAccount(deleteInput)).rejects.toThrow('DB error');
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('recoverAccount', () => {
    const recoverAccountInput = { email: 'john@example.com', password: PASSWORD };

    const expectReactivated = async (user: ReturnType<typeof buildUser>) => {
      const reactivated = buildSafeUser({ id: user.id, active: true });
      credentialsMock.validateByEmail.mockResolvedValue(user);
      usersServiceMock.activate.mockResolvedValue(reactivated);

      const result = await service.recoverAccount(recoverAccountInput);

      expect(result).toBe(MOCK_TOKEN);
      expect(credentialsMock.validateByEmail).toHaveBeenCalledWith(
        recoverAccountInput.email,
        recoverAccountInput.password,
      );
      expect(usersServiceMock.activate).toHaveBeenCalledWith(user.id);
      expect(usersServiceMock.release).not.toHaveBeenCalled();
      expect(tokenServiceMock.sign).toHaveBeenCalledWith({
        userId: user.id,
        userCode: user.code,
      });
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REACTIVATE_USER',
          userId: user.id,
          before: null,
          after: toUserSnapshot(reactivated),
        }),
      );
    };

    const expectReleased = async (recoveryDate: Date) => {
      const user = buildUser({ active: false, recoveryDate });
      credentialsMock.validateByEmail.mockResolvedValue(user);

      await expect(service.recoverAccount(recoverAccountInput)).rejects.toThrow(
        new GoneException('The recovery period has expired; the account was permanently deleted'),
      );

      expect(usersServiceMock.release).toHaveBeenCalledTimes(1);
      expect(usersServiceMock.release).toHaveBeenCalledWith(user.id);
      expect(usersServiceMock.activate).not.toHaveBeenCalled();
      expect(tokenServiceMock.sign).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledTimes(1);
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RELEASE_USER',
          userId: user.id,
          entity: 'User',
          entityId: user.id,
          before: toUserSnapshot(user),
          after: null,
        }),
      );
    };

    it('reactivates the account within the recovery window', async () => {
      await expectReactivated(
        buildUser({ active: false, recoveryDate: new Date(NOW.getTime() + ONE_DAY_MS) }),
      );
    });

    it('reactivates accounts deactivated without a recovery date', async () => {
      await expectReactivated(buildUser({ active: false, recoveryDate: null }));
    });

    it('releases the account and throws GoneException when the recovery date has passed', async () => {
      await expectReleased(new Date(NOW.getTime() - ONE_DAY_MS));
    });

    it('releases the account when the recovery date is exactly now', async () => {
      await expectReleased(new Date(NOW.getTime()));
    });

    it('throws BadRequestException when the account is released or unknown', async () => {
      credentialsMock.validateByEmail.mockRejectedValue(
        new BadRequestException('Email or password is incorrect'),
      );

      await expect(service.recoverAccount(recoverAccountInput)).rejects.toThrow(
        new BadRequestException('Email or password is incorrect'),
      );
      expect(usersServiceMock.release).not.toHaveBeenCalled();
      expect(usersServiceMock.activate).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the credentials are wrong', async () => {
      credentialsMock.validateByEmail.mockRejectedValue(
        new BadRequestException('Email or password is incorrect'),
      );

      await expect(service.recoverAccount(recoverAccountInput)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersServiceMock.activate).not.toHaveBeenCalled();
      expect(tokenServiceMock.sign).not.toHaveBeenCalled();
    });

    it('throws ConflictException and does not release when the account is already active', async () => {
      credentialsMock.validateByEmail.mockResolvedValue(buildUser({ active: true }));

      await expect(service.recoverAccount(recoverAccountInput)).rejects.toThrow(
        new ConflictException('Account is already active'),
      );
      expect(usersServiceMock.release).not.toHaveBeenCalled();
      expect(usersServiceMock.activate).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });
  });
});
