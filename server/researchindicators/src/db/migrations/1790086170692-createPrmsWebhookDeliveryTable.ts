import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only synchronization HISTORY between STAR and PRMS
 * (design.md section 4, amended 2026-09-23 by the owner-approved Pivot —
 * see execution.md "Pivot Record: T-01"). Originally specified as an
 * inbound-only delivery log under the class's own former table name; it
 * now also records STAR's own successful outbound pushes
 * (`event_source = 'STAR'`), which PRMS never sends. `result_id` is
 * nullable and has no foreign key (P-2). `delivery_id` is nullable and
 * not unique (DD-5).
 *
 * Durable identity of the subject is the pair (`result_official_code`,
 * `result_year`) — the same pair `result_prms_sync_log` keeps (it names
 * the code column `external_reference`; this table names it for what it
 * holds, by owner decision of 2026-09-23). On an OUTBOUND row the value
 * IS our official code. On an INBOUND row it is whatever PRMS sent as its
 * reference, which may not be a valid code — `parseOfficialCode` validates
 * it and may classify the delivery `invalid`. The name does not promise
 * validity. Reason for the pair, because
 * overwriting a result version deletes `result_id` and a foreign key
 * would take the history with it. `result_id` stays as a convenience
 * pointer and still has no foreign key. `result_year` is MySQL YEAR
 * NULL, matching the log. An inbound PRMS delivery does not carry the
 * year, so that path stores NULL; the outbound PENDING_REVIEW path
 * copies `results.report_year_id`.
 *
 * `correlation_outcome` and `decision` are varchar, never a MySQL ENUM.
 * `justification` is text NULL. The guard that refuses an empty string
 * lives in T-09; this column only has to permit both NULL and text.
 *
 * `event_source` is the only NOT NULL addition — the discriminator that
 * keeps the two populations (`STAR` / `PRMS`) legible. The other six
 * added columns are nullable: `status`, `actor_user_id` (outbound only),
 * `reviewer_name` / `reviewer_role` / `science_program_code` (inbound
 * only), `changes` (JSON, shape not committed by PRMS).
 *
 * No backfill. No OpenSearch mapping.
 */
export class CreatePrmsWebhookDeliveryTable1790086170692
  implements MigrationInterface
{
  name = 'CreatePrmsWebhookDeliveryTable1790086170692';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`result_prms_sync_history\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`delivery_id\` varchar(191) NULL,
        \`occurred_at\` timestamp NOT NULL,
        \`environment\` varchar(20) NOT NULL,
        \`correlation_outcome\` varchar(40) NOT NULL,
        \`result_id\` bigint NULL,
        \`result_official_code\` varchar(191) NULL,
        \`result_year\` year NULL,
        \`prms_result_id\` bigint NULL,
        \`prms_result_code\` bigint NULL,
        \`decision\` varchar(20) NULL,
        \`justification\` text NULL,
        \`decided_at\` timestamp NULL,
        \`raw_body\` json NULL,
        \`raw_headers\` json NULL,
        \`processing_state\` varchar(20) NOT NULL,
        \`processing_error\` text NULL,
        \`duplicate_of_id\` bigint NULL,
        \`event_source\` varchar(10) NOT NULL,
        \`status\` varchar(30) NULL,
        \`actor_user_id\` bigint NULL,
        \`reviewer_name\` varchar(255) NULL,
        \`reviewer_role\` varchar(191) NULL,
        \`science_program_code\` varchar(20) NULL,
        \`changes\` json NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_result_prms_sync_history_delivery_id\` (\`delivery_id\`),
        INDEX \`idx_result_prms_sync_history_result\` (\`result_id\`),
        INDEX \`idx_result_prms_sync_history_occurred_at\` (\`occurred_at\`),
        INDEX \`idx_result_prms_sync_history_code_year\` (\`result_official_code\`, \`result_year\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`result_prms_sync_history\``);
  }
}
