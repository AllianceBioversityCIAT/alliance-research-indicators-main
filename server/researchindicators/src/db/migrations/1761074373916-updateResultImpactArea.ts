import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateResultImpactArea1761074373916 implements MigrationInterface {
  name = 'UpdateResultImpactArea1761074373916';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` DROP FOREIGN KEY \`FK_d888a098be6ed482b954dab418d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` CHANGE \`impact_area_score_id\` \`impact_area_score_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` ADD CONSTRAINT \`FK_d888a098be6ed482b954dab418d\` FOREIGN KEY (\`impact_area_score_id\`) REFERENCES \`impact_area_scores\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` DROP FOREIGN KEY \`FK_d888a098be6ed482b954dab418d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` CHANGE \`impact_area_score_id\` \`impact_area_score_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` ADD CONSTRAINT \`FK_d888a098be6ed482b954dab418d\` FOREIGN KEY (\`impact_area_score_id\`) REFERENCES \`impact_area_scores\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
