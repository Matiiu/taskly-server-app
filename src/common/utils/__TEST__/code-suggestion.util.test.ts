import {
  generateRandomNumericSuffix,
  normalizeCodeToken,
  toValidCodeLength,
  toValidCodeWithSuffix,
} from '@/common/utils/code-suggestion.util';

describe('code-suggestion.util', () => {
  describe('normalizeCodeToken', () => {
    it('removes accents, symbols, and lowercases the value', () => {
      expect(normalizeCodeToken(' José García! ')).toBe('josegarcia');
    });
  });

  describe('toValidCodeLength', () => {
    it('normalizes the code and adds the prefix', () => {
      expect(toValidCodeLength('John_Doe')).toBe('@john_doe');
    });

    it('pads short values to the minimum code length', () => {
      expect(toValidCodeLength('ab')).toMatch(/^@/);
      expect(toValidCodeLength('ab')).toBe('@ab000');
    });

    it('truncates long values to the maximum code length', () => {
      expect(toValidCodeLength('maria_fernanda_gonzalez')).toBe('@maria_fernanda_gonz');
    });
  });

  describe('toValidCodeWithSuffix', () => {
    it('appends the suffix to short seeds untouched', () => {
      expect(toValidCodeWithSuffix('ana_ruiz', '1234')).toBe('@ana_ruiz_1234');
    });

    it('trims long seeds so the suffix is kept and the code fits 20 characters', () => {
      const code = toValidCodeWithSuffix('maria_fernanda_gonzalez', '1234');

      expect(code).toBe('@maria_fernanda_1234');
      expect(code).toHaveLength(20);
    });

    it('gives a different code per suffix even for seeds at the max length', () => {
      // 19 chars: appending then truncating used to cut the suffix off every time
      const seed = 'mateo_taveraramirez';

      expect(toValidCodeWithSuffix(seed, '1234')).not.toBe(toValidCodeWithSuffix(seed, '5678'));
    });

    it('does not leave a double separator when the trim ends on "_"', () => {
      // Trimmed to 14 chars this seed is "abcdefghijklm_"
      expect(toValidCodeWithSuffix('abcdefghijklm_nopq', '1234')).toBe('@abcdefghijklm_1234');
    });
  });

  describe('generateRandomNumericSuffix', () => {
    it('generates a 4-digit numeric suffix', () => {
      for (let i = 0; i < 50; i++) {
        expect(generateRandomNumericSuffix()).toMatch(/^\d{4}$/);
      }
    });
  });
});
