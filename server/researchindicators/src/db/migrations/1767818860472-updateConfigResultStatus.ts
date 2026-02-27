import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateConfigResultStatus1767818860472
  implements MigrationInterface
{
  name = 'UpdateConfigResultStatus1767818860472';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status\` DROP COLUMN \`is_editable\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status\` ADD \`editable_roles\` json NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status\` ADD \`config\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status\` DROP COLUMN \`config\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status\` DROP COLUMN \`editable_roles\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status\` ADD \`is_editable\` tinyint NULL DEFAULT '1'`,
    );
  }
}
