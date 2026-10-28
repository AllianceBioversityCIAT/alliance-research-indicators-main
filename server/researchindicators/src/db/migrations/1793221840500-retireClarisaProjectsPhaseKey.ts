import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deactivate the retired CLARISA mapping-phase config row.
 * down sets is_active back to 1. The key column is backticked.
 */
export class RetireClarisaProjectsPhaseKey1793221840500
  implements MigrationInterface
{
  name = 'RetireClarisaProjectsPhaseKey1793221840500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE app_config SET is_active = 0 WHERE `key` = 'ARI_CLARISA_PROJECTS_PHASE'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE app_config SET is_active = 1 WHERE `key` = 'ARI_CLARISA_PROJECTS_PHASE'",
    );
  }
}
