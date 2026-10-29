import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import type { Workspace } from 'generated/prisma/client';

import { RegistrationService } from '@/login/registration.service';
import { LoginRepository } from '@/login/login.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { WorkspaceService } from '@/workspace/workspace.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import * as hashUtil from '@/common/utils/hash.util';
import { AuthProvider, DocumentType } from 'generated/prisma/enums';
import { buildSafeUser, buildUser, buildUserType } from '@/common/testing/factories/users.factory';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createUsersServiceMock } from '@/common/testing/mocks/users-service.mock';
import { createLoginRepositoryMock } from '@/common/testing/mocks/login-repository.mock';
import { createWorkspaceServiceMock } from '@/common/testing/mocks/workspace-service.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';

const HASHED_PASSWORD = 'hashed-password';
const SUGGESTIONS_COUNT = 6;

describe('RegistrationService', () => {
  let service: RegistrationService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let loginRepoMock: ReturnType<typeof createLoginRepositoryMock>;
  let usersServiceMock: ReturnType<typeof createUsersServiceMock>;
  let workspaceServiceMock: ReturnType<typeof createWorkspaceServiceMock>;
  let appEventEmitterMock: ReturnType<typeof createAppEventEmitterMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();

    prismaMock = createPrismaMock();
    // Interactive transactions: run the callback against the same mock as the tx client.
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock) as never,
    );
    loginRepoMock = createLoginRepositoryMock();
    usersServiceMock = createUsersServiceMock();
    workspaceServiceMock = createWorkspaceServiceMock();
    appEventEmitterMock = createAppEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LoginRepository, useValue: loginRepoMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: WorkspaceService, useValue: workspaceServiceMock },
        { provide: AppEventEmitterService, useValue: appEventEmitterMock },
      ],
    }).compile();

    service = module.get(RegistrationService);
  });

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

    const workspace = { id: 'workspace-id-1', ownerId: 'user-id-1' } as Workspace;

    beforeEach(() => {
      loginRepoMock.findByEmail.mockResolvedValue(null);
      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue(HASHED_PASSWORD);
    });

    it('creates the user and workspace in one transaction and notifies after the commit', async () => {
      const user = buildSafeUser();
      const userType = buildUserType(user);
      usersServiceMock.create.mockResolvedValue(user);
      workspaceServiceMock.createDefault.mockResolvedValue(workspace);
      usersServiceMock.toUserType.mockReturnValue(userType);

      const result = await service.register(registerInput);

      expect(result).toEqual(userType);
      expect(loginRepoMock.findByEmail).toHaveBeenCalledWith(registerInput.email);
      expect(usersServiceMock.assertDocumentAvailable).toHaveBeenCalledWith(
        registerInput.documentType,
        registerInput.documentNumber,
      );
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(usersServiceMock.create).toHaveBeenCalledWith(
        { ...registerInput, password: HASHED_PASSWORD, source: AuthProvider.LOCAL },
        prismaMock,
      );
      expect(workspaceServiceMock.createDefault).toHaveBeenCalledWith(user.id, prismaMock);
      expect(workspaceServiceMock.notifyCreated).toHaveBeenCalledWith(workspace, user.id);
      expect(usersServiceMock.toUserType).toHaveBeenCalledWith(user);
      expect(appEventEmitterMock.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REGISTER_USER', userId: user.id, entity: 'User' }),
      );
    });

    it('does not audit nor notify when the workspace creation fails', async () => {
      usersServiceMock.create.mockResolvedValue(buildSafeUser());
      workspaceServiceMock.createDefault.mockRejectedValue(new Error('DB error'));

      await expect(service.register(registerInput)).rejects.toThrow(
        new BadRequestException('Failed to create user'),
      );
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
      expect(workspaceServiceMock.notifyCreated).not.toHaveBeenCalled();
    });

    it('checks the document is free before creating the user', async () => {
      usersServiceMock.assertDocumentAvailable.mockRejectedValue(
        new ConflictException('Another user with document DNI 123456789 already exists'),
      );

      await expect(service.register(registerInput)).rejects.toThrow(ConflictException);
      expect(usersServiceMock.create).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the database rejects a duplicate user', async () => {
      usersServiceMock.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.register(registerInput)).rejects.toThrow(
        new ConflictException('User already exists'),
      );
      expect(appEventEmitterMock.emitAuditLog).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      loginRepoMock.findByEmail.mockResolvedValue(buildUser());

      await expect(service.register(registerInput)).rejects.toThrow(
        new ConflictException('User already exists'),
      );
      expect(usersServiceMock.assertDocumentAvailable).not.toHaveBeenCalled();
      expect(usersServiceMock.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user creation fails', async () => {
      usersServiceMock.create.mockRejectedValue(new Error('DB error'));

      await expect(service.register(registerInput)).rejects.toThrow(
        new BadRequestException('Failed to create user'),
      );
    });
  });

  describe('suggestCodes', () => {
    beforeEach(() => {
      // All codes are available unless a test says otherwise
      usersServiceMock.existsByCode.mockResolvedValue(false);
    });

    it('should return 6 unique code suggestions', async () => {
      const suggestions = await service.suggestCodes({ name: 'John', firstSurname: 'Doe' });

      expect(suggestions).toHaveLength(SUGGESTIONS_COUNT);
      suggestions.forEach((s) => expect(s).toMatch(/^@/));
      expect(new Set(suggestions)).toHaveProperty('size', SUGGESTIONS_COUNT);
    });

    it('should also seed from the second surname when given', async () => {
      const suggestions = await service.suggestCodes({
        name: 'John',
        firstSurname: 'Doe',
        secondSurname: 'Smith',
      });

      expect(suggestions).toHaveLength(SUGGESTIONS_COUNT);
      expect(suggestions).toContain('@john_smith');
    });

    it('should handle names with special characters', async () => {
      const suggestions = await service.suggestCodes({ name: 'José', firstSurname: 'García' });

      expect(suggestions).toHaveLength(SUGGESTIONS_COUNT);
      suggestions.forEach((s) => expect(s).toMatch(/^@/));
    });

    it('should fallback gracefully when seed codes are taken', async () => {
      // First 4 lookups are taken, the rest are available
      let callCount = 0;
      usersServiceMock.existsByCode.mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount <= 4);
      });

      const suggestions = await service.suggestCodes({ name: 'John', firstSurname: 'Doe' });

      expect(suggestions).toHaveLength(SUGGESTIONS_COUNT);
    });

    it('should still find distinct codes for long names whose base code is taken', async () => {
      // "mateo_taveraramirez" is 19 chars: retries used to be truncated back to the same code
      usersServiceMock.existsByCode.mockImplementation((code: string) =>
        Promise.resolve(code === '@mateo_taveraramirez'),
      );

      const suggestions = await service.suggestCodes({
        name: 'Mateo',
        firstSurname: 'Taveraramirez',
      });

      expect(suggestions).toHaveLength(SUGGESTIONS_COUNT);
      expect(new Set(suggestions)).toHaveProperty('size', SUGGESTIONS_COUNT);
      expect(suggestions).not.toContain('@mateo_taveraramirez');
      suggestions.forEach((s) => expect(s.length).toBeLessThanOrEqual(20));
    });

    it('should throw ConflictException when no unique suggestion can be found', async () => {
      usersServiceMock.existsByCode.mockResolvedValue(true);

      await expect(service.suggestCodes({ name: 'ab', firstSurname: 'cd' })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
