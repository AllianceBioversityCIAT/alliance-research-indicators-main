// @akili-spec changes/agresso-staff-sec-users-sync (T-09 — the only tier that can evidence §3/§5)
import { dataSource } from '../../src/db/config/mysql/orm.test.config';
import { SecUserReconcilerRepository } from '../../src/domain/tools/agresso/staff/sec-user-reconciler.repository';
import { SecUserReconcilerService } from '../../src/domain/tools/agresso/staff/sec-user-reconciler.service';
import { AgressoStaffRawDto } from '../../src/domain/tools/agresso/staff/dto/agresso-staff-raw.dto';

/**
 * Fixture tier for the Agresso staff → `sec_users` reconciliation.
 *
 * **Why this file exists at all.** `npm test` has `rootDir: "src"` and NEVER collects
 * `test/fixtures/`, so a green unit suite is not evidence for a single DB-level claim in this spec
 * (`design.md` §10, KZ-017). Every done-check T-01…T-08 left unticked is a claim about what the
 * DATABASE does, and this is the only tier that can settle them. The unit tier asserts emitted SQL
 * and call arguments; here the statements actually execute.
 *
 * **Reserved band (FP-45 discipline, adapted).** The `results`-table band registry does not apply —
 * this spec touches `sec_users` / `sec_user_roles` / `app_secrets`, which no other fixture writes.
 * This file reserves the email domain **`@t09-agresso.test`** and the carnet prefix **`T09`**, and
 * every teardown is scoped to them. It never deletes a row it did not create, and it never issues
 * DDL (FP-51: an `ALTER` here bumps the table definition version and kills a sibling fixture with
 * `1412 ER_TABLE_DEF_CHANGED`, in the sibling, not here).
 *
 * `sec_roles` and `user_status` are FK targets and arrive EMPTY on this schema, so they are seeded
 * with `INSERT IGNORE` — idempotent across repeated runs on a warm schema.
 */
