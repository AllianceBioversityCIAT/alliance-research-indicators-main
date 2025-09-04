import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateResults1756827484385 implements MigrationInterface {
  name = 'UpdateResults1756827484385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`is_partner_not_applicable\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`is_partner_not_applicable\``,
    );
  }
}
