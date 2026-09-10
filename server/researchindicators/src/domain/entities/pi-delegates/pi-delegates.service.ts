// @akili-spec docs/specs/changes/my-pi-delegates — T-12, T-13
//
// Service contract (design.md §10.3 / requirements.md §11):
//
//   assign()     — R-PID-009 (bulk sync, Model B).
//                  Wraps ALL work in ONE dataSource.transaction (AC.6).
//                  Steps inside the tx:
//                    1. Auth per project (assertCanManageProject) — fail-fast 403 (AC.3).
//                    2. Resolve + deduplicate delegates ONCE via resolveDelegateUserId
//                       (AC.5 — provision new sec_user inside the tx, reuse across projects).
//                    3. PI-exclusion (isPiOfProject) per (project, delegate) pair — fail-fast
//                       BadRequestException (R-PID-008 / AC.4).
//                    4. Per-project SYNC diff: create desired\current, revoke current\desired,
//                       keep intersection (AC.2).
//                    5. Return per-project summary { project_id, created, revoked, kept } (AC.7).
//
//   bulkRevoke() — R-PID-010 (targeted bulk revoke, NOT a sync).
//                  Ambiguity guard: exactly one shape must be present — Shape A
//                  (pi_delegate_ids) OR Shape B (project_ids + delegate_user_ids).
//                  Both present, Shape B partial, or neither → BadRequestException (400).
//                  Auth per row's/project's project_id (AC.3). Transactional.
//
//   list()       — unchanged from v2 (R-PID-004 AC.1).
//   verify()     — unchanged from v2 (R-PID-004 AC.1).
//   assertCanManageProject() — unchanged from v2 (R-PID-007).
//
// v2 create() and revoke() removed in T-13 (controller now uses bulk endpoints).
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
// Named red input (K-012):
//   A caller who is none of the above → 403 ForbiddenException.
//
// pi_user_id on create (DD-B §4):
//   When the caller IS the PI (or SYSTEM_ADMIN), pi_user_id = the caller's
//   own user_id (provenance context).  The delegate check alone does not
//   determine who the PI is — it only says "this caller may act here."
//   SYSTEM_ADMIN acting on behalf of a project: pi_user_id is still set to
//   the caller's user_id as audit provenance (no separate pi resolution is
//   done here — see Not Done / Assumptions in the task report).
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
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

// ─────────────────────────────────────────────────────────────────────────────
// Response shapes
// ─────────────────────────────────────────────────────────────────────────────

/** Per-project sync summary returned by assign() (R-PID-009 AC.7). */
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
 * Maps a DelegateInputDto (T-10 DTO shape) to the repo DelegateInput union
 * (T-04 repository shape).
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
  // v3 — Bulk assign (sync) — R-PID-009
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bulk assign delegates to one or more projects (sync / Model B).
   *
   * The same desired delegate set is applied to EVERY project in dto.project_ids
   * (cartesian — DD-K).  For each project, the active delegation set is
   * reconciled so it becomes EXACTLY the desired set:
   *   created  = desired \ current  (pairs to insert)
   *   revoked  = current \ desired  (pairs to soft-delete)
   *   kept     = desired ∩ current  (unchanged)
   *
   * Everything runs in ONE transaction (AC.6) — any error rolls back all projects.
   *
   * Order of operations inside the transaction:
   *   1. Auth per project — fail-fast 403 if any project is unauthorized (AC.3).
   *   2. Resolve + de-duplicate delegates ONCE → Set<number> of delegate_user_ids (AC.5).
   *   3. PI-exclusion — fail-fast BadRequestException for any (project, delegate)
   *      where the delegate is the PI of that project (R-PID-008 / AC.4).
   *   4. Per-project SYNC diff (AC.2): insertDelegate / softDeleteDelegatePairs.
   *   5. Return per-project summary (AC.7).
   *
   * @param dto  BulkAssignPiDelegatesDto
   * @returns    Array of ProjectSyncSummary, one entry per project_id.
   */
  async assign(dto: BulkAssignPiDelegatesDto): Promise<ProjectSyncSummary[]> {
    const callerUserId = this.currentUserUtil.user_id;

    return this.dataSource.transaction(
      async (manager: EntityManager): Promise<ProjectSyncSummary[]> => {
        // ── Step 1: Auth per project (fail-fast) ──────────────────────────
        for (const projectId of dto.project_ids) {
          await this.assertCanManageProject(projectId);
        }

        // ── Step 2: Resolve + de-duplicate delegates ONCE (AC.5) ─────────
        //
        // Build a unique-by-identity map: stringify the DelegateInput key to
        // detect truly duplicate entries (same delegate_user_id, or same email).
        // Each unique entry is resolved via resolveDelegateUserId ONCE, and the
        // result is reused across all projects.
        //
        // This prevents double-inserting the same sec_user when the same new
        // delegate appears more than once in dto.delegates.
        const inputMap = new Map<string, DelegateInput>();
        for (const dtoEntry of dto.delegates) {
          const input = toDelegateInput(dtoEntry);
          const key =
            'delegate_user_id' in input
              ? `id:${input.delegate_user_id}`
              : `email:${input.email}`;
          if (!inputMap.has(key)) {
            inputMap.set(key, input);
          }
        }

        // Resolve each unique input to a sec_user_id (provisions absent users).
        const resolvedIds: number[] = [];
        for (const input of inputMap.values()) {
          const userId = await this.piDelegatesRepository.resolveDelegateUserId(
            input,
            manager,
          );
          resolvedIds.push(userId);
        }

        const desiredSet = new Set<number>(resolvedIds);

        // ── Step 3: PI-exclusion (fail-fast) — R-PID-008 / AC.4 ──────────
        for (const projectId of dto.project_ids) {
          for (const delegateUserId of desiredSet) {
            const isPI = await this.piDelegatesRepository.isPiOfProject(
              projectId,
              delegateUserId,
            );
            if (isPI) {
              throw new BadRequestException(
                `PI-exclusion violation: user ${delegateUserId} is the PI of project "${projectId}" and cannot be a delegate of the same project (R-PID-008).`,
              );
            }
          }
        }

        // ── Step 4: Per-project SYNC diff (AC.2) ─────────────────────────
        const summaries: ProjectSyncSummary[] = [];

        for (const projectId of dto.project_ids) {
          // Current active set for this project (read inside the tx).
          const currentIds =
            await this.piDelegatesRepository.listActiveDelegateUserIds(
              projectId,
              manager,
            );
          const currentSet = new Set<number>(currentIds);

          const toCreate = setDifference(desiredSet, currentSet);
          const toRevoke = setDifference(currentSet, desiredSet);
          const kept = setIntersection(desiredSet, currentSet);

          // Insert new delegations.
          for (const delegateUserId of toCreate) {
            await this.piDelegatesRepository.insertDelegate(
              projectId,
              callerUserId, // pi_user_id = caller (provenance)
              delegateUserId,
              callerUserId, // createdBy = caller (audit)
              manager,
            );
          }

          // Revoke removed delegations (no-op when empty).
          await this.piDelegatesRepository.softDeleteDelegatePairs(
            projectId,
            toRevoke,
            callerUserId,
            manager,
          );

          summaries.push({
            project_id: projectId,
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
  // v3 — Bulk targeted revoke — R-PID-010
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
          for (const projectId of dto.project_ids!) {
            await this.assertCanManageProject(projectId);

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
