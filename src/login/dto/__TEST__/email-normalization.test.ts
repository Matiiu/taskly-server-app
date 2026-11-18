import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DocumentType } from 'generated/prisma/enums';

import { RegisterInput } from '@/login/dto/register.input';
import { SignInInput } from '@/login/dto/sign-in.input';
import { RequestPasswordResetInput } from '@/login/dto/request-password-reset.input';
import { ResetPasswordInput } from '@/login/dto/reset-password.input';
import { RecoverAccountInput } from '@/login/dto/recover-account.input';
import { UpdateUserInput } from '@/users/dto/update-user.type';

const RAW_EMAIL = '  Mateo@Gmail.COM ';
const NORMALIZED_EMAIL = 'mateo@gmail.com';
const NON_STRING_EMAIL = 123;
const STRONG_PASSWORD = 'Str0ng!Passw0rd#';

const registerPlain = {
  name: 'Mateo',
  firstSurname: 'Tavera',
  password: STRONG_PASSWORD,
  documentType: DocumentType.DNI,
  documentNumber: '123456789',
  code: 'ABC123',
};

type InputCase = {
  name: string;
  cls: new () => { email?: string };
  plain: Record<string, unknown>;
};

const cases: InputCase[] = [
  { name: 'RegisterInput', cls: RegisterInput, plain: registerPlain },
  { name: 'SignInInput', cls: SignInInput, plain: { password: STRONG_PASSWORD } },
  { name: 'RequestPasswordResetInput', cls: RequestPasswordResetInput, plain: {} },
  { name: 'RecoverAccountInput', cls: RecoverAccountInput, plain: { password: STRONG_PASSWORD } },
  { name: 'UpdateUserInput', cls: UpdateUserInput, plain: {} },
];

describe('email normalization in inputs', () => {
  describe.each(cases)('$name', ({ cls, plain }) => {
    it('trims and lowercases the email', () => {
      const instance = plainToInstance(cls, { ...plain, email: RAW_EMAIL });

      expect(instance.email).toBe(NORMALIZED_EMAIL);
    });

    it('rejects a non-string email with a validation error instead of throwing', async () => {
      const instance = plainToInstance(cls, { ...plain, email: NON_STRING_EMAIL });

      const errors = await validate(instance);

      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
  });
});

describe('ResetPasswordInput', () => {
  const valid = { token: 'reset-token', newPassword: 'Str0ng!Passw0rd' };

  const failedProperties = async (plain: Record<string, unknown>) =>
    (await validate(plainToInstance(ResetPasswordInput, plain))).map((e) => e.property);

  it('accepts a token and a strong password', async () => {
    await expect(failedProperties(valid)).resolves.toEqual([]);
  });

  it('rejects an empty token', async () => {
    await expect(failedProperties({ ...valid, token: '' })).resolves.toContain('token');
  });

  it('rejects a non-string token', async () => {
    await expect(failedProperties({ ...valid, token: 123 })).resolves.toContain('token');
  });

  it('rejects a weak password', async () => {
    await expect(failedProperties({ ...valid, newPassword: 'weak' })).resolves.toContain(
      'newPassword',
    );
  });
});
