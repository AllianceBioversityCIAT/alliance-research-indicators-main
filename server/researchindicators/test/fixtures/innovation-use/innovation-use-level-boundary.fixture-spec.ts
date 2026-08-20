import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  createInnovationUseHarness,
  InnovationUseHarness,
} from './nest-harness';

/**
 * T-11 (`docs/specs/innovation-use/details-api`) — **F-C**, `design.md`
 * §10.3's F-C row + §5.1 step 4a. Backs R-IUA-006 AC.1-AC.4 and its
 * scenario *"The off-by-one boundary holds"*.
 *
 * **The family's signature trap, gated against the REAL seeded catalog.**
 * `clarisa_innovation_use_levels.id = level + 1` (migration-seeded, 10
 * rows, never created or torn down here — verified at source before this
 * task started: catalog `id 6` is `level 5`, `id 7` is `level 6`). A rule
 * written `innovation_use_level_id >= 6` demands the justification a full
 * level early and passes a naive test on this exact pair — which is why
 * both halves of the pair live in ONE test body below (see that `it`'s own
 * comment): split across two `it`s, an inversion reads as two unrelated
 * failures and a reader could "fix" one in isolation, exactly the failure
 * mode the scenario's `AND IT MUST fail the pair discriminatingly` exists
 * to catch.
 *
 * **Seeding discipline (FP-48) — the opposite of F-A/F-B's.** This is a
 * *validation* fixture, not a copy/isolation one: `validateLevelExplanation`
 * (`result-innovation-use.service.ts`) and its stored-function analogue
 * both compare against literal domain truth (level `< 6` vs `>= 6`, a
 * blank-or-absent explanation), so every value below is the real, literal
 * catalog id / level / explanation the requirement describes — never a
 * maximally-distinct sentinel. A sentinel level value would not exist in
 * the catalog at all and would 400 on `resolveInnovationUseLevel`'s
 * "unknown innovation use level" branch before the rule under test ever
 * ran, which proves nothing about R-IUA-006.
 *
 * **Drives the REAL `ResultInnovationUseService.update()`** via
 * `./nest-harness` (retired as a risk at T-09) — never raw SQL for the
 * write path, and never the DTO/`ValidationPipe` layer, which this fixture
 * tier does not exercise (`design.md` §10.1). Each result under test is
 * first created via `harness.service.create(resultId)`, mirroring F-A's
 * KZ-006 sequence, so `update()`'s step-2 existence check finds a row
 * rather than 404ing before the rule under test ever runs.
 *
 * **Band:** `900_000`-`900_800` are taken (read from every sibling
 * `*.fixture-spec.ts` header directly, FP-45/KZ-002): `900_000`
 * sp-versioning-objective-blocks, `900_100` innovation-use-validation,
 * `900_200` innovation-use-lifecycle-routines, `900_300`
 * innovation-use-detail-round-trip, `900_400` green-check-ip-rights,
 * `900_500` innovation-dev-lifecycle-routines-unchanged, `900_600`
 * innovation-dev-validation-behavioral, `900_700`
 * innovation-use-section-round-trip (T-09), `900_800`
 * innovation-use-role-isolation (T-10, plus its own `900_85x`-`900_89x`
 * sub-bands). This file reserves `900_900` for
 * `results.result_official_code`. No private CLARISA rows are seeded here
 * (no actors/organizations/quantifications are exercised by this fixture),
 * so no CLARISA code sub-band is needed. Reserves report year **2111** and
 * platform code `T11IULB` (distinct from every reserved year/code so far:
 * 2094, 2096, 2097, 2098, 2101, 2102, 2103, 2109, 2110 and
 * T09IUFA/T10IUFB/T12F12B/T12IUV/T13IUDR/T13IULC).
 *
 * **Falsifying input (`tasks.md` T-11):** compare the FK
 * (`innovation_use_level_id >= 6`) instead of the resolved `level` in
 * `validateLevelExplanation`'s caller — the rule passes half B and fails
 * half A: `id 6` (level 5) starts demanding a justification a level early,
 * so the accept assertion reddens, while `id 7` (level 6) still satisfies
 * `7 >= 6` and still rejects, so the reject assertion stays green on its
 * own. Both halves live in ONE test body precisely because only half A is
 * discriminating for this defect — as separate `it`s, a reader could "fix"
 * the red one in isolation and miss that half B never moved; one `it`
 * going red cannot be misread as two unrelated failures, which is the
 * property `requirements.md` R-IUA-006's scenario clause
 * `AND IT MUST fail the pair discriminatingly` buys. Half B instead guards
 * the opposite mutation class — the rule dropped entirely, or the
 * threshold raised to `> 6` / `>= 7`. A claim that both halves redden
 * together is not achievable: a single monotone threshold on a monotone
 * key can only move the boundary in one direction, and is worth ruling
 * out explicitly since it is the claim this comment previously carried.
 */
