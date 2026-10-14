import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, QueryRunner } from 'typeorm';
import {
  seedControlListCategories,
  seedControlListValues,
  seedControlLists,
} from '../src/db/seeds/control-lists.seed';

/**
 * Control Lists — seed idempotency and seeded rows against a REAL MySQL
 * connection (docs/specs/changes/control-lists-global-scope, T-01, J-1,
 * R-CLG-006, D-CLG-11).
 *
 * What it proves, on the schema the migrations created:
 *  - the three exported seed functions, called AGAIN, insert 0 rows (each
 *    returns the `affectedRows` it caused) and leave the seeded id ranges
 *    unchanged — a seed that inserts duplicates on a re-run turns this red;
 *  - the seeded rows are exactly categories 1-2, lists 1-6 and values 1-23,
 *    with their keys and codes, asserted from literals written HERE (not read
 *    back from the seed module, which would make the check circular), so a
 *    values seed whose join silently matches nothing turns it red too;
 *  - no portfolio column exists on categories or lists, and the next id any
 *    admin-created row receives sits above the seeded range;
 *  - the four migration files export only their migration class: a
 *    `showMigrations()` over exactly those files fails with the TypeORM
 *    "migration name is wrong" error (constructible function) or "someClass
 *    is not a constructor" (arrow/async export) when a non-class export is
 *    left in a migration file.
 *
 * Evidence DB: the requester's local database `ari_local_mysql`,
 * 127.0.0.1:3306/stardb. `ARI_TEST_MYSQL_*` resolve there (printed below) —
 * NOT a disposable schema, and the migrations are assumed EXECUTED already.
 * The only writes are (a) the seed functions' own `INSERT ... WHERE NOT
 * EXISTS` (0 rows) and `ALTER TABLE ... AUTO_INCREMENT` (a no-op: MySQL never
 * sets the counter below MAX(id) + 1), and (b) one scratch row per table to
 * observe the next id, deleted by its own id above the seeded range. This
 * suite NEVER updates or deletes a seeded row.
 *
 * Scope note (KZ-017): counts are asserted ON THE SEEDED ID RANGES, never on
 * table totals (other rows may exist, and sibling suites create scratch rows
 * above those ranges while this one runs). It does not run a migration (the
 * schema is created by `npm run migration:test:execute`).
 */
