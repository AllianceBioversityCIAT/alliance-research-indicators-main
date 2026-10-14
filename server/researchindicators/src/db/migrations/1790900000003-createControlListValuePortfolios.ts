import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Value to portfolio link table (docs/specs/changes/control-lists-global-scope,
 * R-CLG-009, D-CLG-9, D-CLG-12, D-CLG-14; design section 3).
 *
 * A value applies to every portfolio unless it has rows here: no link rows
 * means "all portfolios", so this migration seeds nothing (every seeded value
 * applies to all). The primary key is the pair (`value_id`, `portfolio_id`);
 * the link follows its value (`ON DELETE CASCADE`) and protects the portfolio
 * (`ON DELETE RESTRICT`, which never fires through the app because portfolios
 * are soft-deleted - D-CLG-14 hides such links on read instead).
 *
 * The table has no audit columns on purpose (D-CLG-12): every link change goes
 * through a value write, which stamps the value row's own audit fields. This
 * file exports ONLY its migration class: the TypeORM loader treats every
 * exported function in `migrations/**` as a migration. `down` drops only this
 * table and runs first (reverse order: link table, values, lists, categories).
 */
export class CreateControlListValuePortfolios1790900000003
  implements MigrationInterface
{
  name = 'CreateControlListValuePortfolios1790900000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`control_list_value_portfolios\` (
        \`value_id\` bigint NOT NULL,
        \`portfolio_id\` bigint NOT NULL,
        PRIMARY KEY (\`value_id\`, \`portfolio_id\`),
        INDEX \`idx_control_list_value_portfolios_portfolio\` (\`portfolio_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`control_list_value_portfolios\` ADD CONSTRAINT \`FK_control_list_value_portfolios_value_id\` FOREIGN KEY (\`value_id\`) REFERENCES \`control_list_values\`(\`id\`) ON DELETE CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE \`control_list_value_portfolios\` ADD CONSTRAINT \`FK_control_list_value_portfolios_portfolio_id\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE RESTRICT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`control_list_value_portfolios\``);
  }
}
