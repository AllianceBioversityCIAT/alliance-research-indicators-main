import { formatPersonName } from './name-format.util';

describe('name-format.util', () => {
  describe('formatPersonName', () => {
    it('should format each word with title case', () => {
      expect(formatPersonName('JOHN DOE')).toBe('John Doe');
      expect(formatPersonName('john doe')).toBe('John Doe');
      expect(formatPersonName('JoHn DoE')).toBe('John Doe');
    });

    it('should trim and collapse extra whitespace', () => {
      expect(formatPersonName('  maria   elena  ')).toBe('Maria Elena');
    });

    it('should return empty string for nullish or blank values', () => {
      expect(formatPersonName(null)).toBe('');
      expect(formatPersonName(undefined)).toBe('');
      expect(formatPersonName('')).toBe('');
      expect(formatPersonName('   ')).toBe('');
    });

    it('should preserve single-word names', () => {
      expect(formatPersonName('ana')).toBe('Ana');
    });
  });
});
