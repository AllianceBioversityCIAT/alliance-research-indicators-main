import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only history of inbound PRMS decision-webhook deliveries
 * (design.md section 4). `result_id` is nullable and has no foreign key
 * (P-2). `delivery_id` is nullable and not unique (DD-5).
 *
 * `correlation_outcome` and `decision` are varchar, never a MySQL ENUM.
 * `justification` is text NULL. The guard that refuses an empty string
 * lives in T-09; this column only has to permit both NULL and text.
 *
 * No backfill. No OpenSearch mapping.
 */
export class CreatePrmsWebhookDeliveryTable1790086170692
  implements MigrationInterface
{
  name = 'CreatePrmsWebhookDeliveryTable1790086170692';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`prms_webhook_delivery\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`delivery_id\` varchar(191) NULL,
        \`received_at\` timestamp NOT NULL,
        \`environment\` varchar(20) NOT NULL,
        \`correlation_outcome\` varchar(40) NOT NULL,
        \`result_id\` bigint NULL,
        \`external_reference\` varchar(191) NULL,
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
        PRIMARY KEY (\`id\`),
        INDEX \`idx_prms_webhook_delivery_delivery_id\` (\`delivery_id\`),
        INDEX \`idx_prms_webhook_delivery_result\` (\`result_id\`),
        INDEX \`idx_prms_webhook_delivery_received_at\` (\`received_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`prms_webhook_delivery\``);
  }
}
