import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from '@/auth/auth.service';
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

let prismaMock: ReturnType<typeof createPrismaMock>;
let jwtServiceMock: ReturnType<typeof createJwtServiceMock>;
let usersServiceMock: ReturnType<typeof createUsersServiceMock>;
let statusesServiceMock: ReturnType<typeof createStatusesServiceMock>;
let appEventEmitterMock: ReturnType<typeof createAppEventEmitterMock>;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.restoreAllMocks();

    prismaMock = createPrismaMock();
    jwtServiceMock = createJwtServiceMock(MOCK_TOKEN);
    usersServiceMock = createUsersServiceMock();
    statusesServiceMock = createStatusesServiceMock();
    appEventEmitterMock = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: StatusesService, useValue: statusesServiceMock },
        { provide: AppEventEmitterService, useValue: appEventEmitterMock },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe('register', () => {
    const registerInput = {
      name: 'John',
      lastName: 'Doe',
      documentType: DocumentType.DNI,
      documentNumber: '123456789',
      email: 'john@example.com',
      password: 'Password123!',
      code: undefined,
      phoneNumber: null,
      phoneCountryCode: null,
    };

    it('should register a new user successfully (auto-generated code)', async () => {
      const user = buildUser();
      const userType = buildUserType(user);

      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // code uniqueness check
      prismaMock.user.create.mockResolvedValue(user);
      usersServiceMock.createResponse.mockReturnValue(userType);

      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('hashed-password');

      const result = await service.register({ ...registerInput, code: undefined });

      expect(result.token).toBe(MOCK_TOKEN);
      expect(result.user).toEqual(userType);
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
      expect(statusesServiceMock.createDefaultStatuses).toHaveBeenCalledWith(user.id);
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REGISTER_USER', userId: user.id }),
      );
    });

    it('should register a new user successfully with an explicit code', async () => {
      const user = buildUser({ code: '@custom1' });
      const userType = buildUserType(user);

      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // code uniqueness check (ensureCodeIsAvailable → codeExists)
      prismaMock.user.create.mockResolvedValue(user);
      usersServiceMock.createResponse.mockReturnValue(userType);

      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('hashed-password');

      const result = await service.register({ ...registerInput, code: '@custom1' });

      expect(result.token).toBe(MOCK_TOKEN);
      expect(result.user).toEqual(userType);
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

    it('should throw ConflictException when unique code cannot be generated after 20 attempts', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValue({ id: 'some-user' }); // all code candidates taken

      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('hashed-password');

      await expect(service.register({ ...registerInput, code: undefined })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // signIn
  // -------------------------------------------------------------------------

  describe('signIn', () => {
    const signInInput = { email: 'john@example.com', password: 'Password123!' };

    it('should sign in successfully with valid credentials', async () => {
      const user = buildUser();
      const userType = buildUserType(user);

      prismaMock.user.findUnique.mockResolvedValue(user);
      usersServiceMock.createResponse.mockReturnValue(userType);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      const result = await service.signIn(signInInput);

      expect(result.token).toBe(MOCK_TOKEN);
      expect(result.user).toEqual(userType);
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
      usersServiceMock.createResponse.mockReturnValue(userType);
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

    it('should throw BadRequestException when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.logout(logoutInput)).rejects.toThrow(BadRequestException);
      await expect(service.logout(logoutInput)).rejects.toThrow('User not found');
    });
  });

  // -------------------------------------------------------------------------
  // recoverPassword
  // -------------------------------------------------------------------------

  describe('recoverPassword', () => {
    const recoverInput = { email: 'john@example.com', password: 'NewPassword123!' };

    it('should recover password successfully', async () => {
      const user = buildUser();
      const userType = buildUserType(user);

      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue({ ...user, password: 'new-hashed' });
      usersServiceMock.createResponse.mockReturnValue(userType);

      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('new-hashed');
      // new password is different from current
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      const result = await service.recoverPassword(recoverInput);

      expect(result.token).toBe(MOCK_TOKEN);
      expect(result.user).toEqual(userType);
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
    });
  });

  // -------------------------------------------------------------------------
  // suggestCodes
  // -------------------------------------------------------------------------

  describe('suggestCodes', () => {
    it('should return 6 unique code suggestions', async () => {
      // All codes are available
      prismaMock.user.findUnique.mockResolvedValue(null);

      const suggestions = await service.suggestCodes({ name: 'John', lastName: 'Doe' });

      expect(suggestions).toHaveLength(6);
      suggestions.forEach((s) => expect(s).toMatch(/^@/));
      const unique = new Set(suggestions);
      expect(unique.size).toBe(6);
    });

    it('should handle names with special characters', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const suggestions = await service.suggestCodes({ name: 'José', lastName: 'García' });

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

      const suggestions = await service.suggestCodes({ name: 'John', lastName: 'Doe' });

      expect(suggestions).toHaveLength(6);
    });

    it('should throw ConflictException when no unique suggestion can be found', async () => {
      // All candidates are taken
      prismaMock.user.findUnique.mockResolvedValue({ id: 'taken' });

      await expect(service.suggestCodes({ name: 'ab', lastName: 'cd' })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
