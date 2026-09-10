// @akili-spec docs/specs/changes/my-pi-delegates — T-04
//
// Atomicity guarantee (R-PID-005 AC.3 / NFR-PID-003):
//   createDelegate() routes ALL writes — sec_user insert and pi_delegates insert —
//   through the SAME EntityManager obtained from dataSource.transaction().
//   The original createUserInSecUsers (result.repository.ts:593) issues
//   this.query() on the pooled connection and is therefore NOT transaction-bound.
//   This repository reuses the insert logic (column set, AllianceUserStaff carnet
//   resolution) but executes it via manager.query() so both writes share the same
//   transactional connection. A failure after the sec_user insert (e.g. duplicate
//   active_delegate_key on the pi_delegates row) will roll back the sec_user insert
//   as well — satisfying the T-09 rollback test (R-PID-005 AC.3).
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PiDelegate } from '../entities/pi-delegate.entity';
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
   * Transactional create (R-PID-005).
   *
   * In a single transaction:
   *   1. Resolve the delegate's sec_user_id — either from delegate_user_id or by
   *      looking up / provisioning the user in sec_users.
   *   2. INSERT the pi_delegates row.
   *
   * Both writes share the same EntityManager so a failure at step 2 rolls back
   * the step-1 INSERT automatically (NFR-PID-003).
   *
   * @param project_id   Agresso agreement_id (FK → agresso_contracts)
   * @param pi_user_id   sec_user_id of the delegating PI (provenance)
   * @param delegate     Existing sec_user_id OR identity fields to provision
   * @param createdBy    sec_user_id of the caller (audit)
   * @returns            The newly-created PiDelegate row
   */
  async createDelegate(
    project_id: string,
    pi_user_id: number,
    delegate: DelegateInput,
    createdBy: number,
  ): Promise<PiDelegate> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // Step 1 — resolve or create the delegate sec_user inside the transaction.
      const delegateUserId = isDelegateByUserId(delegate)
        ? delegate.delegate_user_id
        : await this._findOrCreateSecUserInTx(manager, delegate);

      // Step 2 — insert the pi_delegates row via the same transactional manager.
      const piDelegateRepo = manager.getRepository(PiDelegate);
      const row = piDelegateRepo.create({
        project_id,
        pi_user_id,
        delegate_user_id: delegateUserId,
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy,
      });

      return piDelegateRepo.save(row);
    });
  }

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
