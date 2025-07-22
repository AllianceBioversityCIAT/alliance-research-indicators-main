import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResultSdgTable1752020144703 implements MigrationInterface {
  name = 'AddResultSdgTable1752020144703';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_sdgs\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_sdg_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`clarisa_sdg_id\` bigint NOT NULL, PRIMARY KEY (\`result_sdg_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_sdgs\` ADD CONSTRAINT \`FK_67827d5f61559d57fd76c78452d\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_sdgs\` ADD CONSTRAINT \`FK_e50d1b05127952b3873b3010c5f\` FOREIGN KEY (\`clarisa_sdg_id\`) REFERENCES \`clarisa_sdgs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_sdgs\` DROP FOREIGN KEY \`FK_e50d1b05127952b3873b3010c5f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_sdgs\` DROP FOREIGN KEY \`FK_67827d5f61559d57fd76c78452d\``,
    );
    await queryRunner.query(`DROP TABLE \`result_sdgs\``);
  }
}
