import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedErrorMessageAiReport1781106535639
  implements MigrationInterface
{
  name = 'AddedErrorMessageAiReport1781106535639';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` ADD \`error_message\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` DROP COLUMN \`error_message\``,
    );
  }
}
