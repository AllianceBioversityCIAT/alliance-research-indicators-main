import { convertToParamMap } from '@angular/router';

import { parse, serialize } from './results-center-url.codec';
import type { ResultsCenterUrlState } from './results-center-url.codec';

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
  // D-URL-18 — `indicators` (plural) is the SIDEBAR MULTISELECT, a filter
  // distinct from the `indicator` TAB above.
  //
  // Disqualifies (design §10.3 discipline): a suite that only ever drives
  // `indicator` cannot tell these two apart — which is exactly how the
  // original gap shipped green through 6,479 tests. Every case below
  // asserts the two destinations SEPARATELY, so a regression collapsing one
  // into the other turns red instead of passing on the survivor.
  // ---------------------------------------------------------------------
  describe('indicators (plural) — the sidebar multiselect (D-URL-18)', () => {
    it('resolves a multi-value list to ids, order preserved', () => {
      const { filters } = parse(
        convertToParamMap({ indicators: 'oicr,capacity-sharing-for-development,policy-change' }),
      );
      // Input order is 5,1,4 — deliberately NOT ascending, so an
      // implementation that loses order cannot pass by accident.
      expect(filters.indicators).toEqual([5, 1, 4]);
    });

    it('lands on the multiselect and leaves the TAB untouched — different filters', () => {
      const { filters } = parse(convertToParamMap({ indicators: 'policy-change' }));
      expect(filters.indicators).toEqual([4]);
      expect(filters.indicator).toBeUndefined();
    });

    it('the singular `indicator` still lands on the TAB and leaves the multiselect untouched', () => {
      const { filters } = parse(convertToParamMap({ indicator: 'policy-change' }));
      expect(filters.indicator).toBe(4);
      expect(filters.indicators).toBeUndefined();
    });

    it('a set tab SUPPRESSES indicators entirely — the tab hides the multiselect', () => {
      const { filters } = parse(
        convertToParamMap({ indicator: 'oicr', indicators: 'policy-change,innovation-dev' }),
      );
      expect(filters.indicator).toBe(5);
      expect(filters.indicators).toBeUndefined();
    });

    it('suppression is order-independent — same result whichever key comes first', () => {
      const a = parse(convertToParamMap({ indicators: 'policy-change', indicator: 'oicr' }));
      const b = parse(convertToParamMap({ indicator: 'oicr', indicators: 'policy-change' }));
      expect(a.filters).toEqual(b.filters);
      expect(a.filters.indicator).toBe(5);
      expect(a.filters.indicators).toBeUndefined();
    });

    it('a SUPPRESSED indicators is not reported as dropped — superseded, not invalid', () => {
      const { dropped } = parse(
        convertToParamMap({ indicator: 'oicr', indicators: 'policy-change' }),
      );
      // `dropped` drives a "part of this link was not recognized" toast
      // (R-RCU-005). A valid, merely superseded parameter must not fire it —
      // same disposition as `statusLabel` (R-RCU-006 AC.3).
      expect(dropped).toEqual([]);
    });

    it('an invalid token drops individually while the valid ones still apply', () => {
      const { filters, dropped } = parse(
        convertToParamMap({ indicators: 'oicr,not-a-real-indicator,policy-change' }),
      );
      expect(filters.indicators).toEqual([5, 4]);
      expect(dropped).toContainEqual({
        param: 'indicators',
        value: 'not-a-real-indicator',
        reason: 'invalid-value',
      });
    });

    it('is case-insensitive on its values, like every other vocabulary token', () => {
      const { filters } = parse(convertToParamMap({ indicators: 'OICR,Policy-Change' }));
      expect(filters.indicators).toEqual([5, 4]);
    });

    it('folds its own key name, so ?INDICATORS= still resolves (R-RCU-001 AC.3)', () => {
      const { filters } = parse(convertToParamMap({ INDICATORS: 'oicr' }));
      expect(filters.indicators).toEqual([5]);
    });

    it('counts as a recognized parameter, so it suppresses restore (R-RCU-004 AC.1)', () => {
      expect(parse(convertToParamMap({ indicators: 'oicr' })).hadRecognizedParam).toBe(true);
    });

    it('a repeated key is flattened via getAll(), never reduced to the first (R-RCU-005 AC.4)', () => {
      const { filters } = parse(convertToParamMap({ indicators: ['oicr', 'policy-change'] }));
      expect(filters.indicators).toEqual([5, 4]);
    });

    it('a list over the 50-value bound is dropped whole (R-RCU-005 AC.4)', () => {
      const overBound = Array.from({ length: 51 }, () => 'oicr').join(',');
      const { filters, dropped } = parse(convertToParamMap({ indicators: overBound }));
      expect(filters.indicators).toBeUndefined();
      expect(dropped).toContainEqual({
        param: 'indicators',
        value: overBound,
        reason: 'too-many-values',
      });
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

    // The CapDev email link gained `source=star` (quick/capdev-email-url-source,
    // 2026-08-13) so the recipient lands on the results that upload actually
    // created. This keeps the D6 twin-literal control matched to the FULL
    // string the server now emits — without it, the control still covers the
    // indicator slug but no longer the link as sent.
    it('parsing the full server-emitted triple ?source=star&indicator=…&contract=A1048 resolves all three', () => {
      const { filters, dropped } = parse(
        convertToParamMap({
          source: 'star',
          indicator: 'capacity-sharing-for-development',
          contract: 'A1048',
        }),
      );
      expect(filters.source).toEqual(['STAR']);
      expect(filters.indicator).toBe(1);
      expect(filters.contract).toEqual(['A1048']);
      expect(dropped).toEqual([]);
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

describe('results-center-url.codec — serialize', () => {
  /**
   * A minimal, faithful double for Angular's `queryParamsHandling: 'merge'`
   * navigation semantics (design §6.2 step 5): `{...currentParams, ...next}`,
   * then strip only the keys whose **merged** value is exactly `null`. A key
   * `next` simply omits is not touched at all — it survives from `current`
   * verbatim, exactly as an omitted key does under the real `Router` merge.
   *
   * Deliberately narrow, per KZ-001 ("a test double that doesn't render or
   * evaluate what it stands in for produces a green suite over broken
   * behavior"): this strips **only** `null`, never `undefined` and never
   * `''`. This is deliberately stricter than the real router — Angular's
   * `Router.removeEmptyProps` (`router.mjs:5861`) strips `null` **and**
   * `undefined` — but the stricter double is safe here because `serialize`
   * never emits `undefined`; `''` is preserved by both the double and the
   * real router, which is the fidelity that actually matters for this test.
   */
  function mergeParams(
    current: Record<string, string>,
    next: Record<string, string | null>,
  ): Record<string, string> {
    const merged: Record<string, string | null> = { ...current, ...next };
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value !== null) {
        result[key] = value;
      }
    }
    return result;
  }

  const emptyState: ResultsCenterUrlState = { filters: {}, scope: undefined };

  // ---------------------------------------------------------------------
  // R-RCU-003 AC.1 — each active canonical parameter serializes to its
  // string form
  // ---------------------------------------------------------------------
  describe('each active canonical parameter serializes to its string form', () => {
    it('indicator serializes to its slug', () => {
      const params = serialize({ filters: { indicator: 5 }, scope: undefined }); // oicr
      expect(params['indicator']).toBe('oicr');
    });

    it('contract serializes to a comma-joined, upper-cased list, order preserved (D-URL-11)', () => {
      // Lower-case and out of alpha order: only fails to discriminate if the
      // fixture is either already upper-case or already sorted. This one is
      // neither — it fails if `.toUpperCase()` is removed (would read
      // 's192,a100') and it fails if order were resorted (would read
      // 'A100,S192' instead of the input order 'S192,A100').
      const params = serialize({ filters: { contract: ['s192', 'a100'] }, scope: undefined });
      expect(params['contract']).toBe('S192,A100');
    });

    it('status serializes ids back to slugs, order preserved', () => {
      const params = serialize({ filters: { status: [2, 6] }, scope: undefined }); // submitted, approved
      expect(params['status']).toBe('submitted,approved');
    });

    it('year serializes to a comma-joined list, order preserved', () => {
      const params = serialize({ filters: { year: [2025, 2024] }, scope: undefined });
      expect(params['year']).toBe('2025,2024');
    });

    it('source serializes platform codes back to slugs', () => {
      const params = serialize({ filters: { source: ['STAR', 'PRMS'] }, scope: undefined });
      expect(params['source']).toBe('star,prms');
    });
  });

  // ---------------------------------------------------------------------
  // R3-2 regression guard — every inactive canonical key AND every legacy
  // key is null in the direct output (supporting check; the primary proof
  // is the merge-based test below, per design §10.3's disqualifier)
  // ---------------------------------------------------------------------
  describe('every inactive canonical key and every legacy key is null (R3-2)', () => {
    it('a fully empty state nulls all seven canonical keys and all three legacy keys', () => {
      const params = serialize(emptyState);
      expect(params).toEqual({
        indicator: null,
        indicators: null, // D-URL-18 — the sidebar multiselect
        contract: null,
        status: null,
        year: null,
        source: null,
        tab: null,
        indicatorTab: null,
        statusTab: null,
        statusLabel: null,
      });
    });

    it('an active filter still nulls every *other* canonical key and all three legacy keys', () => {
      const params = serialize({ filters: { contract: ['A100'] }, scope: 'all' });
      expect(params['contract']).toBe('A100');
      expect(params['indicator']).toBeNull();
      expect(params['indicators']).toBeNull();
      expect(params['status']).toBeNull();
      expect(params['year']).toBeNull();
      expect(params['source']).toBeNull();
      expect(params['tab']).toBeNull();
      expect(params['indicatorTab']).toBeNull();
      expect(params['statusTab']).toBeNull();
      expect(params['statusLabel']).toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  // R3-2 regression guard — THE PRIMARY PROOF: asserted on the merged
  // result, not on serialize's raw return (design §10.3 disqualifier:
  // "Testing serialize in isolation without a merge simulation proves
  // nothing about R3-2; assert the merged result").
  // ---------------------------------------------------------------------
  describe('R3-2 — legacy keys are actually cleared from the address bar under merge', () => {
    it(
      'currentParams { indicatorTab: "1" } (a delivered CapDev email) + switching to ' +
        'All Indicators removes indicatorTab from the merged URL entirely',
      () => {
        const currentParams = { indicatorTab: '1' };
        // The user switched to "All Indicators" — no canonical indicator filter anymore.
        const stateWithNoIndicator: ResultsCenterUrlState = { filters: {}, scope: 'all' };

        const next = serialize(stateWithNoIndicator);
        const merged = mergeParams(currentParams, next);

        expect('indicatorTab' in merged).toBe(false);
      },
    );

    it('all three legacy keys are cleared together from a URL that carries all three', () => {
      const currentParams = {
        indicatorTab: '1',
        statusTab: '2',
        statusLabel: 'Submitted',
      };
      const merged = mergeParams(currentParams, serialize(emptyState));

      expect('indicatorTab' in merged).toBe(false);
      expect('statusTab' in merged).toBe(false);
      expect('statusLabel' in merged).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // R-RCU-004 AC.3 — a key the codec does not parse is never touched
  // ---------------------------------------------------------------------
  describe('an unrecognized key survives merge untouched (R-RCU-004 AC.3)', () => {
    it('?utm_source=email is neither emitted nor nulled, and survives alongside a real filter change', () => {
      const currentParams = { utm_source: 'email' };
      const state: ResultsCenterUrlState = { filters: { contract: ['A100'] }, scope: 'all' };

      const next = serialize(state);
      expect('utm_source' in next).toBe(false);

      const merged = mergeParams(currentParams, next);
      expect(merged['utm_source']).toBe('email');
      expect(merged['contract']).toBe('A100');
    });
  });

  // ---------------------------------------------------------------------
  // R3-4 regression guard — tab is emitted only for scope "my"
  // ---------------------------------------------------------------------
  describe('R3-4 — tab is emitted only when scope is "my"', () => {
    it('scope "my" serializes to tab: "my"', () => {
      expect(serialize({ filters: {}, scope: 'my' })['tab']).toBe('my');
    });

    it('scope "all" serializes to tab: null', () => {
      expect(serialize({ filters: {}, scope: 'all' })['tab']).toBeNull();
    });

    it('an unresolved (undefined) scope also serializes to tab: null, never a literal "undefined"', () => {
      expect(serialize(emptyState)['tab']).toBeNull();
    });

    it(
      'currentParams { tab: "my" } + switching to "all" removes tab from the merged URL — ' +
        'never leaves /results-center?tab=all glued to a cleared view',
      () => {
        const currentParams = { tab: 'my' };
        const merged = mergeParams(currentParams, serialize({ filters: {}, scope: 'all' }));
        expect('tab' in merged).toBe(false);
      },
    );
  });

  // ---------------------------------------------------------------------
  // R-RCU-003 clear scenario — clearing all filters leaves no query string
  // ---------------------------------------------------------------------
  describe('clearing all filters leaves no query string (R-RCU-003 clear scenario)', () => {
    it('currentParams { contract: "A100", year: "2025" } fully clears under merge', () => {
      const currentParams = { contract: 'A100', year: '2025' };
      const merged = mergeParams(currentParams, serialize({ filters: {}, scope: 'all' }));
      expect(merged).toEqual({});
    });
  });

  // ---------------------------------------------------------------------
  // D-URL-18 — serialize side of the sidebar multiselect
  // ---------------------------------------------------------------------
  describe('indicators (plural) serialization (D-URL-18)', () => {
    it('serializes the multiselect to a comma list, order preserved', () => {
      const params = serialize({ filters: { indicators: [5, 1, 4] }, scope: 'all' });
      expect(params['indicators']).toBe('oicr,capacity-sharing-for-development,policy-change');
    });

    it('emits indicator=null while emitting indicators — the tab is inactive', () => {
      const params = serialize({ filters: { indicators: [4] }, scope: 'all' });
      expect(params['indicators']).toBe('policy-change');
      expect(params['indicator']).toBeNull();
    });

    it('emits indicator while nulling indicators — the tab wins, never both', () => {
      const params = serialize({ filters: { indicator: 5, indicators: [4] }, scope: 'all' });
      expect(params['indicator']).toBe('oicr');
      expect(params['indicators']).toBeNull();
    });

    it('is null when the multiselect is empty, so merge clears it from the address bar', () => {
      const currentParams = { indicators: 'policy-change', source: 'star' };
      const merged = mergeParams(
        currentParams,
        serialize({ filters: { source: ['STAR'] }, scope: 'all' }),
      );
      // R2-1 — asserted on the resulting URL params, not the serializer
      // output: clearing the multiselect must REMOVE the key, not leave
      // `?indicators=` behind for a reload to resurrect.
      expect(merged).toEqual({ source: 'star' });
      expect('indicators' in merged).toBe(false);
    });

    it('an id with no slug is omitted rather than emitted raw (NFR-RCU-002 layer 2 surfaces it)', () => {
      const params = serialize({ filters: { indicators: [5, 999] }, scope: 'all' });
      expect(params['indicators']).toBe('oicr');
    });

    it('every id unslugged collapses the whole parameter to null, not to an empty string', () => {
      const params = serialize({ filters: { indicators: [999] }, scope: 'all' });
      expect(params['indicators']).toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  // R-RCU-003 AC.2 — round-trip, all six parameters, distinguishable
  // values per KZ-004 ("a fixture whose N units are built from identical
  // defaults cannot distinguish per-unit scoping from a batch-wide bug")
  // ---------------------------------------------------------------------
  describe('round-trip: parse(serialize(state)) reproduces state (R-RCU-003 AC.2)', () => {
    it('reproduces a state exercising all six parameters with distinguishable values', () => {
      const state: ResultsCenterUrlState = {
        filters: {
          indicator: 5, // oicr — distinct from any status/source id below
          contract: ['A100', 'S192'], // two distinct contract codes
          status: [2, 6], // submitted, approved — two distinct ids
          year: [2024, 2025], // two distinct years
          source: ['STAR', 'PRMS'], // two distinct platform codes
        },
        scope: 'my',
      };

      const next = serialize(state);
      // What actually lands in the address bar after a merge against an
      // empty current URL — the shape a reload would re-parse.
      const urlParams = mergeParams({}, next);
      const reparsed = parse(convertToParamMap(urlParams));

      expect(reparsed.filters).toEqual(state.filters);
      expect(reparsed.scope).toBe(state.scope);
    });

    // D-URL-18 — the tab variant above can NEVER exercise the multiselect,
    // because a set `indicator` suppresses `indicators` by design. The
    // seventh parameter therefore needs its own round-trip, or the branch
    // the user actually hit stays unproven.
    it('reproduces a state exercising the sidebar multiselect instead of the tab', () => {
      const state: ResultsCenterUrlState = {
        filters: {
          indicators: [5, 1, 4], // three distinct ids, deliberately unsorted
          contract: ['A100', 'S192'],
          status: [2, 6],
          year: [2024, 2025],
          source: ['STAR', 'PRMS'],
        },
        scope: 'my',
      };

      const reparsed = parse(convertToParamMap(mergeParams({}, serialize(state))));

      expect(reparsed.filters).toEqual(state.filters);
      expect(reparsed.scope).toBe(state.scope);
      // Explicit: the multiselect did not silently migrate onto the tab.
      expect(reparsed.filters.indicator).toBeUndefined();
    });

    it('reproduces the exact URL from the reported defect: ?indicators=…&source=star', () => {
      // The screenshot that opened this defect: ALL INDICATORS tab active,
      // "Capacity Sharing for Development" chosen in the sidebar multiselect,
      // STAR source — and an address bar that read only `?source=star`.
      const state: ResultsCenterUrlState = {
        filters: { indicators: [1], source: ['STAR'] },
        scope: 'all',
      };

      const urlParams = mergeParams({}, serialize(state));
      expect(urlParams).toEqual({
        indicators: 'capacity-sharing-for-development',
        source: 'star',
      });
      expect(parse(convertToParamMap(urlParams)).filters).toEqual(state.filters);
    });
  });

  // ---------------------------------------------------------------------
  // NFR-RCU-003 — no output value equals the cached user identifier
  // ---------------------------------------------------------------------
  describe('NFR-RCU-003 — no output value equals the cached sec_user_id, for any scope', () => {
    // Representative of `CacheService.dataCache().user.sec_user_id`
    // (`client/research-indicators/src/app/shared/interfaces/cache.interface.ts`
    // — `UserCache.sec_user_id: number`), the identifier the my/all scope
    // must never leak. `serialize` never receives this value as an input at
    // all — the scope is expressed purely as `TabScope`, so this asserts the
    // *shape* of that guarantee: no output value can ever coincide with it.
    const CACHED_SEC_USER_ID = '42';

    it('scope "my" emits only the literal "my", never the user id', () => {
      const params = serialize({
        filters: { indicator: 5, contract: ['A100'], status: [2], year: [2024], source: ['STAR'] },
        scope: 'my',
      });
      expect(params['tab']).toBe('my');
      expect(Object.values(params)).not.toContain(CACHED_SEC_USER_ID);
    });

    it('scope "all" never emits the user id either', () => {
      const params = serialize({
        filters: { indicator: 5, contract: ['A100'], status: [2], year: [2024], source: ['STAR'] },
        scope: 'all',
      });
      expect(Object.values(params)).not.toContain(CACHED_SEC_USER_ID);
    });
  });
});
