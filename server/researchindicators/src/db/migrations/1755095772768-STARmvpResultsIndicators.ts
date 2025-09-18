import { MigrationInterface, QueryRunner } from 'typeorm';

export class STARmvpResultsIndicators1755095772768
  implements MigrationInterface
{
  name = 'STARmvpResultsIndicators1755095772768';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`project_indicators_results\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`result_id\` bigint NULL, \`indicator_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` ADD \`agreement_id\` varchar(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` CHANGE \`agreement_id\` \`agreement_id\` varchar(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators_results\` ADD CONSTRAINT \`FK_36dfa37c81df793f575b6002fce\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators_results\` ADD CONSTRAINT \`FK_39ae9dc77684d4c2b9157fb411f\` FOREIGN KEY (\`indicator_id\`) REFERENCES \`project_indicators\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`project_indicators_results\` DROP FOREIGN KEY \`FK_39ae9dc77684d4c2b9157fb411f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators_results\` DROP FOREIGN KEY \`FK_36dfa37c81df793f575b6002fce\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` CHANGE \`agreement_id\` \`agreement_id\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` DROP COLUMN \`agreement_id\``,
    );
    await queryRunner.query(`DROP TABLE \`project_indicators_results\``);
  }
}
