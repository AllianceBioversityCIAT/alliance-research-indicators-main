import { DataSource, SelectQueryBuilder } from 'typeorm';
import { dataSource as rawTestDataSource } from '../../../src/db/config/mysql/orm.test.config';
import { ResultInnovationUseService } from '../../../src/domain/entities/result-innovation-use/result-innovation-use.service';

/**
 * T-01 (`docs/specs/innovation-use/dev-card-details`) — `design.md` §3.1,
 * §3.2, §5.1, §11 limit 3, `DD-3`, `DD-4`. `DC-14`'s ONLY home
 * (`NFR-IUC-001`'s disqualifier, rewritten in revision 3 to hold
 * unconditionally): a mocked-repository call-count assertion — see the
 * sibling unit-test `describe('readInnovationDevCardFacts …')` block in
 * `result-innovation-use.service.spec.ts` — proves the CALL, never the
 * emitted SQL, whatever query API is used. This file asserts the REAL SQL
 * `readInnovationDevCardFacts` produces against a REAL MySQL connection, by
 * wrapping (never replacing) `SelectQueryBuilder.prototype.getQuery` with a
 * `jest.spyOn` — the query still executes normally; the spy only lets this
 * file inspect the SQL text `getOne()` sends to the driver
 * (`QueryBuilder.getQueryAndParameters()` calls `this.getQuery()`
 * immediately before escaping and executing —
 * `node_modules/typeorm/query-builder/QueryBuilder.js`,
 * `getQueryAndParameters`).
 *
 * **Why this file does NOT use `./nest-harness`'s `createInnovationUseHarness`
 * (deviation from the exemplar, recorded rather than silently done).**
 * Verified 2026-09-10, reproduced against this branch's committed HEAD with
 * every change from this task stashed out: `createInnovationUseHarness`
 * fails to compile its `TestingModule` with
 * `Nest cannot create the ResultPolicyChangeModule instance. The module at
 * index [0] of the ResultPolicyChangeModule "imports" array is undefined`
 * — a pre-existing circular-import ordering defect in the production
 * module graph (`ResultPolicyChangeModule` → `LinkResultsModule` →
 * `ResultsModule`, resolved differently under ts-jest's require order than
 * under the app's normal bootstrap), **unrelated to this task and out of
 * this task's scope to fix** (T-01 touches exactly three files; a
 * cross-module circular-dependency fix is not one of them). Rather than
 * leave `DC-14` unverified, this file reaches the SAME property — a REAL
 * MySQL connection driving the REAL `ResultInnovationUseService` class —
 * by the same connection discipline `smoke.fixture-spec.ts` already uses:
 * the raw `dataSource` export from `orm.test.config.ts`
 * (`getDataSource(TEST, false)`, whose `entities` glob covers `Result`,
 * `ResultInnovationDev`, `ClarisaGeoScope` and
 * `ClarisaInnovationReadinessLevel` — `orm.config.ts:18-23`), initialized
 * directly and passed to a manually-constructed `ResultInnovationUseService`
 * instance. `readInnovationDevCardFacts` reads only `this.dataSource`
 * (verified against the class body) — every other constructor parameter is
 * a plain stub object, never invoked by this file's calls.
 *
 * `readInnovationDevCardFacts` is PRIVATE — not yet wired into `findOne`
 * (that is T-02's scope). Called here via a bracket-notation cast on the
 * real service instance, the same pattern the sibling unit-test spec uses.
 *
 * **Band (FP-45).** Every sibling `*.fixture-spec.ts` header in this
 * directory was grepped 2026-09-10 for its declared `result_official_code`
 * band: `900_000`–`900_900`, `901_000`–`901_0xx`, `902_000`–`902_400`,
 * `970_xxx` (`institution-type-subtype-catalog-equivalence`), `971_2xx`
 * (`innovation-use-validation`, T-19). Zero hits for `903_xxx`. This file
 * reserves `903_000` for `results.result_official_code` and `903_0xx` for
 * every private CLARISA row it seeds below. Report year `2903` and
 * platform code `T01IDCF` are both new (distinct from every reserved
 * year/code in every sibling header). Report year `2903` was tried first
 * and rejected by MySQL's `year` column type (`report_years.report_year`,
 * valid range 1901–2155) — `2115` is the value actually used, still
 * distinct from every sibling's `2096`–`2114`.
 *
 * **Why `clarisa_innovation_readiness_levels` and `clarisa_geo_scope` rows
 * are seeded privately here, not reused from a shared catalog.** Verified
 * 2026-09-10: neither table carries a data-seeding migration (only the
 * `CREATE TABLE` migrations exist), and the committed baseline
 * (`src/db/baseline/baseline.sql`) carries zero `INSERT` rows for either —
 * except `clarisa_geo_scope.code = 50`
 * (`1733239265272-InsertGeoScope50.ts`,
 * `ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED`), which this file
 * reuses AS-IS for the `geo_scope_id = 50` acceptance case (`R-IUC-002`
 * AC.5) — never created or torn down here, matching the "migration-seeded,
 * never touched" discipline every sibling fixture already applies to its
 * own pre-existing rows.
 */
