import { MigrationInterface, QueryRunner } from 'typeorm';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-05 / R-BIL-092, R-BIL-095
//
// New table `result_pool_funding_toc_alignment` (design §4): one row per
// (result, SP) capturing the per-SP ToC alignment answer plus upstream
// snapshot columns (R-BIL-095). `unit_messurament` keeps the upstream
// spelling verbatim (D-V2-4).
//
// Partial-unique "one ACTIVE row per (result, SP)" is enforced via a STORED
// GENERATED column that is non-NULL only while the row is active, plus a
// UNIQUE index on it — same pattern as `bilateral_project_mapping` (D-PI-9)
// and migration 1779190000014. Inactive rows have NULL there, and NULLs do
// not collide under MySQL unique-index semantics.
export class CreateResultPoolFundingTocAlignment1779190000015
  implements MigrationInterface
{
  name = 'CreateResultPoolFundingTocAlignment1779190000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_pool_funding_toc_alignment\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`sp_code\` varchar(50) NOT NULL,
        \`aligns_with_toc\` tinyint(1) NOT NULL,
        \`level\` varchar(10) NULL,
        \`toc_result_id\` int NULL,
        \`indicator_id\` int NULL,
        \`quantitative_contribution\` decimal(18,2) NULL,
        \`toc_result_title\` text NULL,
        \`indicator_description\` text NULL,
        \`unit_messurament\` varchar(100) NULL,
        \`target_value\` varchar(50) NULL,
        \`target_year\` int NULL,
        \`active_result_sp\` varchar(71)
          GENERATED ALWAYS AS (IF(\`is_active\` = 1, CONCAT(\`result_id\`, ':', \`sp_code\`), NULL)) STORED,
        UNIQUE INDEX \`idx_rpfta_active_result_sp\` (\`active_result_sp\`),
        INDEX \`idx_rpfta_result\` (\`result_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_toc_alignment\` ADD CONSTRAINT \`fk_rpfta_result\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_toc_alignment\` DROP FOREIGN KEY \`fk_rpfta_result\``,
    );
    await queryRunner.query(`DROP TABLE \`result_pool_funding_toc_alignment\``);
  }
}
