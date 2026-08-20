import { BadRequestException } from '@nestjs/common';
import { DataSource, Logger } from 'typeorm';
import {
  createInnovationUseHarness,
  InnovationUseHarness,
} from './nest-harness';
import { ResultInnovationUseService } from '../../../src/domain/entities/result-innovation-use/result-innovation-use.service';
import type { CreateResultInnovationUseDto } from '../../../src/domain/entities/result-innovation-use/dto/create-result-innovation-use.dto';

/**
 * T-09 (`docs/specs/innovation-use/details-api`) — **F-A**, `design.md`
 * §10.3/§10.4. Backs R-IUA-002's round-trip scenario, R-IUA-003 AC.1/AC.3/
 * AC.6/AC.7 + scenario 2, R-IUA-007 AC.1/AC.3, R-IUA-008 AC.1/AC.2,
 * NFR-IUA-002.
 *
 * This is the first fixture in this repo that drives a save/read cycle
 * through the REAL `ResultInnovationUseService` (via `./nest-harness`)
 * rather than raw SQL — the harness resolves the service from a real Nest
 * `TestingModule` booted against the TEST datasource. See `nest-harness.ts`
 * for why `GlobalUtilsModule` is imported and why `CurrentUserUtil` /
 * `ResultsUtil` are overridden rather than the whole module list matching
 * `design.md` §10.4's sketch verbatim.
 *
 * **Band:** `900_000`–`900_600` are taken (read from every sibling
 * `*.fixture-spec.ts` header directly, FP-45/KZ-002 — not copied from
 * `tasks.md`): `900_000` sp-versioning-objective-blocks, `900_100`
 * innovation-use-validation, `900_200` innovation-use-lifecycle-routines,
 * `900_300` innovation-use-detail-round-trip, `900_400`
 * green-check-ip-rights, `900_500` innovation-dev-lifecycle-routines-
 * unchanged, `900_600` innovation-dev-validation-behavioral. This file
 * reserves `900_700` for `results.result_official_code`, and reserves
 * report year 2109 and platform code `T09IUFA` (distinct from every
 * reserved year/code above: 2096, 2097, 2098, 2101, 2102, 2103, and T12/T13
 * platform codes).
 *
 * **Sentinel discipline (FP-48).** This is a *copy* fixture (§10.3), so
 * every column gets a maximally distinct literal — no two columns share a
 * number — so a positional transposition in the reconciliation code would
 * be visible rather than silently passing on a repeated value.
 *
 * **Seeding order:** `reporting_platforms` (own code) → `report_years` (own
 * year) → 3 private `clarisa_actor_types` rows (one per actor A/B/C) → 2
 * private `clarisa_institution_types` rows (org1, retained across both
 * saves; org2, dropped in the second save's selective-removal check) →
 * `results` row (own official code, level/status/geo/indicator columns
 * left NULL — all nullable, `orm.config.ts` entities glob confirms no
 * catalog row is needed since `indicator_id`/`geo_scope_id`/
 * `result_status_id` are all `nullable: true` on `Result`).
 * `clarisa_innovation_use_levels` (10 rows, catalog `id = level + 1`) and
 * `quantification_roles` id 3 (`innovation_use`) are pre-existing,
 * migration-seeded rows — never created or torn down here.
 *
 * KZ-006 applies: the FIRST `it` below is the one end-to-end criterion —
 * boot, resolve the real service, complete one real save — before any
 * per-piece assertion. It doubles as T-08's forward pointer (b): calling
 * `create()` then `update()` on the SAME result proves R-IUA-001's
 * scenario clause "a subsequent PATCH succeeds rather than 404", cheaply,
 * since it is exactly the sequence KZ-006 already requires.
 *
 * **Attempt 2 (rework).** Attempt 1 removed only actor B and re-sent the
 * single organization / single quantification unchanged, so R-IUA-007 AC.3
 * and R-IUA-008 AC.2 — both claimed above — had no behavioural gate: the
 * organization path reconciles through
 * `result-institution-types.service.ts`'s `deactivateExistingRecords`, and
 * the quantification path through `base-service.ts`'s
 * `upsertByCompositeKeys` deactivate branch — two mechanisms neither actor
 * removal nor an empty-array save (T-10's subject) exercises. The second
 * `it` below now seeds **two** organizations and **two** quantifications;
 * the third drops one of each while retaining the other **by id**, proving
 * both the "still exists, `is_active = 0`" half and the "retained row's id
 * survives, no delete-and-reinsert" half — the same shape the actor-B
 * assertion already used. Collection lengths are now asserted at both save
 * points on all three collections (`requirements.md` §5.2 DC-2's
 * "duplicates" half), not only the "orphans" half `.find(...)` alone
 * proves.
 *
 * **T-13 extension (NFR-IUA-001).** The fourth `it` below seeds 50
 * additional `result_actors` rows directly (raw SQL, bypassing the service
 * -- this measures the READ path's query shape, not reconciliation, which
 * the `it`s above already cover) against the SAME `resultId`, then swaps a
 * counting `Logger` onto `dataSource` (the exact `DataSource` instance
 * `ResultInnovationUseService` reads through -- its constructor calls
 * `this.dataSource.getRepository(...)`) for the duration of one
 * `findOne(resultId)` call. F-A is the chosen host per `tasks.md` T-13: it
 * already boots the harness and reads the section, so no second harness
 * boot is needed. Cleanup is automatic -- this file's own `afterAll`
 * already deletes every `result_actors` row `WHERE result_id = ?` with no
 * further column filter.
 *
 * **Tester extension (AKILI `/akili-test`) -- closes two properties three
 * Reviewers (T-09, T-11, T-12) independently confirmed unowned at every
 * tier.**
 *
 * **Hole 1 -- `design.md` DD-14's partial-PATCH contract, behaviourally.**
 * T-06 proved the `!== undefined` (never `??`) resolution of the
 * *effective post-write row* only over MOCKED repositories; F-A's own save
 * DTOs (above) and F-C (`innovation-use-level-boundary.fixture-spec.ts`)
 * both send every key on every call, so neither ever exercises an OMITTED
 * key or an explicit `null` against a REAL stored row. The five `it`s
 * below reuse the SAME `resultId` this file already owns: by the time they
 * run, the "edits actor A..." `it` above has left the stored row at
 * `innovation_use_level_id = 7` (level 6, catalog `id = level + 1`, trap 2)
 * with a non-blank `innovation_use_level_explanation` --
 * `innovationUseLevelExplanation` -- and the NFR-IUA-001 `it` is read-only
 * (swaps a `Logger`, never writes), so that precondition is undisturbed
 * entering this block. Three cases send the key PRESENT with an explicit
 * `null` / `''` / `'   '` and must be REJECTED `400` (the level ≥ 6 rule
 * re-fires against the cleared value); the fourth OMITS the key entirely
 * while changing an unrelated field and must be ACCEPTED with the stored
 * justification preserved, read back by raw SQL after the save -- the pair
 * of accept/reject on the SAME stored precondition is what a `??` operator
 * cannot produce, because `??` cannot distinguish an explicit `null` from
 * an omitted key (`design.md` DD-14; `requirements.md` R-IUA-006 AC.3-AC.5).
 *
 * **Hole 2 -- T-08 advisory B-4.** Nothing at any tier proves
 * `ResultInnovationUseService.create(resultId, manager)` honors a PASSED
 * transaction manager rather than falling back to its own repository
 * (`selectManager`, `orm.util.ts`) -- T-05's unit test calls `create(42)`
 * with no manager, and T-12's F-E calls `createResultType(id, indicator)`
 * with two arguments, so `manager` is `undefined` there and the transaction
 * arm is never entered (T-12's Reviewer noted F-E *structurally cannot*
 * bind it). The final `it` below binds it directly: a real
 * `dataSource.transaction()` callback calls `create()` with the
 * transaction's OWN manager, then deliberately throws to force a rollback.
 * If `create()` honors the manager, the insert rolls back with everything
 * else in the callback and no `result_innovation_use` row survives; if it
 * ignored the manager (using its own repository, bound to the pool outside
 * this transaction), the row would commit immediately and survive the
 * rollback -- that divergence is the failure mode this assertion exists to
 * catch. Uses this file's own `nextOfficialCode()` counter (already inside
 * its reserved `900_700` band, no new band needed) and cleans its own
 * `results` row up in a `finally`, independent of this file's `afterAll`.
 */
