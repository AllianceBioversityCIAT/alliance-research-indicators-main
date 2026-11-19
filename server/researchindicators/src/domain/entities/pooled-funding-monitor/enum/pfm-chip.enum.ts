export enum PfmChipEnum {
  ALL = 'all',
  NEED_ATTENTION = 'need_attention',
  MAPPING_INCOMPLETE = 'mapping_incomplete',
  READY_TO_SYNC = 'ready_to_sync',
  REJECTED = 'rejected',
  SYNCED = 'synced',
  /** Coverage-tab views (not shown as quick views). */
  AWAITING_PI = 'awaiting_pi',
  NO_SP_CONTRIBUTION = 'no_sp_contribution',
  PRMS_PENDING = 'prms_pending',
  PRMS_APPROVED = 'prms_approved',
  /** TIP rows in PRMS scope, not in PRMS yet: visible, no action in STAR (DD-PFM-40). */
  MANAGED_IN_TIP = 'managed_in_tip',
  /**
   * One view per card of the coverage journey: the queue shows exactly the results the card
   * counts (same `journey` path, DD-PFM-42). Opened from the journey only; not counted in
   * `chip_counts`.
   */
  JOURNEY_DRAFT = 'journey_draft',
  JOURNEY_SUBMITTED = 'journey_submitted',
  JOURNEY_APPROVED = 'journey_approved',
  JOURNEY_COMPLETED_IN_TIP = 'journey_completed_in_tip',
  JOURNEY_NOT_ANSWERED = 'journey_not_answered',
  JOURNEY_CONTRIBUTES = 'journey_contributes',
  JOURNEY_NO_SP = 'journey_no_sp',
  JOURNEY_MAPPING_INCOMPLETE = 'journey_mapping_incomplete',
  JOURNEY_MAPPING_COMPLETE = 'journey_mapping_complete',
  JOURNEY_READY = 'journey_ready',
  JOURNEY_SYNCED = 'journey_synced',
}
