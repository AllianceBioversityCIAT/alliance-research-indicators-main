import { MigrationInterface, QueryRunner } from 'typeorm';
import { RolesFocusEnum } from '../../domain/shared/enum/roles-focus.enum';
import { SecRolesEnum } from '../../domain/shared/enum/sec_role.enum';

/**
 * Strategy framework, role row
 * (docs/specs/institutional-performance/strategy-framework, design
 * section 3.3, R-STF-013, D-STF-5).
 *
 * Inserts `ODS Admin` at `SecRolesEnum.ODS_ADMIN` when that id is free.
 * The same name already stored is a no-op. Any other name throws, because a
 * hand-made Dev row at this id would be overwritten by a blind insert (P-17).
 *
 * `down` counts every row whose column references `sec_roles.sec_role_id`,
 * including inactive assignments (an inactive row still blocks the FK).
 * The tables come from `information_schema`, not from a fixed list.
 * Assignments live in `sec_user_roles`, never `user_roles` (P-22).
 *
 * This file exports ONLY its migration class. The TypeORM loader treats
 * every exported function in `migrations/**` as a migration.
 */

const ODS_ADMIN_NAME = 'ODS Admin';
const ODS_ADMIN_DESCRIPTION =
  'Role for users who maintain the institutional strategy framework and its institutional objectives.';
const SAFE_IDENTIFIER = /^[a-z0-9_]+$/;

type RoleNameRow = { name: string };
type FkRefRow = { tableName: string; columnName: string };
type CountRow = { cnt: number | string };

export class CreateOdsAdminRole1795000000000 implements MigrationInterface {
  name = 'CreateOdsAdminRole1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: RoleNameRow[] = await queryRunner.query(
      `SELECT name FROM sec_roles WHERE sec_role_id = ?`,
      [SecRolesEnum.ODS_ADMIN],
    );
    const existing = rows[0];
    if (existing) {
      if (existing.name === ODS_ADMIN_NAME) {
        return;
      }
      throw new Error(
        `sec_roles.sec_role_id ${SecRolesEnum.ODS_ADMIN} is already '${existing.name}', not '${ODS_ADMIN_NAME}'`,
      );
    }

    await queryRunner.query(
      `INSERT INTO sec_roles (sec_role_id, name, focus_id, description, is_internal) VALUES (?, ?, ?, ?, ?)`,
      [
        SecRolesEnum.ODS_ADMIN,
        ODS_ADMIN_NAME,
        RolesFocusEnum.APPLICATION,
        ODS_ADMIN_DESCRIPTION,
        0,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const refs: FkRefRow[] = await queryRunner.query(
      `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
         AND REFERENCED_TABLE_NAME = ?
         AND REFERENCED_COLUMN_NAME = ?`,
      ['sec_roles', 'sec_role_id'],
    );

    const seen = new Set<string>();
    const blockers: string[] = [];
    for (const ref of refs) {
      const tableName = ref.tableName;
      const columnName = ref.columnName;
      const key = `${tableName}.${columnName}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      if (
        !SAFE_IDENTIFIER.test(tableName) ||
        !SAFE_IDENTIFIER.test(columnName)
      ) {
        throw new Error(
          `Refusing to count an unsafe identifier from information_schema: ${tableName}.${columnName}`,
        );
      }
      const counted: CountRow[] = await queryRunner.query(
        `SELECT COUNT(*) AS cnt FROM \`${tableName}\` WHERE \`${columnName}\` = ?`,
        [SecRolesEnum.ODS_ADMIN],
      );
      const count = Number(counted[0]?.cnt ?? 0);
      if (count > 0) {
        blockers.push(`${tableName} has ${count} row(s)`);
      }
    }

    if (blockers.length > 0) {
      throw new Error(
        `Cannot remove ODS Admin (sec_role_id ${SecRolesEnum.ODS_ADMIN}): ${blockers.join('; ')}`,
      );
    }

    await queryRunner.query(`DELETE FROM sec_roles WHERE sec_role_id = ?`, [
      SecRolesEnum.ODS_ADMIN,
    ]);
  }
}
