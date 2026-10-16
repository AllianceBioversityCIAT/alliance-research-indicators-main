import { QueryRunner } from 'typeorm';

/**
 * Character set and collation of `alliance_user_staff.carnet`, as the
 * `CHARACTER SET <cs> COLLATE <coll>` clause a referencing column must repeat.
 *
 * A string foreign key needs the SAME character set AND collation on both
 * sides, and the staff table is not owned by the Organizational Structure
 * module. It is utf8mb4 / utf8mb4_0900_ai_ci on the local database and
 * utf8mb3 in the committed Dev baseline (`src/db/baseline/baseline.sql`,
 * `alliance_user_staff`), so the clause is read from `information_schema` at
 * run time, both parts together, and never hard-coded (D-ORG-16).
 *
 * Lives OUTSIDE `src/db/migrations/**` on purpose: `orm.config.ts` loads every
 * exported function in that folder as a migration (D-ORG-14).
 */
export const readStaffCarnetColumnClause = async (
  queryRunner: QueryRunner,
): Promise<string> => {
  const rows: Array<{ charset: string | null; collation: string | null }> =
    await queryRunner.query(`
      SELECT CHARACTER_SET_NAME AS charset, COLLATION_NAME AS collation
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'alliance_user_staff'
        AND COLUMN_NAME = 'carnet'
    `);
  const { charset, collation } = rows[0] ?? {};
  const safe = /^[a-z0-9_]+$/i;
  if (!charset || !collation || !safe.test(charset) || !safe.test(collation)) {
    throw new Error(
      'alliance_user_staff.carnet not found: the staff table must exist before the org_unit tables that reference it',
    );
  }
  return `CHARACTER SET ${charset} COLLATE ${collation}`;
};
