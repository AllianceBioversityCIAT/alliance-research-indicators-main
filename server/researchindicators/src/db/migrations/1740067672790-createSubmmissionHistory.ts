import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubmmissionHistory1740067672790
  implements MigrationInterface
{
  name = 'CreateSubmmissionHistory1740067672790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`submission_history\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`submission_history_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`submission_status_id\` bigint NOT NULL, \`submission_comment\` text NULL, PRIMARY KEY (\`submission_history_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD CONSTRAINT \`FK_b27650ef8dae6ff5723619927a3\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD CONSTRAINT \`FK_0345ccf30661a59fddd3c1d13e3\` FOREIGN KEY (\`submission_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP FOREIGN KEY \`FK_0345ccf30661a59fddd3c1d13e3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP FOREIGN KEY \`FK_b27650ef8dae6ff5723619927a3\``,
    );
    await queryRunner.query(`DROP TABLE \`submission_history\``);
  }
}
