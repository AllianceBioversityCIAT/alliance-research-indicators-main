import { MigrationInterface, QueryRunner } from 'typeorm';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 / R-BIL-079
//
// Creates the `bilateral_project_mapping` join table. Partial-unique on
// `(agresso_agreement_id) WHERE is_active = 1` is enforced via a STORED
// GENERATED column `active_agreement_id` + a UNIQUE index on it, per
// design decision D-PI-9. The generated column is intentionally NOT
// mapped on the TypeORM entity.
export class CreateBilateralProjectMapping1779190000011
  implements MigrationInterface
{
  name = 'CreateBilateralProjectMapping1779190000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`bilateral_project_mapping\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`agresso_agreement_id\` varchar(50) NOT NULL COMMENT 'FK-by-value to agresso_contract.agreement_id',
        \`clarisa_project_id\` int NOT NULL COMMENT 'Upstream CLARISA project.id',
        \`clarisa_project_short_name\` varchar(500) NULL COMMENT 'Snapshot at mapping time (D-PI-11)',
        \`source\` enum('MANUAL','AI_SUGGESTED','AI_AUTO') NOT NULL DEFAULT 'MANUAL',
        \`confidence_score\` float NULL COMMENT 'Populated only when source != MANUAL',
        \`notes\` text NULL,
        \`active_agreement_id\` varchar(50)
          GENERATED ALWAYS AS (IF(\`is_active\` = 1, \`agresso_agreement_id\`, NULL)) STORED
          COMMENT 'D-PI-9: emulates partial-unique on agresso_agreement_id WHERE is_active = 1',
        INDEX \`idx_bpm_agreement\` (\`agresso_agreement_id\`),
        INDEX \`idx_bpm_clarisa_project\` (\`clarisa_project_id\`),
        UNIQUE INDEX \`uk_bpm_active_agreement\` (\`active_agreement_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`bilateral_project_mapping\``);
  }
}
