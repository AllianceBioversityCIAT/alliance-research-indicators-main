// @akili-spec changes/agresso-staff-deactivation (T-05 measurement; T-11 apply writes)
import { dataSource } from '../../src/db/config/mysql/orm.test.config';
import { AppConfigKey } from '../../src/domain/entities/app-config/enum/app-config-key.enum';
import { AgressoStaffRawDto } from '../../src/domain/tools/agresso/staff/dto/agresso-staff-raw.dto';
import { DeactivationConfigResolution } from '../../src/domain/tools/agresso/staff/dto/deactivation-config.dto';
import { FetchReport } from '../../src/domain/tools/agresso/staff/dto/fetch-report.dto';
import { SecUserDeactivationRepository } from '../../src/domain/tools/agresso/staff/sec-user-deactivation.repository';
import {
  DeactivationMeasurement,
  SecUserDeactivationService,
} from '../../src/domain/tools/agresso/staff/sec-user-deactivation.service';
import { ReconciliationResult } from '../../src/domain/tools/agresso/staff/sec-user-reconciler.service';
import {
  CHUNK,
  SecUserReconcilerRepository,
} from '../../src/domain/tools/agresso/staff/sec-user-reconciler.repository';
import { StaffDeactivationConfigResolver } from '../../src/domain/tools/agresso/staff/staff-deactivation-config.resolver';

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

  // T-11 band. Explicit ids, not a range cleanup: AUTO_INCREMENT on these tables sits near
  // 1xxx, and a wide range would be able to catch a sibling fixture's later row.
  const T11_STATUS_ID = 9_061_010;
  const T11_ROLE_FOCUS_ID = 9_061_020;
  const T11_ROLE_ID = 9_061_021;
  const LIVE_ACTIVE_A = 9_062_001;
  const LIVE_ACTIVE_B = 9_062_002;
  const LIVE_ALREADY_INACTIVE = 9_062_003;
  const LIVE_USER_IDS = [LIVE_ACTIVE_A, LIVE_ACTIVE_B, LIVE_ALREADY_INACTIVE];
  const ROLLBACK_COUNT = 120;
  const ROLLBACK_FIRST_ID = 9_063_001;

  let repository: SecUserDeactivationRepository;
  let service: SecUserDeactivationService;
  let reconcilerRepository: SecUserReconcilerRepository;

  function rollbackUserIds(): number[] {
    return Array.from(
      { length: ROLLBACK_COUNT },
      (_, index) => ROLLBACK_FIRST_ID + index,
    );
  }

  function t11UserIds(): number[] {
    return [...LIVE_USER_IDS, ...rollbackUserIds()];
  }

  function placeholders(count: number): string {
    return Array.from({ length: count }, () => '?').join(', ');
  }

  async function cleanOwnedRows(): Promise<void> {
    const ownedIds = t11UserIds();
    await dataSource.query(
      `DELETE FROM app_secrets
        WHERE app_secret_key = ?
           OR responsible_user_id IN (${placeholders(ownedIds.length)})`,
      [SECRET_KEY, ...ownedIds],
    );
    await dataSource.query(
      `DELETE FROM sec_user_roles
        WHERE user_id = ?
           OR user_id IN (${placeholders(ownedIds.length)})
           OR role_id = ?`,
      [CANDIDATE_ID, ...ownedIds, T11_ROLE_ID],
    );
    await dataSource.query(
      `DELETE FROM sec_users
        WHERE sec_user_id = ?
           OR sec_user_id IN (${placeholders(ownedIds.length)})`,
      [CANDIDATE_ID, ...ownedIds],
    );
    await dataSource.query(
      `DELETE FROM sec_roles WHERE sec_role_id IN (?, ?)`,
      [ROLE_ID, T11_ROLE_ID],
    );
    await dataSource.query(
      `DELETE FROM sec_role_focus WHERE sec_role_focus_id IN (?, ?)`,
      [ROLE_FOCUS_ID, T11_ROLE_FOCUS_ID],
    );
    await dataSource.query(
      `DELETE FROM user_status WHERE user_status_id IN (?, ?, ?, ?)`,
      [
        INTERNAL_STATUS_ID,
        EXTERNAL_STATUS_ID,
        DELETED_EXTERNAL_STATUS_ID,
        T11_STATUS_ID,
      ],
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

  async function pinExternalStatusConfig(
    id: number,
  ): Promise<() => Promise<void>> {
    const key = AppConfigKey.ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID;
    const existing: { simple_value: string | null }[] = await dataSource.query(
      'SELECT simple_value FROM app_config WHERE `key` = ?',
      [key],
    );
    await dataSource.query(
      `INSERT INTO app_config (\`key\`, simple_value, description, category, subcategory)
       VALUES (?, ?, 'T-05 fixture external status id', 'API', 'STAFF')
       ON DUPLICATE KEY UPDATE simple_value = VALUES(simple_value)`,
      [key, String(id)],
    );
    return async () => {
      if (existing.length === 0) {
        await dataSource.query('DELETE FROM app_config WHERE `key` = ?', [key]);
        return;
      }
      await dataSource.query(
        'UPDATE app_config SET simple_value = ? WHERE `key` = ?',
        [existing[0].simple_value, key],
      );
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
    service = new SecUserDeactivationService(
      repository,
      new StaffDeactivationConfigResolver(dataSource),
      dataSource,
    );
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
    expect(
      await repository.resolveExternalStatusId(EXTERNAL_STATUS_ID),
    ).toEqual({
      statusId: EXTERNAL_STATUS_ID,
      matchCount: 1,
    });

    await dataSource.query(
      `INSERT INTO user_status (user_status_id, name, is_active, deleted_at)
       VALUES (?, 'External', 1, NOW())`,
      [DELETED_EXTERNAL_STATUS_ID],
    );

    // A second, soft-deleted External must be filtered by SQL, not counted and not abort the run.
    expect(
      await repository.resolveExternalStatusId(EXTERNAL_STATUS_ID),
    ).toEqual({
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
    const restoreConfig = await pinExternalStatusConfig(EXTERNAL_STATUS_ID);
    try {
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
    } finally {
      await restoreConfig();
    }
  });

  interface ActiveSums {
    users: number;
    roles: number;
    secrets: number;
  }

  interface OwnedRows {
    users: Record<string, unknown>[];
    roles: Record<string, unknown>[];
    secrets: Record<string, unknown>[];
  }

  async function seedT11Catalog(): Promise<void> {
    await dataSource.query(
      `INSERT INTO user_status (user_status_id, name, is_active)
       VALUES (?, 'T11 Employee', 1)`,
      [T11_STATUS_ID],
    );
    await dataSource.query(
      `INSERT INTO sec_role_focus (sec_role_focus_id, name)
       VALUES (?, 'T11 deactivation fixture focus')`,
      [T11_ROLE_FOCUS_ID],
    );
    await dataSource.query(
      `INSERT INTO sec_roles (sec_role_id, name, focus_id)
       VALUES (?, 'T11_DEACTIVATION_FIXTURE', ?)`,
      [T11_ROLE_ID, T11_ROLE_FOCUS_ID],
    );
  }

  async function insertUsers(
    rows: { id: number; active: number }[],
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO sec_users
         (sec_user_id, first_name, last_name, email, status_id, is_active)
       VALUES ${rows.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`,
      rows.flatMap((row) => [
        row.id,
        'T11',
        'Person',
        `t11-${row.id}@t11-agd.test`,
        T11_STATUS_ID,
        row.active,
      ]),
    );
  }

  async function insertRoles(
    rows: { userId: number; active: number }[],
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO sec_user_roles (user_id, role_id, is_active)
       VALUES ${rows.map(() => '(?, ?, ?)').join(', ')}`,
      rows.flatMap((row) => [row.userId, T11_ROLE_ID, row.active]),
    );
  }

  async function insertSecrets(
    rows: { userId: number; active: number; suffix: string }[],
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO app_secrets
         (app_secret_key, app_secret_uuid, responsible_user_id, is_active)
       VALUES ${rows.map(() => '(?, ?, ?, ?)').join(', ')}`,
      rows.flatMap((row) => [
        `T11-AGD-${row.userId}-${row.suffix}`,
        `T11-AGD-uuid-${row.userId}-${row.suffix}`,
        row.userId,
        row.active,
      ]),
    );
  }

  function measurementFor(ids: number[]): DeactivationMeasurement {
    return {
      totalElements: ids.length,
      distinctCarnets: ids.length,
      activePopulation: 1_000_000,
      candidates: ids,
      excludedExternal: 0,
      excludedSystemAdmin: 0,
      excludedAmbiguous: 0,
      excludedUnmatchable: 0,
      shieldedBySkip: [],
    };
  }

  function configFor(dryRun: boolean): DeactivationConfigResolution {
    return {
      config: {
        dryRun,
        ceilingFraction: 1,
        absoluteFloor: 1_000_000,
        externalStatusId: 4,
      },
      failures: [],
    };
  }

  async function activeSums(
    userIds: number[],
    runner: {
      query: (sql: string, params?: unknown[]) => Promise<unknown>;
    } = dataSource,
  ): Promise<ActiveSums> {
    const marks = placeholders(userIds.length);
    const [users] = (await runner.query(
      `SELECT COALESCE(SUM(is_active), 0) AS active_sum
         FROM sec_users
        WHERE sec_user_id IN (${marks})`,
      userIds,
    )) as { active_sum: number }[];
    const [roles] = (await runner.query(
      `SELECT COALESCE(SUM(is_active), 0) AS active_sum
         FROM sec_user_roles
        WHERE user_id IN (${marks})`,
      userIds,
    )) as { active_sum: number }[];
    const [secrets] = (await runner.query(
      `SELECT COALESCE(SUM(is_active), 0) AS active_sum
         FROM app_secrets
        WHERE responsible_user_id IN (${marks})`,
      userIds,
    )) as { active_sum: number }[];
    return {
      users: Number(users.active_sum),
      roles: Number(roles.active_sum),
      secrets: Number(secrets.active_sum),
    };
  }

  async function ownedRows(userIds: number[]): Promise<OwnedRows> {
    const marks = placeholders(userIds.length);
    const users = await dataSource.query(
      `SELECT sec_user_id, first_name, last_name, email, carnet, status_id,
              is_active, created_by, updated_by,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updated_at,
              DATE_FORMAT(deleted_at, '%Y-%m-%d %H:%i:%s.%f') AS deleted_at,
              DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i:%s.%f') AS last_login_at
         FROM sec_users
        WHERE sec_user_id IN (${marks})
        ORDER BY sec_user_id`,
      userIds,
    );
    const roles = await dataSource.query(
      `SELECT sec_user_role_id, user_id, role_id, is_active, created_by, updated_by,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updated_at,
              DATE_FORMAT(deleted_at, '%Y-%m-%d %H:%i:%s.%f') AS deleted_at
         FROM sec_user_roles
        WHERE user_id IN (${marks})
        ORDER BY user_id, sec_user_role_id`,
      userIds,
    );
    const secrets = await dataSource.query(
      `SELECT app_secret_id, app_secret_key, app_secret_uuid, app_secret_description,
              responsible_user_id, is_active, created_by, updated_by,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updated_at,
              DATE_FORMAT(deleted_at, '%Y-%m-%d %H:%i:%s.%f') AS deleted_at
         FROM app_secrets
        WHERE responsible_user_id IN (${marks})
        ORDER BY responsible_user_id, app_secret_id`,
      userIds,
    );
    return { users, roles, secrets };
  }

  it('counts a matched unchanged row in affectedRows under CLIENT_FOUND_ROWS', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.query(
        `CREATE TEMPORARY TABLE t11_found_rows_probe (
           id INT PRIMARY KEY,
           is_active TINYINT NOT NULL
         )`,
      );
      await runner.query(
        `INSERT INTO t11_found_rows_probe (id, is_active) VALUES (1, 0)`,
      );
      const header = (await runner.query(
        `UPDATE t11_found_rows_probe SET is_active = 0 WHERE id = 1`,
      )) as { affectedRows: number; changedRows: number };
      expect(header.affectedRows).toBe(1);
      expect(header.changedRows).toBe(0);
    } finally {
      await runner.query('DROP TEMPORARY TABLE IF EXISTS t11_found_rows_probe');
      await runner.release();
    }
  });

  it('switches off all three tables and does not count rows already inactive', async () => {
    await seedT11Catalog();
    await insertUsers([
      { id: LIVE_ACTIVE_A, active: 1 },
      { id: LIVE_ACTIVE_B, active: 1 },
      { id: LIVE_ALREADY_INACTIVE, active: 0 },
    ]);
    await insertRoles([
      { userId: LIVE_ACTIVE_A, active: 1 },
      { userId: LIVE_ACTIVE_B, active: 1 },
      { userId: LIVE_ACTIVE_B, active: 0 },
      { userId: LIVE_ALREADY_INACTIVE, active: 0 },
    ]);
    await insertSecrets([
      { userId: LIVE_ACTIVE_A, active: 1, suffix: 'on' },
      { userId: LIVE_ACTIVE_A, active: 0, suffix: 'off' },
      { userId: LIVE_ACTIVE_B, active: 1, suffix: 'on' },
      { userId: LIVE_ALREADY_INACTIVE, active: 0, suffix: 'off' },
    ]);

    const before = await ownedRows(LIVE_USER_IDS);
    const beforeSums = await activeSums(LIVE_USER_IDS);
    const result = await service.apply(
      measurementFor(LIVE_USER_IDS),
      configFor(false),
    );
    const after = await ownedRows(LIVE_USER_IDS);
    const afterSums = await activeSums(LIVE_USER_IDS);

    expect(result.abortReason).toBeUndefined();
    expect(result.dryRun).toBe(false);

    const user = (rows: OwnedRows, id: number) =>
      rows.users.find((item) => item.sec_user_id === id);
    // One assertion per table, so removing that table's write reddens this
    // test against the row MySQL still holds.
    expect(Number(user(after, LIVE_ACTIVE_A)?.is_active)).toBe(0);
    expect(Number(user(after, LIVE_ACTIVE_B)?.is_active)).toBe(0);
    expect(user(after, LIVE_ACTIVE_A)?.updated_at).not.toBe(
      user(before, LIVE_ACTIVE_A)?.updated_at,
    );
    expect(user(after, LIVE_ALREADY_INACTIVE)).toEqual(
      user(before, LIVE_ALREADY_INACTIVE),
    );
    expect(after.users.every((item) => item.updated_by == null)).toBe(true);

    const activeRoleBefore = before.roles.find(
      (item) => item.user_id === LIVE_ACTIVE_A && Number(item.is_active) === 1,
    );
    const activeRoleAfter = after.roles.find(
      (item) => item.sec_user_role_id === activeRoleBefore?.sec_user_role_id,
    );
    expect(Number(activeRoleAfter?.is_active)).toBe(0);
    const inactiveRoleBefore = before.roles.find(
      (item) => item.user_id === LIVE_ACTIVE_B && Number(item.is_active) === 0,
    );
    const inactiveRoleAfter = after.roles.find(
      (item) => item.sec_user_role_id === inactiveRoleBefore?.sec_user_role_id,
    );
    expect(inactiveRoleAfter).toEqual(inactiveRoleBefore);

    const activeSecretBefore = before.secrets.find(
      (item) => item.app_secret_key === `T11-AGD-${LIVE_ACTIVE_A}-on`,
    );
    const activeSecretAfter = after.secrets.find(
      (item) => item.app_secret_id === activeSecretBefore?.app_secret_id,
    );
    expect(Number(activeSecretAfter?.is_active)).toBe(0);
    const inactiveSecretBefore = before.secrets.find(
      (item) => item.app_secret_key === `T11-AGD-${LIVE_ACTIVE_A}-off`,
    );
    const inactiveSecretAfter = after.secrets.find(
      (item) => item.app_secret_id === inactiveSecretBefore?.app_secret_id,
    );
    expect(inactiveSecretAfter).toEqual(inactiveSecretBefore);
    expect(after.roles.every((item) => item.updated_by == null)).toBe(true);
    expect(after.secrets.every((item) => item.updated_by == null)).toBe(true);

    // Three candidate ids. mysql2 enables CLIENT_FOUND_ROWS, so dropping
    // `AND is_active = 1` would count the already-inactive rows: 3 users and
    // 4 role/secret rows, instead of the 2 that actually changed.
    expect(LIVE_USER_IDS).toHaveLength(3);
    expect(result.deactivated).toBe(2);
    expect(result.rolesDeactivated).toBe(2);
    expect(result.secretsDeactivated).toBe(2);
    expect(result.deactivated).toBe(beforeSums.users - afterSums.users);
    expect(result.rolesDeactivated).toBe(beforeSums.roles - afterSums.roles);
    expect(result.secretsDeactivated).toBe(
      beforeSums.secrets - afterSums.secrets,
    );
    expect(afterSums).toEqual({ users: 0, roles: 0, secrets: 0 });
  });

  it('leaves all three tables byte-identical when the second role chunk fails over 120 accounts', async () => {
    expect(CHUNK).toBe(50);
    const ids = rollbackUserIds();
    expect(ids).toHaveLength(ROLLBACK_COUNT);
    expect(Math.ceil(ids.length / CHUNK)).toBe(3);

    await seedT11Catalog();
    await insertUsers(ids.map((id) => ({ id, active: 1 })));
    await insertRoles(ids.map((userId) => ({ userId, active: 1 })));
    await insertSecrets(
      ids.map((userId) => ({ userId, active: 1, suffix: 'on' })),
    );

    const before = await ownedRows(ids);
    expect(await activeSums(ids)).toEqual({
      users: ROLLBACK_COUNT,
      roles: ROLLBACK_COUNT,
      secrets: ROLLBACK_COUNT,
    });

    let during: ActiveSums | null = null;
    const original = repository.deactivateSecUserRoles.bind(repository);
    const rolesSpy = jest
      .spyOn(repository, 'deactivateSecUserRoles')
      .mockImplementation(async (manager, userIds) => {
        const originalQuery = manager.query.bind(manager);
        let roleUpdates = 0;
        manager.query = (async (query: string, parameters?: unknown[]) => {
          if (
            typeof query === 'string' &&
            query.includes('UPDATE sec_user_roles')
          ) {
            roleUpdates += 1;
            if (roleUpdates === 2) {
              during = await activeSums(ids, manager);
              throw new Error('sec_user_roles second chunk failed');
            }
          }
          return originalQuery(query, parameters);
        }) as typeof manager.query;
        return original(manager, userIds);
      });

    try {
      const result = await service.apply(measurementFor(ids), configFor(false));
      expect(result.abortReason).toBe('WRITE_FAILED');
      expect(result.abortDetail).toEqual({
        message: 'sec_user_roles second chunk failed',
      });
      expect(result.deactivated).toBe(0);
      expect(result.rolesDeactivated).toBe(0);
      expect(result.secretsDeactivated).toBe(0);
      // Secrets: all three chunks already ran. Roles: only the first chunk of 50.
      // Users: the third write had not started. Read on the open transaction.
      expect(during).toEqual({ users: 120, roles: 70, secrets: 0 });

      const after = await ownedRows(ids);
      expect(after.users).toEqual(before.users);
      expect(after.roles).toEqual(before.roles);
      expect(after.secrets).toEqual(before.secrets);
    } finally {
      rolesSpy.mockRestore();
    }
  }, 60_000);

  it('reports the candidate count, changes no row, and opens no transaction', async () => {
    await seedT11Catalog();
    await insertUsers([
      { id: LIVE_ACTIVE_A, active: 1 },
      { id: LIVE_ACTIVE_B, active: 1 },
      { id: LIVE_ALREADY_INACTIVE, active: 0 },
    ]);
    await insertRoles([
      { userId: LIVE_ACTIVE_A, active: 1 },
      { userId: LIVE_ACTIVE_B, active: 1 },
    ]);
    await insertSecrets([
      { userId: LIVE_ACTIVE_A, active: 1, suffix: 'on' },
      { userId: LIVE_ACTIVE_B, active: 1, suffix: 'on' },
    ]);

    const before = await ownedRows(LIVE_USER_IDS);
    const transaction = jest.spyOn(dataSource, 'transaction');
    try {
      const result = await service.apply(
        measurementFor(LIVE_USER_IDS),
        configFor(true),
      );
      expect(transaction).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.deactivationCount).toBe(LIVE_USER_IDS.length);
      expect(result.candidates).toEqual(LIVE_USER_IDS);
      expect(result.deactivated).toBe(0);
      expect(result.rolesDeactivated).toBe(0);
      expect(result.secretsDeactivated).toBe(0);
      expect(result.abortReason).toBeUndefined();
      expect(await ownedRows(LIVE_USER_IDS)).toEqual(before);
    } finally {
      transaction.mockRestore();
    }
  });
});
