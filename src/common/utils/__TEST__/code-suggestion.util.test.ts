import {
  generateRandomNumericSuffix,
  normalizeCodeToken,
  toValidCodeLength,
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
  });

  describe('generateRandomNumericSuffix', () => {
    it('generates a numeric suffix', () => {
      expect(generateRandomNumericSuffix('john')).toMatch(/^\d+$/);
    });
  });
});
