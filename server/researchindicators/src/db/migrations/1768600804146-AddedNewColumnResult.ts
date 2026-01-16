import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedNewColumnResult1768600804146 implements MigrationInterface {
  name = 'AddedNewColumnResult1768600804146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`document_link\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`document_link\``,
    );
  }
}
