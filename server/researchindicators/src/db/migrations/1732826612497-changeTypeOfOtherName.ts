import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeTypeOfOtherName1732826612497 implements MigrationInterface {
  name = 'ChangeTypeOfOtherName1732826612497';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` DROP COLUMN \`other_names\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` ADD \`other_names\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` DROP COLUMN \`other_names\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` ADD \`other_names\` text NULL`,
    );
  }
}
