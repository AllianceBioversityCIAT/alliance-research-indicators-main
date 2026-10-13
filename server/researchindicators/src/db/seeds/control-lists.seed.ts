import { QueryRunner } from 'typeorm';

/**
 * Control Lists seed (docs/specs/changes/control-lists-global-scope,
 * D-CLG-11; rows from R-CTL-010 of the archived control-lists spec).
 *
 * Lives OUTSIDE `src/db/migrations/**` on purpose. `orm.config.ts` loads
 * every export of every file matched by `migrations/**` and treats each
 * exported FUNCTION as a migration, rejecting any name without a 13-digit
 * timestamp ("migration name is wrong"). A `seed...` function exported from
 * a migration file therefore breaks every `migration:*` command, so the
 * three migration files import these functions and export only their class.
 *
 * Every statement is `INSERT ... SELECT ... WHERE NOT EXISTS` on the row's
 * own explicit id, so a second run inserts 0 rows. Each function returns the
 * total of inserted rows (`affectedRows`) so the seed integration suite can
 * assert that a re-run changes nothing. The `AUTO_INCREMENT` reset after each
 * seed is also a no-op on a re-run: MySQL never lowers the counter below
 * MAX(id) + 1.
 *
 * Seeded ids are fixed across environments (D-CTL-14): categories 1-2,
 * lists 1-6, values 1-23. None of these statements carries a `?` or a
 * `:word` outside quotes (the datasource enables `namedPlaceholders`, and
 * these queries pass no parameters).
 */

const affectedRows = (result: unknown): number =>
  Number((result as { affectedRows?: number } | undefined)?.affectedRows ?? 0);

// ---------------------------------------------------------------------------
// Categories (ids 1-2)
// ---------------------------------------------------------------------------

const SEED_CATEGORIES: ReadonlyArray<{
  id: number;
  name: string;
  displayOrder: number;
}> = [
  { id: 1, name: 'Key Performance Indicators (KPIs)', displayOrder: 1 },
  { id: 2, name: 'Organizational structure', displayOrder: 2 },
];

export const seedControlListCategories = async (
  runner: QueryRunner,
): Promise<number> => {
  let inserted = 0;
  for (const category of SEED_CATEGORIES) {
    inserted += affectedRows(
      await runner.query(`
        INSERT INTO \`control_list_categories\`
          (\`id\`, \`name\`, \`description\`, \`display_order\`, \`is_active\`)
        SELECT ${category.id}, '${category.name}', NULL, ${category.displayOrder}, 1
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM \`control_list_categories\` cc WHERE cc.\`id\` = ${category.id}
        )
      `),
    );
  }

  // AUTO_INCREMENT must start above the seeded ids for every admin-created
  // category.
  await runner.query(
    `ALTER TABLE \`control_list_categories\` AUTO_INCREMENT = 3`,
  );

  return inserted;
};

// ---------------------------------------------------------------------------
// Lists (ids 1-6), by explicit category id
// ---------------------------------------------------------------------------

const SEED_LISTS: ReadonlyArray<{
  id: number;
  categoryId: number;
  listKey: string;
  name: string;
  codePrefix: string;
}> = [
  {
    id: 1,
    categoryId: 1,
    listKey: 'kpi.unit_of_measure',
    name: 'Unit of measure',
    codePrefix: 'UOM',
  },
  {
    id: 2,
    categoryId: 1,
    listKey: 'kpi.direction',
    name: 'Direction',
    codePrefix: 'DIR',
  },
  {
    id: 3,
    categoryId: 1,
    listKey: 'kpi.measurement_frequency',
    name: 'Measurement frequency',
    codePrefix: 'FRQ',
  },
  {
    id: 4,
    categoryId: 1,
    listKey: 'kpi.level',
    name: 'KPI level',
    codePrefix: 'KLV',
  },
  {
    id: 5,
    categoryId: 1,
    listKey: 'kpi.type',
    name: 'Type',
    codePrefix: 'KTY',
  },
  {
    id: 6,
    categoryId: 2,
    listKey: 'org.level',
    name: 'Organizational level',
    codePrefix: 'L',
  },
];

export const seedControlLists = async (
  runner: QueryRunner,
): Promise<number> => {
  let inserted = 0;
  for (const list of SEED_LISTS) {
    inserted += affectedRows(
      await runner.query(`
        INSERT INTO \`control_lists\`
          (\`id\`, \`category_id\`, \`list_key\`, \`name\`, \`description\`, \`code_prefix\`, \`is_system\`, \`is_active\`)
        SELECT ${list.id}, ${list.categoryId}, '${list.listKey}', '${list.name}', NULL, '${list.codePrefix}', 1, 1
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM \`control_lists\` cl WHERE cl.\`id\` = ${list.id}
        )
      `),
    );
  }

  // AUTO_INCREMENT must start above the seeded ids for every admin-created
  // list.
  await runner.query(`ALTER TABLE \`control_lists\` AUTO_INCREMENT = 7`);

  return inserted;
};

// ---------------------------------------------------------------------------
// Values (ids 1-23), joined to their list by id AND key
// ---------------------------------------------------------------------------

