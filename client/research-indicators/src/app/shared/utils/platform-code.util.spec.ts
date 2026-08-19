import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import {
  isPoolFundingCapable,
  platformFromResultCode,
  platformFromResultCodeOrNull,
  POOL_FUNDING_PLATFORMS
} from './platform-code.util';

describe('platform-code.util', () => {
  describe('platformFromResultCodeOrNull', () => {
    // R-PFG-002 AC.3 — this derivation must agree with result.interceptor.ts's for
    // every code in PLATFORM_CODES. Enumerated, never listed literally (D-2).
    it.each(Object.values(PLATFORM_CODES))('resolves a %s-prefixed code to that platform', platformCode => {
      expect(platformFromResultCodeOrNull(`${platformCode}-31288`)).toBe(platformCode);
    });

    it('resolves a bare-numeric code to STAR', () => {
      expect(platformFromResultCodeOrNull('31288')).toBe(PLATFORM_CODES.STAR);
    });

    // Attempt-2 rework — the Reviewer's FAIL: the derivation must be case-sensitive
    // and must NOT widen result.interceptor.ts's original acceptance set. An
    // unrecognized prefix, or a differently-cased one, is genuinely unknown here.
    it('returns null for an unrecognized prefix (does not widen the URL matcher)', () => {
      expect(platformFromResultCodeOrNull('FOO-123')).toBeNull();
      expect(platformFromResultCodeOrNull('UNKNOWN-9')).toBeNull();
    });

    it('is case-sensitive — a lowercase prefix is not recognized', () => {
      expect(platformFromResultCodeOrNull('tip-123')).toBeNull();
    });

    it('returns null for a shape that is neither a known prefix nor bare-numeric', () => {
      expect(platformFromResultCodeOrNull('abc')).toBeNull();
    });
  });

  describe('platformFromResultCode', () => {
    // The guard-facing wrapper: same recognized prefixes as the OrNull variant.
    it.each(Object.values(PLATFORM_CODES))('resolves a %s-prefixed code to that platform', platformCode => {
      expect(platformFromResultCode(`${platformCode}-31288`)).toBe(platformCode);
    });

    it('resolves a bare-numeric code to STAR', () => {
      expect(platformFromResultCode('31288')).toBe(PLATFORM_CODES.STAR);
    });

    // Unlike the OrNull variant, the guard-facing wrapper always resolves to a
    // platform: anything the derivation can't place defaults to STAR (D-1 — the
    // safe direction, preserving today's behavior rather than newly blocking).
    it('defaults an unrecognized or differently-cased prefix to STAR', () => {
      expect(platformFromResultCode('FOO-123')).toBe(PLATFORM_CODES.STAR);
      expect(platformFromResultCode('tip-123')).toBe(PLATFORM_CODES.STAR);
    });
  });

  describe('POOL_FUNDING_PLATFORMS', () => {
    it('contains only STAR today', () => {
      expect(POOL_FUNDING_PLATFORMS).toEqual([PLATFORM_CODES.STAR]);
    });
  });

  describe('isPoolFundingCapable', () => {
    // D-2 — enumerated over PLATFORM_CODES, never a literal list of codes, so a new
    // platform added to the constant is refused by default rather than silently passing.
    it.each(Object.values(PLATFORM_CODES).filter(code => code !== PLATFORM_CODES.STAR))(
      '%s is not pool-funding capable',
      platformCode => {
        expect(isPoolFundingCapable(`${platformCode}-31288`)).toBe(false);
      }
    );

    it('a bare-numeric (STAR) code is pool-funding capable', () => {
      expect(isPoolFundingCapable('31288')).toBe(true);
    });

    it('a STAR-prefixed code is pool-funding capable', () => {
      expect(isPoolFundingCapable('STAR-31288')).toBe(true);
    });
  });
});
