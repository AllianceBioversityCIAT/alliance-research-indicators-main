import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppConfigTable1752097721168 implements MigrationInterface {
  name = 'AddAppConfigTable1752097721168';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`app_config\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`key\` varchar(100) NOT NULL, \`description\` text NULL, \`simple_value\` text NULL, \`json_value\` json NULL, PRIMARY KEY (\`key\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`app_config\``);
  }
}
