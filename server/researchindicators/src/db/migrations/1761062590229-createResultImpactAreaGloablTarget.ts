import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultImpactAreaGloablTarget1761062590229
  implements MigrationInterface
{
  name = 'CreateResultImpactAreaGloablTarget1761062590229';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_impact_area_global_target\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_impact_area_id\` bigint NOT NULL, \`global_target_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_area_global_target\` ADD CONSTRAINT \`FK_6560140b60d32df58a61a6deeb5\` FOREIGN KEY (\`result_impact_area_id\`) REFERENCES \`result_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_area_global_target\` ADD CONSTRAINT \`FK_f770728be77c77da500192dbec7\` FOREIGN KEY (\`global_target_id\`) REFERENCES \`clarisa_global_targets\`(\`targetId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_impact_area_global_target\` DROP FOREIGN KEY \`FK_f770728be77c77da500192dbec7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_area_global_target\` DROP FOREIGN KEY \`FK_6560140b60d32df58a61a6deeb5\``,
    );
    await queryRunner.query(`DROP TABLE \`result_impact_area_global_target\``);
  }
}
