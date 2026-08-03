import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultPoolFundingIndicatorMapping1779190000008
  implements MigrationInterface
{
  name = 'CreateResultPoolFundingIndicatorMapping1779190000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_pool_funding_indicator_mapping\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`lever_code\` varchar(50) NOT NULL,
        \`indicator_code\` varchar(100) NOT NULL,
        \`indicator_type\` varchar(50) NOT NULL,
        \`result_capacity_sharing_id\` bigint NULL,
        \`result_knowledge_product_id\` bigint NULL,
        \`result_policy_change_id\` bigint NULL,
        \`result_innovation_dev_id\` bigint NULL,
        \`other_contribution_narrative\` text NULL,
        \`is_stale\` tinyint NOT NULL DEFAULT 0,
        UNIQUE INDEX \`uq_rpfim_result_indicator_active\` (\`result_id\`, \`lever_code\`, \`indicator_code\`, \`is_active\`),
        INDEX \`idx_rpfim_result\` (\`result_id\`),
        INDEX \`idx_rpfim_indicator\` (\`lever_code\`, \`indicator_code\`),
        INDEX \`idx_rpfim_stale\` (\`is_stale\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` ADD CONSTRAINT \`fk_rpfim_result\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` ADD CONSTRAINT \`fk_rpfim_capacity_sharing\` FOREIGN KEY (\`result_capacity_sharing_id\`) REFERENCES \`result_capacity_sharing\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` ADD CONSTRAINT \`fk_rpfim_knowledge_product\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`result_knowledge_products\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` ADD CONSTRAINT \`fk_rpfim_policy_change\` FOREIGN KEY (\`result_policy_change_id\`) REFERENCES \`result_policy_change\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` ADD CONSTRAINT \`fk_rpfim_innovation_dev\` FOREIGN KEY (\`result_innovation_dev_id\`) REFERENCES \`result_innovation_dev\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` DROP FOREIGN KEY \`fk_rpfim_innovation_dev\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` DROP FOREIGN KEY \`fk_rpfim_policy_change\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` DROP FOREIGN KEY \`fk_rpfim_knowledge_product\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` DROP FOREIGN KEY \`fk_rpfim_capacity_sharing\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_indicator_mapping\` DROP FOREIGN KEY \`fk_rpfim_result\``,
    );
    await queryRunner.query(
      `DROP TABLE \`result_pool_funding_indicator_mapping\``,
    );
  }
}
