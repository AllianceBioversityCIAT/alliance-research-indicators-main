import { MigrationInterface, QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';
import { PORTFOLIO_2026_SDG_TARGET_CODES } from '../../domain/entities/result-sdg-targets/portfolio-2026-sdg-target-codes';

export class SeedPortfolio2026SdgTargetCodes1789900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO app_config (\`key\`, description, category, subcategory, json_value)
       SELECT ?, ?, ?, ?, CAST(? AS JSON)
       WHERE NOT EXISTS (SELECT 1 FROM app_config WHERE \`key\` = ?)`,
      [
        AppConfigKey.PORTFOLIO_2026_SDG_TARGET_CODES,
        'Clarisa SDG target codes offered on portfolio 2026 OICRs',
        'portfolio',
        'sdg',
        JSON.stringify([...PORTFOLIO_2026_SDG_TARGET_CODES]),
        AppConfigKey.PORTFOLIO_2026_SDG_TARGET_CODES,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?`, [
      AppConfigKey.PORTFOLIO_2026_SDG_TARGET_CODES,
    ]);
  }
}
