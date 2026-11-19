import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Institutional objective tables
 * (docs/specs/institutional-performance/strategy-framework, design
 * section 3.1 and 3.3, R-STF-005, R-STF-009, R-STF-010, D-STF-2, D-STF-3).
 *
 * One objective row per portfolio, year and code. Links point at a framework
 * element: deleting the objective removes its links (CASCADE); deleting an
 * element that still has a link is refused (RESTRICT).
 *
 * This file exports ONLY its migration class. `down` drops only these two
 * tables, links first.
 */
export class CreateInstitutionalObjectives1795000000002
  implements MigrationInterface
{
  name = 'CreateInstitutionalObjectives1795000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`institutional_objectives\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`portfolio_id\` bigint NOT NULL,
        \`year\` smallint NOT NULL,
        \`code\` varchar(30) NOT NULL,
        \`statement\` text NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_iob_portfolio_year_code\` (\`portfolio_id\`, \`year\`, \`code\`),
        INDEX \`idx_iob_portfolio_year\` (\`portfolio_id\`, \`year\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await queryRunner.query(
      `ALTER TABLE \`institutional_objectives\` ADD CONSTRAINT \`FK_institutional_objectives_portfolio_id\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE RESTRICT`,
    );

    await queryRunner.query(`
      CREATE TABLE \`institutional_objective_elements\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`institutional_objective_id\` bigint NOT NULL,
        \`element_id\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_iob_element\` (\`institutional_objective_id\`, \`element_id\`),
        INDEX \`idx_iob_element_element\` (\`element_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await queryRunner.query(
      `ALTER TABLE \`institutional_objective_elements\` ADD CONSTRAINT \`FK_iob_elements_objective_id\` FOREIGN KEY (\`institutional_objective_id\`) REFERENCES \`institutional_objectives\`(\`id\`) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`institutional_objective_elements\` ADD CONSTRAINT \`FK_iob_elements_element_id\` FOREIGN KEY (\`element_id\`) REFERENCES \`framework_elements\`(\`id\`) ON DELETE RESTRICT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`institutional_objective_elements\``);
    await queryRunner.query(`DROP TABLE \`institutional_objectives\``);
  }
}
