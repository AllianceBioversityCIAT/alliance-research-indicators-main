import { DataSource } from 'typeorm';
import {
  createInnovationUseHarness,
  InnovationUseHarness,
} from './nest-harness';
import { AppConfig } from '../../../src/domain/shared/utils/app-config.util';
import { GreenCheckRepository } from '../../../src/domain/entities/green-checks/repository/green-checks.repository';
import { StatusWorkflowFunctionHandlerService } from '../../../src/domain/entities/result-status-workflow/function-handler.service';
import { GeneralDataDto } from '../../../src/domain/entities/result-status-workflow/config/config-workflow';
import { Result } from '../../../src/domain/entities/results/entities/result.entity';
import { IndicatorsEnum } from '../../../src/domain/entities/indicators/enum/indicators.enum';

/**
 * T-01 (`docs/specs/bugfix/innovation-use-draft-save`) — c1, c2, c3;
 * `design.md` DD-6. **REDESIGNED** from this file's previous form (T-11,
 * `docs/specs/innovation-use/data-model-and-catalog`), which existed
 * entirely around `validateLevelExplanation` — the save-time guard THIS
 * bugfix deletes (`result-innovation-use.service.ts:183,307-326`). That
 * rule used to discriminate catalog id 6 (level 5, accepted) from id 7
 * (level 6, rejected 400 pre-fix). There is no rule left to discriminate:
 * both now accept, at every tier. The unit-level id-vs-level trap this file
 * used to guard against is still covered, at the mock tier, by the inverted
 * "BOTH catalog id 6 ... and catalog id 7 ... are ACCEPTED" test in
 * `result-innovation-use.service.spec.ts`. This file's job now is the
 * Bug-Mode regression (c1) and its DD-6 mirror (c2, c3), against REAL
 * MySQL — never re-deriving the SQL logic in TypeScript (KZ-001).
 *
 * **The mirror assertion, DD-6.** Asserting only that the save succeeds
 * cannot distinguish "the bug is fixed" from "all enforcement of
 * completeness was deleted along with it" — both look identical from the
 * save call alone. Both tests below that exercise a save also assert the
 * green check independently, by calling the REAL `innovation_use_validation`
 * SQL function directly (mirroring `green-check-ip-rights.fixture-spec.ts`'s
 * own pattern for `intellectual_property_validation`). The first test goes
 * one hop further: it also calls the REAL `completenessValidation` method
 * (`function-handler.service.ts:312-333`) — the exact function
 * `result_status_workflow` row id 30 (indicator 6, `REVISED → SUBMITTED`,
 * `completenessValidation.enabled: true`, `proposal.md` §15) dispatches by
 * name — and confirms it still throws for this row.
 *
 * **Why `completenessValidation` is invoked directly rather than through
 * the full status-transition orchestration.** `StatusWorkflowFunctionHandlerService`
 * lives in `ResultStatusWorkflowModule`, which imports `GreenChecksModule`,
 * which imports `forwardRef(() => ResultOicrModule)` — a module that
 * itself imports `ResultStatusWorkflowModule` back (circular) plus a dozen
 * unrelated feature modules (`ResultsModule`, `ResultContractsModule`,
 * `ResultQuantificationsModule`, `AllianceUserStaffGroupsModule`, ...).
 * Booting that whole graph through a Nest `TestingModule` to exercise one
 * four-line method — whose body reads only
 * `this.greenCheckRepository.calculateGreenChecks(...)` and nothing else
 * (`function-handler.service.ts:312-333`) — would drag in machinery this
 * bugfix does not touch and does not need to prove, for a large increase in
 * boot risk with no gain in fidelity. Instead this file constructs the REAL
 * `StatusWorkflowFunctionHandlerService` and its REAL
 * `GreenCheckRepository`/`AppConfig` collaborators BY HAND (no Nest DI
 * container, no mocks for anything `completenessValidation`'s body reads),
 * passing `undefined` for the four constructor parameters the method never
 * touches (`resultStatusWorkflowRepository`, `messageMicroservice`,
 * `currentUser`, `updateDataUtil`, `dbEnv`). `tsconfig.json` sets
 * `strictNullChecks: false` for this package, so this compiles; if that
 * ever changes, this file's `new StatusWorkflowFunctionHandlerService(...)`
 * call is the first thing to revisit. This is calling the REAL production
 * method against REAL MySQL — just without Nest's module-resolution
 * machinery in between, which this method's own body never uses.
 *
 * **`results.indicator_id` must be 6 here, unlike
 * `green-check-ip-rights.fixture-spec.ts`'s deliberate `NULL`.** That
 * sibling fixture leaves `indicator_id` NULL because
 * `intellectual_property_validation` treats NULL identically to 6,
 * sidestepping `indicators`' otherwise-empty FK chain in this scratch
 * schema. `GreenCheckRepository.calculateGreenChecks`'s `switch (indicator)`
 * (`green-checks.repository.ts:87-102`) has no such equivalence — a NULL
 * indicator matches no `case` at all, and `innovationUseValidation(...)`
 * is never appended to the query, which would make this file's `completeness
 * ValidationRejects` assertion prove nothing about Innovation Use
 * specifically. This file therefore seeds the two-row FK chain
 * (`indicator_types` → `indicators`) — **reusing the exact `INSERT IGNORE`
 * statements `innovation-use-result-creation.fixture-spec.ts` already
 * established** (`indicator_types` id 1, `indicators` ids 2 and 6), rather
 * than inventing a second, divergent seed for the same shared catalog rows.
 * Both are real production catalog values (matching `IndicatorsEnum`), not
 * fabricated sentinels, and — like `reporting_platforms='STAR'` and
 * `result_status` id 8 elsewhere in this directory — are treated as
 * permanent, shared scratch-schema reference data and never deleted in
 * `afterAll`.
 *
 * **Deliberately NOT built here: the full green-check chain that makes
 * `completness` reach `true`.** `innovation-use-result-creation.fixture-
 * spec.ts`'s own header enumerates what that costs (a resolvable
 * `portfolios` row, `result_contracts`, `result_levers`, `result_sdgs`,
 * `result_users`, `result_evidences`, each with their own catalog FKs) —
 * necessary there because R-IUA-011 needed to prove `completness: true` is
 * reachable. This file needs the opposite: an INCOMPLETE result that stays
 * rejected, which is the default state of every one of those checks when
 * nothing is seeded for them. Building that chain here would spend real
 * complexity to prove nothing this bugfix's criteria ask for.
 *
 * Reuses this file's own previously-reserved report year (2111), platform
 * code (`T11IULB`), and `result_official_code` band (`900_900`, per this
 * file's own prior header) — unchanged by the redesign. Adds one private
 * `clarisa_actor_types` code, `900_910` (band-adjacent to, and distinct
 * from, `900_900` and every other sibling file's own claimed codes —
 * FP-45's registry, re-read from every sibling header before choosing
 * this) — needed so `innovation_use_validation`'s actor conjuncts
 * (`tempFullActors > 0`, `tempActors = tempFullActors`,
 * `tempModeConsistent = tempFullActors`) are satisfied by a genuinely valid
 * actor row, isolating the green check's `FALSE` to the one conjunct this
 * bugfix cares about (`explanationValid`) rather than an incidental missing
 * actor.
 *
 * **Falsifying input, run and reported verbatim in this task's execution
 * record (not baked into this file — this file asserts only the shipped,
 * correct behavior):**
 * - Restoring `validateLevelExplanation` and its call site makes the save
 *   itself throw `BadRequestException` — the first test (c1/c2) fails
 *   before ever reaching the green-check or `completenessValidation`
 *   assertions, and the second (c3, whitespace) fails the same way. Both
 *   fail together because both depend on the SAME guarded
 *   `harness.service.update(...)` call, never on an independently-seeded
 *   row — so a c2 that "still passes" while c1 fails cannot happen here.
 * - Temporarily replacing the real `innovation_use_validation` function
 *   body with `RETURN TRUE;` (reversed immediately after) makes the direct
 *   SQL assertion (`expect(Number(row.innovation_use)).toBe(0)`) fail on
 *   its own, regardless of what `completenessValidation` returns — so a
 *   green check silently stubbed true is caught even though every OTHER
 *   green check for this minimal, mostly-empty result is already false and
 *   would have kept `completenessValidation` rejecting anyway.
 */
