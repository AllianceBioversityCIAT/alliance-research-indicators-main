import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedIsPrivateEvidences1747230257392
  implements MigrationInterface
{
  name = 'AddedIsPrivateEvidences1747230257392';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` ADD \`is_private\` tinyint NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` DROP COLUMN \`is_private\``,
    );
  }
}
