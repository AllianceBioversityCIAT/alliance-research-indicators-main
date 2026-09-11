import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  createInnovationUseHarness,
  InnovationUseHarness,
} from './nest-harness';
import { ActorRolesEnum } from '../../../src/domain/entities/actor-roles/enum/actor-roles.enum';
import { InstitutionTypeRoleEnum } from '../../../src/domain/entities/institution-type-roles/enum/institution-type-role.enum';
import { QuantificationRolesEnum } from '../../../src/domain/entities/quantification-roles/enum/quantification-roles.enum';

/**
 * T-10 (`docs/specs/innovation-use/details-api`) — **F-B**, `design.md`
 * Executive Summary + §5.2-§5.4 + §10.3's F-B row. Backs R-IUA-009 (all ACs
 * + scenario), R-IUA-007 AC.4, R-IUA-008 AC.3.
 *
 * **This is the spec's highest-severity risk, gated for real.** T-03/T-04
 * proved at unit tier (mocked repository) that the deactivate *predicate
 * object is constructed* with the right role key. Nothing before this file
 * has proven MySQL actually leaves Innovation Dev's rows — or a second
 * result's rows — alone. Both saves below go through the REAL
 * `ResultInnovationUseService.update()` (via `./nest-harness`, retired as a
 * risk at T-09), never raw SQL for the write path itself.
 *
 * **Two saves, not one (corrected 2026-08-19 at T-10's dispatch).** An
 * empty-array save submits no row id at all, so "no row belonging to
 * result 2 changed" would pass by never attempting the touch — a proxy,
 * the third instance of that shape in this spec (KZ-002: `fetchFullRow`'s
 * whole-row diff instead of a column list is the first; the id-submitting
 * save instead of the empty-array proxy is the second here). Two
 * independent Reviewers confirmed the real exposure at source during T-09:
 * `result-institution-types.service.ts`'s `buildUpdateData` (both branches)
 * and `result-actors.service.ts`'s `result_actors_id`-present branch each
 * return a caller-supplied primary key with **no `result_id` set and no
 * ownership check anywhere** in `customSaveInnovationUse`/`processInstitution`.
 * `tempRepo.save(dataToSave)` then does a plain PK-keyed `UPDATE` — it
 * cannot know, and does not ask, whether that PK belongs to the result
 * being saved. **Shared with `customSaveInnovationDev`, so this is
 * pre-existing platform behaviour, not something this chunk introduced.**
 * This fixture's job is to gate it, honestly, in either direction — see
 * the second `it` below for the outcome actually observed, and see
 * **FIXED, 2026-08-20** at the bottom of this header for the current state.
 *
 * **Two attack shapes, not one (added 2026-08-20 — FAIL-1 remediation,
 * `docs/specs/innovation-use/details-api/validation-report.md`).** The
 * `"save #2"` block below is the CROSS-RESULT shape: result 1's payload
 * carries result 2's row ids. A THIRD block, `"save #3"`, exercises the
 * CROSS-ROLE shape an independent auditor found un-gated: result 1's
 * payload carries **result 1's own** Innovation *Dev* actor and
 * organization row ids inside an Innovation Use save. It needs no
 * knowledge of a second result, so it is the more likely of the two — and
 * until this fix, nothing in this spec exercised it. `devActorId` /
 * `devOrgId` previously appeared in this file **only inside assertions**;
 * save #3 is the first place either is placed inside a payload.
 *
 * **Quantifications are structurally different, and immune to this
 * specific attack shape.** `ResultQuantificationsService.upsertByCompositeKeys`
 * never reads a caller-supplied `id` for matching at all — it looks up
 * `existingRecords` scoped to `{ result_id: resultId, quantification_role_id
 * }` (i.e. scoped to the CALLING result) and matches purely by the
 * composite key `(quantification_number, unit, description)`
 * (`base-service.ts`, `generateCompositeKey`/`existingMap`). A payload item
 * carrying result 2's `id` alongside a composite key that does not already
 * exist for result 1 is simply inserted as a NEW row for result 1 — result
 * 2's row, in a different `result_id` scope entirely, is never examined.
 * The second `it` below submits such an item anyway (an `id` field the
 * DTO declares but the service never reads) so the report can state the
 * finding rather than assume it.
 *
 * **Whole-row comparison, never a hand-enumerated column list (ADR-11).**
 * Unlike `innovation-dev-lifecycle-routines-unchanged.fixture-spec.ts`'s
 * `fetchFullRow` (that file's line 436), which re-selects by `result_id`
 * and expects exactly one row (it compares a SOURCE row against a COPIED
 * row with a DIFFERENT primary key, so it must drop identity columns
 * before comparing), this file's `fetchRowByPk` re-selects the SAME row by
 * its own immutable primary key at two points in time. The primary key
 * cannot legitimately differ between the two reads, so there is no
 * identity column to strip — `SELECT *` before, `SELECT *` after, deep
 * `toEqual`, full stop. This is the same technique (no hand-enumerated
 * column list; every column the table has today is compared, including any
 * a future migration adds) applied to a same-row before/after shape rather
 * than `fetchFullRow`'s cross-row copy shape.
 *
 * **Environment finding, not a task blocker.** `quantification_roles` ids
 * 1 (`actual_count`) and 2 (`extrapolate_estimates`) — migration-seeded by
 * `1760653582914-createQuantificationTables.ts` — were both ABSENT from
 * this scratch container when this file was written (`SELECT * FROM
 * quantification_roles` returned only id 3, `innovation_use`, with
 * `AUTO_INCREMENT` already at 4, i.e. ids 1/2 existed at some point and are
 * now gone by a path this task did not create and does not explain). This
 * is exactly the class of drift `global-setup.ts` already patches for
 * `actor_roles`/`institution_type_roles` id 1 via `INSERT IGNORE` — this
 * file follows the same precedent for these two rows below (a harmless,
 * idempotent, redundant top-up, never the primary seed point for a
 * genuinely fixture-private row), and — matching `global-setup.ts`'s own
 * discipline for id 1 — never tears either one down. Reported to the
 * Leader as a finding; not a defect this task fixes or hides.
 *
 * **Band:** `900_000`-`900_700` are taken (read from every sibling
 * `*.fixture-spec.ts` header directly, FP-45/KZ-002): `900_000`
 * sp-versioning-objective-blocks, `900_100` innovation-use-validation,
 * `900_200` innovation-use-lifecycle-routines, `900_300`
 * innovation-use-detail-round-trip, `900_400` green-check-ip-rights,
 * `900_500` innovation-dev-lifecycle-routines-unchanged, `900_600`
 * innovation-dev-validation-behavioral, `900_700`
 * innovation-use-section-round-trip (T-09). This file reserves `900_800`
 * for `results.result_official_code` and `900_85x`/`900_86x`/`900_87x`/
 * `900_88x`/`900_89x` for private CLARISA codes / quantification numbers /
 * sentinel counts (distinct from every sibling band: 9130-9131, 9141-9149,
 * 9151, 9161-9166, 900_711-900_715). Reserves report year **2110** and
 * platform code `T10IUFB` (distinct from every reserved year/code so far:
 * 2094, 2096, 2097, 2098, 2101, 2102, 2103, 2109 and T09IUFA/T12F12B/
 * T13IUDR/T13IULC).
 *
 * **Sentinel discipline (FP-48).** This is a *copy/isolation* fixture
 * (§10.3), so every column that can legitimately vary gets a maximally
 * distinct literal — a corrupted value and an original value are never
 * mistakable for one another in a failure message.
 *
 * **Falsifying input (the single most important one in the spec, per
 * `tasks.md` T-10):** remove `actor_role_id: ActorRolesEnum.INNOVATION_USE`
 * from `result-actors.service.ts`'s `customSaveInnovationUse` deactivate
 * predicate → the Innovation Dev actor row flips to `is_active = FALSE`
 * and this fixture's first `it` goes red. See the falsification table in
 * this task's report for the other two (`result-institution-types.service.ts`'s
 * `deactivateExistingRecords`, and the quantification role scoping).
 *
 * **FIXED, 2026-08-20 (`docs/specs/innovation-use/details-api/validation-report.md`
 * FAIL-1; supersedes the 2026-08-19 T-10 Pivot Record quarantine below,
 * kept for history).** The two `it`s inside the `"save #2 — a payload for
 * result 1 that submits result 2's row ids"` block that assert result 2's
 * ACTOR row and ORGANIZATION row are byte-identical are **no longer**
 * `it.failing(...)` — they are plain `it`s again, and they pass because the
 * product defect they gated is fixed.
 *
 * **The mechanism.** `ResultActorsService.customSaveInnovationUse` and
 * `ResultInstitutionTypesService.customSaveInnovationUse` each now run a
 * new `assertInnovationUseOwnership` check, first, before either method
 * builds or writes anything: a caller-supplied `result_actors_id` /
 * `result_institution_type_id` is honoured only when a row already exists
 * scoped to BOTH the calling `result_id` AND the calling role
 * (`actor_role_id` / `institution_type_role_id` = `INNOVATION_USE`).
 * Neither half alone is sufficient — see this task's report for the
 * falsification table proving both are load-bearing. An id that fails the
 * check throws `BadRequestException` **before** `dataToSave.push(...)` for
 * that row, inside the same `dataSource.transaction(...)` the write path
 * already runs in (`result-innovation-use.service.ts`'s `update()`), so the
 * thrown error rolls the whole transaction back — nothing from steps 6–10
 * persists, matching design.md DD-3's "a failure persists nothing" even
 * though this particular check cannot run before `BEGIN` (these two
 * services only ever receive an already-open `manager`; moving the check
 * earlier would require touching the orchestrating service, out of scope
 * for this fix).
 *
 * **Save #2's shape changed as a direct consequence, and is now stronger
 * evidence, not weaker.** Before the fix, result 1's save partially
 * executed and silently corrupted result 2's actor/organization rows in
 * place while the rest of the transaction committed. After the fix, the
 * SAME payload is rejected in full — `ResultActorsService`'s ownership
 * check fires on the first offending id (`useR2ActorId`, in `actors`) and
 * throws before `ResultInstitutionTypesService.customSaveInnovationUse`
 * (step 8) or the quantification upsert (step 9) ever run, so the entire
 * save #2 transaction rolls back. `save #2`'s `beforeAll` now catches that
 * rejection (`save2Error`) instead of letting it fail the block, and a new
 * first `it` asserts the rejection itself — `BadRequestException`, `400`,
 * `errors` naming `result_actors_id` and the unauthorized id. Every
 * byte-identical assertion below (Dev's rows, the non-Innovation-Use
 * quantification rows, result 2's quantification row, and now result 2's
 * actor/organization rows) holds for the same reason: **nothing was
 * written at all**, not because each collection was independently proven
 * safe on a partially-committed save. `result_quantifications` remains the
 * structurally-immune reference point (see above) even though, post-fix,
 * this particular payload never reaches it.
 *
 * **`R-IUA-009 AC.3` is now satisfied by the product.** `R-IUA-009
 * AC.1/AC.2/AC.4` and `R-IUA-007 AC.4`, retracted from PROVEN to FALSE at
 * `/akili-validate` (`execution.md` → *RETRACTION*) because they held only
 * for the deactivate predicates and the empty-array save, now hold for the
 * id-present save path too — proven here for both the cross-result shape
 * (save #2) and the cross-role shape (save #3, below).
 *
 * **Historical record — QUARANTINE, 2026-08-19 (T-10 Pivot Record, option
 * B — `docs/specs/innovation-use/details-api/execution.md` → *T-10* +
 * *Pivot Record*), kept for context, NOT current.** The two `it`s above
 * were marked `it.failing(...)`, not `it.skip(...)` and not deleted,
 * because they failed for a confirmed product defect rather than a test
 * error: against real MySQL, result 2's `result_actors` row went
 * `actor_type_id` 900853 → 900854, `actors_count` 900882 → 900883, with
 * `result_id` unchanged — result 1's save silently rewrote it in place.
 * Same shape for `result_institution_types`. `it.failing` kept both
 * assertions executing so the suite was green *because* they failed as
 * documented, and so that fixing the ownership check would turn them
 * **RED** — the signal that has now fired, and that is why `.failing` is
 * gone.
 */
