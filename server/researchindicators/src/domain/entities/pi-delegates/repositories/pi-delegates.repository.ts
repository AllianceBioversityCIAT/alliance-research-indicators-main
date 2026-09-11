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
