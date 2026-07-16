import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedTipIdKp1784211738931 implements MigrationInterface {
  name = 'AddedTipIdKp1784211738931';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_knowledge_products\` ADD \`tip_id\` bigint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_knowledge_products\` DROP COLUMN \`tip_id\``,
    );
  }
}
