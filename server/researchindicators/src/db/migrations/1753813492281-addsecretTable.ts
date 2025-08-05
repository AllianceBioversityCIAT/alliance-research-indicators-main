import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddsecretTable1753813492281 implements MigrationInterface {
  name = 'AddsecretTable1753813492281';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`app_secrets\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`app_secret_id\` bigint NOT NULL AUTO_INCREMENT, \`app_secret_key\` text NOT NULL, \`app_secret_uuid\` text NOT NULL, \`app_secret_description\` text NULL, PRIMARY KEY (\`app_secret_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`app_secret_host_list\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`app_secret_host_list_id\` bigint NOT NULL AUTO_INCREMENT, \`app_secret_id\` bigint NOT NULL, \`host\` text NOT NULL, PRIMARY KEY (\`app_secret_host_list_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_secret_host_list\` ADD CONSTRAINT \`FK_5bee4f9f93fbd7138320256a997\` FOREIGN KEY (\`app_secret_id\`) REFERENCES \`app_secrets\`(\`app_secret_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`app_secret_host_list\` DROP FOREIGN KEY \`FK_5bee4f9f93fbd7138320256a997\``,
    );
    await queryRunner.query(`DROP TABLE \`app_secret_host_list\``);
    await queryRunner.query(`DROP TABLE \`app_secrets\``);
  }
}
