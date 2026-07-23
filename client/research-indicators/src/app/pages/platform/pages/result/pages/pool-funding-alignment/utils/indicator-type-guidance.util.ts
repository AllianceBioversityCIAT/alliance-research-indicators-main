// @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-01 / REQ-BIL-ITG-01)
//
// Pure indicator-type classification for the ToC alignment cascade guidance.
// No Angular imports, no I/O — total functions only (AC-05.3).

/**
 * Classification of a ToC catalog indicator relative to the result's `result_type`:
 * - `type-match`: the indicator's `type_value` is the canonical value for this result type.
 * - `wildcard`: `type_value === 'custom'` (fits any matrixed result type).
 * - `other`: a recognized canonical `type_value` that maps to a DIFFERENT result type.
 * - `unclassified`: null/empty/`_n_*`/unrecognized `type_value`, or a result type with no matrix row.
 */
export type IndicatorTypeClassification = 'type-match' | 'wildcard' | 'other' | 'unclassified';

/**
 * Compatibility matrix: `result_type` key → canonical `type_value` (REQ-BIL-ITG-01).
 *
 * Matching is EXACT-STRING (after trim), case-sensitive, by design (D-ITG-6): the upstream
 * values are machine-written enum-ish strings from the ToC/CLARISA lambda. Fuzzy matching
 * would silently absorb upstream renames; instead the fixture/unit tests act as the canary —
 * if upstream renames a value, tests fail loudly and this one constant is the one-line fix.
 */
export const TOC_TYPE_MATRIX: Record<string, string> = {
  capacity_sharing: 'Number of people trained (capacity sharing for development)',
  innovation_dev: 'Number of innovations (innovation development)',
  knowledge_product: 'Number of knowledge products',
  policy_change: 'Number of Policy (Policy Change)',
  innovation_use: 'Innovation Use'
};

/** `result_type` key → display label used in guidance copy (requirements §4 header). */
export const RESULT_TYPE_LABELS: Record<string, string> = {
  capacity_sharing: 'Capacity Sharing for Development',
  innovation_dev: 'Innovation Development',
  knowledge_product: 'Knowledge Product',
  policy_change: 'Policy Change',
  innovation_use: 'Innovation Use'
};

/** Canonical `type_value` (plus `custom`) → short badge label (AC-02.2). */
export const TYPE_BADGE_LABELS: Record<string, string> = {
  'Number of people trained (capacity sharing for development)': 'Trained people',
  'Number of innovations (innovation development)': 'Innovations',
  'Number of knowledge products': 'Knowledge products',
  'Number of Policy (Policy Change)': 'Policy',
  'Innovation Use': 'Innovation use',
  custom: 'Custom'
};

/** The canonical `type_value` set (matrix values), used to distinguish `other` from `unclassified`. */
const CANONICAL_TYPE_VALUES: ReadonlySet<string> = new Set(Object.values(TOC_TYPE_MATRIX));

/**
 * Classify an indicator's `type_value` relative to the result's `result_type` (AC-01.1..01.4).
 *
 * Total function — never throws (AC-05.3):
 * - `resultType` without a matrix row (null/undefined/`oicr`/`unknown`/anything else) ⇒
 *   `'unclassified'` for every input — the guidance-disabled path (AC-05.1).
 * - `typeValue` is compared after `trim()`; matching is exact-string, case-sensitive (AC-01.4 / D-ITG-6).
 * - `'custom'` ⇒ `'wildcard'` (AC-01.2); the matrix row's value ⇒ `'type-match'`;
 *   any OTHER canonical value ⇒ `'other'`; everything else (null, empty, `_n_*`, cased
 *   variants, free text) ⇒ `'unclassified'`, never `'other'` (AC-01.3).
 */
export function classifyIndicator(resultType: string | null | undefined, typeValue: string | null | undefined): IndicatorTypeClassification {
  if (typeof resultType !== 'string' || !Object.hasOwn(TOC_TYPE_MATRIX, resultType)) {
    return 'unclassified';
  }

  const trimmed = typeof typeValue === 'string' ? typeValue.trim() : '';
  if (trimmed === 'custom') {
    return 'wildcard';
  }
  if (trimmed === TOC_TYPE_MATRIX[resultType]) {
    return 'type-match';
  }
  if (CANONICAL_TYPE_VALUES.has(trimmed)) {
    return 'other';
  }
  return 'unclassified';
}
