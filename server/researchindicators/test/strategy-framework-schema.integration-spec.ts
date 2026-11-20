import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createStfDataSource } from './support/strategy-framework-fixtures';

/**
 * Strategy framework schema on the real local scratch
 * (docs/specs/institutional-performance/strategy-framework, T-10,
 * design §10 Integration row, §3.1).
 *
 * Scope (KZ-017): `information_schema` of this scratch proves what the
 * migrations created here. It does not prove a replay on another server.
 * The suite writes nothing.
 */
describe('Strategy framework — schema on real MySQL (T-10)', () => {
  let dataSource: DataSource;

  const TABLES = [
    'framework_levels',
    'framework_elements',
    'framework_element_responsibles',
    'institutional_objectives',
    'institutional_objective_elements',
  ];

  beforeAll(async () => {
    dataSource = await createStfDataSource('strategy-framework-schema');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('has the four migrations recorded', async () => {
    const rows: Array<{ name: string }> = await dataSource.query(
      `SELECT name FROM migrations WHERE timestamp BETWEEN 1795000000000 AND 1795000000003 ORDER BY timestamp`,
    );
    expect(rows.map((row) => row.name)).toEqual([
      'CreateOdsAdminRole1795000000000',
      'CreateFrameworkTables1795000000001',
      'CreateInstitutionalObjectives1795000000002',
      'SeedStrategyFramework1795000000003',
    ]);
  });

  it('framework_levels.indicator_portfolio_key is STORED GENERATED (information_schema)', async () => {
    const rows: Array<{
      EXTRA: string;
      GENERATION_EXPRESSION: string;
    }> = await dataSource.query(
      `SELECT EXTRA, GENERATION_EXPRESSION
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'framework_levels'
          AND COLUMN_NAME = 'indicator_portfolio_key'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].EXTRA).toBe('STORED GENERATED');
    expect(rows[0].GENERATION_EXPRESSION).toContain('is_indicator_level');
    expect(rows[0].GENERATION_EXPRESSION).toContain('portfolio_id');
  });

  it.each(TABLES)('%s is utf8mb4_0900_ai_ci', async (table) => {
    const [row] = await dataSource.query(
      `SELECT TABLE_COLLATION AS collation
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table],
    );
    expect(row.collation).toBe('utf8mb4_0900_ai_ci');
  });

  it('unique indexes of design §3.1 are unique', async () => {
    const expected: Array<[string, string, string[]]> = [
      [
        'framework_levels',
        'uq_framework_levels_portfolio_depth',
        ['portfolio_id', 'depth'],
      ],
      [
        'framework_levels',
        'uq_framework_levels_indicator',
        ['indicator_portfolio_key'],
      ],
      [
        'framework_elements',
        'uq_framework_elements_portfolio_code',
        ['portfolio_id', 'code'],
      ],
      [
        'framework_element_responsibles',
        'uq_framework_element_resp',
        ['element_id', 'staff_carnet'],
      ],
      [
        'institutional_objectives',
        'uq_iob_portfolio_year_code',
        ['portfolio_id', 'year', 'code'],
      ],
      [
        'institutional_objective_elements',
        'uq_iob_element',
        ['institutional_objective_id', 'element_id'],
      ],
    ];
    for (const [table, key, columns] of expected) {
      const rows: Array<{
        Non_unique: number | string;
        Column_name: string;
        Seq_in_index: number;
      }> = await dataSource.query(
        `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
        [key],
      );
      expect(rows.length).toBe(columns.length);
      expect(rows.every((row) => Number(row.Non_unique) === 0)).toBe(true);
      expect(
        [...rows]
          .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
          .map((row) => row.Column_name),
      ).toEqual(columns);
    }
  });

  it('foreign keys use the delete rules of design §3.1, including the IOB RESTRICT backstop', async () => {
    const rows: Array<{
      CONSTRAINT_NAME: string;
      DELETE_RULE: string;
    }> = await dataSource.query(
      `SELECT CONSTRAINT_NAME, DELETE_RULE
         FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME IN (${TABLES.map(() => '?').join(', ')})`,
      TABLES,
    );
    const rule = (name: string) =>
      rows.find((row) => row.CONSTRAINT_NAME === name)?.DELETE_RULE;
    expect(rule('FK_framework_elements_parent_id')).toBe('RESTRICT');
    expect(rule('FK_iob_elements_element_id')).toBe('RESTRICT');
    expect(rule('FK_framework_element_resp_element_id')).toBe('CASCADE');
    expect(rule('FK_iob_elements_objective_id')).toBe('CASCADE');
    expect(rule('FK_framework_levels_portfolio_id')).toBe('RESTRICT');
    expect(rule('FK_framework_elements_portfolio_id')).toBe('RESTRICT');
    expect(rule('FK_framework_elements_level_id')).toBe('RESTRICT');
    expect(rule('FK_framework_element_resp_staff_carnet')).toBe('RESTRICT');
    expect(rule('FK_institutional_objectives_portfolio_id')).toBe('RESTRICT');
  });
});
