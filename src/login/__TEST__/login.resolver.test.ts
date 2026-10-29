import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';

import { LoginResolver } from '@/login/login.resolver';
import { LoginService } from '@/login/login.service';
import { RegistrationService } from '@/login/registration.service';
import { AccountService } from '@/login/account.service';
import { DocumentType } from 'generated/prisma/enums';
import { buildUser, buildUserType } from '@/common/testing/factories/users.factory';
import { MOCK_TOKEN } from '@/common/testing/constants';
import { createLoginServiceMock } from '@/common/testing/mocks/login-service.mock';
import { createRegistrationServiceMock } from '@/common/testing/mocks/registration-service.mock';
import { createAccountServiceMock } from '@/common/testing/mocks/account-service.mock';

let loginServiceMock: ReturnType<typeof createLoginServiceMock>;
let registrationServiceMock: ReturnType<typeof createRegistrationServiceMock>;
let accountServiceMock: ReturnType<typeof createAccountServiceMock>;

describe('LoginResolver', () => {
  let resolver: LoginResolver;

  beforeEach(async () => {
    jest.restoreAllMocks();

    loginServiceMock = createLoginServiceMock();
    registrationServiceMock = createRegistrationServiceMock();
    accountServiceMock = createAccountServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginResolver,
        { provide: LoginService, useValue: loginServiceMock },
        { provide: RegistrationService, useValue: registrationServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<LoginResolver>(LoginResolver);
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

      registrationServiceMock.register.mockResolvedValue(user);

      const result = await resolver.register(input);

      expect(registrationServiceMock.register).toHaveBeenCalledWith(input);
      expect(result).toEqual({
        user,
        message: 'User John Doe registered successfully',
      });
    });
  });

  describe('signIn', () => {
    it('should return the token and success message', async () => {
      const input = { email: 'john@example.com', password: 'Password123!' };

      loginServiceMock.signIn.mockResolvedValue(MOCK_TOKEN);

      const result = await resolver.signIn(input);

      expect(loginServiceMock.signIn).toHaveBeenCalledWith(input);
      expect(result).toEqual({
        token: MOCK_TOKEN,
        message: 'signed in successfully',
      });
    });
  });

  describe('recoverPassword', () => {
    it('should return the token and recovery message', async () => {
      const input = { email: 'john@example.com', password: 'NewPassword123!' };

      loginServiceMock.recoverPassword.mockResolvedValue(MOCK_TOKEN);

      const result = await resolver.recoverPassword(input);

      expect(loginServiceMock.recoverPassword).toHaveBeenCalledWith(input);
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

      registrationServiceMock.suggestCodes.mockResolvedValue(codes);

      const result = await resolver.suggestCodes(input);

      expect(registrationServiceMock.suggestCodes).toHaveBeenCalledWith(input);
      expect(result).toEqual(codes);
    });
  });

  describe('logout', () => {
    it('should call the service and return true', async () => {
      loginServiceMock.logout.mockResolvedValue(undefined);

      const result = await resolver.logout('token-jti', 'user-id-1');

      expect(loginServiceMock.logout).toHaveBeenCalledWith({
        jti: 'token-jti',
        userId: 'user-id-1',
      });
      expect(result).toBe(true);
    });
  });

  describe('deleteAccount', () => {
    it('should call the service with the user and password and return a message', async () => {
      accountServiceMock.deleteAccount.mockResolvedValue(undefined);

      const result = await resolver.deleteAccount('user-id-1', { password: 'Password123!' });

      expect(accountServiceMock.deleteAccount).toHaveBeenCalledWith({
        userId: 'user-id-1',
        password: 'Password123!',
      });
      expect(result).toEqual({ message: 'Account deleted successfully' });
    });
  });

  describe('recoverAccount', () => {
    it('should return the token and recovery message', async () => {
      const input = { email: 'john@example.com', password: 'Password123!' };

      accountServiceMock.recoverAccount.mockResolvedValue(MOCK_TOKEN);

      const result = await resolver.recoverAccount(input);

      expect(accountServiceMock.recoverAccount).toHaveBeenCalledWith(input);
      expect(result).toEqual({ token: MOCK_TOKEN, message: 'Account recovered successfully' });
    });
  });
});
