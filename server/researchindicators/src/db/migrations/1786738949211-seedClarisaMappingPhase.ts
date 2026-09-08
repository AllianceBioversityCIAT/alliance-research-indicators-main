import { MigrationInterface, QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';

export class SeedClarisaMappingPhase1786738949211
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO app_config (\`key\`, simple_value, description, category, subcategory) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE simple_value = VALUES(simple_value), description = VALUES(description), category = VALUES(category), subcategory = VALUES(subcategory);`,
      [
        AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        '2026',
        'Which CLARISA project phase the bilateral mapping picker offers',
        'API',
        'CLARISA',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM app_config WHERE \`key\` = ?;`, [
      AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
    ]);
  }
}
