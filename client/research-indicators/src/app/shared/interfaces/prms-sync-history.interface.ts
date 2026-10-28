export type PrmsSyncEventSource = 'STAR' | 'PRMS';

export interface PrmsSyncHistoryEvent {
  id: number;
  event_source: PrmsSyncEventSource;
  status: string | null;
  decision: string | null;
  occurred_at: string;
  decided_at: string | null;
  justification: string | null;
  actor_name: string | null;
  actor_name_short: string | null;
  reviewer_name: string | null;
  reviewer_role: string | null;
  /**
   * Field-level diff from PRMS. Null on every delivery today, and PRMS has
   * committed to no shape — render whatever keys arrive.
   */
  changes?: unknown;
}

export interface PrmsSyncHistoryResponse {
  prms_result_code: number | null;
  prms_phase_id: number | null;
  /** PRIMARY Science Program of the pushed version (e.g. `SP03`); part of the PRMS review link. */
  prms_sp_code?: string | null;
  sync_count: number;
  events: PrmsSyncHistoryEvent[];
}
