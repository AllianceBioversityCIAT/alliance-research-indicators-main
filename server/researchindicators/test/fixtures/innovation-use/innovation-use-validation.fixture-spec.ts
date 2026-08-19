import { dataSource } from '../../../src/db/config/mysql/orm.test.config';

/**
 * T-12 (`docs/specs/innovation-use/data-model-and-catalog`) — fixture harness
 * for `innovation_use_validation` (M5, T-09). Calls the REAL stored function
 * against the scratch MySQL schema — never asserts on emitted SQL strings
 * (KZ-001). Covers §6.5's table rows F1–F9, F9b, F11, F17.
 *
 * Every fixture seeds its own minimal `results` row (+ `result_innovation_use`
 * and/or `result_actors` rows as its row in §6.5 requires) under a reserved,
 * far-future report year (2096) distinct from other fixture files' reserved
 * years, so this file can run standalone or alongside them without collision.
 * `actor_roles` id 1 (Innovation Dev) IS seeded by a migration — `1749957832
 * 239-createEntitiesForInnovationDev.ts:45` inserts it via
 * `${ActorRolesEnum.INNOVATION_DEV}` (an enum interpolation, not the literal
 * digit `1`, which is why a value-grep for `1` missed it — corrected
 * 2026-08-18, T-12 rework attempt 2). That migration predates this branch's
 * schema-only baseline snapshot (`src/db/baseline/baseline.sql`, taken
 * 2026-08-14 per `src/db/baseline/README.md`) and is already recorded as
 * applied in the snapshot's copied `migrations` bookkeeping rows, so it
 * never re-runs against a freshly-loaded scratch schema; and the snapshot
 * itself carries zero business-data `INSERT`s outside that one bookkeeping
 * table (same README). So the row genuinely is absent from the scratch
 * schema — the comment's OPERATIVE CONCLUSION still holds, only the
 * previously-stated reason ("not seeded anywhere ... in any migration") was
 * wrong. Id 2 (Innovation Use) IS seeded fresh on the scratch schema, by
 * contrast, because its migration — M4, `1787071463485-
 * insertInnovationUseRoles.ts` — postdates the snapshot cutoff and genuinely
 * re-runs during `migration:test:bootstrap`. F11 below still seeds id 1
 * itself, idempotently, and only removes it in `afterAll` if this file was
 * the one that added it (FP-16 / trap 4) — though `test/fixtures/
 * global-setup.ts` now also seeds this exact row centrally, once, before
 * any worker starts (see that file's header), which makes this file's own
 * check-then-insert below a harmless, redundant no-op rather than the row's
 * real source in practice. Left as-is: this correction's authorized scope
 * is this comment, not that code.
 *
 * Every row created by a test is tracked by id and removed in `afterAll`,
 * guarded on the id actually being defined (FP-4/trap 5) — a partial seed
 * failure in one `it` must not abort cleanup for the rest.
 *
 * The red/green demonstration for each fixture (mutate
 * `innovation_use_validation` in the scratch schema to the defect it
 * targets, confirm this fixture goes red, restore, confirm green) was
 * performed manually against this file and is reported in the T-12
 * execution note — it is not baked into this file, which asserts only the
 * function's correct, shipped behavior.
 */
