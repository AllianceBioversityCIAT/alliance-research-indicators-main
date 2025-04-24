import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTempResultAiT1743459642528 implements MigrationInterface {
  name = 'CreateTempResultAiT1743459642528';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`temp_result_ai\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`processed_object\` json NOT NULL, \`raw_object\` json NOT NULL, \`result_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`temp_result_ai\` ADD CONSTRAINT \`FK_dccf8d98579bd84f0c299ac9fc3\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`temp_result_ai\` DROP FOREIGN KEY \`FK_dccf8d98579bd84f0c299ac9fc3\``,
    );
    await queryRunner.query(`DROP TABLE \`temp_result_ai\``);
  }
}
