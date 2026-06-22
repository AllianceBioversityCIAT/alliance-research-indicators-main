// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-01 / R-BIL-090, NFR-BIL-090..092
//
// TypeScript shapes mirroring lambda-toc
// `GET /api/toc-integration/toc/results/category/{LEVEL}/initiative/{SP}`.
// Source: live probe of https://lambda-toc.clarisa.cgiar.org (2026-06-09).
// Field names mirror the upstream payload VERBATIM — including the upstream
// typo `unit_messurament` (sic). The wire-shape rename to
// `unit_of_measurement` happens in the consumer mapping (design §6.1 step 6),
// NOT here.
//
// The upstream wraps its payload in `{ response: [...] }` — the service
// unwraps it before caching, so callers only ever see `TocResult[]`.

/**
 * ToC result category levels accepted by lambda-toc. Unknown levels do NOT
 * 404 upstream — they return `{"response":[]}` with HTTP 200, so level
 * validity MUST come from `TocLevelRulesUtil`, never from emptiness.
 */
export type TocLevel = 'OUTPUT' | 'OUTCOME' | 'EOI';

export interface TocIndicatorTarget {
  target_value: string | null;
  target_date: string | null;
}

export interface TocIndicator {
  indicator_id: number;
  toc_result_indicator_id: string;
  related_node_id: string;
  indicator_description: string;
  /** sic — upstream typo, mirrored verbatim. */
  unit_messurament: string | null;
  type_value: string | null;
  type_name: string | null;
  location: string | null;
  targets: TocIndicatorTarget[];
}

export interface TocResult {
  toc_result_id: number;
  toc_internal_id: string;
  title: string;
  description: string | null;
  toc_type_id: number | null;
  toc_level_id: number | null;
  /** Science Program official code, e.g. `SP01`. */
  official_code: string;
  work_package_id: string | null;
  /** AOW short name, e.g. `AOW01`. Null for `EOI` results. */
  wp_short_name: string | null;
  phase: string;
  version_id: string;
  indicators: TocIndicator[];
}

export interface TocIntegrationEnvelope {
  response: TocResult[];
}
