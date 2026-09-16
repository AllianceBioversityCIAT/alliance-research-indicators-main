// @akili-spec docs/specs/changes/my-pi-delegates — T-04
//
// pi_user_id removed (redundant with created_by) — Product decision 2026-09-11
// active_delegate_key removed (Product decision 2026-09-11)
//
// Atomicity guarantee (R-PID-005 AC.3 / NFR-PID-003):
//   The repository routes ALL writes — sec_user insert and pi_delegates insert —
//   through the SAME EntityManager obtained from dataSource.transaction().
//   The original createUserInSecUsers (result.repository.ts:593) issues
//   this.query() on the pooled connection and is therefore NOT transaction-bound.
//   This repository reuses the insert logic (column set, AllianceUserStaff carnet
//   resolution) but executes it via manager.query() so both writes share the same
//   transactional connection. A failure after the sec_user insert (e.g. a FK
//   constraint violation on the pi_delegates row) will roll back the sec_user
//   insert as well — satisfying the T-09 rollback test (R-PID-005 AC.3).
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PiDelegate } from '../entities/pi-delegate.entity';
import { PiDelegateHistory } from '../entities/pi-delegate-history.entity';
import { PiDelegateHistoryActionEnum } from '../enum/pi-delegate-history-action.enum';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { AllianceUserStaff } from '../../alliance-user-staff/entities/alliance-user-staff.entity';
import { isEmpty } from '../../../shared/utils/object.utils';

/** Minimum delegate identity needed to provision an absent sec_user (R-PID-005 AC.2 / OQ-D). */
export interface DelegateNewUserIdentity {
  email: string;
  first_name: string;
  last_name: string;
  /** Optional Alliance carnet; resolved against alliance_user_staff before the INSERT. */
  carnet?: string;
}

/** Input for createDelegate() when the sec_user already exists. */
export interface DelegateByUserId {
  delegate_user_id: number;
}

/** Union: supply an existing sec_user_id, or identity fields to provision one. */
export type DelegateInput = DelegateByUserId | DelegateNewUserIdentity;

function isDelegateByUserId(d: DelegateInput): d is DelegateByUserId {
  return (d as DelegateByUserId).delegate_user_id != null;
}

