// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-02 / R-BIL-091, R-BIL-097 (D-V2-3, D-V2-7)
//
// Pure constants + functions only — no Nest injectables, no I/O.
// Single source of truth (D-V2-3) for the `result_type` → `allowed_levels`
// rule: both the catalog read (design §6.1) and the alignment write gate
// consume these helpers, so read and write can never diverge
// (R-BIL-091 AC.3).

import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { TocLevel } from '../../../tools/toc-integration/dto/toc-integration.types';

/**
 * Canonical backend-owned `result_type` wire keys (snake_case, stable).
 * `'unknown'` covers null/unrecognized indicator ids.
 */
export type TocResultTypeKey =
  | 'capacity_sharing'
  | 'innovation_dev'
  | 'knowledge_product'
  | 'policy_change'
  | 'oicr'
  | 'innovation_use'
  | 'unknown';

/**
 * Hardcoded mappable live version year (D-V2-7, R-BIL-097). The version
 * gate anchors on `results.report_year_id` (`report_years.report_year`,
 * literal year) compared against this constant — intentionally a constant,
 * not an env var, per the handoff.
 */
export const MAPPABLE_LIVE_VERSION = 2026;

const INDICATOR_RESULT_TYPE_KEYS: Record<IndicatorsEnum, TocResultTypeKey> = {
  [IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]: 'capacity_sharing',
  [IndicatorsEnum.INNOVATION_DEV]: 'innovation_dev',
  [IndicatorsEnum.KNOWLEDGE_PRODUCT]: 'knowledge_product',
  [IndicatorsEnum.POLICY_CHANGE]: 'policy_change',
  [IndicatorsEnum.OICR]: 'oicr',
  [IndicatorsEnum.INNOVATION_USE]: 'innovation_use',
};

/**
 * Maps a result's indicator id (`results.indicator_id` ∈ `IndicatorsEnum`)
 * to the canonical backend-owned `result_type` wire key. Unknown or
 * null/undefined ids resolve to `'unknown'`.
 */
export function resolveResultTypeKey(
  indicatorId: number | null | undefined,
): TocResultTypeKey {
  if (indicatorId === null || indicatorId === undefined) return 'unknown';
  return INDICATOR_RESULT_TYPE_KEYS[indicatorId as IndicatorsEnum] ?? 'unknown';
}

const ALLOWED_LEVELS_BY_RESULT_TYPE: Partial<
  Record<TocResultTypeKey, readonly TocLevel[]>
> = {
  capacity_sharing: ['OUTPUT'],
  innovation_dev: ['OUTPUT'],
  policy_change: ['OUTCOME', 'EOI'],
};

/**
 * Single source of truth (D-V2-3) for the `result_type` → `allowed_levels`
 * rule table (R-BIL-091). Any result type without an explicit row — pending
 * OQ-V2-5 — maps to `[]` (⇒ `catalogs: []`, zero upstream calls).
 */
export function allowedLevelsFor(resultTypeKey: string): TocLevel[] {
  const levels =
    ALLOWED_LEVELS_BY_RESULT_TYPE[resultTypeKey as TocResultTypeKey];
  return levels ? [...levels] : [];
}
