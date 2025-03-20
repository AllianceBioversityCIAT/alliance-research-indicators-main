import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedIsPrimaryColumn1729696310294 implements MigrationInterface {
  name = 'AddedIsPrimaryColumn1729696310294';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD \`is_primary\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD \`is_primary\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP COLUMN \`is_primary\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP COLUMN \`is_primary\``,
    );
  }
}
