import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStatusHistory1772136672518 implements MigrationInterface {
  name = 'UpdateStatusHistory1772136672518';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`submission_history_log\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`submission_history_id\` bigint NOT NULL, \`new_date\` timestamp NULL, \`old_date\` timestamp NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD \`custom_date\` timestamp NULL DEFAULT CURRENT_TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP COLUMN \`custom_date\``,
    );
    await queryRunner.query(`DROP TABLE \`submission_history_log\``);
  }
}
