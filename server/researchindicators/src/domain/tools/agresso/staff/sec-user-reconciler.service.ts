// @akili-spec changes/agresso-staff-sec-users-sync (T-02 — decision logic: validate → index → collapse → match → classify)
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import { normalizeEmail as normalizeEmailKey } from './email-key.util';
import { SecUserReconciliationSummaryDto } from './dto/sec-user-reconciliation-summary.dto';
import {
  CreatedSecUserRow,
  SecUserCreateRow,
  SecUserRefreshRow,
  SecUserReconcilerRepository,
  SecUserRoleRow,
} from './sec-user-reconciler.repository';

/** Column widths this pass validates against before ever building a write (design.md §5.4). */
const MAX_EMAIL_LENGTH = 150;
const MAX_CARNET_LENGTH = 10;

export type SkipReason = 'UNUSABLE_EMAIL' | 'CARNET_TOO_LONG';

export interface SkippedStaffMember {
  staffMember: AgressoStaffRawDto;
  reason: SkipReason;
}

/**
 * A surviving member that lost its email group to another member (design.md §5.3 "Collapsed",
 * DD-14). Written nowhere by this spec — carried only so the write tasks' summary can report
 * `payloadEmailCollisions` with both carnets.
 */
export interface PayloadEmailCollision {
  emailKey: string;
  winnerCarnet: string;
  loserCarnet: string;
}

export interface CreateTarget {
  staffMember: AgressoStaffRawDto;
}

/**
 * A staff member matched against one or more `sec_users` rows. `secUser` is the row the tie-break
 * chose; `ambiguousCandidateIds` names every row in the candidate set — including the chosen one
 * — but only when the set had more than one row (design.md §5.2: "Every ambiguous match is
 * reported"). An unambiguous match carries an empty array.
 */
export interface MatchedTarget {
  staffMember: AgressoStaffRawDto;
  secUser: SecUser;
  ambiguousCandidateIds: number[];
}

/**
 * The five sets `design.md` §5.3 classifies staff members into. `refresh` and `reactivate` share
 * a shape (`MatchedTarget`) because both are "one staff member, one chosen `sec_users` row" — the
 * write tasks (T-04/T-05/T-06) tell them apart by which array they came from, never by inspecting
 * `secUser.is_active` again.
 */
export interface ReconciliationResult {
  skipped: SkippedStaffMember[];
  collapsed: PayloadEmailCollision[];
  create: CreateTarget[];
  refresh: MatchedTarget[];
  reactivate: MatchedTarget[];
}

export interface CreateGrantOutcome {
  created: number;
  rolesGranted: number;
  createsDiscarded: number;
  namesRefreshed: number;
  namesTruncated: number;
  carnetBackfilled: number;
  carnetConflicts: number;
  reactivated: number;
  rolesReactivated: number;
  rolesGrantedOnReactivation: number;
  rolesLeftInactive: RoleLeftInactive[];
  accountsWithoutRole: number[];
  abortReason?: 'GRANT_ASSERTION';
}

/**
 * A role row this pass deliberately left switched off on a returning user (RSK-7, §9). Reported so
 * that a returning admin who came back as a plain contributor is discoverable by a human instead of
 * surfacing as a complaint.
 */
export interface RoleLeftInactive {
  userId: number;
  roleId: number;
}

/**
 * The three disjoint reactivation role branches of `design.md` §5.4, computed in memory from one
 * chunked read (M-2). They are disjoint by construction: a user appears in exactly one.
 */
interface RoleBranches {
  /** (b) one id per user — `MIN(sec_user_role_id)` among that user's `role_id = 3` rows. */
  reactivateRoleIds: number[];
  /** (c) users holding no `role_id = 3` row at all. */
  grantRoleUserIds: number[];
  rolesLeftInactive: RoleLeftInactive[];
  accountsWithoutRole: number[];
}