@Injectable()
export class PiDelegatesRepository extends Repository<PiDelegate> {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly dataSource: DataSource,
  ) {
    super(PiDelegate, dataSource.createEntityManager());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auth query (R-PID-007 / DD-B)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns true when userId is the PI of projectId OR has an active delegation
   * for that project.
   *
   * PI resolution reuses the same agresso_contracts → alliance_user_staff →
   * sec_users join from isPi() (result-status-workflow.repository.ts:181-196),
   * keyed directly on ac.agreement_id instead of through result_contracts.
   * The delegate branch checks pi_delegates (project_id, delegate_user_id, is_active).
   * Both branches are combined via UNION so a single boolean is returned.
   *
   * This method is called BEFORE any write in create/list/verify/revoke — it is
   * the sole project-scoped authorization gate (R-PID-007 AC.1).
   */
  async isPiOrActiveDelegateOfProject(
    projectId: string,
    userId: number,
  ): Promise<boolean> {
    const query = `
      SELECT 1
      FROM agresso_contracts ac
        INNER JOIN alliance_user_staff aus ON aus.carnet = ac.projectLeadId
        INNER JOIN sec_users su ON su.email = aus.email
      WHERE ac.agreement_id = ?
        AND su.sec_user_id = ?
      LIMIT 1
      UNION
      SELECT 1
      FROM pi_delegates pd
      WHERE pd.project_id = ?
        AND pd.delegate_user_id = ?
        AND pd.is_active = TRUE
      LIMIT 1;
    `;
    const rows = await this.dataSource.query(query, [
      projectId,
      userId,
      projectId,
      userId,
    ]);
    return rows?.length > 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Read helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Look up a sec_user by carnet first, then email.
   * Read-only — runs outside any transaction (safe for the pre-TX lookup).
   * Reuses the lookup logic of ResultRepository.findUserByEmailOrCarnet (R-PID-005 AC.1).
   */
  async findUserByEmailOrCarnet(
    carnet?: string,
    email?: string,
  ): Promise<SecUser | null> {
    if (!carnet && !email) {
      return null;
    }
    if (!isEmpty(carnet)) {
      const byCarnet = await this._findUserByCarnet(carnet);
      if (byCarnet) return byCarnet;
    }
    if (!isEmpty(email)) {
      const byEmail = await this._findUserByEmail(email);
      if (byEmail) return byEmail;
    }
    return null;
  }

  private async _findUserByCarnet(carnet: string): Promise<SecUser | null> {
    const query = `SELECT su.*
    FROM sec_users su
    WHERE su.carnet = ?
      AND su.is_active = TRUE
    LIMIT 1;`;
    const rows: SecUser[] = await this.query(query, [carnet]);
    return rows?.length ? rows[0] : null;
  }

  private async _findUserByEmail(email: string): Promise<SecUser | null> {
    const query = `SELECT su.*
    FROM sec_users su
    WHERE su.email LIKE CONCAT('%', ?, '%')
      AND su.is_active = TRUE
    LIMIT 1;`;
    const rows: SecUser[] = await this.query(query, [email]);
    return rows?.length ? rows[0] : null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transactional write: find-or-create sec_user + insert pi_delegates
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Soft-delete (revoke) a pi_delegates row (R-PID-004 AC.2 / design §4).
   * Sets is_active = false, deleted_at = now, updated_by = caller.
   */
  async softDeleteDelegate(
    pi_delegate_id: number,
    userId: number,
  ): Promise<void> {
    await this.update(
      { pi_delegate_id },
      {
        is_active: false,
        deleted_at: new Date(),
        updated_by: userId,
      },
    );
  }

  // @akili-spec docs/specs/changes/my-pi-delegates — T-11

  // ─────────────────────────────────────────────────────────────────────────
  // PI-only check (R-PID-008 / design §10.2)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns true when userId is the PI of projectId.
   *
   * This is the PI-ONLY half of isPiOrActiveDelegateOfProject — it resolves the
   * agresso_contracts.projectLeadId → alliance_user_staff.carnet → sec_users.email
   * chain without consulting pi_delegates.
   *
   * Used by the service's assign() to enforce R-PID-008: a PI of a project cannot
   * be made a delegate of that same project. The delegate branch is intentionally
   * absent to avoid a false-negative for a user who is both PI and an existing
   * delegate of another project.
   *
   * @param projectId  Agresso agreement_id
   * @param userId     sec_user_id to test
   */
  async isPiOfProject(projectId: string, userId: number): Promise<boolean> {
    const query = `
      SELECT 1
      FROM agresso_contracts ac
        INNER JOIN alliance_user_staff aus ON aus.carnet = ac.projectLeadId
        INNER JOIN sec_users su ON su.email = aus.email
      WHERE ac.agreement_id = ?
        AND su.sec_user_id = ?
      LIMIT 1;
    `;
    const rows = await this.dataSource.query(query, [projectId, userId]);
    return rows?.length > 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Active delegate set read (design §10.2)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns the current set of active delegate_user_ids for a project.
   *
   * Used by the service's sync diff to determine which delegates to create
   * (desired \ current) and which to revoke (current \ desired).
   *
   * Accepts an optional transaction manager so the service may call this
   * inside the same transaction that is about to apply writes — guaranteeing
   * the diff is computed against the tx's uncommitted state when needed.
   *
   * @param projectId  Agresso agreement_id
   * @param manager    Optional EntityManager from the owning transaction
   */
  async listActiveDelegateUserIds(
    projectId: string,
    manager?: EntityManager,
  ): Promise<number[]> {
    const query = `
      SELECT delegate_user_id
      FROM pi_delegates
      WHERE project_id = ?
        AND is_active = TRUE;
    `;
    const runner = manager ?? this.dataSource;
    const rows: Array<{ delegate_user_id: number }> = await runner.query(
      query,
      [projectId],
    );
    return rows.map((r) => Number(r.delegate_user_id));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Manager-accepting mutation primitives (design §10.2 / R-PID-009 AC.6)
  //
  // The SERVICE (T-12) owns the dataSource.transaction() and passes `manager`
  // into every method below.  None of these methods open their own transaction.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resolves or provisions the delegate's sec_user_id inside the caller's transaction.
   *
   * - When delegate_user_id is provided directly, return it without any DB work.
   * - Otherwise provision the user via the existing _findOrCreateSecUserInTx,
   *   reusing its carnet-resolution and INSERT-in-tx logic (DD-D / R-PID-005 AC.2).
   *
   * @param input    DelegateInput union — existing id or identity to provision
   * @param manager  EntityManager from the owning transaction
   * @returns        Resolved sec_user_id
   */
  async resolveDelegateUserId(
    input: DelegateInput,
    manager: EntityManager,
  ): Promise<number> {
    if (isDelegateByUserId(input)) {
      return input.delegate_user_id;
    }
    return this._findOrCreateSecUserInTx(manager, input);
  }

  /**
   * Inserts a single pi_delegates row through the caller's transaction manager.
   *
   * @param project_id         Agresso agreement_id
   * @param delegate_user_id   sec_user_id of the delegate
   * @param createdBy          sec_user_id of the caller (audit)
   * @param manager            EntityManager from the owning transaction
   * @returns                  The newly-created PiDelegate row
   */
  async insertDelegate(
    project_id: string,
    delegate_user_id: number,
    createdBy: number,
    manager: EntityManager,
  ): Promise<PiDelegate> {
    const repo = manager.getRepository(PiDelegate);
    const row = repo.create({
      project_id,
      delegate_user_id,
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
    });
    return repo.save(row);
  }

  /**
   * Soft-deletes all ACTIVE pi_delegates rows for a project whose
   * delegate_user_id is in the provided list.
   *
   * Used by the sync logic (T-12 assign): revokes the "current \ desired" set.
   * For a bulk revoke spanning multiple projects the service calls this once
   * per project — a per-project signature keeps the WHERE clause tight.
   *
   * No-ops gracefully when delegate_user_ids is empty (nothing to revoke).
   *
   * @param project_id        Agresso agreement_id
   * @param delegate_user_ids Delegate sec_user_ids to revoke in this project
   * @param userId            sec_user_id of the caller (audit)
   * @param manager           EntityManager from the owning transaction
   * @returns                 Number of rows affected
   */
  async softDeleteDelegatePairs(
    project_id: string,
    delegate_user_ids: number[],
    userId: number,
    manager: EntityManager,
  ): Promise<number> {
    if (!delegate_user_ids.length) return 0;
    const now = new Date();
    const result = await manager
      .getRepository(PiDelegate)
      .createQueryBuilder()
      .update(PiDelegate)
      .set({ is_active: false, deleted_at: now, updated_by: userId })
      .where(
        'project_id = :project_id AND delegate_user_id IN (:...delegate_user_ids) AND is_active = TRUE',
        { project_id, delegate_user_ids },
      )
      .execute();
    return result.affected ?? 0;
  }

  /**
   * Soft-deletes ACTIVE pi_delegates rows by primary key (pi_delegate_id).
   *
   * Used by T-12 bulkRevoke when the caller supplies pi_delegate_ids directly
   * (R-PID-010 AC.1 first shape).
   *
   * No-ops gracefully when pi_delegate_ids is empty.
   *
   * @param pi_delegate_ids   PKs of the pi_delegates rows to revoke
   * @param userId            sec_user_id of the caller (audit)
   * @param manager           EntityManager from the owning transaction
   * @returns                 Number of rows affected
   */
  async softDeleteDelegateIds(
    pi_delegate_ids: number[],
    userId: number,
    manager: EntityManager,
  ): Promise<number> {
    if (!pi_delegate_ids.length) return 0;
    const now = new Date();
    const result = await manager
      .getRepository(PiDelegate)
      .createQueryBuilder()
      .update(PiDelegate)
      .set({ is_active: false, deleted_at: now, updated_by: userId })
      .where('pi_delegate_id IN (:...pi_delegate_ids) AND is_active = TRUE', {
        pi_delegate_ids,
      })
      .execute();
    return result.affected ?? 0;
  }

  // @akili-spec docs/specs/changes/my-pi-delegates-ui
  // ─────────────────────────────────────────────────────────────────────────
  // Enriched GET helpers (raw SQL — sec_users has no TypeORM entity)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns the agresso_contracts row for a single project code, or null when
   * no matching row exists.
   *
   * Used by list() to populate the project-level fields of
   * ProjectDelegatesResponseDto.
   *
   * @param projectId  agresso_contracts.agreement_id
   */
  async findProjectSummary(projectId: string): Promise<{
    agreement_id: string;
    description: string | null;
    is_pool_funding_contributor: number;
    contract_status: string | null;
    start_date: Date | null;
    end_date: Date | null;
    pi_user_id: number | null;
  } | null> {
    const rows: Array<{
      agreement_id: string;
      description: string | null;
      is_pool_funding_contributor: number;
      contract_status: string | null;
      start_date: Date | null;
      end_date: Date | null;
      pi_user_id: number | null;
    }> = await this.dataSource.query(
      // pi_user_id resolves the SAME chain as isPiOfProject
      // (projectLeadId → alliance_user_staff.carnet → sec_users.email). It is a
      // correlated subquery, not a JOIN, so a duplicated carnet/email can never
      // multiply the contract row.
      `SELECT ac.agreement_id, ac.description, ac.is_pool_funding_contributor,
              ac.contract_status, ac.start_date, ac.end_date,
              (SELECT su.sec_user_id
                 FROM alliance_user_staff aus
                 INNER JOIN sec_users su ON su.email = aus.email
                WHERE aus.carnet = ac.projectLeadId
                LIMIT 1) AS pi_user_id
       FROM agresso_contracts ac
       WHERE ac.agreement_id = ?
       LIMIT 1`,
      [projectId],
    );
    return rows?.length ? rows[0] : null;
  }

  /**
   * Returns the active delegates of a project, enriched with sec_users identity.
   *
   * Used by list() to populate the delegates[] array of
   * ProjectDelegatesResponseDto.
   *
   * @param projectId  agresso_contracts.agreement_id / pi_delegates.project_id
   */
  async findActiveDelegatesWithUser(projectId: string): Promise<
    Array<{
      delegate_user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      carnet: string | null;
      status_id: number | null;
      is_active: number;
    }>
  > {
    return this.dataSource.query(
      `SELECT pd.delegate_user_id,
              su.first_name,
              su.last_name,
              su.email,
              su.carnet,
              su.status_id,
              su.is_active
       FROM pi_delegates pd
         INNER JOIN sec_users su ON su.sec_user_id = pd.delegate_user_id
       WHERE pd.project_id = ?
         AND pd.is_active = TRUE
       ORDER BY su.last_name, su.first_name`,
      [projectId],
    );
  }

  /**
   * Returns all active projects a delegate is currently assigned to, as
   * lightweight project summary objects.
   *
   * Used by listByDelegate() to populate the projects[] array of
   * DelegateProjectsResponseDto.
   *
   * @param delegateUserId  sec_users.sec_user_id
   */
  async findDelegateProjects(
    delegateUserId: number,
  ): Promise<Array<{ agreement_id: string; description: string | null }>> {
    return this.dataSource.query(
      `SELECT ac.agreement_id, ac.description
       FROM pi_delegates pd
         INNER JOIN agresso_contracts ac ON ac.agreement_id = pd.project_id
       WHERE pd.delegate_user_id = ?
         AND pd.is_active = TRUE
       ORDER BY ac.agreement_id`,
      [delegateUserId],
    );
  }

  /**
   * Returns identity fields for a single sec_user, or null when the user does
   * not exist.
   *
   * Used by listByDelegate() to populate the person-level fields of
   * DelegateProjectsResponseDto.
   *
   * @param userId  sec_users.sec_user_id
   */
  async findUserSummary(userId: number): Promise<{
    sec_user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    carnet: string | null;
    status_id: number | null;
    is_active: number;
  } | null> {
    const rows: Array<{
      sec_user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      carnet: string | null;
      status_id: number | null;
      is_active: number;
    }> = await this.dataSource.query(
      `SELECT sec_user_id, first_name, last_name, email, carnet, status_id, is_active
       FROM sec_users
       WHERE sec_user_id = ?
       LIMIT 1`,
      [userId],
    );
    return rows?.length ? rows[0] : null;
  }

  // @akili-spec docs/specs/changes/my-pi-delegates-ui — by-user endpoints
  // ─────────────────────────────────────────────────────────────────────────
  // User-scoped managed-project helpers (raw SQL — sec_users has no entity)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns the agreement_ids of all projects that userId manages as PI or as
   * an active delegate.
   *
   * PI half:      agresso_contracts → alliance_user_staff → sec_users (same
   *               chain as isPiOfProject / isPiOrActiveDelegateOfProject).
   * Delegate half: pi_delegates where delegate_user_id = userId AND is_active.
   *
   * Both halves are combined with UNION so each managed agreement_id appears
   * exactly once even when the user is both PI and a delegate (unusual in
   * practice but safe to handle).
   *
   * @param userId  sec_users.sec_user_id
   */
  async findManagedProjectIds(userId: number): Promise<string[]> {
    const query = `
      SELECT ac.agreement_id
      FROM agresso_contracts ac
        INNER JOIN alliance_user_staff aus ON aus.carnet = ac.projectLeadId
        INNER JOIN sec_users su ON su.email = aus.email
      WHERE su.sec_user_id = ?
      UNION
      SELECT DISTINCT pd.project_id AS agreement_id
      FROM pi_delegates pd
      WHERE pd.delegate_user_id = ?
        AND pd.is_active = TRUE
    `;
    const rows: Array<{ agreement_id: string }> = await this.dataSource.query(
      query,
      [userId, userId],
    );
    return rows.map((r) => r.agreement_id);
  }

  /**
   * Returns agresso_contracts rows for the given project ids.
   *
   * Callers MUST guard against an empty projectIds array — an empty IN clause
   * is not valid SQL and this method does not issue any query when the list is
   * empty (it returns [] immediately).
   *
   * @param projectIds  agresso_contracts.agreement_id values to look up
   */
  async findProjectSummariesByIds(projectIds: string[]): Promise<
    Array<{
      agreement_id: string;
      description: string | null;
      is_pool_funding_contributor: number;
      contract_status: string | null;
      start_date: Date | null;
      end_date: Date | null;
      pi_user_id: number | null;
    }>
  > {
    if (!projectIds.length) return [];
    return this.dataSource.query(
      // pi_user_id: same chain as isPiOfProject, as a correlated subquery so the
      // contract row count is unaffected by duplicate carnets/emails.
      `SELECT ac.agreement_id, ac.description, ac.is_pool_funding_contributor,
              ac.contract_status, ac.start_date, ac.end_date,
              (SELECT su.sec_user_id
                 FROM alliance_user_staff aus
                 INNER JOIN sec_users su ON su.email = aus.email
                WHERE aus.carnet = ac.projectLeadId
                LIMIT 1) AS pi_user_id
       FROM agresso_contracts ac
       WHERE ac.agreement_id IN (?)`,
      [projectIds],
    );
  }

  /**
   * Returns active delegate rows (enriched with sec_users identity) for the
   * given project ids.
   *
   * Guards against an empty list: returns [] without querying when projectIds
   * is empty.
   *
   * @param projectIds  project_id values to look up
   */
  async findActiveDelegatesForProjects(projectIds: string[]): Promise<
    Array<{
      project_id: string;
      delegate_user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      carnet: string | null;
      status_id: number | null;
      is_active: number;
    }>
  > {
    if (!projectIds.length) return [];
    // No sec_users status/is_active filter — inactive/pending/rejected delegate ACCOUNTS are intentionally included in the table (only pd.is_active gates the delegation). Product decision 2026-09-14.
    return this.dataSource.query(
      `SELECT pd.project_id,
              pd.delegate_user_id,
              su.first_name,
              su.last_name,
              su.email,
              su.carnet,
              su.status_id,
              su.is_active
       FROM pi_delegates pd
         INNER JOIN sec_users su ON su.sec_user_id = pd.delegate_user_id
       WHERE pd.project_id IN (?)
         AND pd.is_active = TRUE
       ORDER BY su.last_name, su.first_name`,
      [projectIds],
    );
  }

  /**
   * Returns active pi_delegates rows for the given projects, joined with both
   * sec_users (delegate identity) and agresso_contracts (project description).
   *
   * Used by listManagedDelegates() (GET /pi-delegates/by-user/people) to build
   * the DelegateProjectsResponseDto[] response.
   *
   * Guards against an empty list: returns [] without querying when projectIds
   * is empty.
   *
   * @param projectIds  project_id values to look up
   */
  async findDelegatesForProjects(projectIds: string[]): Promise<
    Array<{
      delegate_user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      carnet: string | null;
      status_id: number | null;
      is_active: number;
      agreement_id: string;
      description: string | null;
    }>
  > {
    if (!projectIds.length) return [];
    // No sec_users status/is_active filter — inactive/pending/rejected delegate ACCOUNTS are intentionally included in the table (only pd.is_active gates the delegation). Product decision 2026-09-14.
    return this.dataSource.query(
      `SELECT pd.delegate_user_id,
              su.first_name,
              su.last_name,
              su.email,
              su.carnet,
              su.status_id,
              su.is_active,
              ac.agreement_id,
              ac.description
       FROM pi_delegates pd
         INNER JOIN sec_users su ON su.sec_user_id = pd.delegate_user_id
         INNER JOIN agresso_contracts ac ON ac.agreement_id = pd.project_id
       WHERE pd.project_id IN (?)
         AND pd.is_active = TRUE
       ORDER BY su.last_name, su.first_name, ac.agreement_id`,
      [projectIds],
    );
  }

  // @akili-spec docs/specs/changes/my-pi-delegates-ui — history endpoint
  // ─────────────────────────────────────────────────────────────────────────
  // History READ helpers (GET /pi-delegates/history)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns every history row for a project, newest-first, LEFT JOINed with
   * sec_users for both the actor (created_by) and the target delegate, and
   * with agresso_contracts for the project name.
   *
   * LEFT JOINs are intentional: a user could be deleted from sec_users after
   * the event was recorded; the history row must still be visible.
   *
   * No is_active filter — history is an append-only log; every event counts.
   *
   * @param projectId  pi_delegate_history.project_id (agresso agreement_id)
   */
  async findProjectHistory(projectId: string): Promise<
    Array<{
      pi_delegate_history_id: number;
      action: string;
      created_at: Date;
      actor_user_id: number | null;
      actor_first: string | null;
      actor_last: string | null;
      delegate_user_id: number;
      target_first: string | null;
      target_last: string | null;
      project_id: string;
      project_name: string | null;
    }>
  > {
    return this.dataSource.query(
      `SELECT h.pi_delegate_history_id,
              h.action,
              h.created_at,
              h.created_by    AS actor_user_id,
              actor.first_name AS actor_first,
              actor.last_name  AS actor_last,
              h.delegate_user_id,
              tgt.first_name   AS target_first,
              tgt.last_name    AS target_last,
              h.project_id,
              ac.description   AS project_name
       FROM pi_delegate_history h
         LEFT JOIN sec_users actor ON actor.sec_user_id = h.created_by
         LEFT JOIN sec_users tgt   ON tgt.sec_user_id   = h.delegate_user_id
         LEFT JOIN agresso_contracts ac ON ac.agreement_id = h.project_id
       WHERE h.project_id = ?
       ORDER BY h.created_at DESC`,
      [projectId],
    );
  }

  /**
   * Returns every history row for a specific delegate scoped to the given
   * project ids, newest-first. LEFT JOINs as per findProjectHistory.
   *
   * Callers MUST guard against an empty projectIds array — this method
   * returns [] immediately when the list is empty to avoid an invalid
   * `IN ()` clause.
   *
   * @param delegateUserId  pi_delegate_history.delegate_user_id to filter on
   * @param projectIds      Allowlist of project_ids (caller's managed set)
   */
  async findDelegateHistory(
    delegateUserId: number,
    projectIds: string[],
  ): Promise<
    Array<{
      pi_delegate_history_id: number;
      action: string;
      created_at: Date;
      actor_user_id: number | null;
      actor_first: string | null;
      actor_last: string | null;
      delegate_user_id: number;
      target_first: string | null;
      target_last: string | null;
      project_id: string;
      project_name: string | null;
    }>
  > {
    if (!projectIds.length) return [];
    return this.dataSource.query(
      `SELECT h.pi_delegate_history_id,
              h.action,
              h.created_at,
              h.created_by    AS actor_user_id,
              actor.first_name AS actor_first,
              actor.last_name  AS actor_last,
              h.delegate_user_id,
              tgt.first_name   AS target_first,
              tgt.last_name    AS target_last,
              h.project_id,
              ac.description   AS project_name
       FROM pi_delegate_history h
         LEFT JOIN sec_users actor ON actor.sec_user_id = h.created_by
         LEFT JOIN sec_users tgt   ON tgt.sec_user_id   = h.delegate_user_id
         LEFT JOIN agresso_contracts ac ON ac.agreement_id = h.project_id
       WHERE h.delegate_user_id = ?
         AND h.project_id IN (?)
       ORDER BY h.created_at DESC`,
      [delegateUserId, projectIds],
    );
  }

  // @akili-spec docs/specs/changes/my-pi-delegates — T-18
  // ─────────────────────────────────────────────────────────────────────────
  // History write (R-PID-012)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Inserts one row into `pi_delegate_history` through the caller's transaction manager.
   *
   * The method is manager-accepting — it does NOT open its own transaction.
   * The service (T-19) owns the one dataSource.transaction() and passes `manager`
   * so this write is atomic with the mutation that triggered it (R-PID-012 AC.3).
   *
   * @param entry    Context captured at the moment of the mutation:
   *                 pi_delegate_id, project_id, delegate_user_id, action.
   * @param actorId  sec_user_id of the user who executed the assign/revoke (created_by).
   * @param manager  EntityManager from the owning transaction.
   */
  async recordHistory(
    entry: {
      pi_delegate_id: number;
      project_id: string;
      delegate_user_id: number;
      action: PiDelegateHistoryActionEnum;
    },
    actorId: number,
    manager: EntityManager,
  ): Promise<void> {
    const repo = manager.getRepository(PiDelegateHistory);
    const row = repo.create({
      ...entry,
      created_by: actorId,
      updated_by: actorId,
    });
    await repo.save(row);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: sec_user provisioning inside a transaction (R-PID-005 AC.2)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reuses the INSERT logic of ResultRepository.createUserInSecUsers but routes
   * ALL operations through the provided transactional EntityManager so that
   * both the sec_user INSERT and the pi_delegates INSERT share the same
   * connection and will roll back together on failure (NFR-PID-003).
   *
   * Logic:
   *   1. Resolve carnet — check alliance_user_staff via the tx manager.
   *   2. INSERT into sec_users through manager.query() (same tx connection).
   *   3. Re-fetch the created row to obtain the auto-generated sec_user_id.
   *
   * @returns The sec_user_id of the found or newly created user.
   */
  private async _findOrCreateSecUserInTx(
    manager: EntityManager,
    identity: DelegateNewUserIdentity,
  ): Promise<number> {
    // Check if the user already exists (lookup is read-only, safe inside tx).
    const existing = await this.findUserByEmailOrCarnet(
      identity.carnet,
      identity.email,
    );
    if (existing) {
      return existing.sec_user_id;
    }

    // Resolve carnet against alliance_user_staff (same logic as createUserInSecUsers).
    const allianceUserStaff = identity.carnet
      ? await manager.getRepository(AllianceUserStaff).findOne({
          where: { carnet: identity.carnet, is_active: true },
        })
      : null;

    const resolvedCarnet = isEmpty(allianceUserStaff)
      ? null
      : (identity.carnet ?? null);

    // INSERT through the transactional manager connection (not this.query()).
    const dbName = this.appConfig.ARI_MYSQL_NAME;
    const insertSql = `INSERT INTO ${dbName}.sec_users
    (first_name, last_name, email, carnet, status_id, is_active)
    VALUES (?, ?, ?, ?, ?, TRUE);`;

    await manager.query(insertSql, [
      identity.first_name,
      identity.last_name,
      identity.email,
      resolvedCarnet,
      1,
    ]);

    // Re-fetch to obtain the generated sec_user_id (mirrors createUserInSecUsers).
    const created = await this._findUserByEmailInTx(manager, identity.email);

    return created.sec_user_id;
  }

  /**
   * Re-fetch a sec_user by email inside the transaction (same connection)
   * so we see the row just inserted before it is committed.
   */
  private async _findUserByEmailInTx(
    manager: EntityManager,
    email: string,
  ): Promise<SecUser> {
    const query = `SELECT su.*
    FROM sec_users su
    WHERE su.email LIKE CONCAT('%', ?, '%')
    LIMIT 1;`;
    const rows: SecUser[] = await manager.query(query, [email]);
    return rows?.[0] ?? null;
  }
}
