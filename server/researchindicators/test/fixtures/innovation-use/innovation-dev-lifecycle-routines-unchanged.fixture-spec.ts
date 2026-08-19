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
 * (That is the point: F16 is the proof that they don't.) The gate
 * `requirements.md` §4.3 actually specifies for F16 is different
 * *(corrected 2026-08-18, T-13 rework attempt 2, B-3 — the prior text
 * mis-cited `design.md` §4.3)*: "Any edit that changes an Innovation Dev
 * column or row across the four routines — including 'harmonizing' the
 * delete divergence." The manual red demonstration reported in the T-13
 * execution note therefore injects a hypothetical *bad* edit (e.g. dropping
 * one `result_innovation_dev` column from `SP_versioning`'s existing copy
 * block) directly against the scratch schema, confirms this fixture goes
 * red, then restores M6's real, shipped bodies — never one of the six real
 * M6 edits removed, which would leave this fixture (correctly) green. The
 * same technique also proves F16b/c/d discriminate on their OWN routine's
 * pre-existing (non-M6) Innovation Dev statement — see the execution note's
 * red-before-green table.
 *
 * Seeds one full Innovation Dev result: a `result_innovation_dev` detail
 * row with EVERY copied column given a concrete, non-NULL, mutually
 * distinct value where a catalog FK does not make that impossible
 * (rework attempt 2, FAIL-1 — a column left NULL on both the source and a
 * hypothetically-dropped copy is a vacuous pass, and two same-valued
 * columns hide a positional swap between them), one `result_actors` row
 * using the LEGACY boolean columns Innovation Dev still reads/writes
 * (`women_youth`, `women_not_youth`, `men_youth`, `men_not_youth`) with the
 * five NEW count columns left NULL (Innovation Dev never populates them —
 * proving the new columns are inert for this indicator), and one
 * `result_institution_types` row with `organization_count` left NULL
 * likewise.
 *
 * **`actor_roles` / `institution_type_roles`, rework attempt 2 (FAIL-4):**
 * attempt 1 used the REAL id 1 ("innovation-development") in both catalogs
 * and reasoned it could not privatize them because they are the actual
 * production role ids. That reasoning does not hold for what F16 asserts:
 * neither `SP_versioning`, `SP_delete_result_version`,
 * `full_delete_result_version`, nor `delete_result` filters `result_actors`
 * or `result_institution_types` by role anywhere in their bodies — `SP_
 * versioning`'s copy blocks key only on `result_id`/`is_active` (migration
 * `1787083305648` :730-732, :765-766) and both delete routines remove by
 * `result_id` alone. The role ids are pure FK ballast for this fixture's
 * purposes — `actor_role_id`/`institution_type_role_id` are themselves
 * columns F16 copy-compares, so they need SOME valid, resolvable value, not
 * specifically id 1. This file therefore seeds its OWN private role ids
 * (`devActorRoleId` / `devInstitutionTypeRoleId` below), exactly like its
 * already-private `clarisa_actor_types` code — discharging the cross-file
 * race (A-9) **by privacy** instead of by an argument that turned out not
 * to hold. `innovation-use-validation.fixture-spec.ts` (T-12, F11) is the
 * ONLY fixture that still needs the REAL `actor_roles` id 1 (its role-filter
 * assertion is non-vacuous only against the real id) — `test/fixtures/
 * global-setup.ts` now seeds that row once, before any worker starts, so
 * neither file's `beforeAll` can race the other over it, and neither file
 * tears it down.
 *
 * **The `STAR` / `result_status` id 8 race, rework attempt 2 (FAIL-2):**
 * attempt 1 seeded both via `INSERT IGNORE` and never deleted them, which
 * only suppresses the race on a WARM schema (the residue itself is what
 * prevents the race from firing on a rerun) and leaves it live on a COLD
 * one — exactly the run `T-14` repeats. `test/fixtures/global-setup.ts`
 * (Jest `globalSetup`, wired in `test/jest-fixtures.json`) now seeds `STAR`
 * and `result_status` id 8 exactly once, in Jest's main process, strictly
 * before any worker starts — removing the race structurally rather than
 * suppressing its symptom. This file's own `INSERT IGNORE` calls below are
 * kept as a harmless, idempotent, redundant safety net (never the primary
 * seed point), and this file still never deletes either row.
 */
