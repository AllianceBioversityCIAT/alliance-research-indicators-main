import { BadRequestException } from '@nestjs/common';
import {
  createInnovationUseHarness,
  InnovationUseHarness,
} from './nest-harness';
import { ActorRolesEnum } from '../../../src/domain/entities/actor-roles/enum/actor-roles.enum';
import { InstitutionTypeRoleEnum } from '../../../src/domain/entities/institution-type-roles/enum/institution-type-role.enum';
import type { CreateResultInnovationUseDto } from '../../../src/domain/entities/result-innovation-use/dto/create-result-innovation-use.dto';

/**
 * `docs/specs/innovation-use/details-api` — PK-collision fixture, not tied
 * to a `tasks.md` line item. Dispatched directly by the Leader to PROVE (or
 * disprove) defects an independent auditor derived by reading code alone —
 * nobody had executed them.
 *
 * **Status, corrected 2026-08-20.** This file was authored under a brief
 * that said "no fix is applied here; leave this test RED and un-skipped",
 * and its first two cases were red on arrival. The fix landed the same day
 * (`ResultActorsService.customSaveInnovationUse`'s `idsAlreadyClaimed`
 * exclusion and `ResultInstitutionTypesService`'s
 * `reconcileAdoptedPrimaryKey`, both of which cite this file by name), so
 * those two cases are now GREEN and this file is a regression guard, not a
 * reproduction. **Every case in this file is expected to pass.** A red run
 * here is a real regression, not the intended state — the earlier
 * "deliberately RED" instruction is spent and no longer describes this file.
 *
 * **Two collision shapes, one file.** Scenario 1 (the original pair of
 * cases) is the ID-LESS shape: an added row's lookup adopts a primary key
 * an earlier id-present row already claimed. Scenario 2 (the nested
 * `describe` at the bottom, added 2026-08-20) is the ID-PRESENT shape: two
 * rows both *submit* the same primary key. They reach the same corruption
 * — two PK-keyed `UPDATE`s against one row — through different code paths,
 * and are guarded by different code, so they are proven separately.
 *
 * **The hypothesis, verified at source before this file was written.**
 * `ResultActorsService.customSaveInnovationUse`'s id-present branch pushes
 * a save object keyed on the caller's `result_actors_id` (own file,
 * `customSaveInnovationUse`). Its id-less branch (same method, the `else`
 * arm) calls `constructWhereClauseInnovationUse` — which builds
 * `{ result_id, actor_role_id: INNOVATION_USE, actor_type_id,
 * actor_type_custom_name: IsNull() }` with — **as of the moment this
 * file was written, before the fix landed** — no `is_active` filter and no
 * exclusion of a `result_actors_id` already claimed earlier in the same
 * payload. The exclusion **now exists** (`Not(In(excludeIds))`, guarded on a
 * non-empty list); this paragraph is the reproduction's hypothesis, kept as
 * the record of what was wrong. It then, if that `findOne` hits, sets
 * `dataTemp['result_actors_id'] = existData.result_actors_id`. An ordinary
 * "edit row X to a new type, and separately add a new row of X's OLD type"
 * payload (exactly what a UI produces when a user changes one actor's type
 * and adds a second) makes the id-less branch's `findOne` resolve to the
 * SAME row the id-present branch already claimed, because nothing has been
 * written to the database yet when that `findOne` runs. `tempRepo.save(
 * dataToSave)` then receives two `Partial<ResultActor>` objects sharing one
 * `result_actors_id` — two PK-keyed `UPDATE`s against one row, not an
 * insert plus an update.
 *
 * **Why `assertInnovationUseOwnership` does not intervene.** That guard
 * (`ResultActorsService`, same file) rejects a submitted id only when it
 * does NOT resolve to a row already scoped to `(result_id, actor_role_id =
 * INNOVATION_USE)`. The id in this scenario (`existingActorId`, below)
 * genuinely belongs to this result and this role — the guard has nothing
 * to reject. This fixture does not touch, mock, or route around that
 * guard; it is exercised for real and is expected to pass silently.
 *
 * **Why `ResultInnovationUseService.validateNoDuplicateActorTypes` does not
 * intervene.** That check (own file) keys identity on `TYPE:<actor_type_id>`
 * (or `OTHER:<name>`). Row 1's payload identity is `TYPE:<changedTo>`, row
 * 2's is `TYPE:<original>` — two DISTINCT identities, so the duplicate
 * check has nothing to flag even though both rows resolve to the same
 * underlying primary key one write later.
 *
 * **The organizations mirror.** `ResultInstitutionTypesService
 * .customSaveInnovationUse` guards ownership the same way, then calls
 * `processInstitution` → (id-less) `buildNewData` → `buildWhereClause` →
 * `constructWhereClause`, which builds an equivalent
 * `{ result_id, institution_type_role_id, institution_type_id,
 * sub_institution_type_id: IsNull(), institution_type_custom_name: IsNull()
 * }` predicate with the same two gaps (no `is_active` filter, no exclusion
 * of an id already claimed by an earlier row in the same call). `
 * removeDuplicates` (own file) cannot catch this either — it keys on
 * `type_<institution_type_id>`, giving row 1 (`changedTo`) and row 2
 * (`original`) distinct keys, same shape as the actor duplicate check
 * above.
 *
 * **⚠️ That paragraph describes the PRE-FIX call chain and is kept as the
 * hypothesis, not as a live description** *(framing added 2026-08-20 at the
 * second `/akili-validate`, which flagged it as reading like current
 * behaviour)*. The chain now has one more step: `reconcileAdoptedPrimaryKey`
 * sits between `processInstitution` and `dataToSave.push`, and converts an
 * adopted PK back into a genuine insert — closing exactly the second gap
 * above. Its own claimed-id set was corrected the same day (**FAIL-2**) to
 * read the rows that survive `removeDuplicates` rather than the raw payload,
 * because against the raw payload it fired on a phantom collision.
 *
 * **What scenario 1 does NOT exercise.** `assertInnovationUseOwnership`'s
 * *unauthorized-id* rejection in either service — untouched, unmocked,
 * genuinely satisfied by both of scenario 1's payloads. No cross-result or
 * cross-role id is submitted anywhere in this file; that shape is already
 * gated by `innovation-use-role-isolation.fixture-spec.ts` (F-B) and is not
 * this hypothesis. Scenario 2 *does* reach
 * `assertInnovationUseOwnership` — its duplicate-id branch specifically,
 * which is a different rejection with a deliberately different message; see
 * that `describe`'s own header.
 *
 * **Band.** Read every sibling `*.fixture-spec.ts` header directly
 * (FP-45): `900_000`-`900_900` are taken (sp-versioning-objective-blocks,
 * innovation-use-validation, innovation-use-lifecycle-routines,
 * innovation-use-detail-round-trip, green-check-ip-rights,
 * innovation-dev-lifecycle-routines-unchanged,
 * innovation-dev-validation-behavioral, innovation-use-section-round-trip,
 * innovation-use-role-isolation, innovation-use-level-boundary), and
 * `innovation-use-result-creation.fixture-spec.ts` reserves `901_000` for
 * `results.result_official_code` plus the `901_0xx` band for its private
 * catalog ids. This file reserves the next unused top-level band,
 * `902_000`, for `results.result_official_code`, and the `902_0xx` band for
 * every private CLARISA code below. **Sub-bands within it** (scenario 2 took
 * the next unused ones, re-checked by grepping every sibling header —
 * FP-45 — which confirmed `902_` appears in no other fixture at all, so the
 * whole band is this file's to subdivide): `902_00x` scenario-1 actor types
 * · `902_01x` scenario-1 institution types · `902_02x` scenario-2 actor
 * types · `902_03x` scenario-2 institution types · `902_1xx` sentinel
 * counts, `902_10x`/`902_11x` scenario 1, `902_12x`/`902_13x`/`902_14x`
 * scenario 2. Scenario 2 reuses this file's platform code and report year
 * rather than reserving more of a registry that does not exist.
 * Reserves report year **2113** (distinct
 * from every reserved year read at source: 2094, 2096, 2097, 2098, 2101,
 * 2102, 2103, 2109, 2110, 2111, 2112) and platform code `T99IUAC` (distinct
 * from every reserved code read at source: T09IUFA, T10IUFB, T11IULB,
 * T12IURC, T12F12B, T13IUDR, T13IULC).
 *
 * **Sentinel discipline (FP-48).** This is a copy/isolation-shaped fixture
 * (it proves which row's data physically lands where after a save, not a
 * literal-domain validation predicate), so every count below is a
 * maximally distinct literal — never `2`-`6`, so no ambiguity with a `bool`
 * column read as `= TRUE` elsewhere in this schema, and no accidental
 * collision between "row 1's new value" and "row 2's value" in a failure
 * message.
 *
 * **Isolation (FP-42-style).** The actor scenario and the organization
 * scenario each get their OWN `results` row and their own single `update()`
 * call — one call submits only `actors` (organizations: []), the other
 * only `organizations` (actors: []) — so a defect (or its absence) in one
 * table can never be read as evidence about the other.
 */
