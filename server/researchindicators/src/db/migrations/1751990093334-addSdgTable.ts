import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSdgTable1751990093334 implements MigrationInterface {
  name = 'AddSdgTable1751990093334';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_sdgs\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL, \`smo_code\` bigint NULL, \`financial_code\` text NULL, \`short_name\` text NULL, \`full_name\` text NULL, \`icon\` text NULL, \`color\` text NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`sdgs\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`sdgs\``,
    );
    await queryRunner.query(`DROP TABLE \`clarisa_sdgs\``);
  }
}
