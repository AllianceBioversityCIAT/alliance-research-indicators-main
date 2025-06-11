import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultInnovationDevTable1749603152180
  implements MigrationInterface
{
  name = 'CreateResultInnovationDevTable1749603152180';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_innovation_dev\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_id\` bigint NOT NULL, \`short_title\` text NULL, \`innovation_nature_id\` bigint NULL, \`innovation_type_id\` bigint NULL, \`innovation_readiness_id\` bigint NULL, PRIMARY KEY (\`result_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_5381d276b900985283614831fb5\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP FOREIGN KEY \`FK_5381d276b900985283614831fb5\``,
    );
    await queryRunner.query(`DROP TABLE \`result_innovation_dev\``);
  }
}
