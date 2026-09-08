export type BilateralMappingSource = 'MANUAL' | 'DERIVED' | 'AI_SUGGESTED' | 'AI_AUTO' | 'UNMAPPED';
export type MappingStatus = 'Mapped' | 'Pending' | 'Inactive';

export interface BilateralProjectMapping {
  id: number;
  agresso_agreement_id: string;
  agresso_description?: string | null;
  clarisa_project_id: number;
  clarisa_project_short_name?: string | null;
  clarisa_project_full_name?: string | null;
  source: BilateralMappingSource;
  confidence_score?: number | null;
  notes?: string | null;
  is_active: boolean;
  mapping_status?: MappingStatus;
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
  status?: 'all' | 'mapped' | 'pending' | 'inactive';
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

// ── Automapper (S2 — T-06) ──────────────────────────────────────────────────

export interface AutomapperRunRequest {
  phase?: number;
}

export interface AutomapperCandidate {
  clarisaProjectId: number;
  clarisaProjectFullName: string | null;
  clarisaProjectShortName: string | null;
  externalCode: string | null;
  derivedContractId: string;
}

export interface AutomapperReconciledEntry extends AutomapperCandidate {
  action: 'alreadyMapped' | 'divergent' | 'supersede';
  existingMappingId: number;
  existingClarisaProjectId: number;
}

export interface AutomapperToCreateEntry extends AutomapperCandidate {
  action: 'toCreate';
}

export interface AutomapperPreviewCounts {
  toCreate: number;
  alreadyMapped: number;
  ambiguous: number;
  unresolved: number;
  divergent: number;
  supersede: number;
}

export interface AutomapperPreviewResponse {
  feedFetchedAt: string | null;
  counts: AutomapperPreviewCounts;
  toCreate: AutomapperToCreateEntry[];
  alreadyMapped: AutomapperReconciledEntry[];
  ambiguous: AutomapperCandidate[];
  unresolved: AutomapperCandidate[];
  divergent: AutomapperReconciledEntry[];
  supersede: AutomapperReconciledEntry[];
}

export interface AutomapperApplyCounts {
  created: number;
  alreadyMapped: number;
  ambiguous: number;
  unresolved: number;
  divergent: number;
  superseded: number;
}

export interface AutomapperApplyResponse {
  feedFetchedAt: string | null;
  counts: AutomapperApplyCounts;
  ambiguous: AutomapperCandidate[];
  unresolved: AutomapperCandidate[];
}

export interface AutomapperCoverage {
  mapped: number;
  pending: number;
  reachable: number;
}

/**
 * Formats a project label for display (R-5 / F-A).
 * Collapses the label to a single name when short_name === full_name (case-insensitive),
 * rendering `${short_name} — ${full_name}` only when both are present and distinct.
 */
export function formatClarisaProjectLabel(project: {
  short_name?: string | null;
  full_name?: string | null;
  clarisaProjectShortName?: string | null;
  clarisaProjectFullName?: string | null;
  id?: number;
  clarisaProjectId?: number;
}): string {
  const shortName = (project.clarisaProjectShortName ?? project.short_name)?.trim() || '';
  const fullName = (project.clarisaProjectFullName ?? project.full_name)?.trim() || '';
  const id = project.clarisaProjectId ?? project.id;

  if (!shortName && !fullName) {
    return id !== undefined ? `Project #${id}` : '';
  }
  if (!shortName) return fullName;
  if (!fullName) return shortName;
  if (shortName.toLowerCase() === fullName.toLowerCase()) {
    return shortName;
  }
  return `${shortName} — ${fullName}`;
}


