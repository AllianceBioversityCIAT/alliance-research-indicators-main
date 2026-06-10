import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIaReportSchema1781101247756 implements MigrationInterface {
  name = 'CreateIaReportSchema1781101247756';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`bulk_upload_processes\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`file_name\` text NOT NULL, \`ai_interaction_id\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`bulk_upload_results\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`bulk_upload_process_id\` bigint NOT NULL, \`result_id\` bigint NULL, \`missing_fields\` json NULL, \`manual_intervention_occurred\` tinyint NULL, \`suggested_status\` bigint NULL, \`final_status\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` ADD CONSTRAINT \`FK_8323e3f5f3b0414140c1b5d2f15\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` ADD CONSTRAINT \`FK_f467aec54d504951b0811cdd7c2\` FOREIGN KEY (\`bulk_upload_process_id\`) REFERENCES \`bulk_upload_processes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` DROP FOREIGN KEY \`FK_f467aec54d504951b0811cdd7c2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` DROP FOREIGN KEY \`FK_8323e3f5f3b0414140c1b5d2f15\``,
    );
    await queryRunner.query(`DROP TABLE \`bulk_upload_results\``);
    await queryRunner.query(`DROP TABLE \`bulk_upload_processes\``);
  }
}
