import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { CredentialsService } from '@/login/credentials.service';
import { LoginRepository } from '@/login/login.repository';
import * as hashUtil from '@/common/utils/hash.util';
import { buildUser } from '@/common/testing/factories/users.factory';
import { createLoginRepositoryMock } from '@/common/testing/mocks/login-repository.mock';

const EMAIL = 'john@example.com';
const PASSWORD = 'Password123!';
const USER_ID = 'user-id-1';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let loginRepoMock: ReturnType<typeof createLoginRepositoryMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    loginRepoMock = createLoginRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CredentialsService, { provide: LoginRepository, useValue: loginRepoMock }],
    }).compile();

    service = module.get(CredentialsService);
  });

  describe('validateByEmail', () => {
    it('returns the user when the password matches', async () => {
      const user = buildUser();
      loginRepoMock.findByEmail.mockResolvedValue(user);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.validateByEmail(EMAIL, PASSWORD)).resolves.toBe(user);
      expect(loginRepoMock.findByEmail).toHaveBeenCalledWith(EMAIL);
      expect(hashUtil.comparePassword).toHaveBeenCalledWith(PASSWORD, user.password);
    });

    it('returns inactive users too', async () => {
      const user = buildUser({ active: false });
      loginRepoMock.findByEmail.mockResolvedValue(user);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.validateByEmail(EMAIL, PASSWORD)).resolves.toBe(user);
    });

    it('throws BadRequestException when the email is unknown', async () => {
      loginRepoMock.findByEmail.mockResolvedValue(null);
      const compareSpy = jest.spyOn(hashUtil, 'comparePassword');

      await expect(service.validateByEmail(EMAIL, PASSWORD)).rejects.toThrow(
        new BadRequestException('Email or password is incorrect'),
      );
      expect(compareSpy).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the password is wrong', async () => {
      loginRepoMock.findByEmail.mockResolvedValue(buildUser());
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.validateByEmail(EMAIL, PASSWORD)).rejects.toThrow(
        new BadRequestException('Email or password is incorrect'),
      );
    });
  });

  describe('validateById', () => {
    it('returns the user when the password matches', async () => {
      const user = buildUser();
      loginRepoMock.findById.mockResolvedValue(user);
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(true);

      await expect(service.validateById(USER_ID, PASSWORD)).resolves.toBe(user);
      expect(loginRepoMock.findById).toHaveBeenCalledWith(USER_ID);
      expect(hashUtil.comparePassword).toHaveBeenCalledWith(PASSWORD, user.password);
    });

    it('throws BadRequestException when the user does not exist', async () => {
      loginRepoMock.findById.mockResolvedValue(null);
      const compareSpy = jest.spyOn(hashUtil, 'comparePassword');

      await expect(service.validateById(USER_ID, PASSWORD)).rejects.toThrow(
        new BadRequestException('Password is incorrect'),
      );
      expect(compareSpy).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the password is wrong', async () => {
      loginRepoMock.findById.mockResolvedValue(buildUser());
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.validateById(USER_ID, PASSWORD)).rejects.toThrow(
        new BadRequestException('Password is incorrect'),
      );
    });
  });
});
