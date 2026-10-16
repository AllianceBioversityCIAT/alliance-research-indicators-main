import { MigrationInterface, QueryRunner } from 'typeorm';
import { readStaffCarnetColumnClause } from '../helpers/staff-carnet-column';

/**
 * Organizational Structure, delegates
 * (docs/specs/institutional-performance/organizational-structure, design
 * section 3.1, R-ORG-017, D-ORG-15, D-ORG-14).
 *
 * One current list per entry, NOT versioned, so the rows hang off `org_units`
 * (CASCADE, reachable only by a physical delete) and protect the staff row
 * (`staff_carnet` to `alliance_user_staff.carnet`, RESTRICT). A person appears
 * once per entry (`uq_org_unit_delegates_unit_staff`). `staff_carnet` takes
 * the character set and collation of the referenced staff column, as
 * `org_unit_versions` does.
 *
 * This file exports ONLY its migration class (D-ORG-14). `down` drops only
 * this table.
 */
export class CreateOrgUnitDelegates1791000000003 implements MigrationInterface {
  name = 'CreateOrgUnitDelegates1791000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const carnetClause = await readStaffCarnetColumnClause(queryRunner);

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`org_unit_delegates\``);
  }
}
