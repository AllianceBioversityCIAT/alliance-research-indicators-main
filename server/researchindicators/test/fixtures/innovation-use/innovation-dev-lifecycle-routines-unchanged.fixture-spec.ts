// @akili-spec docs/specs/innovation-use/data-model-and-catalog
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';

/**
 * T-13 (`docs/specs/innovation-use/data-model-and-catalog`) — F16,
 * `design.md` §6.5 / §6.7's blast-radius note. Backs R-IU-011 AC.6.
 *
 * **F16 is the only routine regression gate — not F12.** F12
 * (`innovation-dev-validation-unchanged.fixture-spec.ts`, T-12) compares a
 * stored FUNCTION's body as text and executes no routine. F16 must
 * EXECUTE all four lifecycle routines against a real Innovation Dev result
 * and compare every copied column and every surviving row — the routine
 * body can read identically to a human and still misbehave (or a
 * hand-diff can miss a column), so only running it proves anything
 * (R-IU-011's Scenario: "IT MUST be proven by executing the routine, not
 * by reading the migration").
 *
 * All four routines serve all six indicators (design.md §6.7 blast-radius
 * note; KZ-002 at the server tier: enumerate by *what reads the table*,
 * not by where the feature lives). M6's six edits are additive-only and
 * confined to `result_actors`'s and `result_institution_types`'s NEW count
 * columns and to `result_innovation_use` itself — none of the six touches
 * an Innovation Dev column, an Innovation Dev row, or the pre-existing
 * `result_innovation_dev` copy/delete/update block. This fixture proves
 * that invariant holds for real, on the migrated schema, by seeding a full
 * Innovation Dev result and running all four routines against it.
 *
 * IMPORTANT — what this fixture's red-before-green input is, and is NOT:
 * none of M6's six edits, if individually removed, would turn this
 * fixture red — by design, since none of the six touches Innovation Dev.
 * (That is the point: F16 is the proof that they don't.) The gate design.md
 * §4.3 actually specifies for F16 is different: "Any edit that changes an
 * Innovation Dev column or row across the four routines — including
 * 'harmonizing' the delete divergence." The manual red demonstration
 * reported in the T-13 execution note therefore injects a hypothetical
 * *bad* edit (e.g. dropping one `result_innovation_dev` column from
 * `SP_versioning`'s existing copy block) directly against the scratch
 * schema, confirms this fixture goes red, then restores M6's real,
 * shipped bodies — never one of the six real M6 edits removed, which
 * would leave this fixture (correctly) green.
 *
 * Seeds one full Innovation Dev result: a `result_innovation_dev` detail
 * row (every column nullable, so no CLARISA catalog FK dependency is
 * required — design.md §3.3/§3.4 confirms none of the touched columns
 * are catalog-FK'd except by nullable ids left NULL here), one
 * `result_actors` row using the LEGACY boolean columns Innovation Dev
 * still reads/writes (`women_youth`, `women_not_youth`, `men_youth`,
 * `men_not_youth`) with the five NEW count columns left NULL (Innovation
 * Dev never populates them — proving the new columns are inert for this
 * indicator), and one `result_institution_types` row with
 * `organization_count` left NULL likewise.
 *
 * `actor_roles` id 1 and `institution_type_roles` id 1 (both
 * "innovation-development") are seeded by a migration that PREDATES the
 * committed schema-only baseline snapshot's cutoff — its DDL is captured,
 * its data INSERT is not (same trap as T-12's FP-16 for `actor_roles`
 * id 1; empirically re-confirmed here for `institution_type_roles` id 1,
 * which turns out NOT to be present either).
 *
 * Both rows are semantically fixed values (the real "Innovation Dev" role
 * id in each catalog) rather than arbitrary sentinels this file can pick
 * its own private code for — and `actor_roles` id 1 is ALSO seeded,
 * idempotently, by T-12's `innovation-use-validation.fixture-spec.ts`
 * (F11). Plain check-then-insert on a row two files can both touch races
 * under Jest's parallel per-file workers (FP-39 / A-9 — confirmed
 * empirically while authoring this file's sibling, over a *different*
 * shared row: reusing report year 2097 produced a real `Duplicate entry`
 * failure). Both catalog rows are therefore seeded with `INSERT IGNORE`,
 * whose `affectedRows` is unambiguous through this driver (1 = this call
 * created it, 0 = it already existed) — unlike `INSERT ... ON DUPLICATE
 * KEY UPDATE`, which this driver reports as `affectedRows = 1` for BOTH a
 * fresh insert and a no-op update on an already-existing row, verified
 * empirically against a scratch table before choosing `INSERT IGNORE`
 * instead.
 *
 * **Neither row is ever deleted in `afterAll`, even when this file was the
 * creator.** Empirically discovered while verifying this file: a version
 * that deleted `actor_roles` id 1 whenever `actorRoleDevSeeded` was true
 * raced against T-12's `innovation-use-validation.fixture-spec.ts` (F11)
 * running concurrently in a different Jest worker — this file's cleanup
 * deleted the row while T-12's F11 test was still using it, and T-12's own
 * `result_actors` insert then failed with MySQL 1452 (FK constraint fails)
 * for a row that existed moments earlier. Both ids are therefore treated
 * exactly like `STAR` and `result_status` id 8 below: permanent,
 * foundational, cross-file-shared reference data that no individual
 * fixture file tears down. The `actorRoleDevSeeded` /
 * `institutionTypeRoleDevSeeded` flags are retained only as a diagnostic
 * (recording whether this file's own call was the creator), not to gate a
 * delete.
 *
 * Only F16a calls `SP_versioning` directly (the only one of the four
 * routines that filters its source lookup by `platform_code = 'STAR'`,
 * transcript `1783029013035:93`). F16b seeds its pre-existing "snapshot"
 * row directly instead of calling `SP_versioning` to create one —
 * `SP_delete_result_version`'s own guard (transcript §3) has no platform
 * filter — which avoids the `STAR` dependency there and isolates "does the
 * delete routine orphan the row" from "does versioning work" (FP-42).
 * `STAR` and `result_status` id 8 (`delete_result` unconditionally sets
 * `results.result_status_id = 8`, transcript §5, requiring the row to
 * exist via its FK) are real, foundational, cross-file-shared reference
 * values, seeded via `INSERT IGNORE` and — unlike this file's own private
 * rows — NEVER deleted in `afterAll`, for the same reason as this file's
 * T-13 sibling: deleting a row another fixture file's concurrently-running
 * test may still depend on is a hazard under Jest's parallel per-file
 * workers.
 */
