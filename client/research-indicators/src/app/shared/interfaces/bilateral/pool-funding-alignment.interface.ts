export interface AlignmentLever {
  lever_code: string;
  lever_name: string;
}

export interface AlignmentScienceProgram {
  code: string;
  name: string;
  category?: string | null;
  color?: string | null;
}

export interface AlignmentResponse {
  result_code: string;
  eligible: boolean;
  has_pool_funding_alignment_eligible: boolean;
  has_contribution: boolean | null;
  selected_science_programs?: AlignmentScienceProgram[];
  selected_levers: AlignmentLever[];
  justification?: string;
  is_synced_to_prms: boolean;
  is_read_only: boolean;
  toc_alignments?: SavedTocAlignment[];
}

export interface UpdatePoolFundingAlignmentDto {
  has_contribution: boolean;
  sp_codes?: string[];
  lever_codes?: string[];
  justification?: string;
  toc_alignments?: TocAlignmentWriteDto[];
}

export interface AlignmentChangedEvent {
  result_code: string;
  by_user_id: number;
  at: string;
}

/**
 * Discriminator on the per-result SP picker response.
 * `mapped` = an active bilateral_project_mapping row exists for the result's contract;
 * `unmapped` = it doesn't (and `science_programs` is empty, `clarisa_project` is null).
 * @sdd-spec docs/specs/bilateral-module/alignment-section-remediation (REQ-BIL-ASR-01)
 */
export type PoolFundingMappingStatus = 'mapped' | 'unmapped';

export interface PoolFundingClarisaProject {
  id: number;
  short_name: string;
}

/**
 * A Science Program scoped to the result's mapped CLARISA project. `code` is the
 * value sent back on PATCH `sp_codes`. `color` is upstream CLARISA data (a fill
 * value, not a design token). `icon_key` resolves an asset at
 * `/sps/{icon_key}.png` (the provisioned STAR path; `icon_key === code` in current
 * backend fixtures). See spec AC-01.6.
 */
export interface PoolFundingScienceProgram {
  code: string;
  name: string;
  category?: string | null;
  color?: string | null;
  icon_key: string;
  allocation: number;
}

/**
 * Response of `GET /v1/results/{numericResultCode}/pool-funding-alignment/science-programs`.
 * When `mapping_status === 'unmapped'`, `science_programs` is `[]` and
 * `clarisa_project` is `null` — the FE must NOT fall back to the catalog-wide list.
 */
export interface PoolFundingSciencePrograms {
  result_code: string;
  mapping_status: PoolFundingMappingStatus;
  clarisa_project: PoolFundingClarisaProject | null;
  science_programs: PoolFundingScienceProgram[];
}

// --- ToC mapping v2 wire types (reshaped `hlos-indicators` catalog) ----------
// Mirrors `docs/specs/bilateral-module/toc-mapping-v2/backend-handoff.md` §4
// field-for-field (frozen FE wire contract): catalog read, PATCH write
// extension, and the `toc_alignments` read-back on the alignment envelope.
// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2

export type TocLevel = 'OUTPUT' | 'OUTCOME' | 'EOI';

export interface TocCatalogIndicator {
  indicator_id: number;
  indicator_description: string;
  unit_of_measurement: string | null; // backend renames upstream `unit_messurament`
  type_value: string | null; // consumed by the indicator-type guidance (docs/specs/bilateral-module/toc-indicator-type-guidance)
  target_value: string | null; // backend-resolved for target_year
  target_year: number; // 2026 this cycle
}

export interface TocCatalogResult {
  toc_result_id: number;
  title: string;
  description: string | null;
  aow_code: string | null; // null for EOI (REQ-BIL-TM2-05)
  indicators: TocCatalogIndicator[];
}

export interface TocCatalogLevelGroup {
  level: TocLevel;
  toc_results: TocCatalogResult[];
}

export interface TocCatalogSp {
  sp_code: string;
  levels: TocCatalogLevelGroup[];
}

export interface BilateralTocCatalogResponse {
  result_code: string;
  mapping_status: PoolFundingMappingStatus;
  clarisa_project: PoolFundingClarisaProject | null;
  result_type: string; // backend-owned enum key — drives the indicator-type guidance (docs/specs/bilateral-module/toc-indicator-type-guidance)
  allowed_levels: TocLevel[]; // [] ⇒ hide cascade (REQ-BIL-TM2-04 AC-04.3)
  version_locked: boolean; // REQ-BIL-TM2-09
  catalogs: TocCatalogSp[];
}

/**
 * Saved ToC alignment read-back (rides `AlignmentResponse.toc_alignments`).
 * FLAT shape matching the backend `TocAlignmentReadbackResponse` (decision D-10,
 * design.md §2.2 + §11): the snapshot display fields live on the row itself —
 * NO `snapshot` wrapper, NO `aow_code`, NO `is_stale`. Backend always sends all
 * fields; they are `null` on "No" rows / when absent. Staleness is derived FE-side
 * by re-resolving `toc_result_id` against the live catalog.
 */
export interface SavedTocAlignment {
  sp_code: string;
  aligns_with_toc: boolean;
  level: TocLevel | null;
  toc_result_id: number | null;
  indicator_id: number | null;
  quantitative_contribution: number | null;
  toc_result_title: string | null;
  indicator_description: string | null;
  unit_of_measurement: string | null;
  target_value: string | null;
  target_year: number | null;
}

export interface TocAlignmentWriteDto {
  sp_code: string;
  aligns_with_toc: boolean;
  level?: TocLevel;
  toc_result_id?: number;
  indicator_id?: number;
  quantitative_contribution?: number;
}

// Derived FE view-model (NOT a wire type) — per-SP draft for the inline cascade.
export interface SpAlignmentDraft {
  sp_code: string;
  aligns_with_toc: boolean | null; // per-SP Yes/No (null until answered)
  level: TocLevel | null;
  toc_result_id: number | null;
  indicator_id: number | null;
  quantitative_contribution: number | null;
}
