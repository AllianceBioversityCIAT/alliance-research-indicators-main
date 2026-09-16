// @akili-spec changes/agresso-staff-deactivation (T-01)
import {
  MAX_EMAIL_LENGTH,
  normalizeEmail,
  shieldKeyFor,
} from './email-key.util';

describe('email-key.util', () => {
  describe('normalizeEmail', () => {
    it('trims and lowercases', () => {
      expect(normalizeEmail('  MARIA.GOMEZ@CGIAR.ORG ')).toBe(
        'maria.gomez@cgiar.org',
      );
    });

    it('leaves an already-normalized address unchanged', () => {
      expect(normalizeEmail('a@b.org')).toBe('a@b.org');
    });
  });

  describe('shieldKeyFor', () => {
    // R-AGD-002 AC.2 — the JD-3 case. This is the reason the module exists: the raw value is over
    // the column width, the trimmed value is not, and the trimmed value is what matching compares.
    it('returns a key for an address whose RAW length exceeds the column width but whose TRIMMED length does not', () => {
      const raw = 'maria.gomez@cgiar.org' + ' '.repeat(140);

      expect(raw.length).toBeGreaterThan(MAX_EMAIL_LENGTH);
      expect(raw.trim().length).toBeLessThanOrEqual(MAX_EMAIL_LENGTH);
      expect(shieldKeyFor(raw)).toBe('maria.gomez@cgiar.org');
    });

    it('produces exactly the key normalizeEmail produces, so a shield can match an index entry', () => {
      const raw = '  Padded.Person@CGIAR.org   ';

      expect(shieldKeyFor(raw)).toBe(normalizeEmail(raw));
    });

    // R-AGD-002 AC.4 — the guard precedes trim(); normalizeEmail has none.
    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('returns null for %s without throwing', (_label, value) => {
      expect(() => shieldKeyFor(value as unknown as string)).not.toThrow();
      expect(shieldKeyFor(value as unknown as string)).toBeNull();
    });

    it.each([
      ['empty', ''],
      ['spaces', '   '],
      ['tab and newline', '\t\n'],
    ])('returns null for an %s email', (_label, value) => {
      expect(shieldKeyFor(value)).toBeNull();
    });

    it('returns a key for an ordinary address', () => {
      expect(shieldKeyFor('J.Doe@cgiar.org')).toBe('j.doe@cgiar.org');
    });
  });
});
