// @akili-spec docs/specs/changes/innovation-use-required-fields
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import {
  createClarisaInstitutionTypesHarness,
  ClarisaInstitutionTypesHarness,
} from './nest-harness';

/**
 * T-14 (`docs/specs/changes/innovation-use-required-fields`) — backs
 * `R-IUR-008` AC.4 + S2's "AND IT MUST evaluate 'has sub-types' from the
 * same source of truth on both surfaces" (`DD-5`, incl. `N-7`).
 *
 * **Architecture decision (recorded here per `tasks.md` T-14's "the
 * implementer decides and records which").** `tasks.md` offered two
 * shapes: a client-side jsdom enumeration, or a server-side fixture. The
 * CLARISA institution-type catalog is reachable ONLY server-side — the
 * client never fetches the whole tree, only per-type slices via
 * `GET_SubInstitutionTypes` — so option (1), a fixture under
 * `test/fixtures/`, is the only one that can query the REAL catalog at
 * all. Concretely: the 42 real rows are copied (read-only `SELECT`, see
 * below) from Dev into the disposable `ari_scratch_test` schema (whose own
 * `clarisa_institution_types` is a schema-only snapshot — 0 rows), then
 * enumerated inside the normal `npm run test:fixtures` harness so `T-19`
 * can reuse the same pattern. This keeps the proof reproducible and
 * disposable rather than coupling a committed test to the shared,
 * NOT-disposable Dev database (`CLAUDE.md` §4.3) at run time.
 *
 * **Catalog snapshot provenance.** The 42 rows in `REAL_CATALOG` below are
 * a literal, one-time copy of `SELECT code, name, parent_code, is_active
 * FROM clarisa_institution_types ORDER BY code` run **read-only** against
 * Dev (`192.168.20.210:3306/alliancereportingdb`) on 2026-09-07. Every row
 * in the live catalog that day was `is_active = 1` — there is no inactive
 * row in Dev to exercise `N-7` (an inactive child) with real data, so that
 * case is covered by one explicit synthetic pair, kept out of the "42"
 * count and its own dedicated assertion (see `SYNTHETIC_*` below and the
 * `N-7` test). **Cannot prove:** that the *deployed* catalog still matches
 * this snapshot — re-running the source `SELECT` against Dev is the only
 * way to refresh it.
 *
 * **The two predicates under test, per `DD-5`:**
 * - **Client:** `subTypesService.list(typeId)` is non-empty ⇔
 *   `ClarisaInstitutionTypesService.getInstitutionTypesByDepthLevel(typeId, 2)`
 *   returns ≥ 1 row ⇔ `typeId` is `is_active`, is a ROOT
 *   (`parent_code IS NULL`), and has ≥ 1 child at depth 2 (any child,
 *   active or not — the join TypeORM issues via
 *   `relations: { children: { children: true } }` is unconditioned).
 * - **SQL (`DD-5`'s decision, what `T-18`'s migration must write):**
 *   `t.parent_code IS NULL AND t.is_active = TRUE AND EXISTS (SELECT 1
 *   FROM clarisa_institution_types c WHERE c.parent_code = t.code)` — `
 *   is_active` binds to the PARENT only, never to `c` (`N-7`).
 * - **Naive/buggy mirror (`DC-3`, what this task proves is wrong):**
 *   `EXISTS (SELECT 1 FROM clarisa_institution_types c WHERE
 *   c.parent_code = t.code)` alone — no root filter, no `is_active`.
 * - **Over-narrow mirror (`N-7`'s trap, what a "more careful-looking" fix
 *   would wrongly write):** the same as the SQL predicate above but with
 *   `AND c.is_active = TRUE` added to the `EXISTS` — this filters children
 *   by activity, which the client's own query does NOT do.
 *
 * **Root-only invariant (`DD-5`: "the invariant is therefore an explicit
 * truth-table case").** The `Organization type` dropdown is fed by
 * `GET_SubInstitutionTypes(1)`, so in normal use `institution_type_id` is
 * always a root code. This is NOT assumed here — the enumeration below
 * runs over all 42 real codes, roots and non-roots alike, so the 33
 * non-root codes are the concrete evidence that the invariant holds: both
 * predicates agree (both `false`) for every one of them under the correct
 * SQL, and disagree for exactly the 8 that have children under the naive
 * one. That 8-way disagreement IS the invariant's failure mode made
 * visible — it is what "the dropdown offers a non-root type" would look
 * like on the SQL side.
 *
 * **Disqualifier honored:** this file never touches a mocked sub-types
 * service — every assertion below calls either the REAL
 * `ClarisaInstitutionTypesService` (via `./nest-harness`, same class the
 * client controller path uses) or REAL SQL executed by MySQL itself
 * (`DC-4` — verified by execution, not by a mocked query builder).
 */