describe('Innovation Dev lifecycle routines are unchanged by M6 (T-13, F16)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2102;
  const platformCode = 'T13IUDR';
  const actorTypeCode = 9131;
  const starPlatformCode = 'STAR';
  const deletedResultStatusId = 8;

  let platformSeeded = false;
  let reportYearSeeded = false;
  let actorTypeOneSeeded = false;
  let actorRoleDevSeeded = false;
  let institutionTypeRoleDevSeeded = false;

  const officialCodes: number[] = [];
  let nextCode = 900_300_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  interface DevFixture {
    resultId: number;
    officialCode: number;
  }

  const devDetail = {
    short_title: 'F16 Innovation Dev fixture short title',
    innovation_readiness_explanation:
      'F16 Innovation Dev fixture readiness explanation.',
    no_sex_age_disaggregation: false,
    expected_outcome: 'F16 fixture expected outcome',
    intended_beneficiaries_description: 'F16 fixture beneficiaries',
    is_new_or_improved_variety: true,
    new_or_improved_varieties_count: 3,
    is_knowledge_sharing: false,
    tool_useful_context: 'F16 fixture tool useful context',
    results_achieved_expected: 'F16 fixture results achieved',
    is_used_beyond_original_context: true,
    adoption_adaptation_context: 'F16 fixture adoption context',
    other_tools: 'F16 fixture other tools',
    other_tools_integration: 'F16 fixture other tools integration',
    is_cheaper_than_alternatives: 1,
    is_simpler_to_use: 0,
    does_perform_better: 1,
    is_desirable_to_users: 1,
    has_commercial_viability: 0,
    has_suitable_enabling_environment: 1,
    has_evidence_of_uptake: 1,
    expansion_adaptation_details: 'F16 fixture expansion details',
  };

  async function seedDevResult(
    platform: string = platformCode,
    isSnapshot = false,
  ): Promise<DevFixture> {
    const officialCode = nextOfficialCode();
    officialCodes.push(officialCode);
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, ?, NULL)`,
      [officialCode, platform, reportYear, isSnapshot ? 1 : 0],
    );
    const resultId = result.insertId;

    await dataSource.query(
      `INSERT INTO result_innovation_dev (
         result_id, short_title, innovation_readiness_explanation,
         no_sex_age_disaggregation, expected_outcome,
         intended_beneficiaries_description, is_new_or_improved_variety,
         new_or_improved_varieties_count, is_knowledge_sharing,
         tool_useful_context, results_achieved_expected,
         is_used_beyond_original_context, adoption_adaptation_context,
         other_tools, other_tools_integration, is_cheaper_than_alternatives,
         is_simpler_to_use, does_perform_better, is_desirable_to_users,
         has_commercial_viability, has_suitable_enabling_environment,
         has_evidence_of_uptake, expansion_adaptation_details,
         created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        resultId,
        devDetail.short_title,
        devDetail.innovation_readiness_explanation,
        devDetail.no_sex_age_disaggregation,
        devDetail.expected_outcome,
        devDetail.intended_beneficiaries_description,
        devDetail.is_new_or_improved_variety,
        devDetail.new_or_improved_varieties_count,
        devDetail.is_knowledge_sharing,
        devDetail.tool_useful_context,
        devDetail.results_achieved_expected,
        devDetail.is_used_beyond_original_context,
        devDetail.adoption_adaptation_context,
        devDetail.other_tools,
        devDetail.other_tools_integration,
        devDetail.is_cheaper_than_alternatives,
        devDetail.is_simpler_to_use,
        devDetail.does_perform_better,
        devDetail.is_desirable_to_users,
        devDetail.has_commercial_viability,
        devDetail.has_suitable_enabling_environment,
        devDetail.has_evidence_of_uptake,
        devDetail.expansion_adaptation_details,
      ],
    );

    await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id,
         sex_age_disaggregation_not_apply,
         women_youth, women_not_youth, men_youth, men_not_youth,
         created_by, updated_by
       ) VALUES (?, ?, 1, FALSE, TRUE, FALSE, TRUE, FALSE, 1, 1)`,
      [resultId, actorTypeCode],
    );

    await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_role_id, is_organization_known,
         created_by, updated_by
       ) VALUES (?, 1, FALSE, 1, 1)`,
      [resultId],
    );

    return { resultId, officialCode };
  }

  async function fetchDevRow(resultId: number) {
    const [row] = await dataSource.query(
      `SELECT short_title, innovation_readiness_explanation,
              no_sex_age_disaggregation, expected_outcome,
              intended_beneficiaries_description, is_new_or_improved_variety,
              new_or_improved_varieties_count, is_knowledge_sharing,
              tool_useful_context, results_achieved_expected,
              is_used_beyond_original_context, adoption_adaptation_context,
              other_tools, other_tools_integration, is_cheaper_than_alternatives,
              is_simpler_to_use, does_perform_better, is_desirable_to_users,
              has_commercial_viability, has_suitable_enabling_environment,
              has_evidence_of_uptake, expansion_adaptation_details
       FROM result_innovation_dev WHERE result_id = ?`,
      [resultId],
    );
    return row;
  }

  async function fetchActorRow(resultId: number) {
    const [row] = await dataSource.query(
      `SELECT actor_type_id, actor_role_id, sex_age_disaggregation_not_apply,
              women_youth, women_not_youth, men_youth, men_not_youth,
              women_youth_count, women_not_youth_count, men_youth_count,
              men_not_youth_count, actors_count
       FROM result_actors WHERE result_id = ?`,
      [resultId],
    );
    return row;
  }

  async function fetchInstitutionTypeRow(resultId: number) {
    const [row] = await dataSource.query(
      `SELECT institution_type_role_id, is_organization_known, organization_count
       FROM result_institution_types WHERE result_id = ?`,
      [resultId],
    );
    return row;
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
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'T-13 Innovation Dev regression fixture platform')`,
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

    // Private to this file (not code 1 or 5, which T-12's fixtures already
    // use, nor 9130, which this file's T-13 sibling uses) — plain
    // check-then-insert cannot race against another file for this row.
    const [existingActorType] = await dataSource.query(
      `SELECT code FROM clarisa_actor_types WHERE code = ?`,
      [actorTypeCode],
    );
    if (!existingActorType) {
      await dataSource.query(
        `INSERT INTO clarisa_actor_types (code, name) VALUES (?, 'T-13 Innovation Dev regression fixture actor type')`,
        [actorTypeCode],
      );
      actorTypeOneSeeded = true;
    }

    // FP-16 (T-12), re-confirmed empirically here for both catalogs: the
    // pre-baseline seed migration's INSERTs into `actor_roles` /
    // `institution_type_roles` id 1 ("innovation-development") do not
    // reproduce from the schema-only baseline snapshot. Only id 2
    // ("innovation-use", M4) is present. Both ids are real, fixed values
    // (not sentinels this file can privatize) and `actor_roles` id 1 is
    // ALSO seeded by T-12's `innovation-use-validation.fixture-spec.ts` —
    // `INSERT IGNORE` makes each seed atomic and its `affectedRows` an
    // unambiguous "did THIS call create it" flag (see file header).
    const actorRoleResult = await dataSource.query(
      `INSERT IGNORE INTO actor_roles (actor_role_id, name) VALUES (1, 'innovation-development')`,
    );
    actorRoleDevSeeded = actorRoleResult.affectedRows === 1;

    const institutionTypeRoleResult = await dataSource.query(
      `INSERT IGNORE INTO institution_type_roles (institution_type_role_id, name) VALUES (1, 'innovation-development')`,
    );
    institutionTypeRoleDevSeeded = institutionTypeRoleResult.affectedRows === 1;
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

    for (const officialCode of officialCodes) {
      const resultRows: { result_id: number }[] = await dataSource
        .query(`SELECT result_id FROM results WHERE result_official_code = ?`, [
          officialCode,
        ])
        .catch(() => [] as { result_id: number }[]);
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
        await tryStep(`delete result_innovation_dev ${resultId}`, () =>
          dataSource.query(
            `DELETE FROM result_innovation_dev WHERE result_id = ?`,
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

    // `actor_roles` id 1 and `institution_type_roles` id 1 are deliberately
    // NEVER deleted here, even when `actorRoleDevSeeded` /
    // `institutionTypeRoleDevSeeded` is true. Empirically discovered while
    // verifying this file: deleting them at THIS file's `afterAll` raced
    // against T-12's `innovation-use-validation.fixture-spec.ts` (F11),
    // which ALSO depends on `actor_roles` id 1 and can still be mid-test in
    // a concurrent Jest worker — its own `result_actors` insert then hit
    // MySQL 1452 (FK constraint fails) because this file had just deleted
    // the row out from under it. Both ids are treated the same as `STAR`
    // and `result_status` id 8 (see file header): permanent, foundational,
    // cross-file-shared scratch-schema reference data, never torn down by
    // an individual fixture file. `actorRoleDevSeeded` /
    // `institutionTypeRoleDevSeeded` are retained only to record whether
    // this file's own seed call was the creator (diagnostic value in a
    // failure report), not to gate a delete.
    void institutionTypeRoleDevSeeded;
    void actorRoleDevSeeded;
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

  it('F16a: SP_versioning still copies every result_innovation_dev column, the legacy result_actors booleans, and result_institution_types unchanged', async () => {
    const { resultId, officialCode } = await seedDevResult(starPlatformCode);

    await dataSource.query(`CALL SP_versioning(?)`, [officialCode]);
    const [snapshot] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [officialCode],
    );
    expect(snapshot).toBeDefined();
    const newResultId = snapshot.result_id;

    const sourceDev = await fetchDevRow(resultId);
    const copiedDev = await fetchDevRow(newResultId);
    expect(copiedDev).toBeDefined();
    expect(copiedDev).toEqual(sourceDev);

    const sourceActor = await fetchActorRow(resultId);
    const copiedActor = await fetchActorRow(newResultId);
    expect(copiedActor).toBeDefined();
    expect(copiedActor).toEqual(sourceActor);
    // The five NEW count columns are inert for Innovation Dev — confirm
    // they stayed NULL through the copy rather than merely matching the
    // (also-NULL) source, which a bad copy could satisfy by accident.
    expect(copiedActor.women_youth_count).toBeNull();
    expect(copiedActor.actors_count).toBeNull();

    const sourceInstitutionType = await fetchInstitutionTypeRow(resultId);
    const copiedInstitutionType = await fetchInstitutionTypeRow(newResultId);
    expect(copiedInstitutionType).toBeDefined();
    expect(copiedInstitutionType).toEqual(sourceInstitutionType);
    expect(copiedInstitutionType.organization_count).toBeNull();
  }, 30000);

  it('F16b: SP_delete_result_version still hard-removes an Innovation Dev version and its result_innovation_dev row', async () => {
    // Seeded directly as an already-existing snapshot (is_snapshot = TRUE)
    // — `SP_delete_result_version`'s own guard has no platform filter, so
    // this needs no `SP_versioning` call and no `STAR` platform (see file
    // header).
    const { resultId: snapshotResultId, officialCode } = await seedDevResult(
      platformCode,
      true,
    );

    await dataSource.query(`CALL SP_delete_result_version(?, ?)`, [
      officialCode,
      reportYear,
    ]);

    const remainingDev = await dataSource.query(
      `SELECT result_id FROM result_innovation_dev WHERE result_id = ?`,
      [snapshotResultId],
    );
    expect(remainingDev).toHaveLength(0);
    const remainingActor = await dataSource.query(
      `SELECT result_actors_id FROM result_actors WHERE result_id = ?`,
      [snapshotResultId],
    );
    expect(remainingActor).toHaveLength(0);
    const remainingResult = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [snapshotResultId],
    );
    expect(remainingResult).toHaveLength(0);
  }, 30000);

  it('F16c: full_delete_result_version still hard-removes an Innovation Dev result and its result_innovation_dev row', async () => {
    const { resultId, officialCode } = await seedDevResult();

    const [row] = await dataSource.query(
      `SELECT full_delete_result_version(?) AS ok`,
      [resultId],
    );
    expect(Number(row.ok)).toBe(1);

    const remainingDev = await dataSource.query(
      `SELECT result_id FROM result_innovation_dev WHERE result_id = ?`,
      [resultId],
    );
    expect(remainingDev).toHaveLength(0);
    const remainingResult = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [resultId],
    );
    expect(remainingResult).toHaveLength(0);

    officialCodes.splice(officialCodes.indexOf(officialCode), 1);
  }, 30000);

  it('F16d: delete_result still soft-deletes an Innovation Dev result and its result_innovation_dev row', async () => {
    const { resultId } = await seedDevResult();

    const [row] = await dataSource.query(`SELECT delete_result(?) AS ok`, [
      resultId,
    ]);
    expect(Number(row.ok)).toBe(1);

    const [devAfterDelete] = await dataSource.query(
      `SELECT is_active, deleted_at FROM result_innovation_dev WHERE result_id = ?`,
      [resultId],
    );
    expect(devAfterDelete).toBeDefined();
    expect(Number(devAfterDelete.is_active)).toBe(0);
    expect(devAfterDelete.deleted_at).not.toBeNull();

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
