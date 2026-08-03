import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultReviewHistory1779190000009
  implements MigrationInterface
{
  name = 'CreateResultReviewHistory1779190000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_review_history\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`version_id\` bigint NULL,
        \`actor_user_id\` bigint NOT NULL,
        \`event_type\` varchar(50) NOT NULL,
        \`decision\` varchar(20) NULL,
        \`justification\` text NULL,
        \`payload_before\` json NULL,
        \`payload_after\` json NULL,
        INDEX \`idx_result_review_history_result_created\` (\`result_id\`, \`created_at\`),
        INDEX \`idx_result_review_history_event_type\` (\`event_type\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_review_history\` ADD CONSTRAINT \`fk_rrh_result\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_review_history\` DROP FOREIGN KEY \`fk_rrh_result\``,
    );
    await queryRunner.query(`DROP TABLE \`result_review_history\``);
  }
}
