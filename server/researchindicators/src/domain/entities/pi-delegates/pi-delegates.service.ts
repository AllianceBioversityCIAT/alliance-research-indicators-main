// @akili-spec docs/specs/changes/my-pi-delegates — T-05
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
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PiDelegatesRepository } from './repositories/pi-delegates.repository';
import { CreatePiDelegateDto } from './dto/create-pi-delegate.dto';
import { VerifyPiDelegateDto } from './dto/verify-pi-delegate.dto';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { PiDelegate } from './entities/pi-delegate.entity';

@Injectable()
export class PiDelegatesService {
  constructor(
    private readonly piDelegatesRepository: PiDelegatesRepository,
    private readonly currentUserUtil: CurrentUserUtil,
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
  // CRUD operations (R-PID-004)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new delegation (R-PID-004 AC.1, R-PID-005, R-PID-007).
   *
   * Auth is enforced before any write.  The transactional find-or-create of the
   * delegate's sec_user row is delegated entirely to
   * PiDelegatesRepository.createDelegate() (T-04).
   *
   * pi_user_id: the caller's own user_id.  The PI/delegate auth check above
   * already confirmed the caller may act on behalf of this project; their
   * user_id is recorded as the provenance of the delegation.
   *
   * Duplicate active delegation (R-PID-006): the DB unique-active constraint on
   * active_delegate_key will cause the INSERT to throw a MySQL duplicate-key
   * error.  TypeORM surfaces this as a QueryFailedError with errno 1062.
   * We catch it and re-throw as ConflictException (409) with a clear message.
   */
  async create(dto: CreatePiDelegateDto): Promise<PiDelegate> {
    await this.assertCanManageProject(dto.project_id);

    const callerUserId = this.currentUserUtil.user_id;

    // Determine delegate input: prefer delegate_user_id when present.
    const delegateInput =
      dto.delegate_user_id != null
        ? { delegate_user_id: dto.delegate_user_id }
        : dto.delegate!;

    try {
      return await this.piDelegatesRepository.createDelegate(
        dto.project_id,
        callerUserId,
        delegateInput,
        callerUserId,
      );
    } catch (err: unknown) {
      // MySQL errno 1062 — duplicate unique key (active_delegate_key constraint).
      if (
        err instanceof Error &&
        'errno' in err &&
        (err as NodeJS.ErrnoException).errno === 1062
      ) {
        throw new ConflictException(
          'An active delegation already exists for this (project, delegate) pair.',
        );
      }
      throw err;
    }
  }

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

  /**
   * Revoke (soft-delete) a delegation by its primary key (R-PID-004 AC.2).
   *
   * The row is fetched first to obtain project_id for the auth check.
   * If the row does not exist or is already revoked, a NotFoundException is thrown.
   */
  async revoke(piDelegateId: number): Promise<void> {
    const row = await this.piDelegatesRepository.findOne({
      where: { pi_delegate_id: piDelegateId, is_active: true },
    });

    if (!row) {
      throw new NotFoundException(
        `Active delegation with id ${piDelegateId} not found.`,
      );
    }

    await this.assertCanManageProject(row.project_id);

    await this.piDelegatesRepository.softDeleteDelegate(
      piDelegateId,
      this.currentUserUtil.user_id,
    );
  }
}
