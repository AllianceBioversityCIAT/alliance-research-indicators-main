import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultPrmsSyncLogTable1789479131116
  implements MigrationInterface
{
  name = 'CreateResultPrmsSyncLogTable1789479131116';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`result_prms_sync_log\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`attempt_number\` int NOT NULL,
        \`environment\` varchar(20) NOT NULL,
        \`prms_type\` varchar(50) NULL,
        \`outcome\` varchar(40) NOT NULL,
        \`http_status\` int NULL,
        \`request_id\` varchar(191) NULL,
        \`external_reference\` varchar(191) NULL,
        \`request_payload\` json NULL,
        \`response_body\` json NULL,
        \`failure_reason\` text NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_result_prms_sync_log_result\` (\`result_id\`),
        INDEX \`idx_result_prms_sync_log_request_id\` (\`request_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` ADD CONSTRAINT \`FK_result_prms_sync_log_result_id\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` DROP FOREIGN KEY \`FK_result_prms_sync_log_result_id\``,
    );

    await queryRunner.query(`DROP TABLE \`result_prms_sync_log\``);
  }
}
