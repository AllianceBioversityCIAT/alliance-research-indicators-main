// @akili-spec docs/specs/innovation-use/data-model-and-catalog
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';

/**
 * T-13 (`docs/specs/innovation-use/data-model-and-catalog`) — F13, F14, F15,
 * F18, `design.md` §6.5 / §6.7. Backs R-IU-011 AC.1-AC.5.
 *
 * Calls the REAL `SP_versioning`, `SP_delete_result_version`,
 * `full_delete_result_version`, and `delete_result` routines against the
 * scratch MySQL schema — never asserts on emitted SQL strings (KZ-001).
 * This is the substitute gate for DC-12: none of M6's six edits (transcript
 * §6) produce any error, log, or metric if omitted — a schema-only read of
 * the migration cannot tell a present copy/delete/update statement from a
 * silently-missing one (R-IU-011's Scenario: "IT MUST be proven by
 * executing the routine, not by reading the migration").
 *
 * F13 is split into three sub-cases (F13a/b/c) rather than one, so that
 * removing exactly one of M6's edits 1-3 (all three live inside
 * `SP_versioning`) turns exactly one sub-case red and leaves the other two
 * green — the isolate-one-conjunct discipline (FP-42): a fixture that
 * bundles all three checks into one `it` cannot tell which edit is missing
 * when it goes red, and "some edit is missing" is a weaker gate than
 * "edit #1 is missing".
 *
 * **F13d (`docs/specs/changes/measure-number-signed-decimal` T-07, closes
 * `RK-9`).** No case here ever covered `result_quantifications` — `RK-9`
 * found the measure copy path unasserted at every tier. F13d seeds two
 * ACTIVE role-3 rows (signed, fractional, and at `DD-14`'s derived bound —
 * maximally distinct sentinels, FP-48) plus one DEACTIVATED role-3 row on
 * the same source result, calls the same real `SP_versioning`, then reads
 * BOTH sides out of MySQL (`R-MSD-005`'s scenario, `:328`) with `SELECT *`
 * on each side (ADR-11's column-coverage method, `R-MSD-005` AC.2 — rework
 * attempt 2, FAIL: a hand-written column list was disqualified because it
 * cannot see a column the routine's copy block silently drops), matches
 * copied rows to their source by `(quantification_role_id, unit,
 * description)` — **never by the value**, which is what is under test
 * (`DD-20`, `J-20`: `result_quantifications` holds several rows per
 * result, including deactivated ones, so a `toHaveLength(1)` premise or a
 * value-only match would be a false gate) — and compares every remaining
 * column after deleting only the identity columns (`id`, `result_id`).
 * Only `SP_versioning`'s copy block names `quantification_number`
 * (migration `1787083305648:360-387`); the routine's body is not diffed —
 * `:327` disqualifies that as evidence, because the body does not change.
 *
 * Only F13a/b/c call `SP_versioning` — the ONLY one of the four routines
 * that filters its source lookup by `platform_code = 'STAR'` (transcript
 * `1783029013035:93`; confirmed empirically while authoring this file: a
 * source result seeded under a private platform code raised "Result not
 * found - temp_result_id is NULL"). F14 therefore does NOT call
 * `SP_versioning` to build the pre-existing snapshot it hard-deletes — it
 * seeds that snapshot row directly (`SP_delete_result_version`'s own guard
 * has no platform filter, transcript §3), which both avoids the `STAR`
 * dependency for that test and isolates "does the delete routine orphan
 * the detail row" from "does versioning work", per the same FP-42
 * discipline. `STAR` and `result_status` id 8 (which `delete_result`
 * unconditionally sets on `results.result_status_id` — transcript §5,
 * `1764275660631:331` — requiring the row to exist via its FK) are both
 * real, fixed, foundational reference values shared with OTHER fixture
 * files (T-02's exemplar also seeds `STAR`), not sentinels this file can
 * privatize. Both are seeded with `INSERT IGNORE` (atomic; its
 * `affectedRows` is unambiguous through this driver, unlike `INSERT ... ON
 * DUPLICATE KEY UPDATE`, verified empirically before choosing it) and,
 * unlike this file's own private rows, are NEVER deleted in `afterAll` —
 * deleting a row another fixture file's concurrently-running `beforeAll`
 * or test may still depend on is a hazard under Jest's parallel per-file
 * workers (confirmed empirically that these files run in parallel, not
 * sequentially, from near-identical per-file durations in a full
 * `test:fixtures` run). Both are treated as permanent scratch-schema
 * reference data, the same role the M4 migration's own seeded catalog rows
 * already play.
 *
 * Every fixture seeds its own minimal, self-contained data under a
 * reserved, far-future report year (2101), platform code (`T13IULC`), and
 * `clarisa_actor_types` code (9130) — all private to this file and never
 * used by any other fixture file (FP-39 / A-9: reusing another file's
 * shared catalog code, even guarded by check-then-insert, races under
 * Jest's parallel per-file workers all hitting the same scratch schema —
 * confirmed empirically while authoring this file: reusing T-12's
 * `reportYear = 2097` produced a real `Duplicate entry` failure). Every
 * row created by a test is tracked by id and removed in `afterAll`, with
 * per-step `try`/`catch` (collect, rethrow after) so one RESTRICT-FK
 * failure (FP-39 / A-8) cannot abort the rest of cleanup or leave
 * `dataSource.destroy()` unreached.
 *
 * The red-before-green demonstration (mutate the scratch schema's routine
 * to omit one transcript §6 edit, confirm the corresponding sub-case here
 * goes red, restore) was performed manually against this file and is
 * reported verbatim in the T-13 execution note — it is not baked into this
 * file, which asserts only the routines' correct, shipped behavior.
 */
