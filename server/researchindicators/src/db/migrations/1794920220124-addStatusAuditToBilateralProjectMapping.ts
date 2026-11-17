import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds nullable status_changed_by and status_changed_at on
 * bilateral_project_mapping. Backfills status_changed_at from deleted_at
 * for inactive rows that already have an inactivation date, pinning
 * updated_at so ON UPDATE CURRENT_TIMESTAMP does not fire.
 * down drops both columns.
 */
export class AddStatusAuditToBilateralProjectMapping1794920220124
  implements MigrationInterface
{
  name = 'AddStatusAuditToBilateralProjectMapping1794920220124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD COLUMN \`status_changed_by\` bigint NULL COMMENT 'sec_user_id of the last status change. No FK.'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD COLUMN \`status_changed_at\` timestamp NULL COMMENT 'Date of the last status change.'`,
    );
    await queryRunner.query(
      `UPDATE \`bilateral_project_mapping\`
         SET \`status_changed_at\` = \`deleted_at\`,
             \`updated_at\` = \`updated_at\`
       WHERE \`is_active\` = 0
         AND \`deleted_at\` IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP COLUMN \`status_changed_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP COLUMN \`status_changed_by\``,
    );
  }
}
