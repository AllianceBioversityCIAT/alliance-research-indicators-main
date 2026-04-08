import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseAppConfigKeyLengthTo2551774373269393
  implements MigrationInterface
{
  name = 'IncreaseAppConfigKeyLengthTo2551774373269393';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`app_config\` MODIFY \`key\` varchar(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`app_config\` MODIFY \`key\` varchar(100) NOT NULL`,
    );
  }
}
