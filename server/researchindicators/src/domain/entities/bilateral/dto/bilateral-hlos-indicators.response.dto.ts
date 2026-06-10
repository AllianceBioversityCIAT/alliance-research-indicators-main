// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090, R-BIL-091, R-BIL-097
//
// Response shape for
//   GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators
//
// FROZEN FE envelope (design §5) — byte-compatible with the STAR client
// handoff §4. The FE builds Jest fixtures against these exact field names;
// do NOT rename without a spec change.
//
// Design notes (see ../design.md §5 / §6.1):
//   - Catalogs are keyed (Science Program, level) and sourced from lambda-toc
//     via `TocIntegrationService` — the legacy (SP, AOW)-pair PRMS fan-out
//     (`pairs` / `aow_status` / `no_aow_mappings`) is gone (R-BIL-090 AC.2).
//   - `result_type` + `allowed_levels` are computed server-side ONLY, via
//     `utils/toc-level-rules.util.ts` (single source of truth, D-V2-3).
//     `allowed_levels: []` ⇒ `catalogs: []` and zero upstream calls.
//   - `version_locked` = result's live version year !== MAPPABLE_LIVE_VERSION
//     (2026, D-V2-7). Catalogs are still returned when locked — the FE
//     renders the locked state (R-BIL-097).
//   - Every top-level field is present in EVERY response variant, including
//     unmapped (`mapping_status: 'unmapped'`, `catalogs: []`).
//   - An upstream `{"response":[]}` for an (SP, level) is a VALID empty
//     catalog: the level entry stays with `toc_results: []` (R-BIL-090 AC.5).

import { TocLevel } from '../../../tools/toc-integration/dto/toc-integration.types';

export type BilateralTocMappingStatus = 'mapped' | 'unmapped';

export interface BilateralTocCatalogIndicator {
  indicator_id: number;
  indicator_description: string;
  // Renamed on the wire from the upstream typo `unit_messurament` (D-V2-4).
  unit_of_measurement: string;
  // Unfiltered passthrough (OQ-V2-2).
  type_value: string;
  // Resolved from upstream `targets[]` for target_year — the 11-element
  // array never appears on the wire (R-BIL-090 AC.3).
  target_value: string | null;
  target_year: number; // MAPPABLE_LIVE_VERSION (2026)
}

export interface BilateralTocCatalogResult {
  toc_result_id: number;
  title: string;
  description: string;
  // Upstream `wp_short_name`; null for `EOI`-level results.
  aow_code: string | null;
  indicators: BilateralTocCatalogIndicator[];
}

export interface BilateralTocLevelCatalog {
  level: TocLevel;
  toc_results: BilateralTocCatalogResult[];
}

export interface BilateralSpCatalog {
  sp_code: string; // e.g. "SP01"
  levels: BilateralTocLevelCatalog[]; // one entry per allowed level, in rule order
}

export interface BilateralHlosIndicatorsResponse {
  result_code: string;
  mapping_status: BilateralTocMappingStatus;
  clarisa_project: { id: number; short_name: string } | null;
  // Canonical backend-owned key, e.g. 'capacity_sharing' (TocResultTypeKey).
  result_type: string;
  allowed_levels: TocLevel[];
  version_locked: boolean;
  catalogs: BilateralSpCatalog[]; // one entry per SP, in deterministic SP order
}
