import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultKp1764193570350 implements MigrationInterface {
  name = 'CreateResultKp1764193570350';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_knowledge_products\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_id\` bigint NOT NULL, \`type\` text NULL, \`citation\` text NULL, \`open_access\` tinyint NULL, \`publication_date\` text NULL, PRIMARY KEY (\`result_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_knowledge_products\` ADD CONSTRAINT \`FK_2bd6a097e02384fd99569150bf1\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_knowledge_products\` DROP FOREIGN KEY \`FK_2bd6a097e02384fd99569150bf1\``,
    );
    await queryRunner.query(`DROP TABLE \`result_knowledge_products\``);
  }
}
