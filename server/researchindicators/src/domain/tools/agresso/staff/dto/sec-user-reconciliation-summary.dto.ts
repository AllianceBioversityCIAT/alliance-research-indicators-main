// @akili-spec changes/agresso-staff-sec-users-sync (T-07 — per-run summary, NFR-AGS-003)

/** One payload email collision, naming both carnets so a flapping pair is visible (DD-14, M-4). */
export interface PayloadEmailCollisionReport {
  emailKey: string;
  winnerCarnet: string;
  loserCarnet: string;
}

/** Every candidate id behind one ambiguous email match (RSK-1, design.md §5.2). */
export interface AmbiguousMatchReport {
  emailKey: string;
  candidateIds: number[];
  chosenId: number;
}

/** A role this pass deliberately left switched off on a returning user (RSK-7). */
export interface RoleLeftInactiveReport {
  userId: number;
  roleId: number;
}

/**
 * The per-run summary `NFR-AGS-003` requires, emitted once at `log`.
 *
 * **This is the run's ONLY feedback channel.** The controller does not `await` the service
 * (RSK-4), so the caller already holds a `200` before any of this work happens and failures
 * surface nowhere else. Every field below earns its place on that basis — `design.md` §9 states
 * the justification for each one, and a field removed here is a failure mode made invisible.
 */
export class SecUserReconciliationSummaryDto {
  /** Staff members returned across every page of this run. */
  staffFetched = 0;
  /** Members resolved to an existing `sec_users` row (refresh + reactivate). */
  matched = 0;

  /** Provisioning path (R-AGS-003, R-AGS-004). */
  created = 0;
  rolesGranted = 0;
  /**
   * Accounts the create+grant sub-batch attempted before rolling back to `create_grant`.
   * `created` and `rolesGranted` are `0` in that case — RA-10 exists because an implementer once
   * reported `created = 47` for a run that created nobody, on this same channel.
   */
  createsDiscarded = 0;

  /** Refresh path (R-AGS-002). `namesTruncated` is what makes W-4's silent data change visible. */
  namesRefreshed = 0;
  namesTruncated = 0;
  carnetBackfilled = 0;

  /**
   * Reactivation (R-AGS-007). Three distinct counts, never collapsed: "the account came back",
   * "an existing role row came back" and "a role row had to be created" fail independently, and
   * AC.8 / RB-10 require them separately — branch (c)'s insert previously incremented neither.
   */
  reactivated = 0;
  rolesReactivated = 0;
  rolesGrantedOnReactivation = 0;

  /** Skipped population, which would otherwise be invisible (R-AGS-003). */
  skippedUnusableEmail = 0;
  skippedCarnetTooLong = 0;

  /** Reporting is this spec's entire response to duplicate and unrepaired data. */
  carnetConflicts = 0;
  ambiguousMatches: AmbiguousMatchReport[] = [];
  payloadEmailCollisions: PayloadEmailCollisionReport[] = [];
  rolesLeftInactive: RoleLeftInactiveReport[] = [];
  /**
   * Matched **active** accounts holding no active `role_id = 3` row. Left untouched by user ruling
   * (`OQ-D6`) — normally an external provisioned through a different flow — and also where a
   * savepoint-rollback orphan lands. Reporting is the only thing that makes them visible.
   */
  accountsWithoutRole: number[] = [];

  /**
   * `GRANT_ASSERTION` when the create+grant sub-batch rolled back to its savepoint, absent on a
   * clean run. Without this field a partial run's summary is **indistinguishable from a run that
   * had nobody to create** (DD-15, M-5).
   */
  abortReason?: 'GRANT_ASSERTION';

  // ---- changes/agresso-staff-deactivation, increment 1 (T-05) ------------------------------
  // MEASUREMENT ONLY. Nothing below is written anywhere; these are the numbers a human reads
  // before increment 2 is designed, and `deactivationCandidates` is a count of accounts that
  // WOULD be retired, not of accounts that were.

  /** Always `true` in increment 1 — there is no write path to disable. */
  deactivationDryRun = true;
  /** Active `sec_users` rows at read time, BEFORE any exclusion. */
  activePopulation = 0;
  deactivationCandidates = 0;
  /** A bounded sample of candidate ids, so the report stays readable at any population size. */
  candidateSample: number[] = [];
  excludedExternal = 0;
  excludedSystemAdmin = 0;
  excludedAmbiguous = 0;
  excludedUnmatchable = 0;
  shieldedBySkip: DeactivationShieldReport[] = [];
  distinctCarnets = 0;
  totalElements = 0;

  /**
   * Deliberately NOT the `abortReason` above. That field belongs to the create+grant savepoint and
   * is set independently; one field cannot carry two outcomes, and reusing it would make a sibling
   * rollback read as an aborted measurement (Judgment Day JS-4).
   */
  deactivationAbortReason?: 'C-1' | 'C-2' | 'C-4';
  /** The operand the abort names: page number, duplicated carnets, or status match count. */
  abortDetail?: Record<string, unknown>;
}

/** One account held open by a staff member the sync skipped, with the reason it was skipped. */
export class DeactivationShieldReport {
  accountId: number;
  carnet: string;
  reason: string;
}