describe('Innovation Use reconciliation never crosses a role or a result boundary (T-10, F-B)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2110;
  const platformCode = 'T10IUFB';
  const actingUserId = 900_820;

  // --- Private `clarisa_actor_types` codes (band 900_85x) ---
  const actorTypeCodeDev = 900_851; // result 1's Innovation DEV actor row
  const actorTypeCodeUseR1 = 900_852; // result 1's Innovation Use actor row (deactivated by save #1)
  const actorTypeCodeUseR2 = 900_853; // result 2's Innovation Use actor row — the attack TARGET
  const actorTypeCodeAttack = 900_854; // the value save #2's payload tries to overwrite the target with
  const actorTypeCodeCrossRoleAttack = 900_856; // save #3's attempted overwrite value (added 2026-08-20)

  // --- Private `clarisa_institution_types` codes (band 900_86x) ---
  const institutionTypeCodeDev = 900_861;
  const institutionTypeCodeUseR1 = 900_862;
  const institutionTypeCodeUseR2 = 900_863; // result 2's org row — attack TARGET
  const institutionTypeCodeAttack = 900_864;
  const institutionTypeCodeCrossRoleAttack = 900_866; // save #3's attempted overwrite value (added 2026-08-20)

  // --- `result_quantifications` composite keys (band 900_87x). No FK, so
  // no private catalog row is needed for these — the sentinel values
  // themselves ARE the composite key. ---
  const quantNumberDevRole1 = 900_871; // ACTUAL_COUNT (role 1) on result 1 — never touched
  const quantNumberDevRole2 = 900_872; // EXTRAPOLATE_ESTIMATES (role 2) on result 1 — never touched
  const quantNumberUseR1 = 900_873; // Innovation Use (role 3) on result 1 — deactivated by save #1
  const quantNumberUseR2 = 900_874; // Innovation Use (role 3) on result 2 — attack target (structurally immune)
  const quantNumberAttack = 900_875; // submitted in save #2's payload — a brand-new composite key for result 1

  // --- Sentinel counts (band 900_88x-900_89x), maximally distinct. ---
  const actorsCountUseR1 = 900_881;
  const actorsCountUseR2Original = 900_882; // result 2's actor row's ORIGINAL count
  const actorsCountAttackAttempt = 900_883; // what save #2 tries to overwrite it WITH
  const orgCountUseR1 = 900_891;
  const orgCountUseR2Original = 900_892; // result 2's org row's ORIGINAL count
  const orgCountAttackAttempt = 900_893; // what save #2 tries to overwrite it WITH

  let harness: InnovationUseHarness;
  let dataSource: DataSource;
  let result1Id: number;
  let result2Id: number;

  let platformSeeded = false;
  let reportYearSeeded = false;
  const actorTypesSeeded: number[] = [];
  const institutionTypesSeeded: number[] = [];

  let nextCode = 900_800_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  // Ids captured during seeding, addressed directly by both saves and both
  // rounds of assertions.
  let devActorId: number;
  let useR1ActorId: number;
  let useR2ActorId: number;
  let devOrgId: number;
  let useR1OrgId: number;
  let useR2OrgId: number;
  let devQuantRole1Id: number;
  let devQuantRole2Id: number;
  let useR1QuantId: number;
  let useR2QuantId: number;

  // Whole-row "before" snapshots, captured ONCE, right after seeding and
  // before either save — every assertion below diffs against THESE, never
  // against a snapshot taken between the two saves, so a defect introduced
  // by save #1 cannot be laundered into the "before" state save #2 is
  // judged against.
  let devActorBefore: Record<string, unknown>;
  let devOrgBefore: Record<string, unknown>;
  let devQuantRole1Before: Record<string, unknown>;
  let devQuantRole2Before: Record<string, unknown>;
  let r2ActorBefore: Record<string, unknown>;
  let r2OrgBefore: Record<string, unknown>;
  let r2QuantBefore: Record<string, unknown>;

  /**
   * Whole-row `SELECT *` by the row's OWN immutable primary key — never a
   * hand-enumerated column list (ADR-11). See the file header for why no
   * identity column needs stripping here, unlike
   * `innovation-dev-lifecycle-routines-unchanged.fixture-spec.ts`'s
   * `fetchFullRow` (line 436), which compares across two DIFFERENT rows.
   */
  async function fetchRowByPk(
    table: string,
    pkColumn: string,
    pkValue: number,
  ): Promise<Record<string, unknown>> {
    const rows: Record<string, unknown>[] = await dataSource.query(
      `SELECT * FROM ${table} WHERE ${pkColumn} = ?`,
      [pkValue],
    );
    expect(rows).toHaveLength(1);
    return rows[0];
  }

  beforeAll(async () => {
    harness = await createInnovationUseHarness(actingUserId);
    dataSource = harness.dataSource;

    // Environment top-up (see file header) — matches `global-setup.ts`'s
    // own `INSERT IGNORE` precedent for `actor_roles`/`institution_type_roles`
    // id 1. Harmless, idempotent, redundant; never the primary seed point
    // for a genuinely fixture-private row, and never torn down.
    await dataSource.query(
      `INSERT IGNORE INTO quantification_roles (id, name) VALUES (${QuantificationRolesEnum.ACTUAL_COUNT}, 'actual_count'), (${QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES}, 'extrapolate_estimates')`,
    );

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [platformCode],
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'T-10 F-B role isolation fixture platform')`,
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

    for (const [code, label] of [
      [actorTypeCodeDev, 'T-10 F-B actor type (result 1, Innovation Dev)'],
      [actorTypeCodeUseR1, 'T-10 F-B actor type (result 1, Innovation Use)'],
      [actorTypeCodeUseR2, 'T-10 F-B actor type (result 2, attack TARGET)'],
      [actorTypeCodeAttack, 'T-10 F-B actor type (attacker-submitted value)'],
      [
        actorTypeCodeCrossRoleAttack,
        'T-10 F-B actor type (save #3 cross-role attacker-submitted value)',
      ],
    ] as [number, string][]) {
      const [existing] = await dataSource.query(
        `SELECT code FROM clarisa_actor_types WHERE code = ?`,
        [code],
      );
      if (!existing) {
        await dataSource.query(
          `INSERT INTO clarisa_actor_types (code, name) VALUES (?, ?)`,
          [code, label],
        );
        actorTypesSeeded.push(code);
      }
    }

    for (const [code, label] of [
      [
        institutionTypeCodeDev,
        'T-10 F-B institution type (result 1, Innovation Dev)',
      ],
      [
        institutionTypeCodeUseR1,
        'T-10 F-B institution type (result 1, Innovation Use)',
      ],
      [
        institutionTypeCodeUseR2,
        'T-10 F-B institution type (result 2, attack TARGET)',
      ],
      [
        institutionTypeCodeAttack,
        'T-10 F-B institution type (attacker-submitted value)',
      ],
      [
        institutionTypeCodeCrossRoleAttack,
        'T-10 F-B institution type (save #3 cross-role attacker-submitted value)',
      ],
    ] as [number, string][]) {
      const [existing] = await dataSource.query(
        `SELECT code FROM clarisa_institution_types WHERE code = ?`,
        [code],
      );
      if (!existing) {
        await dataSource.query(
          `INSERT INTO clarisa_institution_types (code, name) VALUES (?, ?)`,
          [code, label],
        );
        institutionTypesSeeded.push(code);
      }
    }

    // --- Result 1: carries BOTH Innovation Dev and Innovation Use rows in
    // all three shared tables — the state R-IUA-009's scenario forbids
    // relying on "a result has one indicator" to make safe. ---
    const result1 = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [nextOfficialCode(), platformCode, reportYear],
    );
    result1Id = result1.insertId;

    // A `result_innovation_use` detail row is required for `update()` not
    // to 404 (step 2). This exercises `create()` incidentally; it is not
    // this task's subject.
    await harness.service.create(result1Id);

    // --- Result 2: a completely separate result, carrying only
    // Innovation Use rows — the cross-result attack TARGET. ---
    const result2 = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [nextOfficialCode(), platformCode, reportYear],
    );
    result2Id = result2.insertId;

    // --- result_actors: Dev row + Use row on result 1, Use row on result 2 ---
    const devActorInsert = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id, sex_age_disaggregation_not_apply,
         women_youth, women_not_youth, men_youth, men_not_youth,
         is_active, created_by, updated_by
       ) VALUES (?, ?, ?, NULL, TRUE, FALSE, FALSE, TRUE, 1, ?, ?)`,
      [
        result1Id,
        actorTypeCodeDev,
        ActorRolesEnum.INNOVATION_DEV,
        actingUserId,
        actingUserId,
      ],
    );
    devActorId = devActorInsert.insertId;

    const useR1ActorInsert = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id, sex_age_disaggregation_not_apply,
         actors_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, TRUE, ?, 1, ?, ?)`,
      [
        result1Id,
        actorTypeCodeUseR1,
        ActorRolesEnum.INNOVATION_USE,
        actorsCountUseR1,
        actingUserId,
        actingUserId,
      ],
    );
    useR1ActorId = useR1ActorInsert.insertId;

    const useR2ActorInsert = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id, sex_age_disaggregation_not_apply,
         actors_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, TRUE, ?, 1, ?, ?)`,
      [
        result2Id,
        actorTypeCodeUseR2,
        ActorRolesEnum.INNOVATION_USE,
        actorsCountUseR2Original,
        actingUserId,
        actingUserId,
      ],
    );
    useR2ActorId = useR2ActorInsert.insertId;

    // --- result_institution_types: Dev row + Use row on result 1, Use row on result 2 ---
    const devOrgInsert = await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_id, institution_type_role_id,
         is_organization_known, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, FALSE, 1, ?, ?)`,
      [
        result1Id,
        institutionTypeCodeDev,
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        actingUserId,
        actingUserId,
      ],
    );
    devOrgId = devOrgInsert.insertId;

    const useR1OrgInsert = await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_id, institution_type_role_id,
         is_organization_known, organization_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, FALSE, ?, 1, ?, ?)`,
      [
        result1Id,
        institutionTypeCodeUseR1,
        InstitutionTypeRoleEnum.INNOVATION_USE,
        orgCountUseR1,
        actingUserId,
        actingUserId,
      ],
    );
    useR1OrgId = useR1OrgInsert.insertId;

    const useR2OrgInsert = await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_id, institution_type_role_id,
         is_organization_known, organization_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, FALSE, ?, 1, ?, ?)`,
      [
        result2Id,
        institutionTypeCodeUseR2,
        InstitutionTypeRoleEnum.INNOVATION_USE,
        orgCountUseR2Original,
        actingUserId,
        actingUserId,
      ],
    );
    useR2OrgId = useR2OrgInsert.insertId;

    // --- result_quantifications: role 1 + role 2 (neither is Innovation
    // Use, and neither belongs to "Innovation Dev" either — they stand in
    // for "any other role", exactly what R-IUA-008 AC.3 names) on result 1,
    // plus role 3 (Innovation Use) on result 1 and on result 2. ---
    const devQuant1Insert = await dataSource.query(
      `INSERT INTO result_quantifications (
         result_id, quantification_number, unit, description, quantification_role_id,
         is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        result1Id,
        quantNumberDevRole1,
        'sentinel-unit-role1-T10FB',
        'sentinel-description-role1-T10FB',
        QuantificationRolesEnum.ACTUAL_COUNT,
        actingUserId,
        actingUserId,
      ],
    );
    devQuantRole1Id = devQuant1Insert.insertId;

    const devQuant2Insert = await dataSource.query(
      `INSERT INTO result_quantifications (
         result_id, quantification_number, unit, description, quantification_role_id,
         is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        result1Id,
        quantNumberDevRole2,
        'sentinel-unit-role2-T10FB',
        'sentinel-description-role2-T10FB',
        QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
        actingUserId,
        actingUserId,
      ],
    );
    devQuantRole2Id = devQuant2Insert.insertId;

    const useR1QuantInsert = await dataSource.query(
      `INSERT INTO result_quantifications (
         result_id, quantification_number, unit, description, quantification_role_id,
         is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        result1Id,
        quantNumberUseR1,
        'sentinel-unit-user1-T10FB',
        'sentinel-description-user1-T10FB',
        QuantificationRolesEnum.INNOVATION_USE,
        actingUserId,
        actingUserId,
      ],
    );
    useR1QuantId = useR1QuantInsert.insertId;

    const useR2QuantInsert = await dataSource.query(
      `INSERT INTO result_quantifications (
         result_id, quantification_number, unit, description, quantification_role_id,
         is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        result2Id,
        quantNumberUseR2,
        'sentinel-unit-user2-T10FB',
        'sentinel-description-user2-T10FB',
        QuantificationRolesEnum.INNOVATION_USE,
        actingUserId,
        actingUserId,
      ],
    );
    useR2QuantId = useR2QuantInsert.insertId;

    // "Before" snapshots — captured once, before either save.
    devActorBefore = await fetchRowByPk(
      'result_actors',
      'result_actors_id',
      devActorId,
    );
    devOrgBefore = await fetchRowByPk(
      'result_institution_types',
      'result_institution_type_id',
      devOrgId,
    );
    devQuantRole1Before = await fetchRowByPk(
      'result_quantifications',
      'id',
      devQuantRole1Id,
    );
    devQuantRole2Before = await fetchRowByPk(
      'result_quantifications',
      'id',
      devQuantRole2Id,
    );
    r2ActorBefore = await fetchRowByPk(
      'result_actors',
      'result_actors_id',
      useR2ActorId,
    );
    r2OrgBefore = await fetchRowByPk(
      'result_institution_types',
      'result_institution_type_id',
      useR2OrgId,
    );
    r2QuantBefore = await fetchRowByPk(
      'result_quantifications',
      'id',
      useR2QuantId,
    );
  });

  afterAll(async () => {
    if (!harness) {
      return;
    }

    if (result1Id !== undefined) {
      await dataSource.query(
        `DELETE FROM result_quantifications WHERE result_id = ?`,
        [result1Id],
      );
      await dataSource.query(
        `DELETE FROM result_institution_types WHERE result_id = ?`,
        [result1Id],
      );
      await dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
        result1Id,
      ]);
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [result1Id],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        result1Id,
      ]);
    }
    if (result2Id !== undefined) {
      // Save #2's attack payload, IF it succeeded in corrupting result 2's
      // rows in place, does not create any NEW row for result 2 — it only
      // mutates the existing ones. So the same three DELETEs by
      // `result_id` still remove everything result 2 owns, corrupted or
      // not.
      await dataSource.query(
        `DELETE FROM result_quantifications WHERE result_id = ?`,
        [result2Id],
      );
      await dataSource.query(
        `DELETE FROM result_institution_types WHERE result_id = ?`,
        [result2Id],
      );
      await dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
        result2Id,
      ]);
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        result2Id,
      ]);
    }

    for (const code of institutionTypesSeeded) {
      await dataSource.query(
        `DELETE FROM clarisa_institution_types WHERE code = ?`,
        [code],
      );
    }
    for (const code of actorTypesSeeded) {
      await dataSource.query(`DELETE FROM clarisa_actor_types WHERE code = ?`, [
        code,
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
    // `quantification_roles` ids 1/2 are NEVER torn down here — same
    // discipline as `global-setup.ts`'s own id-1 top-ups (file header).

    await harness.close();
  });

  it('save #1 (empty arrays) deactivates every Innovation Use row on result 1 and leaves every Innovation Dev row, and every result 2 row, byte-identical (R-IUA-009 AC.1/AC.2 + scenario, R-IUA-007 AC.4, R-IUA-008 AC.3 first half)', async () => {
    // This save's `actors: [], organizations: [], quantifications: []`
    // takes `customSaveInnovationUse`'s `tempRepo.save([])` no-op path for
    // actors/organizations, and — DISTINCTLY — `upsertByCompositeKeys`'s
    // EARLY-RETURN branch for quantifications (`base-service.ts`, `if
    // (!dataToSaveArray || dataToSaveArray.length === 0)`), never the
    // `In(idsToDeactivate)` branch the second `it` below exercises. This is
    // a different statement, per T-09's forward pointer (b) — do not read
    // one as covering the other.
    await harness.service.update(result1Id, {
      actors: [],
      organizations: [],
      quantifications: [],
    });

    // --- Criterion 1: every Innovation Use actor row on result 1 is
    // deactivated. ---
    const useR1ActorAfter = await fetchRowByPk(
      'result_actors',
      'result_actors_id',
      useR1ActorId,
    );
    expect(Number(useR1ActorAfter.is_active)).toBe(0);

    const useR1OrgAfter = await fetchRowByPk(
      'result_institution_types',
      'result_institution_type_id',
      useR1OrgId,
    );
    expect(Number(useR1OrgAfter.is_active)).toBe(0);

    const useR1QuantAfter = await fetchRowByPk(
      'result_quantifications',
      'id',
      useR1QuantId,
    );
    expect(Number(useR1QuantAfter.is_active)).toBe(0);

    // --- Criterion 2/3: every Innovation Dev row (and the two
    // non-Innovation-Use quantification rows) is byte-identical —
    // `is_active` included. Whole-row `SELECT *` diff, no column dropped. ---
    expect(
      await fetchRowByPk('result_actors', 'result_actors_id', devActorId),
    ).toEqual(devActorBefore);
    expect(
      await fetchRowByPk(
        'result_institution_types',
        'result_institution_type_id',
        devOrgId,
      ),
    ).toEqual(devOrgBefore);
    expect(
      await fetchRowByPk('result_quantifications', 'id', devQuantRole1Id),
    ).toEqual(devQuantRole1Before);
    expect(
      await fetchRowByPk('result_quantifications', 'id', devQuantRole2Id),
    ).toEqual(devQuantRole2Before);

    // --- Criterion 4: no row belonging to result 2 changed (AC.3, first
    // half — the empty-array save never attempts to touch result 2 at
    // all, since no id is submitted). ---
    expect(
      await fetchRowByPk('result_actors', 'result_actors_id', useR2ActorId),
    ).toEqual(r2ActorBefore);
    expect(
      await fetchRowByPk(
        'result_institution_types',
        'result_institution_type_id',
        useR2OrgId,
      ),
    ).toEqual(r2OrgBefore);
    expect(
      await fetchRowByPk('result_quantifications', 'id', useR2QuantId),
    ).toEqual(r2QuantBefore);
  });

  /**
   * Save #2 — the attack. Each assertion below gets its OWN `it` rather
   * than sharing one, deliberately: a finding must be observable in FULL
   * (which of the three tables — Dev rows, the structurally-immune
   * quantification, the actor row, the organization row — is actually
   * affected), not truncated at whichever assertion a shared `it` happens
   * to throw on first. The mutating save itself runs exactly ONCE, in
   * `beforeAll`, satisfying the Scope's "save the section on result 1
   * TWICE" — never once per `it`.
   *
   * **FIXED 2026-08-20 — mechanism note.** Before the fix, this `beforeAll`
   * could simply `await` the save: it partially succeeded (corrupting
   * result 2's rows) while the rest of the transaction committed. After
   * the fix, `ResultActorsService.assertInnovationUseOwnership` rejects the
   * WHOLE payload the moment it sees `useR2ActorId` does not belong to
   * `(result1Id, INNOVATION_USE)` — before organizations (step 8) or
   * quantifications (step 9) ever run, and before any row in this
   * transaction is written. The `beforeAll` below now catches that
   * rejection into `save2Error` rather than letting it fail the block (a
   * beforeAll rejection would otherwise fail every `it` in this describe,
   * including the ones that were already passing), and the first `it`
   * below asserts the rejection itself.
   */
  describe("save #2 — a payload for result 1 that submits result 2's row ids (R-IUA-009 AC.3 second half; the single most important falsifying input in the spec)", () => {
    let save2Error: unknown;

    beforeAll(async () => {
      // The attack payload: result 1's second save carries result 2's
      // ACTOR and ORGANIZATION primary keys, with different sentinel
      // values, in its OWN `actors`/`organizations` arrays. Caught rather
      // than awaited bare — see the block comment above for why.
      //
      // The quantification item below ALSO carries result 2's row's `id`,
      // paired with a brand-new composite key. `upsertByCompositeKeys`
      // never reads `item.id` for matching (see file header) and is
      // structurally immune regardless — but post-fix this item is never
      // even reached, because the actor check above rejects the payload
      // first.
      try {
        await harness.service.update(result1Id, {
          actors: [
            {
              result_actors_id: useR2ActorId,
              actor_type_id: actorTypeCodeAttack,
              sex_age_disaggregation_not_apply: true,
              actors_count: actorsCountAttackAttempt,
            },
          ],
          organizations: [
            {
              result_institution_type_id: useR2OrgId,
              institution_type_id: institutionTypeCodeAttack,
              organization_count: orgCountAttackAttempt,
            },
          ],
          quantifications: [
            {
              id: useR2QuantId,
              quantification_number: quantNumberAttack,
              unit: 'attacker-unit-T10FB',
              description: 'attacker-description-T10FB',
            },
          ],
        } as any);
      } catch (error) {
        save2Error = error;
      }
    });

    it('rejects the whole save with a 400 naming the unauthorized actor id, persisting nothing (FIXED 2026-08-20 — FAIL-1)', () => {
      expect(save2Error).toBeInstanceOf(BadRequestException);
      expect(
        (
          (save2Error as BadRequestException).getResponse() as {
            message: string[];
          }
        ).message,
      ).toEqual(
        expect.arrayContaining([expect.stringContaining('result_actors_id')]),
      );
    });

    it('leaves the Innovation Dev actor row byte-identical (a second save must not newly expose it either)', async () => {
      expect(
        await fetchRowByPk('result_actors', 'result_actors_id', devActorId),
      ).toEqual(devActorBefore);
    });

    it('leaves the Innovation Dev organization row byte-identical', async () => {
      expect(
        await fetchRowByPk(
          'result_institution_types',
          'result_institution_type_id',
          devOrgId,
        ),
      ).toEqual(devOrgBefore);
    });

    it('leaves the non-Innovation-Use quantification rows (roles 1 and 2) byte-identical', async () => {
      expect(
        await fetchRowByPk('result_quantifications', 'id', devQuantRole1Id),
      ).toEqual(devQuantRole1Before);
      expect(
        await fetchRowByPk('result_quantifications', 'id', devQuantRole2Id),
      ).toEqual(devQuantRole2Before);
    });

    it("leaves result 2's quantification row byte-identical — structurally immune, since upsertByCompositeKeys never reads a caller-supplied id (and, post-fix, is never even reached — see block comment above)", async () => {
      expect(
        await fetchRowByPk('result_quantifications', 'id', useR2QuantId),
      ).toEqual(r2QuantBefore);
    });

    /**
     * FIXED 2026-08-20 (`docs/specs/innovation-use/details-api/validation-report.md`
     * FAIL-1). Formerly `it.failing` under the 2026-08-19 T-10 Pivot Record
     * (option B) — history kept in the file header. Now a plain `it` that
     * passes unmodified, per that quarantine's own stated exit condition
     * ("when the defect is fixed: remove `.failing` and expect this test to
     * pass unmodified").
     *
     * **Why it passes now.** `ResultActorsService.customSaveInnovationUse`
     * runs `assertInnovationUseOwnership` first: `useR2ActorId` belongs to
     * `(result2Id, INNOVATION_USE)`, not `(result1Id, INNOVATION_USE)`, so
     * the check throws `BadRequestException` before `dataToSave.push(...)`
     * ever runs for this row. The whole transaction rolls back, so result
     * 2's actor row was never touched — this is the same row-level fact the
     * previous comment described happening by luck of the previous test's
     * write path; now it happens by design of the check.
     *
     * **Root cause, historical:** the `result_actors_id`-present branch used
     * to build its save payload from a caller-supplied primary key with no
     * `result_id` and no ownership check anywhere in the method —
     * `tempRepo.save(...)` then issued a plain PK-keyed UPDATE that could
     * not know, and never asked, whether that PK belonged to the result
     * being saved.
     *
     * **Shared with `customSaveInnovationDev`?** No — `assertInnovationUseOwnership`
     * is a new method called only from `customSaveInnovationUse`.
     * `customSaveInnovationDev` keeps its own, separate, unmodified
     * id-present branch, and is unaffected by this fix (see the Innovation
     * Dev regression evidence in this task's report).
     *
     * **`R-IUA-009 AC.3` is now satisfied by the product.**
     */
    it("leaves result 2's ACTOR row byte-identical — the load-bearing assertion, now passing because the save is rejected outright rather than partially applied", async () => {
      expect(
        await fetchRowByPk('result_actors', 'result_actors_id', useR2ActorId),
      ).toEqual(r2ActorBefore);
    });

    /**
     * FIXED 2026-08-20 (`docs/specs/innovation-use/details-api/validation-report.md`
     * FAIL-1). Formerly `it.failing` under the 2026-08-19 T-10 Pivot Record
     * (option B) — history kept in the file header. Now a plain `it` that
     * passes unmodified, per that quarantine's own stated exit condition.
     *
     * **Why it passes now.** In this run, `ResultActorsService`'s ownership
     * check (above) already rejects the whole payload before
     * `ResultInstitutionTypesService.customSaveInnovationUse` (step 8) ever
     * executes, so this row was never reached at all in either save #2 or
     * save #3 (both submit a bad actor id alongside the bad organization
     * id, so the actors check always fires first).
     *
     * **Corrected 2026-08-20 (FAIL-B remediation).** This paragraph
     * previously read "This file therefore does not carry a live passing
     * test that reaches `ResultInstitutionTypesService.assertInnovationUseOwnership`
     * on its own — that half of the fix is proven instead by the mandatory
     * falsification table in this task's report", which stopped being true
     * the moment `"save #4"` (below, added the same day for the FAIL-B
     * fix — the ownership guard was validating `removeDuplicates`'s output
     * rather than the raw payload) was added: save #4's `actors: []` lets
     * `ResultActorsService`'s check short-circuit without throwing, so
     * `ResultInstitutionTypesService.assertInnovationUseOwnership` is the
     * one that rejects that payload, on its own, end to end. The
     * falsification table remains the evidence for the "scope by role
     * only"/"scope by `result_id` only" mutations specifically — a
     * different claim than "no test reaches this method at all", which
     * save #4 now falsifies.
     *
     * **Root cause, historical:** `buildUpdateData` (reached from
     * `processInstitution`'s `result_institution_type_id`-present check,
     * both branches) used to build the save payload from a caller-supplied
     * primary key with no `result_id` and no ownership check anywhere in
     * `customSaveInnovationUse` / `processInstitution`.
     *
     * **Shared with `customSaveInnovationDev`?** `buildUpdateData` and
     * `processInstitution` ARE shared with `customSaveInnovationDev` (both
     * call through them, parameterised by role) and were deliberately left
     * unmodified — adding the check there would have changed Dev's
     * behaviour as a side effect, out of scope for this fix. The check
     * instead lives in a new method, `assertInnovationUseOwnership`, called
     * only from `customSaveInnovationUse`.
     *
     * **`R-IUA-009 AC.3` is now satisfied by the product.**
     */
    it("leaves result 2's ORGANIZATION row byte-identical — the load-bearing assertion, now passing because the save is rejected outright rather than partially applied", async () => {
      expect(
        await fetchRowByPk(
          'result_institution_types',
          'result_institution_type_id',
          useR2OrgId,
        ),
      ).toEqual(r2OrgBefore);
    });
  });

  /**
   * Save #3 — the CROSS-ROLE variant (added 2026-08-20, FAIL-1 remediation).
   * `devActorId` / `devOrgId` are result 1's OWN Innovation Dev rows,
   * seeded in this file's `beforeAll` and, until this save, referenced only
   * inside assertions (`devActorBefore` / `devOrgBefore`) — never inside a
   * payload. That gap is exactly what let an independent auditor find this
   * variant un-gated after T-10 had already "proven" role isolation: F-B's
   * attack payload carried only result 2's ids, so a same-result,
   * cross-role attack was never attempted here.
   *
   * This variant needs no knowledge of a second result — only a client
   * that ever places an Innovation Dev row id inside an Innovation Use
   * payload — so it is the MORE LIKELY of the two shapes this file gates.
   *
   * **Why the attack values ARE seeded (unlike an earlier draft of this
   * block).** `actorTypeCodeCrossRoleAttack` / `institutionTypeCodeCrossRoleAttack`
   * are real, seeded `clarisa_actor_types`/`clarisa_institution_types` rows
   * (declared with the file's other private codes, band 900_85x/900_86x),
   * not placeholders. With the fix in place they are never written — the
   * ownership check rejects both rows first — but the falsification
   * exercise in this task's report temporarily reverts that check, and at
   * that point this payload DOES reach `tempRepo.save(...)`. A placeholder,
   * non-existent code would then fail on the `clarisa_actor_types` FK
   * constraint instead of actually overwriting the Dev row — a
   * `QueryFailedError` that would falsely look like protection. Seeding
   * real codes makes the mutated-code run demonstrate the actual
   * corruption, exactly like save #2's `actorTypeCodeAttack` already does.
   */
  describe("save #3 — a payload for result 1 that submits result 1's OWN Innovation Dev row ids (the cross-role variant; R-IUA-009 AC.1/AC.2/AC.4, R-IUA-007 AC.4)", () => {
    const actorsCountCrossRoleAttempt = 900_885;
    const orgCountCrossRoleAttempt = 900_895;

    let save3Error: unknown;
    // WARN-1 (validation-report.md, 2026-08-20). Label assigned during
    // remediation round 2, not the original audit — `validation-report.md`
    // was updated to carry this finding under it (§ WARN register,
    // "WARN-1 · DD-3's rollback dependency was asserted by no test").
    // `design.md` DD-3's exception records that the ownership gate (steps
    // 7a/8a) holds "a failure persists nothing" BY ROLLBACK, not by
    // running before `BEGIN`
    // — step 6 (`UPDATE result_innovation_use SET level_id, explanation,
    // audit(UPDATE)`) already executed by the time the gate throws. Nothing
    // in this file asserted that property before now. Captured here, before
    // `update()` runs below, so the `it` at the bottom of this block proves
    // the rollback actually reverted step 6's write rather than the design
    // document merely claiming it does.
    let innovationUseBefore: Record<string, unknown>;

    beforeAll(async () => {
      innovationUseBefore = await fetchRowByPk(
        'result_innovation_use',
        'result_id',
        result1Id,
      );
      try {
        await harness.service.update(result1Id, {
          // WARN-1 (validation-report.md). A real column value, not just
          // audit metadata: catalog id `1` → level `0` (below 6, no
          // explanation required — same safe id `innovation-use-result-
          // creation.fixture-spec.ts:787` already uses against the same
          // real, migration-seeded `clarisa_innovation_use_levels` catalog).
          // Step 6 writes this BEFORE the ownership gate throws; the
          // byte-identical assertion below is only a meaningful rollback
          // proof if a real data column — not merely `updated_at`, which
          // TypeORM's `UpdateQueryBuilder` sets via bare `CURRENT_TIMESTAMP`
          // (`UpdateQueryBuilder.js:401-403`, truncated to whole seconds
          // even though the column is `timestamp(6)`) and so cannot be
          // relied on to differ between two writes inside the same wall-
          // clock second — would visibly persist if the rollback failed.
          innovation_use_level_id: 1,
          actors: [
            {
              result_actors_id: devActorId,
              actor_type_id: actorTypeCodeCrossRoleAttack,
              sex_age_disaggregation_not_apply: true,
              actors_count: actorsCountCrossRoleAttempt,
            },
          ],
          organizations: [
            {
              result_institution_type_id: devOrgId,
              institution_type_id: institutionTypeCodeCrossRoleAttack,
              organization_count: orgCountCrossRoleAttempt,
            },
          ],
          quantifications: [],
        } as any);
      } catch (error) {
        save3Error = error;
      }
    });

    it('rejects the whole save with a 400 naming the unauthorized actor id, persisting nothing', () => {
      expect(save3Error).toBeInstanceOf(BadRequestException);
      expect(
        (
          (save3Error as BadRequestException).getResponse() as {
            message: string[];
          }
        ).message,
      ).toEqual(
        expect.arrayContaining([expect.stringContaining('result_actors_id')]),
      );
    });

    it("leaves result 1's own Innovation Dev ACTOR row byte-identical — the cross-role variant this file did not gate before this fix", async () => {
      expect(
        await fetchRowByPk('result_actors', 'result_actors_id', devActorId),
      ).toEqual(devActorBefore);
    });

    it("leaves result 1's own Innovation Dev ORGANIZATION row byte-identical", async () => {
      expect(
        await fetchRowByPk(
          'result_institution_types',
          'result_institution_type_id',
          devOrgId,
        ),
      ).toEqual(devOrgBefore);
    });

    it('leaves the result_innovation_use detail row byte-identical, proving the rollback actually reverted step 6 (level_id/explanation/audit) rather than the design merely claiming it does (WARN-1, validation-report.md)', async () => {
      expect(
        await fetchRowByPk('result_innovation_use', 'result_id', result1Id),
      ).toEqual(innovationUseBefore);
    });
  });

  /**
   * Save #4 — FAIL-B (added 2026-08-20, `validation-report.md`, independent
   * auditor finding). Unlike save #2/#3, this payload carries NO
   * unauthorized actor id — `actors: []` — so `ResultActorsService`'s
   * ownership check short-circuits without throwing and
   * `ResultInstitutionTypesService.customSaveInnovationUse` (step 8) is the
   * one that has to reject this payload on its own. That is deliberate:
   * save #2 and save #3 each pair a bad actor id with a bad organization
   * id, so the actors check always fires first and
   * `ResultInstitutionTypesService.assertInnovationUseOwnership` was never
   * exercised end-to-end by any earlier save in this file (see the "Why it
   * passes now" note on save #2's organization assertion, above).
   *
   * The organizations array pairs `devOrgId` — result 1's OWN Innovation
   * Dev row, unauthorized for an Innovation Use save for the same reason as
   * save #3 — with a SECOND row that shares its `institution_type_id`
   * (`institutionTypeCodeDev`) and carries no id at all. Both rows key to
   * the same `type_${institutionTypeCodeDev}` bucket in
   * `removeDuplicates` (`result-institution-types.service.ts`), which is
   * last-write-wins keyed on identity columns only — never on
   * `result_institution_type_id`. Before the FAIL-B fix,
   * `customSaveInnovationUse` ran `assertInnovationUseOwnership` against
   * `removeDuplicates`'s OUTPUT, so the second row silently overwrote the
   * first before the guard ever ran, and `devOrgId` was never checked at
   * all — a `200`, not the `400` `design.md` §15 promises ("otherwise the
   * whole save is rejected, never silently ignored"). The falsification
   * exercise in this task's report temporarily restores that pre-fix
   * behaviour to confirm this block reddens.
   */
  describe('save #4 — an unauthorized organization id paired with a same-institution-type sibling row that would dedupe it away before the ownership guard could see it (validation-report.md FAIL-B)', () => {
    const orgCountFailBSibling = 900_896;

    let save4Error: unknown;
    let innovationUseBeforeSave4: Record<string, unknown>;

    beforeAll(async () => {
      innovationUseBeforeSave4 = await fetchRowByPk(
        'result_innovation_use',
        'result_id',
        result1Id,
      );
      try {
        await harness.service.update(result1Id, {
          // WARN-1 (validation-report.md) — see save #3's identical-purpose
          // comment. A different real catalog id (`2` → level `1`, still
          // below 6) than save #3's, so this block's own rollback proof
          // does not depend on save #3's having already run correctly.
          innovation_use_level_id: 2,
          actors: [],
          organizations: [
            {
              result_institution_type_id: devOrgId,
              institution_type_id: institutionTypeCodeDev,
            },
            {
              institution_type_id: institutionTypeCodeDev,
              organization_count: orgCountFailBSibling,
            },
          ],
          quantifications: [],
        } as any);
      } catch (error) {
        save4Error = error;
      }
    });

    it('rejects the whole save with a 400 naming the unauthorized organization id, persisting nothing (FAIL-B remediation)', () => {
      expect(save4Error).toBeInstanceOf(BadRequestException);
      expect(
        (
          (save4Error as BadRequestException).getResponse() as {
            message: string[];
          }
        ).message,
      ).toEqual(
        expect.arrayContaining([
          expect.stringContaining('result_institution_type_id'),
        ]),
      );
    });

    it("leaves result 1's own Innovation Dev ORGANIZATION row byte-identical — the row `removeDuplicates` used to drop before the guard ever saw it", async () => {
      expect(
        await fetchRowByPk(
          'result_institution_types',
          'result_institution_type_id',
          devOrgId,
        ),
      ).toEqual(devOrgBefore);
    });

    it('leaves the result_innovation_use detail row byte-identical (WARN-1 property, reproven for this independently-rejected save)', async () => {
      expect(
        await fetchRowByPk('result_innovation_use', 'result_id', result1Id),
      ).toEqual(innovationUseBeforeSave4);
    });

    it('never persists a result_institution_types row for the id-less sibling, closing the insert direction (FAIL-B remediation)', async () => {
      const rows: Record<string, unknown>[] = await dataSource.query(
        'SELECT * FROM result_institution_types WHERE organization_count = ?',
        [orgCountFailBSibling],
      );
      expect(rows).toHaveLength(0);
    });
  });
});
