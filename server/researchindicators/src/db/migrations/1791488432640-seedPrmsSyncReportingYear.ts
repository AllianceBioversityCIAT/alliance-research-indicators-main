import { MigrationInterface, QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';

const REPORTING_YEAR_DESCRIPTION =
  'Reporting year: PRMS sync, Pool Funding editing, ToC year, CLARISA projects phase';

/**
 * Seed the reporting-year row ARI_PRMS_SYNC.
 *
 * Uses INSERT IGNORE, not ON DUPLICATE KEY UPDATE, so a second run keeps
 * an admin edit such as simple_value 2030. The Clarisa phase seed
 * 1786738949211 overwrites on conflict on purpose; this row must not
 * (design D-11).
 */
export class SeedPrmsSyncReportingYear1791488432640
  implements MigrationInterface
{
  name = 'SeedPrmsSyncReportingYear1791488432640';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT IGNORE INTO app_config (\`key\`, simple_value, description, category, subcategory) VALUES (?, ?, ?, ?, ?)`,
      [
        AppConfigKey.ARI_PRMS_SYNC,
        '2026',
        REPORTING_YEAR_DESCRIPTION,
        'API',
        'PRMS',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?`, [
      AppConfigKey.ARI_PRMS_SYNC,
    ]);
  }
}