interface CatalogRow {
  code: number;
  name: string;
  parent_code: number | null;
  is_active: true;
}

/**
 * Measured against Dev 2026-09-07: TOTAL 42, root+active 9 (5 with
 * children, 4 childless), non-root-with-children 8 — all of them active
 * (codes 38, 41, 44, 47, 51, 55, 58, 61), the `DD-5` falsifying case.
 */
const REAL_CATALOG: CatalogRow[] = [
  { code: 37, name: 'NGO', parent_code: null, is_active: true },
  { code: 38, name: 'NGO International', parent_code: 37, is_active: true },
  {
    code: 39,
    name: 'NGO International (General)',
    parent_code: 38,
    is_active: true,
  },
  {
    code: 40,
    name: 'NGO International (Farmers)',
    parent_code: 38,
    is_active: true,
  },
  { code: 41, name: 'NGO Regional', parent_code: 37, is_active: true },
  {
    code: 42,
    name: 'NGO Regional (General)',
    parent_code: 41,
    is_active: true,
  },
  {
    code: 43,
    name: 'NGO Regional (Farmers)',
    parent_code: 41,
    is_active: true,
  },
  { code: 44, name: 'NGO National', parent_code: 37, is_active: true },
  {
    code: 45,
    name: 'NGO National (General)',
    parent_code: 44,
    is_active: true,
  },
  {
    code: 46,
    name: 'NGO National (Farmers)',
    parent_code: 44,
    is_active: true,
  },
  { code: 47, name: 'NGO Local', parent_code: 37, is_active: true },
  {
    code: 48,
    name: 'NGO Local (General)',
    parent_code: 47,
    is_active: true,
  },
  {
    code: 49,
    name: 'NGO Local (Farmers)',
    parent_code: 47,
    is_active: true,
  },
  {
    code: 50,
    name: 'Research organizations and universities',
    parent_code: null,
    is_active: true,
  },
  {
    code: 51,
    name: 'Research organizations and universities International',
    parent_code: 50,
    is_active: true,
  },
  {
    code: 52,
    name: 'Research organizations and universities International (General)',
    parent_code: 51,
    is_active: true,
  },
  {
    code: 53,
    name: 'Research organizations and universities International (Universities)',
    parent_code: 51,
    is_active: true,
  },
  {
    code: 54,
    name: 'Research organizations and universities International (CGIAR)',
    parent_code: 51,
    is_active: true,
  },
  {
    code: 55,
    name: 'Research organizations and universities Regional',
    parent_code: 50,
    is_active: true,
  },
  {
    code: 56,
    name: 'Research organizations and universities Regional (NA)',
    parent_code: 55,
    is_active: true,
  },
  {
    code: 57,
    name: 'Research organizations and universities Regional (Universities)',
    parent_code: 55,
    is_active: true,
  },
  {
    code: 58,
    name: 'Research organizations and universities National',
    parent_code: 50,
    is_active: true,
  },
  {
    code: 59,
    name: 'Research organizations and universities National (NARS)',
    parent_code: 58,
    is_active: true,
  },
  {
    code: 60,
    name: 'Research organizations and universities National (Universities)',
    parent_code: 58,
    is_active: true,
  },
  {
    code: 61,
    name: 'Research organizations and universities Local',
    parent_code: 50,
    is_active: true,
  },
  {
    code: 62,
    name: 'Research organizations and universities Local (NA)',
    parent_code: 61,
    is_active: true,
  },
  {
    code: 63,
    name: 'Research organizations and universities Local (Universities)',
    parent_code: 61,
    is_active: true,
  },
  {
    code: 64,
    name: 'Organization (other than financial or research)',
    parent_code: null,
    is_active: true,
  },
  {
    code: 65,
    name: 'Organization (other than financial or research) International',
    parent_code: 64,
    is_active: true,
  },
  {
    code: 66,
    name: 'Organization (other than financial or research) Regional',
    parent_code: 64,
    is_active: true,
  },
  { code: 67, name: 'Government', parent_code: null, is_active: true },
  {
    code: 68,
    name: 'Government (National)',
    parent_code: 67,
    is_active: true,
  },
  {
    code: 69,
    name: 'Government (Subnational)',
    parent_code: 67,
    is_active: true,
  },
  {
    code: 70,
    name: 'Financial Institution',
    parent_code: null,
    is_active: true,
  },
  {
    code: 71,
    name: 'Financial Institution International',
    parent_code: 70,
    is_active: true,
  },
  {
    code: 72,
    name: 'Financial Institution Regional',
    parent_code: 70,
    is_active: true,
  },
  {
    code: 73,
    name: 'Financial Institution National',
    parent_code: 70,
    is_active: true,
  },
  {
    code: 74,
    name: 'Financial Institution Local',
    parent_code: 70,
    is_active: true,
  },
  {
    code: 75,
    name: 'Private company (other than financial)',
    parent_code: null,
    is_active: true,
  },
  {
    code: 76,
    name: 'Public-Private Partnership',
    parent_code: null,
    is_active: true,
  },
  { code: 77, name: 'Foundation', parent_code: null, is_active: true },
  { code: 78, name: 'Other', parent_code: null, is_active: true },
];