const SEED_VALUES: ReadonlyArray<{
  id: number;
  listId: number;
  listKey: string;
  code: string;
  value: string;
  displayOrder: number;
}> = [
  // List 1 - kpi.unit_of_measure (UOM): ids 1-7.
  {
    id: 1,
    listId: 1,
    listKey: 'kpi.unit_of_measure',
    code: 'UOM-01',
    value: 'Percentage (%)',
    displayOrder: 1,
  },
  {
    id: 2,
    listId: 1,
    listKey: 'kpi.unit_of_measure',
    code: 'UOM-02',
    value: 'Count',
    displayOrder: 2,
  },
  {
    id: 3,
    listId: 1,
    listKey: 'kpi.unit_of_measure',
    code: 'UOM-03',
    value: 'Days',
    displayOrder: 3,
  },
  {
    id: 4,
    listId: 1,
    listKey: 'kpi.unit_of_measure',
    code: 'UOM-04',
    value: 'Score (0-100)',
    displayOrder: 4,
  },
  {
    id: 5,
    listId: 1,
    listKey: 'kpi.unit_of_measure',
    code: 'UOM-05',
    value: 'USD',
    displayOrder: 5,
  },
  {
    id: 6,
    listId: 1,
    listKey: 'kpi.unit_of_measure',
    code: 'UOM-06',
    value: 'Ratio',
    displayOrder: 6,
  },
  {
    id: 7,
    listId: 1,
    listKey: 'kpi.unit_of_measure',
    code: 'UOM-07',
    value: 'Yes/No',
    displayOrder: 7,
  },
  // List 2 - kpi.direction (DIR): ids 8-10.
  {
    id: 8,
    listId: 2,
    listKey: 'kpi.direction',
    code: 'DIR-01',
    value: 'Increase',
    displayOrder: 1,
  },
  {
    id: 9,
    listId: 2,
    listKey: 'kpi.direction',
    code: 'DIR-02',
    value: 'Decrease',
    displayOrder: 2,
  },
  {
    id: 10,
    listId: 2,
    listKey: 'kpi.direction',
    code: 'DIR-03',
    value: 'Maintain within range',
    displayOrder: 3,
  },
  // List 3 - kpi.measurement_frequency (FRQ): ids 11-14.
  {
    id: 11,
    listId: 3,
    listKey: 'kpi.measurement_frequency',
    code: 'FRQ-01',
    value: 'Monthly',
    displayOrder: 1,
  },
  {
    id: 12,
    listId: 3,
    listKey: 'kpi.measurement_frequency',
    code: 'FRQ-02',
    value: 'Quarterly',
    displayOrder: 2,
  },
  {
    id: 13,
    listId: 3,
    listKey: 'kpi.measurement_frequency',
    code: 'FRQ-03',
    value: 'Semi-annual',
    displayOrder: 3,
  },
  {
    id: 14,
    listId: 3,
    listKey: 'kpi.measurement_frequency',
    code: 'FRQ-04',
    value: 'Annual',
    displayOrder: 4,
  },
  // List 4 - kpi.level (KLV): ids 15-17.
  {
    id: 15,
    listId: 4,
    listKey: 'kpi.level',
    code: 'KLV-01',
    value: 'Strategic',
    displayOrder: 1,
  },
  {
    id: 16,
    listId: 4,
    listKey: 'kpi.level',
    code: 'KLV-02',
    value: 'Tactical',
    displayOrder: 2,
  },
  {
    id: 17,
    listId: 4,
    listKey: 'kpi.level',
    code: 'KLV-03',
    value: 'Operational',
    displayOrder: 3,
  },
  // List 5 - kpi.type (KTY): ids 18-19.
  {
    id: 18,
    listId: 5,
    listKey: 'kpi.type',
    code: 'KTY-01',
    value: 'Institutional',
    displayOrder: 1,
  },
  {
    id: 19,
    listId: 5,
    listKey: 'kpi.type',
    code: 'KTY-02',
    value: 'Customized',
    displayOrder: 2,
  },
  // List 6 - org.level (L, no dash): ids 20-23.
  {
    id: 20,
    listId: 6,
    listKey: 'org.level',
    code: 'L1',
    value: 'Division',
    displayOrder: 1,
  },
  {
    id: 21,
    listId: 6,
    listKey: 'org.level',
    code: 'L2',
    value: 'Department',
    displayOrder: 2,
  },
  {
    id: 22,
    listId: 6,
    listKey: 'org.level',
    code: 'L3',
    value: 'Office',
    displayOrder: 3,
  },
  {
    id: 23,
    listId: 6,
    listKey: 'org.level',
    code: 'L4',
    value: 'Unit',
    displayOrder: 4,
  },
];

export const seedControlListValues = async (
  runner: QueryRunner,
): Promise<number> => {
  let inserted = 0;
  for (const row of SEED_VALUES) {
    // The join checks the parent list by id AND key, so a drifted list row
    // inserts nothing for this value (the seed suite asserts ids 1-23, which
    // catches that silent skip).
    inserted += affectedRows(
      await runner.query(`
        INSERT INTO \`control_list_values\`
          (\`id\`, \`list_id\`, \`code\`, \`value\`, \`description\`, \`display_order\`, \`is_active\`)
        SELECT ${row.id}, l.\`id\`, '${row.code}', '${row.value}', NULL, ${row.displayOrder}, 1
        FROM \`control_lists\` l
        WHERE l.\`id\` = ${row.listId} AND l.\`list_key\` = '${row.listKey}'
          AND NOT EXISTS (
            SELECT 1 FROM \`control_list_values\` cv WHERE cv.\`id\` = ${row.id}
          )
      `),
    );
  }

  // AUTO_INCREMENT must start above the seeded ids for every admin-created
  // value.
  await runner.query(`ALTER TABLE \`control_list_values\` AUTO_INCREMENT = 24`);

  return inserted;
};
