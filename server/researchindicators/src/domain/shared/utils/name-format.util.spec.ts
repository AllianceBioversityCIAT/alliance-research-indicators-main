import { formatLastFirstName, formatPersonName } from './name-format.util';

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

  describe('formatLastFirstName', () => {
    it('puts the first name before the last name, in title case', () => {
      expect(formatLastFirstName('ALVAREZ, MARIA')).toBe('Maria Alvarez');
      expect(formatLastFirstName('VAN ETTEN, JACOB')).toBe('Jacob Van Etten');
    });

    it('only title-cases a name without a comma', () => {
      expect(formatLastFirstName('JOHN DOE')).toBe('John Doe');
      expect(formatLastFirstName('DOE,')).toBe('Doe');
    });

    it('returns empty string for nullish or blank values', () => {
      expect(formatLastFirstName(null)).toBe('');
      expect(formatLastFirstName('  ')).toBe('');
    });
  });
});