describe('innovation_use_validation stored function (T-12, F1-F9/F9b/F11/F17)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2096;

  let platformSeeded = false;
  let reportYearSeeded = false;
  let innovationDevRoleSeeded = false;
  let actorTypeOneSeeded = false;
  let actorTypeFiveSeeded = false;

  const resultIds: number[] = [];

  let nextCode = 900_100_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  async function seedResult(): Promise<number> {
    const officialCode = nextOfficialCode();
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, 'T12IUV', ?, 0, NULL)`,
      [officialCode, reportYear],
    );
    const resultId = result.insertId;
    resultIds.push(resultId);
    return resultId;
  }

  async function seedDetail(
    resultId: number,
    levelId: number | null,
    explanation: string | null,
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO result_innovation_use (result_id, innovation_use_level_id, innovation_use_level_explanation, created_by, updated_by)
       VALUES (?, ?, ?, 1, 1)`,
      [resultId, levelId, explanation],
    );
  }

  interface ActorSeed {
    resultId: number;
    actorRoleId: number;
    actorTypeId: number;
    actorTypeCustomName?: string | null;
    sexAgeDisaggregationNotApply?: boolean | null;
    actorsCount?: number | null;
    womenYouthCount?: number | null;
    womenNotYouthCount?: number | null;
    menYouthCount?: number | null;
    menNotYouthCount?: number | null;
  }

  async function seedActor(seed: ActorSeed): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_type_custom_name,
         sex_age_disaggregation_not_apply,
         women_youth_count, women_not_youth_count, men_youth_count, men_not_youth_count,
         actors_count, actor_role_id, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        seed.resultId,
        seed.actorTypeId,
        seed.actorTypeCustomName ?? null,
        seed.sexAgeDisaggregationNotApply ?? null,
        seed.womenYouthCount ?? null,
        seed.womenNotYouthCount ?? null,
        seed.menYouthCount ?? null,
        seed.menNotYouthCount ?? null,
        seed.actorsCount ?? null,
        seed.actorRoleId,
      ],
    );
    return result.insertId;
  }

  async function callValidation(resultId: number): Promise<number> {
    const [row] = await dataSource.query(
      'SELECT innovation_use_validation(?) AS v',
      [resultId],
    );
    return Number(row.v);
  }

  beforeAll(async () => {
    await dataSource.initialize();

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = 'T12IUV'`,
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES ('T12IUV', 'T-12 fixture platform')`,
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

    // `baseline.sql` is schema-only (`src/db/baseline/README.md`: "Zero
    // business-data INSERT statements anywhere else in the file") — the
    // `clarisa_actor_types` catalog rows a much earlier migration inserted
    // pre-baseline-date are NOT reproduced (only genuinely new migrations
    // since the snapshot date, e.g. M1's clarisa_innovation_use_levels
    // seed, leave data, because those actually re-ran). Seed the two codes
    // these fixtures need idempotently.
    const [existingActorTypeOne] = await dataSource.query(
      `SELECT code FROM clarisa_actor_types WHERE code = 1`,
    );
    if (!existingActorTypeOne) {
      await dataSource.query(
        `INSERT INTO clarisa_actor_types (code, name) VALUES (1, 'T-12 fixture actor type')`,
      );
      actorTypeOneSeeded = true;
    }

    const [existingActorTypeFive] = await dataSource.query(
      `SELECT code FROM clarisa_actor_types WHERE code = 5`,
    );
    if (!existingActorTypeFive) {
      await dataSource.query(
        `INSERT INTO clarisa_actor_types (code, name) VALUES (5, 'Other')`,
      );
      actorTypeFiveSeeded = true;
    }

    // FP-16: the Innovation Dev role (actor_role_id = 1) is not seeded by
    // the baseline or by any migration on this branch — only the
    // Innovation Use role (id 2) is (M4). F11 needs a real, resolvable
    // Innovation Dev actor row to prove the role filter is non-vacuous, so
    // this catalog row must exist. Seed idempotently.
    const [existingDevRole] = await dataSource.query(
      `SELECT actor_role_id FROM actor_roles WHERE actor_role_id = 1`,
    );
    if (!existingDevRole) {
      await dataSource.query(
        `INSERT INTO actor_roles (actor_role_id, name) VALUES (1, 'innovation-dev')`,
      );
      innovationDevRoleSeeded = true;
    }
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    for (const resultId of resultIds) {
      if (resultId === undefined || resultId === null) {
        continue;
      }
      await dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
        resultId,
      ]);
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [resultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        resultId,
      ]);
    }

    // `actor_roles` id 1 is NEVER torn down here (T-13 rework attempt 2,
    // FAIL-2/FAIL-4 / A-9). `test/fixtures/global-setup.ts` now seeds it
    // exactly once, in Jest's main process, before any worker (and
    // therefore before this file's own `beforeAll`) starts — the only seed
    // point structurally immune to the per-file parallel-worker race this
    // teardown used to be exposed to (this file's own check-then-insert
    // above raced `innovation-dev-lifecycle-routines-unchanged.fixture-
    // spec.ts` (T-13, F16) on a cold container over the same row, and this
    // file's own teardown deleting the row out from under that file's
    // still-live `result_actors` insert previously raised MySQL 1451/1452).
    // `innovationDevRoleSeeded` is retained only as a diagnostic (whether
    // THIS file's own check-then-insert created the row), not to gate a
    // delete.
    void innovationDevRoleSeeded;
    if (actorTypeOneSeeded) {
      await dataSource.query(`DELETE FROM clarisa_actor_types WHERE code = 1`);
    }
    if (actorTypeFiveSeeded) {
      await dataSource.query(`DELETE FROM clarisa_actor_types WHERE code = 5`);
    }
    if (reportYearSeeded) {
      await dataSource.query(`DELETE FROM report_years WHERE report_year = ?`, [
        reportYear,
      ]);
    }
    if (platformSeeded) {
      await dataSource.query(
        `DELETE FROM reporting_platforms WHERE platform_code = 'T12IUV'`,
      );
    }

    await dataSource.destroy();
  });

  it('F1: no result_innovation_use row (with a valid actor row present) returns 0 — missing-row default', async () => {
    const resultId = await seedResult();
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F2: result_innovation_use row with innovation_use_level_id NULL returns 0 — null level', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, null, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F3: level 5 (id 6), no explanation, returns 1 — DC-10 half A', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 6, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F4: level 6 (id 7), no explanation, returns 0 — DC-10 half B (discriminating pair with F3)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 7, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F5: level 6, whitespace-only explanation, returns 0 — valid_text() wiring', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 7, '   ');
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F6: level 6, empty-string explanation, returns 0 — AC.5 "empty" half', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 7, '');
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F7: level 6, valid explanation, returns 1 — happy path', async () => {
    const resultId = await seedResult();
    await seedDetail(
      resultId,
      7,
      'A concrete justification for use beyond connected next-users.',
    );
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F8: actor_type_id = 5 (OTHER) with null actor_type_custom_name returns 0 — the only reachable actor-resolution failure', async () => {
    const resultId = await seedResult();
    await seedDetail(
      resultId,
      7,
      'A concrete justification, so only the actor branch can fail.',
    );
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 5,
      actorTypeCustomName: null,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F9: aggregate-mode actor row with actors_count NULL returns 0 — mode consistency (RB-5 layer 2)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null); // level 0, no explanation required
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: null,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it("F9b: disaggregated-mode actor row with all four counts NULL returns 0 — AC.10's disaggregated half", async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null); // level 0, no explanation required
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: false,
      womenYouthCount: null,
      womenNotYouthCount: null,
      menYouthCount: null,
      menNotYouthCount: null,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F11: a valid Innovation-Use actor row plus Innovation-Dev-role noise returns 1 — DD-4 role filtering, non-vacuously (amended fixture)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null); // level 0, no explanation required

    // The real Innovation-Use actor row this result's completeness depends on.
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    // Innovation-Dev-role noise: deliberately UNRESOLVABLE (OTHER type with
    // no custom name) so that if the role filter were ever removed, this
    // row would flip the result from 1 to 0 — proving the filter is load
    // bearing, not vacuous (trap 4 / FP-23 retired).
    await seedActor({
      resultId,
      actorRoleId: 1,
      actorTypeId: 5,
      actorTypeCustomName: null,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F17: zero Innovation-Use actor rows returns 0 — the vacuous-truth guard (DD-11)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null); // level 0, otherwise-complete detail row

    expect(await callValidation(resultId)).toBe(0);
  });
});
