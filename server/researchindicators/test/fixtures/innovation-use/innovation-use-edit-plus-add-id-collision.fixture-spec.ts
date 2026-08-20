import {
  createInnovationUseHarness,
  InnovationUseHarness,
} from './nest-harness';
import { ActorRolesEnum } from '../../../src/domain/entities/actor-roles/enum/actor-roles.enum';
import { InstitutionTypeRoleEnum } from '../../../src/domain/entities/institution-type-roles/enum/institution-type-role.enum';
import type { CreateResultInnovationUseDto } from '../../../src/domain/entities/result-innovation-use/dto/create-result-innovation-use.dto';

/**
 * `docs/specs/innovation-use/details-api` — REPRODUCTION-ONLY fixture, not
 * tied to a `tasks.md` line item. Dispatched directly by the Leader to
 * PROVE (or disprove) a defect an independent auditor derived by reading
 * code alone — nobody had executed it. **No fix is applied here. This test
 * is deliberately left RED and un-skipped**, per the dispatch brief's
 * explicit instruction; a Reviewer/Implementer reading this file for the
 * fix task should not "clean it up" by adjusting the expectation.
 *
 * **The hypothesis, verified at source before this file was written.**
 * `ResultActorsService.customSaveInnovationUse`'s id-present branch pushes
 * a save object keyed on the caller's `result_actors_id` (own file,
 * `customSaveInnovationUse`). Its id-less branch (same method, the `else`
 * arm) calls `constructWhereClauseInnovationUse` — which builds
 * `{ result_id, actor_role_id: INNOVATION_USE, actor_type_id,
 * actor_type_custom_name: IsNull() }` with **no `is_active` filter and no
 * exclusion of a `result_actors_id` already claimed earlier in the same
 * payload** — then, if that `findOne` hits, sets
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
 * **What this fixture does NOT exercise.** `assertInnovationUseOwnership`
 * in either service — untouched, unmocked, genuinely satisfied by both
 * scenarios below. No cross-result or cross-role id is submitted anywhere
 * in this file; that shape is already gated by
 * `innovation-use-role-isolation.fixture-spec.ts` (F-B) and is not this
 * hypothesis.
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
 * every private CLARISA code below. Reserves report year **2113** (distinct
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

  // --- Sentinel counts (band 902_1xx), maximally distinct (FP-48). ---
  const actorsCountOriginal = 902_101; // seeded row's ORIGINAL actors_count, before update()
  const actorsCountRow1 = 902_102; // row 1 (id-present, changed type) submits this
  const actorsCountRow2 = 902_103; // row 2 (id-less, added) submits this
  const organizationCountOriginal = 902_111;
  const organizationCountRow1 = 902_112;
  const organizationCountRow2 = 902_113;

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

  let actorsUpdateResponse: Awaited<ReturnType<InnovationUseHarness['service']['update']>>;
  let orgsUpdateResponse: Awaited<ReturnType<InnovationUseHarness['service']['update']>>;

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
    orgsUpdateResponse = await harness.service.update(orgsResultId, orgsPayload);
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
});
