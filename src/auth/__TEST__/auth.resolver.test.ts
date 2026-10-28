import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { AuthResolver } from '@/auth/auth.resolver';
import { AuthService } from '@/auth/auth.service';
import { DocumentType } from 'generated/prisma/enums';
import { buildUser, buildUserType } from '@/common/testing/factories/users.factory';
import { MOCK_TOKEN } from '@/common/testing/constants';
import { createAuthServiceMock } from '@/common/testing/mocks/auth-service.mock';

let authServiceMock: ReturnType<typeof createAuthServiceMock>;

describe('AuthResolver', () => {
  let resolver: AuthResolver;

  beforeEach(async () => {
    jest.restoreAllMocks();

    authServiceMock = createAuthServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthResolver, { provide: AuthService, useValue: authServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<AuthResolver>(AuthResolver);
  });

  describe('register', () => {
    it('should return the user and success message', async () => {
      const user = buildUserType(buildUser());
      const input = {
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

      authServiceMock.register.mockResolvedValue(user);

      const result = await resolver.register(input);

      expect(authServiceMock.register).toHaveBeenCalledWith(input);
      expect(result).toEqual({
        user,
        message: 'User John Doe registered successfully',
      });
    });
  });

  describe('signIn', () => {
    it('should return the token and success message', async () => {
      const input = { email: 'john@example.com', password: 'Password123!' };

      authServiceMock.signIn.mockResolvedValue(MOCK_TOKEN);

      const result = await resolver.signIn(input);

      expect(authServiceMock.signIn).toHaveBeenCalledWith(input);
      expect(result).toEqual({
        token: MOCK_TOKEN,
        message: 'signed in successfully',
      });
    });
  });

  describe('recoverPassword', () => {
    it('should return the token and recovery message', async () => {
      const input = { email: 'john@example.com', password: 'NewPassword123!' };

      authServiceMock.recoverPassword.mockResolvedValue(MOCK_TOKEN);

      const result = await resolver.recoverPassword(input);

      expect(authServiceMock.recoverPassword).toHaveBeenCalledWith(input);
      expect(result).toEqual({
        token: MOCK_TOKEN,
        message: 'Password recovered successfully',
      });
    });
  });

  describe('suggestCodes', () => {
    it('should return the suggested codes from the service', async () => {
      const codes = ['@john_doe', '@doe_john', '@john_1234'];
      const input = { name: 'John', firstSurname: 'Doe' };

      authServiceMock.suggestCodes.mockResolvedValue(codes);

      const result = await resolver.suggestCodes(input);

      expect(authServiceMock.suggestCodes).toHaveBeenCalledWith(input);
      expect(result).toEqual(codes);
    });
  });

  describe('logout', () => {
    it('should call the service and return true', async () => {
      authServiceMock.logout.mockResolvedValue(undefined);

      const result = await resolver.logout('token-jti', 'user-id-1');

      expect(authServiceMock.logout).toHaveBeenCalledWith({
        jti: 'token-jti',
        userId: 'user-id-1',
      });
      expect(result).toBe(true);
    });
  });

  describe('deleteAccount', () => {
    it('should call the service with the user and password and return a message', async () => {
      authServiceMock.deleteAccount.mockResolvedValue(undefined);

      const result = await resolver.deleteAccount('user-id-1', { password: 'Password123!' });

      expect(authServiceMock.deleteAccount).toHaveBeenCalledWith({
        userId: 'user-id-1',
        password: 'Password123!',
      });
      expect(result).toEqual({ message: 'Account deleted successfully' });
    });
  });

  describe('recoverAccount', () => {
    it('should return the token and recovery message', async () => {
      const input = { email: 'john@example.com', password: 'Password123!' };

      authServiceMock.recoverAccount.mockResolvedValue(MOCK_TOKEN);

      const result = await resolver.recoverAccount(input);

      expect(authServiceMock.recoverAccount).toHaveBeenCalledWith(input);
      expect(result).toEqual({ token: MOCK_TOKEN, message: 'Account recovered successfully' });
    });
  });
});
