import { plainToInstance } from 'class-transformer';

import {
  NormalizeName,
  ToLowerCase,
  Trim,
  TrimLowerCase,
  TrimToNull,
} from '@/common/transforms/string.transforms';

class NameDto {
  @NormalizeName()
  name?: unknown;
}

class TrimDto {
  @Trim()
  value?: unknown;
}

class TrimToNullDto {
  @TrimToNull()
  value?: unknown;
}

class TrimLowerCaseDto {
  @TrimLowerCase()
  value?: unknown;
}

class ToLowerCaseDto {
  @ToLowerCase()
  value?: unknown;
}

const normalize = (name: unknown) => plainToInstance(NameDto, { name }).name;

describe('NormalizeName', () => {
  it.each([
    ['mateo', 'Mateo'],
    ['tavera', 'Tavera'],
    ['  maría   DE LA  cruz ', 'María de la Cruz'],
    ['de la cruz', 'De la Cruz'],
    ['jean-pierre', 'Jean-Pierre'],
    ["o'neil", "O'Neil"],
    ['o’neil', 'O’Neil'],
    ['VAN DER berg', 'Van der Berg'],
    ['ÑOÑO', 'Ñoño'],
    ['álvarez-ÑÚÑEZ', 'Álvarez-Ñúñez'],
  ])('normalizes "%s" to "%s"', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it.each([['   '], ['']])('returns null when the value is blank (%j)', (input) => {
    expect(normalize(input)).toBeNull();
  });

  it.each([[null], [undefined], [42]])('returns non-string %p unchanged', (input) => {
    expect(normalize(input)).toBe(input);
  });
});

describe('Trim', () => {
  it('trims strings', () => {
    expect(plainToInstance(TrimDto, { value: '  a  ' }).value).toBe('a');
  });

  it('returns non-string values unchanged', () => {
    expect(plainToInstance(TrimDto, { value: 5 }).value).toBe(5);
  });
});

describe('TrimToNull', () => {
  it('trims strings', () => {
    expect(plainToInstance(TrimToNullDto, { value: ' a ' }).value).toBe('a');
  });

  it('returns null when the string is blank', () => {
    expect(plainToInstance(TrimToNullDto, { value: '  ' }).value).toBeNull();
  });

  it('returns non-string values unchanged', () => {
    expect(plainToInstance(TrimToNullDto, { value: 5 }).value).toBe(5);
  });
});

describe('TrimLowerCase', () => {
  it('trims and lowercases strings', () => {
    expect(plainToInstance(TrimLowerCaseDto, { value: ' Mateo@X.com ' }).value).toBe('mateo@x.com');
  });

  it('returns non-string values unchanged', () => {
    expect(plainToInstance(TrimLowerCaseDto, { value: 5 }).value).toBe(5);
  });
});

describe('ToLowerCase', () => {
  it('lowercases strings', () => {
    expect(plainToInstance(ToLowerCaseDto, { value: 'AbC' }).value).toBe('abc');
  });

  it.each([[null], [undefined], [42]])('returns non-string %p unchanged', (input) => {
    expect(plainToInstance(ToLowerCaseDto, { value: input }).value).toBe(input);
  });
});
