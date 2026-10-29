import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { IsUserCode } from '@/users/decorators/is-user-code.decorator';
import { ChangeCodeInput } from '@/users/dto/change-code.input';

class CodeSample {
  @IsUserCode()
  code: unknown;
}

const VALID_CODE = '@Mateo_1';
const LOWERCASED_CODE = '@mateo_1';
const MIN_MESSAGE = 'code must be at least 6 characters long';
const MAX_MESSAGE = 'code must be at most 20 characters long';
const PATTERN_MESSAGE = 'code must start with @ and contain only letters, numbers, and _';

const validateCode = async <T extends object>(cls: new () => T, code: unknown) => {
  const instance = plainToInstance(cls, { code });
  const errors = await validate(instance);
  return { instance, messages: errors.flatMap((error) => Object.values(error.constraints ?? {})) };
};

describe('IsUserCode', () => {
  const run = (code: unknown) => validateCode(CodeSample, code);

  it('accepts a valid code and lowercases it', async () => {
    const { instance, messages } = await run(VALID_CODE);

    expect(messages).toEqual([]);
    expect(instance.code).toBe(LOWERCASED_CODE);
  });

  it('rejects an empty code', async () => {
    const { messages } = await run('');

    expect(messages).toContain('code should not be empty');
  });

  it('rejects a non-string code without throwing', async () => {
    const NON_STRING_CODE = 123456;

    const { messages } = await run(NON_STRING_CODE);

    expect(messages).toContain('code must be a string');
  });

  it('rejects a code shorter than the minimum', async () => {
    const { messages } = await run('@abcd');

    expect(messages).toContain(MIN_MESSAGE);
  });

  it('rejects a code longer than the maximum', async () => {
    const { messages } = await run(`@${'a'.repeat(20)}`);

    expect(messages).toContain(MAX_MESSAGE);
  });

  it('rejects a code that does not start with @', async () => {
    const { messages } = await run('mateo_1');

    expect(messages).toContain(PATTERN_MESSAGE);
  });

  it.each([
    ['a space', '@mateo 1'],
    ['a hyphen', '@mateo-1'],
    ['an accent', '@matéo_1'],
  ])('rejects a code with %s', async (_label, code) => {
    const { messages } = await run(code);

    expect(messages).toEqual([PATTERN_MESSAGE]);
  });
});

describe('ChangeCodeInput', () => {
  it('accepts a valid code and lowercases it', async () => {
    const { instance, messages } = await validateCode(ChangeCodeInput, VALID_CODE);

    expect(messages).toEqual([]);
    expect(instance.code).toBe(LOWERCASED_CODE);
  });

  it('rejects an invalid code', async () => {
    const { messages } = await validateCode(ChangeCodeInput, 'nope');

    expect(messages).toEqual(expect.arrayContaining([MIN_MESSAGE, PATTERN_MESSAGE]));
  });
});