/**
 * Decision logic for the Agresso staff → `sec_users` reconciliation (R-AGS-001, R-AGS-003,
 * R-AGS-007). No SQL is issued here beyond the one bulk read the repository already owns (T-01) —
 * this class only classifies. The write tasks consume its output; none of them re-derive the
 * classification.
 *
 * **Order is load-bearing (design.md §5.2, N-3): validate → build index → collapse → match →
 * classify.** Collapsing before validating would give every null-email member the same
 * (non-existent) collapse key, reporting them as email collisions instead of as skipped.
 */
@Injectable()
export class SecUserReconcilerService {
  private readonly logger = new LoggerUtil({
    name: SecUserReconcilerService.name,
  });

  constructor(
    private readonly repository: SecUserReconcilerRepository,
    private readonly dataSource: DataSource,
  ) {}

  async reconcile(
    staffMembers: AgressoStaffRawDto[],
  ): Promise<ReconciliationResult> {
    const skipped: SkippedStaffMember[] = [];
    const collapsed: PayloadEmailCollision[] = [];
    const create: CreateTarget[] = [];
    const refresh: MatchedTarget[] = [];
    const reactivate: MatchedTarget[] = [];

    // Step 1: pre-write validation runs BEFORE the collapse and before the index is even built
    // (N-3). A null-email member has no collapse key at all, so validating first is what keeps it
    // in `skipped` rather than folding it into `payloadEmailCollisions`.
    const survivors: AgressoStaffRawDto[] = [];
    for (const member of staffMembers) {
      const reason = this.validate(member);
      if (reason) {
        skipped.push({ staffMember: member, reason });
        this.logger._warn(
          `Skipped staff member carnet=${member.resourceId}: ${reason}`,
        );
        continue;
      }
      survivors.push(member);
    }

    // Step 2: one bulk read of ALL sec_users rows — active AND inactive (design.md §5.2, J-4) —
    // then one index on lower(trim(email)).
    const secUsers = await this.repository.findAllSecUsers();
    const index = this.buildIndex(secUsers);

    // Step 3: collapse the survivors by lower(trim(email)) — FIRST ARRIVAL WINS, no comparator
    // (N-2, user ruling 2026-09-14). Payload order = page order, then row order within the page =
    // this array's iteration order; nothing here sorts it.
    const winners = new Map<string, AgressoStaffRawDto>();
    for (const member of survivors) {
      const key = this.normalizeEmail(member.email);
      const existingWinner = winners.get(key);
      if (existingWinner === undefined) {
        winners.set(key, member);
        continue;
      }
      collapsed.push({
        emailKey: key,
        winnerCarnet: existingWinner.resourceId,
        loserCarnet: member.resourceId,
      });
      this.logger._warn(
        `Payload email collision on ${key}: winner carnet=${existingWinner.resourceId}, loser carnet=${member.resourceId}`,
      );
    }

    // Steps 4-7: exact lookup on lower(trim(email)) — NEVER LIKE (DD-6) — then classify into
    // exactly three outcomes: empty candidate set → create; an active candidate present →
    // refresh; non-empty and entirely inactive → reactivate.
    for (const member of winners.values()) {
      const key = this.normalizeEmail(member.email);
      const candidates = index.get(key) ?? [];

      if (candidates.length === 0) {
        create.push({ staffMember: member });
        continue;
      }

      const chosen = this.chooseCandidate(candidates);
      const ambiguousCandidateIds =
        candidates.length > 1 ? candidates.map((c) => c.sec_user_id) : [];

      if (ambiguousCandidateIds.length > 0) {
        this.logger._warn(
          `Ambiguous match on ${key}: candidates=[${ambiguousCandidateIds.join(', ')}], chosen=${chosen.sec_user_id}`,
        );
      }

      const target: MatchedTarget = {
        staffMember: member,
        secUser: chosen,
        ambiguousCandidateIds,
      };

      // Step 4 dominates step 7 (design.md §5.2): the tie-break always prefers an active
      // candidate over an inactive one, so "chosen.is_active" alone routes correctly — a person
      // with one active and one inactive row is always a refresh, never a reactivate, and the
      // inactive row is simply left alone.
      if (chosen.is_active) {
        refresh.push(target);
      } else {
        reactivate.push(target);
      }
    }

    return { skipped, collapsed, create, refresh, reactivate };
  }

