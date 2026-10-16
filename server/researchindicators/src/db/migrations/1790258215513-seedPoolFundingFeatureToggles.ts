import { MigrationInterface, QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';

export class SeedPoolFundingFeatureToggles1790258215513
  implements MigrationInterface
{
  name = 'SeedPoolFundingFeatureToggles1790258215513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO app_config (\`key\`, description, simple_value, json_value, category, subcategory, field) VALUES (?, ?, ?, NULL, NULL, NULL, NULL);`,
      [
        AppConfigKey.POOL_FUNDING_SECTION_ENABLED,
        'false hides the Pool Funding Alignment section. true defers to the existing visibility rules.',
        'true',
      ],
    );

    await queryRunner.query(
      `INSERT INTO app_config (\`key\`, description, simple_value, json_value, category, subcategory, field) VALUES (?, ?, ?, NULL, NULL, NULL, NULL);`,
      [
        AppConfigKey.POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED,
        'false hides only the PRMS SYNC button.',
        'true',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?;`, [
      AppConfigKey.POOL_FUNDING_SECTION_ENABLED,
    ]);
    await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?;`, [
      AppConfigKey.POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED,
    ]);
  }
}
