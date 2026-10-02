import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-02 (docs/specs/institutional-performance/control-lists), slice 2:
 * Lists. Creates `control_lists` and seeds the 6 system lists of R-CTL-010
 * (design.md §3, §12 D-CTL-2, D-CTL-14) under the 2 categories seeded by
 * `1790900000000-createControlListCategories.ts`.
 *
 * Portfolio 2 is resolved by its year range (start_year = 2026 AND
 * end_year = 2030), never by a literal id (P-6, carried from T-01). Each
 * seed statement also JOINs `control_list_categories` on its explicit seed
 * id (1 = KPIs, 2 = Organizational structure) scoped to the same portfolio,
 * so if Portfolio 2 or that category row is absent, the JOIN yields no rows
 * and the INSERT adds nothing (tasks.md T-02 "guard so nothing is inserted
 * if Portfolio 2 or the category is absent"). Each insert additionally
 * guards on its own explicit id with `WHERE NOT EXISTS`, so a re-run adds
 * nothing. AUTO_INCREMENT is reset above the seeded ids so the next
 * admin-created list never collides with them. `down` drops only this
 * table (design §3: reverse order values → lists → categories).
 */
export class CreateControlLists1790900000001 implements MigrationInterface {
  name = 'CreateControlLists1790900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`control_lists\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`portfolio_id\` bigint NOT NULL,
        \`category_id\` bigint NOT NULL,
        \`list_key\` varchar(100) NOT NULL,
        \`name\` varchar(150) NOT NULL,
        \`description\` varchar(500) NULL,
        \`code_prefix\` varchar(10) NOT NULL,
        \`is_system\` tinyint NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_control_lists_portfolio_key\` (\`portfolio_id\`, \`list_key\`),
        INDEX \`idx_control_lists_category\` (\`category_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`control_lists\` ADD CONSTRAINT \`FK_control_lists_portfolio_id\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`control_lists\` ADD CONSTRAINT \`FK_control_lists_category_id\` FOREIGN KEY (\`category_id\`) REFERENCES \`control_list_categories\`(\`id\`) ON DELETE RESTRICT`,
    );

    // Seed — 5 KPI lists under category 1 (Key Performance Indicators),
    // then 1 Organizational structure list under category 2. Each is
    // idempotent on its own explicit id, and gated on its parent category
    // existing in the resolved portfolio.
    const seedList = (
      id: number,
      categoryId: number,
      listKey: string,
      name: string,
      codePrefix: string,
    ) => `
      INSERT INTO \`control_lists\`
        (\`id\`, \`portfolio_id\`, \`category_id\`, \`list_key\`, \`name\`, \`description\`, \`code_prefix\`, \`is_system\`, \`is_active\`)
      SELECT ${id}, p.\`id\`, c.\`id\`, '${listKey}', '${name}', NULL, '${codePrefix}', 1, 1
      FROM \`portfolios\` p
      JOIN \`control_list_categories\` c ON c.\`id\` = ${categoryId} AND c.\`portfolio_id\` = p.\`id\`
      WHERE p.\`start_year\` = 2026 AND p.\`end_year\` = 2030
        AND NOT EXISTS (
          SELECT 1 FROM \`control_lists\` cl WHERE cl.\`id\` = ${id}
        )
    `;

    await queryRunner.query(
      seedList(1, 1, 'kpi.unit_of_measure', 'Unit of measure', 'UOM'),
    );
    await queryRunner.query(
      seedList(2, 1, 'kpi.direction', 'Direction', 'DIR'),
    );
    await queryRunner.query(
      seedList(
        3,
        1,
        'kpi.measurement_frequency',
        'Measurement frequency',
        'FRQ',
      ),
    );
    await queryRunner.query(seedList(4, 1, 'kpi.level', 'KPI level', 'KLV'));
    await queryRunner.query(seedList(5, 1, 'kpi.type', 'Type', 'KTY'));
    await queryRunner.query(
      seedList(6, 2, 'org.level', 'Organizational level', 'L'),
    );

    // Explicit seed ids (1-6) are fixed across environments (D-CTL-14);
    // AUTO_INCREMENT must start above them for every admin-created list.
    await queryRunner.query(`ALTER TABLE \`control_lists\` AUTO_INCREMENT = 7`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`control_lists\``);
  }
}
