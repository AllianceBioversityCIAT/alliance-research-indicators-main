import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultPoolFundingAlignment1779190000006
  implements MigrationInterface
{
  name = 'CreateResultPoolFundingAlignment1779190000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_pool_funding_alignment\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`has_contribution\` tinyint NOT NULL,
        UNIQUE INDEX \`uq_result_pool_funding_alignment_result_active\` (\`result_id\`, \`is_active\`),
        INDEX \`idx_result_pool_funding_alignment_result\` (\`result_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment\` ADD CONSTRAINT \`fk_rpfa_result\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment\` DROP FOREIGN KEY \`fk_rpfa_result\``,
    );
    await queryRunner.query(`DROP TABLE \`result_pool_funding_alignment\``);
  }
}
