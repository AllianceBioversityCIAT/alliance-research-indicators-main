// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// TypeScript shapes mirroring PRMS public-results-framework `/toc-results`,
// narrowed to the fields we consume. Source: live probe of
// https://prtest-back.ciat.cgiar.org/api/public-results-framework/toc-results
// ?program=SP02&areaOfWork=AOW03 (2026-05-27). Upstream fields we don't use
// are deliberately omitted; add them here on first need rather than carrying
// dead weight.
//
// The upstream wraps its payload in `{ response, statusCode, message, ... }`
// — we only care about `response`, so the service unwraps it before caching.

export interface PrmsTocCenter {
  center_id: string;
  center_acronym: string;
  center_name: string;
}

export interface PrmsTocIndicatorTarget {
  toc_indicator_target_id: string;
  year: string;
  target_value: string;
  number_target: string;
}

export interface PrmsTocTargetsByCenter {
  targets?: PrmsTocIndicatorTarget[];
  centers?: PrmsTocCenter[];
}

export interface PrmsTocIndicator {
  indicator_id: string;
  indicator_description: string;
  toc_result_indicator_id?: string;
  related_node_id?: string;
  unit_messurament?: string | null;
  type_value?: string | null;
  type_name?: string | null;
  location?: string | null;
  target_value_sum?: string | number | null;
  actual_achieved_value_sum?: string | number | null;
  number_target?: string | null;
  target_date?: string | null;
  target_value?: string | null;
  progress_percentage?: string | null;
  result_level_id?: number | null;
  result_type_id?: number | null;
  result_type_name?: string | null;
  targets_by_center?: PrmsTocTargetsByCenter | Record<string, never>;
}

export type PrmsTocResultCategory = 'OUTCOME' | 'OUTPUT' | string;

export interface PrmsTocResult {
  toc_result_id: number;
  category: PrmsTocResultCategory;
  result_title: string;
  related_node_id?: string | null;
  result_level_id?: number | null;
  indicators?: PrmsTocIndicator[];
}

export interface PrmsTocMetadata {
  total?: number;
  outcomes?: number;
  outputs?: number;
}

export interface PrmsTocPayload {
  compositeCode: string; // e.g. "SP02-AOW03"
  year?: number;
  tocResultsOutcomes?: PrmsTocResult[];
  tocResultsOutputs?: PrmsTocResult[];
  metadata?: PrmsTocMetadata;
}

export interface PrmsTocEnvelope {
  response: PrmsTocPayload;
  statusCode?: number;
  message?: string;
  timestamp?: string;
  path?: string;
}
