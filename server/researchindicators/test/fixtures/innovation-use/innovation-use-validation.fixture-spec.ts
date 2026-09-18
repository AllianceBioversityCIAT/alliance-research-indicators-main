import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import { LinkResultRolesEnum } from '../../../src/domain/entities/link-result-roles/enum/link-result-roles.enum';
import { IndicatorsEnum } from '../../../src/domain/entities/indicators/enum/indicators.enum';

/**
 * T-12 (`docs/specs/innovation-use/data-model-and-catalog`) — fixture harness
 * for `innovation_use_validation` (M5, T-09). Calls the REAL stored function
 * against the scratch MySQL schema — never asserts on emitted SQL strings
 * (KZ-001). Covers §6.5's table rows F1–F9, F9b, F11, F17.
 *
 * **Extended at T-19 (`docs/specs/changes/innovation-use-required-fields`,
 * `R-IUR-012` AC.1 + S1, design.md §12) — F17 through F42.** T-18 rewrote
 * this function's body (`1787280000000-updateInnovationUseValidation.ts`,
 * `DD-6`): rule 13 ("at least one actor") is REMOVED (`R-IUR-011`, D-1), and
 * every violation is now counted per collection rather than compared
 * against a row-count anchor. Two consequences for THIS file:
 *
 * 1. **F17 is INVERTED, not left alone.** It used to seed a detail row with
 *    zero actor rows and assert `0` (the old rule 13). Under the new body
 *    every violation count is `0` for an empty collection, so the same
 *    seed now returns `1` — this flip IS `R-IUR-011` AC.2 (see F17's own
 *    comment). No other F1–F16 fixture changes meaning: F1–F11 all seed
 *    aggregate actors with `actors_count: 5` (valid under rules 5/2, never
 *    reachable by the retired rule 13's removal), and F2–F7 assert the
 *    level/justification clause (`commonFields`, rules 14–15), preserved
 *    byte-identical by `DD-6` constraint 1 and untouched by this rewrite.
 * 2. **F18–F42 are new**, adding the organization (rules 6–9, 8b, `DD-5`/
 *    `DD-5b`) and measure (rules 10–11) collections this file did not
 *    cover before T-19 (T-12/T-13 predate those rules entirely), plus the
 *    `is_active` / NULL-mode / naive-divergence cases `R-IUR-012` AC.1
 *    requires. See `seedOrg`/`seedMeasure` below for the new row shapes and
 *    the `971_2xx` / real-code (37/38/39) catalog seeding in `beforeAll`
 *    for the organization-path cases' provenance.
 *
 * **Attempt-2 additions (Reviewer round 1 findings, same T-19 task).**
 * F21b, F25, F41 and F43 below were added/edited after the first Reviewer
 * pass found two rule-table rows (3 and 7) whose only fail case was
 * over-determined with another rule, and a describe-title/comment `F43`
 * that named a case never written:
 * - **F21b** isolates rule 3 (the four-way `IS NOT NULL` fill check) from
 *   rule 4 (`sum > 0`) — F9b (all four NULL) fails both terms at once, so
 *   deleting the fill check alone left F9b green. F21b seeds three of four
 *   counts filled with a positive sum, so only the fill check can redden it.
 * - **F25** and **F41** now set `organizationCount: 5` so their asserted
 *   violation (rule 7 / the NULL-mode routing) is the row's ONLY violation
 *   — previously both rows also failed rule 9 (unfilled `organization_count`)
 *   on the same row, so deleting the rule-7 clause alone left them green.
 * - **F43** is the literal `R-IUR-011` AC.2 wording (level >= 6 WITH a
 *   justification, zero rows everywhere) — see its own comment for why it
 *   is coverage-of-wording only, not a new behavioral discriminator (F7 and
 *   F17 already pin the two conjuncts it combines).
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
 * re-runs during `migration:test:bootstrap`. This file's own `beforeAll`
 * below still check-then-inserts id 1 itself, idempotently, but never
 * removes it — this file's own `afterAll` says so explicitly (see its
 * comment beginning "`actor_roles` id 1 is NEVER torn down here") —
 * because `test/fixtures/global-setup.ts` now seeds this exact row
 * centrally, once, before any worker starts (see that file's header),
 * which makes this file's own check-then-insert below a harmless,
 * redundant no-op rather than the row's real source in practice. Left
 * as-is: this correction's authorized scope is this comment, not that
 * code.
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
 *
 * **Repaired at T-14 (`docs/specs/innovation-use/link-innovation-dev`,
 * Amendment 02, R-IUL-009 "No grandfathering") — every base now carries a
 * rule-16-satisfying link, not just the 15 that used to need it.** Migration
 * B (`1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation
 * .ts`) appended rule 16 to this function: the green check now additionally
 * requires an active role-5 `link_results` row pointing at an active,
 * `indicator_id = 2` (Innovation Dev) result, retroactively and with no
 * grandfathering. That broke every one of this file's TRUE-expecting bases
 * (F3, F7, F11, F17, F18, F20, F23, F26, F28, F32, F35, F38, F39, F42, F43)
 * — 15 failures, matching the 15 `toBe(1)` assertions 1:1 — because every
 * one of them (and every other case in this file) seeds its subject through
 * the single shared `seedResult()` helper below (grepped 2026-09-09: no
 * `it` in this file calls `seedResult()` a second time for a secondary
 * result, so none of them needs the link's target for any reason other than
 * satisfying rule 16 on the subject itself).
 *
 * **The fix is inside `seedResult()`, not 15 per-case edits.** It now also
 * seeds one target result (`indicator_id = 2`, active) and one active
 * role-5 `link_results` row from the subject to that target, via
 * `seedLinkedDevLink()` below — for EVERY result this file creates,
 * including the 25+ FALSE-expecting cases that never touch rule 16. That is
 * deliberate and safe: rule 16 is AND-ed onto the function's `RETURN`
 * statement, so a satisfied rule 16 term can never turn an already-FALSE
 * result TRUE (`AND` with `FALSE` stays `FALSE`) — it can only restore the
 * TRUE cases' isolation, which is the whole point (see `seedLinkedDevLink`'s
 * own comment). **No assertion in this file was weakened, relaxed, or
 * flipped to make the suite pass** — R-IUL-009's own scenario ("no
 * grandfathering") is precisely why none of this file's pre-existing bases
 * may be treated as an exemption; rules 2-15's regression protection is
 * exactly what this repair restores. The link shape (active role-5 →
 * active indicator-2 target) matches `innovation-use-linked-dev-validation.
 * fixture-spec.ts`'s R16-2 case exactly — that file is rule 16's own
 * behavioral proof; this file only needs to satisfy the rule, not re-prove
 * it (KZ-017: this file still cannot and does not prove rule 16's own
 * runtime behavior — R-IUL-009's dedicated fixture does).
 */
