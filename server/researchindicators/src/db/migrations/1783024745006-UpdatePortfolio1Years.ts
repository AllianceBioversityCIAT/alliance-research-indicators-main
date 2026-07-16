import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePortfolio1Years1783024745006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`portfolios\` SET \`start_year\` = 2010 WHERE \`id\` = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`portfolios\` SET \`start_year\` = 2021 WHERE \`id\` = 1`,
    );
  }
}
