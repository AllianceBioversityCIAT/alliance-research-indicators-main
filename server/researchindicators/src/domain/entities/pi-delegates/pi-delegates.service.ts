// @akili-spec docs/specs/changes/my-pi-delegates — T-17/T-19/T-20
//
// Service contract (design.md §11.3 / requirements.md §12):
//
//   assign()     — R-PID-011 (per-project sync, Model B) + R-PID-012 (history).
//                  Wraps ALL work in ONE dataSource.transaction (R-PID-011 AC.4).
//                  Steps inside the tx:
//                    1. Auth per assignment.project_id (assertCanManageProject) —
//                       fail-fast 403 (R-PID-011 AC.4).
//                    2. Resolve + deduplicate delegates ONCE across ALL assignments
//                       (R-PID-011 AC.4 — provision new sec_user inside the tx,
//                        reuse across projects; DD-L).
//                    3. PI-exclusion (isPiOfProject) per (project, delegate) pair —
//                       fail-fast BadRequestException (R-PID-008 / R-PID-011 AC.4).
//                    4. Per-assignment SYNC diff:
//                         - desired may be EMPTY → revoke-all (R-PID-011 AC.3).
//                         - for each created delegate: insertDelegate then recordHistory('assign').
//                         - for each revoked delegate: fetch active rows to get full context,
//                           recordHistory('revoke') per row, then softDeleteDelegatePairs.
//                    5. Return per-project summary { project_id, created, revoked, kept } (R-PID-011 AC.4).
//
//   bulkRevoke() — R-PID-010 (targeted bulk revoke, NOT a sync) + R-PID-013 (history).
//                  Ambiguity guard: exactly one shape must be present — Shape A
//                  (pi_delegate_ids) OR Shape B (project_ids + delegate_user_ids).
//                  Both present, Shape B partial, or neither → BadRequestException (400).
//                  Auth per row's/project's project_id (R-PID-010 AC.3). Transactional.
//                  Each revoked row writes recordHistory('revoke') in the same tx (R-PID-013 AC.2).
//
//   list()       — unchanged from v2 (R-PID-004 AC.1).
//   verify()     — unchanged from v2 (R-PID-004 AC.1).
//   assertCanManageProject() — unchanged from v2 (R-PID-007).
//
// Authorization contract (R-PID-007 / DD-B):
//   Three cases decide whether a caller may manage a project's delegations:
//     1. SYSTEM_ADMIN (SecRolesEnum = 1) — allowed unconditionally.
//        Checked directly on user.roles (not via validateRoles, which throws for
//        non-admins and would prevent the PI/delegate path from running at all).
//     2. PI or active delegate of project_id — allowed.
//        Checked via PiDelegatesRepository.isPiOrActiveDelegateOfProject()
//        (agresso_contracts PI join UNION pi_delegates active row).
//     3. Neither — ForbiddenException (403).
//
// pi_user_id removed (redundant with created_by) — Product decision 2026-09-11
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { PiDelegatesRepository } from './repositories/pi-delegates.repository';
import { DelegateInput } from './repositories/pi-delegates.repository';
import { VerifyPiDelegateDto } from './dto/verify-pi-delegate.dto';
import {
  BulkAssignPiDelegatesDto,
  DelegateInputDto,
} from './dto/bulk-assign-pi-delegates.dto';
import { BulkRevokePiDelegatesDto } from './dto/bulk-revoke-pi-delegates.dto';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { PiDelegate } from './entities/pi-delegate.entity';
import { PiDelegateHistoryActionEnum } from './enum/pi-delegate-history-action.enum';

// ─────────────────────────────────────────────────────────────────────────────
// Response shapes
// ─────────────────────────────────────────────────────────────────────────────

/** Per-project sync summary returned by assign() (R-PID-011 AC.4). */
export interface ProjectSyncSummary {
  project_id: string;
  created: number[];
  revoked: number[];
  kept: number[];
}

