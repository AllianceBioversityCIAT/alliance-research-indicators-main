import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationReadinessExplanation1758035765432
  implements MigrationInterface
{
  name = 'InnovationReadinessExplanation1758035765432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`innovation_readiness_explanation\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`innovation_readiness_explanation\``,
    );
  }
}
