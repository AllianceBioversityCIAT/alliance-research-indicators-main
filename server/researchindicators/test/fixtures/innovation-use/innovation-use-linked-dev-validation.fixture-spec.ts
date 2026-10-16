import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import { LinkResultRolesEnum } from '../../../src/domain/entities/link-result-roles/enum/link-result-roles.enum';
import { IndicatorsEnum } from '../../../src/domain/entities/indicators/enum/indicators.enum';

/**
 * T-03 (`docs/specs/innovation-use/link-innovation-dev`, R-IUL-009 both
 * scenarios, design.md §9, D-1). Real-MySQL fixture over the REAL
 * `innovation_use_validation` stored function, proving **rule 16** —
 * appended by Migration B (`1789100000000-
 * appendInnovationDevLinkRuleToInnovationUseValidation.ts`) — actually
 * discriminates true/false against seeded rows. Never asserts on emitted
 * SQL text (KZ-001); a mocked `QueryRunner` cannot evaluate this — only a
 * real function call over a real schema can.
 *
 * Every case here seeds an "otherwise complete" Innovation Use result —
 * `innovation_use_level_id = 1` (level 0, no explanation required), and
 * zero rows in `result_actors` / `result_institution_types` /
 * `result_quantifications` — which is exactly `innovation-use-validation.
 * fixture-spec.ts`'s F17 base (that file's own comment: this shape returns
 * `1` under the OLD function body, since rules 2-15 are all vacuously
 * satisfied by empty collections). Rule 16 is the ONLY thing that can move
 * this base off `TRUE` post-migration, which is what makes it the right
 * base for isolating rule 16 specifically. See F17's own fixture for the
 * pre-existing proof that this base is otherwise green.
 *
 * **`result_official_code` band (FP-45):** every sibling header in this
 * directory lists `900_000`-`900_900`, `901_000`, `902_000`, `902_200`,
 * `902_300` as taken (grepped 2026-09-09 against every `*.fixture-spec.ts`
 * in this directory). This file reserves the next unused band, `902_400`.
 * **Report year:** `2094, 2096-2098, 2101-2103, 2109-2113` are taken
 * (grepped the same way); this file reserves `2114`.
 *
 * **`indicators` / `indicator_types` were both EMPTY (0 rows)** in the
 * scratch schema — discovered running this file the first time (an FK
 * violation on `results.indicator_id`, not an assertion failure). Seeded
 * via `INSERT IGNORE`, **never torn down**, following the exact precedent
 * `innovation-use-result-creation.fixture-spec.ts`'s header already
 * records (itself following `global-setup.ts`'s own precedent for
 * `actor_roles`/`institution_type_roles` id 1) — this file additionally
 * needs `IndicatorsEnum.KNOWLEDGE_PRODUCT = 3` as a real "non-indicator-2"
 * target (R16-5, R16-8), which that sibling file did not seed.
 *
 * **`link_result_roles` id 4 ("Link Result Section")** was ALSO absent —
 * only id 5 (this spec's own Migration A) is present after bootstrap.
 * `1763587336968-insertExternalLinkColumn.ts` seeds it but predates the
 * baseline snapshot cutoff, same gap class. Same top-up discipline.
 *
 * **`clarisa_actor_types` code 5 ("Other")** is seeded idempotently in
 * `beforeAll` (check-then-insert, guarded flag, deleted in `afterAll` only
 * if this file created it) — the same idiom `innovation-use-validation.
 * fixture-spec.ts` uses for the same code, needed here only for the
 * "rules 2-15 still discriminate" case's deliberately-invalid actor row.
 * `actor_roles` id 2 (Innovation Use) is NOT seeded here: per `innovation-
 * use-validation.fixture-spec.ts`'s own header, it is inserted by a real
 * migration (`1787071463485-insertInnovationUseRoles.ts`) that re-runs
 * during `migration:test:bootstrap`, so it already exists once bootstrap
 * has run.
 *
 * **CANNOT PROVE (KZ-017):** this file proves rule 16's runtime behavior
 * over the exact rows it seeds. It does NOT prove rules 2-15's own
 * per-predicate behavior (that is `innovation-use-validation.
 * fixture-spec.ts`'s F1-F42 job) beyond the one discriminating case this
 * task requires; it does NOT prove the migration's SQL *shape* (imports,
 * `up`/`down` structure — that is the sibling structural spec's job,
 * `src/db/migration-specs/1789100000000-...spec.ts`); and it cannot prove
 * anything about the service/API layer (D-3 through D-9), which are a
 * different task's (T-06/T-07) mocked-service specs.
 */
