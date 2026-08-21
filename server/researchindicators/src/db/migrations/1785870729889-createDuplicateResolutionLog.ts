import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-08 — audit table for cross-platform duplicate resolution.
 *
 * One row per resolved group per run. Under a hard delete the `participants`
 * payload is the only surviving trace of a deleted row, which is what makes
 * R-RES-003 AC.3 satisfiable and the reversion from soft delete acceptable.
 *
 * `winner_result_id`, `deciding_rule` and `deciding_result_id` are nullable by
 * design: `UNRESOLVED_CONFLICT` and same-platform-ambiguity groups have no single
 * winner and no deciding row, and `classification` + `reason` are the explanation
 * for those. Forcing a winner would mean inventing one.
 *
 * `group_key_hash` is indexed rather than the link itself: `results.public_link`
 * is TEXT, so a direct index would need a prefix length and still risk the InnoDB
 * key limit. The readable value stays in `normalized_public_link`.
 */
export class CreateDuplicateResolutionLog1785870729889
  implements MigrationInterface
{
  name = 'CreateDuplicateResolutionLog1785870729889';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`result_duplicate_resolution_log\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`run_id\` varchar(64) NOT NULL,
      \`source\` varchar(30) NOT NULL,
      \`mode\` varchar(20) NOT NULL,
      \`group_key_hash\` char(64) NOT NULL,
      \`normalized_public_link\` text NULL,
      \`participants\` json NOT NULL,
      \`classification\` varchar(40) NOT NULL,
      \`winner_result_id\` bigint NULL,
      \`deciding_rule\` varchar(40) NULL,
      \`deciding_result_id\` bigint NULL,
      \`outcomes\` json NULL,
      \`deleted_count\` int NOT NULL DEFAULT 0,
      \`protected_count\` int NOT NULL DEFAULT 0,
      \`failed_count\` int NOT NULL DEFAULT 0,
      \`noop_count\` int NOT NULL DEFAULT 0,
      \`hard_delete_enabled\` tinyint(1) NOT NULL DEFAULT 0,
      \`confirmation_digest\` varchar(64) NULL,
      \`reason\` text NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`created_by\` bigint NULL,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updated_by\` bigint NULL,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`deleted_at\` timestamp NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`idx_rdrl_run_id\` (\`run_id\`),
      INDEX \`idx_rdrl_group_key_hash\` (\`group_key_hash\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`result_duplicate_resolution_log\``,
    );
  }
}
