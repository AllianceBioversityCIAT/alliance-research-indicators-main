// @akili-spec changes/agresso-staff-deactivation (T-05 — NFR-AGD-002 fixture gate)
import { dataSource } from '../../src/db/config/mysql/orm.test.config';
import { AgressoStaffRawDto } from '../../src/domain/tools/agresso/staff/dto/agresso-staff-raw.dto';
import { FetchReport } from '../../src/domain/tools/agresso/staff/dto/fetch-report.dto';
import { SecUserDeactivationRepository } from '../../src/domain/tools/agresso/staff/sec-user-deactivation.repository';
import { SecUserDeactivationService } from '../../src/domain/tools/agresso/staff/sec-user-deactivation.service';
import { ReconciliationResult } from '../../src/domain/tools/agresso/staff/sec-user-reconciler.service';
import { SecUserReconcilerRepository } from '../../src/domain/tools/agresso/staff/sec-user-reconciler.repository';

interface TableState {
  rowCount: number;
  activeSum: number;
}

interface OwnedState {
  secUsers: TableState;
  secUserRoles: TableState;
  appSecrets: TableState;
}

describe('Agresso staff deactivation — fixture tier', () => {
  // This fixture owns one deliberately high id and email domain. Cleanup uses exact predicates:
  // inserting a high id advances AUTO_INCREMENT, so a range could later capture sibling rows.
  const CANDIDATE_ID = 9_050_501;
  const INTERNAL_STATUS_ID = 9_050_510;
  const EXTERNAL_STATUS_ID = 9_050_511;
  const DELETED_EXTERNAL_STATUS_ID = 9_050_512;
  const ROLE_FOCUS_ID = 9_050_520;
  const ROLE_ID = 9_050_521;
  const EMAIL_DOMAIN = '@t05-agd.test';
  const SECRET_KEY = 'T05-AGD-candidate-secret';

  let repository: SecUserDeactivationRepository;
  let service: SecUserDeactivationService;
  let reconcilerRepository: SecUserReconcilerRepository;

  async function cleanOwnedRows(): Promise<void> {
    await dataSource.query(`DELETE FROM app_secrets WHERE app_secret_key = ?`, [
      SECRET_KEY,
    ]);
    await dataSource.query(`DELETE FROM sec_user_roles WHERE user_id = ?`, [
      CANDIDATE_ID,
    ]);
    await dataSource.query(`DELETE FROM sec_users WHERE sec_user_id = ?`, [
      CANDIDATE_ID,
    ]);
    await dataSource.query(`DELETE FROM sec_roles WHERE sec_role_id = ?`, [
      ROLE_ID,
    ]);
    await dataSource.query(
      `DELETE FROM sec_role_focus WHERE sec_role_focus_id = ?`,
      [ROLE_FOCUS_ID],
    );
    await dataSource.query(
      `DELETE FROM user_status WHERE user_status_id IN (?, ?, ?)`,
      [INTERNAL_STATUS_ID, EXTERNAL_STATUS_ID, DELETED_EXTERNAL_STATUS_ID],
    );
  }

  async function tableState(
    sql: string,
    params: unknown[],
  ): Promise<TableState> {
    const [row] = await dataSource.query(sql, params);
    return {
      rowCount: Number(row.row_count),
      activeSum: Number(row.active_sum),
    };
  }

  async function ownedState(): Promise<OwnedState> {
    return {
      secUsers: await tableState(
        `SELECT COUNT(*) AS row_count, COALESCE(SUM(is_active), 0) AS active_sum
           FROM sec_users
          WHERE sec_user_id = ?`,
        [CANDIDATE_ID],
      ),
      secUserRoles: await tableState(
        `SELECT COUNT(*) AS row_count, COALESCE(SUM(is_active), 0) AS active_sum
           FROM sec_user_roles
          WHERE user_id = ?`,
        [CANDIDATE_ID],
      ),
      appSecrets: await tableState(
        `SELECT COUNT(*) AS row_count, COALESCE(SUM(is_active), 0) AS active_sum
           FROM app_secrets
          WHERE app_secret_key = ?`,
        [SECRET_KEY],
      ),
    };
  }

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    repository = new SecUserDeactivationRepository(dataSource.manager);
    service = new SecUserDeactivationService(repository);
    reconcilerRepository = new SecUserReconcilerRepository(dataSource.manager);
  });

  beforeEach(cleanOwnedRows);

  afterAll(async () => {
    await cleanOwnedRows();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('computes a non-empty candidate set while changing no rows or active flags', async () => {
    await dataSource.query(
      `INSERT INTO user_status (user_status_id, name, is_active, deleted_at)
       VALUES (?, 'Employee', 1, NULL), (?, 'External', 1, NULL)`,
      [INTERNAL_STATUS_ID, EXTERNAL_STATUS_ID],
    );

    // Real MySQL must resolve exactly one active, non-deleted row named External.
    expect(await repository.resolveExternalStatusId()).toEqual({
      statusId: EXTERNAL_STATUS_ID,
      matchCount: 1,
    });

    await dataSource.query(
      `INSERT INTO user_status (user_status_id, name, is_active, deleted_at)
       VALUES (?, 'External', 1, NOW())`,
      [DELETED_EXTERNAL_STATUS_ID],
    );

    // A second, soft-deleted External must be filtered by SQL, not counted and not abort the run.
    expect(await repository.resolveExternalStatusId()).toEqual({
      statusId: EXTERNAL_STATUS_ID,
      matchCount: 1,
    });

    await dataSource.query(
      `INSERT INTO sec_role_focus (sec_role_focus_id, name)
       VALUES (?, 'T05 deactivation fixture focus')`,
      [ROLE_FOCUS_ID],
    );
    await dataSource.query(
      `INSERT INTO sec_roles (sec_role_id, name, focus_id)
       VALUES (?, 'T05_DEACTIVATION_FIXTURE', ?)`,
      [ROLE_ID, ROLE_FOCUS_ID],
    );
    await dataSource.query(
      `INSERT INTO sec_users
         (sec_user_id, first_name, last_name, email, carnet, status_id, is_active)
       VALUES (?, 'Gone', 'Person', ?, 'T05GONE', ?, 1)`,
      [CANDIDATE_ID, `gone.person${EMAIL_DOMAIN}`, INTERNAL_STATUS_ID],
    );
    await dataSource.query(
      `INSERT INTO sec_user_roles (user_id, role_id, is_active)
       VALUES (?, ?, 1)`,
      [CANDIDATE_ID, ROLE_ID],
    );
    await dataSource.query(
      `INSERT INTO app_secrets
         (app_secret_key, app_secret_uuid, responsible_user_id, is_active)
       VALUES (?, 'T05-AGD-candidate-uuid', ?, 1)`,
      [SECRET_KEY, CANDIDATE_ID],
    );

    const payload: AgressoStaffRawDto[] = [
      {
        resourceId: 'T05HERE',
        firstName: 'Present',
        lastName: 'Person',
        email: `present.person${EMAIL_DOMAIN}`,
        center: 'Alliance',
        status: 'Active',
      },
    ];
    const secUsers = await reconcilerRepository.findAllSecUsers();
    const reconciliation: ReconciliationResult = {
      allSecUsers: secUsers,
      skipped: [],
      collapsed: [],
      create: [],
      refresh: [],
      reactivate: [],
    };
    const fetchReport: FetchReport = {
      totalElements: 1,
      pageRowCounts: [1],
      distinctCarnets: 1,
      duplicatedCarnets: [],
    };
    const before = await ownedState();

    const measurement = await service.measure(
      payload,
      reconciliation,
      secUsers,
      fetchReport,
    );

    // This assertion MUST precede the zero-delta checks: an empty set would make them vacuous.
    expect(measurement.candidates).toContain(CANDIDATE_ID);
    expect(measurement.candidates?.length ?? 0).toBeGreaterThan(0);

    const after = await ownedState();
    expect(after.secUsers.rowCount).toBe(before.secUsers.rowCount);
    expect(after.secUsers.activeSum).toBe(before.secUsers.activeSum);
    expect(after.secUserRoles.rowCount).toBe(before.secUserRoles.rowCount);
    expect(after.secUserRoles.activeSum).toBe(before.secUserRoles.activeSum);
    expect(after.appSecrets.rowCount).toBe(before.appSecrets.rowCount);
    expect(after.appSecrets.activeSum).toBe(before.appSecrets.activeSum);
  });
});
