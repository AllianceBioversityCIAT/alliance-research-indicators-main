import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultPoolFundingAlignmentSp1779190000007
  implements MigrationInterface
{
  name = 'CreateResultPoolFundingAlignmentSp1779190000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_pool_funding_alignment_sp\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`alignment_id\` bigint NOT NULL,
        \`lever_code\` varchar(50) NOT NULL,
        INDEX \`idx_result_pool_funding_alignment_sp_alignment\` (\`alignment_id\`),
        INDEX \`idx_result_pool_funding_alignment_sp_lever\` (\`lever_code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\` ADD CONSTRAINT \`fk_rpfas_alignment\` FOREIGN KEY (\`alignment_id\`) REFERENCES \`result_pool_funding_alignment\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\` DROP FOREIGN KEY \`fk_rpfas_alignment\``,
    );
    await queryRunner.query(`DROP TABLE \`result_pool_funding_alignment_sp\``);
  }
}
