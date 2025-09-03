import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBanner1756695342816 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`announcement_settings\` SET \`title\` = 'Your innovative digital reporting solution' WHERE \`title\` = 'Your New Reporting Tool'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`announcement_settings\` SET \`title\` = 'Your New Reporting Tool' WHERE \`title\` = 'Your innovative digital reporting solution'`,
    );
  }
}
