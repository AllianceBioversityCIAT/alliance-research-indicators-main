import {
  createClarisaInnovationUseLevelsHarness,
  ClarisaInnovationUseLevelsHarness,
} from './nest-harness';
import { ClarisaInnovationUseLevelsService } from '../../../src/domain/tools/clarisa/entities/clarisa-innovation-use-levels/clarisa-innovation-use-levels.service';

/**
 * T-11 (`docs/specs/innovation-use/details-api`) — **F-D**, `design.md`
 * §10.3's F-D row + §5.6. Backs R-IUA-010 AC.3 and its scenario *"Scale
 * order does not rest on a coincidence"*.
 *
 * Drives the REAL `ClarisaInnovationUseLevelsService.findAll()` against the
 * real, migration-seeded `clarisa_innovation_use_levels` catalog (10 rows,
 * never created or torn down here — no fixture reaches into a shared
 * catalog table it does not own). Resolved through
 * `./nest-harness`'s `createClarisaInnovationUseLevelsHarness`, a minimal
 * sibling extension to the T-09 harness stated in that file's own header
 * (`ClarisaInnovationUseLevelsService` lives outside
 * `ResultInnovationUseModule`'s subtree, so the existing
 * `createInnovationUseHarness` cannot resolve it).
 *
 * **No seeding required, and none is done.** This fixture reads a shared,
 * pre-existing catalog only — it inserts no row into `results` or any
 * table this spec's other fixtures write to, so it reserves no
 * `result_official_code` band and needs no report year or platform code.
 *
 * **F-D IS DECLARED WEAK, ON THE RECORD (`tasks.md` T-11, `design.md`
 * §10.5 point 1).** Because `clarisa_innovation_use_levels.id = level + 1`
 * on the current seed, default primary-key ordering is *coincidentally*
 * `0…9` ascending too — this fixture's assertion would still pass with
 * `ClarisaInnovationUseLevelsService.findAll()`'s `order: { level: 'ASC' }`
 * override deleted (see the falsification table in this task's report,
 * which restores the deletion and confirms the fixture stays green). No
 * input available today, short of re-seeding the shared catalog — which
 * this fixture is expressly forbidden from doing, since F-A/F-B/F-C all
 * depend on it — makes this assertion fail on a missing order clause. It
 * is kept anyway because it would catch a FUTURE re-seed that breaks the
 * `id = level + 1` coincidence; the actual gate for R-IUA-010 AC.4 (an
 * explicit `order` clause exists in the query) is
 * `clarisa-innovation-use-levels.service.spec.ts`'s unit spec, which is
 * itself only a presence assertion over the mocked `find(...)` call's
 * arguments, not a behavioral proof either. Both are declared insufficient
 * alone (`design.md` §10.5) — **this fixture's green result is evidence
 * that the ten rows exist and read out 0…9 today, not evidence that the
 * ordering is guaranteed.**
 */
describe('Innovation Use level catalog is returned in scale order (T-11, F-D — declared weak, see header)', () => {
  let harness: ClarisaInnovationUseLevelsHarness;

  beforeAll(async () => {
    harness = await createClarisaInnovationUseLevelsHarness(901_000);
  });

  afterAll(async () => {
    if (!harness) {
      return;
    }
    await harness.close();
  });

  it('returns the ten real seeded catalog rows with level 0…9 ascending (R-IUA-010 AC.3)', async () => {
    expect(harness.service).toBeInstanceOf(ClarisaInnovationUseLevelsService);

    const levels = await harness.service.findAll();

    expect(levels).toHaveLength(10);

    const levelValues = levels.map((row) => Number(row.level));
    expect(levelValues).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // Trap 2, on the read side too (`id = level + 1`): confirms this
    // assertion is genuinely reading the resolved `level` scalar, not
    // accidentally reading back the PK in a column named `level`.
    const idValues = levels.map((row) => Number(row.id));
    expect(idValues).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