describe('Innovation Use section round trip via the real ResultInnovationUseService (T-09, F-A)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2109;
  const platformCode = 'T09IUFA';
  const actingUserId = 900_720;

  // Private `clarisa_actor_types` codes — one per actor (A aggregate mode,
  // B disaggregated mode, C used for the add/edit/remove reconciliation
  // check). Distinct from every sibling file's band (9130, 9141-9149/9151,
  // 9161-9166).
  const actorTypeCodeA = 900_711;
  const actorTypeCodeB = 900_712;
  const actorTypeCodeC = 900_713;
  // Private `clarisa_institution_types` codes — org1 (retained across both
  // saves) and org2 (added in the full save, dropped in the re-save to
  // exercise R-IUA-007 AC.3's selective-removal path).
  const institutionTypeCode = 900_714;
  const institutionTypeCode2 = 900_715;

  // Innovation Use level: catalog id 7 = level 6 (id = level + 1, trap 2),
  // which requires a non-blank justification (R-IUA-006) — exercised here
  // as a realistic save, not merely a round-trip of an inert value.
  const innovationUseLevelId = 7;
  const innovationUseLevelExplanation =
    'F-A sentinel explanation for catalog level 6, required at this level.';

  let harness: InnovationUseHarness;
  let dataSource: DataSource;
  let resultId: number;

  let platformSeeded = false;
  let reportYearSeeded = false;
  const actorTypesSeeded: number[] = [];
  let institutionTypeSeeded = false;
  let institutionTypeSeeded2 = false;

  let nextCode = 900_700_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  // Ids captured across the two `update()` calls so the edit/remove
  // reconciliation test can address the exact rows the first save created.
  let actorAId: number;
  let actorBId: number;
  let actorCId: number;
  let organizationId: number;
  let organizationId2: number;
  let quantificationId: number;
  let quantificationId2: number;

  beforeAll(async () => {
    harness = await createInnovationUseHarness(actingUserId);
    dataSource = harness.dataSource;

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [platformCode],
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'T-09 F-A section round-trip fixture platform')`,
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
      [actorTypeCodeA, 'T-09 F-A actor type A (aggregate mode)'],
      [actorTypeCodeB, 'T-09 F-A actor type B (disaggregated mode)'],
      [actorTypeCodeC, 'T-09 F-A actor type C (add/edit/remove)'],
    ] as [number, string][]) {
      const [existingActorType] = await dataSource.query(
        `SELECT code FROM clarisa_actor_types WHERE code = ?`,
        [code],
      );
      if (!existingActorType) {
        await dataSource.query(
          `INSERT INTO clarisa_actor_types (code, name) VALUES (?, ?)`,
          [code, label],
        );
        actorTypesSeeded.push(code);
      }
    }

    const [existingInstitutionType] = await dataSource.query(
      `SELECT code FROM clarisa_institution_types WHERE code = ?`,
      [institutionTypeCode],
    );
    if (!existingInstitutionType) {
      await dataSource.query(
        `INSERT INTO clarisa_institution_types (code, name) VALUES (?, 'T-09 F-A organization institution type (org1, retained)')`,
        [institutionTypeCode],
      );
      institutionTypeSeeded = true;
    }

    const [existingInstitutionType2] = await dataSource.query(
      `SELECT code FROM clarisa_institution_types WHERE code = ?`,
      [institutionTypeCode2],
    );
    if (!existingInstitutionType2) {
      await dataSource.query(
        `INSERT INTO clarisa_institution_types (code, name) VALUES (?, 'T-09 F-A organization institution type (org2, dropped)')`,
        [institutionTypeCode2],
      );
      institutionTypeSeeded2 = true;
    }

    const officialCode = nextOfficialCode();
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [officialCode, platformCode, reportYear],
    );
    resultId = result.insertId;
  });

  afterAll(async () => {
    if (!harness) {
      return;
    }

    if (resultId !== undefined) {
      await dataSource.query(
        `DELETE FROM result_quantifications WHERE result_id = ?`,
        [resultId],
      );
      await dataSource.query(
        `DELETE FROM result_institution_types WHERE result_id = ?`,
        [resultId],
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

    if (institutionTypeSeeded) {
      await dataSource.query(
        `DELETE FROM clarisa_institution_types WHERE code = ?`,
        [institutionTypeCode],
      );
    }
    if (institutionTypeSeeded2) {
      await dataSource.query(
        `DELETE FROM clarisa_institution_types WHERE code = ?`,
        [institutionTypeCode2],
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

  it('KZ-006 — boots the harness, resolves the real ResultInnovationUseService, and completes one real save (also: a subsequent PATCH succeeds rather than 404, R-IUA-001)', async () => {
    expect(harness.service).toBeInstanceOf(ResultInnovationUseService);

    const created = await harness.service.create(resultId);
    expect(created).toBeDefined();

    const [row] = await dataSource.query(
      `SELECT result_id FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(row).toBeDefined();
    expect(Number(row.result_id)).toBe(resultId);
  });

  it('full save -> read equality across level, explanation, two actors (one per mode), one organization with a count, one quantification; audit columns; results.updated_at advances', async () => {
    const [before] = await dataSource.query(
      `SELECT updated_at FROM results WHERE result_id = ?`,
      [resultId],
    );

    // TypeORM's `UpdateQueryBuilder` auto-appends the `@UpdateDateColumn` as
    // bare `CURRENT_TIMESTAMP` (second precision), never `CURRENT_TIMESTAMP(6)`
    // (`node_modules/typeorm/query-builder/UpdateQueryBuilder.js:401-404`,
    // a documented TypeORM `todo`), even though `results.updated_at` is a
    // `timestamp(6)` column. Two writes inside the same wall-clock second
    // therefore truncate to an IDENTICAL stored value despite real
    // microsecond-level progress — this delay crosses a whole second so the
    // "advances" assertion measures TypeORM's actual granularity rather than
    // racing it.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const dto = {
      innovation_use_level_id: innovationUseLevelId,
      innovation_use_level_explanation: innovationUseLevelExplanation,
      actors: [
        {
          actor_type_id: actorTypeCodeA,
          sex_age_disaggregation_not_apply: true,
          actors_count: 41,
        },
        {
          actor_type_id: actorTypeCodeB,
          sex_age_disaggregation_not_apply: false,
          women_youth_count: 11,
          women_not_youth_count: 22,
          men_youth_count: 33,
          men_not_youth_count: 44,
        },
        {
          actor_type_id: actorTypeCodeC,
          sex_age_disaggregation_not_apply: true,
          actors_count: 99,
        },
      ],
      organizations: [
        {
          institution_type_id: institutionTypeCode,
          organization_count: 17,
        },
        {
          institution_type_id: institutionTypeCode2,
          organization_count: 28,
        },
      ],
      quantifications: [
        {
          quantification_number: 55,
          unit: 'sentinel-unit-F-A',
          description: 'sentinel-description-F-A',
        },
        {
          quantification_number: 66,
          unit: 'sentinel-unit-2-F-A',
          description: 'sentinel-description-2-F-A',
        },
      ],
    };

    const result = await harness.service.update(resultId, dto);

    // --- Level + explanation round-trip (R-IUA-002 scenario) ---
    expect(result.innovation_use_level_id).toBe(innovationUseLevelId);
    expect(result.innovation_use_level_explanation).toBe(
      innovationUseLevelExplanation,
    );

    // --- Actors: one per mode (R-IUA-003 AC.1, R-IUA-008 AC.1) ---
    const actorA = result.actors.find(
      (a: any) => Number(a.actor_type_id) === actorTypeCodeA,
    );
    const actorB = result.actors.find(
      (a: any) => Number(a.actor_type_id) === actorTypeCodeB,
    );
    const actorC = result.actors.find(
      (a: any) => Number(a.actor_type_id) === actorTypeCodeC,
    );
    expect(actorA).toBeDefined();
    expect(actorB).toBeDefined();
    expect(actorC).toBeDefined();
    // DC-2's "duplicates" half (`requirements.md` §5.2): `.find(...)` alone
    // would pass even if reconciliation also inserted a spurious duplicate
    // of A. Asserting the collection length closes that gap.
    expect(result.actors).toHaveLength(3);

    expect(Number(actorA.actors_count)).toBe(41);
    expect(actorA.women_youth_count).toBeNull();
    expect(actorA.women_not_youth_count).toBeNull();
    expect(actorA.men_youth_count).toBeNull();
    expect(actorA.men_not_youth_count).toBeNull();
    // Derived total, aggregate mode (R-IUA-002 scenario, design.md §5.5).
    expect(actorA.total).toBe(41);

    expect(actorB.actors_count).toBeNull();
    expect(Number(actorB.women_youth_count)).toBe(11);
    expect(Number(actorB.women_not_youth_count)).toBe(22);
    expect(Number(actorB.men_youth_count)).toBe(33);
    expect(Number(actorB.men_not_youth_count)).toBe(44);
    // Derived total, disaggregated mode: 11 + 22 + 33 + 44 = 110.
    expect(actorB.total).toBe(110);

    actorAId = Number(actorA.result_actors_id);
    actorBId = Number(actorB.result_actors_id);
    actorCId = Number(actorC.result_actors_id);
    expect(actorAId).toBeGreaterThan(0);
    expect(actorBId).toBeGreaterThan(0);
    expect(actorCId).toBeGreaterThan(0);

    // --- Organizations with a count (R-IUA-007 AC.1); two seeded here so
    // the next `it` can drop one and retain the other (R-IUA-007 AC.3) ---
    expect(result.organizations).toHaveLength(2);
    const organization = result.organizations.find(
      (o: any) => Number(o.institution_type_id) === institutionTypeCode,
    );
    const organization2 = result.organizations.find(
      (o: any) => Number(o.institution_type_id) === institutionTypeCode2,
    );
    expect(organization).toBeDefined();
    expect(organization2).toBeDefined();
    expect(Number(organization.organization_count)).toBe(17);
    expect(Number(organization2.organization_count)).toBe(28);
    organizationId = Number(organization.result_institution_type_id);
    organizationId2 = Number(organization2.result_institution_type_id);
    expect(organizationId).toBeGreaterThan(0);
    expect(organizationId2).toBeGreaterThan(0);

    // --- Quantifications (R-IUA-008 AC.1); two seeded here so the next
    // `it` can drop one and retain the other (R-IUA-008 AC.2) ---
    expect(result.quantifications).toHaveLength(2);
    const quantification = result.quantifications.find(
      (q: any) => Number(q.quantification_number) === 55,
    );
    const quantification2 = result.quantifications.find(
      (q: any) => Number(q.quantification_number) === 66,
    );
    expect(quantification).toBeDefined();
    expect(quantification2).toBeDefined();
    expect(quantification.unit).toBe('sentinel-unit-F-A');
    expect(quantification.description).toBe('sentinel-description-F-A');
    expect(quantification2.unit).toBe('sentinel-unit-2-F-A');
    expect(quantification2.description).toBe('sentinel-description-2-F-A');
    quantificationId = Number(quantification.id);
    quantificationId2 = Number(quantification2.id);
    expect(quantificationId).toBeGreaterThan(0);
    expect(quantificationId2).toBeGreaterThan(0);

    // --- Audit columns (R-IUA-003 AC.6). `select: false` on
    // AuditableEntity's created_by/updated_by means the service's own
    // reads never surface them — raw SQL is the only way to see them. ---
    const [detailAudit] = await dataSource.query(
      `SELECT created_by, updated_by FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(Number(detailAudit.created_by)).toBe(actingUserId);
    expect(Number(detailAudit.updated_by)).toBe(actingUserId);

    // `customSaveInnovationUse` audits a brand-new actor row with
    // `SetAuditEnum.NEW` (`result-actors.service.ts:244`) — only
    // `created_by` is set on first insert; `updated_by` is populated only
    // once a row is later re-saved by id (`SetAuditEnum.UPDATE`, asserted
    // in the next `it`, after A and C are edited/resent). Asserting
    // `updated_by === actingUserId` here — before any row has ever been
    // updated — would be asserting a fact the code never claims.
    const actorAudits = await dataSource.query(
      `SELECT created_by, updated_by FROM result_actors WHERE result_id = ? AND is_active = TRUE`,
      [resultId],
    );
    expect(actorAudits.length).toBe(3);
    for (const row of actorAudits) {
      expect(Number(row.created_by)).toBe(actingUserId);
      expect(row.updated_by).toBeNull();
    }

    // Same reasoning as actors: a brand-new organization row is audited
    // with `SetAuditEnum.NEW` (`result-institution-types.service.ts`'s
    // `buildDataTemplate`, `!isEmpty(existData)` false on first insert).
    // Loop form (as the actor query above) so both org1 and org2's
    // `created_by` are covered, not only org1's.
    const orgAudits = await dataSource.query(
      `SELECT created_by, updated_by FROM result_institution_types WHERE result_id = ? AND is_active = TRUE`,
      [resultId],
    );
    expect(orgAudits.length).toBe(2);
    for (const row of orgAudits) {
      expect(Number(row.created_by)).toBe(actingUserId);
      expect(row.updated_by).toBeNull();
    }

    // Quantifications carry `SetAuditEnum.BOTH` on first insert
    // (`upsertByCompositeKeys`), unlike actors/organizations' `NEW` — same
    // loop form so both quant1 and quant2's `created_by` are covered.
    const quantAudits = await dataSource.query(
      `SELECT created_by, updated_by FROM result_quantifications WHERE result_id = ? AND is_active = TRUE`,
      [resultId],
    );
    expect(quantAudits.length).toBe(2);
    for (const row of quantAudits) {
      expect(Number(row.created_by)).toBe(actingUserId);
      expect(Number(row.updated_by)).toBe(actingUserId);
    }

    // --- results.last_updated_date (i.e. results.updated_at) advances
    // across the save, via UpdateDataUtil (AC.7). ---
    const [after] = await dataSource.query(
      `SELECT updated_at FROM results WHERE result_id = ?`,
      [resultId],
    );
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime(),
    );
  });

  it('edits actor A, removes actor B, and drops one organization and one quantification while retaining their siblings — all in the same re-save (R-IUA-007 AC.3, R-IUA-008 AC.2)', async () => {
    expect(actorAId).toBeGreaterThan(0);
    expect(actorBId).toBeGreaterThan(0);
    expect(actorCId).toBeGreaterThan(0);
    expect(organizationId).toBeGreaterThan(0);
    expect(organizationId2).toBeGreaterThan(0);
    expect(quantificationId).toBeGreaterThan(0);
    expect(quantificationId2).toBeGreaterThan(0);

    const [before] = await dataSource.query(
      `SELECT updated_at FROM results WHERE result_id = ?`,
      [resultId],
    );
    // See the first `it`'s comment: TypeORM's auto-appended update-date
    // column is second-precision, so this delay crosses a whole second
    // before the next write.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const dto = {
      innovation_use_level_id: innovationUseLevelId,
      innovation_use_level_explanation: innovationUseLevelExplanation,
      actors: [
        // A: edited — same id, changed value.
        {
          result_actors_id: actorAId,
          actor_type_id: actorTypeCodeA,
          sex_age_disaggregation_not_apply: true,
          actors_count: 141,
        },
        // C: resent unchanged — id must stay intact, value must stay the same.
        {
          result_actors_id: actorCId,
          actor_type_id: actorTypeCodeC,
          sex_age_disaggregation_not_apply: true,
          actors_count: 99,
        },
        // B: deliberately OMITTED — this is the removal.
      ],
      organizations: [
        {
          result_institution_type_id: organizationId,
          institution_type_id: institutionTypeCode,
          organization_count: 17,
        },
      ],
      quantifications: [
        {
          quantification_number: 55,
          unit: 'sentinel-unit-F-A',
          description: 'sentinel-description-F-A',
        },
      ],
    };

    const result = await harness.service.update(resultId, dto);

    const actorA = result.actors.find(
      (a: any) => Number(a.result_actors_id) === actorAId,
    );
    const actorC = result.actors.find(
      (a: any) => Number(a.result_actors_id) === actorCId,
    );
    const actorB = result.actors.find(
      (a: any) => Number(a.result_actors_id) === actorBId,
    );

    // A: id preserved, value changed (41 -> 141).
    expect(actorA).toBeDefined();
    expect(Number(actorA.actors_count)).toBe(141);

    // C: id preserved, unchanged, still active in the read assembly.
    expect(actorC).toBeDefined();
    expect(Number(actorC.actors_count)).toBe(99);

    // B: removed from the active read assembly entirely.
    expect(actorB).toBeUndefined();
    // Only A and C remain active — closes DC-2's "duplicates" half for the
    // post-removal state too (a stray extra A would pass every `.find(...)`
    // above while inflating this count).
    expect(result.actors).toHaveLength(2);

    // B's row must still exist and merely be deactivated — R-IUA-003
    // scenario 2's "AND IT MUST NOT hard-delete B", R-IUA-007 AC.3,
    // R-IUA-008 AC.2.
    const [bRow] = await dataSource.query(
      `SELECT result_actors_id, is_active FROM result_actors WHERE result_actors_id = ?`,
      [actorBId],
    );
    expect(bRow).toBeDefined();
    expect(Number(bRow.is_active)).toBe(0);

    // A and C stay active with ids intact.
    const [aRow] = await dataSource.query(
      `SELECT result_actors_id, is_active FROM result_actors WHERE result_actors_id = ?`,
      [actorAId],
    );
    expect(Number(aRow.result_actors_id)).toBe(actorAId);
    expect(Number(aRow.is_active)).toBe(1);

    const [cRow] = await dataSource.query(
      `SELECT result_actors_id, is_active FROM result_actors WHERE result_actors_id = ?`,
      [actorCId],
    );
    expect(Number(cRow.result_actors_id)).toBe(actorCId);
    expect(Number(cRow.is_active)).toBe(1);

    // A and C were resaved BY id this time (`result_actors_id` present in
    // the payload), which takes `customSaveInnovationUse`'s
    // `SetAuditEnum.UPDATE` branch — now that each has been through both
    // an insert (previous `it`) and an update (this one), both audit
    // columns must equal the acting user (R-IUA-003 AC.6, "written from
    // request.user on both inserted and updated rows").
    const [aAudit] = await dataSource.query(
      `SELECT created_by, updated_by FROM result_actors WHERE result_actors_id = ?`,
      [actorAId],
    );
    expect(Number(aAudit.created_by)).toBe(actingUserId);
    expect(Number(aAudit.updated_by)).toBe(actingUserId);

    const [cAudit] = await dataSource.query(
      `SELECT created_by, updated_by FROM result_actors WHERE result_actors_id = ?`,
      [actorCId],
    );
    expect(Number(cAudit.created_by)).toBe(actingUserId);
    expect(Number(cAudit.updated_by)).toBe(actingUserId);

    // B was never resent, so it was never updated after its original
    // insert — created_by is (still) the acting user, updated_by is (still)
    // NULL. Confirms the deactivate step is a pure `is_active` flip, not a
    // disguised "touch every row" update.
    const [bAudit] = await dataSource.query(
      `SELECT created_by, updated_by FROM result_actors WHERE result_actors_id = ?`,
      [actorBId],
    );
    expect(Number(bAudit.created_by)).toBe(actingUserId);
    expect(bAudit.updated_by).toBeNull();

    // --- Organizations: org1 retained BY id, org2 deliberately OMITTED
    // from the payload — this is the removal (R-IUA-007 AC.3). ---
    expect(result.organizations).toHaveLength(1);
    const orgAfter = result.organizations[0];
    expect(Number(orgAfter.result_institution_type_id)).toBe(organizationId);
    expect(Number(orgAfter.institution_type_id)).toBe(institutionTypeCode);
    expect(Number(orgAfter.organization_count)).toBe(17);

    // org1's row: still the SAME id, still active — proves the retained
    // organization was updated in place, not delete-and-reinserted.
    const [org1Row] = await dataSource.query(
      `SELECT result_institution_type_id, is_active FROM result_institution_types WHERE result_institution_type_id = ?`,
      [organizationId],
    );
    expect(Number(org1Row.result_institution_type_id)).toBe(organizationId);
    expect(Number(org1Row.is_active)).toBe(1);

    // org1 was resaved BY id this time (`result_institution_type_id` present
    // in the payload), which takes `buildUpdateData`'s `SetAuditEnum.UPDATE`
    // spread (`result-institution-types.service.ts:240`) — a different
    // service and a different helper than the actor UPDATE branch asserted
    // above. That branch previously had zero coverage at any tier (R-IUA-003
    // AC.6, "written from request.user on both inserted and updated rows").
    const [org1Audit] = await dataSource.query(
      `SELECT created_by, updated_by FROM result_institution_types WHERE result_institution_type_id = ?`,
      [organizationId],
    );
    expect(Number(org1Audit.created_by)).toBe(actingUserId);
    expect(Number(org1Audit.updated_by)).toBe(actingUserId);

    // org2's row: still exists (no hard-delete), merely deactivated —
    // queried with NO `is_active` filter, same shape the actor-B assertion
    // above already uses correctly.
    const [org2Row] = await dataSource.query(
      `SELECT result_institution_type_id, is_active FROM result_institution_types WHERE result_institution_type_id = ?`,
      [organizationId2],
    );
    expect(org2Row).toBeDefined();
    expect(Number(org2Row.result_institution_type_id)).toBe(organizationId2);
    expect(Number(org2Row.is_active)).toBe(0);

    // --- Quantifications: quant1 retained (same composite key resent
    // unchanged, so `upsertByCompositeKeys` reuses the existing row rather
    // than inserting a duplicate), quant2 deliberately OMITTED — this is
    // the removal (R-IUA-008 AC.2). ---
    expect(result.quantifications).toHaveLength(1);
    const quantAfter = result.quantifications[0];
    expect(Number(quantAfter.id)).toBe(quantificationId);
    expect(Number(quantAfter.quantification_number)).toBe(55);

    // quant1's row: still the SAME id, still active — proves reuse
    // (`upsertByCompositeKeys`'s composite-key match), not
    // delete-and-reinsert on a matching key.
    const [quant1Row] = await dataSource.query(
      `SELECT id, is_active FROM result_quantifications WHERE id = ?`,
      [quantificationId],
    );
    expect(Number(quant1Row.id)).toBe(quantificationId);
    expect(Number(quant1Row.is_active)).toBe(1);

    // quant2's row: still exists (no hard-delete), merely deactivated by
    // `upsertByCompositeKeys`'s `In(idsToDeactivate)` branch — again queried
    // with no `is_active` filter.
    const [quant2Row] = await dataSource.query(
      `SELECT id, is_active FROM result_quantifications WHERE id = ?`,
      [quantificationId2],
    );
    expect(quant2Row).toBeDefined();
    expect(Number(quant2Row.id)).toBe(quantificationId2);
    expect(Number(quant2Row.is_active)).toBe(0);

    // results.updated_at advances again across this second save too.
    const [after] = await dataSource.query(
      `SELECT updated_at FROM results WHERE result_id = ?`,
      [resultId],
    );
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime(),
    );
  });

  it('NFR-IUA-001 — the section read issues no per-row query pattern at 50 actor rows', async () => {
    // Seed 50 additional Innovation Use actor rows directly (raw SQL,
    // bypassing the service -- this measures the READ path's query shape,
    // not reconciliation, which the `it`s above already cover). All 50
    // reference the existing private `actorTypeCodeA` FK and
    // `actor_role_id = 2` (`ActorRolesEnum.INNOVATION_USE`) against the
    // SAME `resultId` this file already owns -- cleaned up automatically by
    // this file's own `afterAll`, which deletes every `result_actors` row
    // `WHERE result_id = ?` with no further column filter.
    const rowCount = 50;
    const valuesSql = Array.from(
      { length: rowCount },
      () => '(?, ?, TRUE, ?, 2)',
    ).join(', ');
    const params: number[] = [];
    for (let i = 0; i < rowCount; i++) {
      params.push(resultId, actorTypeCodeA, i + 1);
    }
    await dataSource.query(
      `INSERT INTO result_actors (result_id, actor_type_id, sex_age_disaggregation_not_apply, actors_count, actor_role_id)
       VALUES ${valuesSql}`,
      params,
    );

    // Count queries via a TypeORM `Logger` swapped onto `dataSource` for
    // the duration of one `findOne` call. This is the exact `DataSource`
    // instance `ResultInnovationUseService` reads through
    // (`this.mainRepo = this.dataSource.getRepository(...)` in its
    // constructor), so every query the read path issues passes through
    // `logQuery` here -- delegating to the original logger so behavior is
    // otherwise unchanged (this repo's TEST datasource sets `logging:
    // false`, `orm.config.ts:54`, so the delegate call is a no-op today,
    // kept only so a future `logging: true` would not silently lose
    // output).
    const originalLogger = dataSource.logger;
    let queryCount = 0;
    const countingLogger: Logger = {
      logQuery: (query, parameters, queryRunner) => {
        queryCount++;
        return originalLogger.logQuery(query, parameters, queryRunner);
      },
      logQueryError: (error, query, parameters, queryRunner) =>
        originalLogger.logQueryError(error, query, parameters, queryRunner),
      logQuerySlow: (time, query, parameters, queryRunner) =>
        originalLogger.logQuerySlow(time, query, parameters, queryRunner),
      logSchemaBuild: (message, queryRunner) =>
        originalLogger.logSchemaBuild(message, queryRunner),
      logMigration: (message, queryRunner) =>
        originalLogger.logMigration(message, queryRunner),
      log: (level, message, queryRunner) =>
        originalLogger.log(level, message, queryRunner),
    };

    let section: Awaited<ReturnType<typeof harness.service.findOne>>;
    (dataSource as unknown as { logger: Logger }).logger = countingLogger;
    try {
      section = await harness.service.findOne(resultId);
    } finally {
      (dataSource as unknown as { logger: Logger }).logger = originalLogger;
    }

    // "No per-row pattern": the 50 rows seeded above, plus the 2 still
    // active from the prior `it` (A and C; B was deactivated), surface in
    // ONE read -- a per-row implementation would have scaled `queryCount`
    // with the row count instead of holding constant.
    expect(section.actors.length).toBeGreaterThanOrEqual(rowCount);
    // Sanity that the counting mechanism is actually wired, not a vacuous
    // 0 that would make the upper-bound assertion below pass trivially.
    expect(queryCount).toBeGreaterThan(0);
    // NFR-IUA-001's target: at most 5 round trips. Observed: exactly 5, not
    // 4 as `execution.md`'s T-05 entry estimated by inspection -- measuring
    // at source (temporary per-query logging, removed before this file was
    // committed) showed `mainRepo.findOne` with a `relations` join costs
    // TWO queries, not one: TypeORM's repository `findOne` combines a
    // relation JOIN with an implicit `LIMIT 1` by first running a
    // `SELECT DISTINCT ... LIMIT 1` subquery to pick the winning id, THEN
    // the full joined `SELECT ... WHERE id IN (?)` -- a known TypeORM
    // pattern for "JOIN + LIMIT" that a plain relation-free read does not
    // pay. Plus the 3 child `find`s (actors, organizations,
    // quantifications) = 5 total. Still at, not over, the ≤5 target, and
    // still constant in the actor row count -- the two extra rows in this
    // read (52 total: 50 seeded here + A and C surviving the prior `it`)
    // did not add a 6th query.
    expect(queryCount).toBeLessThanOrEqual(5);
  });

  // -----------------------------------------------------------------------
  // Hole 1 — DD-14's partial-PATCH contract, behaviourally (see this file's
  // header comment for the full rationale and the precondition this block
  // relies on: resultId's stored row already carries level 6 / catalog
  // id 7 and a non-blank explanation, undisturbed by the read-only
  // NFR-IUA-001 `it` immediately above).
  // -----------------------------------------------------------------------

  it('DD-14 — PATCH {innovation_use_level_explanation: null} (key PRESENT, explicit null) against the stored level-6 row is REJECTED 400, proving `!== undefined` and NOT `??` (R-IUA-006 AC.3/AC.5 as narrowed by DD-14)', async () => {
    const [before] = await dataSource.query(
      `SELECT innovation_use_level_id, innovation_use_level_explanation FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    // Precondition sanity: stored level is still catalog id 7 (level 6)
    // with a non-blank justification — required for this case to be
    // discriminating at all.
    expect(Number(before.innovation_use_level_id)).toBe(innovationUseLevelId);
    expect(before.innovation_use_level_explanation).toBe(
      innovationUseLevelExplanation,
    );

    let caughtError: unknown;
    try {
      await harness.service.update(resultId, {
        innovation_use_level_explanation: null,
      } as unknown as CreateResultInnovationUseDto);
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

    // Validation runs entirely before BEGIN (design.md §5.1) — a rejected
    // call must leave the stored row byte-identical to what it was before.
    const [after] = await dataSource.query(
      `SELECT innovation_use_level_id, innovation_use_level_explanation FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(Number(after.innovation_use_level_id)).toBe(innovationUseLevelId);
    expect(after.innovation_use_level_explanation).toBe(
      innovationUseLevelExplanation,
    );
  });

  it("DD-14 — PATCH {innovation_use_level_explanation: ''} (empty string, key present) against the stored level-6 row is REJECTED 400 (R-IUA-006 AC.4)", async () => {
    await expect(
      harness.service.update(resultId, {
        innovation_use_level_explanation: '',
      } as unknown as CreateResultInnovationUseDto),
    ).rejects.toThrow(BadRequestException);

    const [after] = await dataSource.query(
      `SELECT innovation_use_level_explanation FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(after.innovation_use_level_explanation).toBe(
      innovationUseLevelExplanation,
    );
  });

  it("DD-14 — PATCH {innovation_use_level_explanation: '   '} (whitespace-only, key present) against the stored level-6 row is REJECTED 400 (R-IUA-006 AC.3)", async () => {
    await expect(
      harness.service.update(resultId, {
        innovation_use_level_explanation: '   ',
      } as unknown as CreateResultInnovationUseDto),
    ).rejects.toThrow(BadRequestException);

    const [after] = await dataSource.query(
      `SELECT innovation_use_level_explanation FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(after.innovation_use_level_explanation).toBe(
      innovationUseLevelExplanation,
    );
  });

  it('DD-14 — a PATCH OMITTING the explanation key entirely, while changing an unrelated actor count, is ACCEPTED and the stored justification survives byte-identical, read back by raw SQL (R-IUA-006 AC.5 as narrowed by DD-14 — the half `??` cannot produce)', async () => {
    const dto = {
      innovation_use_level_id: innovationUseLevelId, // present, unchanged
      // innovation_use_level_explanation: deliberately OMITTED — this is
      // the case under test.
      actors: [
        {
          result_actors_id: actorAId,
          actor_type_id: actorTypeCodeA,
          sex_age_disaggregation_not_apply: true,
          actors_count: 241, // "changing something else"
        },
        {
          result_actors_id: actorCId,
          actor_type_id: actorTypeCodeC,
          sex_age_disaggregation_not_apply: true,
          actors_count: 99,
        },
      ],
      organizations: [
        {
          result_institution_type_id: organizationId,
          institution_type_id: institutionTypeCode,
          organization_count: 17,
        },
      ],
      quantifications: [
        {
          quantification_number: 55,
          unit: 'sentinel-unit-F-A',
          description: 'sentinel-description-F-A',
        },
      ],
    };

    const result = await harness.service.update(resultId, dto);

    // The stored justification survived the omission — proving "omitted
    // key preserves the scalar" reached the VALIDATOR too, not only the
    // final UPDATE statement.
    expect(result.innovation_use_level_explanation).toBe(
      innovationUseLevelExplanation,
    );

    const actorA = result.actors.find(
      (a: any) => Number(a.result_actors_id) === actorAId,
    );
    expect(actorA).toBeDefined();
    expect(Number(actorA.actors_count)).toBe(241);

    // Row 5 of the assignment: read back via raw SQL — the stored
    // explanation is unchanged IN THE DATABASE, not merely in the
    // service's in-memory return value.
    const [row] = await dataSource.query(
      `SELECT innovation_use_level_explanation FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    expect(row.innovation_use_level_explanation).toBe(
      innovationUseLevelExplanation,
    );
  });

  // -----------------------------------------------------------------------
  // Hole 2 — T-08 advisory B-4: `create()` honors a PASSED transaction
  // manager (see this file's header comment for the full rationale).
  // -----------------------------------------------------------------------

  it('create() honors a PASSED transaction manager — a throw after create() inside dataSource.transaction() leaves NO result_innovation_use row behind (T-08 advisory B-4)', async () => {
    const officialCode = nextOfficialCode();
    const txResult = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, ?, ?, 0, NULL)`,
      [officialCode, platformCode, reportYear],
    );
    const txResultId = txResult.insertId;

    try {
      await expect(
        dataSource.transaction(async (manager) => {
          await harness.service.create(txResultId, manager);
          throw new Error('deliberate rollback probe — B-4');
        }),
      ).rejects.toThrow('deliberate rollback probe — B-4');

      // If create() had ignored `manager` and used its own repository
      // (bound to the pool outside this transaction), this INSERT would
      // have committed immediately and survived the rollback above. Its
      // absence is the falsifiable proof that `create()` honored the
      // passed manager.
      const [row] = await dataSource.query(
        `SELECT result_id FROM result_innovation_use WHERE result_id = ?`,
        [txResultId],
      );
      expect(row).toBeUndefined();
    } finally {
      // Defensive cleanup independent of whether the assertion above held:
      // if `create()` did NOT honor the manager, the row asserted absent
      // above would in fact survive the rollback, and deleting `results`
      // first would fail its own FK constraint
      // (`FK_result_innovation_use_result_id`). Deleting the child row
      // first makes teardown succeed either way, matching this file's own
      // `afterAll` ordering (children before parent).
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [txResultId],
      );
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        txResultId,
      ]);
    }
  });
});
