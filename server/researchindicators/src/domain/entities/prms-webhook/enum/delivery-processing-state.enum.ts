/**
 * Durable processing marker for one `prms_webhook_delivery` row
 * (design.md §4 `processing_state`).
 *
 * VARCHAR-backed TypeScript enum — NOT a MySQL ENUM column.
 * `RECEIVED` is what the repository writes at insert. The correlator
 * moves a row to `PROCESSED` or `PROCESSING_FAILED` (DD-4). This is
 * the only vocabulary for the column.
 */
export enum DeliveryProcessingState {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
}