  /**
   * Persists the create branch in the reconciliation's one outer transaction. T-05 and T-06 add
   * their refresh/reactivate writes at the marked seam, before the savepoint, so a failed create
   * assertion never rolls their work back (DD-5, DD-15).
   */
  async applyCreateAndGrant(
    reconciliation: ReconciliationResult,
  ): Promise<CreateGrantOutcome> {
    const createRows = this.createRows(reconciliation.create);

    // R-AGS-007: "The account is also refreshed — names and carnet backfill per R-AGS-002 —
    // because a returning employee's details are as stale as anyone's." Reactivated accounts
    // therefore join the refresh batch rather than getting a second pass (NFR-AGS-002).
    const refreshTargets = [
      ...reconciliation.refresh,
      ...reconciliation.reactivate,
    ];
    const refreshRows = this.refreshRows(refreshTargets);
    const refreshSummary = this.refreshSummary(refreshTargets);

    const reactivateUserIds = reconciliation.reactivate.map(
      ({ secUser }) => secUser.sec_user_id,
    );
    // One chunked read over BOTH populations (M-2). The reactivate half decides the three role
    // branches; the refresh half is only inspected to report `accountsWithoutRole` (OQ-D6) — no
    // write is ever derived from it. This read is deliberately outside the transaction, matching
    // the bulk `sec_users` read (N-9).
    const roleRows = await this.repository.findSecUserRolesByUserIds([
      ...reactivateUserIds,
      ...reconciliation.refresh.map(({ secUser }) => secUser.sec_user_id),
    ]);
    const branches = this.roleBranches(
      reactivateUserIds,
      reconciliation.refresh.map(({ secUser }) => secUser.sec_user_id),
      roleRows,
    );

    return this.dataSource.transaction(async (manager) => {
      // This is deliberately the first database statement in the transaction (M-1). Do not move
      // it below any insert or round-trip it through a JavaScript Date.
      await this.repository.setRunStart(manager);

      // T-05/T-06 seam: refresh and reactivation writes belong here, before create_grant.
      await this.repository.refreshSecUserNames(manager, refreshRows);
      await this.repository.backfillSecUserCarnets(manager, refreshRows);

      // R-AGS-007: two tables only — `sec_users` then `sec_user_roles`. `app_secrets` is never
      // read or written anywhere in this path: a machine credential is never silently re-armed.
      await this.repository.reactivateSecUsers(manager, reactivateUserIds);
      // Branch (b): exactly one id per user, already filtered to `role_id = 3` before the minimum
      // was taken. The repository's WHERE re-pins `role_id = 3` in SQL (N-4).
      await this.repository.reactivateContributorRoles(
        manager,
        branches.reactivateRoleIds,
      );
      // Branch (c): no `role_id = 3` row existed, so one is inserted with a literal 3.
      await this.repository.grantContributorRoles(
        manager,
        branches.grantRoleUserIds,
      );

      await manager.query('SAVEPOINT create_grant');
      await this.repository.createSecUsers(manager, createRows);

      const createdUsers = await this.repository.findCreatedSecUsers(
        manager,
        createRows.map((row) => row.carnet),
      );

      if (!this.matchesCreatedRows(createRows, createdUsers)) {
        await manager.query('ROLLBACK TO SAVEPOINT create_grant');
        return {
          created: 0,
          rolesGranted: 0,
          createsDiscarded: createRows.length,
          ...refreshSummary,
          ...this.reactivationSummary(reactivateUserIds, branches),
          abortReason: 'GRANT_ASSERTION',
        };
      }

      // The re-select is the authority for this id set. Do not add refresh/reactivate ids here:
      // R-AGS-004 AC.2 forbids granting a role to an account this pass did not create.
      await this.repository.grantContributorRoles(
        manager,
        createdUsers.map((user) => user.sec_user_id),
      );

      return {
        created: createdUsers.length,
        rolesGranted: createdUsers.length,
        createsDiscarded: 0,
        ...refreshSummary,
        ...this.reactivationSummary(reactivateUserIds, branches),
      };
    });
  }