describe('Innovation Use level ≥ 6 justification against the real seeded catalog (T-11, F-C)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2111;
  const platformCode = 'T11IULB';
  const actingUserId = 900_920;

  // The REAL, migration-seeded catalog rows — never created or torn down
  // here. Verified at source (Leader pre-check, this task's brief):
  // id 6 = level 5 (the accept case), id 7 = level 6 (the reject case).
  const levelIdAccept = 6; // level 5
  const levelIdReject = 7; // level 6

  let harness: InnovationUseHarness;
  let dataSource: DataSource;

  let platformSeeded = false;
  let reportYearSeeded = false;
  const resultIds: number[] = [];

  let nextCode = 900_900_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  async function seedResult(): Promise<number> {
    const officialCode = nextOfficialCode();
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [officialCode, platformCode, reportYear],
    );
    const resultId = result.insertId;
    resultIds.push(resultId);
    await harness.service.create(resultId);
    return resultId;
  }

  beforeAll(async () => {
    harness = await createInnovationUseHarness(actingUserId);
    dataSource = harness.dataSource;

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
  });

  afterAll(async () => {
    if (!harness) {
      return;
    }

    for (const resultId of resultIds) {
      if (resultId === undefined || resultId === null) {
        continue;
      }
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [resultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        resultId,
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

  it('discriminates the pair: catalog id 6 (level 5) with no explanation ACCEPTS, catalog id 7 (level 6) with no explanation REJECTS 400 — inverting either half is this family of specs’ signature defect (R-IUA-006 AC.1, AC.2, scenario)', async () => {
    // --- Half A: id 6 / level 5, no explanation → accepted (AC.2). ---
    const acceptResultId = await seedResult();
    const acceptResult = await harness.service.update(acceptResultId, {
      innovation_use_level_id: levelIdAccept,
    });
    expect(acceptResult.innovation_use_level_id).toBe(levelIdAccept);
    // DD-9's resolved scalar, read back — proves the accept side really
    // did resolve through the catalog join to level 5, not merely that no
    // exception was thrown.
    expect(acceptResult.innovation_use_level).toBe(5);

    // --- Half B: id 7 / level 6, no explanation → rejected 400 (AC.1). ---
    // Caught once via try/catch (rather than two separate calls) so both
    // the exception TYPE and its field-naming MESSAGE are asserted off the
    // exact same rejection.
    const rejectResultId = await seedResult();
    let caughtError: unknown;
    try {
      await harness.service.update(rejectResultId, {
        innovation_use_level_id: levelIdReject,
      });
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(BadRequestException);
    expect(
      (
        (caughtError as BadRequestException).getResponse() as {
          message: string[];
        }
      ).message,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('innovation_use_level_explanation'),
      ]),
    );

    // Nothing was persisted by the rejected calls (design.md §5.1: validation
    // runs entirely before BEGIN) — the reject-side row still carries no
    // level at all, confirming the 400 left the row exactly as `create()`
    // left it rather than partially applying.
    const [rejectRow] = await dataSource.query(
      `SELECT innovation_use_level_id FROM result_innovation_use WHERE result_id = ?`,
      [rejectResultId],
    );
    expect(rejectRow.innovation_use_level_id).toBeNull();
  });

  it('level 6, whitespace-only explanation, is rejected 400 (AC.3)', async () => {
    const resultId = await seedResult();

    await expect(
      harness.service.update(resultId, {
        innovation_use_level_id: levelIdReject,
        innovation_use_level_explanation: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('level 6, empty-string explanation, is rejected 400 (AC.4)', async () => {
    const resultId = await seedResult();

    await expect(
      harness.service.update(resultId, {
        innovation_use_level_id: levelIdReject,
        innovation_use_level_explanation: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
