import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  createOrgTestDataSource,
  OrgFixtures,
  ORG_FIXTURE_PREFIX,
} from './support/org-structure-fixtures';
import { VersionOrgUnitDelegates1791000000005 } from '../src/db/migrations/1791000000005-versionOrgUnitDelegates';

/**
 * Organizational Structure, schema (docs/specs/institutional-performance/
 * organizational-structure, T-01: R-ORG-001 AC.1, R-ORG-004 AC.1, NFR-ORG-002
 * index half, design 3.1; T-12: delegates keyed by version, D-ORG-24) against
 * the REAL local MySQL, with migrations `1791000000000-1791000000005` executed
 * (`npm run migration:test:execute`).
 *
 * Scope note (KZ-017): this reads `information_schema` / `SHOW ...` of the
 * live database, so it proves what the migrations actually created. It does
 * not prove the migrations are re-runnable on a different server. `up` / `down`
 * of `...005` are proven here only on their REFUSAL path (a row present throws
 * before any DDL, so the shared database is never altered by a test run); the
 * rebuild itself was executed once through the typeorm CLI (execution.md).
 * Evidence DB: the requester's local database (see `support/org-structure-
 * fixtures.ts`); the only rows written are `__T01_` fixtures, deleted in
 * `afterAll`.
 */