/** Summary returned by bulkRevoke() (R-PID-010). */
export interface BulkRevokeSummary {
  revoked_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a DelegateInputDto (DTO shape) to the repo DelegateInput union
 * (repository shape).
 *
 * DelegateInputDto:  { delegate_user_id?, delegate?: { email, first_name, last_name }, carnet? }
 * DelegateInput:     DelegateByUserId | DelegateNewUserIdentity
 *
 * Preference: delegate_user_id wins when present (mirrors v2 create() logic).
 * When absent, flatten delegate + carnet into DelegateNewUserIdentity.
 */
function toDelegateInput(dto: DelegateInputDto): DelegateInput {
  if (dto.delegate_user_id != null) {
    return { delegate_user_id: dto.delegate_user_id };
  }
  // delegate must be present (DTO validation guarantees at least one).
  return {
    email: dto.delegate!.email,
    first_name: dto.delegate!.first_name,
    last_name: dto.delegate!.last_name,
    carnet: dto.carnet,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Set arithmetic helpers
// ─────────────────────────────────────────────────────────────────────────────

function setDifference(a: Set<number>, b: Set<number>): number[] {
  return [...a].filter((x) => !b.has(x));
}

function setIntersection(a: Set<number>, b: Set<number>): number[] {
  return [...a].filter((x) => b.has(x));
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PiDelegatesService {
  constructor(
    private readonly piDelegatesRepository: PiDelegatesRepository,
    private readonly currentUserUtil: CurrentUserUtil,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Authorization helper
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Throws ForbiddenException (403) unless the current user is SYSTEM_ADMIN
   * or is the PI / an active delegate of the given project (R-PID-007).
   *
   * SYSTEM_ADMIN is tested first via a direct roles array check (not through
   * validateRoles, which throws ForbiddenException for non-admins and would
   * short-circuit the PI/delegate path).
   */
  private async assertCanManageProject(projectId: string): Promise<void> {
    const userId = this.currentUserUtil.user_id;
    const roles = this.currentUserUtil.roles ?? [];

    // Case 1 — SYSTEM_ADMIN bypass.
    if (roles.includes(SecRolesEnum.SYSTEM_ADMIN)) {
      return;
    }

    // Case 2 — PI or active delegate of the project.
    const authorized =
      await this.piDelegatesRepository.isPiOrActiveDelegateOfProject(
        projectId,
        userId,
      );
    if (authorized) {
      return;
    }

    // Case 3 — Neither: 403.
    throw new ForbiddenException(
      'Access denied: caller is not the PI, an active delegate, or a SYSTEM_ADMIN for this project.',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // v4 — Bulk assign (per-project sync) — R-PID-011 + R-PID-012
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bulk assign delegates to one or more projects (per-project sync / Model B).
   *
   * Each assignment carries its own project_id and desired delegate list (DD-L).
   * No cross-project cartesian: each project is synced to its own list.
   * An empty delegates list for a project revokes ALL its active delegates (R-PID-011 AC.3).
   *
   * Every movement (create AND revoke) writes one history row in the SAME transaction
   * (R-PID-012 AC.3).  A rolled-back operation leaves no history rows.
   *
   * Everything runs in ONE transaction (R-PID-011 AC.4) — any error rolls back
   * all projects and all history rows.
   *
   * Order of operations inside the transaction:
   *   1. Auth per project — fail-fast 403 if any project is unauthorized (R-PID-011 AC.4).
   *   2. Resolve + de-duplicate delegates ONCE across ALL assignments → Map<key, id>
   *      (R-PID-011 AC.4 — provision new sec_user inside the tx, reuse across projects).
   *   3. PI-exclusion — fail-fast BadRequestException for any (project, delegate)
   *      where the delegate is the PI of that project (R-PID-008 / R-PID-011 AC.4).
   *   4. Per-assignment SYNC diff (R-PID-011 AC.2):
   *        - desired may be EMPTY → revoke-all (R-PID-011 AC.3).
   *        - For each created delegate: insertDelegate → recordHistory('assign').
   *        - For each revoked delegate: fetch active rows for full context →
   *          recordHistory('revoke') per row → softDeleteDelegatePairs.
   *   5. Return per-project summary (R-PID-011 AC.4).
   *
   * @param dto  BulkAssignPiDelegatesDto with assignments[] shape
   * @returns    Array of ProjectSyncSummary, one entry per project assignment.
   */
  async assign(dto: BulkAssignPiDelegatesDto): Promise<ProjectSyncSummary[]> {
    const callerUserId = this.currentUserUtil.user_id;

    return this.dataSource.transaction(
      async (manager: EntityManager): Promise<ProjectSyncSummary[]> => {
        // ── Step 1: Auth per project (fail-fast) ──────────────────────────
        for (const a of dto.assignments) {
          await this.assertCanManageProject(a.project_id);
        }

        // ── Step 2: Resolve + de-duplicate delegates ONCE across ALL assignments ─
        //
        // Collect every DelegateInput from every assignment's delegates list,
        // de-dupe by identity key (id:<uid> or email:<email>), then resolve
        // each unique input to a sec_user_id exactly once (provision-once AC.4).
        // The result is a Map<inputKey, delegate_user_id> for fast lookup.
        //
        // This prevents double-inserting the same sec_user when the same new
        // delegate appears in multiple assignments.
        const inputMap = new Map<string, DelegateInput>();
        for (const a of dto.assignments) {
          for (const dtoEntry of a.delegates) {
            const input = toDelegateInput(dtoEntry);
            const key =
              'delegate_user_id' in input
                ? `id:${input.delegate_user_id}`
                : `email:${input.email}`;
            if (!inputMap.has(key)) {
              inputMap.set(key, input);
            }
          }
        }

        // Resolve each unique input to a sec_user_id (provisions absent users).
        const resolvedMap = new Map<string, number>();
        for (const [key, input] of inputMap.entries()) {
          const resolvedId =
            await this.piDelegatesRepository.resolveDelegateUserId(
              input,
              manager,
            );
          resolvedMap.set(key, resolvedId);
        }

        // Build a helper that converts a DelegateInputDto to its resolved id.
        const resolveId = (dtoEntry: DelegateInputDto): number => {
          const input = toDelegateInput(dtoEntry);
          const key =
            'delegate_user_id' in input
              ? `id:${input.delegate_user_id}`
              : `email:${input.email}`;
          return resolvedMap.get(key)!;
        };

        // ── Step 3: PI-exclusion (fail-fast) — R-PID-008 / R-PID-011 AC.4 ─
        for (const a of dto.assignments) {
          // Compute this assignment's resolved delegate ids.
          const assignmentResolvedIds = [
            ...new Set(a.delegates.map(resolveId)),
          ];
          for (const delegateUserId of assignmentResolvedIds) {
            const isPI = await this.piDelegatesRepository.isPiOfProject(
              a.project_id,
              delegateUserId,
            );
            if (isPI) {
              throw new BadRequestException(
                `PI-exclusion violation: user ${delegateUserId} is the PI of project "${a.project_id}" and cannot be a delegate of the same project (R-PID-008).`,
              );
            }
          }
        }

        // ── Step 4: Per-assignment SYNC diff (R-PID-011 AC.2) + History ──
        const summaries: ProjectSyncSummary[] = [];

        for (const a of dto.assignments) {
          // Desired set for THIS assignment (may be EMPTY → revoke-all AC.3).
          const desiredIds = [...new Set(a.delegates.map(resolveId))];
          const desiredSet = new Set<number>(desiredIds);

          // Current active set for this project (read inside the tx).
          const currentIds =
            await this.piDelegatesRepository.listActiveDelegateUserIds(
              a.project_id,
              manager,
            );
          const currentSet = new Set<number>(currentIds);

          const toCreate = setDifference(desiredSet, currentSet);
          const toRevoke = setDifference(currentSet, desiredSet);
          const kept = setIntersection(desiredSet, currentSet);

          // ── Creates: insertDelegate → recordHistory('assign') ──────────
          for (const delegateUserId of toCreate) {
            const row = await this.piDelegatesRepository.insertDelegate(
              a.project_id,
              delegateUserId,
              callerUserId,
              manager,
            );
            await this.piDelegatesRepository.recordHistory(
              {
                pi_delegate_id: row.pi_delegate_id,
                project_id: a.project_id,
                delegate_user_id: delegateUserId,
                action: PiDelegateHistoryActionEnum.ASSIGN,
              },
              callerUserId,
              manager,
            );
          }

          // ── Revokes: fetch row context → recordHistory('revoke') → soft-delete ─
          //
          // softDeleteDelegatePairs only needs delegate_user_ids, but history
          // requires the full row context (pi_delegate_id, delegate_user_id).
          // Fetch the active rows BEFORE deleting to capture that context.
          if (toRevoke.length > 0) {
            const rowsToRevoke = await manager.getRepository(PiDelegate).find({
              where: {
                project_id: a.project_id,
                delegate_user_id: In([...toRevoke]),
                is_active: true,
              },
            });

            for (const revokedRow of rowsToRevoke) {
              await this.piDelegatesRepository.recordHistory(
                {
                  pi_delegate_id: revokedRow.pi_delegate_id,
                  project_id: revokedRow.project_id,
                  delegate_user_id: revokedRow.delegate_user_id,
                  action: PiDelegateHistoryActionEnum.REVOKE,
                },
                callerUserId,
                manager,
              );
            }

            await this.piDelegatesRepository.softDeleteDelegatePairs(
              a.project_id,
              toRevoke,
              callerUserId,
              manager,
            );
          }

          summaries.push({
            project_id: a.project_id,
            created: toCreate,
            revoked: toRevoke,
            kept,
          });
        }

        return summaries;
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // v3/v4 — Bulk targeted revoke — R-PID-010 + R-PID-013
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bulk targeted revoke (NOT a sync — does NOT touch delegations not named).
   *
   * Accepts exactly ONE complete shape:
   *   Shape A — { pi_delegate_ids: number[] }
   *   Shape B — { project_ids: string[], delegate_user_ids: number[] }
   *
   * Ambiguity guard (before any DB work):
   *   Both shapes present         → 400 (ambiguous payload).
   *   Shape B with only one field → 400 (incomplete Shape B).
   *   Neither shape present       → 400 (no targets named; DTO validation
   *                                       normally catches this first, but guard
   *                                       also fires for safety).
   *
   * Auth is enforced per each row's project_id (R-PID-007 / R-PID-010 AC.3).
   * Every revoked row records a 'revoke' history row in the same tx (R-PID-013 AC.2).
   * All writes run in one transaction.
   *
   * @param dto  BulkRevokePiDelegatesDto
   * @returns    BulkRevokeSummary { revoked_count }
   */
  async bulkRevoke(dto: BulkRevokePiDelegatesDto): Promise<BulkRevokeSummary> {
    const callerUserId = this.currentUserUtil.user_id;

    // ── Ambiguity guard ───────────────────────────────────────────────────
    const hasShapeA =
      dto.pi_delegate_ids != null && dto.pi_delegate_ids.length > 0;
    const hasProjectIds = dto.project_ids != null && dto.project_ids.length > 0;
    const hasDelegateUserIds =
      dto.delegate_user_ids != null && dto.delegate_user_ids.length > 0;
    const hasShapeB = hasProjectIds && hasDelegateUserIds;
    const hasPartialShapeB = hasProjectIds !== hasDelegateUserIds; // XOR

    if (hasShapeA && (hasProjectIds || hasDelegateUserIds)) {
      throw new BadRequestException(
        'Ambiguous payload: provide either pi_delegate_ids (Shape A) OR (project_ids + delegate_user_ids) (Shape B) — not both.',
      );
    }

    if (hasPartialShapeB) {
      throw new BadRequestException(
        'Incomplete Shape B: both project_ids and delegate_user_ids must be provided together.',
      );
    }

    if (!hasShapeA && !hasShapeB) {
      throw new BadRequestException(
        'No revoke targets: provide pi_delegate_ids (Shape A) OR (project_ids + delegate_user_ids) (Shape B).',
      );
    }

    // ── Transaction ───────────────────────────────────────────────────────
    return this.dataSource.transaction(
      async (manager: EntityManager): Promise<BulkRevokeSummary> => {
        let totalRevoked = 0;

        if (hasShapeA) {
          // ── Shape A: revoke by primary key ─────────────────────────────
          //
          // Resolve each row to obtain its project_id, then authorize.
          // Fetch full row context so history can be written (R-PID-013 AC.2).
          // Rows that are already revoked or not found are skipped (no error).
          const idsToRevoke: number[] = [];

          for (const piDelegateId of dto.pi_delegate_ids!) {
            const row = await this.piDelegatesRepository.findOne({
              where: { pi_delegate_id: piDelegateId, is_active: true },
            });

            if (!row) {
              // Already revoked or never existed — skip silently.
              continue;
            }

            await this.assertCanManageProject(row.project_id);

            // Write history before the soft-delete (R-PID-013 AC.2 / R-PID-012 AC.3).
            await this.piDelegatesRepository.recordHistory(
              {
                pi_delegate_id: row.pi_delegate_id,
                project_id: row.project_id,
                delegate_user_id: row.delegate_user_id,
                action: PiDelegateHistoryActionEnum.REVOKE,
              },
              callerUserId,
              manager,
            );

            idsToRevoke.push(piDelegateId);
          }

          if (idsToRevoke.length > 0) {
            totalRevoked =
              await this.piDelegatesRepository.softDeleteDelegateIds(
                idsToRevoke,
                callerUserId,
                manager,
              );
          }
        } else {
          // ── Shape B: revoke by (project × delegate) pairs ──────────────
          //
          // Fetch full row context per project before soft-deleting so history
          // can be written with pi_delegate_id and delegate_user_id (R-PID-013 AC.2).
          for (const projectId of dto.project_ids!) {
            await this.assertCanManageProject(projectId);

            // Fetch the active rows to revoke for history context.
            const rowsToRevoke = await manager.getRepository(PiDelegate).find({
              where: {
                project_id: projectId,
                delegate_user_id: In(dto.delegate_user_ids!),
                is_active: true,
              },
            });

            for (const revokedRow of rowsToRevoke) {
              await this.piDelegatesRepository.recordHistory(
                {
                  pi_delegate_id: revokedRow.pi_delegate_id,
                  project_id: revokedRow.project_id,
                  delegate_user_id: revokedRow.delegate_user_id,
                  action: PiDelegateHistoryActionEnum.REVOKE,
                },
                callerUserId,
                manager,
              );
            }

            const affected =
              await this.piDelegatesRepository.softDeleteDelegatePairs(
                projectId,
                dto.delegate_user_ids!,
                callerUserId,
                manager,
              );
            totalRevoked += affected;
          }
        }

        return { revoked_count: totalRevoked };
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Unchanged from v2 — R-PID-004 AC.1
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List all active delegations for a project (R-PID-004 AC.1).
   * Auth is enforced: only PI, active delegate, or SYSTEM_ADMIN may list.
   */
  async list(projectId: string): Promise<PiDelegate[]> {
    await this.assertCanManageProject(projectId);

    return this.piDelegatesRepository.find({
      where: { project_id: projectId, is_active: true },
      order: { pi_delegate_id: 'ASC' },
    });
  }

  /**
   * Verify whether an active delegation exists for the given
   * (project_id, delegate_user_id) pair (R-PID-004 AC.1).
   * Auth is enforced: only PI, active delegate, or SYSTEM_ADMIN may query.
   */
  async verify(dto: VerifyPiDelegateDto): Promise<{ exists: boolean }> {
    await this.assertCanManageProject(dto.project_id);

    const row = await this.piDelegatesRepository.findOne({
      where: {
        project_id: dto.project_id,
        delegate_user_id: dto.delegate_user_id,
        is_active: true,
      },
    });

    return { exists: row != null };
  }
}
