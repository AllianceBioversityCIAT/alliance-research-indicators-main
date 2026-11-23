import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, QueryRunner } from 'typeorm';
import { CreateOdsAdminRole1795000000000 } from '../src/db/migrations/1795000000000-createOdsAdminRole';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { createStfDataSource } from './support/strategy-framework-fixtures';

/**
 * ODS Admin role migration on the real scratch
 * (R-STF-013 AC.1, design §3.3, T-10).
 *
 * No user holds role 11 on this scratch (counted before the refusal case).
 * `down` / `up` therefore touch only this module's `sec_roles` row, and an
 * inactive `sec_user_roles` row this suite inserts and deletes. `afterAll`
 * runs `up` again if the row is missing.
 *
 * Scope (KZ-017): the five real foreign keys of this database are what
 * `down` counts. A schema that lacked those constraints would not prove
 * the refusal.
 */
describe('Strategy framework — ODS Admin role migration (T-10)', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  const migration = new CreateOdsAdminRole1795000000000();
  const roleId = SecRolesEnum.ODS_ADMIN;

  const roleCount = async (): Promise<number> => {
    const [row] = await dataSource.query(
      `SELECT COUNT(*) AS n FROM sec_roles WHERE sec_role_id = ? AND name = 'ODS Admin'`,
      [roleId],
    );
    return Number(row.n);
  };

  const holderCount = async (): Promise<number> => {
    const [row] = await dataSource.query(
      `SELECT COUNT(*) AS n FROM sec_user_roles WHERE role_id = ?`,
      [roleId],
    );
    return Number(row.n);
  };

  beforeAll(async () => {
    dataSource = await createStfDataSource('strategy-framework-role');
    runner = dataSource.createQueryRunner();
    await runner.connect();
    expect(await roleCount()).toBe(1);
    expect(await holderCount()).toBe(0);
  });

  afterAll(async () => {
    try {
      await dataSource?.query(
        `DELETE FROM sec_user_roles WHERE role_id = ? AND user_id = 1 AND is_active = 0`,
        [roleId],
      );
      if ((await roleCount()) !== 1) {
        await migration.up(runner);
      }
    } finally {
      await runner?.release();
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  it('up again adds nothing while the ODS Admin row is present', async () => {
    await migration.up(runner);
    expect(await roleCount()).toBe(1);
  });

  it('down refuses while an inactive sec_user_roles row holds 11, naming the count', async () => {
    const inserted = await dataSource.query(
      `INSERT INTO sec_user_roles (user_id, role_id, is_active) VALUES (1, ?, 0)`,
      [roleId],
    );
    const assignmentId = Number(inserted.insertId);
    try {
      const [stored] = await dataSource.query(
        `SELECT is_active AS active FROM sec_user_roles WHERE sec_user_role_id = ?`,
        [assignmentId],
      );
      expect(Number(stored.active)).toBe(0);
      await expect(migration.down(runner)).rejects.toThrow(
        /sec_user_roles has 1 row/,
      );
      expect(await roleCount()).toBe(1);
    } finally {
      await dataSource.query(
        `DELETE FROM sec_user_roles WHERE sec_user_role_id = ?`,
        [assignmentId],
      );
    }
  });

  it('down, up, and up again leave exactly one ODS Admin row', async () => {
    expect(await holderCount()).toBe(0);
    await migration.down(runner);
    expect(await roleCount()).toBe(0);
    await migration.up(runner);
    await migration.up(runner);
    expect(await roleCount()).toBe(1);
    const [row] = await dataSource.query(
      `SELECT name FROM sec_roles WHERE sec_role_id = ?`,
      [roleId],
    );
    expect(row.name).toBe('ODS Admin');
  });
});
