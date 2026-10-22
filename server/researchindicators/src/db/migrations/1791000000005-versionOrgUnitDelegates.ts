import { MigrationInterface, QueryRunner } from 'typeorm';
import { readStaffCarnetColumnClause } from '../helpers/staff-carnet-column';

/**
 * Organizational Structure, delegates versioned per year
 * (docs/specs/institutional-performance/organizational-structure, design
 * section 3.3, D-ORG-24, P-15, D-ORG-16, D-ORG-14).
 *
 * `1791000000003` keyed `org_unit_delegates` to the entry (one current list).
 * Delegates are now a field of each VERSION, like the director, so the rows hang
 * off `org_unit_versions` (`org_unit_version_id`, CASCADE: they live and die
 * with their version) and a person appears once per version
 * (`uq_org_unit_delegates_version_staff`). `1791000000003` stays as written
 * (append-only); this migration rebuilds the table.
 *
 * The table holds no rows in any environment (the seed inserts none), so it is
 * dropped and re-created rather than altered. There is NO lossless mapping from
 * an entry list to per-version lists that a migration could choose on the
 * admin's behalf, so when rows exist `up` AND `down` refuse and throw the
 * count, and discard nothing. `staff_carnet` keeps the character set and
 * collation of the referenced staff column, read at run time (D-ORG-16).
 *
 * This file exports ONLY its migration class (D-ORG-14). No SQL in it holds a
 * question mark or a colon-word, comments included (named placeholders are
 * on: see the server guide, persistence rules).
 */
export class VersionOrgUnitDelegates1791000000005
  implements MigrationInterface
{
  name = 'VersionOrgUnitDelegates1791000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.refuseWhenRowsExist(queryRunner, 'up');
    const carnetClause = await readStaffCarnetColumnClause(queryRunner);

    await queryRunner.query(`DROP TABLE \`org_unit_delegates\``);
    await queryRunner.query(`
      CREATE TABLE \`org_unit_delegates\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`org_unit_version_id\` bigint NOT NULL,
        \`staff_carnet\` varchar(10) ${carnetClause} NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_org_unit_delegates_version_staff\` (\`org_unit_version_id\`, \`staff_carnet\`),
        INDEX \`idx_org_unit_delegates_staff\` (\`staff_carnet\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      `ALTER TABLE \`org_unit_delegates\` ADD CONSTRAINT \`FK_org_unit_delegates_org_unit_version_id\` FOREIGN KEY (\`org_unit_version_id\`) REFERENCES \`org_unit_versions\`(\`id\`) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`org_unit_delegates\` ADD CONSTRAINT \`FK_org_unit_delegates_staff_carnet\` FOREIGN KEY (\`staff_carnet\`) REFERENCES \`alliance_user_staff\`(\`carnet\`) ON DELETE RESTRICT`,
    );
  }

  /**
   * Restores the exact `1791000000003` shape. Lossless only while the table is
   * empty: with rows it refuses instead of collapsing per-version lists into one.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.refuseWhenRowsExist(queryRunner, 'down');
    const carnetClause = await readStaffCarnetColumnClause(queryRunner);

    await queryRunner.query(`DROP TABLE \`org_unit_delegates\``);
    await queryRunner.query(`
      CREATE TABLE \`org_unit_delegates\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`org_unit_id\` bigint NOT NULL,
        \`staff_carnet\` varchar(10) ${carnetClause} NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_org_unit_delegates_unit_staff\` (\`org_unit_id\`, \`staff_carnet\`),
        INDEX \`idx_org_unit_delegates_staff\` (\`staff_carnet\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      `ALTER TABLE \`org_unit_delegates\` ADD CONSTRAINT \`FK_org_unit_delegates_org_unit_id\` FOREIGN KEY (\`org_unit_id\`) REFERENCES \`org_units\`(\`id\`) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`org_unit_delegates\` ADD CONSTRAINT \`FK_org_unit_delegates_staff_carnet\` FOREIGN KEY (\`staff_carnet\`) REFERENCES \`alliance_user_staff\`(\`carnet\`) ON DELETE RESTRICT`,
    );
  }

  /** Throws, naming the row count, before any DDL runs (P-15). */
  private async refuseWhenRowsExist(
    queryRunner: QueryRunner,
    direction: 'up' | 'down',
  ): Promise<void> {
    const rows: Array<{ total: number | string }> = await queryRunner.query(
      `SELECT COUNT(*) AS total FROM \`org_unit_delegates\``,
    );
    const total = Number(rows[0]?.total ?? 0);
    if (total > 0) {
      throw new Error(
        `Migration ${direction} refused: org_unit_delegates holds ${total} row(s). Re-keying delegates from the entry to the version has no lossless mapping, so the migration discards nothing. Clear or migrate those rows deliberately, then run it again.`,
      );
    }
  }
}
