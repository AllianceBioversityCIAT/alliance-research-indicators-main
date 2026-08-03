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
  source_of_funding?: string;
  science_programs?: { code?: string; name?: string; portfolio?: string; allocation?: number }[];
}