describe('Innovation Dev lifecycle routines are unchanged by M6 (T-13, F16)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2102;
  const platformCode = 'T13IUDR';
  const actorTypeCode = 9131;
  const starPlatformCode = 'STAR';
  const deletedResultStatusId = 8;

  // Private to THIS file, replacing attempt 1's dependency on the REAL
  // `actor_roles` / `institution_type_roles` id 1 (FAIL-4 above). Distinct
  // from `actorTypeCode` (9131, `clarisa_actor_types`) and from the private
  // catalog-id band below (9141-9149) — a different table per number, so no
  // collision, but a distinct numeral keeps failure output unambiguous.
  const devActorRoleId = 9151;
  const devInstitutionTypeRoleId = 9151;

  // Private Innovation Dev catalog rows (FAIL-1 remediation (b)): every
  // catalog-FK'd column `seedDevResult` previously left NULL now gets a
  // resolvable, private, mutually distinct id — a dropped copy-list column
  // now reads NULL against a non-NULL source instead of NULL-vs-NULL.
  const innovationNatureId = 9141; // clarisa_innovation_characteristics.id
  const innovationTypeCode = 9142; // clarisa_innovation_types.code
  const innovationReadinessId = 9143; // clarisa_innovation_readiness_levels.id
  const anticipatedUsersId = 9144; // innovation_dev_anticipated_users.id
  const disseminationQualificationId = 9145; // dissemination_qualifications.id
  const expansionPotentialId = 9146; // expansion_potentials.id
  // `institution_type_id` and `sub_institution_type_id` both FK to
  // `clarisa_institution_types (code)` — DELIBERATELY distinct codes so a
  // transposition between the two columns is visible.
  const institutionTypeCode = 9147; // clarisa_institution_types.code (institution_type_id)
  const subInstitutionTypeCode = 9148; // clarisa_institution_types.code (sub_institution_type_id)
  const institutionCode = 9149; // clarisa_institutions.code (institution_id)

  let platformSeeded = false;
  let reportYearSeeded = false;
  let actorTypeOneSeeded = false;
  // Ownership flags for the private rows seeded in `beforeAll` below, via
  // the shared `seedIfMissing` helper.
  let devActorRoleSeeded = false;
  let devInstitutionTypeRoleSeeded = false;
  let innovationNatureSeeded = false;
  let innovationTypeSeeded = false;
  let innovationReadinessSeeded = false;
  let anticipatedUsersSeeded = false;
  let disseminationQualificationSeeded = false;
  let expansionPotentialSeeded = false;
  let institutionTypeSeeded = false;
  let subInstitutionTypeSeeded = false;
  let institutionSeeded = false;

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

  // officialCode band: 900_000 (T-02, sp-versioning-objective-blocks),
  // 900_100 (T-12, innovation-use-validation), 900_200 (T-13,
  // innovation-use-lifecycle-routines), 900_300 (T-12,
  // innovation-use-detail-round-trip), 900_400 (green-check-ip-rights).
  // This file used 900_300 through rework attempt 1 — a direct collision
  // with innovation-use-detail-round-trip's band (FAIL-5) — and now
  // reserves its own, previously-unused 900_500.
  const officialCodes: number[] = [];
  let nextCode = 900_500_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  interface DevFixture {
    resultId: number;
    officialCode: number;
  }

  // Every copied column given a concrete value; same-typed neighbours (the
  // seven `int` columns, and — widened in rework attempt 3, Lens B — the
  // eleven boolean `tinyint` columns across the three tables plus the four
  // audit columns per table) are mutually distinct where the column's
  // domain allows it (rework attempt 2, FAIL-1 — a positional swap between
  // two equal-valued columns in the migration's copy-list-vs-SELECT-list
  // pairing is otherwise invisible to ANY comparison technique, literal or
  // dynamic).
  //
  // Rework attempt 3, Lens B: attempt 2's claim that "full mutual
  // distinctness is mathematically impossible" for the boolean columns was
  // wrong and is deleted. `no_sex_age_disaggregation`, `is_knowledge_sharing`,
  // `is_used_beyond_original_context`, and `is_new_or_improved_variety`
  // (`baseline.sql:3206/3210/3214/3227`) — and `result_actors`'s
  // `sex_age_disaggregation_not_apply`/`women_youth`/`women_not_youth`/
  // `men_youth`/`men_not_youth` (`baseline.sql:2813-2817`) — are plain
  // `tinyint DEFAULT NULL` with NO CHECK constraint and no trigger anywhere
  // in the migration set restricting them to 0/1 (verified: the only
  // `CHECK` hits in `baseline.sql` are on `innovation_readiness_explanation`
  // and `FOREIGN_KEY_CHECKS`/`UNIQUE_CHECKS` session variables). The domain
  // is the full `tinyint` range, so every one of these columns now takes a
  // distinct sentinel >= 2 instead of alternating FALSE/TRUE. `is_active` is
  // the one column that must stay `1` (the copy blocks filter
  // `WHERE ... is_active = TRUE`) — leaving every other tinyint >= 2 makes
  // `is_active` unique by construction too, closing the neighbourhood
  // completely. `result_institution_types`'s lone boolean,
  // `is_organization_known`, is left at `FALSE` (0) deliberately: with
  // `is_active` at 1, the two are already mutually distinct, so there is
  // nothing to diversify there.
  //
  // The audit columns (`created_by`/`updated_by`, `created_at`/`updated_at`)
  // get the same treatment in all three INSERTs below: two distinct literal
  // values (`auditCreatedBy`/`auditUpdatedBy`) and two distinct literal
  // timestamps (`auditCreatedAt`/`auditUpdatedAt`), replacing the previous
  // `1, 1` literal and the shared `CURRENT_TIMESTAMP(6)` default that left
  // both pairs transposition-blind.
  //
  // No residual transposition gap remains in this fixture after this
  // change — every same-typed column pairing within each of the three
  // INSERTs' copy-list-vs-SELECT-list mapping is now mutually distinct,
  // verified column-by-column against `baseline.sql`, not assumed.
  const devDetail = {
    short_title: 'F16 Innovation Dev fixture short title',
    innovation_readiness_explanation:
      'F16 Innovation Dev fixture readiness explanation.',
    no_sex_age_disaggregation: 2,
    expected_outcome: 'F16 fixture expected outcome',
    intended_beneficiaries_description: 'F16 fixture beneficiaries',
    is_new_or_improved_variety: 5,
    new_or_improved_varieties_count: 3,
    is_knowledge_sharing: 3,
    tool_useful_context: 'F16 fixture tool useful context',
    results_achieved_expected: 'F16 fixture results achieved',
    is_used_beyond_original_context: 4,
    adoption_adaptation_context: 'F16 fixture adoption context',
    other_tools: 'F16 fixture other tools',
    other_tools_integration: 'F16 fixture other tools integration',
    // Seven plain `int` columns (no CHECK constraint restricts them to
    // 0/1) — given seven mutually distinct sentinel values instead of
    // attempt 1's 1/0 pattern (four 1s, two 0s), which left several pairs
    // swap-blind.
    is_cheaper_than_alternatives: 101,
    is_simpler_to_use: 102,
    does_perform_better: 103,
    is_desirable_to_users: 104,
    has_commercial_viability: 105,
    has_suitable_enabling_environment: 106,
    has_evidence_of_uptake: 107,
    expansion_adaptation_details: 'F16 fixture expansion details',
  };

  const actorCustomName = 'F16 fixture actor custom name sentinel';
  const institutionTypeCustomName =
    'F16 fixture institution type custom name sentinel';

  // `result_actors`'s five legacy boolean `tinyint` columns (rework attempt
  // 3, Lens B remediation) — `baseline.sql:2813-2817` declares all five as
  // plain `tinyint DEFAULT NULL`, no CHECK/trigger, so each gets a distinct
  // sentinel >= 2 instead of attempt 2's FALSE/TRUE alternation. This closes
  // the `women_youth <-> men_youth` blind spot Lens B named as the single
  // most plausible copy-paste error in a hand-maintained SELECT list.
  const actorSexAgeDisaggregationNotApply = 2;
  const actorWomenYouth = 3;
  const actorWomenNotYouth = 4;
  const actorMenYouth = 5;
  const actorMenNotYouth = 6;

  // Audit columns (rework attempt 3, Lens B remediation) — `created_by`/
  // `updated_by` previously shared the literal `1, 1` and `created_at`/
  // `updated_at` both defaulted to the same `CURRENT_TIMESTAMP(6)` in every
  // one of the three INSERTs below, so a `created_by <-> updated_by` or
  // `created_at <-> updated_at` transposition in any copy block was
  // invisible. Two distinct literal values/timestamps close that gap.
  const auditCreatedBy = 41;
  const auditUpdatedBy = 42;
  const auditCreatedAt = new Date('2024-01-01T00:00:00.000Z');
  const auditUpdatedAt = new Date('2024-01-02T00:00:00.000Z');

  /**
   * `created_at`/`updated_at` may come back from the raw `mysql2` driver as
   * either a `Date` or a date string depending on column/session settings —
   * `new Date(value)` normalizes either shape before comparing instants.
   */
  function toTime(value: unknown): number {
    return new Date(value as string | number | Date).getTime();
  }

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
         result_id, short_title, innovation_nature_id, innovation_type_id,
         innovation_readiness_id, no_sex_age_disaggregation,
         anticipated_users_id, expected_outcome,
         intended_beneficiaries_description, is_knowledge_sharing,
         dissemination_qualification_id, tool_useful_context,
         results_achieved_expected, is_used_beyond_original_context,
         adoption_adaptation_context, other_tools, other_tools_integration,
         is_cheaper_than_alternatives, is_simpler_to_use, does_perform_better,
         is_desirable_to_users, has_commercial_viability,
         has_suitable_enabling_environment, has_evidence_of_uptake,
         expansion_potential_id, expansion_adaptation_details,
         new_or_improved_varieties_count, is_new_or_improved_variety,
         innovation_readiness_explanation,
         created_at, updated_at, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resultId,
        devDetail.short_title,
        innovationNatureId,
        innovationTypeCode,
        innovationReadinessId,
        devDetail.no_sex_age_disaggregation,
        anticipatedUsersId,
        devDetail.expected_outcome,
        devDetail.intended_beneficiaries_description,
        devDetail.is_knowledge_sharing,
        disseminationQualificationId,
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
        expansionPotentialId,
        devDetail.expansion_adaptation_details,
        devDetail.new_or_improved_varieties_count,
        devDetail.is_new_or_improved_variety,
        devDetail.innovation_readiness_explanation,
        auditCreatedAt,
        auditUpdatedAt,
        auditCreatedBy,
        auditUpdatedBy,
      ],
    );

    await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id, actor_type_custom_name,
         sex_age_disaggregation_not_apply,
         women_youth, women_not_youth, men_youth, men_not_youth,
         created_at, updated_at, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resultId,
        actorTypeCode,
        devActorRoleId,
        actorCustomName,
        actorSexAgeDisaggregationNotApply,
        actorWomenYouth,
        actorWomenNotYouth,
        actorMenYouth,
        actorMenNotYouth,
        auditCreatedAt,
        auditUpdatedAt,
        auditCreatedBy,
        auditUpdatedBy,
      ],
    );

    await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_role_id, institution_type_id,
         sub_institution_type_id, institution_type_custom_name,
         is_organization_known, institution_id,
         created_at, updated_at, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, FALSE, ?, ?, ?, ?, ?)`,
      [
        resultId,
        devInstitutionTypeRoleId,
        institutionTypeCode,
        subInstitutionTypeCode,
        institutionTypeCustomName,
        institutionCode,
        auditCreatedAt,
        auditUpdatedAt,
        auditCreatedBy,
        auditUpdatedBy,
      ],
    );

    return { resultId, officialCode };
  }

  /**
   * `SELECT *`, not a hand-enumerated column list (rework attempt 2,
   * FAIL-1(a)) — every column the migration's copy block touches is
   * compared, including any a future migration adds, without re-creating
   * the enumerate-by-name failure the routines themselves embody. The
   * caller drops the identity/PK column(s) before comparing, since those
   * legitimately differ between the source row and its copy.
   *
   * Rework attempt 3, Lens B advisory (B-2): asserts exactly one row before
   * destructuring — previously `const [row] = await dataSource.query(...)`
   * silently read only the first row, so a copy block that (incorrectly)
   * inserted the row twice would still pass.
   */
  async function fetchFullRow(
    table: string,
    resultId: number,
    omitColumns: string[],
  ): Promise<Record<string, unknown>> {
    const rows: Record<string, unknown>[] = await dataSource.query(
      `SELECT * FROM ${table} WHERE result_id = ?`,
      [resultId],
    );
    expect(rows).toHaveLength(1);
    const trimmed: Record<string, unknown> = { ...rows[0] };
    for (const column of omitColumns) {
      delete trimmed[column];
    }
    return trimmed;
  }

  beforeAll(async () => {
    await dataSource.initialize();

    // Foundational, cross-file-shared reference rows are seeded ONCE by
    // `test/fixtures/global-setup.ts`, before any worker starts (see file
    // header, FAIL-2). These calls are a harmless, idempotent, redundant
    // safety net — never the primary seed point — and this file never
    // deletes either row.
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

    // Private role ids (FAIL-4) — replacing the REAL `actor_roles` /
    // `institution_type_roles` id 1 this file used through rework attempt 1.
    devActorRoleSeeded = await seedIfMissing(
      `SELECT actor_role_id FROM actor_roles WHERE actor_role_id = ?`,
      [devActorRoleId],
      `INSERT INTO actor_roles (actor_role_id, name) VALUES (?, ?)`,
      [devActorRoleId, 'T-13 F16 private actor role'],
    );
    devInstitutionTypeRoleSeeded = await seedIfMissing(
      `SELECT institution_type_role_id FROM institution_type_roles WHERE institution_type_role_id = ?`,
      [devInstitutionTypeRoleId],
      `INSERT INTO institution_type_roles (institution_type_role_id, name) VALUES (?, ?)`,
      [devInstitutionTypeRoleId, 'T-13 F16 private institution type role'],
    );

    // Private Innovation Dev catalog rows (FAIL-1(b)) — every one of the
    // six catalog-id columns `seedDevResult` copies now resolves through a
    // real FK to a row only this file owns.
    innovationNatureSeeded = await seedIfMissing(
      `SELECT id FROM clarisa_innovation_characteristics WHERE id = ?`,
      [innovationNatureId],
      `INSERT INTO clarisa_innovation_characteristics (id, name) VALUES (?, ?)`,
      [innovationNatureId, 'T-13 F16 private innovation nature'],
    );
    innovationTypeSeeded = await seedIfMissing(
      `SELECT code FROM clarisa_innovation_types WHERE code = ?`,
      [innovationTypeCode],
      `INSERT INTO clarisa_innovation_types (code, name) VALUES (?, ?)`,
      [innovationTypeCode, 'T-13 F16 private innovation type'],
    );
    innovationReadinessSeeded = await seedIfMissing(
      `SELECT id FROM clarisa_innovation_readiness_levels WHERE id = ?`,
      [innovationReadinessId],
      `INSERT INTO clarisa_innovation_readiness_levels (id, name) VALUES (?, ?)`,
      [innovationReadinessId, 'T-13 F16 private innovation readiness level'],
    );
    anticipatedUsersSeeded = await seedIfMissing(
      `SELECT id FROM innovation_dev_anticipated_users WHERE id = ?`,
      [anticipatedUsersId],
      `INSERT INTO innovation_dev_anticipated_users (id, name) VALUES (?, ?)`,
      [anticipatedUsersId, 'T-13 F16 private anticipated users'],
    );
    disseminationQualificationSeeded = await seedIfMissing(
      `SELECT id FROM dissemination_qualifications WHERE id = ?`,
      [disseminationQualificationId],
      `INSERT INTO dissemination_qualifications (id, name) VALUES (?, ?)`,
      [
        disseminationQualificationId,
        'T-13 F16 private dissemination qualification',
      ],
    );
    expansionPotentialSeeded = await seedIfMissing(
      `SELECT id FROM expansion_potentials WHERE id = ?`,
      [expansionPotentialId],
      `INSERT INTO expansion_potentials (id, name) VALUES (?, ?)`,
      [expansionPotentialId, 'T-13 F16 private expansion potential'],
    );
    institutionTypeSeeded = await seedIfMissing(
      `SELECT code FROM clarisa_institution_types WHERE code = ?`,
      [institutionTypeCode],
      `INSERT INTO clarisa_institution_types (code, name) VALUES (?, ?)`,
      [institutionTypeCode, 'T-13 F16 private institution type'],
    );
    subInstitutionTypeSeeded = await seedIfMissing(
      `SELECT code FROM clarisa_institution_types WHERE code = ?`,
      [subInstitutionTypeCode],
      `INSERT INTO clarisa_institution_types (code, name) VALUES (?, ?)`,
      [subInstitutionTypeCode, 'T-13 F16 private sub-institution type'],
    );
    institutionSeeded = await seedIfMissing(
      `SELECT code FROM clarisa_institutions WHERE code = ?`,
      [institutionCode],
      `INSERT INTO clarisa_institutions (code, name) VALUES (?, ?)`,
      [institutionCode, 'T-13 F16 private institution'],
    );
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

    if (devActorRoleSeeded) {
      await tryStep('delete private devActorRoleId', () =>
        dataSource.query(`DELETE FROM actor_roles WHERE actor_role_id = ?`, [
          devActorRoleId,
        ]),
      );
    }
    if (devInstitutionTypeRoleSeeded) {
      await tryStep('delete private devInstitutionTypeRoleId', () =>
        dataSource.query(
          `DELETE FROM institution_type_roles WHERE institution_type_role_id = ?`,
          [devInstitutionTypeRoleId],
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
    if (innovationTypeSeeded) {
      await tryStep('delete private innovationTypeCode', () =>
        dataSource.query(
          `DELETE FROM clarisa_innovation_types WHERE code = ?`,
          [innovationTypeCode],
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
    if (anticipatedUsersSeeded) {
      await tryStep('delete private anticipatedUsersId', () =>
        dataSource.query(
          `DELETE FROM innovation_dev_anticipated_users WHERE id = ?`,
          [anticipatedUsersId],
        ),
      );
    }
    if (disseminationQualificationSeeded) {
      await tryStep('delete private disseminationQualificationId', () =>
        dataSource.query(
          `DELETE FROM dissemination_qualifications WHERE id = ?`,
          [disseminationQualificationId],
        ),
      );
    }
    if (expansionPotentialSeeded) {
      await tryStep('delete private expansionPotentialId', () =>
        dataSource.query(`DELETE FROM expansion_potentials WHERE id = ?`, [
          expansionPotentialId,
        ]),
      );
    }
    if (institutionTypeSeeded) {
      await tryStep('delete private institutionTypeCode', () =>
        dataSource.query(
          `DELETE FROM clarisa_institution_types WHERE code = ?`,
          [institutionTypeCode],
        ),
      );
    }
    if (subInstitutionTypeSeeded) {
      await tryStep('delete private subInstitutionTypeCode', () =>
        dataSource.query(
          `DELETE FROM clarisa_institution_types WHERE code = ?`,
          [subInstitutionTypeCode],
        ),
      );
    }
    if (institutionSeeded) {
      await tryStep('delete private institutionCode', () =>
        dataSource.query(`DELETE FROM clarisa_institutions WHERE code = ?`, [
          institutionCode,
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
    // `test/fixtures/global-setup.ts` owns them exclusively (see header).

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

    // --- result_innovation_dev: SELECT * minus the PK, compared against
    // both the dynamically-fetched source row AND a literal expected
    // object (rework attempt 2, FAIL-1 — "assert against a literal
    // expected object rather than against sourceDev, so a 'both sides
    // equally wrong' copy cannot satisfy it").
    const sourceDev = await fetchFullRow('result_innovation_dev', resultId, [
      'result_id',
    ]);
    const copiedDev = await fetchFullRow('result_innovation_dev', newResultId, [
      'result_id',
    ]);
    expect(copiedDev).toBeDefined();
    expect(copiedDev).toEqual(sourceDev);
    // Literal, per-field assertions on the copy for every column this file
    // deliberately diversified — independent of whatever `sourceDev` reads,
    // so a bug shared by both the seed and the fetch cannot hide here.
    expect(Number(copiedDev.innovation_nature_id)).toBe(innovationNatureId);
    expect(Number(copiedDev.innovation_type_id)).toBe(innovationTypeCode);
    expect(Number(copiedDev.innovation_readiness_id)).toBe(
      innovationReadinessId,
    );
    expect(Number(copiedDev.anticipated_users_id)).toBe(anticipatedUsersId);
    expect(Number(copiedDev.dissemination_qualification_id)).toBe(
      disseminationQualificationId,
    );
    expect(Number(copiedDev.expansion_potential_id)).toBe(expansionPotentialId);
    expect(Number(copiedDev.is_cheaper_than_alternatives)).toBe(
      devDetail.is_cheaper_than_alternatives,
    );
    expect(Number(copiedDev.is_simpler_to_use)).toBe(
      devDetail.is_simpler_to_use,
    );
    expect(Number(copiedDev.does_perform_better)).toBe(
      devDetail.does_perform_better,
    );
    expect(Number(copiedDev.is_desirable_to_users)).toBe(
      devDetail.is_desirable_to_users,
    );
    expect(Number(copiedDev.has_commercial_viability)).toBe(
      devDetail.has_commercial_viability,
    );
    expect(Number(copiedDev.has_suitable_enabling_environment)).toBe(
      devDetail.has_suitable_enabling_environment,
    );
    expect(Number(copiedDev.has_evidence_of_uptake)).toBe(
      devDetail.has_evidence_of_uptake,
    );
    expect(Number(copiedDev.no_sex_age_disaggregation)).toBe(
      devDetail.no_sex_age_disaggregation,
    );
    expect(Number(copiedDev.is_knowledge_sharing)).toBe(
      devDetail.is_knowledge_sharing,
    );
    expect(Number(copiedDev.is_used_beyond_original_context)).toBe(
      devDetail.is_used_beyond_original_context,
    );
    expect(Number(copiedDev.is_new_or_improved_variety)).toBe(
      devDetail.is_new_or_improved_variety,
    );
    // Audit columns (rework attempt 3, Lens B remediation) — literal, so a
    // created_by <-> updated_by or created_at <-> updated_at transposition
    // cannot hide behind the earlier `toEqual(sourceDev)` check.
    expect(Number(copiedDev.created_by)).toBe(auditCreatedBy);
    expect(Number(copiedDev.updated_by)).toBe(auditUpdatedBy);
    expect(toTime(copiedDev.created_at)).toBe(auditCreatedAt.getTime());
    expect(toTime(copiedDev.updated_at)).toBe(auditUpdatedAt.getTime());

    // --- result_actors: same SELECT * treatment, minus the identity PK
    // and result_id.
    const sourceActor = await fetchFullRow('result_actors', resultId, [
      'result_actors_id',
      'result_id',
    ]);
    const copiedActor = await fetchFullRow('result_actors', newResultId, [
      'result_actors_id',
      'result_id',
    ]);
    expect(copiedActor).toBeDefined();
    expect(copiedActor).toEqual(sourceActor);
    expect(copiedActor.actor_type_custom_name).toBe(actorCustomName);
    expect(Number(copiedActor.actor_role_id)).toBe(devActorRoleId);
    // The five legacy boolean columns (rework attempt 3, Lens B remediation)
    // — literal, distinct-sentinel assertions so a transposition between any
    // two (most notably `women_youth <-> men_youth`, the pair Lens B named)
    // is visible here rather than only satisfying `toEqual(sourceActor)`.
    expect(Number(copiedActor.sex_age_disaggregation_not_apply)).toBe(
      actorSexAgeDisaggregationNotApply,
    );
    expect(Number(copiedActor.women_youth)).toBe(actorWomenYouth);
    expect(Number(copiedActor.women_not_youth)).toBe(actorWomenNotYouth);
    expect(Number(copiedActor.men_youth)).toBe(actorMenYouth);
    expect(Number(copiedActor.men_not_youth)).toBe(actorMenNotYouth);
    // Audit columns (rework attempt 3, Lens B remediation).
    expect(Number(copiedActor.created_by)).toBe(auditCreatedBy);
    expect(Number(copiedActor.updated_by)).toBe(auditUpdatedBy);
    expect(toTime(copiedActor.created_at)).toBe(auditCreatedAt.getTime());
    expect(toTime(copiedActor.updated_at)).toBe(auditUpdatedAt.getTime());
    // The five NEW count columns are inert for Innovation Dev — confirm
    // they stayed NULL through the copy rather than merely matching the
    // (also-NULL) source, which a bad copy could satisfy by accident.
    expect(copiedActor.women_youth_count).toBeNull();
    expect(copiedActor.women_not_youth_count).toBeNull();
    expect(copiedActor.men_youth_count).toBeNull();
    expect(copiedActor.men_not_youth_count).toBeNull();
    expect(copiedActor.actors_count).toBeNull();

    // --- result_institution_types: same SELECT * treatment.
    const sourceInstitutionType = await fetchFullRow(
      'result_institution_types',
      resultId,
      ['result_institution_type_id', 'result_id'],
    );
    const copiedInstitutionType = await fetchFullRow(
      'result_institution_types',
      newResultId,
      ['result_institution_type_id', 'result_id'],
    );
    expect(copiedInstitutionType).toBeDefined();
    expect(copiedInstitutionType).toEqual(sourceInstitutionType);
    expect(copiedInstitutionType.institution_type_custom_name).toBe(
      institutionTypeCustomName,
    );
    expect(Number(copiedInstitutionType.institution_type_role_id)).toBe(
      devInstitutionTypeRoleId,
    );
    expect(Number(copiedInstitutionType.institution_type_id)).toBe(
      institutionTypeCode,
    );
    expect(Number(copiedInstitutionType.sub_institution_type_id)).toBe(
      subInstitutionTypeCode,
    );
    expect(Number(copiedInstitutionType.institution_id)).toBe(institutionCode);
    expect(copiedInstitutionType.organization_count).toBeNull();
    // Audit columns (rework attempt 3, Lens B remediation).
    expect(Number(copiedInstitutionType.created_by)).toBe(auditCreatedBy);
    expect(Number(copiedInstitutionType.updated_by)).toBe(auditUpdatedBy);
    expect(toTime(copiedInstitutionType.created_at)).toBe(
      auditCreatedAt.getTime(),
    );
    expect(toTime(copiedInstitutionType.updated_at)).toBe(
      auditUpdatedAt.getTime(),
    );
  }, 30000);

  it('F16b: SP_delete_result_version still hard-removes an Innovation Dev version and its result_innovation_dev, result_actors, and result_institution_types rows', async () => {
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
    // FAIL-1(c): "every surviving row", not just result_innovation_dev —
    // attempt 1 never asserted result_institution_types removal here.
    const remainingInstitutionType = await dataSource.query(
      `SELECT result_institution_type_id FROM result_institution_types WHERE result_id = ?`,
      [snapshotResultId],
    );
    expect(remainingInstitutionType).toHaveLength(0);
    const remainingResult = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [snapshotResultId],
    );
    expect(remainingResult).toHaveLength(0);
  }, 30000);

  it('F16c: full_delete_result_version still hard-removes an Innovation Dev result and its result_innovation_dev, result_actors, and result_institution_types rows', async () => {
    const { resultId } = await seedDevResult();

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
    // FAIL-1(c): full_delete_result_version's pre-existing (non-M6)
    // statements also hard-remove result_actors / result_institution_types
    // — attempt 1 never asserted either here.
    const remainingActor = await dataSource.query(
      `SELECT result_actors_id FROM result_actors WHERE result_id = ?`,
      [resultId],
    );
    expect(remainingActor).toHaveLength(0);
    const remainingInstitutionType = await dataSource.query(
      `SELECT result_institution_type_id FROM result_institution_types WHERE result_id = ?`,
      [resultId],
    );
    expect(remainingInstitutionType).toHaveLength(0);
    const remainingResult = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [resultId],
    );
    expect(remainingResult).toHaveLength(0);
  }, 30000);

  it('F16d: delete_result still soft-deletes an Innovation Dev result and its result_innovation_dev, result_actors, and result_institution_types rows', async () => {
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

    // FAIL-1(c): `delete_result`'s pre-existing (non-M6) statements also
    // deactivate result_actors / result_institution_types — attempt 1
    // never asserted either here.
    const [actorAfterDelete] = await dataSource.query(
      `SELECT is_active, deleted_at FROM result_actors WHERE result_id = ?`,
      [resultId],
    );
    expect(actorAfterDelete).toBeDefined();
    expect(Number(actorAfterDelete.is_active)).toBe(0);
    expect(actorAfterDelete.deleted_at).not.toBeNull();

    const [institutionTypeAfterDelete] = await dataSource.query(
      `SELECT is_active, deleted_at FROM result_institution_types WHERE result_id = ?`,
      [resultId],
    );
    expect(institutionTypeAfterDelete).toBeDefined();
    expect(Number(institutionTypeAfterDelete.is_active)).toBe(0);
    expect(institutionTypeAfterDelete.deleted_at).not.toBeNull();

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