describe('Innovation Use save-time guard deletion: the Bug-Mode regression and its DD-6 mirror (T-01, real MySQL)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2111;
  const platformCode = 'T11IULB';
  const actingUserId = 900_920;
  const levelIdAtThreshold = 7; // catalog id 7 -> level 6, the reported case
  const actorTypeCode = 900_910;

  let harness: InnovationUseHarness;
  let dataSource: DataSource;
  let functionHandler: StatusWorkflowFunctionHandlerService;

  let platformSeeded = false;
  let reportYearSeeded = false;
  let actorTypeSeeded = false;
  const resultIds: number[] = [];

  let nextCode = 900_900_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  /**
   * Seeds one result at the reported level (catalog id 7, level 6) with one
   * valid actor row, then saves it through the REAL, guarded
   * `ResultInnovationUseService.update()` — the exact call site this
   * bugfix's server half changes. `explanation === undefined` omits the
   * key entirely (the "never typed into" case, R-IUD-001 sc.1); any other
   * value (including `'   '`) is sent verbatim.
   */
  async function saveDraftAtThreshold(explanation: string | undefined) {
    const officialCode = nextOfficialCode();
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id, indicator_id)
       VALUES (1, ?, ?, ?, 0, NULL, ?)`,
      [officialCode, platformCode, reportYear, IndicatorsEnum.INNOVATION_USE],
    );
    const resultId = result.insertId;
    resultIds.push(resultId);
    await harness.service.create(resultId);

    const dto: Record<string, unknown> = {
      innovation_use_level_id: levelIdAtThreshold,
      actors: [
        {
          actor_type_id: actorTypeCode,
          sex_age_disaggregation_not_apply: true,
          actors_count: 3,
        },
      ],
    };
    if (explanation !== undefined) {
      dto.innovation_use_level_explanation = explanation;
    }

    // The guarded call. Pre-fix, this line throws `BadRequestException`
    // and every assertion below it never runs — that is the red half of
    // c1/c2's Bug-Mode demonstration.
    const updated = await harness.service.update(resultId, dto as never);
    return { resultId, updated };
  }

  beforeAll(async () => {
    harness = await createInnovationUseHarness(actingUserId);
    dataSource = harness.dataSource;
    const appConfig = new AppConfig(dataSource);
    functionHandler = new StatusWorkflowFunctionHandlerService(
      dataSource,
      undefined,
      undefined,
      appConfig,
      new GreenCheckRepository(dataSource, appConfig),
      undefined,
      undefined,
      undefined,
    );

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [platformCode],
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'T-11 F-C level boundary fixture platform')`,
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

    const [existingActorType] = await dataSource.query(
      `SELECT code FROM clarisa_actor_types WHERE code = ?`,
      [actorTypeCode],
    );
    if (!existingActorType) {
      await dataSource.query(
        `INSERT INTO clarisa_actor_types (code, name) VALUES (?, 'T-01 level-boundary fixture actor type')`,
        [actorTypeCode],
      );
      actorTypeSeeded = true;
    }

    // Shared, permanent scratch-schema reference data — the exact
    // `INSERT IGNORE` statements `innovation-use-result-creation.fixture-
    // spec.ts` already established for this FK chain (see header). Never
    // torn down, matching that file's own discipline.
    await dataSource.query(
      `INSERT IGNORE INTO indicator_types (indicator_type_id, name) VALUES (1, 'Fixture indicator type')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO indicators (indicator_id, name, indicator_type_id) VALUES (?, 'Innovation Development', 1), (?, 'Innovation Use', 1)`,
      [IndicatorsEnum.INNOVATION_DEV, IndicatorsEnum.INNOVATION_USE],
    );
  });

  afterAll(async () => {
    if (!harness) {
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

    if (actorTypeSeeded) {
      await dataSource.query(`DELETE FROM clarisa_actor_types WHERE code = ?`, [
        actorTypeCode,
      ]);
    }
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

    await harness.close();
  });

  it('c1/c2 — a level-6 draft with a BLANK justification (never typed into) now SAVES, and stays incomplete: the green check is false, and completenessValidation (REVISED -> SUBMITTED, row id 30) still rejects', async () => {
    const { resultId, updated } = await saveDraftAtThreshold(undefined);

    // c1 — the save itself. Pre-fix this line is unreachable (the guarded
    // call above already threw); post-fix it must resolve with the
    // resolved catalog level carried through, never the raw FK.
    expect(updated.innovation_use_level_id).toBe(levelIdAtThreshold);
    expect(updated.innovation_use_level).toBe(6);

    // The never-typed-into case leaves the column exactly as `create()`
    // left it (NULL) — nothing was cleared, because nothing was stored.
    const [detailRow] = await dataSource.query(
      `SELECT innovation_use_level_explanation FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(detailRow.innovation_use_level_explanation).toBeNull();

    // c2, half 1 — the green check, read from the REAL SQL function,
    // never re-derived in TypeScript.
    const [greenCheckRow] = await dataSource.query(
      'SELECT innovation_use_validation(?) AS innovation_use',
      [resultId],
    );
    expect(Number(greenCheckRow.innovation_use)).toBe(0);

    // c2, half 2 — the REAL `completenessValidation`, the function
    // `result_status_workflow` row id 30 dispatches for indicator 6's
    // `REVISED -> SUBMITTED` transition. Still rejects.
    await expect(
      functionHandler.completenessValidation(
        { result: { result_id: resultId } as Result } as GeneralDataDto,
        undefined,
      ),
    ).rejects.toThrow(
      'There are still sections pending before the results can be submitted.',
    );
  });

  it('c3 — a WHITESPACE-ONLY justification SAVES verbatim, and the green check is still false (valid_text strips whitespace before measuring)', async () => {
    const whitespaceOnly = '   ';
    const { resultId, updated } = await saveDraftAtThreshold(whitespaceOnly);

    expect(updated.innovation_use_level_explanation).toBe(whitespaceOnly);

    const [detailRow] = await dataSource.query(
      `SELECT innovation_use_level_explanation FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    // Stored verbatim — asserted once, for the record. The criterion this
    // test actually gates on is the green check below, not this column
    // (whitespace reaching the column is expected, per DD-3 — never a
    // defect to assert against).
    expect(detailRow.innovation_use_level_explanation).toBe(whitespaceOnly);

    const [greenCheckRow] = await dataSource.query(
      'SELECT innovation_use_validation(?) AS innovation_use',
      [resultId],
    );
    expect(Number(greenCheckRow.innovation_use)).toBe(0);
  });
});