  /**
   * Sorts the reactivation targets into `design.md` §5.4's three disjoint role branches, and
   * collects the two report-only sets §9 requires.
   *
   * **The `role_id = 3` filter runs BEFORE the minimum is taken.** Computing `MIN(sec_user_role_id)`
   * over a user's inactive rows first and filtering afterwards emits the id of a `role_id = 1` row
   * and **restores `SYSTEM_ADMIN`** — that is finding `N-4`, and it is why the repository ALSO pins
   * `AND role_id = 3` in the statement's `WHERE` clause. Two guards, because one of them was
   * removed once by the very correction meant to harden it.
   */
  private roleBranches(
    reactivateUserIds: number[],
    refreshUserIds: number[],
    roleRows: SecUserRoleRow[],
  ): RoleBranches {
    const byUser = new Map<number, SecUserRoleRow[]>();
    for (const row of roleRows) {
      const bucket = byUser.get(row.user_id);
      if (bucket) {
        bucket.push(row);
      } else {
        byUser.set(row.user_id, [row]);
      }
    }

    const reactivateRoleIds: number[] = [];
    const grantRoleUserIds: number[] = [];
    const rolesLeftInactive: RoleLeftInactive[] = [];

    for (const userId of reactivateUserIds) {
      const rows = byUser.get(userId) ?? [];
      const contributorRows = rows.filter((row) => row.role_id === 3);

      if (contributorRows.some((row) => row.is_active)) {
        // (a) already holds an active CONTRIBUTOR row — no statement is issued. Issuing one would
        // flip a pre-existing duplicate pair into two active rows (M-2).
      } else if (contributorRows.length > 0) {
        // (b) one id per user: the lowest sec_user_role_id AMONG THIS USER'S role_id = 3 rows.
        reactivateRoleIds.push(
          contributorRows.reduce(
            (lowest, row) =>
              row.sec_user_role_id < lowest ? row.sec_user_role_id : lowest,
            contributorRows[0].sec_user_role_id,
          ),
        );
      } else {
        // (c) no CONTRIBUTOR row at all.
        grantRoleUserIds.push(userId);
      }

      for (const row of rows) {
        if (row.role_id !== 3 && !row.is_active) {
          rolesLeftInactive.push({ userId, roleId: row.role_id });
          this._warnRoleLeftInactive(userId, row.role_id);
        }
      }
    }

    // OQ-D6 / RSK-10: a matched ACTIVE account holding no active CONTRIBUTOR row is left untouched
    // by user ruling — normally an external provisioned through a different flow, and also where a
    // savepoint-rollback orphan lands. Reported, never granted.
    const accountsWithoutRole = refreshUserIds.filter(
      (userId) =>
        !(byUser.get(userId) ?? []).some(
          (row) => row.role_id === 3 && row.is_active,
        ),
    );

    return {
      reactivateRoleIds,
      grantRoleUserIds,
      rolesLeftInactive,
      accountsWithoutRole,
    };
  }

  private _warnRoleLeftInactive(userId: number, roleId: number): void {
    this.logger._warn(
      `Reactivated sec_user_id=${userId} without restoring role_id=${roleId}: re-granting a non-contributor role is a human decision`,
    );
  }

  private reactivationSummary(
    reactivateUserIds: number[],
    branches: RoleBranches,
  ): Pick<
    CreateGrantOutcome,
    | 'reactivated'
    | 'rolesReactivated'
    | 'rolesGrantedOnReactivation'
    | 'rolesLeftInactive'
    | 'accountsWithoutRole'
  > {
    return {
      reactivated: reactivateUserIds.length,
      // R-AGS-007 AC.8 / RB-10: branch (b) and branch (c) are DISTINCT counts. Collapsing them
      // hides which half of the role restoration actually happened.
      rolesReactivated: branches.reactivateRoleIds.length,
      rolesGrantedOnReactivation: branches.grantRoleUserIds.length,
      rolesLeftInactive: branches.rolesLeftInactive,
      accountsWithoutRole: branches.accountsWithoutRole,
    };
  }

