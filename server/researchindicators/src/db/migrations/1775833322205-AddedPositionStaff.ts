import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedPositionStaff1775833322205 implements MigrationInterface {
  name = 'AddedPositionStaff1775833322205';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` ADD \`position\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` DROP COLUMN \`position\``,
    );
  }
}
