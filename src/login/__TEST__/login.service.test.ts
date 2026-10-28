import { Prisma } from 'generated/prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { LoginService } from '@/login/login.service';
import { LoginRepository } from '@/login/login.repository';
import { TokenService } from '@/login/token.service';
import { UsersRepository } from '@/users/users.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { StatusesService } from '@/statuses/statuses.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import * as hashUtil from '@/common/utils/hash.util';
import { DocumentType } from 'generated/prisma/enums';
import { buildUser, buildUserType } from '@/common/testing/factories/users.factory';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createJwtServiceMock } from '@/common/testing/mocks/jwt-service.mock';
import { createUsersServiceMock } from '@/common/testing/mocks/users-service.mock';
import { createStatusesServiceMock } from '@/common/testing/mocks/statuses-service.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { MOCK_TOKEN } from '@/common/testing/constants';
import { USER_DEACTIVATED_MESSAGE } from '@/users/utils/user-status.util';

let prismaMock: ReturnType<typeof createPrismaMock>;
let jwtServiceMock: ReturnType<typeof createJwtServiceMock>;
let usersServiceMock: ReturnType<typeof createUsersServiceMock>;
let statusesServiceMock: ReturnType<typeof createStatusesServiceMock>;
let appEventEmitterMock: ReturnType<typeof createAppEventEmitterMock>;