describe('Innovation Use lifecycle routines (T-13, F13/F14/F15/F18)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2101;
  const platformCode = 'T13IULC';
  const actorTypeCode = 9130;
  const starPlatformCode = 'STAR';
  const deletedResultStatusId = 8;

  let platformSeeded = false;
  let reportYearSeeded = false;
  let actorTypeOneSeeded = false;

  // Every `results` row this file creates, tracked so cleanup can find and
  // remove whatever is still there regardless of which routine (if any)
  // already removed it.
  const officialCodes: number[] = [];
  let nextCode = 900_200_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  async function seedSourceResult(
    platform: string = platformCode,
    isSnapshot = false,
  ): Promise<{
    resultId: number;
    officialCode: number;
  }> {
    const officialCode = nextOfficialCode();
    officialCodes.push(officialCode);
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, ?, NULL)`,
      [officialCode, platform, reportYear, isSnapshot ? 1 : 0],
    );
    return { resultId: result.insertId, officialCode };
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

  interface ActorCounts {
    womenYouthCount?: number | null;
    womenNotYouthCount?: number | null;
    menYouthCount?: number | null;
    menNotYouthCount?: number | null;
    actorsCount?: number | null;
  }

  async function seedActor(
    resultId: number,
    counts: ActorCounts,
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id,
         women_youth_count, women_not_youth_count, men_youth_count, men_not_youth_count,
         actors_count, created_by, updated_by
       ) VALUES (?, ?, 2, ?, ?, ?, ?, ?, 1, 1)`,
      [
        resultId,
        actorTypeCode,
        counts.womenYouthCount ?? null,
        counts.womenNotYouthCount ?? null,
        counts.menYouthCount ?? null,
        counts.menNotYouthCount ?? null,
        counts.actorsCount ?? null,
      ],
    );
  }

  async function seedInstitutionType(
    resultId: number,
    organizationCount: number,
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_role_id, organization_count, created_by, updated_by
       ) VALUES (?, 2, ?, 1, 1)`,
      [resultId, organizationCount],
    );
  }

  async function callSpVersioning(officialCode: number): Promise<number> {
    await dataSource.query(`CALL SP_versioning(?)`, [officialCode]);
    const [snapshot] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [officialCode],
    );
    expect(snapshot).toBeDefined();
    return snapshot.result_id;
  }

  beforeAll(async () => {
    await dataSource.initialize();

    // Foundational, cross-file-shared reference rows — see file header.
    // Never deleted by this file.
    await dataSource.query(
      `INSERT IGNORE INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'STAR reporting platform')`,
      [starPlatformCode],
    );
    await dataSource.query(
      `INSERT IGNORE INTO result_status (result_status_id, name) VALUES (?, 'Deleted')`,
      [deletedResultStatusId],
    );

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [platformCode],
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'T-13 lifecycle-routines fixture platform')`,
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

    // Baseline is schema-only (src/db/baseline/README.md); the pre-baseline
    // clarisa_actor_types seed migration's rows do not reproduce (same trap
    // T-12 documented). This code is private to this file (not code 1 or 5,
    // which T-12's fixtures already use) so plain check-then-insert cannot
    // race against another file for the same row.
    const [existingActorType] = await dataSource.query(
      `SELECT code FROM clarisa_actor_types WHERE code = ?`,
      [actorTypeCode],
    );
    if (!existingActorType) {
      await dataSource.query(
        `INSERT INTO clarisa_actor_types (code, name) VALUES (?, 'T-13 lifecycle-routines fixture actor type')`,
        [actorTypeCode],
      );
      actorTypeOneSeeded = true;
    }
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    const errors: unknown[] = [];
    const tryStep = async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (err) {
        errors.push({ label, err });
      }
    };
    // Rework attempt 2, B-7: a lookup failure inside cleanup is now
    // RECORDED (pushed onto `errors`) rather than silently swallowed into
    // an empty-array fallback, which previously could surface later as a
    // confusing, seemingly-unrelated 1451.
    const trySelect = async <T>(
      label: string,
      fn: () => Promise<T>,
      fallback: T,
    ): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        errors.push({ label, err });
        return fallback;
      }
    };

    for (const officialCode of officialCodes) {
      const resultRows = await trySelect(
        `select results by official_code ${officialCode}`,
        () =>
          dataSource.query(
            `SELECT result_id FROM results WHERE result_official_code = ?`,
            [officialCode],
          ) as Promise<{ result_id: number }[]>,
        [] as { result_id: number }[],
      );
      const resultIds = resultRows.map((r) => r.result_id);

      for (const resultId of resultIds) {
        await tryStep(`delete result_actors ${resultId}`, () =>
          dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
            resultId,
          ]),
        );
        await tryStep(`delete result_institution_types ${resultId}`, () =>
          dataSource.query(
            `DELETE FROM result_institution_types WHERE result_id = ?`,
            [resultId],
          ),
        );
        await tryStep(`delete result_innovation_use ${resultId}`, () =>
          dataSource.query(
            `DELETE FROM result_innovation_use WHERE result_id = ?`,
            [resultId],
          ),
        );
        // T-07 (measure-number-signed-decimal): F13d seeds
        // result_quantifications rows on both the source and (via
        // SP_versioning) the snapshot result — both share this
        // officialCode, so this loop already reaches both result_ids.
        await tryStep(`delete result_quantifications ${resultId}`, () =>
          dataSource.query(
            `DELETE FROM result_quantifications WHERE result_id = ?`,
            [resultId],
          ),
        );
      }

      await tryStep(`delete results official_code ${officialCode}`, () =>
        dataSource.query(`DELETE FROM results WHERE result_official_code = ?`, [
          officialCode,
        ]),
      );
    }

    if (actorTypeOneSeeded) {
      await tryStep(`delete clarisa_actor_types code ${actorTypeCode}`, () =>
        dataSource.query(`DELETE FROM clarisa_actor_types WHERE code = ?`, [
          actorTypeCode,
        ]),
      );
    }
    if (reportYearSeeded) {
      await tryStep('delete report_years', () =>
        dataSource.query(`DELETE FROM report_years WHERE report_year = ?`, [
          reportYear,
        ]),
      );
    }
    if (platformSeeded) {
      await tryStep('delete reporting_platforms', () =>
        dataSource.query(
          `DELETE FROM reporting_platforms WHERE platform_code = ?`,
          [platformCode],
        ),
      );
    }
    // `STAR` and `result_status` id 8 are deliberately NEVER deleted here —
    // see file header.

    try {
      if (errors.length) {
        throw new Error(
          `afterAll cleanup had ${errors.length} failed step(s): ${JSON.stringify(
            errors,
            (_key, value) => (value instanceof Error ? value.message : value),
          )}`,
        );
      }
    } finally {
      await dataSource.destroy();
    }
  });

  it('F13a: SP_versioning copies level id and explanation onto the new version (edit #3 — new result_innovation_use copy block)', async () => {
    const { resultId, officialCode } = await seedSourceResult(starPlatformCode);
    await seedDetail(resultId, 7, 'A concrete justification for F13a.');

    const newResultId = await callSpVersioning(officialCode);

    const [copiedDetail] = await dataSource.query(
      `SELECT innovation_use_level_id, innovation_use_level_explanation FROM result_innovation_use WHERE result_id = ?`,
      [newResultId],
    );
    expect(copiedDetail).toBeDefined();
    expect(copiedDetail.innovation_use_level_id).toBe(7);
    expect(copiedDetail.innovation_use_level_explanation).toBe(
      'A concrete justification for F13a.',
    );
  }, 30000);

  it('F13b: SP_versioning copies all four disaggregated counts and actors_count onto the new version (edit #1 — result_actors column-list append)', async () => {
    const { resultId, officialCode } = await seedSourceResult(starPlatformCode);
    // Filled in the same row regardless of the aggregate/disaggregated mode
    // invariant (RB-5: no DB constraint enforces it) — this isolates the
    // column-LIST copy behavior from mode business logic, which is
    // innovation_use_validation's concern (T-12), not SP_versioning's.
    await seedActor(resultId, {
      womenYouthCount: 11,
      womenNotYouthCount: 12,
      menYouthCount: 13,
      menNotYouthCount: 14,
      actorsCount: 15,
    });

    const newResultId = await callSpVersioning(officialCode);

    const [copiedActor] = await dataSource.query(
      `SELECT women_youth_count, women_not_youth_count, men_youth_count, men_not_youth_count, actors_count
       FROM result_actors WHERE result_id = ?`,
      [newResultId],
    );
    expect(copiedActor).toBeDefined();
    expect(copiedActor.women_youth_count).toBe(11);
    expect(copiedActor.women_not_youth_count).toBe(12);
    expect(copiedActor.men_youth_count).toBe(13);
    expect(copiedActor.men_not_youth_count).toBe(14);
    expect(copiedActor.actors_count).toBe(15);
  }, 30000);

  it('F13c: SP_versioning copies organization_count onto the new version (edit #2 — result_institution_types column-list append)', async () => {
    const { resultId, officialCode } = await seedSourceResult(starPlatformCode);
    await seedInstitutionType(resultId, 42);

    const newResultId = await callSpVersioning(officialCode);

    const [copiedInstitutionType] = await dataSource.query(
      `SELECT organization_count FROM result_institution_types WHERE result_id = ?`,
      [newResultId],
    );
    expect(copiedInstitutionType).toBeDefined();
    expect(copiedInstitutionType.organization_count).toBe(42);
  }, 30000);

  it('F13d: SP_versioning copies result_quantifications (role 3, signed, fractional) onto the new version, matched on (quantification_role_id, unit, description) — never the value (RK-9, R-MSD-005, DD-9, DD-20)', async () => {
    const { resultId, officialCode } = await seedSourceResult(starPlatformCode);

    // Maximally distinct sentinels (FP-48 — routine copy-path discipline):
    // negative + fractional (the exact value from R-MSD-005's own
    // scenario) and DD-14's derived scale-4 bound, so a positional
    // mix-up between the two active rows would be visible. Plus one
    // DEACTIVATED row the copy's `WHERE rq.is_active = TRUE`
    // (`1787083305648:386`) must NOT carry over — proving
    // `result_quantifications` holds several rows per result, including
    // deactivated ones (J-20), rather than a false toHaveLength(1)
    // premise.
    await dataSource.query(
      `INSERT INTO result_quantifications
         (result_id, quantification_role_id, quantification_number, unit, description, is_active, created_by, updated_by)
       VALUES (?, 3, -12.75, 'f13d-unit-active-1', 'f13d-desc-active-1', 1, 1, 1)`,
      [resultId],
    );
    await dataSource.query(
      `INSERT INTO result_quantifications
         (result_id, quantification_role_id, quantification_number, unit, description, is_active, created_by, updated_by)
       VALUES (?, 3, 549755813887, 'f13d-unit-active-2', 'f13d-desc-active-2', 1, 1, 1)`,
      [resultId],
    );
    await dataSource.query(
      `INSERT INTO result_quantifications
         (result_id, quantification_role_id, quantification_number, unit, description, is_active, created_by, updated_by)
       VALUES (?, 3, 2.5, 'f13d-unit-deactivated', 'f13d-desc-deactivated', 0, 1, 1)`,
      [resultId],
    );

    const newResultId = await callSpVersioning(officialCode);

    // Rework attempt 2, FAIL (both lenses): `SELECT *` on BOTH sides
    // (:328), never a hand-written column list — ADR-11's
    // column-coverage method (`R-MSD-005` AC.2, `DD-20`) still governs,
    // and a hand-picked three-column projection would stay green if a
    // future migration added a column to the routine's SELECT list but
    // not its copy list (ADR-11 blind spot (i) — the exact class of
    // defect this requirement exists to catch).
    const sourceRows: Record<string, unknown>[] = await dataSource.query(
      `SELECT * FROM result_quantifications WHERE result_id = ? AND quantification_role_id = 3`,
      [resultId],
    );
    const newRows: Record<string, unknown>[] = await dataSource.query(
      `SELECT * FROM result_quantifications WHERE result_id = ? AND quantification_role_id = 3`,
      [newResultId],
    );

    // Key-count assertion (DD-20 multi-row-aware, J-20), by COUNT rather
    // than by column list: the source holds all three seeded rows (two
    // ACTIVE + one DEACTIVATED); the copy holds only the two ACTIVE ones
    // (`WHERE rq.is_active = TRUE`, `1787083305648:386`).
    expect(sourceRows).toHaveLength(3); // source: 2 active + 1 deactivated
    expect(newRows).toHaveLength(2); // snapshot: deactivated row excluded

    // Matched on (unit, description) — DD-20's key, minus
    // (result_id, quantification_role_id), which are already fixed per
    // side by each query's own WHERE clause — NEVER on
    // quantification_number, which is what is under test.
    const keyOf = (row: Record<string, unknown>): string =>
      `${row.unit}::${row.description}`;
    const sourceByKey = new Map(sourceRows.map((r) => [keyOf(r), r]));
    const newByKey = new Map(newRows.map((r) => [keyOf(r), r]));

    // Only `id` and `result_id` legitimately differ between a source row
    // and its copy — every other column, including the audit columns
    // the routine copies verbatim (`rq.created_at`, `rq.created_by`,
    // ...), must match exactly.
    const withoutIdentityColumns = (
      row: Record<string, unknown>,
    ): Record<string, unknown> => {
      const trimmed = { ...row };
      delete trimmed.id;
      delete trimmed.result_id;
      return trimmed;
    };

    const sourceActive1 = sourceByKey.get(
      'f13d-unit-active-1::f13d-desc-active-1',
    );
    const sourceActive2 = sourceByKey.get(
      'f13d-unit-active-2::f13d-desc-active-2',
    );
    const copiedActive1 = newByKey.get(
      'f13d-unit-active-1::f13d-desc-active-1',
    );
    const copiedActive2 = newByKey.get(
      'f13d-unit-active-2::f13d-desc-active-2',
    );

    expect(sourceActive1).toBeDefined();
    expect(sourceActive2).toBeDefined();
    expect(copiedActive1).toBeDefined();
    expect(copiedActive2).toBeDefined();
    // The DEACTIVATED row's key must be absent from the snapshot side —
    // not merely fewer rows overall, but THIS specific row excluded.
    expect(newByKey.has('f13d-unit-deactivated::f13d-desc-deactivated')).toBe(
      false,
    );

    const trimmedSourceActive1 = withoutIdentityColumns(
      sourceActive1 as Record<string, unknown>,
    );
    const trimmedSourceActive2 = withoutIdentityColumns(
      sourceActive2 as Record<string, unknown>,
    );
    const trimmedCopiedActive1 = withoutIdentityColumns(
      copiedActive1 as Record<string, unknown>,
    );
    const trimmedCopiedActive2 = withoutIdentityColumns(
      copiedActive2 as Record<string, unknown>,
    );
    expect(trimmedCopiedActive1).toEqual(trimmedSourceActive1);
    expect(trimmedCopiedActive2).toEqual(trimmedSourceActive2);

    // Human-readable sentinel check, kept alongside the SELECT *
    // comparison above (task instruction) — the exact values a reader
    // can eyeball without decoding the map keys.
    expect(
      Number((copiedActive1 as Record<string, unknown>).quantification_number),
    ).toBe(-12.75);
    expect(
      Number((copiedActive2 as Record<string, unknown>).quantification_number),
    ).toBe(549755813887);
  }, 30000);

  it('F14: SP_delete_result_version leaves no orphaned result_innovation_use row (edit #4)', async () => {
    // Seeded directly as an already-existing snapshot (is_snapshot = TRUE)
    // — `SP_delete_result_version`'s own guard (transcript §3) has no
    // platform filter, so this needs no `SP_versioning` call and no `STAR`
    // platform (see file header).
    const { resultId: snapshotResultId, officialCode } = await seedSourceResult(
      platformCode,
      true,
    );
    await seedDetail(snapshotResultId, 7, 'A concrete justification for F14.');

    await dataSource.query(`CALL SP_delete_result_version(?, ?)`, [
      officialCode,
      reportYear,
    ]);

    const remainingDetail = await dataSource.query(
      `SELECT result_id FROM result_innovation_use WHERE result_id = ?`,
      [snapshotResultId],
    );
    expect(remainingDetail).toHaveLength(0);

    const remainingSnapshotResult = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [snapshotResultId],
    );
    expect(remainingSnapshotResult).toHaveLength(0);
  }, 30000);

  it('F15: full_delete_result_version leaves no orphaned result_innovation_use row (edit #5)', async () => {
    const { resultId } = await seedSourceResult();
    await seedDetail(resultId, 7, 'A concrete justification for F15.');

    const [row] = await dataSource.query(
      `SELECT full_delete_result_version(?) AS ok`,
      [resultId],
    );
    expect(Number(row.ok)).toBe(1);

    const remainingDetail = await dataSource.query(
      `SELECT result_id FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(remainingDetail).toHaveLength(0);

    const remainingResult = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [resultId],
    );
    expect(remainingResult).toHaveLength(0);
  }, 30000);

  it('F18: delete_result deactivates result_innovation_use in place, without hard-deleting it (edit #6)', async () => {
    const { resultId } = await seedSourceResult();
    await seedDetail(resultId, 7, 'A concrete justification for F18.');

    const [row] = await dataSource.query(`SELECT delete_result(?) AS ok`, [
      resultId,
    ]);
    expect(Number(row.ok)).toBe(1);

    // Raw SELECT, not filtered by is_active — F18 must prove the row is
    // deactivated IN PLACE, not hard-deleted. A hard-delete assertion here
    // would pass for the wrong reason and hide the active-orphan class
    // (task implementation note).
    const [detailAfterDelete] = await dataSource.query(
      `SELECT is_active, deleted_at FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(detailAfterDelete).toBeDefined();
    expect(Number(detailAfterDelete.is_active)).toBe(0);
    expect(detailAfterDelete.deleted_at).not.toBeNull();

    const [resultAfterDelete] = await dataSource.query(
      `SELECT is_active, result_status_id FROM results WHERE result_id = ?`,
      [resultId],
    );
    expect(Number(resultAfterDelete.is_active)).toBe(0);
    expect(Number(resultAfterDelete.result_status_id)).toBe(
      deletedResultStatusId,
    );
  }, 30000);
});
