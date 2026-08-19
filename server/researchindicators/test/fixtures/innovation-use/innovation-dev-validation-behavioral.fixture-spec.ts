// @akili-spec docs/specs/innovation-use/data-model-and-catalog
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';

/**
 * T-12 (`docs/specs/innovation-use/data-model-and-catalog`) — REWORK ATTEMPT
 * 2, path (a): fix the harness. Backs R-IU-006 AC.9, alongside (never
 * replacing) `innovation-dev-validation-unchanged.fixture-spec.ts`, F12's
 * original body-text comparison.
 *
 * **Why this file exists.** Attempt 1's F12 asserted only that
 * `innovation_dev_validation`'s CREATE FUNCTION body-text is unchanged by
 * M1-M6 — a structural check that stays (it is the only gate on the exact
 * SQL shipped) but is not a BEHAVIORAL one: it never calls the function.
 * Lens A FAILed attempt 1 because AC.9 ("`innovation_dev_validation` returns
 * IDENTICAL VALUES ... for a fixed fixture set") is a claim about returned
 * VALUES, and a same-text function could still misbehave if a hand-diff
 * missed something, or (more to the point here) if a future edit near M3's
 * new `result_actors`/`result_institution_types` count columns broke the
 * pre-existing actor/institution completeness logic while leaving the
 * function's TEXT untouched. This file closes that gap: it seeds one fixed,
 * fully-migrated-schema Innovation Dev result, CALLS the real function
 * (never asserts on emitted SQL — KZ-001), and asserts the returned value.
 *
 * **Expected values are derived independently from
 * `1758125999162-AdaptInnovationDevValidationToManyToolFunctions.ts`'s `up()`
 * body** (read in this session; not from running the function and recording
 * what came back — the `tdd` skill's anti-tautology rule, same discipline
 * the sibling body-text file already documents):
 *   - `:108` — `RETURN IF(anticipatedUserId = 1 OR anticipatedUserId IS
 *     NULL, TRUE, (tempInstitutionType = tempFullInstitutionType) AND
 *     (tempInstitutionType > 0) AND (tempFullActors = tempActors) AND
 *     (tempActors > 0) AND tempSecondFields) AND commonFields AND
 *     IF(readinessLevel >= 7, knowledgeSharing, TRUE)`. The
 *     institution/actor conjunct (the "actor block") is SKIPPED entirely
 *     (short-circuited to `TRUE`) whenever `anticipatedUserId = 1` or is
 *     NULL. This fixture's `anticipated_users_id` is seeded at a PRIVATE id
 *     (`9164`, deliberately `!= 1`) precisely so that conjunct is actually
 *     evaluated — a fixture using id `1` or NULL would pass vacuously and
 *     prove nothing about the actor block, no matter what the actor/
 *     institution rows contained.
 *   - `:25-32` (`commonFields`) and `:34-35` (`tempSecondFields`) — every
 *     field these two require is seeded with a concrete, valid value (see
 *     "FP-47 compliance" below for the three boolean columns among them).
 *   - `:36-53` (`knowledgeSharing`) — `is_knowledge_sharing` is seeded
 *     literal `0`, so the `IF(rid.is_knowledge_sharing = TRUE AND ...)`
 *     condition at `:36` is FALSE, and `knowledgeSharing` resolves via the
 *     ELSE at `:52`, `IF(rid.is_knowledge_sharing IS NULL, FALSE, TRUE)` ->
 *     `TRUE` (the column is `0`, not NULL). This makes `:114`'s
 *     `IF(readinessLevel >= 7, knowledgeSharing, TRUE)` term `TRUE`
 *     regardless of `readinessLevel`, so the seeded readiness level's exact
 *     `level` value is immaterial here (unlike F3/F4 in the sibling
 *     `innovation-use-validation.fixture-spec.ts`, which target that
 *     comparison directly for `innovation_use_validation`).
 *   - `:68-72` (`tempFullActors`, a plain `COUNT`) and `:74-84`
 *     (`tempActors`, the actor-resolution `SUM(CASE ...)`) — the "actor
 *     block" this file's second case targets.
 *   - `:86-100` (`tempInstitutionType`) and `:102-106`
 *     (`tempFullInstitutionType`) — the institution-resolution counterpart,
 *     ANDed into the SAME non-short-circuited branch as the actor
 *     conjunct (`:108-112`). Kept trivially satisfied (one resolvable
 *     `result_institution_types` row, `is_organization_known = TRUE`,
 *     `institution_id` NOT NULL — `:86-87`) in BOTH cases below, so the
 *     institution conjunct never varies and cannot be the thing that
 *     flips the second case's result.
 *
 * **FP-47 compliance.** `innovation_dev_validation` tests three boolean
 * columns with `= TRUE` (equality, not truthiness):
 * `is_new_or_improved_variety` (`:31`), `is_knowledge_sharing` (`:36`), and
 * `is_used_beyond_original_context` (`:46`, nested inside the knowledge-
 * sharing branch this fixture never enters). All three are seeded literal
 * `0` below — never a distinct-sentinel value like the neighbouring
 * routine-copy-path fixtures (`innovation-dev-lifecycle-routines-unchanged.
 * fixture-spec.ts`) use for THEIR columns. That file's sentinels (`5`, `7`,
 * `4`) exist to make a positional SELECT-list/copy-list transposition
 * visible to a hand-diff; a sentinel here would instead silently take
 * whichever branch happens to match "not literally 1" (the same branch a
 * literal `0` takes for these three columns, as it happens — but this
 * fixture does not rely on that coincidence, and seeds the literal domain
 * value on principle, per the task brief).
 *
 * **Actor-block flip, without a shared/racy catalog dependency.** The
 * function's actor-resolution CASE (`:74-84`) can only fail for a row whose
 * `actor_type_id = 5` (OTHER) with a NULL `actor_type_custom_name` — for
 * every other code, `ra.actor_type_id IS NOT NULL` (`:78`) is trivially TRUE
 * (the column is `bigint NOT NULL`, baseline.sql `result_actors`
 * definition). Triggering that branch needs a REAL row in
 * `clarisa_actor_types` at `code = 5`. That row is NOT in the schema-only
 * baseline snapshot (same FP-16 situation as `actor_roles` id 1), and
 * `innovation-use-validation.fixture-spec.ts` (T-12) already owns a plain,
 * un-guarded check-then-insert/delete lifecycle for codes `1` and `5` in its
 * own `beforeAll`/`afterAll` — NOT one of `global-setup.ts`'s four centrally
 * -seeded rows. Adding a SECOND file racing the same plain (non-`IGNORE`)
 * INSERT over `code = 5` on a cold container reproduces exactly the
 * two-writer race `global-setup.ts` was introduced to eliminate for the
 * other four rows — and this task's authorized scope does not extend to
 * touching that sibling file or `global-setup.ts` to fix it. This fixture
 * therefore flips the actor conjunct a DIFFERENT, equally genuine way that
 * needs no shared catalog at all: it seeds ONE resolvable actor row (private
 * `actor_type_id`, never `5`) for the "valid" case, then, for the SAME
 * seeded result, sets that row's `is_active = FALSE` (`:71`/`:83`'s `WHERE
 * ... AND ra.is_active = TRUE` filters it out of both `tempFullActors` and
 * `tempActors`) before the second call. `tempFullActors = tempActors` stays
 * TRUE (`0 = 0`) but `tempActors > 0` (`:111`) now fails, so the actor
 * conjunct — and only the actor conjunct, since the institution row and
 * every other field are untouched between the two calls — flips the result
 * from `1` to `0`. This is the SAME seeded result in both cases (task
 * brief's "flipped to 0 through the ACTOR block"), and is exactly as
 * sensitive to a hypothetical M3-adjacent regression in the actor-resolution
 * logic as the `code = 5` path would have been, without the cross-file race.
 *
 * Reachability is proven by the pairing itself: if `anticipatedUserId = 1`
 * or NULL had been used (short-circuiting `:108`), deactivating the actor
 * row would have NO EFFECT on the returned value (it would stay `1` in both
 * cases) — only because `anticipatedUsersId` here is the private, non-`1`,
 * non-NULL id `9164` does the second case's flip actually happen. The
 * red-before-green mutation demonstration in the T-12 execution note
 * additionally confirms this by breaking the actor conjunct directly in the
 * function body on the scratch schema and observing this file go red.
 *
 * Teardown follows the `tryStep`/`trySelect` per-step try/catch shape from
 * `innovation-use-lifecycle-routines.fixture-spec.ts` (FP-39): every step is
 * attempted, failures are collected, and cleanup rethrows once at the end
 * from a `finally` that always destroys the connection.
 */
