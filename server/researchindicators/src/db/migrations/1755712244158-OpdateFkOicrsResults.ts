import { MigrationInterface, QueryRunner } from 'typeorm';

export class OpdateFkOicrsResults1755712244158 implements MigrationInterface {
  name = 'OpdateFkOicrsResults1755712244158';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_oicrs\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_id\` bigint NOT NULL COMMENT 'The unique identifier for the result', \`outcome_impact_statement\` text NULL COMMENT 'Elaboration of outcome/impact statement', \`general_comment\` text NOT NULL COMMENT 'General comment on the result', PRIMARY KEY (\`result_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD CONSTRAINT \`FK_3271a4f61ca7b4139e5a948ab73\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP FOREIGN KEY \`FK_3271a4f61ca7b4139e5a948ab73\``,
    );
    await queryRunner.query(`DROP TABLE \`result_oicrs\``);
  }
}