const REAL_CATALOG_SIZE_MEASURED_ON_DEV = 42;
const EXPECTED_NAIVE_DIVERGENCE_CODES = [38, 41, 44, 47, 51, 55, 58, 61];

/**
 * `N-7` synthetic pair — private codes, outside the real catalog's 37-78
 * range and outside every sibling `*.fixture-spec.ts`'s declared private
 * band (900_000-900_700, 9147/9148, 902_0xx, 900_86x, 9161-9166; grepped
 * 2026-09-07, zero hits for the 970_xxx band reserved here).
 */
const SYNTHETIC_ROOT_CODE = 970_001; // active, root, one child
const SYNTHETIC_CHILD_CODE = 970_002; // INACTIVE child of SYNTHETIC_ROOT_CODE

const ALL_INSERTED_CODES = [
  ...REAL_CATALOG.map((r) => r.code),
  SYNTHETIC_ROOT_CODE,
  SYNTHETIC_CHILD_CODE,
];

interface SqlPredicateRow {
  code: number;
  requires_subtype_correct: number;
  requires_subtype_naive: number;
  requires_subtype_child_filtered: number;
}

async function fetchSqlPredicates(
  codes: number[],
): Promise<Map<number, SqlPredicateRow>> {
  const placeholders = codes.map(() => '?').join(',');
  const rows: SqlPredicateRow[] = await dataSource.query(
    `SELECT
       t.code AS code,
       (t.parent_code IS NULL AND t.is_active = TRUE AND EXISTS (
          SELECT 1 FROM clarisa_institution_types c
          WHERE c.parent_code = t.code
       )) AS requires_subtype_correct,
       EXISTS (
          SELECT 1 FROM clarisa_institution_types c
          WHERE c.parent_code = t.code
       ) AS requires_subtype_naive,
       (t.parent_code IS NULL AND t.is_active = TRUE AND EXISTS (
          SELECT 1 FROM clarisa_institution_types c
          WHERE c.parent_code = t.code AND c.is_active = TRUE
       )) AS requires_subtype_child_filtered
     FROM clarisa_institution_types t
     WHERE t.code IN (${placeholders})`,
    codes,
  );
  return new Map(rows.map((r) => [Number(r.code), r]));
}

async function clientRendersSelect(
  harness: ClarisaInstitutionTypesHarness,
  code: number,
): Promise<boolean> {
  const items = await harness.service.getInstitutionTypesByDepthLevel(code, 2);
  return items.length > 0;
}

