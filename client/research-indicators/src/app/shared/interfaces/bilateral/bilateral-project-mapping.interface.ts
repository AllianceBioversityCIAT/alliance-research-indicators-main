export type BilateralMappingSource = 'MANUAL' | 'DERIVED' | 'AI_SUGGESTED' | 'AI_AUTO' | 'UNMAPPED';
export type MappingStatus = 'Mapped' | 'Pending' | 'Inactive';

export interface BilateralProjectMapping {
  id: number;
  reporting_year: number;
  agresso_agreement_id: string;
  agresso_description?: string | null;
  clarisa_project_id: number;
  clarisa_project_short_name?: string | null;
  clarisa_project_full_name?: string | null;
  /** Normalized CLARISA external code stored on the mapping row. */
  clarisa_external_code?: string | null;
  source: BilateralMappingSource;
  confidence_score?: number | null;
  notes?: string | null;
  /** Last inactivation reason. Null until the mapping has been inactivated. */
  status_justification?: string | null;
  is_active: boolean;
  mapping_status?: MappingStatus;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}

/** POST create/upsert payload: the row plus whether the server inserted or updated it. */
export interface BilateralMappingUpsertResult extends BilateralProjectMapping {
  outcome: 'created' | 'updated';
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

// ── Automapper (annualized-project-mapping — design §5) ────────────────────
// The run request stays empty: the server rejects any caller field, including
// a year (R-APM-003). `{}` is the only body the client sends.

export interface AutomapperCandidate {
  clarisaProjectId: number;
  clarisaProjectFullName: string | null;
  clarisaProjectShortName: string | null;
  externalCode: string | null;
  derivedContractId: string;
}

export interface AutomapperReconciledEntry extends AutomapperCandidate {
  action: 'alreadyMapped' | 'divergent' | 'toUpdate';
  existingMappingId: number;
  existingClarisaProjectId: number;
}

export interface AutomapperInactiveEntry extends AutomapperCandidate {
  action: 'inactive';
  existingMappingId: number;
  existingClarisaProjectId: number;
  /** True when Apply rewrote this inactive row's CLARISA fields in place. */
  refreshed: boolean;
}

export interface AutomapperToCreateEntry extends AutomapperCandidate {
  action: 'toCreate';
}

export interface AutomapperPreviewCounts {
  toCreate: number;
  alreadyMapped: number;
  toUpdate: number;
  ambiguous: number;
  unresolved: number;
  divergent: number;
  inactive: number;
}

export interface AutomapperPreviewResponse {
  reporting_year: number;
  feedFetchedAt: string | null;
  counts: AutomapperPreviewCounts;
  toCreate: AutomapperToCreateEntry[];
  alreadyMapped: AutomapperReconciledEntry[];
  toUpdate: AutomapperReconciledEntry[];
  ambiguous: AutomapperCandidate[];
  unresolved: AutomapperCandidate[];
  divergent: AutomapperReconciledEntry[];
  inactive: AutomapperInactiveEntry[];
}

export interface AutomapperApplyCounts {
  created: number;
  /** Row-3 in-place updates only. Row-6 refreshes are counted under `inactive`. */
  updated: number;
  alreadyMapped: number;
  ambiguous: number;
  unresolved: number;
  divergent: number;
  inactive: number;
}

export interface AutomapperApplyResponse {
  reporting_year: number;
  feedFetchedAt: string | null;
  counts: AutomapperApplyCounts;
  ambiguous: AutomapperCandidate[];
  unresolved: AutomapperCandidate[];
}

export interface AutomapperCoverage {
  reporting_year: number;
  mapped: number;
  pending: number;
  inactive: number;
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
