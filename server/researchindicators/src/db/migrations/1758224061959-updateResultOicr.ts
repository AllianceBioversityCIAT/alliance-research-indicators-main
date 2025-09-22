import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateResultOicr1758224061959 implements MigrationInterface {
  name = 'UpdateResultOicr1758224061959';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`elaboration_narrative\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`elaboration_narrative\``,
    );
  }
}
