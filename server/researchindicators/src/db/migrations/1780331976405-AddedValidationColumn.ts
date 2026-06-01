import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedValidationColumn1780331976405 implements MigrationInterface {
  name = 'AddedValidationColumn1780331976405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` ADD \`is_status_change_validation_required\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE \`result_status_workflow\` SET \`is_status_change_validation_required\` = 1 WHERE id IN (1, 6, 7, 12, 13, 18, 19, 24, 25, 30, 37)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` DROP COLUMN \`is_status_change_validation_required\``,
    );
  }
}
