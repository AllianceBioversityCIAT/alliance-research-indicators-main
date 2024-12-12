import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedNewColumnsAllianceStaff1733928453454
  implements MigrationInterface
{
  name = 'AddedNewColumnsAllianceStaff1733928453454';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` ADD \`status\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` ADD \`center\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` DROP COLUMN \`center\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` DROP COLUMN \`status\``,
    );
  }
}
