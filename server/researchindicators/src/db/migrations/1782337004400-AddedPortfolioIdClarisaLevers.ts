import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedPortfolioIdClarisaLevers1782337004400
  implements MigrationInterface
{
  name = 'AddedPortfolioIdClarisaLevers1782337004400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`portfolio_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD CONSTRAINT \`FK_4dc6cb03332e668acae91bf80a3\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `UPDATE \`clarisa_levers\` SET \`portfolio_id\` = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP FOREIGN KEY \`FK_4dc6cb03332e668acae91bf80a3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`portfolio_id\``,
    );
  }
}
