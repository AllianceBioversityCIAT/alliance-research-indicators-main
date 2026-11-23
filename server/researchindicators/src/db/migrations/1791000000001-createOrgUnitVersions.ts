import { MigrationInterface, QueryRunner } from 'typeorm';
import { readStaffCarnetColumnClause } from '../helpers/staff-carnet-column';

/**
 * Organizational Structure, version table
 * (docs/specs/institutional-performance/organizational-structure, design
 * section 3.1, R-ORG-004, R-ORG-016, D-ORG-1, D-ORG-9, D-ORG-14).
 *
 * One row per entry per start year, over the half-open range
 * `[valid_from_year, valid_to_year)`; `NULL` is open-ended. The unique index
 * `uq_org_unit_versions_unit_from` is the database backstop of NFR-ORG-002
 * (two versions of one entry cannot start in the same year). The level FK to
 * `control_list_values.id` and the director FK to `alliance_user_staff.carnet`
 * are RESTRICT; the entry FK is CASCADE (reachable only by a physical delete,
 * design 5.5) and the parent FK is RESTRICT.
 *
 * `director_carnet` must match the CHARACTER SET and the COLLATION of the
 * referenced staff column, which MySQL requires for a string foreign key. That
 * column is not owned by this module and differs by environment (utf8mb4 on
 * the local database, utf8mb3 in the Dev baseline), so both are read from
 * `information_schema` at run time (`../helpers/staff-carnet-column`, D-ORG-16).
 *
 * This file exports ONLY its migration class (D-ORG-14). `down` drops only
 * this table.
 */
export class CreateOrgUnitVersions1791000000001 implements MigrationInterface {
  name = 'CreateOrgUnitVersions1791000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const carnetClause = await readStaffCarnetColumnClause(queryRunner);

    await queryRunner.query(`
      CREATE TABLE \`org_unit_versions\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`org_unit_id\` bigint NOT NULL,
        \`valid_from_year\` smallint NOT NULL,
        \`valid_to_year\` smallint NULL,
        \`name\` varchar(255) NOT NULL,
        \`acronym\` varchar(50) NULL,
        \`level_value_id\` bigint NOT NULL,
        \`parent_id\` bigint NULL,
        \`director_carnet\` varchar(10) ${carnetClause} NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_org_unit_versions_unit_from\` (\`org_unit_id\`, \`valid_from_year\`),
        INDEX \`idx_org_unit_versions_years\` (\`valid_from_year\`, \`valid_to_year\`),
        INDEX \`idx_org_unit_versions_parent\` (\`parent_id\`),
        INDEX \`idx_org_unit_versions_level\` (\`level_value_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`org_unit_versions\` ADD CONSTRAINT \`FK_org_unit_versions_org_unit_id\` FOREIGN KEY (\`org_unit_id\`) REFERENCES \`org_units\`(\`id\`) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`org_unit_versions\` ADD CONSTRAINT \`FK_org_unit_versions_level_value_id\` FOREIGN KEY (\`level_value_id\`) REFERENCES \`control_list_values\`(\`id\`) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`org_unit_versions\` ADD CONSTRAINT \`FK_org_unit_versions_parent_id\` FOREIGN KEY (\`parent_id\`) REFERENCES \`org_units\`(\`id\`) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`org_unit_versions\` ADD CONSTRAINT \`FK_org_unit_versions_director_carnet\` FOREIGN KEY (\`director_carnet\`) REFERENCES \`alliance_user_staff\`(\`carnet\`) ON DELETE RESTRICT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`org_unit_versions\``);
  }
}