describe('LoginService', () => {
  let service: LoginService;

  beforeEach(async () => {
    jest.restoreAllMocks();

    prismaMock = createPrismaMock();
    // LoginService uses interactive transactions: run the callback against the same mock.
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock) as never,
    );
    jwtServiceMock = createJwtServiceMock(MOCK_TOKEN);
    usersServiceMock = createUsersServiceMock();
    statusesServiceMock = createStatusesServiceMock();
    appEventEmitterMock = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        LoginRepository,
        TokenService,
        UsersRepository,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: StatusesService, useValue: statusesServiceMock },
        { provide: AppEventEmitterService, useValue: appEventEmitterMock },
      ],
    }).compile();
    service = module.get<LoginService>(LoginService);
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe('register', () => {
    const registerInput = {
      name: 'John',
      firstSurname: 'Doe',
      documentType: DocumentType.DNI,
      documentNumber: '123456789',
      email: 'john@example.com',
      password: 'Password123!',
      code: '@johndoe',
      phoneNumber: null,
      phoneCountryCode: null,
    };

    it('should register a new user successfully', async () => {
      const user = buildUser();
      const userType = buildUserType(user);

      prismaMock.user.findUnique.mockResolvedValueOnce(null); // email check
      prismaMock.user.create.mockResolvedValue(user);
      usersServiceMock.toUserType.mockReturnValue(userType);

      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('hashed-password');

      const result = await service.register(registerInput);

      expect(result).toEqual(userType);
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REGISTER_USER', userId: user.id }),
      );
    });

    it('checks the document is free before creating the user', async () => {
      usersServiceMock.assertDocumentAvailable.mockRejectedValue(
        new ConflictException('Another user with document DNI 123456789 already exists'),
      );

      await expect(service.register(registerInput)).rejects.toThrow(ConflictException);
      expect(usersServiceMock.assertDocumentAvailable).toHaveBeenCalledWith(
        registerInput.documentType,
        registerInput.documentNumber,
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the database rejects a duplicate user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('hashed-password');

      await expect(service.register(registerInput)).rejects.toThrow(
        new ConflictException('User already exists'),
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser());

      await expect(service.register(registerInput)).rejects.toThrow(ConflictException);
      await expect(service.register(registerInput)).rejects.toThrow('User already exists');
    });

    it('should throw ConflictException when provided code already exists', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'other-user-id' }); // code already taken

      const promise = service.register({ ...registerInput, code: '@taken1' });
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Code already exists');
    });

    it('should throw BadRequestException when user creation fails', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // code uniqueness
      prismaMock.user.create.mockRejectedValue(new Error('DB error'));

      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('hashed-password');

      const promise = service.register(registerInput);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Failed to create user');
    });
  });

  // -------------------------------------------------------------------------
  // signIn
  // -------------------------------------------------------------------------

  describe('signIn', () => {
    const signInInput = { email: 'john@example.com', password: 'Password123!' };

    it('should sign in successfully with valid credentials', async () => {
      const user = buildUser();

      prismaMock.user.findUnique.mockResolvedValue(user);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      const result = await service.signIn(signInInput);

      expect(result).toBe(MOCK_TOKEN);
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_USER', userId: user.id }),
      );
    });

    it('should throw BadRequestException when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.signIn(signInInput)).rejects.toThrow(BadRequestException);
      await expect(service.signIn(signInInput)).rejects.toThrow('Email or password is incorrect');
    });

    it('should throw BadRequestException when password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser());
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.signIn(signInInput)).rejects.toThrow(BadRequestException);
      await expect(service.signIn(signInInput)).rejects.toThrow('Email or password is incorrect');
    });

    it('should throw ForbiddenException when the account is deactivated', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser({ active: false }));
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.signIn(signInInput)).rejects.toThrow(
        new ForbiddenException(USER_DEACTIVATED_MESSAGE),
      );
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------

  describe('logout', () => {
    const logoutInput = { jti: 'token-jti', userId: 'user-id-1' };

    it('should logout successfully', async () => {
      const user = buildUser();
      const userType = buildUserType(user);

      prismaMock.user.findUnique.mockResolvedValue(user);
      usersServiceMock.toUserType.mockReturnValue(userType);
      prismaMock.revokedToken.upsert.mockResolvedValue({});

      await expect(service.logout(logoutInput)).resolves.toBeUndefined();

      expect(prismaMock.revokedToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jti: logoutInput.jti },
          create: expect.objectContaining({
            jti: logoutInput.jti,
            userId: logoutInput.userId,
          }) as unknown,
        }),
      );
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT_USER', userId: logoutInput.userId }),
      );
    });

    it('should do nothing when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.logout(logoutInput)).resolves.toBeUndefined();

      expect(prismaMock.revokedToken.upsert).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // recoverPassword
  // -------------------------------------------------------------------------

  describe('recoverPassword', () => {
    const recoverInput = { email: 'john@example.com', password: 'NewPassword123!' };

    it('should recover password successfully', async () => {
      const user = buildUser();

      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue({ ...user, password: 'new-hashed' });

      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('new-hashed');
      // new password is different from current
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      const result = await service.recoverPassword(recoverInput);

      expect(result).toBe(MOCK_TOKEN);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { password: 'new-hashed' },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { sessionsRevokedAt: expect.any(Date) },
      });
      expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(1);
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RECOVER_PASSWORD', userId: user.id }),
      );
    });

    it('should throw BadRequestException when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.recoverPassword(recoverInput)).rejects.toThrow(BadRequestException);
      await expect(service.recoverPassword(recoverInput)).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when new password equals the current password', async () => {
      const user = buildUser();

      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue(user);

      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('same-hashed');
      // same password
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.recoverPassword(recoverInput)).rejects.toThrow(BadRequestException);
      await expect(service.recoverPassword(recoverInput)).rejects.toThrow(
        'New password must be different from the current password',
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deleteAccount
  // -------------------------------------------------------------------------

  describe('deleteAccount', () => {
    const deleteInput = { userId: 'user-id-1', password: 'Password123!' };

    it('should deactivate the account, revoke all sessions and emit INACTIVATE_USER', async () => {
      const user = buildUser();

      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue({ ...user, active: false });
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.deleteAccount(deleteInput)).resolves.toBeUndefined();

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { active: false },
        omit: { password: true },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { sessionsRevokedAt: expect.any(Date) },
      });
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INACTIVATE_USER', userId: user.id, after: null }),
      );
    });

    it('should throw BadRequestException and change nothing when the password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser());
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.deleteAccount(deleteInput)).rejects.toThrow(
        new BadRequestException('Password is incorrect'),
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // recoverAccount
  // -------------------------------------------------------------------------

  describe('recoverAccount', () => {
    const recoverAccountInput = { email: 'john@example.com', password: 'Password123!' };

    it('should reactivate the account, return a token and emit REACTIVATE_USER', async () => {
      const user = buildUser({ active: false });

      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue({ ...user, active: true });
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      const result = await service.recoverAccount(recoverAccountInput);

      expect(result).toBe(MOCK_TOKEN);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { active: true },
        omit: { password: true },
      });
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REACTIVATE_USER', userId: user.id, before: null }),
      );
    });

    it('should throw BadRequestException when the credentials are wrong', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser({ active: false }));
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.recoverAccount(recoverAccountInput)).rejects.toThrow(
        new BadRequestException('Email or password is incorrect'),
      );
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the account is already active', async () => {
      prismaMock.user.findUnique.mockResolvedValue(buildUser({ active: true }));
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.recoverAccount(recoverAccountInput)).rejects.toThrow(
        new ConflictException('Account is already active'),
      );
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // suggestCodes
  // -------------------------------------------------------------------------

  describe('suggestCodes', () => {
    it('should return 6 unique code suggestions', async () => {
      // All codes are available
      prismaMock.user.findUnique.mockResolvedValue(null);

      const suggestions = await service.suggestCodes({ name: 'John', firstSurname: 'Doe' });

      expect(suggestions).toHaveLength(6);
      suggestions.forEach((s) => expect(s).toMatch(/^@/));
      const unique = new Set(suggestions);
      expect(unique.size).toBe(6);
    });

    it('should handle names with special characters', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const suggestions = await service.suggestCodes({ name: 'José', firstSurname: 'García' });

      expect(suggestions).toHaveLength(6);
      suggestions.forEach((s) => expect(s).toMatch(/^@/));
    });

    it('should fallback gracefully when seed codes are taken', async () => {
      // First 2 candidates per seed are taken, rest are available
      let callCount = 0;
      prismaMock.user.findUnique.mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount <= 4 ? { id: 'taken' } : null);
      });

      const suggestions = await service.suggestCodes({ name: 'John', firstSurname: 'Doe' });

      expect(suggestions).toHaveLength(6);
    });

    it('should still find distinct codes for long names whose base code is taken', async () => {
      // "mateo_taveraramirez" is 19 chars: retries used to be truncated back to the same code
      prismaMock.user.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
        Promise.resolve(where.code === '@mateo_taveraramirez' ? { id: 'taken' } : null),
      );

      const suggestions = await service.suggestCodes({
        name: 'Mateo',
        firstSurname: 'Taveraramirez',
      });

      expect(suggestions).toHaveLength(6);
      expect(new Set(suggestions).size).toBe(6);
      expect(suggestions).not.toContain('@mateo_taveraramirez');
      suggestions.forEach((s) => expect(s.length).toBeLessThanOrEqual(20));
    });

    it('should throw ConflictException when no unique suggestion can be found', async () => {
      // All candidates are taken
      prismaMock.user.findUnique.mockResolvedValue({ id: 'taken' });

      await expect(service.suggestCodes({ name: 'ab', firstSurname: 'cd' })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
