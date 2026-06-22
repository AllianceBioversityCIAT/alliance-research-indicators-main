import { MigrationInterface, QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';

export class AddNewEnvCl1781879906673 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO app_config (\`key\`, description, category, subcategory) VALUES (?, ?, ?, ?);`,
      [
        AppConfigKey.ARI_CLARISA_API_KEY,
        `This API key is responsible for managing all authentication with the IBD unit's microservices`,
        'API',
        'API_KEY',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM app_config WHERE key = '${AppConfigKey.ARI_CLARISA_API_KEY}';`,
    );
  }
}