describe('innovation_dev_validation behavioral fixture — actor block (T-12, rework attempt 2, F12b)', () => {
  const reportYear = 2103;
  const platformCode = 'T12F12B';

  // Private to this file. Distinct from 9130/9131 (T-12's other files) and
  // 9141-9149/9151 (T-13's files) — a fresh, previously-unused band.
  const innovationNatureId = 9161; // clarisa_innovation_characteristics.id
  const innovationTypeCode = 9162; // clarisa_innovation_types.code
  const innovationReadinessId = 9163; // clarisa_innovation_readiness_levels.id
  const anticipatedUsersId = 9164; // innovation_dev_anticipated_users.id — deliberately != 1
  const actorTypeCode = 9165; // clarisa_actor_types.code — deliberately != 5
  const institutionCode = 9166; // clarisa_institutions.code

  let platformSeeded = false;
  let reportYearSeeded = false;
  let innovationNatureSeeded = false;
  let innovationTypeSeeded = false;
  let innovationReadinessSeeded = false;
  let anticipatedUsersSeeded = false;
  let actorTypeSeeded = false;
  let institutionSeeded = false;

  // officialCode band: 900_000 (sp-versioning-objective-blocks), 900_100
  // (innovation-use-validation), 900_200 (innovation-use-lifecycle-routines),
  // 900_300 (innovation-use-detail-round-trip), 900_400
  // (green-check-ip-rights), 900_500 (innovation-dev-lifecycle-routines-
  // unchanged). This file reserves its own, previously-unused 900_600.
  const uniqueSuffix = Date.now();
  const officialCode = 900_600_000_000_000 + uniqueSuffix;

  let resultId: number;
  let actorId: number;

  /** Check-then-insert, returning whether THIS call created the row. */
  async function seedIfMissing(
    checkSql: string,
    checkParams: unknown[],
    insertSql: string,
    insertParams: unknown[],
  ): Promise<boolean> {
    const [existing] = await dataSource.query(checkSql, checkParams);
    if (existing) {
      return false;
    }
    await dataSource.query(insertSql, insertParams);
    return true;
  }

  async function callValidation(id: number): Promise<number> {
    const [row] = await dataSource.query(
      'SELECT innovation_dev_validation(?) AS v',
      [id],
    );
    return Number(row.v);
  }

  beforeAll(async () => {
    await dataSource.initialize();

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [platformCode],
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'T-12 F12 behavioral fixture platform')`,
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

    innovationNatureSeeded = await seedIfMissing(
      `SELECT id FROM clarisa_innovation_characteristics WHERE id = ?`,
      [innovationNatureId],
      `INSERT INTO clarisa_innovation_characteristics (id, name) VALUES (?, ?)`,
      [innovationNatureId, 'T-12 F12b private innovation nature'],
    );
    innovationTypeSeeded = await seedIfMissing(
      `SELECT code FROM clarisa_innovation_types WHERE code = ?`,
      [innovationTypeCode],
      `INSERT INTO clarisa_innovation_types (code, name) VALUES (?, ?)`,
      [innovationTypeCode, 'T-12 F12b private innovation type'],
    );
    innovationReadinessSeeded = await seedIfMissing(
      `SELECT id FROM clarisa_innovation_readiness_levels WHERE id = ?`,
      [innovationReadinessId],
      `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, ?, ?)`,
      [
        innovationReadinessId,
        1,
        'T-12 F12b private innovation readiness level',
      ],
    );
    anticipatedUsersSeeded = await seedIfMissing(
      `SELECT id FROM innovation_dev_anticipated_users WHERE id = ?`,
      [anticipatedUsersId],
      `INSERT INTO innovation_dev_anticipated_users (id, name) VALUES (?, ?)`,
      [anticipatedUsersId, 'T-12 F12b private anticipated users'],
    );
    actorTypeSeeded = await seedIfMissing(
      `SELECT code FROM clarisa_actor_types WHERE code = ?`,
      [actorTypeCode],
      `INSERT INTO clarisa_actor_types (code, name) VALUES (?, ?)`,
      [actorTypeCode, 'T-12 F12b private actor type'],
    );
    institutionSeeded = await seedIfMissing(
      `SELECT code FROM clarisa_institutions WHERE code = ?`,
      [institutionCode],
      `INSERT INTO clarisa_institutions (code, name) VALUES (?, ?)`,
      [institutionCode, 'T-12 F12b private institution'],
    );

    // The one fixed Innovation Dev result this file's two cases share.
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [officialCode, platformCode, reportYear],
    );
    resultId = result.insertId;

    // Every column `commonFields`/`tempSecondFields`/`knowledgeSharing`
    // reads (migration `:25-53`) given a concrete, valid value. The three
    // `= TRUE`-compared booleans (FP-47) are literal `0` — see file header.
    await dataSource.query(
      `INSERT INTO result_innovation_dev (
         result_id, short_title, innovation_nature_id, innovation_type_id,
         innovation_readiness_id, innovation_readiness_explanation,
         is_new_or_improved_variety, anticipated_users_id,
         expected_outcome, intended_beneficiaries_description,
         is_knowledge_sharing, is_used_beyond_original_context,
         created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        resultId,
        'F12 behavioral fixture short title',
        innovationNatureId,
        innovationTypeCode,
        innovationReadinessId,
        'F12 behavioral fixture readiness explanation.',
        0,
        anticipatedUsersId,
        'F12 behavioral fixture expected outcome',
        'F12 behavioral fixture beneficiaries description',
        0,
        0,
      ],
    );

    // One resolvable institution row (`is_organization_known = TRUE` ->
    // `institution_id IS NOT NULL`, migration `:86-87`) — held constant and
    // valid across both cases, so it can never be the thing that flips the
    // result.
    await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_role_id, is_organization_known,
         institution_id, created_by, updated_by
       ) VALUES (?, 1, TRUE, ?, 1, 1)`,
      [resultId, institutionCode],
    );

    // One resolvable actor row (`actor_type_id != 5` -> always resolvable
    // per migration `:78`, since `actor_type_id` is `NOT NULL`). Role `1`
    // reused from `global-setup.ts`'s centrally-seeded row — never created
    // or torn down here (function does not filter by role, R-IU-005 note).
    const actor = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id, created_by, updated_by
       ) VALUES (?, ?, 1, 1, 1)`,
      [resultId, actorTypeCode],
    );
    actorId = actor.insertId;
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

    const resultRows = await trySelect(
      `select results by official_code ${officialCode}`,
      () =>
        dataSource.query(
          `SELECT result_id FROM results WHERE result_official_code = ?`,
          [officialCode],
        ) as Promise<{ result_id: number }[]>,
      [] as { result_id: number }[],
    );

    for (const row of resultRows) {
      await tryStep(`delete result_actors ${row.result_id}`, () =>
        dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
          row.result_id,
        ]),
      );
      await tryStep(`delete result_institution_types ${row.result_id}`, () =>
        dataSource.query(
          `DELETE FROM result_institution_types WHERE result_id = ?`,
          [row.result_id],
        ),
      );
      await tryStep(`delete result_innovation_dev ${row.result_id}`, () =>
        dataSource.query(
          `DELETE FROM result_innovation_dev WHERE result_id = ?`,
          [row.result_id],
        ),
      );
    }

    await tryStep(`delete results official_code ${officialCode}`, () =>
      dataSource.query(`DELETE FROM results WHERE result_official_code = ?`, [
        officialCode,
      ]),
    );

    if (actorTypeSeeded) {
      await tryStep('delete private actorTypeCode', () =>
        dataSource.query(`DELETE FROM clarisa_actor_types WHERE code = ?`, [
          actorTypeCode,
        ]),
      );
    }
    if (institutionSeeded) {
      await tryStep('delete private institutionCode', () =>
        dataSource.query(`DELETE FROM clarisa_institutions WHERE code = ?`, [
          institutionCode,
        ]),
      );
    }
    if (anticipatedUsersSeeded) {
      await tryStep('delete private anticipatedUsersId', () =>
        dataSource.query(
          `DELETE FROM innovation_dev_anticipated_users WHERE id = ?`,
          [anticipatedUsersId],
        ),
      );
    }
    if (innovationReadinessSeeded) {
      await tryStep('delete private innovationReadinessId', () =>
        dataSource.query(
          `DELETE FROM clarisa_innovation_readiness_levels WHERE id = ?`,
          [innovationReadinessId],
        ),
      );
    }
    if (innovationTypeSeeded) {
      await tryStep('delete private innovationTypeCode', () =>
        dataSource.query(
          `DELETE FROM clarisa_innovation_types WHERE code = ?`,
          [innovationTypeCode],
        ),
      );
    }
    if (innovationNatureSeeded) {
      await tryStep('delete private innovationNatureId', () =>
        dataSource.query(
          `DELETE FROM clarisa_innovation_characteristics WHERE id = ?`,
          [innovationNatureId],
        ),
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

  it('F12b-1: a fully-valid Innovation Dev result (anticipated_users_id != 1, actor block reached) returns 1', async () => {
    expect(await callValidation(resultId)).toBe(1);
  });

  it('F12b-2: the SAME result, with its sole actor row deactivated, returns 0 — the actor block (M3-touched table) genuinely flips it', async () => {
    await dataSource.query(
      `UPDATE result_actors SET is_active = FALSE WHERE result_actors_id = ?`,
      [actorId],
    );

    expect(await callValidation(resultId)).toBe(0);
  });
});
