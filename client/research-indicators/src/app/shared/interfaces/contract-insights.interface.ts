import { SectionMeta } from '@shared/interfaces/contract-indicator-details.interface';

// ---------------------------------------------------------------------------
// Reach (result_actors) — portfolio-wide gender x youth disaggregation
// ---------------------------------------------------------------------------

export interface ReachDisaggregation {
  women_youth: number;
  women_not_youth: number;
  men_youth: number;
  men_not_youth: number;
  total: number;
}

export interface ReachByActorType extends ReachDisaggregation {
  actor_type_id: number | null;
  actor_type_name: string;
}

export interface ReachSection {
  meta: SectionMeta;
  overall: ReachDisaggregation;
  by_actor_type: ReachByActorType[];
  not_disaggregated_rows: number;
}

// ---------------------------------------------------------------------------
// SDG coverage (result_sdgs + clarisa_sdgs)
// ---------------------------------------------------------------------------

export interface SdgCoverageItem {
  sdg_id: number;
  short_name: string;
  full_name: string;
  count: number;
}

export interface SdgCoverageSection {
  meta: SectionMeta;
  sdgs: SdgCoverageItem[];
}

// ---------------------------------------------------------------------------
// Evidence (result_evidences + evidence_roles)
// ---------------------------------------------------------------------------

export interface EvidenceRoleCount {
  evidence_role_id: number;
  name: string;
  count: number;
}

export interface EvidenceSection {
  meta: SectionMeta;
  results_with_evidence: number;
  evidences_total: number;
  public_count: number;
  private_count: number;
  by_role: EvidenceRoleCount[];
}

// ---------------------------------------------------------------------------
// Review flow (result_review_history)
// ---------------------------------------------------------------------------

export interface ReviewFlowEventTypeCount {
  event_type: string;
  label: string;
  count: number;
}

export interface ReviewFlowDecisionCount {
  decision: string;
  label: string;
  count: number;
}

export interface ReviewFlowCycleTime {
  median_days: number | null;
  p90_days: number | null;
  sample_size: number;
}

export interface ReviewFlowSection {
  meta: SectionMeta;
  by_event_type: ReviewFlowEventTypeCount[];
  by_decision: ReviewFlowDecisionCount[];
  cycle_time: ReviewFlowCycleTime;
  excluded_for_incomplete_history: number;
}

// ---------------------------------------------------------------------------
// Contributing levers (result_levers where is_primary = FALSE)
// ---------------------------------------------------------------------------

export interface ContributingLeverItem {
  lever_id: number;
  short_name: string;
  full_name: string;
  count: number;
}

export interface ContributingLeversSection {
  meta: SectionMeta;
  levers: ContributingLeverItem[];
}

// ---------------------------------------------------------------------------
// Keywords (result_keywords, normalized)
// ---------------------------------------------------------------------------

export interface KeywordCount {
  keyword: string;
  count: number;
}

export interface KeywordsSection {
  meta: SectionMeta;
  keywords: KeywordCount[];
}

// ---------------------------------------------------------------------------
// Top-level aggregate — all six keys always present; null = section failed
// ---------------------------------------------------------------------------

export interface ContractInsightsReport {
  reach: ReachSection | null;
  sdg_coverage: SdgCoverageSection | null;
  evidence: EvidenceSection | null;
  review_flow: ReviewFlowSection | null;
  contributing_levers: ContributingLeversSection | null;
  keywords: KeywordsSection | null;
}
