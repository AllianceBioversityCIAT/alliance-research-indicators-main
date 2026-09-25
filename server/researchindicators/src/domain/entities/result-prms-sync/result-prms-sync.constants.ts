/**
 * Claim-then-settle constants (design.md §5.1b).
 * Transport ceiling is BaseApi's 30 s timeout; the expiry margin is 60 s.
 * An IN_FLIGHT row older than the sum is aged — never superseded (DD-16).
 */
export const PRMS_TRANSPORT_CEILING_MS = 30_000;
export const PRMS_CLAIM_EXPIRY_MARGIN_MS = 60_000;
export const PRMS_IN_FLIGHT_LIVE_WINDOW_MS =
  PRMS_TRANSPORT_CEILING_MS + PRMS_CLAIM_EXPIRY_MARGIN_MS;

/** Gate entry 2 / claim branch 1 — sequential already-synced 409. */
export const PRMS_SYNC_ALREADY_SYNCED = 'Result is already synced to PRMS';

/** Live IN_FLIGHT collision 409. Distinct from {@link PRMS_SYNC_ALREADY_SYNCED}. */
export const PRMS_SYNC_CLAIM_COLLISION =
  'A PRMS sync is already in progress for this result';

/**
 * AC.5 / risk R-4: the only control standing between a human and an
 * unverified re-send after expiry. Must name the unconfirmed attempt.
 */
export function prmsSyncExpiryMessage(
  attemptNumber: number,
  resultOfficialCode: number,
): string {
  return (
    `Attention required: attempt ${attemptNumber} for result ` +
    `${resultOfficialCode} was not confirmed by PRMS (outcome UNKNOWN). ` +
    `Verify this unconfirmed attempt with PRMS out of band before re-sending. ` +
    `Re-sending without verification can duplicate the result in PRMS, and no ` +
    `un-sync path exists.`
  );
}
