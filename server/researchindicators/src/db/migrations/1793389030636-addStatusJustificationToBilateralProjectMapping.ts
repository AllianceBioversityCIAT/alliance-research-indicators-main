import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds nullable status_justification on bilateral_project_mapping.
 * down drops the column. No backfill. No bind placeholders in the SQL.
 */
export class AddStatusJustificationToBilateralProjectMapping1793389030636
  implements MigrationInterface
{
  name = 'AddStatusJustificationToBilateralProjectMapping1793389030636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD COLUMN \`status_justification\` text NULL COMMENT 'Last inactivation justification. Overwritten on each deactivate. Independent of notes.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP COLUMN \`status_justification\``,
    );
  }
}