describe('Agresso staff reconciliation — fixture tier', () => {
  const EMAIL_DOMAIN = '@t09-agresso.test';
  const CARNET_PREFIX = 'T09';
  const CONTRIBUTOR = 3;
  const SYSTEM_ADMIN = 1;

  let repository: SecUserReconcilerRepository;
  let service: SecUserReconcilerService;

  function staff(over: Partial<AgressoStaffRawDto>): AgressoStaffRawDto {
    return {
      resourceId: `${CARNET_PREFIX}001`,
      firstName: 'First',
      lastName: 'Last',
      email: `first${EMAIL_DOMAIN}`,
      center: 'Alliance',
      status: 'Active',
      ...over,
    };
  }

  /** Rows this file owns, by construction. Never widen these predicates. */
  async function cleanOwnedRows(): Promise<void> {
    await dataSource.query(
      `DELETE sur FROM sec_user_roles sur
         JOIN sec_users su ON su.sec_user_id = sur.user_id
        WHERE su.email LIKE ?`,
      [`%${EMAIL_DOMAIN}`],
    );
    await dataSource.query(
      `DELETE FROM app_secrets WHERE app_secret_key LIKE ?`,
      [`${CARNET_PREFIX}%`],
    );
    await dataSource.query(`DELETE FROM sec_users WHERE email LIKE ?`, [
      `%${EMAIL_DOMAIN}`,
    ]);
  }

  async function seedUser(row: {
    email: string;
    carnet: string | null;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    lastLoginAt?: string | null;
  }): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO sec_users
         (first_name, last_name, email, carnet, status_id, is_active, last_login_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [
        row.firstName ?? 'Stale',
        row.lastName ?? 'Name',
        row.email,
        row.carnet,
        row.isActive ? 1 : 0,
        row.lastLoginAt ?? null,
      ],
    );
    return Number(result.insertId);
  }

  async function seedRole(
    userId: number,
    roleId: number,
    isActive: boolean,
  ): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO sec_user_roles (user_id, role_id, is_active) VALUES (?, ?, ?)`,
      [userId, roleId, isActive ? 1 : 0],
    );
    return Number(result.insertId);
  }

  const userRow = (id: number) =>
    dataSource
      .query(`SELECT * FROM sec_users WHERE sec_user_id = ?`, [id])
      .then((r: unknown[]) => r[0] as Record<string, unknown>);

  const rolesOf = (userId: number) =>
    dataSource.query(
      `SELECT sec_user_role_id, role_id, is_active FROM sec_user_roles
        WHERE user_id = ? ORDER BY sec_user_role_id`,
      [userId],
    );

  const usersByEmail = (email: string) =>
    dataSource.query(
      `SELECT sec_user_id, carnet, first_name, is_active FROM sec_users WHERE email = ?`,
      [email],
    );

  /** Drives the full pass exactly as `cloneAllAgressoStaff` does. */
  async function run(members: AgressoStaffRawDto[]) {
    const reconciliation = await service.reconcile(members);
    const outcome = await service.applyCreateAndGrant(reconciliation);
    return {
      reconciliation,
      outcome,
      summary: service.buildSummary(reconciliation, outcome, members.length),
    };
  }

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    // FK targets, ALL EMPTY on this schema: sec_users.status_id -> user_status,
    // sec_user_roles.role_id -> sec_roles, and sec_roles.focus_id -> sec_role_focus (NOT NULL,
    // no default — the chain is three deep and the innermost link is easy to miss).
    //
    // INSERT IGNORE keeps repeated runs idempotent on a warm schema, but FP-46 is explicit that it
    // ALSO downgrades FK / NOT NULL failures to silent warnings. That is not hypothetical here: the
    // first version of this seed omitted `focus_id`, INSERT IGNORE swallowed it, and eight tests
    // failed later with a bare FK error that named sec_user_roles — three tables away from the
    // actual cause. So every seed is VERIFIED below; a silent failure is turned back into a loud
    // one before a single test runs.
    await dataSource.query(
      `INSERT IGNORE INTO user_status (user_status_id, name) VALUES (1, 'Active')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO sec_role_focus (sec_role_focus_id, name) VALUES (1, 'T09 fixture focus')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO sec_roles (sec_role_id, name, focus_id) VALUES (?, 'SYSTEM_ADMIN', 1), (?, 'CONTRIBUTOR', 1)`,
      [SYSTEM_ADMIN, CONTRIBUTOR],
    );

    const [{ statuses }] = await dataSource.query(
      `SELECT COUNT(*) AS statuses FROM user_status WHERE user_status_id = 1`,
    );
    const [{ roles }] = await dataSource.query(
      `SELECT COUNT(*) AS roles FROM sec_roles WHERE sec_role_id IN (?, ?)`,
      [SYSTEM_ADMIN, CONTRIBUTOR],
    );
    if (Number(statuses) !== 1 || Number(roles) !== 2) {
      throw new Error(
        `T-09 seed failed silently (FP-46): user_status=${statuses}/1, sec_roles=${roles}/2. ` +
          `Every test below would fail with an unrelated FK error.`,
      );
    }
    repository = new SecUserReconcilerRepository(dataSource.manager);
    service = new SecUserReconcilerService(repository, dataSource);
  });

  beforeEach(cleanOwnedRows);

  afterAll(async () => {
    await cleanOwnedRows();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('T-01 — the bulk read (R-AGS-001, Judgment Day J-4)', () => {
    it('returns a seeded INACTIVE row, and returns is_active as a real boolean', async () => {
      // T-01's first done-check, carried here because it is a DATABASE claim: the unit tier could
      // only prove the emitted SQL had no WHERE clause, which is a proxy. Scoping this read to
      // active rows is J-4 — it makes R-AGS-007 unreachable and turns the pass into a duplicate
      // factory.
      const inactiveId = await seedUser({
        email: `dormant${EMAIL_DOMAIN}`,
        carnet: `${CARNET_PREFIX}900`,
        isActive: false,
      });

      const rows = await repository.findAllSecUsers();
      const found = rows.find((r) => r.sec_user_id === inactiveId);

      expect(found).toBeDefined();
      // The tinyint→boolean coercion T-01 attempt 2 added, now proven against a real driver rather
      // than against a mocked row. `0` would be falsy and pass a loose assertion; `toBe` will not.
      expect(found?.is_active).toBe(false);
    });
  });

  describe('T-03/T-05 — refresh and the SQL carnet guard (R-AGS-002)', () => {
    it('a stored non-empty carnet SURVIVES a conflicting payload value — proven in the database', async () => {
      const id = await seedUser({
        email: `keeper${EMAIL_DOMAIN}`,
        carnet: `${CARNET_PREFIX}12345`.slice(0, 10),
        isActive: true,
      });
      const storedBefore = (await userRow(id)).carnet;

      const { summary } = await run([
        staff({
          email: `keeper${EMAIL_DOMAIN}`,
          resourceId: `${CARNET_PREFIX}999`,
        }),
      ]);

      // The guard lives in SQL (`AND (carnet IS NULL OR TRIM(carnet) = '')`), which is the whole
      // point of design.md §5.4: in the WHERE clause a batch-building bug still cannot overwrite a
      // stored carnet, and only this tier can observe that from the database.
      expect((await userRow(id)).carnet).toBe(storedBefore);
      expect(summary.carnetConflicts).toBe(1);
    });

    it('backfills an empty carnet, and leaves email / status_id / is_active byte-identical', async () => {
      const id = await seedUser({
        email: `empty${EMAIL_DOMAIN}`,
        carnet: null,
        isActive: true,
      });
      const before = await userRow(id);

      await run([
        staff({
          email: `empty${EMAIL_DOMAIN}`,
          resourceId: `${CARNET_PREFIX}777`,
        }),
      ]);

      const after = await userRow(id);
      expect(after.carnet).toBe(`${CARNET_PREFIX}777`);
      // R-AGS-002 AC.4 — the columns this spec must never write.
      expect(after.email).toBe(before.email);
      expect(after.status_id).toBe(before.status_id);
      expect(after.is_active).toBe(before.is_active);
    });

    it('writes a 75-character first name TRUNCATED and the run COMPLETES (W-4, MySQL strict mode)', async () => {
      const id = await seedUser({
        email: `long${EMAIL_DOMAIN}`,
        carnet: `${CARNET_PREFIX}555`,
        isActive: true,
      });

      // Under strict mode an unhandled over-length value does not truncate — it ABORTS the whole
      // transaction. That is why R-AGS-002 truncates rather than rejects, and why "the run
      // completes" is half of this gate.
      const { summary } = await run([
        staff({ email: `long${EMAIL_DOMAIN}`, firstName: 'F'.repeat(75) }),
      ]);

      const after = await userRow(id);
      expect(after.first_name).toBe('F'.repeat(60));
      expect(summary.namesTruncated).toBe(1);
    });

    it('leaves an UNMATCHED account byte-identical, updated_at included (R-AGS-001 AC.3)', async () => {
      const untouchedId = await seedUser({
        email: `nobody${EMAIL_DOMAIN}`,
        carnet: `${CARNET_PREFIX}404`,
        isActive: true,
      });
      const before = await userRow(untouchedId);

      await run([staff({ email: `someone-else${EMAIL_DOMAIN}` })]);

      // `updated_at` carries `ON UPDATE CURRENT_TIMESTAMP(6)`, so ANY write to this row — even one
      // that changes no column value — would move it. That makes it the sharpest available probe
      // for "this spec has no unmatched-row write path at all".
      expect(await userRow(untouchedId)).toEqual(before);
    });
  });

  describe('T-04 — create, grant and idempotence (R-AGS-003, R-AGS-004, NFR-AGS-001)', () => {
    it('provisions a new hire with exactly ONE row and ONE active role_id = 3 row', async () => {
      const email = `newhire${EMAIL_DOMAIN}`;

      const { summary } = await run([
        staff({ email, resourceId: `${CARNET_PREFIX}100` }),
      ]);

      const users = await usersByEmail(email);
      expect(users).toHaveLength(1);
      expect(users[0].carnet).toBe(`${CARNET_PREFIX}100`);
      expect(users[0].is_active).toBe(1);

      const roles = await rolesOf(users[0].sec_user_id);
      expect(roles).toEqual([
        expect.objectContaining({ role_id: CONTRIBUTOR, is_active: 1 }),
      ]);
      expect(summary.created).toBe(1);
      expect(summary.rolesGranted).toBe(1);
      expect(summary.abortReason).toBeUndefined();
    });

    it('is IDEMPOTENT — a second run over the same payload adds no row and no second role', async () => {
      const email = `twice${EMAIL_DOMAIN}`;
      const member = staff({ email, resourceId: `${CARNET_PREFIX}200` });

      await run([member]);
      const afterFirst = await usersByEmail(email);
      const rolesAfterFirst = await rolesOf(afterFirst[0].sec_user_id);

      await run([member]);

      // NFR-AGS-001 exists because NEITHER table has the unique index that would enforce this —
      // `sec_users.email` and `sec_user_roles (user_id, role_id)` are both unconstrained, so
      // idempotence is entirely the code's job and only a real database can prove it.
      expect(await usersByEmail(email)).toHaveLength(1);
      expect(await rolesOf(afterFirst[0].sec_user_id)).toEqual(rolesAfterFirst);
    });

    it('grants NO role to a pre-existing account (R-AGS-004 AC.2)', async () => {
      const id = await seedUser({
        email: `existing${EMAIL_DOMAIN}`,
        carnet: `${CARNET_PREFIX}300`,
        isActive: true,
      });

      await run([staff({ email: `existing${EMAIL_DOMAIN}` })]);

      expect(await rolesOf(id)).toEqual([]);
    });
  });

  describe('T-06 — reactivation (R-AGS-007)', () => {
    it('a rehired employee keeps their ORIGINAL sec_user_id and gets role 3 back', async () => {
      const email = `rehire${EMAIL_DOMAIN}`;
      const originalId = await seedUser({
        email,
        carnet: `${CARNET_PREFIX}600`,
        isActive: false,
      });
      const roleRowId = await seedRole(originalId, CONTRIBUTOR, false);

      const { summary } = await run([staff({ email })]);

      const users = await usersByEmail(email);
      expect(users).toHaveLength(1);
      // AC.1: the id is retained, and with it every attribution row that references it.
      expect(users[0].sec_user_id).toBe(originalId);
      expect(users[0].is_active).toBe(1);
      expect(await rolesOf(originalId)).toEqual([
        { sec_user_role_id: roleRowId, role_id: CONTRIBUTOR, is_active: 1 },
      ]);
      expect(summary.reactivated).toBe(1);
      expect(summary.rolesReactivated).toBe(1);
      expect(summary.created).toBe(0);
    });

    it('(N-4) restores role 3 and leaves an inactive role_id = 1 row UNTOUCHED', async () => {
      const email = `admin-back${EMAIL_DOMAIN}`;
      const id = await seedUser({
        email,
        carnet: `${CARNET_PREFIX}601`,
        isActive: false,
      });
      // The admin row is seeded FIRST so it carries the LOWER sec_user_role_id — the exact shape
      // that makes a MIN() taken before filtering to role 3 restore SYSTEM_ADMIN.
      const adminRoleId = await seedRole(id, SYSTEM_ADMIN, false);
      const contributorRoleId = await seedRole(id, CONTRIBUTOR, false);
      expect(adminRoleId).toBeLessThan(contributorRoleId);

      const { summary } = await run([staff({ email })]);

      expect(await rolesOf(id)).toEqual([
        { sec_user_role_id: adminRoleId, role_id: SYSTEM_ADMIN, is_active: 0 },
        {
          sec_user_role_id: contributorRoleId,
          role_id: CONTRIBUTOR,
          is_active: 1,
        },
      ]);
      expect(summary.rolesLeftInactive).toEqual([
        { userId: id, roleId: SYSTEM_ADMIN },
      ]);
    });

    it('(M-2) flips exactly ONE of two inactive role_id = 3 rows', async () => {
      const email = `dup-roles${EMAIL_DOMAIN}`;
      const id = await seedUser({
        email,
        carnet: `${CARNET_PREFIX}602`,
        isActive: false,
      });
      const first = await seedRole(id, CONTRIBUTOR, false);
      const second = await seedRole(id, CONTRIBUTOR, false);

      await run([staff({ email })]);

      // `sec_user_roles` has NO unique index on (user_id, role_id), so the database will not stop
      // a duplicate active pair. Only the one-id-per-user UPDATE does.
      expect(await rolesOf(id)).toEqual([
        { sec_user_role_id: first, role_id: CONTRIBUTOR, is_active: 1 },
        { sec_user_role_id: second, role_id: CONTRIBUTOR, is_active: 0 },
      ]);
    });

    it('(AC.6) changes NO app_secrets row', async () => {
      const email = `secret-holder${EMAIL_DOMAIN}`;
      const id = await seedUser({
        email,
        carnet: `${CARNET_PREFIX}603`,
        isActive: false,
      });
      await seedRole(id, CONTRIBUTOR, false);
      await dataSource.query(
        `INSERT INTO app_secrets (app_secret_key, app_secret_uuid, responsible_user_id, is_active)
         VALUES (?, ?, ?, 0)`,
        [`${CARNET_PREFIX}-key`, `${CARNET_PREFIX}-uuid`, id],
      );
      const before = await dataSource.query(
        `SELECT * FROM app_secrets WHERE responsible_user_id = ?`,
        [id],
      );
      expect(before).toHaveLength(1);

      await run([staff({ email })]);

      // The unit tier could NOT prove this: its grep ran over a mocked manager that never sees
      // repository SQL, so it could not fail. Here the row exists and the account it belongs to is
      // genuinely reactivated — a machine credential must NOT come back with it.
      expect(
        await dataSource.query(
          `SELECT * FROM app_secrets WHERE responsible_user_id = ?`,
          [id],
        ),
      ).toEqual(before);
    });
  });

  describe('T-03 — the SQL guards, tested DIRECTLY against the repository', () => {
    // WHY THESE EXIST. Falsifying the N-4 guard through the service showed that removing
    // `AND role_id = 3` from the SQL left all 13 tests GREEN: the in-memory role-3 filter in
    // `roleBranches()` already prevents a non-contributor id from ever reaching the statement, so
    // the SQL predicate is unreachable from that direction. But design.md §5.4 wants it precisely
    // as DEFENCE IN DEPTH — "the predicate makes that unreachable in SQL rather than merely
    // unintended in TypeScript" — because the in-memory guard was once removed by the very
    // correction meant to harden it. A guard whose only test cannot fail is not a guard, so these
    // two call the repository DIRECTLY with the id list a future TypeScript bug would produce.

    it('refuses to reactivate a role_id = 1 row even when handed its id explicitly (N-4)', async () => {
      const id = await seedUser({
        email: `direct-n4${EMAIL_DOMAIN}`,
        carnet: `${CARNET_PREFIX}700`,
        isActive: false,
      });
      const adminRoleId = await seedRole(id, SYSTEM_ADMIN, false);

      // Exactly what a MIN() taken before filtering to role 3 would emit.
      await repository.reactivateContributorRoles(dataSource.manager, [
        adminRoleId,
      ]);

      expect(await rolesOf(id)).toEqual([
        { sec_user_role_id: adminRoleId, role_id: SYSTEM_ADMIN, is_active: 0 },
      ]);
    });

    it('refuses to overwrite a stored carnet even when handed a conflicting value explicitly', async () => {
      const id = await seedUser({
        email: `direct-carnet${EMAIL_DOMAIN}`,
        carnet: `${CARNET_PREFIX}800`,
        isActive: true,
      });

      // Exactly what a batch-building bug would produce: a row whose stored carnet is non-empty
      // included in the backfill batch anyway.
      await repository.backfillSecUserCarnets(dataSource.manager, [
        {
          secUserId: id,
          firstName: 'First',
          lastName: 'Last',
          carnet: `${CARNET_PREFIX}801`,
        },
      ]);

      expect((await userRow(id)).carnet).toBe(`${CARNET_PREFIX}800`);
    });
  });

  describe('NFR-AGS-002 — statement count is O(ceil(n / CHUNK)), not O(n)', () => {
    async function countStatements(n: number): Promise<number> {
      const emails = Array.from(
        { length: n },
        (_, i) => `bulk${i}${EMAIL_DOMAIN}`,
      );
      const members = emails.map((email, i) =>
        staff({ email, resourceId: `${CARNET_PREFIX}B${i}` }),
      );
      const spy = jest.spyOn(dataSource, 'query');
      const managerSpy = jest.spyOn(dataSource.manager, 'query');
      await run(members);
      const total = spy.mock.calls.length + managerSpy.mock.calls.length;
      spy.mockRestore();
      managerSpy.mockRestore();
      return total;
    }

    it('grows by CHUNK, not by member, at n = 50 and n = 120', async () => {
      const at50 = await countStatements(50);
      await cleanOwnedRows();
      const at120 = await countStatements(120);

      // The property is that the count does NOT scale with n. A per-member implementation would
      // add ~70 statements between these two sizes; a chunked one adds a handful.
      expect(at50).toBeLessThan(50);
      expect(at120).toBeLessThan(50);
      expect(at120 - at50).toBeLessThan(10);
    });
  });
});
