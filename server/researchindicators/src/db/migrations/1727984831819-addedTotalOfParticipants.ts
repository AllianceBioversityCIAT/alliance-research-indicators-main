import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedTotalOfParticipants1727984831819
  implements MigrationInterface
{
  name = 'AddedTotalOfParticipants1727984831819';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`session_participants_total\` bigint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`session_participants_total\``,
    );
  }
}