describe('innovation_use_validation rule 16 (T-03, R-IUL-009)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2114;

  let actorTypeFiveSeeded = false;
  let reportYearSeeded = false;

  const resultIds: number[] = [];

  let nextCode = 902_400_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  async function seedResult(
    indicatorId: number | null,
    isActive: boolean,
  ): Promise<number> {
    const officialCode = nextOfficialCode();
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, indicator_id, report_year_id, is_snapshot, result_status_id)
       VALUES (?, ?, ?, ?, 0, NULL)`,
      [isActive, officialCode, indicatorId, reportYear],
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

  async function seedInvalidActor(resultId: number): Promise<void> {
    // Rule 2 violation: actor_type_id = 5 (OTHER) with a NULL custom name.
    // Everything else about this result is otherwise complete (a valid
    // detail row, and — in the case that uses this — a fully valid rule-16
    // link), so this row is the ONLY thing that can make the function
    // return FALSE, isolating rules 2-15 from rule 16.
    await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_type_custom_name,
         sex_age_disaggregation_not_apply, actors_count, actor_role_id,
         is_active, created_by, updated_by
       ) VALUES (?, 5, NULL, TRUE, 5, 2, TRUE, 1, 1)`,
      [resultId],
    );
  }

  async function seedLink(
    resultId: number,
    otherResultId: number,
    roleId: number,
    isActive: boolean,
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO link_results (result_id, other_result_id, link_result_role_id, is_active, created_by, updated_by)
       VALUES (?, ?, ?, ?, 1, 1)`,
      [resultId, otherResultId, roleId, isActive],
    );
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

    // --- Foundational catalog top-ups (INSERT IGNORE, NEVER torn down) ---
    // `indicators` / `indicator_types` were both EMPTY (0 rows) in this
    // scratch schema — same environment finding `innovation-use-result-
    // creation.fixture-spec.ts`'s header already records, and the same
    // precedent (`INSERT IGNORE`, never torn down, following `global-
    // setup.ts`'s own precedent for `actor_roles`/`institution_type_roles`
    // id 1). This file additionally needs `KNOWLEDGE_PRODUCT = 3` (R16-5,
    // R16-8's "non-indicator-2 target" cases), which that sibling file did
    // not seed.
    await dataSource.query(
      `INSERT IGNORE INTO indicator_types (indicator_type_id, name) VALUES (1, 'Fixture indicator type')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO indicators (indicator_id, name, indicator_type_id) VALUES (?, 'Innovation Development', 1), (?, 'Knowledge Product', 1), (?, 'Innovation Use', 1)`,
      [
        IndicatorsEnum.INNOVATION_DEV,
        IndicatorsEnum.KNOWLEDGE_PRODUCT,
        IndicatorsEnum.INNOVATION_USE,
      ],
    );

    // `link_result_roles` id 4 ("Link Result Section", R16-6's "a role-4
    // row only" case) is seeded by `1763587336968-insertExternalLinkColumn
    // .ts`, which — like the rows above — predates the baseline snapshot
    // cutoff, so its data INSERT is not reproduced on a freshly-loaded
    // scratch schema even though role 5 (this spec's own Migration A,
    // which postdates the cutoff) is present. Same top-up discipline:
    // `INSERT IGNORE`, never torn down.
    await dataSource.query(
      `INSERT IGNORE INTO link_result_roles (link_result_role_id, name) VALUES (?, 'Link Result Section')`,
      [LinkResultRolesEnum.LINK_RESULT_SECTION],
    );

    const [existingActorTypeFive] = await dataSource.query(
      `SELECT code FROM clarisa_actor_types WHERE code = 5`,
    );
    if (!existingActorTypeFive) {
      await dataSource.query(
        `INSERT INTO clarisa_actor_types (code, name) VALUES (5, 'Other')`,
      );
      actorTypeFiveSeeded = true;
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
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    for (const resultId of resultIds) {
      if (resultId === undefined || resultId === null) {
        continue;
      }
      await dataSource.query(
        `DELETE FROM link_results WHERE result_id = ? OR other_result_id = ?`,
        [resultId, resultId],
      );
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

    if (actorTypeFiveSeeded) {
      await dataSource.query(`DELETE FROM clarisa_actor_types WHERE code = 5`);
    }
    if (reportYearSeeded) {
      await dataSource.query(`DELETE FROM report_years WHERE report_year = ?`, [
        reportYear,
      ]);
    }

    await dataSource.destroy();
  });

  it('R16-1: no active role-5 link row at all returns 0 — R-IUL-009 Scenario 1, "no link"', async () => {
    const resultId = await seedResult(IndicatorsEnum.INNOVATION_USE, true);
    await seedDetail(resultId, 1, null);

    expect(await callValidation(resultId)).toBe(0);
  });

  it('R16-2: a valid active role-5 link to an active indicator-2 result returns 1 — R-IUL-009 Scenario 1, "a valid link is added"', async () => {
    const resultId = await seedResult(IndicatorsEnum.INNOVATION_USE, true);
    await seedDetail(resultId, 1, null);
    const targetId = await seedResult(IndicatorsEnum.INNOVATION_DEV, true);
    await seedLink(
      resultId,
      targetId,
      LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      true,
    );

    expect(await callValidation(resultId)).toBe(1);
  });

  it('R16-3: a DEACTIVATED role-5 link row (is_active = FALSE) to an otherwise-valid target returns 0 — R-IUL-009 "must NOT be satisfied by a deactivated row"', async () => {
    const resultId = await seedResult(IndicatorsEnum.INNOVATION_USE, true);
    await seedDetail(resultId, 1, null);
    const targetId = await seedResult(IndicatorsEnum.INNOVATION_DEV, true);
    await seedLink(
      resultId,
      targetId,
      LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      false, // the link row itself is deactivated
    );

    expect(await callValidation(resultId)).toBe(0);
  });

  it('R16-4: an active role-5 link to an INACTIVE target returns 0 — R-IUL-009 "nor by a row whose target is inactive"', async () => {
    const resultId = await seedResult(IndicatorsEnum.INNOVATION_USE, true);
    await seedDetail(resultId, 1, null);
    const targetId = await seedResult(IndicatorsEnum.INNOVATION_DEV, false); // target soft-deleted
    await seedLink(
      resultId,
      targetId,
      LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      true,
    );

    expect(await callValidation(resultId)).toBe(0);
  });

  it('R16-5: an active role-5 link to an active but NON-indicator-2 target returns 0 — R-IUL-009 "nor ... not indicator 2"', async () => {
    const resultId = await seedResult(IndicatorsEnum.INNOVATION_USE, true);
    await seedDetail(resultId, 1, null);
    const targetId = await seedResult(IndicatorsEnum.KNOWLEDGE_PRODUCT, true); // active, wrong indicator
    await seedLink(
      resultId,
      targetId,
      LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      true,
    );

    expect(await callValidation(resultId)).toBe(0);
  });

  it('R16-6: an active link row under a DIFFERENT role (role 4, Links-to-Result) to an otherwise-valid target returns 0 — R-IUL-009 "nor by a row of another role"', async () => {
    const resultId = await seedResult(IndicatorsEnum.INNOVATION_USE, true);
    await seedDetail(resultId, 1, null);
    const targetId = await seedResult(IndicatorsEnum.INNOVATION_DEV, true);
    await seedLink(
      resultId,
      targetId,
      LinkResultRolesEnum.LINK_RESULT_SECTION, // role 4, not 5
      true,
    );

    expect(await callValidation(resultId)).toBe(0);
  });

  it('R16-7: rules 2-15 still discriminate — an otherwise-invalid actor row (rule 2 violation) WITH a fully valid rule-16 link returns 0 — R-IUL-009 "must NOT weaken, reorder or drop any of rules 2-15"', async () => {
    const resultId = await seedResult(IndicatorsEnum.INNOVATION_USE, true);
    await seedDetail(resultId, 1, null);
    await seedInvalidActor(resultId); // rule 2 violation, independent of rule 16
    const targetId = await seedResult(IndicatorsEnum.INNOVATION_DEV, true);
    await seedLink(
      resultId,
      targetId,
      LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      true, // rule 16 alone would pass on this link
    );

    // Rule 16 alone is satisfied; the actor rule (2-15 family) is not — the
    // function must still return 0, proving rule 16's addition did not
    // widen (OR into) the rules it was appended to.
    expect(await callValidation(resultId)).toBe(0);
  });

  it('R16-8 (forward-pointer, two-predicate case): an active role-5 link to a target that is BOTH inactive AND non-indicator-2 simultaneously returns 0 — a single-predicate-per-case suite never exercises both r2 predicates failing at once on the same row', async () => {
    // T-02's Reviewer (Lens B) found that an AND->OR precedence slip inside
    // rule 16's EXISTS WHERE clause passes all of T-02's own (mocked/
    // structural) assertions. R16-4 and R16-5 above each vary exactly ONE
    // of rule 16's five predicates while holding the other four valid —
    // per design.md's forward pointer, that leaves a hypothetical
    // AND->OR slip an escape route: whichever "side" of the slip is NOT
    // the single broken predicate stays fully valid in that one case, so
    // an OR of that side against the broken side can still land on the
    // correct-looking answer for the wrong reason. This case removes that
    // escape by breaking BOTH `r2.is_active` and `r2.indicator_id = 2`
    // on the SAME row while the link row itself (`lr.is_active`,
    // `lr.link_result_role_id`) stays fully valid — the example the
    // forward pointer names explicitly ("an active link to a target that
    // is both inactive and non-indicator-2").
    //
    // Honest limit of this single case (see this file's own empirical
    // mutation-test evidence in the T-03 Implementer report): whether this
    // specific row discriminates a given AND/OR slip depends on exactly
    // where in the WHERE clause the slip falls — a slip localized to just
    // the two r2 predicates (`r2.is_active OR r2.indicator_id = 2`) is
    // NOT caught by this row alone (OR(FALSE, FALSE) = FALSE = the correct
    // AND(FALSE, FALSE) answer), while R16-4 and R16-5 individually DO
    // catch that exact slip. A slip that instead groups the whole lr-side
    // against the whole r2-side (the physically-correct SQL-precedence
    // reading of an unparenthesized "AND ... OR ..." chain) IS caught by
    // this row. This case is kept because it is the literal scenario the
    // forward pointer names and because it proves the two r2 predicates
    // are combined with AND (not OR) directly against real MySQL, which
    // no other case in this file or in R-IUL-009 does on one row.
    const resultId = await seedResult(IndicatorsEnum.INNOVATION_USE, true);
    await seedDetail(resultId, 1, null);
    const targetId = await seedResult(IndicatorsEnum.KNOWLEDGE_PRODUCT, false); // inactive AND wrong indicator
    await seedLink(
      resultId,
      targetId,
      LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      true,
    );

    expect(await callValidation(resultId)).toBe(0);
  });
});
