/**
 * Correlation outcome for one inbound PRMS decision delivery
 * (design.md §4 `correlation_outcome`, requirements R-PWH-005).
 *
 * VARCHAR-backed TypeScript enum — NOT a MySQL ENUM column — so a new
 * value needs no schema change. That is the property `PrmsSyncOutcome`
 * was built for, preserved here without reusing that enum (DD-1).
 */
export enum DeliveryCorrelationOutcome {
  CORRELATED = 'CORRELATED',
  UNKNOWN_REFERENCE = 'UNKNOWN_REFERENCE',
  NO_REFERENCE = 'NO_REFERENCE',
  MALFORMED = 'MALFORMED',
  DUPLICATE = 'DUPLICATE',
}
