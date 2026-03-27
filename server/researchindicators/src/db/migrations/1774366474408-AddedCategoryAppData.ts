import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedCategoryAppData1774366474408 implements MigrationInterface {
  name = 'AddedCategoryAppData1774366474408';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`app_config\` ADD \`category\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_config\` ADD \`subcategory\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`app_config\` DROP COLUMN \`subcategory\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_config\` DROP COLUMN \`category\``,
    );
  }
}
