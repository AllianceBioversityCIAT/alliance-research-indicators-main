import { MigrationInterface, QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';

export class SeedOicrReportingYear1790686350000 implements MigrationInterface {
  name = 'SeedOicrReportingYear1790686350000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO app_config (\`key\`, description, simple_value, json_value, category, subcategory, field) VALUES (?, ?, ?, NULL, ?, ?, NULL);`,
      [
        AppConfigKey.OICR_REPORTING_YEAR,
        'Reporting year offered (and preselected) when an OICR is created from the Create Result modal.',
        '2026',
        'FRONT',
        'SECTIONS',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?;`, [
      AppConfigKey.OICR_REPORTING_YEAR,
    ]);
  }
}
