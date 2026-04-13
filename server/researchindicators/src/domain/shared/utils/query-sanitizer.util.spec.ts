import {
  sanitizeText,
  isValidText,
  escapeLikeString,
} from './query-sanitizer.util';

describe('query-sanitizer.util', () => {
  describe('sanitizeText', () => {
    it('should return empty for non-string', () => {
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(1 as any)).toBe('');
    });

    it('should remove sql-ish tokens', () => {
      expect(sanitizeText("a' OR 1=1 --")).not.toMatch(/'/);
      expect(sanitizeText('UNION SELECT')).not.toMatch(/UNION/i);
    });
  });

  describe('isValidText', () => {
    it('should return true for empty', () => {
      expect(isValidText('')).toBe(true);
    });

    it('should reject suspicious patterns', () => {
      expect(isValidText("'; DROP--")).toBe(false);
      expect(isValidText('<script>x</script>')).toBe(false);
    });

    it('should accept clean text', () => {
      expect(isValidText('hello world')).toBe(true);
    });
  });

  describe('escapeLikeString', () => {
    it('should escape like wildcards', () => {
      expect(escapeLikeString("100%_")).toBe('100\\%\\_');
    });
  });
});