describe('Organizational Structure — schema on real MySQL (T-01)', () => {
  let dataSource: DataSource;
  let fixtures: OrgFixtures;

  const TABLES = [
    'org_units',
    'org_unit_versions',
    'org_unit_delegates',
    'org_unit_change_log',
  ];

  beforeAll(async () => {
    dataSource = await createOrgTestDataSource('org-structure-schema');
    fixtures = new OrgFixtures(dataSource);
  });

  afterAll(async () => {
    try {
      await fixtures?.cleanup();
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  const showCreate = async (table: string): Promise<string> => {
    const [row] = await dataSource.query(`SHOW CREATE TABLE \`${table}\``);
    return row['Create Table'] as string;
  };

  it('has the migrations recorded as executed, delegates re-keyed by 1791000000005', async () => {
    const rows = await dataSource.query(
      `SELECT name FROM migrations WHERE timestamp BETWEEN 1791000000000 AND 1791000000005 ORDER BY timestamp`,
    );
    expect(rows.map((r: { name: string }) => r.name)).toEqual([
      'CreateOrgUnits1791000000000',
      'CreateOrgUnitVersions1791000000001',
      'CreateOrgUnitChangeLog1791000000002',
      'CreateOrgUnitDelegates1791000000003',
      'SeedOrgStructure1791000000004',
      'VersionOrgUnitDelegates1791000000005',
    ]);
  });

  describe('R-ORG-001 AC.1: no portfolio anywhere', () => {
    it.each(TABLES)('%s has no portfolio_id column', async (table) => {
      const columns = await dataSource.query(
        `SHOW COLUMNS FROM \`${table}\` LIKE 'portfolio_id'`,
      );
      expect(columns).toEqual([]);
    });

    it.each(TABLES)(
      '%s has no column that mentions portfolio',
      async (table) => {
        const columns: Array<{ Field: string }> = await dataSource.query(
          `SHOW COLUMNS FROM \`${table}\``,
        );
        expect(columns.filter((c) => /portfolio/i.test(c.Field))).toEqual([]);
      },
    );
  });

  describe('indexes (NFR-ORG-002, R-ORG-004 AC.1)', () => {
    const nonUnique = async (table: string, key: string) => {
      const rows: Array<{ Non_unique: number | string }> =
        await dataSource.query(
          `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
          [key],
        );
      expect(rows.length).toBeGreaterThan(0);
      return rows.map((r) => Number(r.Non_unique));
    };

    it('uq_org_units_code is unique', async () => {
      expect(await nonUnique('org_units', 'uq_org_units_code')).toEqual([0]);
    });

    it('uq_org_unit_versions_unit_from is unique over (org_unit_id, valid_from_year)', async () => {
      expect(
        await nonUnique('org_unit_versions', 'uq_org_unit_versions_unit_from'),
      ).toEqual([0, 0]);
      const cols: Array<{ Column_name: string; Seq_in_index: number }> =
        await dataSource.query(
          `SHOW INDEX FROM org_unit_versions WHERE Key_name = 'uq_org_unit_versions_unit_from'`,
        );
      expect(
        cols
          .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
          .map((c) => c.Column_name),
      ).toEqual(['org_unit_id', 'valid_from_year']);
    });

    it('uq_org_unit_delegates_version_staff is unique over (org_unit_version_id, staff_carnet); the entry-keyed index is gone (D-ORG-24)', async () => {
      expect(
        await nonUnique(
          'org_unit_delegates',
          'uq_org_unit_delegates_version_staff',
        ),
      ).toEqual([0, 0]);
      const cols: Array<{ Column_name: string; Seq_in_index: number }> =
        await dataSource.query(
          `SHOW INDEX FROM org_unit_delegates WHERE Key_name = 'uq_org_unit_delegates_version_staff'`,
        );
      expect(
        cols
          .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
          .map((c) => c.Column_name),
      ).toEqual(['org_unit_version_id', 'staff_carnet']);
      const old = await dataSource.query(
        `SHOW INDEX FROM org_unit_delegates WHERE Key_name = 'uq_org_unit_delegates_unit_staff'`,
      );
      expect(old).toEqual([]);
    });

    it('org_unit_delegates has no org_unit_id column any more', async () => {
      const columns = await dataSource.query(
        `SHOW COLUMNS FROM org_unit_delegates LIKE 'org_unit_id'`,
      );
      expect(columns).toEqual([]);
    });

    it('carries the lookup indexes of design 3.1', async () => {
      await nonUnique('org_units', 'idx_org_units_status');
      await nonUnique('org_unit_versions', 'idx_org_unit_versions_years');
      await nonUnique('org_unit_versions', 'idx_org_unit_versions_parent');
      await nonUnique('org_unit_versions', 'idx_org_unit_versions_level');
      await nonUnique('org_unit_delegates', 'idx_org_unit_delegates_staff');
      await nonUnique(
        'org_unit_change_log',
        'idx_org_unit_change_log_unit_created',
      );
    });

    it('a raw duplicate (org_unit_id, valid_from_year) insert fails with errno 1062', async () => {
      const unitId = await fixtures.unit('DUP1', [
        { from: 2026, to: null, name: 'Duplicate probe' },
      ]);

      const attempt = fixtures.version(unitId, {
        from: 2026,
        to: 2030,
        name: 'Second version, same start year',
      });

      await expect(attempt).rejects.toMatchObject({
        driverError: { errno: 1062 },
      });
    });

    it('the unique code is case-insensitive and a duplicate fails with errno 1062 (R-ORG-002 backstop)', async () => {
      await fixtures.unit('CODE_CASE', [
        { from: 2026, to: null, name: 'Code owner' },
      ]);

      await expect(
        dataSource.query(`INSERT INTO org_units (code) VALUES (?)`, [
          `${ORG_FIXTURE_PREFIX}code_case`.toLowerCase(),
        ]),
      ).rejects.toMatchObject({ driverError: { errno: 1062 } });
    });

    it('a duplicate (version, carnet) pair fails with errno 1062; the same person in ANOTHER version is fine', async () => {
      const staff = await fixtures.staff('DLG1', 'Dele', 'Gate', true);
      const unitId = await fixtures.unit('DLG_UNIT', [
        { from: 2026, to: 2027, name: 'Delegate probe' },
      ]);
      const [first] = await dataSource.query(
        `SELECT id FROM org_unit_versions WHERE org_unit_id = ?`,
        [unitId],
      );
      await fixtures.delegate(Number(first.id), staff);

      await expect(
        fixtures.delegate(Number(first.id), staff),
      ).rejects.toMatchObject({ driverError: { errno: 1062 } });

      const secondId = await fixtures.version(unitId, {
        from: 2027,
        to: null,
        name: 'Second',
      });
      await expect(fixtures.delegate(secondId, staff)).resolves.toBeUndefined();
    });
  });

  describe('foreign keys and collation (design 3.1)', () => {
    it('org_unit_versions: level and director FKs are RESTRICT, entry FK is CASCADE, parent FK is RESTRICT', async () => {
      const ddl = await showCreate('org_unit_versions');

      expect(ddl).toMatch(
        /CONSTRAINT `FK_org_unit_versions_level_value_id` FOREIGN KEY \(`level_value_id`\) REFERENCES `control_list_values` \(`id`\) ON DELETE RESTRICT/,
      );
      expect(ddl).toMatch(
        /FK_org_unit_versions_director_carnet` FOREIGN KEY \(`director_carnet`\) REFERENCES `alliance_user_staff` \(`carnet`\) ON DELETE RESTRICT/,
      );
      expect(ddl).toMatch(
        /FK_org_unit_versions_org_unit_id` FOREIGN KEY \(`org_unit_id`\) REFERENCES `org_units` \(`id`\) ON DELETE CASCADE/,
      );
      expect(ddl).toMatch(
        /FK_org_unit_versions_parent_id` FOREIGN KEY \(`parent_id`\) REFERENCES `org_units` \(`id`\) ON DELETE RESTRICT/,
      );
    });

    it('the RESTRICT FKs actually refuse the delete (referential action, not just DDL text)', async () => {
      const rules: Array<{ CONSTRAINT_NAME: string; DELETE_RULE: string }> =
        await dataSource.query(
          `SELECT CONSTRAINT_NAME, DELETE_RULE
             FROM information_schema.REFERENTIAL_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE()
              AND CONSTRAINT_NAME IN (
                'FK_org_unit_versions_level_value_id',
                'FK_org_unit_versions_director_carnet',
                'FK_org_unit_versions_parent_id',
                'FK_org_unit_versions_org_unit_id',
                'FK_org_unit_delegates_staff_carnet',
                'FK_org_unit_delegates_org_unit_version_id',
                'FK_org_unit_delegates_org_unit_id',
                'FK_org_units_successor_id')`,
        );
      const byName = Object.fromEntries(
        rules.map((r) => [r.CONSTRAINT_NAME, r.DELETE_RULE]),
      );
      expect(byName).toEqual({
        FK_org_unit_versions_level_value_id: 'RESTRICT',
        FK_org_unit_versions_director_carnet: 'RESTRICT',
        FK_org_unit_versions_parent_id: 'RESTRICT',
        FK_org_unit_versions_org_unit_id: 'CASCADE',
        FK_org_unit_delegates_staff_carnet: 'RESTRICT',
        FK_org_unit_delegates_org_unit_version_id: 'CASCADE',
        FK_org_units_successor_id: 'RESTRICT',
      });
    });

    it('deleting a staff row that is a director is refused (errno 1451)', async () => {
      const staff = await fixtures.staff('DIR1', 'Dir', 'Ector', true);
      await fixtures.unit('DIR_UNIT', [
        { from: 2026, to: null, name: 'Has director', directorCarnet: staff },
      ]);

      await expect(
        dataSource.query(`DELETE FROM alliance_user_staff WHERE carnet = ?`, [
          staff,
        ]),
      ).rejects.toMatchObject({ driverError: { errno: 1451 } });
    });

    it('org_unit_delegates: staff FK is RESTRICT, VERSION FK is CASCADE, the unique pair is declared and no entry column or entry FK remains (D-ORG-24)', async () => {
      const ddl = await showCreate('org_unit_delegates');

      expect(ddl).toMatch(
        /FK_org_unit_delegates_staff_carnet` FOREIGN KEY \(`staff_carnet`\) REFERENCES `alliance_user_staff` \(`carnet`\) ON DELETE RESTRICT/,
      );
      expect(ddl).toMatch(
        /FK_org_unit_delegates_org_unit_version_id` FOREIGN KEY \(`org_unit_version_id`\) REFERENCES `org_unit_versions` \(`id`\) ON DELETE CASCADE/,
      );
      expect(ddl).toMatch(
        /UNIQUE KEY `uq_org_unit_delegates_version_staff` \(`org_unit_version_id`,`staff_carnet`\)/,
      );
      expect(ddl).not.toMatch(/org_unit_id/);
    });

    it('deleting a version removes its delegate rows through the CASCADE and leaves another version of the entry alone', async () => {
      const staff = await fixtures.staff('CAS1', 'Cas', 'Cade', true);
      const unitId = await fixtures.unit('CAS_UNIT', []);
      const keep = await fixtures.version(unitId, {
        from: 2026,
        to: 2027,
        name: 'Keep',
        delegates: [staff],
      });
      const drop = await fixtures.version(unitId, {
        from: 2027,
        to: null,
        name: 'Drop',
        delegates: [staff],
      });

      await dataSource.query(`DELETE FROM org_unit_versions WHERE id = ?`, [
        drop,
      ]);

      const left: Array<{ org_unit_version_id: string }> =
        await dataSource.query(
          `SELECT org_unit_version_id FROM org_unit_delegates WHERE staff_carnet = ?`,
          [staff],
        );
      expect(left.map((r) => Number(r.org_unit_version_id))).toEqual([keep]);
    });

    describe('1791000000005 refuses while delegate rows exist (P-15), before any DDL', () => {
      const stripAutoIncrement = (ddl: string) =>
        ddl.replace(/AUTO_INCREMENT=\d+ /, '');

      it.each(['up', 'down'] as const)(
        '%s throws naming the row count and leaves the table definition untouched',
        async (direction) => {
          // Carnets are varchar(10): prefix (6) + at most 4 characters.
          const staff = await fixtures.staff(
            `RF${direction === 'up' ? 'U' : 'D'}`,
            'Re',
            'Fuse',
            true,
          );
          const unitId = await fixtures.unit(`REF_${direction}`, [
            { from: 2026, to: null, name: 'Refuse', delegates: [staff] },
          ]);
          expect(unitId).toBeGreaterThan(0);
          const before = stripAutoIncrement(
            await showCreate('org_unit_delegates'),
          );
          // The migration gets a PROXY runner: only the guard's own
          // `SELECT COUNT(*)` reaches the real database; any other statement
          // (the charset read, DROP, CREATE, ALTER) is recorded and refused, so
          // this test can never alter the shared table, even if the guard is
          // loosened by a regression.
          const realRunner = dataSource.createQueryRunner();
          const refused: string[] = [];
          const proxy = new Proxy(realRunner, {
            get: (target, prop) =>
              prop === 'query'
                ? async (sql: string, params?: unknown[]) => {
                    if (
                      /^\s*SELECT COUNT\(\*\) AS total FROM `org_unit_delegates`\s*$/i.test(
                        sql,
                      )
                    ) {
                      return target.query(sql, params);
                    }
                    refused.push(sql.trim().split(/\s+/).slice(0, 4).join(' '));
                    throw new Error(`proxy refused statement: ${sql.trim()}`);
                  }
                : Reflect.get(target, prop),
          });
          let failure: Error | undefined;
          try {
            await new VersionOrgUnitDelegates1791000000005()[direction](
              proxy as typeof realRunner,
            );
          } catch (error) {
            failure = error as Error;
          } finally {
            await realRunner.release();
          }
          // Nothing but the count was attempted, and the guard is what threw.
          expect(refused).toEqual([]);
          expect(failure?.message).toMatch(
            /org_unit_delegates holds \d+ row\(s\)/,
          );
          expect(
            stripAutoIncrement(await showCreate('org_unit_delegates')),
          ).toBe(before);
        },
      );
    });

    it('org_unit_change_log has no foreign key (it survives a physical delete)', async () => {
      const ddl = await showCreate('org_unit_change_log');
      expect(ddl).not.toMatch(/FOREIGN KEY/);
      expect(ddl).not.toMatch(/CONSTRAINT/);
    });

    it.each(TABLES)('%s is utf8mb4 / utf8mb4_unicode_ci', async (table) => {
      const ddl = await showCreate(table);
      expect(ddl).toMatch(/DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci/);
    });

    it('the staff-carnet columns take the character set AND collation of the referenced staff column', async () => {
      const rows: Array<{
        TABLE_NAME: string;
        COLUMN_NAME: string;
        CHARACTER_SET_NAME: string;
        COLLATION_NAME: string;
      }> = await dataSource.query(
        `SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND ((TABLE_NAME = 'alliance_user_staff' AND COLUMN_NAME = 'carnet')
              OR (TABLE_NAME = 'org_unit_versions' AND COLUMN_NAME = 'director_carnet')
              OR (TABLE_NAME = 'org_unit_delegates' AND COLUMN_NAME = 'staff_carnet'))`,
      );
      expect(rows).toHaveLength(3);
      expect(
        new Set(rows.map((r) => `${r.CHARACTER_SET_NAME}/${r.COLLATION_NAME}`))
          .size,
      ).toBe(1);
    });
  });
});
