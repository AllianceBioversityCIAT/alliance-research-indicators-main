import { MigrationInterface, QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';

export class CategorisePoolFundingFeatureToggles1790280318260
  implements MigrationInterface
{
  name = 'CategorisePoolFundingFeatureToggles1790280318260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE app_config SET category = ?, subcategory = ?, field = ? WHERE \`key\` = ?;`,
      ['FRONT', 'SECTIONS', null, AppConfigKey.POOL_FUNDING_SECTION_ENABLED],
    );

    await queryRunner.query(
      `UPDATE app_config SET category = ?, subcategory = ?, field = ? WHERE \`key\` = ?;`,
      [
        'FRONT',
        'SECTIONS',
        null,
        AppConfigKey.POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE app_config SET category = NULL, subcategory = NULL, field = NULL WHERE \`key\` = ?;`,
      [AppConfigKey.POOL_FUNDING_SECTION_ENABLED],
    );
    await queryRunner.query(
      `UPDATE app_config SET category = NULL, subcategory = NULL, field = NULL WHERE \`key\` = ?;`,
      [AppConfigKey.POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED],
    );
  }
}