describe('readInnovationDevCardFacts — the shared read, real MySQL (T-01, dev-card-details)', () => {
  const reportYear = 2115;
  const platformCode = 'T01IDCF';

  const readinessIdFull = 903_001; // level 7 + name both present
  const readinessIdPartial = 903_002; // level NULL, name present — DD-9

  const geoScopeCodePrivate = 903_010;
  // Code 50 is migration-seeded and reused, never created/torn down here.
  const geoScopeCode50 = 50;

  let dataSource: DataSource;
  let service: ResultInnovationUseService;

  let platformSeeded = false;
  let reportYearSeeded = false;

  let nextCode = 903_000_000_000 + Date.now();
  function nextOfficialCode(): number {
    return nextCode++;
  }

  const seededResultIds: number[] = [];

  async function insertResult(
    description: string | null,
    geoScopeId: number | null,
  ): Promise<number> {
    const officialCode = nextOfficialCode();
    const inserted = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id, description, geo_scope_id)
       VALUES (1, ?, ?, ?, 0, NULL, ?, ?)`,
      [officialCode, platformCode, reportYear, description, geoScopeId],
    );
    const resultId = inserted.insertId as number;
    seededResultIds.push(resultId);
    return resultId;
  }

  async function insertDetail(
    resultId: number,
    isActive: boolean,
    innovationReadinessId: number | null,
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO result_innovation_dev (result_id, is_active, innovation_readiness_id)
       VALUES (?, ?, ?)`,
      [resultId, isActive, innovationReadinessId],
    );
  }

  // Bracket-notation cast — see file header. Typed narrowly to the one
  // method under test.
  function readFacts(resultId: number): Promise<{
    innovation_readiness: {
      id: number;
      level: number | null;
      name: string | null;
    } | null;
    description: string | null;
    geo_scope: { code: number; name: string | null } | null;
  }> {
    return (
      service as unknown as {
        readInnovationDevCardFacts: typeof readFacts;
      }
    ).readInnovationDevCardFacts(resultId);
  }

  beforeAll(async () => {
    dataSource = rawTestDataSource;
    await dataSource.initialize();

    // Every constructor parameter besides `dataSource` is unused by
    // `readInnovationDevCardFacts` (verified against the class body) —
    // plain stand-ins, never invoked by this file's calls.
    service = new ResultInnovationUseService(
      dataSource,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [platformCode],
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'T-01 dev-card-details shared-read fixture platform')`,
        [platformCode],
      );
      platformSeeded = true;
    }

    const [existingYear] = await dataSource.query(
      `SELECT report_year FROM report_years WHERE report_year = ?`,
      [reportYear],
    );
    if (!existingYear) {
      await dataSource.query(
        `INSERT INTO report_years (report_year) VALUES (?)`,
        [reportYear],
      );
      reportYearSeeded = true;
    }

    await dataSource.query(
      `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, ?, ?)`,
      [readinessIdFull, 7, 'Widely used'],
    );
    await dataSource.query(
      `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, ?, ?)`,
      [readinessIdPartial, null, 'Piloted'],
    );

    await dataSource.query(
      `INSERT INTO clarisa_geo_scope (code, name) VALUES (?, ?)`,
      [geoScopeCodePrivate, 'T-01 private geo scope'],
    );

    // Code 50 is recorded as migration-applied in this scratch schema
    // (`migrations` table carries `InsertGeoScope501733239265272`) but the
    // ROW itself is absent — verified 2026-09-10 by direct query, cause
    // unknown (likely a prior fixture's broad cleanup). `INSERT IGNORE`
    // mirrors the exact precedent `innovation-use-result-creation
    // .fixture-spec.ts` already uses for `clarisa_geo_scope` code 1
    // ("Global"): treat the row as a shared catalog constant this fixture
    // does not own, restore it if missing, never delete it in `afterAll`.
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_geo_scope (code, name) VALUES (?, ?)`,
      [geoScopeCode50, 'This is yet to be determined'],
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) {
      return;
    }

    for (const resultId of seededResultIds) {
      await dataSource.query(
        `DELETE FROM result_innovation_dev WHERE result_id = ?`,
        [resultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        resultId,
      ]);
    }

    await dataSource.query(`DELETE FROM clarisa_geo_scope WHERE code = ?`, [
      geoScopeCodePrivate,
    ]);
    await dataSource.query(
      `DELETE FROM clarisa_innovation_readiness_levels WHERE id IN (?, ?)`,
      [readinessIdFull, readinessIdPartial],
    );

    if (reportYearSeeded) {
      await dataSource.query(`DELETE FROM report_years WHERE report_year = ?`, [
        reportYear,
      ]);
    }
    if (platformSeeded) {
      await dataSource.query(
        `DELETE FROM reporting_platforms WHERE platform_code = ?`,
        [platformCode],
      );
    }

    await dataSource.destroy();
  });

  it('KZ-006 — connects to the TEST datasource and resolves the real ResultInnovationUseService', () => {
    expect(dataSource.isInitialized).toBe(true);
    expect(service).toBeInstanceOf(ResultInnovationUseService);
    expect(typeof (service as any).readInnovationDevCardFacts).toBe('function');
  });

  it('AC.1 — active detail row + readiness present: all three facts return', async () => {
    const resultId = await insertResult(
      'AC.1 sentinel description.',
      geoScopeCodePrivate,
    );
    await insertDetail(resultId, true, readinessIdFull);

    const facts = await readFacts(resultId);

    expect(facts.innovation_readiness).toEqual({
      id: readinessIdFull,
      level: 7,
      name: 'Widely used',
    });
    expect(facts.description).toBe('AC.1 sentinel description.');
    expect(facts.geo_scope).toEqual({
      code: geoScopeCodePrivate,
      name: 'T-01 private geo scope',
    });
  });

  it('AC.2 — no detail row at all: innovation_readiness is null, description and geo_scope still return (this is the parent row DD-3/DD-4 exist to keep)', async () => {
    const resultId = await insertResult(
      'AC.2 sentinel — no detail row.',
      geoScopeCodePrivate,
    );
    // Deliberately no result_innovation_dev row inserted.

    const facts = await readFacts(resultId);

    expect(facts.innovation_readiness).toBeNull();
    expect(facts.description).toBe('AC.2 sentinel — no detail row.');
    expect(facts.geo_scope).toEqual({
      code: geoScopeCodePrivate,
      name: 'T-01 private geo scope',
    });
  });

  it('AC.3 — a detail row exists but is_active = FALSE: same as no row — description and geo_scope are unaffected', async () => {
    const resultId = await insertResult(
      'AC.3 sentinel — inactive detail row.',
      geoScopeCodePrivate,
    );
    await insertDetail(resultId, false, readinessIdFull);

    const facts = await readFacts(resultId);

    expect(facts.innovation_readiness).toBeNull();
    expect(facts.description).toBe('AC.3 sentinel — inactive detail row.');
    expect(facts.geo_scope).toEqual({
      code: geoScopeCodePrivate,
      name: 'T-01 private geo scope',
    });
  });

  it('AC.4 — innovation_readiness_id is NULL on an active detail row: innovation_readiness is null', async () => {
    const resultId = await insertResult(null, null);
    await insertDetail(resultId, true, null);

    const facts = await readFacts(resultId);

    expect(facts.innovation_readiness).toBeNull();
  });

  it('AC.5 — level NULL, name present: the object returns with level: null — NOT collapsed to a bare null (DD-9)', async () => {
    const resultId = await insertResult(null, null);
    await insertDetail(resultId, true, readinessIdPartial);

    const facts = await readFacts(resultId);

    expect(facts.innovation_readiness).toEqual({
      id: readinessIdPartial,
      level: null,
      name: 'Piloted',
    });
  });

  it("AC.6 — description NULL: the key is null, never ''", async () => {
    const resultId = await insertResult(null, null);

    const facts = await readFacts(resultId);

    expect(facts.description).toBeNull();
    expect(facts.description).not.toBe('');
  });

  it("AC.7 — geo_scope_id = 50 (THIS_IS_YET_TO_BE_DETERMINED, migration-seeded): that scope's CLARISA name returns like any other, not suppressed as a sentinel", async () => {
    const resultId = await insertResult(null, geoScopeCode50);

    const facts = await readFacts(resultId);

    expect(facts.geo_scope).not.toBeNull();
    expect(Number(facts.geo_scope.code)).toBe(geoScopeCode50);
    expect(typeof facts.geo_scope.name).toBe('string');
  });

  it('AC.8 — a non-existent target id: all three facts are null and nothing throws', async () => {
    // Far outside any id this file (or any sibling fixture) could ever
    // auto-increment to.
    const nonExistentId = 999_999_999;

    await expect(readFacts(nonExistentId)).resolves.toEqual({
      innovation_readiness: null,
      description: null,
      geo_scope: null,
    });
  });

  /**
   * AC.9 / `DC-14` — the behavioural half of the criterion this file exists
   * for (`design.md` §11 limit 3, `NFR-IUC-001`'s disqualifier). Reuses
   * AC.2's scenario (no detail row): if `is_active` were expressed as a
   * nested `where` against the `LEFT JOIN` instead of on the `ON` clause,
   * the parent `Result` row would be excluded and `description`/`geo_scope`
   * would be lost with it. Split into its own `it` block (separate from the
   * SQL-shape assertion below) precisely because Jest aborts a test body at
   * its first failed `expect` — a shared block would let this assertion's
   * failure mask whether the SQL assertion below it ever ran at all. This
   * happened once already in this file's history: see the block below for
   * the correction record.
   */
  it('AC.9 — the parent row is NOT dropped when there is no detail row (DC-14 behavioural half)', async () => {
    const resultId = await insertResult(
      'AC.9 sentinel — no detail row.',
      geoScopeCodePrivate,
    );

    const facts = await readFacts(resultId);

    expect(facts.description).toBe('AC.9 sentinel — no detail row.');
  });

  /**
   * AC.9 / `DC-14` — the SQL-shape half, and the ONE assertion this whole
   * file exists for (`design.md` §11 limit 3, `NFR-IUC-001`'s disqualifier:
   * a mocked-repository call-count assertion proves the CALL, never the
   * emitted SQL). This is `tasks.md` T-01's named falsifier (`S3`): move
   * `is_active` from the `LEFT JOIN`'s `ON` clause into `.where(...)`, and
   * this block's own `` `detail`.`is_active` `` assertion on `joinSegment`
   * below must redden — not the behavioural block above, which was split
   * out on rework attempt 2 for exactly this reason.
   *
   * **Correction record (rework attempt 2, 2026-09-10):** the FIRST run of
   * this falsifier (attempt 1) shared one `it` body with the behavioural
   * assertion above and had that assertion running FIRST; under the
   * mutation the shared body reddened at the behavioural `expect` and
   * Jest aborted before the `getQuerySpy` capture and the
   * `` `detail`.`is_active` ``/`whereClause` assertions below ever ran —
   * so the red pasted as this criterion's evidence was actually AC.2's
   * criterion, not this one. That defect is why the two assertions now
   * live in separate blocks. The falsifier has since been re-run against
   * THIS block in isolation; the RED it produced names the
   * `` `detail`.`is_active` `` assertion on `joinSegment` (pasted in the
   * task's execution report), restored, and re-run GREEN.
   *
   * **What that red does NOT cover, stated so the record does not overstate
   * itself.** The `whereClause` negative assertion further down has only
   * ever been observed GREEN. Under `S3` the `joinSegment` assertion throws
   * first and Jest aborts this body too, so `whereClause` never executes
   * under this mutation — it is reachable only under a DIFFERENT one, which
   * adds an `.andWhere('detail.is_active = ...')` while KEEPING the `ON`
   * clause, and this task does not run that mutation. `DC-14`'s property is
   * gated by the `joinSegment` assertion, whose red was observed; the
   * `whereClause` assertion is a belt-and-braces guard whose own red is
   * not claimed.
   */
  it('AC.9 — the emitted SQL carries the is_active predicate in the JOIN ON clause, and NOT in the WHERE clause (DC-14 SQL-shape half)', async () => {
    const resultId = await insertResult(
      'AC.9 sentinel — SQL-shape check.',
      geoScopeCodePrivate,
    );

    const getQuerySpy = jest.spyOn(
      SelectQueryBuilder.prototype as unknown as {
        getQuery: () => string;
      },
      'getQuery',
    );

    try {
      await readFacts(resultId);

      const emittedQueries = getQuerySpy.mock.results
        .map((r) => (typeof r.value === 'string' ? r.value : undefined))
        .filter((sql): sql is string => sql !== undefined);

      const relevantQuery = emittedQueries.find((sql) =>
        sql.includes('result_innovation_dev'),
      );
      expect(relevantQuery).toBeDefined();

      // Isolate the `result_innovation_dev` JOIN's own segment — from its
      // `LEFT JOIN` keyword up to (but not including) the NEXT `LEFT JOIN`
      // (the `innovationReadiness` join that follows it). Observed shape
      // (this exact run): "...LEFT JOIN `result_innovation_dev` `detail`
      // ON `detail`.`result_id`=`result`.`result_id` AND
      // (`detail`.`is_active` = :isActive)  LEFT JOIN
      // `clarisa_innovation_readiness_levels` `readiness` ON...".
      const joinStart = relevantQuery.indexOf('`result_innovation_dev`');
      expect(joinStart).toBeGreaterThan(-1);
      const nextJoinStart = relevantQuery.indexOf('LEFT JOIN', joinStart + 1);
      const joinSegment = relevantQuery.slice(
        joinStart,
        nextJoinStart === -1 ? relevantQuery.length : nextJoinStart,
      );

      // The predicate is attached to THIS join's own ON clause...
      expect(joinSegment).toMatch(/\bON\b/i);
      expect(joinSegment).toMatch(/`detail`\.`is_active`\s*=/i);

      // ...and the WHERE clause — whatever it contains — never mentions
      // `detail`.`is_active`. This is the differential the falsifier
      // (moving the predicate from ON to WHERE) reddens: it would remove
      // `detail`.`is_active` from `joinSegment` above and put it in the
      // WHERE segment instead.
      const whereIndex = relevantQuery.search(/\bWHERE\b/i);
      expect(whereIndex).toBeGreaterThan(-1);
      const whereClause = relevantQuery.slice(whereIndex);
      expect(whereClause).not.toMatch(/`detail`\.`is_active`/i);
    } finally {
      getQuerySpy.mockRestore();
    }
  });
});
