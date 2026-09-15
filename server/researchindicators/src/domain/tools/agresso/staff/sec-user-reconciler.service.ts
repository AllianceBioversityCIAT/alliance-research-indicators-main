// @akili-spec changes/agresso-staff-sec-users-sync (T-02 — decision logic: validate → index → collapse → match → classify)
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import {
  CreatedSecUserRow,
  SecUserCreateRow,
  SecUserReconcilerRepository,
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
  abortReason?: 'GRANT_ASSERTION';
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

    return this.dataSource.transaction(async (manager) => {
      // This is deliberately the first database statement in the transaction (M-1). Do not move
      // it below any insert or round-trip it through a JavaScript Date.
      await this.repository.setRunStart(manager);

      // T-05/T-06 seam: refresh and reactivation writes belong here, before create_grant.
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
      };
    });
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

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
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
