import { StatusConfig } from '@shared/interfaces/result-config.interface';
// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-07
// Wire types of design §4, mirrored from the server DTOs/enums in
// server/researchindicators/src/domain/entities/pooled-funding-monitor/. Read-only feature.

export const PFM_SCOPES = ['mine', 'all'] as const;
export type PfmScope = (typeof PFM_SCOPES)[number];

export const PFM_TABS = ['coverage', 'queue'] as const;
export type PfmTab = (typeof PFM_TABS)[number];

export const PFM_CHIPS = ['all', 'need_attention', 'mapping_incomplete', 'ready_to_sync', 'awaiting_pi', 'rejected', 'synced'] as const;
export type PfmChip = (typeof PFM_CHIPS)[number];

export const PFM_STATUS_FILTERS = ['all', 'ready_to_sync', 'mapping_pending', 'synced', 'awaiting_pi', 'under_review', 'draft'] as const;
export type PfmStatusFilter = (typeof PFM_STATUS_FILTERS)[number];

export const PFM_STAR_LABELS = ['Draft', 'Submitted', 'Under review', 'Approved', 'Returned'] as const;
export type PfmStarLabel = (typeof PFM_STAR_LABELS)[number];

export const PFM_MAPPING_STATES = ['Not started', 'Incomplete', 'Complete', 'No SP contribution'] as const;
export type PfmMappingState = (typeof PFM_MAPPING_STATES)[number];

export const PFM_PRMS_STATUSES = ['Not sent', 'Pending Review', 'Approved', 'Rejected'] as const;
export type PfmPrmsStatus = (typeof PFM_PRMS_STATUSES)[number];

export type PfmPipelineGroup = 'in_star' | 'in_prms' | 'out_of_scope';

// ─── Summary ────────────────────────────────────────────────────────────────
export interface PfmKpis {
  projects: number;
  projects_total: number;
  monitored: number;
  need_attention: number;
  synced: number;
  in_prms_scope: number;
}

export interface PfmPipelineStage {
  key: string;
  group: PfmPipelineGroup;
  value: number;
}

export interface PfmPipeline {
  total: number;
  in_scope: number;
  not_synced: number;
  in_prms: number;
  out_of_scope: number;
  stages: PfmPipelineStage[];
}

export interface PfmSpCoverage {
  code: string;
  name: string;
  synced: number;
  total: number;
}

export interface PfmMonthly {
  /** 'YYYY-MM' */
  month: string;
  synced: number;
}

export interface PfmSummary {
  scope: PfmScope;
  is_pi_of_any: boolean;
  kpis: PfmKpis;
  pipeline: PfmPipeline;
  sp_coverage: PfmSpCoverage[];
  monthly: PfmMonthly[];
  synced_this_year: number;
}

// ─── Queue ──────────────────────────────────────────────────────────────────
export interface PfmCodeName {
  code: string;
  name: string;
}

export interface PfmSpGroupOption {
  category: string;
  items: PfmCodeName[];
}

export interface PfmTypeOption {
  id: number;
  name: string;
}

export interface PfmFilterOptions {
  projects: PfmCodeName[];
  science_programs: PfmSpGroupOption[];
  types: PfmTypeOption[];
}

export interface PfmChipCounts {
  all: number;
  attention: number;
  mapping: number;
  ready: number;
  pending: number;
  prms_rejected: number;
  synced: number;
}

export interface PfmGroupCounts {
  approved: number;
  pending: number;
  rejected: number;
  out_of_scope: number;
  not_sent: number;
}

export interface PfmGroup {
  code: string;
  name: string | null;
  lead_pi: string | null;
  donor: string | null;
  result_count: number;
  attention: number;
  counts: PfmGroupCounts;
}

export interface PfmTotals {
  results: number;
  projects: number;
  monitored_total: number;
}

export interface PfmQueue {
  filter_options: PfmFilterOptions;
  chip_counts: PfmChipCounts;
  groups: PfmGroup[];
  totals: PfmTotals;
}

export interface PfmSpRef {
  code: string;
  name: string;
  color: string | null;
}

export interface PfmResultRow {
  /** Platform + official code, e.g. 'STAR-1234'. */
  result_code: string;
  platform_code: string;
  official_code: number;
  report_year: number;
  /** Active snapshot years, newest first. */
  snapshot_years: number[];
  title: string | null;
  type: string | null;
  /** Creator display name; null when the server could not resolve one. */
  creator: string | null;
  star_label: PfmStarLabel;
  star_status_id: number;
  /** result_status.name: the text the Results Center shows for this status; null when unresolved. */
  star_status_name: string | null;
  /** result_status.config (same shape the Results Center colours its status tag from); null when unset. */
  star_status_config: StatusConfig | null;
  pi_line: string;
  mapping_state: PfmMappingState;
  mapping_note: string;
  sp_line: string;
  primary_sp: PfmSpRef | null;
  contributing: PfmSpRef[];
  prms_status: PfmPrmsStatus;
  prms_hint: string;
  /**
   * Server-formatted UTC display label ("dd Mon, HH:mm", or "—" when null) — NOT an
   * ISO date. Render as-is; never parse or re-format it.
   */
  updated_at: string;
}

// ─── Client-side state shapes ───────────────────────────────────────────────
export interface PfmFilters {
  project: string | null;
  sp: string | null;
  status: PfmStatusFilter | null;
  type: number | null;
}

/** Query accepted by /queue and /queue/projects/:projectCode/results. */
export interface PfmQueueQuery {
  scope: PfmScope;
  project?: string | null;
  sp?: string | null;
  status?: PfmStatusFilter | null;
  type?: number | null;
  chip?: PfmChip | null;
}

export interface PfmSectionState {
  loading: boolean;
  error: boolean;
}

/** `?a=1&b=2` from the query, omitting null / undefined / '' values. '' when nothing remains. */
export function pfmQueryString(query: PfmQueueQuery | { scope: PfmScope }): string {
  const parts = Object.entries(query as Record<string, string | number | null | undefined>)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string | number)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
