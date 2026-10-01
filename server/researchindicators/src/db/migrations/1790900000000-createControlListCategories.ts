import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-01 (docs/specs/institutional-performance/control-lists), slice 1:
 * Categories. Creates `control_list_categories` and seeds the 2 Portfolio 2
 * categories from R-CTL-010 (design.md §3, §12 D-CTL-8, D-CTL-14).
 *
 * Portfolio 2 is resolved by its year range (start_year = 2026 AND
 * end_year = 2030), never by a literal id (P-6: the id can differ per
 * environment). Seeded rows carry explicit ids 1 and 2, each guarded by its
 * own `WHERE NOT EXISTS (... id = N)` so a re-run adds nothing even if a
 * later environment already holds a differently-ordered id 1 row (D-CTL-14).
 * AUTO_INCREMENT is reset above the seeded ids so the next admin-created
 * category never collides with them.
 */
export class CreateControlListCategories1790900000000
  implements MigrationInterface
{
  name = 'CreateControlListCategories1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`control_list_categories\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`portfolio_id\` bigint NOT NULL,
        \`name\` varchar(150) NOT NULL,
        \`description\` varchar(500) NULL,
        \`display_order\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_control_list_categories_portfolio_name\` (\`portfolio_id\`, \`name\`),
        INDEX \`idx_control_list_categories_portfolio\` (\`portfolio_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`control_list_categories\` ADD CONSTRAINT \`FK_control_list_categories_portfolio_id\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE RESTRICT`,
    );

    // Seed — Category 1: Key Performance Indicators (KPIs), Portfolio 2
    // (resolved by years, not by literal id). Idempotent: a re-run of this
    // statement finds the id 1 row already there and inserts 0 rows.
    await queryRunner.query(`
      INSERT INTO \`control_list_categories\`
        (\`id\`, \`portfolio_id\`, \`name\`, \`description\`, \`display_order\`, \`is_active\`)
      SELECT 1, p.\`id\`, 'Key Performance Indicators (KPIs)', NULL, 1, 1
      FROM \`portfolios\` p
      WHERE p.\`start_year\` = 2026 AND p.\`end_year\` = 2030
        AND NOT EXISTS (
          SELECT 1 FROM \`control_list_categories\` cc WHERE cc.\`id\` = 1
        )
    `);

    // Seed — Category 2: Organizational structure, Portfolio 2.
    await queryRunner.query(`
      INSERT INTO \`control_list_categories\`
        (\`id\`, \`portfolio_id\`, \`name\`, \`description\`, \`display_order\`, \`is_active\`)
      SELECT 2, p.\`id\`, 'Organizational structure', NULL, 2, 1
      FROM \`portfolios\` p
      WHERE p.\`start_year\` = 2026 AND p.\`end_year\` = 2030
        AND NOT EXISTS (
          SELECT 1 FROM \`control_list_categories\` cc WHERE cc.\`id\` = 2
        )
    `);

    // Explicit seed ids (1, 2) are fixed across environments (D-CTL-14);
    // AUTO_INCREMENT must start above them for every admin-created category.
    await queryRunner.query(
      `ALTER TABLE \`control_list_categories\` AUTO_INCREMENT = 3`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`control_list_categories\``);
  }
}
