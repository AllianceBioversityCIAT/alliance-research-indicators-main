import {
  containsDangerousStoredString,
  isSafeStoredJsonPayload,
  isSafeStoredString,
} from './safe-stored-content.util';

describe('safe-stored-content.util', () => {
  describe('isSafeStoredString', () => {
    it('accepts normal text and URLs', () => {
      expect(isSafeStoredString('Configurable date-time rules')).toBe(true);
      expect(isSafeStoredString('https://datb5ly7vwnl2.cloudfront.net/')).toBe(
        true,
      );
    });

    it('rejects script and event-handler patterns', () => {
      expect(isSafeStoredString('<script>alert(1)</script>')).toBe(false);
      expect(isSafeStoredString('javascript:alert(1)')).toBe(false);
      expect(isSafeStoredString('<img src=x onerror=alert(1)>')).toBe(false);
    });

    it('rejects null bytes', () => {
      expect(isSafeStoredString('safe\u0000payload')).toBe(false);
    });
  });

  describe('containsDangerousStoredString', () => {
    it('detects encoded angle brackets', () => {
      expect(containsDangerousStoredString('\\u003cscript')).toBe(true);
    });
  });

  describe('isSafeStoredJsonPayload', () => {
    it('accepts nested configuration objects', () => {
      expect(
        isSafeStoredJsonPayload({
          locale: 'en-US',
          timezone: { iana: 'Europe/Paris' },
        }),
      ).toBe(true);
    });

    it('rejects prototype pollution keys', () => {
      expect(
        isSafeStoredJsonPayload(
          JSON.parse('{"__proto__": {"polluted": true}}') as object,
        ),
      ).toBe(false);
      expect(
        isSafeStoredJsonPayload({ nested: { constructor: { x: 1 } } }),
      ).toBe(false);
    });

    it('rejects dangerous strings inside JSON', () => {
      expect(
        isSafeStoredJsonPayload({ label: '<script>alert(1)</script>' }),
      ).toBe(false);
    });
  });
});
