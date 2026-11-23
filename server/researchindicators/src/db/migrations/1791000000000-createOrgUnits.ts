import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Organizational Structure, entry table
 * (docs/specs/institutional-performance/organizational-structure, design
 * section 3.1, R-ORG-001, R-ORG-002, D-ORG-1, D-ORG-14).
 *
 * `org_units` holds one row per entry: the PERMANENT id, the editable code
 * (unique, case-insensitive through the declared `utf8mb4_unicode_ci`
 * collation, so a deleted entry keeps owning its code), the lifecycle status
 * and the year it took effect, and the optional successor. The structure is
 * global: no `portfolio_id` column anywhere (R-ORG-001 AC.1).
 *
 * This file exports ONLY its migration class: the TypeORM loader treats every
 * exported function in `migrations/**` as a migration and rejects names
 * without a 13-digit timestamp (D-ORG-14). `down` drops only this table and
 * runs last (reverse order: delegates, log, versions, units).
 */
export class CreateOrgUnits1791000000000 implements MigrationInterface {
  name = 'CreateOrgUnits1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`org_units\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`code\` varchar(30) NOT NULL,
        \`status\` enum('active','inactive','deleted') NOT NULL DEFAULT 'active',
        \`status_from_year\` smallint NULL,
        \`successor_id\` bigint NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_org_units_code\` (\`code\`),
        INDEX \`idx_org_units_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`org_units\` ADD CONSTRAINT \`FK_org_units_successor_id\` FOREIGN KEY (\`successor_id\`) REFERENCES \`org_units\`(\`id\`) ON DELETE RESTRICT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`org_units\``);
  }
}
