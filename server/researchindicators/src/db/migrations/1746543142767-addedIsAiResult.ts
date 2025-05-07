import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedIsAiResult1746543142767 implements MigrationInterface {
  name = 'AddedIsAiResult1746543142767';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`is_ai\` tinyint NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`results\` DROP COLUMN \`is_ai\``);
  }
}
