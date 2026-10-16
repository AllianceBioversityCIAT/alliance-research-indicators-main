import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  createOrgTestDataSource,
  OrgFixtures,
  ORG_FIXTURE_PREFIX,
} from './support/org-structure-fixtures';

/**
 * Organizational Structure, schema (docs/specs/institutional-performance/
 * organizational-structure, T-01: R-ORG-001 AC.1, R-ORG-004 AC.1, NFR-ORG-002
 * index half, design 3.1) against the REAL local MySQL, with migrations
 * `1791000000000-1791000000003` executed (`npm run migration:test:execute`).
 *
 * Scope note (KZ-017): this reads `information_schema` / `SHOW ...` of the
 * live database, so it proves what the migrations actually created. It does
 * not prove the migrations are re-runnable on a different server, nor `down`.
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

  it('has the four migrations recorded as executed', async () => {
    const rows = await dataSource.query(
      `SELECT name FROM migrations WHERE timestamp BETWEEN 1791000000000 AND 1791000000003 ORDER BY timestamp`,
    );
    expect(rows.map((r: { name: string }) => r.name)).toEqual([
      'CreateOrgUnits1791000000000',
      'CreateOrgUnitVersions1791000000001',
      'CreateOrgUnitChangeLog1791000000002',
      'CreateOrgUnitDelegates1791000000003',
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

    it('uq_org_unit_delegates_unit_staff is unique', async () => {
      expect(
        await nonUnique(
          'org_unit_delegates',
          'uq_org_unit_delegates_unit_staff',
        ),
      ).toEqual([0, 0]);
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

    it('a duplicate delegate pair fails with errno 1062', async () => {
      const staff = await fixtures.staff('DLG1', 'Dele', 'Gate', true);
      const unitId = await fixtures.unit('DLG_UNIT', [
        { from: 2026, to: null, name: 'Delegate probe' },
      ]);
      await fixtures.delegate(unitId, staff);

      await expect(fixtures.delegate(unitId, staff)).rejects.toMatchObject({
        driverError: { errno: 1062 },
      });
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
        FK_org_unit_delegates_org_unit_id: 'CASCADE',
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

    it('org_unit_delegates: staff FK is RESTRICT, entry FK is CASCADE, and the unique pair is declared', async () => {
      const ddl = await showCreate('org_unit_delegates');

      expect(ddl).toMatch(
        /FK_org_unit_delegates_staff_carnet` FOREIGN KEY \(`staff_carnet`\) REFERENCES `alliance_user_staff` \(`carnet`\) ON DELETE RESTRICT/,
      );
      expect(ddl).toMatch(
        /FK_org_unit_delegates_org_unit_id` FOREIGN KEY \(`org_unit_id`\) REFERENCES `org_units` \(`id`\) ON DELETE CASCADE/,
      );
      expect(ddl).toMatch(
        /UNIQUE KEY `uq_org_unit_delegates_unit_staff` \(`org_unit_id`,`staff_carnet`\)/,
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
