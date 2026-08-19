export type BilateralMappingSource = 'MANUAL' | 'AI_SUGGESTED' | 'AI_AUTO';

export interface BilateralProjectMapping {
  id: number;
  agresso_agreement_id: string;
  clarisa_project_id: number;
  clarisa_project_short_name?: string | null;
  source: BilateralMappingSource;
  confidence_score?: number | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}

export interface BilateralMappingListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BilateralMappingListPage {
  items: BilateralProjectMapping[];
  meta: BilateralMappingListMeta;
}

export interface BilateralMappingListQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  source?: BilateralMappingSource;
}

// The MANUAL-only FE omits `source`/`confidence_score` on create: the server
// defaults `source` to MANUAL. Both fields are whitelisted server-side, we simply
// don't send them.
export interface CreateBilateralMappingBody {
  agresso_agreement_id: string;
  clarisa_project_id: number;
  clarisa_project_short_name?: string;
  notes?: string;
}

// `agresso_agreement_id` is not updatable server-side, so it is excluded here.
export interface UpdateBilateralMappingBody {
  clarisa_project_id?: number;
  clarisa_project_short_name?: string;
  notes?: string;
}

// Picker view model (shape confirmed against live backend — see design.md §11 OQ-1).
export interface ClarisaBilateralProjectOption {
  id: number;
  short_name: string;
  full_name?: string;
  description?: string;
  external_code?: string;
  source_of_funding?: string;
  science_programs?: { code?: string; name?: string; portfolio?: string; allocation?: number }[];
}

// @akili-spec docs/specs/bilateral/clarisa-phase-config-variable — T-03 / R-CPC-003, R-CPC-004
// Mirrors the server's ClarisaProjectPhasesResponse (T-02) — the distinct
// `phase` values present in the eligible (bilateral + Alliance) cohort, each
// with a per-year project count, plus a separate count of eligible projects
// whose phase could not be resolved. Powers the admin-editable year selector
// in the Configuration Variables edit modal (design.md §7.2).
export interface ClarisaProjectPhaseCount {
  /** A distinct phase value present in the eligible cohort, e.g. 2025. */
  phase: number;
  /** Number of eligible projects carrying this phase. */
  count: number;
}

export interface ClarisaProjectPhasesResponse {
  /** Distinct phases with their project counts, ordered descending by phase. */
  phases: ClarisaProjectPhaseCount[];
  /**
   * Count of eligible projects whose phase is absent/unresolvable. Lets the
   * client distinguish "CLARISA publishes no phase data" from "there are no
   * projects" (R-CPC-003 scenario 2).
   */
  phaseAbsentCount: number;
}

