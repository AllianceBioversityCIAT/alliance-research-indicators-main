import { SOURCE_FILTER_OPTIONS } from '@shared/constants/source-filter-options.constants';
import {
  CANONICAL_PARAM_NAMES,
  foldParamName,
  INDICATOR_ID_TO_SLUG,
  INDICATOR_SLUG_TO_ID,
  isRecognizedParamName,
  LEGACY_PARAM_NAMES,
  LEGACY_PARAM_TO_CANONICAL,
  MAX_LIST_PARAM_VALUES,
  MAX_PARAM_TOKEN_LENGTH,
  PLATFORM_CODE_TO_SOURCE_SLUG,
  RECOGNIZED_PARAM_NAMES,
  SOURCE_SLUG_TO_PLATFORM_CODE,
  STATUS_ID_TO_SLUG,
  STATUS_SLUG_TO_ID,
  TAB_SCOPE_VALUES,
} from './results-center-url.vocabulary';

describe('results-center-url.vocabulary', () => {
  describe('indicator vocabulary (R-RCU-001 AC.4/AC.5)', () => {
    it('has exactly 6 entries with no accidental duplicate key', () => {
      expect(INDICATOR_SLUG_TO_ID.size).toBe(6);
    });

    it('maps every id back to exactly one slug (bidirectional, iterated over the real map)', () => {
      // Iterates the exported map itself, not a hand-typed subset (T-01 disqualifier).
      for (const [slug, id] of INDICATOR_SLUG_TO_ID.entries()) {
        expect(INDICATOR_ID_TO_SLUG.get(id)).toBe(slug);
      }
      // If two slugs collapsed onto one id, the inverse map would be smaller.
      expect(INDICATOR_ID_TO_SLUG.size).toBe(INDICATOR_SLUG_TO_ID.size);
    });

    it('is byte-identical to the server QueryIndicatorsEnum values (D6 literal, not an import)', () => {
      // Literal transcribed from
      // server/researchindicators/src/domain/entities/indicators/enum/indicators.enum.ts:25-32.
      // Never imported — separate deployables, design.md §8.
      expect(INDICATOR_SLUG_TO_ID.get('capacity-sharing-for-development')).toBe(1);
      expect(INDICATOR_SLUG_TO_ID.get('innovation-dev')).toBe(2);
      expect(INDICATOR_SLUG_TO_ID.get('knowledge-product')).toBe(3);
      expect(INDICATOR_SLUG_TO_ID.get('policy-change')).toBe(4);
      expect(INDICATOR_SLUG_TO_ID.get('oicr')).toBe(5);
      expect(INDICATOR_SLUG_TO_ID.get('innovation-use')).toBe(6);
    });

    it('does not derive ids 2 and 5 by naive kebab-casing of their display names', () => {
      // Display names are "Innovation Development" and "OICR" (indicators.enum.ts:14,17);
      // a naive kebab-case would yield "innovation-development" / "o-i-c-r".
      expect(INDICATOR_ID_TO_SLUG.get(2)).toBe('innovation-dev');
      expect(INDICATOR_ID_TO_SLUG.get(5)).toBe('oicr');
    });

    it('never introduces the PDF-report key as a URL indicator slug (R-RCU-001 AC.5)', () => {
      expect(INDICATOR_SLUG_TO_ID.has('cap_sharing')).toBe(false);
    });

    it('excludes lever (D-URL-6)', () => {
      expect(INDICATOR_SLUG_TO_ID.has('lever')).toBe(false);
    });
  });

  describe('status vocabulary (design §5.2, requirements §9 R5)', () => {
    /** Independently transcribed from design.md §5.2 — used to prove content,
     * not uniqueness (uniqueness is asserted separately over the real map). */
    const EXPECTED_STATUS_TABLE: ReadonlyArray<[number, string]> = [
      [1, 'editing'],
      [2, 'submitted'],
      [3, 'accepted'],
      [4, 'draft'],
      [5, 'pending-revision'],
      [6, 'approved'],
      [7, 'not-approved'],
      [8, 'deleted'],
      [9, 'oicr-requested'],
      [10, 'oicr-accepted'],
      [11, 'oicr-postponed'],
      [12, 'oicr-in-science-edition'],
      [13, 'oicr-in-km-curation'],
      [14, 'oicr-published'],
      [15, 'oicr-not-accepted'],
      [16, 'editing-in-prms'],
      [17, 'submitted-in-prms'],
      [18, 'qaed-in-prms'],
      [19, 'discontinued-in-prms'],
      [20, 'completed-in-tip'],
      [21, 'editing-in-aiccra'],
      [22, 'submitted-in-aiccra'],
      [23, 'bilateral-pending-review'],
      [24, 'bilateral-approved'],
      [25, 'bilateral-rejected'],
    ];

    it('has exactly 25 rows in the reference table used by this suite', () => {
      expect(EXPECTED_STATUS_TABLE.length).toBe(25);
    });

    it('matches design §5.2 byte-for-byte, row by row', () => {
      for (const [id, slug] of EXPECTED_STATUS_TABLE) {
        expect(STATUS_SLUG_TO_ID.get(slug)).toBe(id);
        expect(STATUS_ID_TO_SLUG.get(id)).toBe(slug);
      }
    });

    it('has exactly 25 unique slugs, verified by iterating the exported map (not a hand-typed subset)', () => {
      const slugs = Array.from(STATUS_SLUG_TO_ID.keys());
      expect(slugs.length).toBe(25);
      expect(new Set(slugs).size).toBe(25);
    });

    it('has exactly 25 unique ids, verified by iterating the exported map', () => {
      const ids = Array.from(STATUS_SLUG_TO_ID.values());
      expect(ids.length).toBe(25);
      expect(new Set(ids).size).toBe(25);
    });

    it('maps every id back to exactly one slug (bidirectional, iterated over the real map)', () => {
      for (const [slug, id] of STATUS_SLUG_TO_ID.entries()) {
        expect(STATUS_ID_TO_SLUG.get(id)).toBe(slug);
      }
      expect(STATUS_ID_TO_SLUG.size).toBe(STATUS_SLUG_TO_ID.size);
    });

    it('distinguishes genuine near-collisions as different strings', () => {
      // design §5.2 calls these out explicitly: near-identical but distinct.
      expect(STATUS_SLUG_TO_ID.get('accepted')).not.toBe(STATUS_SLUG_TO_ID.get('oicr-accepted'));
      expect(STATUS_SLUG_TO_ID.get('editing')).not.toBe(STATUS_SLUG_TO_ID.get('editing-in-prms'));
    });
  });

  describe('source vocabulary (design §5.3, D-URL-13)', () => {
    it('is derived from the real SOURCE_FILTER_OPTIONS constant, not a parallel hard-coded list', () => {
      expect(SOURCE_FILTER_OPTIONS.length).toBe(4);
      expect(SOURCE_SLUG_TO_PLATFORM_CODE.size).toBe(SOURCE_FILTER_OPTIONS.length);
      for (const option of SOURCE_FILTER_OPTIONS) {
        expect(SOURCE_SLUG_TO_PLATFORM_CODE.get(option.platform_code.toLowerCase())).toBe(
          option.platform_code,
        );
      }
    });

    it('matches the frozen slug table in design §5.3', () => {
      expect(SOURCE_SLUG_TO_PLATFORM_CODE.get('aiccra')).toBe('AICCRA');
      expect(SOURCE_SLUG_TO_PLATFORM_CODE.get('star')).toBe('STAR');
      expect(SOURCE_SLUG_TO_PLATFORM_CODE.get('prms')).toBe('PRMS');
      expect(SOURCE_SLUG_TO_PLATFORM_CODE.get('tip')).toBe('TIP');
    });

    it('maps every platform_code back to exactly one slug (bidirectional)', () => {
      for (const [slug, code] of SOURCE_SLUG_TO_PLATFORM_CODE.entries()) {
        expect(PLATFORM_CODE_TO_SOURCE_SLUG.get(code)).toBe(slug);
      }
      expect(PLATFORM_CODE_TO_SOURCE_SLUG.size).toBe(SOURCE_SLUG_TO_PLATFORM_CODE.size);
    });
  });

  describe('tab scope vocabulary (design §5.4)', () => {
    it('is exactly my/all', () => {
      expect(TAB_SCOPE_VALUES).toEqual(['my', 'all']);
    });
  });

  describe('recognized parameter names (R3-3 regression guard)', () => {
    it('lists exactly the six canonical parameters, lower-case, no lever (D-URL-6)', () => {
      expect(CANONICAL_PARAM_NAMES).toEqual(['indicator', 'contract', 'status', 'year', 'source', 'tab']);
      expect(CANONICAL_PARAM_NAMES).not.toContain('lever');
    });

    it('stores the legacy parameter list already lower-case-folded, not in its original camelCase spelling', () => {
      // This is the structural half of the R3-3 guard: if a future edit reverted
      // LEGACY_PARAM_NAMES to ['indicatorTab', 'statusTab', 'statusLabel'], this
      // assertion fails immediately, independent of the lookup helper below.
      expect(LEGACY_PARAM_NAMES).toEqual(['indicatortab', 'statustab', 'statuslabel']);
      for (const name of LEGACY_PARAM_NAMES) {
        expect(name).toBe(name.toLowerCase());
      }
    });

    it('folds a mixed-case incoming key before comparing against the recognized list', () => {
      expect(foldParamName('CONTRACT')).toBe('contract');
      expect(foldParamName('indicatorTab')).toBe('indicatortab');
    });

    it.each([
      // The exact camelCase spelling named in requirements.md R-RCU-006 — the
      // spelling every already-delivered CapDev email actually carries.
      'indicatorTab',
      'statusTab',
      'statusLabel',
      // Additional casings, so this does not pass merely because the fold is a no-op.
      'INDICATORTAB',
      'StatusTab',
      'STATUSLABEL',
    ])(
      'resolves a folded lookup of the legacy parameter %p to a recognized name (R3-3 guard)',
      (rawKey) => {
        expect(isRecognizedParamName(rawKey)).toBe(true);
      },
    );

    it('maps each folded legacy name back to the canonical parameter it substitutes for', () => {
      expect(LEGACY_PARAM_TO_CANONICAL.get(foldParamName('indicatorTab'))).toBe('indicator');
      expect(LEGACY_PARAM_TO_CANONICAL.get(foldParamName('statusTab'))).toBe('status');
      expect(LEGACY_PARAM_TO_CANONICAL.get(foldParamName('statusLabel'))).toBe('status');
    });

    it('would fail the R3-3 guard if the recognized list were stored raw/camelCase (documented counterfactual)', () => {
      // RECOGNIZED_PARAM_NAMES is built directly from LEGACY_PARAM_NAMES. A raw,
      // unfolded key ("indicatorTab") is deliberately absent from the set — only
      // the folded form is a member. This proves the set itself is folded, not
      // just the lookup helper.
      expect(RECOGNIZED_PARAM_NAMES.has('indicatorTab')).toBe(false);
      expect(RECOGNIZED_PARAM_NAMES.has('indicatortab')).toBe(true);
    });

    it('recognizes canonical parameters case-insensitively too', () => {
      expect(isRecognizedParamName('CONTRACT')).toBe(true);
      expect(isRecognizedParamName('Tab')).toBe(true);
    });

    it('does not recognize an arbitrary unrelated parameter', () => {
      expect(isRecognizedParamName('utm_source')).toBe(false);
      expect(isRecognizedParamName('lever')).toBe(false);
    });
  });

  describe('bounds (R-RCU-005 AC.4, design §5.5)', () => {
    it('caps list parameters at 50 values', () => {
      expect(MAX_LIST_PARAM_VALUES).toBe(50);
    });

    it('caps a single token at 64 characters', () => {
      expect(MAX_PARAM_TOKEN_LENGTH).toBe(64);
    });
  });
});