  /**
   * Composes the per-run summary `NFR-AGS-003` requires from the classification and the write
   * outcome. This is the run's ONLY feedback channel — the controller does not `await` the service
   * (RSK-4), so anything not counted here is invisible to a human forever.
   */
  buildSummary(
    reconciliation: ReconciliationResult,
    outcome: CreateGrantOutcome,
    staffFetched: number,
  ): SecUserReconciliationSummaryDto {
    const summary = new SecUserReconciliationSummaryDto();

    summary.staffFetched = staffFetched;
    summary.matched =
      reconciliation.refresh.length + reconciliation.reactivate.length;

    summary.created = outcome.created;
    summary.rolesGranted = outcome.rolesGranted;
    summary.createsDiscarded = outcome.createsDiscarded;

    summary.namesRefreshed = outcome.namesRefreshed;
    summary.namesTruncated = outcome.namesTruncated;
    summary.carnetBackfilled = outcome.carnetBackfilled;
    summary.carnetConflicts = outcome.carnetConflicts;

    summary.reactivated = outcome.reactivated;
    summary.rolesReactivated = outcome.rolesReactivated;
    summary.rolesGrantedOnReactivation = outcome.rolesGrantedOnReactivation;
    summary.rolesLeftInactive = outcome.rolesLeftInactive;
    summary.accountsWithoutRole = outcome.accountsWithoutRole;

    summary.skippedUnusableEmail = reconciliation.skipped.filter(
      ({ reason }) => reason === 'UNUSABLE_EMAIL',
    ).length;
    summary.skippedCarnetTooLong = reconciliation.skipped.filter(
      ({ reason }) => reason === 'CARNET_TOO_LONG',
    ).length;

    summary.payloadEmailCollisions = reconciliation.collapsed.map(
      ({ emailKey, winnerCarnet, loserCarnet }) => ({
        emailKey,
        winnerCarnet,
        loserCarnet,
      }),
    );

    // RSK-1: every candidate id behind an ambiguous match, from BOTH matched sets. A refresh-side
    // ambiguity matters as much as a reactivate-side one — R-AGS-001's "two accounts share an
    // email" scenario is a refresh.
    summary.ambiguousMatches = [
      ...reconciliation.refresh,
      ...reconciliation.reactivate,
    ]
      .filter(({ ambiguousCandidateIds }) => ambiguousCandidateIds.length > 0)
      .map(({ staffMember, secUser, ambiguousCandidateIds }) => ({
        emailKey: this.normalizeEmail(staffMember.email),
        candidateIds: ambiguousCandidateIds,
        chosenId: secUser.sec_user_id,
      }));

    // Absent on a clean run: its presence is what distinguishes a savepoint rollback from a run
    // that simply had nobody to create (DD-15, M-5).
    if (outcome.abortReason) {
      summary.abortReason = outcome.abortReason;
    }

    return summary;
  }

  private refreshRows(targets: MatchedTarget[]): SecUserRefreshRow[] {
    return targets.map(({ staffMember, secUser }) => ({
      secUserId: secUser.sec_user_id,
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      carnet: staffMember.resourceId,
    }));
  }

