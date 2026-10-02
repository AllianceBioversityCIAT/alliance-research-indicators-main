import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-03 (docs/specs/institutional-performance/control-lists), slice 3:
 * Values. Creates `control_list_values` and seeds the 23 values of
 * R-CTL-010 (design.md §3, §12 D-CTL-14) under the 6 system lists seeded by
 * `1790900000001-createControlLists.ts`.
 *
 * Each seed statement resolves its parent list by its explicit seed id
 * (1-6, from the lists migration) AND verifies that list belongs to
 * Portfolio 2 (resolved by `start_year = 2026 AND end_year = 2030`, never a
 * literal id — P-6) AND carries the expected `list_key`, so if Portfolio 2,
 * that list row, or its key has drifted, the JOIN/WHERE yields no rows and
 * the INSERT adds nothing for that row (tasks.md T-03 "insert nothing for a
 * list that doesn't match"). Each insert additionally guards on its own
 * explicit id with `WHERE NOT EXISTS`, so a re-run adds nothing.
 * AUTO_INCREMENT is reset above the seeded ids so the next admin-created
 * value never collides with them. `down` drops only this table (design §3:
 * reverse order values → lists → categories).
 */
export class CreateControlListValues1790900000002
  implements MigrationInterface
{
  name = 'CreateControlListValues1790900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`control_list_values\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`list_id\` bigint NOT NULL,
        \`code\` varchar(30) NOT NULL,
        \`value\` varchar(150) NOT NULL,
        \`description\` varchar(500) NULL,
        \`display_order\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_control_list_values_list_code\` (\`list_id\`, \`code\`),
        UNIQUE INDEX \`uq_control_list_values_list_value\` (\`list_id\`, \`value\`),
        INDEX \`idx_control_list_values_list_order\` (\`list_id\`, \`display_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`control_list_values\` ADD CONSTRAINT \`FK_control_list_values_list_id\` FOREIGN KEY (\`list_id\`) REFERENCES \`control_lists\`(\`id\`) ON DELETE RESTRICT`,
    );

    // Seed — 23 values across the 6 system lists (R-CTL-010). Each row is
    // idempotent on its own explicit id (1-23), and gated on its parent
    // list existing, under Portfolio 2, with the expected list_key.
    const seedValue = (
      id: number,
      listId: number,
      listKey: string,
      code: string,
      value: string,
      displayOrder: number,
    ) => `
      INSERT INTO \`control_list_values\`
        (\`id\`, \`list_id\`, \`code\`, \`value\`, \`description\`, \`display_order\`, \`is_active\`)
      SELECT ${id}, l.\`id\`, '${code}', '${value}', NULL, ${displayOrder}, 1
      FROM \`control_lists\` l
      JOIN \`portfolios\` p ON p.\`id\` = l.\`portfolio_id\`
      WHERE l.\`id\` = ${listId} AND l.\`list_key\` = '${listKey}'
        AND p.\`start_year\` = 2026 AND p.\`end_year\` = 2030
        AND NOT EXISTS (
          SELECT 1 FROM \`control_list_values\` cv WHERE cv.\`id\` = ${id}
        )
    `;

    // List 1 — kpi.unit_of_measure (UOM): ids 1-7.
    await queryRunner.query(
      seedValue(1, 1, 'kpi.unit_of_measure', 'UOM-01', 'Percentage (%)', 1),
    );
    await queryRunner.query(
      seedValue(2, 1, 'kpi.unit_of_measure', 'UOM-02', 'Count', 2),
    );
    await queryRunner.query(
      seedValue(3, 1, 'kpi.unit_of_measure', 'UOM-03', 'Days', 3),
    );
    await queryRunner.query(
      seedValue(4, 1, 'kpi.unit_of_measure', 'UOM-04', 'Score (0-100)', 4),
    );
    await queryRunner.query(
      seedValue(5, 1, 'kpi.unit_of_measure', 'UOM-05', 'USD', 5),
    );
    await queryRunner.query(
      seedValue(6, 1, 'kpi.unit_of_measure', 'UOM-06', 'Ratio', 6),
    );
    await queryRunner.query(
      seedValue(7, 1, 'kpi.unit_of_measure', 'UOM-07', 'Yes/No', 7),
    );

    // List 2 — kpi.direction (DIR): ids 8-10.
    await queryRunner.query(
      seedValue(8, 2, 'kpi.direction', 'DIR-01', 'Increase', 1),
    );
    await queryRunner.query(
      seedValue(9, 2, 'kpi.direction', 'DIR-02', 'Decrease', 2),
    );
    await queryRunner.query(
      seedValue(10, 2, 'kpi.direction', 'DIR-03', 'Maintain within range', 3),
    );

    // List 3 — kpi.measurement_frequency (FRQ): ids 11-14.
    await queryRunner.query(
      seedValue(11, 3, 'kpi.measurement_frequency', 'FRQ-01', 'Monthly', 1),
    );
    await queryRunner.query(
      seedValue(12, 3, 'kpi.measurement_frequency', 'FRQ-02', 'Quarterly', 2),
    );
    await queryRunner.query(
      seedValue(13, 3, 'kpi.measurement_frequency', 'FRQ-03', 'Semi-annual', 3),
    );
    await queryRunner.query(
      seedValue(14, 3, 'kpi.measurement_frequency', 'FRQ-04', 'Annual', 4),
    );

    // List 4 — kpi.level (KLV): ids 15-17.
    await queryRunner.query(
      seedValue(15, 4, 'kpi.level', 'KLV-01', 'Strategic', 1),
    );
    await queryRunner.query(
      seedValue(16, 4, 'kpi.level', 'KLV-02', 'Tactical', 2),
    );
    await queryRunner.query(
      seedValue(17, 4, 'kpi.level', 'KLV-03', 'Operational', 3),
    );

    // List 5 — kpi.type (KTY): ids 18-19.
    await queryRunner.query(
      seedValue(18, 5, 'kpi.type', 'KTY-01', 'Institutional', 1),
    );
    await queryRunner.query(
      seedValue(19, 5, 'kpi.type', 'KTY-02', 'Customized', 2),
    );

    // List 6 — org.level (L, no dash): ids 20-23.
    await queryRunner.query(seedValue(20, 6, 'org.level', 'L1', 'Division', 1));
    await queryRunner.query(
      seedValue(21, 6, 'org.level', 'L2', 'Department', 2),
    );
    await queryRunner.query(seedValue(22, 6, 'org.level', 'L3', 'Office', 3));
    await queryRunner.query(seedValue(23, 6, 'org.level', 'L4', 'Unit', 4));

    // Explicit seed ids (1-23) are fixed across environments (D-CTL-14);
    // AUTO_INCREMENT must start above them for every admin-created value.
    await queryRunner.query(
      `ALTER TABLE \`control_list_values\` AUTO_INCREMENT = 24`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`control_list_values\``);
  }
}
