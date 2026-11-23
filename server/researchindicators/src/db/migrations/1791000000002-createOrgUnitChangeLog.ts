import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Organizational Structure, change log
 * (docs/specs/institutional-performance/organizational-structure, design
 * section 3.1, R-ORG-009, NFR-ORG-003, D-ORG-5, D-ORG-14).
 *
 * Append-only: one row per write action, never updated. `org_unit_id` is a
 * plain bigint with NO foreign key on purpose, so the log survives a physical
 * delete of its entry. `created_by` / `created_at` are the who and when of
 * R-ORG-009; the `updated_*` columns stay null.
 *
 * This file exports ONLY its migration class (D-ORG-14). `down` drops only
 * this table.
 */
export class CreateOrgUnitChangeLog1791000000002 implements MigrationInterface {
  name = 'CreateOrgUnitChangeLog1791000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`org_unit_change_log\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`org_unit_id\` bigint NOT NULL,
        \`action\` enum('seed','create','edit_in_place','new_version','inactivate','reactivate','delete_logical','delete_physical','code_change','delegates_change') NOT NULL,
        \`applies_from_year\` smallint NULL,
        \`backdated\` tinyint NOT NULL DEFAULT 0,
        \`changes\` json NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_org_unit_change_log_unit_created\` (\`org_unit_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`org_unit_change_log\``);
  }
}
