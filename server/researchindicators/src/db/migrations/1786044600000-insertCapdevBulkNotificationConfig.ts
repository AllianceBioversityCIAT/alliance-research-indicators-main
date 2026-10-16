import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  AppConfigCategory,
  AppConfigField,
  AppConfigSubcategory,
} from '../../domain/entities/app-config/enum/app-config-catergory.enum';

const ENABLED_KEY = [
  AppConfigCategory.EMAIL,
  AppConfigSubcategory.CAPDEV_BULK_UPLOAD,
  AppConfigField.ENABLED,
].join('.');

const CC_EMAIL_KEY = [
  AppConfigCategory.EMAIL,
  AppConfigSubcategory.CAPDEV_BULK_UPLOAD,
  AppConfigField.CC_EMAIL,
].join('.');

export class InsertCapdevBulkNotificationConfig1786044600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO app_config (\`key\`, \`description\`, \`category\`, \`subcategory\`, \`field\`, \`simple_value\`) VALUES (?, ?, ?, ?, ?, ?);`,
      [
        ENABLED_KEY,
        'Kill switch for the CapDev bulk-upload completion email. Seeded off — set to true to enable. Absent or unreadable resolves to disabled.',
        AppConfigCategory.EMAIL,
        AppConfigSubcategory.CAPDEV_BULK_UPLOAD,
        AppConfigField.ENABLED,
        'false',
      ],
    );

    await queryRunner.query(
      `INSERT INTO app_config (\`key\`, \`description\`, \`category\`, \`subcategory\`, \`field\`, \`simple_value\`) VALUES (?, ?, ?, ?, ?, ?);`,
      [
        CC_EMAIL_KEY,
        'Comma-separated list of additional stakeholders to CC on the CapDev bulk-upload completion email.',
        AppConfigCategory.EMAIL,
        AppConfigSubcategory.CAPDEV_BULK_UPLOAD,
        AppConfigField.CC_EMAIL,
        '',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?;`, [
      ENABLED_KEY,
    ]);

    await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?;`, [
      CC_EMAIL_KEY,
    ]);
  }
}
