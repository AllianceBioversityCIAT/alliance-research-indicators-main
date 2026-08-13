import { convertToParamMap } from '@angular/router';

import { parse } from './results-center-url.codec';

describe('results-center-url.codec — parse', () => {
  // ---------------------------------------------------------------------
  // R-RCU-002 AC.1 — each of the six canonical parameters, alone
  // ---------------------------------------------------------------------
  describe('each canonical parameter, alone (R-RCU-002 AC.1)', () => {
    it('indicator alone resolves to its id', () => {
      const { filters } = parse(
        convertToParamMap({ indicator: 'capacity-sharing-for-development' }),
      );
      expect(filters.indicator).toBe(1);
    });

    it('contract alone resolves to the upper-cased agreement id', () => {
      const { filters } = parse(convertToParamMap({ contract: 'A100' }));
      expect(filters.contract).toEqual(['A100']);
    });

    it('status alone resolves to its id', () => {
      const { filters } = parse(convertToParamMap({ status: 'submitted' }));
      expect(filters.status).toEqual([2]);
    });

    it('year alone resolves to the integer', () => {
      const { filters } = parse(convertToParamMap({ year: '2025' }));
      expect(filters.year).toEqual([2025]);
    });

    it('source alone resolves to the platform code', () => {
      const { filters } = parse(convertToParamMap({ source: 'star' }));
      expect(filters.source).toEqual(['STAR']);
    });

    it('tab alone resolves the my/all scope', () => {
      expect(parse(convertToParamMap({ tab: 'my' })).scope).toBe('my');
      expect(parse(convertToParamMap({ tab: 'all' })).scope).toBe('all');
    });

    it('no tab at all leaves scope undefined — resolved later from the pinned preference (design §6.1 step 3)', () => {
      expect(parse(convertToParamMap({ contract: 'A100' })).scope).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------
  // R-RCU-001 AC.3 — key case-folding, asserted with the literal example
  // ---------------------------------------------------------------------
  describe('parameter-name case folding (R-RCU-001 AC.3, R2-6)', () => {
    it('?CONTRACT=a100 resolves identically to ?contract=A100', () => {
      const upperKeyResult = parse(convertToParamMap({ CONTRACT: 'a100' }));
      const lowerKeyResult = parse(convertToParamMap({ contract: 'A100' }));
      expect(upperKeyResult.filters.contract).toEqual(['A100']);
      expect(upperKeyResult.filters).toEqual(lowerKeyResult.filters);
    });
  });

  // ---------------------------------------------------------------------
  // D-URL-12 — indicator is single-value; a comma is rejected, not truncated
  // ---------------------------------------------------------------------
  describe('indicator single-value rejection (D-URL-12)', () => {
    it('?indicator=oicr,policy-change is rejected outright, not truncated to "oicr"', () => {
      const { filters, dropped } = parse(
        convertToParamMap({ indicator: 'oicr,policy-change' }),
      );
      expect(filters.indicator).toBeUndefined();
      expect(dropped).toContainEqual({
        param: 'indicator',
        value: 'oicr,policy-change',
        reason: 'invalid-value',
      });
    });

    it('a repeated indicator key is rejected rather than resolved from the first occurrence', () => {
      const { filters, dropped } = parse(
        convertToParamMap({ indicator: ['policy-change', 'oicr'] }),
      );
      expect(filters.indicator).toBeUndefined();
      expect(dropped.some((d) => d.param === 'indicator')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // R-RCU-005 AC.1 — one bad token among good ones
  // ---------------------------------------------------------------------
  describe('one invalid parameter never blocks a valid one (R-RCU-005 AC.1)', () => {
    it('?indicator=not-a-real-indicator&contract=A100 keeps the contract filter and reports a non-empty dropped', () => {
      const { filters, dropped } = parse(
        convertToParamMap({ indicator: 'not-a-real-indicator', contract: 'A100' }),
      );
      expect(filters.contract).toEqual(['A100']);
      expect(dropped.length).toBeGreaterThan(0);
      // Prove the *right* token was dropped, not merely that dropped is non-empty
      // (design §10.3 disqualifier: "a dropped assertion on length alone").
      expect(dropped).toContainEqual({
        param: 'indicator',
        value: 'not-a-real-indicator',
        reason: 'invalid-value',
      });
    });
  });

  // ---------------------------------------------------------------------
  // R-RCU-005 AC.4 — bounds
  // ---------------------------------------------------------------------
  describe('bounds (R-RCU-005 AC.4, design §5.5)', () => {
    it('a list of 51 values is dropped whole, not truncated to the first 50', () => {
      const fiftyOneValues = Array.from({ length: 51 }, (_, i) => `C${i}`).join(',');
      const { filters, dropped } = parse(convertToParamMap({ contract: fiftyOneValues }));
      expect(filters.contract).toBeUndefined();
      expect(dropped).toContainEqual({
        param: 'contract',
        value: fiftyOneValues,
        reason: 'too-many-values',
      });
    });

    it('a 65-char token is dropped', () => {
      const tooLongToken = 'C'.repeat(65);
      const { filters, dropped } = parse(convertToParamMap({ contract: tooLongToken }));
      expect(filters.contract).toBeUndefined();
      expect(dropped).toContainEqual({
        param: 'contract',
        value: tooLongToken,
        reason: 'too-long',
      });
    });

    it('?contract=A100&contract=S192 (repeated key) yields both values via getAll(), never just the first', () => {
      const { filters } = parse(convertToParamMap({ contract: ['A100', 'S192'] }));
      expect(filters.contract).toEqual(['A100', 'S192']);
    });
  });

  // ---------------------------------------------------------------------
  // R-RCU-006 AC.2 — canonical beats legacy, deterministically, order-independent
  // ---------------------------------------------------------------------
  describe('canonical beats legacy, deterministically (R-RCU-006 AC.2)', () => {
    it('?indicatorTab=1&indicator=policy-change resolves to policy-change', () => {
      const { filters } = parse(
        convertToParamMap({ indicatorTab: '1', indicator: 'policy-change' }),
      );
      expect(filters.indicator).toBe(4); // policy-change
    });

    it('resolves to policy-change regardless of parameter order in the URL', () => {
      const { filters } = parse(
        convertToParamMap({ indicator: 'policy-change', indicatorTab: '1' }),
      );
      expect(filters.indicator).toBe(4);
    });

    it('falls back to the legacy indicatorTab id only when the canonical key is entirely absent', () => {
      const { filters } = parse(convertToParamMap({ indicatorTab: '1' }));
      expect(filters.indicator).toBe(1); // capacity-sharing-for-development
    });
  });

  // ---------------------------------------------------------------------
  // R-RCU-006 AC.3 — statusLabel's value never reaches the returned object
  // ---------------------------------------------------------------------
  describe("statusLabel's value never reaches filters (R-RCU-006 AC.3, T-01 Reviewer hazard)", () => {
    it('statusLabel alone counts as recognized but contributes no status filter', () => {
      const { filters, hadRecognizedParam } = parse(
        convertToParamMap({ statusLabel: 'Submitted' }),
      );
      expect(filters.status).toBeUndefined();
      expect(hadRecognizedParam).toBe(true);
      expect(JSON.stringify(filters)).not.toContain('Submitted');
    });

    it('statusLabel + statusTab together resolve status from statusTab, never from statusLabel\'s value', () => {
      const { filters } = parse(
        convertToParamMap({ statusLabel: 'Submitted', statusTab: '2' }),
      );
      expect(filters.status).toEqual([2]); // submitted, resolved from statusTab's id, not the label text
      expect(JSON.stringify(filters)).not.toContain('Submitted');
    });

    it('statusLabel does not shadow a canonical status value either', () => {
      const { filters } = parse(
        convertToParamMap({ statusLabel: 'Submitted', status: 'approved' }),
      );
      expect(filters.status).toEqual([6]); // approved, the canonical value — not statusLabel's text
    });
  });

  // ---------------------------------------------------------------------
  // R-RCU-002 multi-value scenario — order preserved
  // ---------------------------------------------------------------------
  describe('multi-value order preservation (R-RCU-002 multi-value scenario, "AND IT MUST")', () => {
    it('preserves input order for contract even though it differs from sorted order', () => {
      // Sorted order would be ['A100', 'S192']; input order is reversed.
      const { filters } = parse(convertToParamMap({ contract: 'S192,A100' }));
      expect(filters.contract).toEqual(['S192', 'A100']);
    });

    it('preserves input order for status even though sorted-by-id order would differ', () => {
      // 'oicr-published' -> id 14, 'editing' -> id 1. Sorted-by-id would be [1, 14].
      const { filters } = parse(convertToParamMap({ status: 'oicr-published,editing' }));
      expect(filters.status).toEqual([14, 1]);
    });
  });

  // ---------------------------------------------------------------------
  // Cross-package contract (design §8) — the exact literal, byte for byte
  // ---------------------------------------------------------------------
  describe('cross-package contract literal (design §8, D6)', () => {
    it('parsing /results-center?indicator=capacity-sharing-for-development&contract=A100 yields indicator id 1 and contract A100', () => {
      const { filters } = parse(
        convertToParamMap({
          indicator: 'capacity-sharing-for-development',
          contract: 'A100',
        }),
      );
      expect(filters.indicator).toBe(1);
      expect(filters.contract).toEqual(['A100']);
    });
  });

  // ---------------------------------------------------------------------
  // Supporting coverage — recognized-parameter presence, legacy-only links,
  // unrecognized parameters, natural-key validation
  // ---------------------------------------------------------------------
  describe('recognized-parameter presence (R-RCU-004 AC.1/AC.3)', () => {
    it('an unrecognized parameter alone does not count as a recognized parameter', () => {
      const { hadRecognizedParam, filters, dropped } = parse(
        convertToParamMap({ utm_source: 'email' }),
      );
      expect(hadRecognizedParam).toBe(false);
      expect(filters).toEqual({});
      expect(dropped).toEqual([]);
    });

    it('a legacy parameter alone counts as recognized', () => {
      expect(parse(convertToParamMap({ indicatorTab: '1' })).hadRecognizedParam).toBe(true);
    });
  });

  describe('already-delivered legacy links keep working (R-RCU-006 AC.1)', () => {
    it('indicatorTab=1 resolves to the Capacity Sharing indicator', () => {
      expect(parse(convertToParamMap({ indicatorTab: '1' })).filters.indicator).toBe(1);
    });

    it('statusTab=2 resolves to the submitted status', () => {
      expect(parse(convertToParamMap({ statusTab: '2' })).filters.status).toEqual([2]);
    });

    it('an unknown legacy indicatorTab id degrades rather than resolving to a wrong tab', () => {
      const { filters, dropped } = parse(convertToParamMap({ indicatorTab: '999' }));
      expect(filters.indicator).toBeUndefined();
      expect(dropped).toContainEqual({
        param: 'indicatortab',
        value: '999',
        reason: 'invalid-value',
      });
    });
  });

  describe('contract natural-key validation (design §5.4, D-URL-7)', () => {
    it('rejects a token with a character outside the allowed set', () => {
      const { filters, dropped } = parse(convertToParamMap({ contract: 'A 100!' }));
      expect(filters.contract).toBeUndefined();
      expect(dropped).toContainEqual({
        param: 'contract',
        value: 'A 100!',
        reason: 'invalid-value',
      });
    });

    it('is not validated against a contracts control list — any well-formed token passes (D-URL-7)', () => {
      // "ZZZ999" is not a real agreement_id; the codec never checks existence.
      const { filters } = parse(convertToParamMap({ contract: 'ZZZ999' }));
      expect(filters.contract).toEqual(['ZZZ999']);
    });
  });

  describe('year natural-key validation (design §5.4)', () => {
    it('rejects a year outside [2000, 2100]', () => {
      const { filters, dropped } = parse(convertToParamMap({ year: '1999' }));
      expect(filters.year).toBeUndefined();
      expect(dropped).toContainEqual({ param: 'year', value: '1999', reason: 'invalid-value' });
    });

    it('rejects a non-numeric year token', () => {
      const { filters, dropped } = parse(convertToParamMap({ year: 'abcd' }));
      expect(filters.year).toBeUndefined();
      expect(dropped).toContainEqual({ param: 'year', value: 'abcd', reason: 'invalid-value' });
    });

    it('accepts the boundary years 2000 and 2100', () => {
      const { filters } = parse(convertToParamMap({ year: '2000,2100' }));
      expect(filters.year).toEqual([2000, 2100]);
    });
  });

  describe('combining two different canonical parameters (R-RCU-002 AC.2)', () => {
    it('contract and year both apply together', () => {
      const { filters } = parse(convertToParamMap({ contract: 'A100', year: '2025' }));
      expect(filters.contract).toEqual(['A100']);
      expect(filters.year).toEqual([2025]);
    });
  });
});