describe('Control Lists — seed idempotency and seeded rows against real MySQL (T-01, J-1)', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  const scratch: { table: string; id: number }[] = [];

  const SEEDED_CATEGORIES: ReadonlyArray<[number, string, number]> = [
    [1, 'Key Performance Indicators (KPIs)', 1],
    [2, 'Organizational structure', 2],
  ];

  // [id, category_id, list_key, name, code_prefix]
  const SEEDED_LISTS: ReadonlyArray<[number, number, string, string, string]> =
    [
      [1, 1, 'kpi.unit_of_measure', 'Unit of measure', 'UOM'],
      [2, 1, 'kpi.direction', 'Direction', 'DIR'],
      [3, 1, 'kpi.measurement_frequency', 'Measurement frequency', 'FRQ'],
      [4, 1, 'kpi.level', 'KPI level', 'KLV'],
      [5, 1, 'kpi.type', 'Type', 'KTY'],
      [6, 2, 'org.level', 'Organizational level', 'L'],
    ];

  // [id, list_id, list_key, code, value, display_order]
  const SEEDED_VALUES: ReadonlyArray<
    [number, number, string, string, string, number]
  > = [
    [1, 1, 'kpi.unit_of_measure', 'UOM-01', 'Percentage (%)', 1],
    [2, 1, 'kpi.unit_of_measure', 'UOM-02', 'Count', 2],
    [3, 1, 'kpi.unit_of_measure', 'UOM-03', 'Days', 3],
    [4, 1, 'kpi.unit_of_measure', 'UOM-04', 'Score (0-100)', 4],
    [5, 1, 'kpi.unit_of_measure', 'UOM-05', 'USD', 5],
    [6, 1, 'kpi.unit_of_measure', 'UOM-06', 'Ratio', 6],
    [7, 1, 'kpi.unit_of_measure', 'UOM-07', 'Yes/No', 7],
    [8, 2, 'kpi.direction', 'DIR-01', 'Increase', 1],
    [9, 2, 'kpi.direction', 'DIR-02', 'Decrease', 2],
    [10, 2, 'kpi.direction', 'DIR-03', 'Maintain within range', 3],
    [11, 3, 'kpi.measurement_frequency', 'FRQ-01', 'Monthly', 1],
    [12, 3, 'kpi.measurement_frequency', 'FRQ-02', 'Quarterly', 2],
    [13, 3, 'kpi.measurement_frequency', 'FRQ-03', 'Semi-annual', 3],
    [14, 3, 'kpi.measurement_frequency', 'FRQ-04', 'Annual', 4],
    [15, 4, 'kpi.level', 'KLV-01', 'Strategic', 1],
    [16, 4, 'kpi.level', 'KLV-02', 'Tactical', 2],
    [17, 4, 'kpi.level', 'KLV-03', 'Operational', 3],
    [18, 5, 'kpi.type', 'KTY-01', 'Institutional', 1],
    [19, 5, 'kpi.type', 'KTY-02', 'Customized', 2],
    [20, 6, 'org.level', 'L1', 'Division', 1],
    [21, 6, 'org.level', 'L2', 'Department', 2],
    [22, 6, 'org.level', 'L3', 'Office', 3],
    [23, 6, 'org.level', 'L4', 'Unit', 4],
  ];

  const countRange = async (table: string, max: number): Promise<number> => {
    const [row] = await dataSource.query(
      `SELECT COUNT(*) AS n FROM ${table} WHERE id BETWEEN 1 AND ${max}`,
    );
    return Number(row.n);
  };

  beforeAll(async () => {
    const host = process.env.ARI_TEST_MYSQL_HOST;
    const port = parseInt(process.env.ARI_TEST_MYSQL_PORT, 10);
    const database = process.env.ARI_TEST_MYSQL_NAME;
    console.log(
      `[control-lists-seed.integration-spec] resolved DB target: ${host}:${port}/${database}`,
    );

    dataSource = new DataSource({
      type: 'mysql',
      host,
      port,
      username: process.env.ARI_TEST_MYSQL_USER_NAME,
      password: process.env.ARI_TEST_MYSQL_USER_PASS,
      database,
      entities: [],
      synchronize: false,
      migrationsRun: false,
      logging: false,
      // Pool of 3 on purpose: the QueryRunner below keeps one connection while
      // the plain dataSource.query() assertions need another (a pool of 1
      // would deadlock). namedPlaceholders matches orm.config.ts: the seed SQL
      // passes no parameters, so the named-placeholder rewrite must be active
      // here exactly as it is in the migration run.
      extra: { connectionLimit: 3, namedPlaceholders: true },
    });
    await dataSource.initialize();
    runner = dataSource.createQueryRunner();
  });

  afterAll(async () => {
    try {
      // Scratch rows only, newest first (values before lists before
      // categories), each bounded above the seeded ranges.
      const bound: Record<string, number> = {
        control_list_values: 23,
        control_lists: 6,
        control_list_categories: 2,
      };
      for (const { table, id } of [...scratch].reverse()) {
        await dataSource.query(
          `DELETE FROM ${table} WHERE id = ? AND id > ${bound[table]}`,
          [id],
        );
      }
    } finally {
      if (runner) await runner.release();
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  describe('seeded rows (R-CLG-006 AC.1)', () => {
    it('has categories 1-2 with their names and display order', async () => {
      const rows = await dataSource.query(
        `SELECT id, name, display_order FROM control_list_categories WHERE id BETWEEN 1 AND 2 ORDER BY id`,
      );
      expect(
        rows.map((r: any) => [Number(r.id), r.name, Number(r.display_order)]),
      ).toEqual(SEEDED_CATEGORIES.map((c) => [...c]));
    });

    it('has lists 1-6 with their keys, names, categories and code prefixes', async () => {
      const rows = await dataSource.query(
        `SELECT id, category_id, list_key, name, code_prefix FROM control_lists WHERE id BETWEEN 1 AND 6 ORDER BY id`,
      );
      expect(
        rows.map((r: any) => [
          Number(r.id),
          Number(r.category_id),
          r.list_key,
          r.name,
          r.code_prefix,
        ]),
      ).toEqual(SEEDED_LISTS.map((l) => [...l]));
    });

    it('has values 1-23 with their lists, keys, codes and display order', async () => {
      const rows = await dataSource.query(
        `SELECT v.id, v.list_id, l.list_key, v.code, v.value, v.display_order
         FROM control_list_values v
         JOIN control_lists l ON l.id = v.list_id
         WHERE v.id BETWEEN 1 AND 23
         ORDER BY v.id`,
      );
      expect(
        rows.map((r: any) => [
          Number(r.id),
          Number(r.list_id),
          r.list_key,
          r.code,
          r.value,
          Number(r.display_order),
        ]),
      ).toEqual(SEEDED_VALUES.map((v) => [...v]));
    });

    it('seeds every row as active, and every list as a system list', async () => {
      const [inactive] = await dataSource.query(
        `SELECT
           (SELECT COUNT(*) FROM control_list_categories WHERE id BETWEEN 1 AND 2 AND is_active <> 1) AS c,
           (SELECT COUNT(*) FROM control_lists WHERE id BETWEEN 1 AND 6 AND (is_active <> 1 OR is_system <> 1)) AS l,
           (SELECT COUNT(*) FROM control_list_values WHERE id BETWEEN 1 AND 23 AND is_active <> 1) AS v`,
      );
      expect([
        Number(inactive.c),
        Number(inactive.l),
        Number(inactive.v),
      ]).toEqual([0, 0, 0]);
    });
  });

  describe('re-running the seed functions (R-CLG-006 *Run twice*, J-1)', () => {
    it('seedControlListCategories inserts 0 rows and leaves ids 1-2 unchanged', async () => {
      await expect(seedControlListCategories(runner)).resolves.toBe(0);
      expect(await countRange('control_list_categories', 2)).toBe(2);
    });

    it('seedControlLists inserts 0 rows and leaves ids 1-6 unchanged', async () => {
      await expect(seedControlLists(runner)).resolves.toBe(0);
      expect(await countRange('control_lists', 6)).toBe(6);
    });

    it('seedControlListValues inserts 0 rows and leaves ids 1-23 unchanged', async () => {
      await expect(seedControlListValues(runner)).resolves.toBe(0);
      expect(await countRange('control_list_values', 23)).toBe(23);
    });

    it('leaves the seeded rows exactly as asserted above after a full re-run', async () => {
      await seedControlListCategories(runner);
      await seedControlLists(runner);
      await seedControlListValues(runner);

      const rows = await dataSource.query(
        `SELECT id, code FROM control_list_values WHERE id BETWEEN 1 AND 23 ORDER BY id`,
      );
      expect(rows.map((r: any) => [Number(r.id), r.code])).toEqual(
        SEEDED_VALUES.map((v) => [v[0], v[3]]),
      );
    });
  });

  describe('schema and auto-increment (R-CLG-006 AC.2)', () => {
    it('has no portfolio_id column on control_list_categories or control_lists', async () => {
      const categories = await dataSource.query(
        `SHOW COLUMNS FROM control_list_categories LIKE 'portfolio_id'`,
      );
      const lists = await dataSource.query(
        `SHOW COLUMNS FROM control_lists LIKE 'portfolio_id'`,
      );
      expect([categories.length, lists.length]).toEqual([0, 0]);
    });

    // The AUTO_INCREMENT reset: the first admin-created row of each table must
    // land above the seeded range, never collide with it.
    it('gives the next admin-created category, list and value an id above the seeded ranges', async () => {
      const stamp = `__seed_it__${Date.now()}`;

      const category = await dataSource.query(
        `INSERT INTO control_list_categories (name, display_order, is_active, created_at) VALUES (?, 0, 1, NOW())`,
        [stamp],
      );
      scratch.push({ table: 'control_list_categories', id: category.insertId });
      expect(Number(category.insertId)).toBeGreaterThan(2);

      const list = await dataSource.query(
        `INSERT INTO control_lists (category_id, list_key, name, code_prefix, is_system, is_active, created_at)
         VALUES (?, ?, ?, 'SEED', 0, 1, NOW())`,
        [category.insertId, stamp, stamp],
      );
      scratch.push({ table: 'control_lists', id: list.insertId });
      expect(Number(list.insertId)).toBeGreaterThan(6);

      const value = await dataSource.query(
        `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
         VALUES (?, 'SEED-01', ?, 0, 1, NOW())`,
        [list.insertId, stamp],
      );
      scratch.push({ table: 'control_list_values', id: value.insertId });
      expect(Number(value.insertId)).toBeGreaterThan(23);
    });
  });

  // K-006 / design §10 "Migration loading": TypeORM treats EVERY exported
  // function of a file under `migrations/**` as a migration. `showMigrations()`
  // loads the files through the same loader, so a non-class export left in a
  // migration file fails here. Two error forms were observed: a constructible
  // function (e.g. a `seed...` function) fails with "migration name is wrong";
  // an arrow/async export fails with "someClass is not a constructor"
  // (T-01 A-ADV-4).
  describe('migration files export only their class (D-CLG-11)', () => {
    it('lists the four control-list migrations with no loader error', async () => {
      const loader = new DataSource({
        type: 'mysql',
        host: process.env.ARI_TEST_MYSQL_HOST,
        port: parseInt(process.env.ARI_TEST_MYSQL_PORT, 10),
        username: process.env.ARI_TEST_MYSQL_USER_NAME,
        password: process.env.ARI_TEST_MYSQL_USER_PASS,
        database: process.env.ARI_TEST_MYSQL_NAME,
        entities: [],
        synchronize: false,
        migrationsRun: false,
        logging: false,
        migrationsTableName: 'migrations',
        migrations: [
          `${__dirname}/../src/db/migrations/17909000000{00,01,02,03}-*{.ts,.js}`,
        ],
        extra: { connectionLimit: 3, namedPlaceholders: true },
      });
      await loader.initialize();
      try {
        expect(loader.migrations.map((m) => m.constructor.name).sort()).toEqual(
          [
            'CreateControlListCategories1790900000000',
            'CreateControlListValuePortfolios1790900000003',
            'CreateControlListValues1790900000002',
            'CreateControlLists1790900000001',
          ],
        );
        // Throws "migration name is wrong" (constructible function) or
        // "someClass is not a constructor" (arrow/async) for a non-class export.
        // Resolves to `true` only when a listed migration is still pending,
        // which would mean the schema above was not migrated.
        await expect(loader.showMigrations()).resolves.toBe(false);
      } finally {
        await loader.destroy();
      }
    });
  });
});
