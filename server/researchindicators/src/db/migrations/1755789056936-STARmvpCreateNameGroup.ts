import { MigrationInterface, QueryRunner } from 'typeorm';

export class STARmvpCreateNameGroup1755789056936 implements MigrationInterface {
  name = 'STARmvpCreateNameGroup1755789056936';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`group_name\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`group_name\``,
    );
  }
}
