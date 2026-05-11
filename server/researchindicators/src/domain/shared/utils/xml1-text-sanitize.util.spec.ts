import {
  isXml10TextCodePoint,
  sanitizeXml1Text,
} from './xml1-text-sanitize.util';

describe('xml1-text-sanitize.util', () => {
  describe('isXml10TextCodePoint', () => {
    it('allows TAB, LF, CR', () => {
      expect(isXml10TextCodePoint(0x9)).toBe(true);
      expect(isXml10TextCodePoint(0xa)).toBe(true);
      expect(isXml10TextCodePoint(0xd)).toBe(true);
    });
    it('rejects other C0 controls', () => {
      expect(isXml10TextCodePoint(0x0)).toBe(false);
      expect(isXml10TextCodePoint(0x8)).toBe(false);
      expect(isXml10TextCodePoint(0xb)).toBe(false);
      expect(isXml10TextCodePoint(0xc)).toBe(false);
      expect(isXml10TextCodePoint(0xe)).toBe(false);
    });
    it('rejects BMP noncharacters U+FFFE / U+FFFF', () => {
      expect(isXml10TextCodePoint(0xfffe)).toBe(false);
      expect(isXml10TextCodePoint(0xffff)).toBe(false);
    });
    it('allows U+FFFD replacement char', () => {
      expect(isXml10TextCodePoint(0xfffd)).toBe(true);
    });
  });

  describe('sanitizeXml1Text', () => {
    it('removes U+FFFE', () => {
      expect(sanitizeXml1Text('a\uFFFEb')).toBe('ab');
    });
    it('preserves astral characters (single scalar)', () => {
      expect(sanitizeXml1Text('x😀y')).toBe('x😀y');
    });
    it('drops lone surrogate halves (invalid UTF-16)', () => {
      expect(sanitizeXml1Text('a\uD800b')).toBe('ab');
    });
  });
});
