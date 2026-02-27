import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateResultStatusWorkflowConfig1767896904041
  implements MigrationInterface
{
  name = 'UpdateResultStatusWorkflowConfig1767896904041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` ADD \`config\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` DROP COLUMN \`config\``,
    );
  }
}