describe('Innovation Use edit-plus-add payload: does an id-less added row collide with an id-present edited row on the same primary key?', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2113;
  const platformCode = 'T99IUAC';
  const actingUserId = 902_000;

  // --- Private `clarisa_actor_types` codes (band 902_0xx) ---
  const actorTypeCodeOriginal = 902_001; // the seeded row's type, and row 2's (added) type
  const actorTypeCodeChangedTo = 902_002; // what row 1 (edited, id-present) changes the seeded row to

  // --- Private `clarisa_institution_types` codes (band 902_0xx) ---
  const institutionTypeCodeOriginal = 902_011;
  const institutionTypeCodeChangedTo = 902_012;

  // --- Scenario 2 (duplicate submitted PK) private catalog codes. ---
  const actorTypeCodeDupSeeded = 902_021; // the seeded row's type, and payload row 1's
  const actorTypeCodeDupConflict = 902_022; // payload row 2's type — same PK, different type
  const actorTypeCodeRollbackWitness = 902_023; // Result D's actor row, never named by any payload
  const institutionTypeCodeDupSeeded = 902_031;
  const institutionTypeCodeDupConflict = 902_032;

  // --- Sentinel counts (band 902_1xx), maximally distinct (FP-48). ---
  const actorsCountOriginal = 902_101; // seeded row's ORIGINAL actors_count, before update()
  const actorsCountRow1 = 902_102; // row 1 (id-present, changed type) submits this
  const actorsCountRow2 = 902_103; // row 2 (id-less, added) submits this
  const organizationCountOriginal = 902_111;
  const organizationCountRow1 = 902_112;
  const organizationCountRow2 = 902_113;

  // --- Scenario 2 sentinel counts. Distinct from every scenario-1 count
  // above, so a byte-identical assertion that fails cannot be misread as
  // scenario 1's data leaking in. ---
  const dupActorsCountSeeded = 902_121;
  const dupActorsCountRow1 = 902_122;
  const dupActorsCountRow2 = 902_123;
  const dupOrganizationCountSeeded = 902_131;
  const dupOrganizationCountRow1 = 902_132;
  const dupOrganizationCountRow2 = 902_133;
  const rollbackWitnessActorsCount = 902_141;

  // Canary written by `update()` step 6 (`result_innovation_use`'s
  // `innovation_use_level_explanation`) INSIDE the transaction, before
  // either duplicate-PK rejection fires in step 7/8. `create()` leaves this
  // column NULL, so if the rejection did not roll the transaction back this
  // string would be sitting in the detail row. It is the load-bearing
  // "nothing persisted" evidence for scenario 2's actor case, where the
  // guard throws at the very top of step 7 and therefore no `result_actors`
  // write is attempted at all. Safe to submit with no
  // `innovation_use_level_id`: the effective level resolves to the stored
  // `NULL`, so R-IUA-006's level >= 6 justification rule never fires and
  // this payload cannot be rejected before `BEGIN` for an unrelated reason.
  const rollbackCanaryExplanation =
    'rollback canary 902_150 — must never be persisted';

  let harness: InnovationUseHarness;
  let dataSource: InnovationUseHarness['dataSource'];

  let platformSeeded = false;
  let reportYearSeeded = false;
  const actorTypesSeeded: number[] = [];
  const institutionTypesSeeded: number[] = [];

  let nextCode = 902_000_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  let actorsResultId: number;
  let orgsResultId: number;
  let existingActorId: number;
  let existingOrgId: number;

  let actorsUpdateResponse: Awaited<
    ReturnType<InnovationUseHarness['service']['update']>
  >;
  let orgsUpdateResponse: Awaited<
    ReturnType<InnovationUseHarness['service']['update']>
  >;

  // --- Scenario 2 state. ---
  let dupActorsResultId: number;
  let dupOrgsResultId: number;
  let dupActorId: number;
  let dupOrgId: number;
  let rollbackWitnessActorId: number;

  let dupActorRowBefore: Record<string, unknown>;
  let dupOrgRowBefore: Record<string, unknown>;
  let rollbackWitnessActorRowBefore: Record<string, unknown>;
  let dupActorsDetailRowBefore: Record<string, unknown>;
  let dupOrgsDetailRowBefore: Record<string, unknown>;

  let dupActorsError: unknown;
  let dupOrgsError: unknown;

  // Results created inside a test body (the sweep-reachability control),
  // rather than in `beforeAll` — tracked so `afterAll` can remove them.
  const sweepProofResultIds: number[] = [];

  /**
   * Re-selects the SAME row by its own immutable primary key at two points
   * in time (the technique `innovation-use-role-isolation.fixture-spec.ts`
   * documents at length): the primary key cannot legitimately differ
   * between the two reads, so there is no identity column to strip —
   * `SELECT *` before, `SELECT *` after, deep `toEqual`. Every column the
   * table has today is compared, including any a future migration adds.
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

  async function countRows(table: string, resultId: number): Promise<number> {
    const [row]: Array<{ total: number }> = await dataSource.query(
      `SELECT COUNT(*) AS total FROM ${table} WHERE result_id = ?`,
      [resultId],
    );
    return Number(row.total);
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
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'Edit-plus-add id-collision reproduction fixture platform')`,
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
      [actorTypeCodeOriginal, 'edit-plus-add fixture actor type (original)'],
      [actorTypeCodeChangedTo, 'edit-plus-add fixture actor type (changed-to)'],
      [
        actorTypeCodeDupSeeded,
        'duplicate-PK fixture actor type (seeded / payload row 1)',
      ],
      [
        actorTypeCodeDupConflict,
        'duplicate-PK fixture actor type (payload row 2, conflicting)',
      ],
      [
        actorTypeCodeRollbackWitness,
        'duplicate-PK fixture actor type (rollback witness)',
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
        institutionTypeCodeOriginal,
        'edit-plus-add fixture institution type (original)',
      ],
      [
        institutionTypeCodeChangedTo,
        'edit-plus-add fixture institution type (changed-to)',
      ],
      [
        institutionTypeCodeDupSeeded,
        'duplicate-PK fixture institution type (seeded / payload row 1)',
      ],
      [
        institutionTypeCodeDupConflict,
        'duplicate-PK fixture institution type (payload row 2, conflicting)',
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

    // --- Result A: carries exactly one active Innovation Use actor row. ---
    const resultA = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [nextOfficialCode(), platformCode, reportYear],
    );
    actorsResultId = resultA.insertId;
    await harness.service.create(actorsResultId);

    const seededActor = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id, sex_age_disaggregation_not_apply,
         actors_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, TRUE, ?, 1, ?, ?)`,
      [
        actorsResultId,
        actorTypeCodeOriginal,
        ActorRolesEnum.INNOVATION_USE,
        actorsCountOriginal,
        actingUserId,
        actingUserId,
      ],
    );
    existingActorId = seededActor.insertId;

    // --- Result B: carries exactly one active Innovation Use organization
    // row. Separate result from Result A (FP-42-style isolation, file
    // header). ---
    const resultB = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [nextOfficialCode(), platformCode, reportYear],
    );
    orgsResultId = resultB.insertId;
    await harness.service.create(orgsResultId);

    const seededOrg = await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_id, institution_type_role_id,
         is_organization_known, organization_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, FALSE, ?, 1, ?, ?)`,
      [
        orgsResultId,
        institutionTypeCodeOriginal,
        InstitutionTypeRoleEnum.INNOVATION_USE,
        organizationCountOriginal,
        actingUserId,
        actingUserId,
      ],
    );
    existingOrgId = seededOrg.insertId;

    // --- Act #1: an ordinary "edit row X's type, and add a new row of X's
    // OLD type" payload against Result A's actors. Real
    // `ResultInnovationUseService.update()`, real
    // `ResultActorsService.customSaveInnovationUse`, no mocking. ---
    const actorsPayload: CreateResultInnovationUseDto = {
      actors: [
        {
          result_actors_id: existingActorId,
          actor_type_id: actorTypeCodeChangedTo,
          sex_age_disaggregation_not_apply: true,
          actors_count: actorsCountRow1,
        },
        {
          actor_type_id: actorTypeCodeOriginal,
          sex_age_disaggregation_not_apply: true,
          actors_count: actorsCountRow2,
        },
      ],
      organizations: [],
      quantifications: [],
    };
    actorsUpdateResponse = await harness.service.update(
      actorsResultId,
      actorsPayload,
    );

    // --- Act #2: the same shape against Result B's organizations. ---
    const orgsPayload: CreateResultInnovationUseDto = {
      actors: [],
      organizations: [
        {
          result_institution_type_id: existingOrgId,
          institution_type_id: institutionTypeCodeChangedTo,
          organization_count: organizationCountRow1,
        },
        {
          institution_type_id: institutionTypeCodeOriginal,
          organization_count: organizationCountRow2,
        },
      ],
      quantifications: [],
    };
    orgsUpdateResponse = await harness.service.update(
      orgsResultId,
      orgsPayload,
    );

    // ================= SCENARIO 2 — duplicate submitted PK =================
    // Two id-present rows sharing ONE genuinely-owned primary key, with
    // different type ids. Each table gets its own `results` row and its own
    // single `update()` call carrying only its own collection (same FP-42
    // isolation as scenario 1), so a rejection in one table can never be
    // read as evidence about the other.

    // --- Result C: one active Innovation Use actor row, whose PK both
    // payload rows will submit. ---
    const resultC = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [nextOfficialCode(), platformCode, reportYear],
    );
    dupActorsResultId = resultC.insertId;
    await harness.service.create(dupActorsResultId);

    const dupSeededActor = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id, sex_age_disaggregation_not_apply,
         actors_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, TRUE, ?, 1, ?, ?)`,
      [
        dupActorsResultId,
        actorTypeCodeDupSeeded,
        ActorRolesEnum.INNOVATION_USE,
        dupActorsCountSeeded,
        actingUserId,
        actingUserId,
      ],
    );
    dupActorId = dupSeededActor.insertId;

    // --- Result D: one active Innovation Use organization row (the target
    // of the duplicate ids), PLUS one active Innovation Use ACTOR row that
    // no payload ever names. That actor row is the rollback WITNESS: with
    // `actors: []`, step 7's `customSaveInnovationUse` returns early from
    // the ownership guard but still runs its deactivating `update(...)`
    // sweep — a real write — before step 8's organization guard throws. If
    // the transaction did not roll back, the witness would come back
    // `is_active = 0`. It is deliberately given its own type code so it can
    // never be confused with a row either payload submitted. ---
    const resultD = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [nextOfficialCode(), platformCode, reportYear],
    );
    dupOrgsResultId = resultD.insertId;
    await harness.service.create(dupOrgsResultId);

    const dupSeededOrg = await dataSource.query(
      `INSERT INTO result_institution_types (
         result_id, institution_type_id, institution_type_role_id,
         is_organization_known, organization_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, FALSE, ?, 1, ?, ?)`,
      [
        dupOrgsResultId,
        institutionTypeCodeDupSeeded,
        InstitutionTypeRoleEnum.INNOVATION_USE,
        dupOrganizationCountSeeded,
        actingUserId,
        actingUserId,
      ],
    );
    dupOrgId = dupSeededOrg.insertId;

    const witnessActor = await dataSource.query(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_role_id, sex_age_disaggregation_not_apply,
         actors_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, TRUE, ?, 1, ?, ?)`,
      [
        dupOrgsResultId,
        actorTypeCodeRollbackWitness,
        ActorRolesEnum.INNOVATION_USE,
        rollbackWitnessActorsCount,
        actingUserId,
        actingUserId,
      ],
    );
    rollbackWitnessActorId = witnessActor.insertId;

    // --- Pre-state, captured AFTER seeding and BEFORE either rejected
    // save, so the `toEqual` comparisons below are genuine before/after
    // snapshots of the same rows rather than restatements of the literals
    // that seeded them. ---
    dupActorRowBefore = await fetchRowByPk(
      'result_actors',
      'result_actors_id',
      dupActorId,
    );
    dupOrgRowBefore = await fetchRowByPk(
      'result_institution_types',
      'result_institution_type_id',
      dupOrgId,
    );
    rollbackWitnessActorRowBefore = await fetchRowByPk(
      'result_actors',
      'result_actors_id',
      rollbackWitnessActorId,
    );
    dupActorsDetailRowBefore = await fetchRowByPk(
      'result_innovation_use',
      'result_id',
      dupActorsResultId,
    );
    dupOrgsDetailRowBefore = await fetchRowByPk(
      'result_innovation_use',
      'result_id',
      dupOrgsResultId,
    );

    // --- Act #3: two id-present actor rows submitting the SAME
    // `result_actors_id` with different `actor_type_id`s, plus the
    // explanation canary. Expected to throw. ---
    try {
      const dupActorsPayload: CreateResultInnovationUseDto = {
        innovation_use_level_explanation: rollbackCanaryExplanation,
        actors: [
          {
            result_actors_id: dupActorId,
            actor_type_id: actorTypeCodeDupSeeded,
            sex_age_disaggregation_not_apply: true,
            actors_count: dupActorsCountRow1,
          },
          {
            result_actors_id: dupActorId,
            actor_type_id: actorTypeCodeDupConflict,
            sex_age_disaggregation_not_apply: true,
            actors_count: dupActorsCountRow2,
          },
        ],
        organizations: [],
        quantifications: [],
      };
      await harness.service.update(dupActorsResultId, dupActorsPayload);
    } catch (error) {
      dupActorsError = error;
    }

    // --- Act #4: the same shape against Result D's organizations. ---
    try {
      const dupOrgsPayload: CreateResultInnovationUseDto = {
        innovation_use_level_explanation: rollbackCanaryExplanation,
        actors: [],
        organizations: [
          {
            result_institution_type_id: dupOrgId,
            institution_type_id: institutionTypeCodeDupSeeded,
            organization_count: dupOrganizationCountRow1,
          },
          {
            result_institution_type_id: dupOrgId,
            institution_type_id: institutionTypeCodeDupConflict,
            organization_count: dupOrganizationCountRow2,
          },
        ],
        quantifications: [],
      };
      await harness.service.update(dupOrgsResultId, dupOrgsPayload);
    } catch (error) {
      dupOrgsError = error;
    }
  });

  afterAll(async () => {
    if (!harness) {
      return;
    }

    if (actorsResultId !== undefined) {
      await dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
        actorsResultId,
      ]);
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [actorsResultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        actorsResultId,
      ]);
    }
    if (orgsResultId !== undefined) {
      await dataSource.query(
        `DELETE FROM result_institution_types WHERE result_id = ?`,
        [orgsResultId],
      );
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [orgsResultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        orgsResultId,
      ]);
    }
    if (dupActorsResultId !== undefined) {
      await dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
        dupActorsResultId,
      ]);
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [dupActorsResultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        dupActorsResultId,
      ]);
    }
    if (dupOrgsResultId !== undefined) {
      await dataSource.query(
        `DELETE FROM result_institution_types WHERE result_id = ?`,
        [dupOrgsResultId],
      );
      // Result D also carries the rollback-witness ACTOR row.
      await dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
        dupOrgsResultId,
      ]);
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [dupOrgsResultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        dupOrgsResultId,
      ]);
    }

    for (const id of sweepProofResultIds) {
      await dataSource.query(`DELETE FROM result_actors WHERE result_id = ?`, [
        id,
      ]);
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [id],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [id]);
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

    await harness.close();
  });

  it('actors: the edited row keeps its identity and the added row survives as a distinct, second active row', async () => {
    // DB-level: every `result_actors` row this result owns, active or not —
    // answers "did the added row exist at all, even inactive" as well as
    // "how many rows are there".
    const allActorRows: Array<Record<string, unknown>> = await dataSource.query(
      `SELECT result_actors_id, actor_type_id, actors_count, is_active, created_by, updated_by
       FROM result_actors WHERE result_id = ? ORDER BY actor_type_id`,
      [actorsResultId],
    );

    const changedToRow = allActorRows.find(
      (row) => Number(row.actor_type_id) === actorTypeCodeChangedTo,
    );
    const originalTypeRow = allActorRows.find(
      (row) => Number(row.actor_type_id) === actorTypeCodeOriginal,
    );

    // Response-level: what `ResultInnovationUseService.update()` actually
    // hands back to a real caller (a `200`, per DD's "no error" premise) —
    // built via `find()`, which filters `is_active: true` only.
    const responseActiveTypes = (actorsUpdateResponse.actors ?? [])
      .map((actor) => Number(actor.actor_type_id))
      .filter(
        (typeId) =>
          typeId === actorTypeCodeOriginal || typeId === actorTypeCodeChangedTo,
      )
      .sort((a, b) => a - b);

    expect({
      responseActiveTypeCount: responseActiveTypes.length,
      dbRowCountForResult: allActorRows.length,
      editedRow: changedToRow
        ? {
            keptOriginalPrimaryKey:
              String(changedToRow.result_actors_id) === String(existingActorId),
            actors_count: Number(changedToRow.actors_count),
            is_active: Number(changedToRow.is_active),
          }
        : null,
      addedRow: originalTypeRow
        ? {
            isADistinctRowFromTheEditedOne:
              String(originalTypeRow.result_actors_id) !==
              String(existingActorId),
            actors_count: Number(originalTypeRow.actors_count),
            is_active: Number(originalTypeRow.is_active),
          }
        : null,
    }).toEqual({
      responseActiveTypeCount: 2,
      dbRowCountForResult: 2,
      editedRow: {
        keptOriginalPrimaryKey: true,
        actors_count: actorsCountRow1,
        is_active: 1,
      },
      addedRow: {
        isADistinctRowFromTheEditedOne: true,
        actors_count: actorsCountRow2,
        is_active: 1,
      },
    });
  });

  it('organizations: the edited row keeps its identity and the added row survives as a distinct, second active row', async () => {
    const allOrgRows: Array<Record<string, unknown>> = await dataSource.query(
      `SELECT result_institution_type_id, institution_type_id, organization_count, is_active, created_by, updated_by
       FROM result_institution_types WHERE result_id = ? ORDER BY institution_type_id`,
      [orgsResultId],
    );

    const changedToRow = allOrgRows.find(
      (row) => Number(row.institution_type_id) === institutionTypeCodeChangedTo,
    );
    const originalTypeRow = allOrgRows.find(
      (row) => Number(row.institution_type_id) === institutionTypeCodeOriginal,
    );

    const responseActiveTypes = (orgsUpdateResponse.organizations ?? [])
      .map((org) => Number(org.institution_type_id))
      .filter(
        (typeId) =>
          typeId === institutionTypeCodeOriginal ||
          typeId === institutionTypeCodeChangedTo,
      )
      .sort((a, b) => a - b);

    expect({
      responseActiveTypeCount: responseActiveTypes.length,
      dbRowCountForResult: allOrgRows.length,
      editedRow: changedToRow
        ? {
            keptOriginalPrimaryKey:
              String(changedToRow.result_institution_type_id) ===
              String(existingOrgId),
            organization_count: Number(changedToRow.organization_count),
            is_active: Number(changedToRow.is_active),
          }
        : null,
      addedRow: originalTypeRow
        ? {
            isADistinctRowFromTheEditedOne:
              String(originalTypeRow.result_institution_type_id) !==
              String(existingOrgId),
            organization_count: Number(originalTypeRow.organization_count),
            is_active: Number(originalTypeRow.is_active),
          }
        : null,
    }).toEqual({
      responseActiveTypeCount: 2,
      dbRowCountForResult: 2,
      editedRow: {
        keptOriginalPrimaryKey: true,
        organization_count: organizationCountRow1,
        is_active: 1,
      },
      addedRow: {
        isADistinctRowFromTheEditedOne: true,
        organization_count: organizationCountRow2,
        is_active: 1,
      },
    });
  });

  /**
   * ==================== SCENARIO 2 — duplicate submitted PK ==============
   *
   * **The shape.** Two id-present rows in ONE payload submitting the same
   * primary key with different type ids. Both ids genuinely belong to this
   * result and this Innovation Use role, so this is neither of the shapes
   * already gated elsewhere: not scenario 1's id-LESS adoption above, and
   * not `innovation-use-role-isolation.fixture-spec.ts`'s cross-result /
   * cross-role unauthorized id.
   *
   * **Why nothing else catches it.** `ResultInnovationUseService
   * .validateNoDuplicateActorTypes` keys identity on `TYPE:<actor_type_id>`
   * — `TYPE:902_021` and `TYPE:902_022` are two distinct identities, so it
   * has nothing to flag. `ResultInstitutionTypesService.removeDuplicates`
   * keys on `type_<institution_type_id>`, giving the organization pair
   * distinct keys for the same reason. `assertInnovationUseOwnership`'s
   * *unauthorized-id* branch has nothing to reject either: the id is owned.
   * Only the duplicate-PK branch stands between this payload and
   * `save()` receiving two objects keyed on one primary key — two PK-keyed
   * `UPDATE`s against one row, leaving a column-level hybrid of both
   * payload rows and silently losing one of them.
   *
   * **Why the message text is asserted in full, not by substring.** The
   * duplicate rejection and the unauthorized-id rejection both name the
   * same field, so `stringContaining('result_actors_id')` would pass even
   * if the guard rejected for the wrong reason. `design.md` §4's PATCH error table made the two
   * messages deliberately distinct; these assertions hold the product to
   * that, and to naming the repeated id.
   *
   * **How "nothing persisted" is made falsifiable.** Both payloads also
   * submit `innovation_use_level_explanation` — a canary written by step 6
   * INSIDE the transaction, before either guard throws. Disable the
   * duplicate-PK check and each case reddens twice over: no `400`, and the
   * canary sitting in a detail row that should still read `NULL`.
   */
  describe('scenario 2 — two id-present rows submitting the same, genuinely owned primary key', () => {
    it('actors: rejects the whole save with a 400 naming the field and the repeated id, in the duplicate-specific message', () => {
      expect(dupActorsError).toBeInstanceOf(BadRequestException);
      expect((dupActorsError as BadRequestException).getStatus()).toBe(400);
      expect(
        (
          (dupActorsError as BadRequestException).getResponse() as {
            message: string[];
          }
        ).message,
      ).toEqual([
        `result_actors_id: same id submitted by more than one row — ${dupActorId}`,
      ]);
    });

    it('actors: persists nothing — the submitted row is byte-identical, no second row was inserted, and the transaction rolled the step-6 canary back', async () => {
      expect({
        submittedRow: await fetchRowByPk(
          'result_actors',
          'result_actors_id',
          dupActorId,
        ),
        rowCountForResult: await countRows('result_actors', dupActorsResultId),
        detailRow: await fetchRowByPk(
          'result_innovation_use',
          'result_id',
          dupActorsResultId,
        ),
      }).toEqual({
        submittedRow: dupActorRowBefore,
        rowCountForResult: 1,
        detailRow: dupActorsDetailRowBefore,
      });
    });

    it('organizations: rejects the whole save with a 400 naming the field and the repeated id, in the duplicate-specific message', () => {
      expect(dupOrgsError).toBeInstanceOf(BadRequestException);
      expect((dupOrgsError as BadRequestException).getStatus()).toBe(400);
      expect(
        (
          (dupOrgsError as BadRequestException).getResponse() as {
            message: string[];
          }
        ).message,
      ).toEqual([
        `result_institution_type_id: same id submitted by more than one row — ${dupOrgId}`,
      ]);
    });

    it('organizations: persists nothing — the submitted row is byte-identical, no second row was inserted, and the transaction rolled the step-6 canary back', async () => {
      expect({
        submittedRow: await fetchRowByPk(
          'result_institution_types',
          'result_institution_type_id',
          dupOrgId,
        ),
        rowCountForResult: await countRows(
          'result_institution_types',
          dupOrgsResultId,
        ),
        detailRow: await fetchRowByPk(
          'result_innovation_use',
          'result_id',
          dupOrgsResultId,
        ),
      }).toEqual({
        submittedRow: dupOrgRowBefore,
        rowCountForResult: 1,
        detailRow: dupOrgsDetailRowBefore,
      });
    });

    /**
     * The strongest single piece of rollback evidence in this file, and it
     * only exists on the organization path. Act #4 submits `actors: []`, so
     * step 7's `ResultActorsService.customSaveInnovationUse` returns early
     * from its ownership guard and then executes its deactivating
     * `tempRepo.update({ result_id, is_active: true, actor_role_id:
     * INNOVATION_USE }, { is_active: false })` sweep — a real write against a
     * real row — BEFORE step 8's organization guard throws. This row is that
     * write's target. Byte-identical here means the `ROLLBACK` genuinely
     * undid a committed-in-transaction row change, not merely that no write
     * was attempted.
     *
     * This is evidence about the TRANSACTION, not about either table's
     * guard: the row is never named by any payload, and the `400` that
     * caused the rollback names `result_institution_type_id`, so there is no
     * ambiguity about which service rejected the save. Scenario 2's actor
     * case has no equivalent witness by construction — its guard throws at
     * the very top of step 7, so step 8 never runs and a surviving
     * organization row would prove nothing.
     */
    it('organizations: the deactivation sweep step 7 ran before the rejection is rolled back — an actor row no payload named is still byte-identical and still active', async () => {
      const witnessAfter = await fetchRowByPk(
        'result_actors',
        'result_actors_id',
        rollbackWitnessActorId,
      );

      expect(witnessAfter).toEqual(rollbackWitnessActorRowBefore);
      expect(Number(witnessAfter.is_active)).toBe(1);

      // **Reachability precondition, added 2026-08-20 (second
      // `/akili-validate`).** Without this, the assertions above are a pure
      // END-STATE comparison and cannot tell "the sweep ran and was rolled
      // back" from "the sweep never ran" — deleting the sweep in
      // `ResultActorsService.customSaveInnovationUse` left this test GREEN
      // while its name became false. This control re-runs the very same
      // `actors: []` payload against a result whose organizations are FINE,
      // so step 8 does not throw and the sweep's effect is allowed to
      // commit. The witness-shaped row MUST come back deactivated: that is
      // what proves the sweep is a real write on this exact path, which is
      // the premise the rollback assertion above rests on. Delete the sweep
      // and this expectation reddens.
      const sweepProofResult = await dataSource.query(
        `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
         VALUES (1, ?, ?, ?, 0, NULL)`,
        [nextOfficialCode(), platformCode, reportYear],
      );
      const sweepProofResultId = sweepProofResult.insertId;
      sweepProofResultIds.push(sweepProofResultId);
      await harness.service.create(sweepProofResultId);

      const sweepProofActor = await dataSource.query(
        `INSERT INTO result_actors (
           result_id, actor_type_id, actor_role_id, sex_age_disaggregation_not_apply,
           actors_count, is_active, created_by, updated_by
         ) VALUES (?, ?, ?, TRUE, ?, 1, ?, ?)`,
        [
          sweepProofResultId,
          actorTypeCodeRollbackWitness,
          ActorRolesEnum.INNOVATION_USE,
          rollbackWitnessActorsCount,
          actingUserId,
          actingUserId,
        ],
      );

      await harness.service.update(sweepProofResultId, {
        actors: [],
        organizations: [],
        quantifications: [],
      } as CreateResultInnovationUseDto);

      const sweptRow = await fetchRowByPk(
        'result_actors',
        'result_actors_id',
        sweepProofActor.insertId,
      );
      expect(Number(sweptRow.is_active)).toBe(0);
    });
  });
});
