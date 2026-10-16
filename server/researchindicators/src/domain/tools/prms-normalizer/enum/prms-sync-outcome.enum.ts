/**
 * Sync-attempt outcome vocabulary (design.md §5.4).
 *
 * VARCHAR-backed TypeScript enum — NOT a MySQL ENUM column — so a future
 * PRMS-side verdict (e.g. APPROVED_BY_SP) needs no schema change (R-PRMS-012 AC.3).
 *
 * IN_FLIGHT is the transient claim token; UNKNOWN is an abandoned claim whose
 * verdict is genuinely unknown.
 */
export enum PrmsSyncOutcome {
  IN_FLIGHT = 'IN_FLIGHT',
  ACCEPTED = 'ACCEPTED',
  REJECTED_BY_PRMS = 'REJECTED_BY_PRMS',
  AUTH_FAILED = 'AUTH_FAILED',
  RETRYABLE = 'RETRYABLE',
  TRANSPORT_FAILED = 'TRANSPORT_FAILED',
  UNKNOWN = 'UNKNOWN',
  REFUSED_BY_STAR = 'REFUSED_BY_STAR',
}
