import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { IsStrongPassword } from '@/login/decorators/is-strong-password.decorator';
import { ChangePasswordInput } from '@/login/dto/change-password.input';

class PasswordSample {
  @IsStrongPassword()
  newPassword: unknown;
}

const VALID_PASSWORD = 'Password1!';
const WEAK_PASSWORD = 'abc';
const LENGTH_MIN_MESSAGE = 'newPassword must be at least 8 characters long';
const LENGTH_MAX_MESSAGE = 'newPassword must be at most 30 characters long';
const PATTERN_MESSAGE =
  'newPassword must contain at least one uppercase letter, one lowercase letter, one number, and one special character';

const messagesFor = async <T extends object>(cls: new () => T, value: Record<string, unknown>) => {
  const errors = await validate(plainToInstance(cls, value));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
};

describe('IsStrongPassword', () => {
  const messages = (newPassword: unknown) => messagesFor(PasswordSample, { newPassword });

  it('accepts a password that meets every rule', async () => {
    await expect(messages(VALID_PASSWORD)).resolves.toEqual([]);
  });

  it('rejects an empty password', async () => {
    const result = await messages('');

    expect(result).toContain('newPassword should not be empty');
  });

  it('rejects a non-string password', async () => {
    const result = await messages(12345678);

    expect(result).toContain('newPassword must be a string');
  });

  it('rejects a password that is too short', async () => {
    const result = await messages('Pa1!');

    expect(result).toContain(LENGTH_MIN_MESSAGE);
  });

  it('rejects a password that is too long', async () => {
    const result = await messages(`Pa1!${'a'.repeat(30)}`);

    expect(result).toContain(LENGTH_MAX_MESSAGE);
  });

  it.each([
    ['uppercase letter', 'password1!'],
    ['lowercase letter', 'PASSWORD1!'],
    ['number', 'Password!!'],
    ['special character', 'Password11'],
  ])('rejects a password without %s', async (_name, password) => {
    const result = await messages(password);

    expect(result).toEqual([PATTERN_MESSAGE]);
  });
});

describe('ChangePasswordInput', () => {
  const validate_ = (value: Record<string, unknown>) => messagesFor(ChangePasswordInput, value);

  it('accepts a weak currentPassword because only the service checks it', async () => {
    await expect(
      validate_({ currentPassword: WEAK_PASSWORD, newPassword: VALID_PASSWORD }),
    ).resolves.toEqual([]);
  });

  it('rejects an empty currentPassword', async () => {
    const result = await validate_({ currentPassword: '', newPassword: VALID_PASSWORD });

    expect(result).toContain('currentPassword should not be empty');
  });

  it('rejects a weak newPassword', async () => {
    const result = await validate_({ currentPassword: WEAK_PASSWORD, newPassword: WEAK_PASSWORD });

    expect(result).toContain(LENGTH_MIN_MESSAGE);
    expect(result).toContain(PATTERN_MESSAGE);
  });
});
