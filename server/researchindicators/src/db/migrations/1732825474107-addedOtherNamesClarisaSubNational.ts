import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedOtherNamesClarisaSubNational1732825474107
  implements MigrationInterface
{
  name = 'AddedOtherNamesClarisaSubNational1732825474107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` ADD \`other_names\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` DROP COLUMN \`other_names\``,
    );
  }
}
