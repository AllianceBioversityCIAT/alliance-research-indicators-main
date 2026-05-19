import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPoolFundingContributorTagToAgressoContract1779190000001
  implements MigrationInterface
{
  name = 'AddPoolFundingContributorTagToAgressoContract1779190000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`is_pool_funding_contributor\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_agresso_contract_pool_funding\` ON \`agresso_contracts\` (\`is_pool_funding_contributor\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_agresso_contract_pool_funding\` ON \`agresso_contracts\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`is_pool_funding_contributor\``,
    );
  }
}