describe('innovation_use_validation stored function (T-12/T-19, F1-F43)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2096;

  let platformSeeded = false;
  let reportYearSeeded = false;
  let actorTypeOneSeeded = false;
  let actorTypeFiveSeeded = false;

  // T-19 — private `clarisa_institution_types` codes (band `971_2xx`,
  // grepped 2026-09-07 against every sibling fixture's declared band —
  // distinct from 902_0xx, 9147/9148, 900_86x, 900_71x and 970_00x). These
  // isolate organization-path rules 6-9/8b (`DD-5`, `DD-5b`) without racing
  // `institution-type-subtype-catalog-equivalence.fixture-spec.ts`'s own
  // INSERT/DELETE lifecycle over the REAL catalog codes it uses — this file
  // owns this band exclusively and tears it down unconditionally below.
  const ORG_TYPE_ROOT_NO_CHILDREN = 971_201; // active, root, no children — rule 7/9 pass path, sub-type never required
  const ORG_TYPE_ROOT_WITH_CHILD = 971_210; // active, root, HAS child 971_211 — rule 8
  const ORG_SUBTYPE_OF_ROOT_WITH_CHILD = 971_211; // valid child of 971_210
  const ORG_TYPE_OTHER_ROOT_WITH_CHILD = 971_220; // a second, unrelated active root with its own child
  const ORG_SUBTYPE_OF_OTHER_ROOT = 971_221; // belongs to 971_220, NOT 971_210 — DD-5b "wrong parent" case
  const ORG_INSTITUTION_CODE = 971_301; // clarisa_institutions.code — rule 6 known-path pass

  // T-19 (F42 only) — REAL catalog codes, same provenance as
  // `institution-type-subtype-catalog-equivalence.fixture-spec.ts`'s
  // `REAL_CATALOG` (`SELECT code, name, parent_code, is_active FROM
  // clarisa_institution_types` run read-only against Dev 2026-09-07). Code
  // 38 is one of the 8 codes T-14 proved diverge under the naive
  // `EXISTS(parent_code = type)` mirror (active, NON-root, HAS children);
  // 37 is its active root parent (required by the self-referencing FK); 39
  // is one child of 38 (makes 38 "have children"). `INSERT IGNORE` only —
  // this file deliberately does NOT delete these three in its own
  // `afterAll` (see that block's comment): deleting shared, real catalog rows
  // from two places is a needless hazard this file opts out of by never being
  // the one to delete them. `institution-type-subtype-catalog-equivalence
  // .fixture-spec.ts` owns their removal.
  //
  // CORRECTED 2026-09-07 (T-19): this comment previously justified the choice
  // by "parallel file execution (no `runInBand`)". That is no longer the
  // harness's behaviour — `jest-fixtures.json` now sets `maxWorkers: 1`
  // (server child guide FP-51, amended), precisely BECAUSE this shared-row
  // contention produced 3 spurious FK failures in 9 runs. The teardown
  // asymmetry is still correct, but concurrency is no longer its reason:
  // single ownership of a shared row is.
  const REAL_CODE_NGO_ROOT = 37;
  const REAL_CODE_NGO_INTERNATIONAL = 38; // the code under test (F42)
  const REAL_CODE_NGO_INTERNATIONAL_GENERAL = 39; // makes 38 "have children"

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
    await seedLinkedDevLink(resultId);
    return resultId;
  }

  /**
   * T-14 (Amendment 02, R-IUL-009 "No grandfathering") — see this describe
   * block's top-level comment for the full reasoning. Seeds one active,
   * `indicator_id = 2` target result plus one active role-5 `link_results`
   * row from `resultId` to it, so `resultId` satisfies rule 16 regardless
   * of what the calling case asserts. Both rows are tracked in `resultIds`
   * / cleaned up the same way every other row in this file is (the target
   * is just another row in `results`, so `afterAll`'s existing per-id loop
   * already tears it down; `link_results` is deleted there too — see that
   * block's own comment for the FK-direction reason it runs first).
   */
  async function seedLinkedDevLink(resultId: number): Promise<void> {
    const officialCode = nextOfficialCode();
    const target = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, indicator_id, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [officialCode, IndicatorsEnum.INNOVATION_DEV, reportYear],
    );
    const targetId = target.insertId;
    resultIds.push(targetId);

    await dataSource.query(
      `INSERT INTO link_results (result_id, other_result_id, link_result_role_id, is_active, created_by, updated_by)
       VALUES (?, ?, ?, 1, 1, 1)`,
      [resultId, targetId, LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV],
    );
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
    isActive?: boolean;
  }

  async function seedActor(seed: ActorSeed): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_type_custom_name,
         sex_age_disaggregation_not_apply,
         women_youth_count, women_not_youth_count, men_youth_count, men_not_youth_count,
         actors_count, actor_role_id, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
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
        seed.isActive ?? true,
      ],
    );
    return result.insertId;
  }

  // T-19 (`docs/specs/changes/innovation-use-required-fields`) — organization
  // and measure row seeders, added to extend F1-F17's per-rule coverage to
  // rules 6-9 (organizations, DD-5/DD-5b) and 10-11 (measures). Column set
  // matches `result-institution-type.entity.ts` / `result-quantification.
  // entity.ts` and the INSERT shapes already used by sibling fixtures in
  // this directory (e.g. `innovation-use-role-isolation.fixture-spec.ts`).
  interface OrgSeed {
    resultId: number;
    isOrganizationKnown: boolean | null;
    institutionId?: number | null;
    institutionTypeId?: number | null;
    subInstitutionTypeId?: number | null;
    organizationCount?: number | null;
    isActive?: boolean;
  }

  async function seedOrg(seed: OrgSeed): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_role_id, is_organization_known,
         institution_id, institution_type_id, sub_institution_type_id,
         organization_count, is_active, created_by, updated_by
       ) VALUES (?, 2, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        seed.resultId,
        seed.isOrganizationKnown,
        seed.institutionId ?? null,
        seed.institutionTypeId ?? null,
        seed.subInstitutionTypeId ?? null,
        seed.organizationCount ?? null,
        seed.isActive ?? true,
      ],
    );
    return result.insertId;
  }

  interface MeasureSeed {
    resultId: number;
    quantificationNumber?: number | null;
    unit?: string | null;
    description?: string | null;
    isActive?: boolean;
  }

  async function seedMeasure(seed: MeasureSeed): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO result_quantifications (
         result_id, quantification_role_id, quantification_number, unit,
         description, is_active, created_by, updated_by
       ) VALUES (?, 3, ?, ?, ?, ?, 1, 1)`,
      [
        seed.resultId,
        seed.quantificationNumber ?? null,
        seed.unit ?? null,
        seed.description ?? null,
        seed.isActive ?? true,
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

    // T-14 (Amendment 02) — `indicators` / `indicator_types` FK target for
    // `seedLinkedDevLink`'s target rows (`indicator_id = 2`, Innovation
    // Dev). Both tables were EMPTY (0 rows) in this scratch schema — the
    // same environment finding `innovation-use-linked-dev-validation.
    // fixture-spec.ts`'s header already records for the identical FK.
    // `INSERT IGNORE`, never torn down — same discipline as every other
    // foundational catalog top-up in this block.
    await dataSource.query(
      `INSERT IGNORE INTO indicator_types (indicator_type_id, name) VALUES (1, 'Fixture indicator type')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO indicators (indicator_id, name, indicator_type_id) VALUES (?, 'Innovation Development', 1)`,
      [IndicatorsEnum.INNOVATION_DEV],
    );

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

    // The Innovation Dev role (actor_role_id = 1) is seeded unconditionally
    // by `test/fixtures/global-setup.ts` before any worker starts — this
    // file no longer creates it itself (removed at T-13 C-4 cleanup: the
    // `innovationDevRoleSeeded`-guarded check-then-insert, structurally
    // always a no-op once global-setup runs first). F11 needs a real,
    // resolvable Innovation Dev actor row to prove the role filter is
    // non-vacuous, and global-setup's seed already guarantees it exists.

    // T-19 — private organization-type catalog (band 971_2xx, exclusively
    // owned by this file). Parents before children: the self-referencing
    // FK (`FK_5bb4b590a7a2fa58ebd39e6289d` on `parent_code`) requires the
    // parent row to already exist.
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, NULL, TRUE)`,
      [ORG_TYPE_ROOT_NO_CHILDREN, 'T-19 fixture org type — root, no children'],
    );
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, NULL, TRUE)`,
      [ORG_TYPE_ROOT_WITH_CHILD, 'T-19 fixture org type — root, has child'],
    );
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, ?, TRUE)`,
      [
        ORG_SUBTYPE_OF_ROOT_WITH_CHILD,
        'T-19 fixture org sub-type — child of root-with-child',
        ORG_TYPE_ROOT_WITH_CHILD,
      ],
    );
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, NULL, TRUE)`,
      [
        ORG_TYPE_OTHER_ROOT_WITH_CHILD,
        'T-19 fixture org type — other root, has child',
      ],
    );
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, ?, TRUE)`,
      [
        ORG_SUBTYPE_OF_OTHER_ROOT,
        'T-19 fixture org sub-type — child of other root',
        ORG_TYPE_OTHER_ROOT_WITH_CHILD,
      ],
    );
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institutions (code, name) VALUES (?, ?)`,
      [ORG_INSTITUTION_CODE, 'T-19 fixture institution — known path'],
    );

    // T-19 (F42) — real catalog codes, parents before children. See this
    // describe block's top-level comment for why this file never deletes
    // these three.
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, 'NGO', NULL, TRUE)`,
      [REAL_CODE_NGO_ROOT],
    );
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, 'NGO International', ?, TRUE)`,
      [REAL_CODE_NGO_INTERNATIONAL, REAL_CODE_NGO_ROOT],
    );
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, 'NGO International (General)', ?, TRUE)`,
      [REAL_CODE_NGO_INTERNATIONAL_GENERAL, REAL_CODE_NGO_INTERNATIONAL],
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    for (const resultId of resultIds) {
      if (resultId === undefined || resultId === null) {
        continue;
      }
      // T-14 — `seedLinkedDevLink` gives every result here a `link_results`
      // row, and that table carries FKs in BOTH directions (`result_id` AND
      // `other_result_id`), so it must be gone before `results` itself is
      // deleted below. `resultIds` holds both the subject and the target
      // id for every case, so this runs twice per link row (once per side)
      // — harmless: the second delete matches zero rows.
      await dataSource.query(
        `DELETE FROM link_results WHERE result_id = ? OR other_result_id = ?`,
        [resultId, resultId],
      );
      await dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
        resultId,
      ]);
      // T-19 — added alongside `seedOrg`/`seedMeasure`: these two rows carry
      // FKs to `results.result_id`, so they must be gone before `results`
      // itself is deleted below (and `result_institution_types` FKs to the
      // private catalog codes cleaned up further down, so this must also
      // run before that cleanup).
      await dataSource.query(
        `DELETE FROM result_institution_types WHERE result_id = ?`,
        [resultId],
      );
      await dataSource.query(
        `DELETE FROM result_quantifications WHERE result_id = ?`,
        [resultId],
      );
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [resultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        resultId,
      ]);
    }

    // T-19 — private organization-type catalog (band 971_2xx), children
    // before parents (self-referencing FK). Exclusively owned by this file
    // — safe to delete unconditionally, unlike the REAL codes below.
    await dataSource.query(
      `DELETE FROM clarisa_institution_types WHERE code = ?`,
      [ORG_SUBTYPE_OF_ROOT_WITH_CHILD],
    );
    await dataSource.query(
      `DELETE FROM clarisa_institution_types WHERE code = ?`,
      [ORG_SUBTYPE_OF_OTHER_ROOT],
    );
    await dataSource.query(
      `DELETE FROM clarisa_institution_types WHERE code = ?`,
      [ORG_TYPE_ROOT_WITH_CHILD],
    );
    await dataSource.query(
      `DELETE FROM clarisa_institution_types WHERE code = ?`,
      [ORG_TYPE_OTHER_ROOT_WITH_CHILD],
    );
    await dataSource.query(
      `DELETE FROM clarisa_institution_types WHERE code = ?`,
      [ORG_TYPE_ROOT_NO_CHILDREN],
    );
    await dataSource.query(`DELETE FROM clarisa_institutions WHERE code = ?`, [
      ORG_INSTITUTION_CODE,
    ]);

    // T-19 (F42) — the real codes 37/38/39 are DELIBERATELY left in place;
    // see the describe block's top-level comment for why (they are shared with
    // `institution-type-subtype-catalog-equivalence.fixture-spec.ts`, which
    // owns their removal — this file never deletes them). Not a concurrency
    // argument: the runner is serialised as of 2026-09-07 (FP-51, amended).

    // `actor_roles` id 1 is NEVER created or torn down here —
    // `global-setup.ts` owns it exclusively (see this file's `beforeAll`).
    // The `innovationDevRoleSeeded` guard that used to gate this delete was
    // removed at T-13 (C-4 cleanup): the row it guarded is one
    // `global-setup.ts` seeds unconditionally before any worker starts, so
    // the guard was structurally always `false`.
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

  it('F17: zero rows in all three collections (actors, organizations, measures) returns 1 — R-IUR-011 AC.2, DD-11 reversion (INVERTED from the retired rule 13, T-19)', async () => {
    // T-19 (T-18's Reviewer finding): this fixture used to assert the
    // now-retired rule 13 ("at least one actor is required"), returning 0
    // for zero actor rows. `R-IUR-011` (D-1, user ruling 2026-09-04)
    // withdraws that rule: a result with a level, a justification, and zero
    // rows everywhere is now valid. Under the OLD function body this
    // assertion returned 0 (rule 13's `tempFullActors > 0` failed); under
    // the NEW body every violation count is vacuously 0 for an empty
    // collection, so it now returns 1. That flip IS the requirement.
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null); // level 0, otherwise-complete detail row

    expect(await callValidation(resultId)).toBe(1);
  });

  // ---------------------------------------------------------------------
  // T-19 (`docs/specs/changes/innovation-use-required-fields`) — executes
  // the design.md §3.1 rule table (rules 2-11) against the REAL, applied
  // migration body. Every case below seeds only the ONE collection under
  // test (plus a valid detail row) so the verdict is attributable to a
  // single rule; the other two collections are left empty, which R-IUR-001
  // /F17 above already proves is valid on its own.
  // ---------------------------------------------------------------------

  it('F18: rule 2 pass — actor type OTHER (5) with a valid custom name returns 1', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 5,
      actorTypeCustomName: 'A real custom actor description',
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F19: rule 2 fail — actor type OTHER (5) with a whitespace-only custom name returns 0 (C-2)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 5,
      actorTypeCustomName: '   ',
      sexAgeDisaggregationNotApply: true,
      actorsCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F20: rules 3/4 pass — disaggregated mode, counts 0/5/0/0 (sum 5) returns 1 — 0 is a value, not a blank (R-IUR-004 AC.2)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: false,
      womenYouthCount: 0,
      womenNotYouthCount: 5,
      menYouthCount: 0,
      menNotYouthCount: 0,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F21: rule 4 fail — disaggregated mode, all four counts filled with 0 (sum 0) returns 0 — positivity, not fill (R-IUR-004 AC.4)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: false,
      womenYouthCount: 0,
      womenNotYouthCount: 0,
      menYouthCount: 0,
      menNotYouthCount: 0,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F21b: rule 3 fail — disaggregated mode, one count NULL with a positive sum (5) returns 0 — a partially filled row is invalid regardless of its sum (R-IUR-004 Scenario: A partially filled row); the ONLY fail case that isolates the four-way IS NOT NULL conjunction from the sum > 0 conjunct, since F9b (all four NULL) fails the sum term too', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: false,
      womenYouthCount: 5,
      womenNotYouthCount: null,
      menYouthCount: 0,
      menNotYouthCount: 0,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F22: rule 5 fail — aggregate mode, actors_count = 0 returns 0 — filled but not positive (R-IUR-005 AC.3)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: true,
      actorsCount: 0,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F23: rule 6 pass — known mode with institution_id filled returns 1', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: true,
      institutionId: ORG_INSTITUTION_CODE,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F24: rule 6 fail — known mode with institution_id NULL returns 0', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: true,
      institutionId: null,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F25: rule 7 fail — unknown mode with institution_type_id NULL returns 0', async () => {
    // T-19 attempt-2 (Reviewer finding): `organizationCount` is set here so
    // this row's ONLY violation is the missing type — without it, rule 9
    // (`organization_count` unfilled, seeder default NULL) fires on the
    // same row, and the assertion cannot be attributed to rule 7 alone.
    // Deleting `rit.institution_type_id IS NULL` from the migration must
    // now redden THIS case (it did not before this fix).
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: null,
      organizationCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F26: rules 7/8/9 pass — unknown mode, a childless type (no sub-type required) with organization_count > 0 returns 1', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: ORG_TYPE_ROOT_NO_CHILDREN,
      subInstitutionTypeId: null,
      organizationCount: 5,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F27: rule 8 fail — unknown mode, a type WITH children and sub_institution_type_id NULL returns 0 (DD-5)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: ORG_TYPE_ROOT_WITH_CHILD,
      subInstitutionTypeId: null,
      organizationCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F28: rules 8/8b pass — unknown mode, a type WITH children and its own valid child as sub-type returns 1', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: ORG_TYPE_ROOT_WITH_CHILD,
      subInstitutionTypeId: ORG_SUBTYPE_OF_ROOT_WITH_CHILD,
      organizationCount: 5,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F29: rule 8b fail — sub_institution_type_id belongs to a DIFFERENT parent returns 0 (DD-5b, S-1 required case)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: ORG_TYPE_ROOT_WITH_CHILD,
      subInstitutionTypeId: ORG_SUBTYPE_OF_OTHER_ROOT, // belongs to ORG_TYPE_OTHER_ROOT_WITH_CHILD, not this row's type
      organizationCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F30: rule 9 fail — unknown mode, organization_count NULL returns 0', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: ORG_TYPE_ROOT_NO_CHILDREN,
      organizationCount: null,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F31: rule 9 fail — unknown mode, organization_count = 0 returns 0 — filled but not positive', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: ORG_TYPE_ROOT_NO_CHILDREN,
      organizationCount: 0,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F32: soft-deleted organization row on an otherwise valid result returns 1 (S-1, DD-0 required case)', async () => {
    // The org row below is deliberately invalid (unknown mode, no type) —
    // if `is_active` were dropped from the organization predicate, this
    // row's violation would count and the result would flip to 0.
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: null,
      isActive: false,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F33: rule 10 fail — quantification_number NULL (valid unit) returns 0', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedMeasure({
      resultId,
      quantificationNumber: null,
      unit: 'kg',
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F34: rule 10 fail — quantification_number = 0 (valid unit) returns 0 — rule is <> 0, not > 0 (R-IUR-010 AC.4)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedMeasure({
      resultId,
      quantificationNumber: 0,
      unit: 'kg',
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F35: rule 10 pass — quantification_number = -5 (valid unit) returns 1 — negatives are valid (R-IUR-010 AC.4)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedMeasure({
      resultId,
      quantificationNumber: -5,
      unit: 'kg',
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F36: rule 11 fail — unit NULL (valid number) returns 0', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedMeasure({
      resultId,
      quantificationNumber: 5,
      unit: null,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F37: rule 11 fail — whitespace-only unit (valid number) returns 0 (R-IUR-010 AC.6)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedMeasure({
      resultId,
      quantificationNumber: 5,
      unit: '   ',
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F38: rule 11 pass — a real, non-empty unit (valid number) returns 1 — also the collation probe: a non-empty `unit` reaching REGEXP_REPLACE inside valid_text() through a resolved call must not throw "Illegal mix of collations"', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedMeasure({
      resultId,
      quantificationNumber: 5,
      unit: 'kilograms per hectare',
    });

    // If `result_quantifications.unit`'s table collation
    // (`utf8mb4_unicode_520_ci`) and `valid_text`'s declared parameter
    // collation (`utf8mb4_unicode_ci`) could not coexist inside
    // REGEXP_REPLACE, this `await` would reject rather than resolve to a
    // wrong boolean — this test would fail with a thrown MySQL error, not
    // a bad match, if the concern were real.
    expect(await callValidation(resultId)).toBe(1);
  });

  it('F39: soft-deleted actor row on an otherwise valid result returns 1 (S-1, DD-0) — the case the `is_active` falsifying mutation targets', async () => {
    // The actor row below is deliberately invalid (OTHER type, no custom
    // name) — if `is_active` were dropped from the actor predicate, this
    // row's violation would count and the result would flip to 0.
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 5,
      actorTypeCustomName: null,
      isActive: false,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F40: NULL-mode actor row (sex_age_disaggregation_not_apply IS NULL) with all counts NULL returns 0 — NULL routes to the disaggregated (ELSE) branch, not vacuously valid (C-6)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedActor({
      resultId,
      actorRoleId: 2,
      actorTypeId: 1,
      sexAgeDisaggregationNotApply: null,
      actorsCount: null,
      womenYouthCount: null,
      womenNotYouthCount: null,
      menYouthCount: null,
      menNotYouthCount: null,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F41: NULL-mode organization row (is_organization_known IS NULL) with institution_type_id NULL returns 0 — NULL routes to the unknown-mode (ELSE) branch, not vacuously valid (C-6)', async () => {
    // T-19 attempt-2 (Reviewer finding): `organizationCount` is set here for
    // the same reason as F25 — without it, rule 9 also fires on this row,
    // and the assertion is over-determined between the NULL-mode routing
    // (C-6, what this case targets) and the missing-count rule.
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: null,
      institutionTypeId: null,
      organizationCount: 5,
    });

    expect(await callValidation(resultId)).toBe(0);
  });

  it('F42: DD-5 naive-divergence proof — unknown mode, institution_type_id = REAL catalog code 38 (active, NON-root, HAS children), sub_institution_type_id NULL, returns 1 — the naive EXISTS(parent_code = type) mirror would wrongly require a sub-type here; the correct (root-only) predicate does not, because 38 is not a root type (T-14, DD-5)', async () => {
    const resultId = await seedResult();
    await seedDetail(resultId, 1, null);
    await seedOrg({
      resultId,
      isOrganizationKnown: false,
      institutionTypeId: REAL_CODE_NGO_INTERNATIONAL,
      subInstitutionTypeId: null,
      organizationCount: 5,
    });

    expect(await callValidation(resultId)).toBe(1);
  });

  it('F43: R-IUR-011 AC.2-literal — level ≥ 6 WITH a justification and zero rows everywhere returns 1 (T-19 attempt-2, Reviewer finding: the describe title and three comments above named this case before it existed)', async () => {
    // `tasks.md` states AC.2 as "a result with a level, a justification,
    // and zero rows everywhere ⇒ true". F17 (level 0, no justification)
    // discharges the wording only for a level under 6, where
    // `explanationValid` is never consulted — it does NOT exercise the
    // `IF(useLevel >= 6, explanationValid, TRUE)` conjunct at all. This case
    // is the literal AC.2 scenario: level >= 6, a real justification, zero
    // actor/organization/measure rows.
    //
    // Honest read (does not overclaim): this does NOT discriminate any
    // behavior the existing suite couldn't already catch. F7 already pins
    // the `IF(useLevel >= 6, explanationValid, TRUE)` conjunct true-branch
    // (level 6, valid explanation, one actor row, returns 1), and F17
    // already pins every violation count being vacuously 0 for an empty
    // collection (level 0, zero rows, returns 1). This test is their
    // conjunction — it closes a WORDING gap in the AC.2 traceability table
    // (no fixture previously combined "level >= 6 with justification" AND
    // "zero rows everywhere" in the same row), not a behavioral gap: no
    // mutation of the migration is expected to redden this case without
    // also reddening F7 or F17.
    const resultId = await seedResult();
    await seedDetail(
      resultId,
      7,
      'A concrete justification for use beyond connected next-users.',
    );

    expect(await callValidation(resultId)).toBe(1);
  });
});