describe('T-14 — sub-type predicate agrees with SQL across the whole catalog', () => {
  let harness: ClarisaInstitutionTypesHarness;

  beforeAll(async () => {
    await dataSource.initialize();
    harness = await createClarisaInstitutionTypesHarness(1);

    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (const row of REAL_CATALOG) {
      placeholders.push('(?, ?, ?, ?)');
      values.push(row.code, row.name, row.parent_code, row.is_active);
    }
    // Synthetic N-7 pair.
    placeholders.push('(?, ?, ?, ?)');
    values.push(
      SYNTHETIC_ROOT_CODE,
      'T-14 N-7 synthetic root (active)',
      null,
      true,
    );
    placeholders.push('(?, ?, ?, ?)');
    values.push(
      SYNTHETIC_CHILD_CODE,
      'T-14 N-7 synthetic child (INACTIVE)',
      SYNTHETIC_ROOT_CODE,
      false,
    );

    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active)
       VALUES ${placeholders.join(', ')}`,
      values,
    );
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      // `clarisa_institution_types.parent_code` is a SELF-referencing FK
      // (`FK_5bb4b590a7a2fa58ebd39e6289d`), no `ON DELETE CASCADE`. A single
      // multi-row `DELETE ... WHERE code IN (...)` over a real tree (root
      // -> child -> grandchild, e.g. 37 -> 38 -> 39) can attempt to remove
      // a parent row before its still-present child in the same statement
      // and abort the whole DELETE with `ER_ROW_IS_REFERENCED_2` — observed
      // directly while writing this cleanup (K-004). Delete bottom-up
      // instead: repeat, each pass removing only codes that are no longer
      // any other still-present row's `parent_code`, until nothing remains.
      // The "not currently a parent" subquery must be wrapped in a derived
      // table — MySQL refuses a bare subquery on the same table being
      // deleted from ("You can't specify target table ... for update in
      // FROM clause"), also observed directly while writing this cleanup.
      let remaining = [...ALL_INSERTED_CODES];
      for (
        let pass = 0;
        pass < ALL_INSERTED_CODES.length && remaining.length;
        pass++
      ) {
        const placeholders = remaining.map(() => '?').join(',');
        await dataSource
          .query(
            `DELETE FROM clarisa_institution_types
             WHERE code IN (${placeholders})
               AND code NOT IN (
                 SELECT parent_code FROM (
                   SELECT DISTINCT parent_code FROM clarisa_institution_types
                   WHERE parent_code IS NOT NULL
                 ) AS still_referenced
               )`,
            remaining,
          )
          .catch(() => undefined);

        const stillPresent: Array<{ code: number | string }> = await dataSource
          .query(
            `SELECT code FROM clarisa_institution_types WHERE code IN (${placeholders})`,
            remaining,
          )
          .catch(() => [] as Array<{ code: number | string }>);
        remaining = stillPresent.map((r) => Number(r.code));
      }
      await dataSource.destroy();
    }
    if (harness) {
      await harness.close();
    }
  });

  it('K-004/KZ-017 baseline: the seeded real catalog is the full 42, not a sample', () => {
    expect(REAL_CATALOG.length).toBe(REAL_CATALOG_SIZE_MEASURED_ON_DEV);
  });

  it('enumerates all 42 real catalog types: client and correct-SQL predicates agree, zero divergences', async () => {
    const codes = REAL_CATALOG.map((r) => r.code);
    const sqlByCode = await fetchSqlPredicates(codes);

    const divergences: Array<{
      code: number;
      client: boolean;
      sql: boolean;
    }> = [];
    for (const code of codes) {
      const client = await clientRendersSelect(harness, code);
      const sql = !!sqlByCode.get(code)?.requires_subtype_correct;
      if (client !== sql) {
        divergences.push({ code, client, sql });
      }
    }

    console.log(
      `T-14 catalog enumeration: ${codes.length} types checked ` +
        `(Dev real size measured 2026-09-07: ${REAL_CATALOG_SIZE_MEASURED_ON_DEV}), ` +
        `${divergences.length} divergences: ${JSON.stringify(divergences)}`,
    );

    expect(codes.length).toBe(REAL_CATALOG_SIZE_MEASURED_ON_DEV);
    expect(divergences).toEqual([]);
  });

  it('K-004: the naive EXISTS(parent_code = type) mirror reddens on exactly the 8 active non-root types with children', async () => {
    const codes = REAL_CATALOG.map((r) => r.code);
    const sqlByCode = await fetchSqlPredicates(codes);

    const divergentCodes: number[] = [];
    for (const code of codes) {
      const client = await clientRendersSelect(harness, code);
      const naive = !!sqlByCode.get(code)?.requires_subtype_naive;
      if (client !== naive) {
        divergentCodes.push(code);
      }
    }
    divergentCodes.sort((a, b) => a - b);

    console.log(
      `T-14 naive-EXISTS mutation over ${codes.length} types: ` +
        `${divergentCodes.length} divergences: [${divergentCodes.join(', ')}]`,
    );

    expect(divergentCodes).toEqual(EXPECTED_NAIVE_DIVERGENCE_CODES);
  });

  it('N-7: an inactive child of an active root still makes the client render a sub-type select; the correct SQL agrees; a child-`is_active`-filtered mirror wrongly disagrees', async () => {
    const client = await clientRendersSelect(harness, SYNTHETIC_ROOT_CODE);
    const sqlByCode = await fetchSqlPredicates([SYNTHETIC_ROOT_CODE]);
    const row = sqlByCode.get(SYNTHETIC_ROOT_CODE);

    expect(client).toBe(true);
    expect(!!row?.requires_subtype_correct).toBe(true);
    expect(!!row?.requires_subtype_child_filtered).toBe(false);
  });

  it('root-only invariant: every one of the 33 non-root real types agrees with the client under the correct SQL (both false)', async () => {
    const nonRootCodes = REAL_CATALOG.filter((r) => r.parent_code !== null).map(
      (r) => r.code,
    );
    expect(nonRootCodes.length).toBe(33);

    const sqlByCode = await fetchSqlPredicates(nonRootCodes);
    for (const code of nonRootCodes) {
      const client = await clientRendersSelect(harness, code);
      const sql = !!sqlByCode.get(code)?.requires_subtype_correct;
      expect({ code, client, sql }).toEqual({
        code,
        client: false,
        sql: false,
      });
    }
  });
});
