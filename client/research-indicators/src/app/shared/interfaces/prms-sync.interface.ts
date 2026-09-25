export type PrmsSyncOutcome =
  | 'IN_FLIGHT'
  | 'ACCEPTED'
  | 'REJECTED_BY_PRMS'
  | 'AUTH_FAILED'
  | 'RETRYABLE'
  | 'TRANSPORT_FAILED'
  | 'UNKNOWN'
  | 'REFUSED_BY_STAR';

export interface PrmsSyncResponse {
  outcome: PrmsSyncOutcome;
  attempt_number: number | null;
  http_status: number | null;
  request_id: string | null;
  prms_result_code: number | null;
  failure_reason: string | null;
}
