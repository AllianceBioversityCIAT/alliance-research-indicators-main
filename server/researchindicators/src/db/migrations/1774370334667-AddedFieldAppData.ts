import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedFieldAppData1774370334667 implements MigrationInterface {
  name = 'AddedFieldAppData1774370334667';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`app_config\` ADD \`field\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`app_config\` DROP COLUMN \`field\``);
  }
}
