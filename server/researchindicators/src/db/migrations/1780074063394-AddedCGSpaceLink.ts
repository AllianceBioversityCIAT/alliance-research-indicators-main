import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedCGSpaceLink1780074063394 implements MigrationInterface {
  name = 'AddedCGSpaceLink1780074063394';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`cgspace_link\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`cgspace_link\``,
    );
  }
}
