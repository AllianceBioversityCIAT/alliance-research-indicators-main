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
}
