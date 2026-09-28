import { MigrationInterface, QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';
import { EXTERNAL_STATUS_ID } from '../../domain/tools/agresso/staff/dto/deactivation-config.dto';

const ROWS: readonly [AppConfigKey, string, string][] = [
  [
    AppConfigKey.ARI_STAFF_DEACTIVATION_DRY_RUN,
    'true',
    'When true, the staff deactivation pass reports and writes nothing. An unreadable value stays enabled.',
  ],
  [
    AppConfigKey.ARI_STAFF_DEACTIVATION_CEILING_FRACTION,
    '0.05',
    'Fraction of the active population used as the deactivation volume ceiling. An unreadable value aborts the pass (C-3).',
  ],
  [
    AppConfigKey.ARI_STAFF_DEACTIVATION_ABSOLUTE_FLOOR,
    '10',
    'Minimum deactivation ceiling, as a positive integer. An unreadable value aborts the pass (C-3).',
  ],
  [
    AppConfigKey.ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID,
    String(EXTERNAL_STATUS_ID),
    'user_status_id of the external cohort. An unreadable value aborts the pass (C-4).',
  ],
];

export class SeedStaffDeactivationConfig1790602688746
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [key, simpleValue, description] of ROWS) {
      await queryRunner.query(
        `INSERT INTO app_config (\`key\`, simple_value, description, category, subcategory) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE simple_value = VALUES(simple_value), description = VALUES(description), category = VALUES(category), subcategory = VALUES(subcategory);`,
        [key, simpleValue, description, 'API', 'STAFF'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [key] of ROWS) {
      await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?;`, [
        key,
      ]);
    }
  }
}
