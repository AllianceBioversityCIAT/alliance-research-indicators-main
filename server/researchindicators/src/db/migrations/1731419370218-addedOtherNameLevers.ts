import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedOtherNameLevers1731419370218 implements MigrationInterface {
  name = 'AddedOtherNameLevers1731419370218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`other_names\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`other_names\``,
    );
  }
}