  private refreshSummary(
    targets: MatchedTarget[],
  ): Pick<
    CreateGrantOutcome,
    'namesRefreshed' | 'namesTruncated' | 'carnetBackfilled' | 'carnetConflicts'
  > {
    let namesTruncated = 0;
    let carnetBackfilled = 0;
    let carnetConflicts = 0;

    for (const { staffMember, secUser } of targets) {
      if (staffMember.firstName.length > 60) {
        namesTruncated += 1;
        this.logger._warn(
          `Truncated first name for sec_user_id=${secUser.sec_user_id}`,
        );
      }
      if (staffMember.lastName.length > 60) {
        namesTruncated += 1;
        this.logger._warn(
          `Truncated last name for sec_user_id=${secUser.sec_user_id}`,
        );
      }

      const storedCarnet = secUser.carnet;
      if (storedCarnet == null || storedCarnet.trim().length === 0) {
        carnetBackfilled += 1;
      } else if (storedCarnet !== staffMember.resourceId) {
        carnetConflicts += 1;
        this.logger._warn(
          `Carnet conflict for sec_user_id=${secUser.sec_user_id}: stored=${storedCarnet}, payload=${staffMember.resourceId}`,
        );
      }
    }

    return {
      namesRefreshed: targets.length,
      namesTruncated,
      carnetBackfilled,
      carnetConflicts,
    };
  }

  private createRows(targets: CreateTarget[]): SecUserCreateRow[] {
    return targets.map(({ staffMember }) => ({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      // Validation intentionally applies to this raw value. Matching normalizes email, but the
      // spec does not authorize rewriting the identity value before it is stored.
      email: staffMember.email,
      carnet: staffMember.resourceId,
    }));
  }

  private matchesCreatedRows(
    insertedRows: SecUserCreateRow[],
    reselectedRows: CreatedSecUserRow[],
  ): boolean {
    if (insertedRows.length !== reselectedRows.length) {
      return false;
    }

    const insertedCarnets = new Set(insertedRows.map((row) => row.carnet));
    const reselectedCarnets = new Set(reselectedRows.map((row) => row.carnet));
    return (
      insertedCarnets.size === reselectedCarnets.size &&
      [...insertedCarnets].every((carnet) => reselectedCarnets.has(carnet))
    );
  }

  private validate(member: AgressoStaffRawDto): SkipReason | null {
    if (!this.isUsableEmail(member.email)) {
      return 'UNUSABLE_EMAIL';
    }
    if (member.resourceId.length > MAX_CARNET_LENGTH) {
      return 'CARNET_TOO_LONG';
    }
    return null;
  }

  private isUsableEmail(email: string): boolean {
    if (email == null) {
      return false;
    }
    if (email.trim().length === 0) {
      return false;
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      return false;
    }
    return true;
  }

  // Delegates to the shared util so this key and the deactivation shield key are the same
  // expression (changes/agresso-staff-deactivation DD-D5). Behaviour is unchanged.
  private normalizeEmail(email: string): string {
    return normalizeEmailKey(email);
  }

  private buildIndex(secUsers: SecUser[]): Map<string, SecUser[]> {
    const index = new Map<string, SecUser[]>();
    for (const secUser of secUsers) {
      const key = this.normalizeEmail(secUser.email);
      const bucket = index.get(key);
      if (bucket) {
        bucket.push(secUser);
      } else {
        index.set(key, [secUser]);
      }
    }
    return index;
  }

  /**
   * Total ordering (design.md §5.2) so two runs over identical input choose the same row:
   *   1. active before inactive;
   *   2. most recent `last_login_at` first, `NULL` sorting last;
   *   3. lowest `sec_user_id` — a pure determinism tiebreaker.
   * Safe here only because this spec cannot deactivate anything (design.md §5.2's ⚠️ warning) —
   * a candidate the tie-break does not choose is simply left untouched, never retired.
   */
  private chooseCandidate(candidates: SecUser[]): SecUser {
    return candidates.reduce((best, current) =>
      this.compareCandidates(current, best) < 0 ? current : best,
    );
  }

  /** Negative when `a` should be chosen over `b`; positive when `b` should be chosen over `a`. */
  private compareCandidates(a: SecUser, b: SecUser): number {
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }

    const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : null;
    const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : null;
    if (aTime !== bTime) {
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return bTime - aTime;
    }

    return a.sec_user_id - b.sec_user_id;
  }
}
