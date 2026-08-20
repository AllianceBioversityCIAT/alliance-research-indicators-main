import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { dataSource as rawTestDataSource } from '../../../src/db/config/mysql/orm.test.config';
import { GlobalUtilsModule } from '../../../src/domain/shared/utils/global-utils.module';
import { CurrentUserUtil } from '../../../src/domain/shared/utils/current-user.util';
import { ResultsUtil } from '../../../src/domain/shared/utils/results.util';
import { ResultInnovationUseModule } from '../../../src/domain/entities/result-innovation-use/result-innovation-use.module';
import { ResultInnovationUseService } from '../../../src/domain/entities/result-innovation-use/result-innovation-use.service';
import { CreateResultInnovationUseDto } from '../../../src/domain/entities/result-innovation-use/dto/create-result-innovation-use.dto';
import { ResultIpRightsModule } from '../../../src/domain/entities/result-ip-rights/result-ip-rights.module';
import { ResultIpRightsService } from '../../../src/domain/entities/result-ip-rights/result-ip-rights.service';
import { ResultsService } from '../../../src/domain/entities/results/results.service';
import { GreenCheckRepository } from '../../../src/domain/entities/green-checks/repository/green-checks.repository';
import { GreenChecksService } from '../../../src/domain/entities/green-checks/green-checks.service';
import { IndicatorsEnum } from '../../../src/domain/entities/indicators/enum/indicators.enum';
import { ActorRolesEnum } from '../../../src/domain/entities/actor-roles/enum/actor-roles.enum';
import { ContractRolesEnum } from '../../../src/domain/entities/result-contracts/enum/contract-roles.enum';
import { LeverRolesEnum } from '../../../src/domain/entities/lever-roles/enum/lever-roles.enum';
import { UserRolesEnum } from '../../../src/domain/entities/user-roles/enum/user-roles.enum';
import { EvidenceRoleEnum } from '../../../src/domain/entities/evidence-roles/enums/evidence-role.enum';
import { ClarisaGeoScopeEnum } from '../../../src/domain/tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { IntellectualPropertyOwnerEnum } from '../../../src/domain/entities/intellectual-property-owners/enum/intellectual-property-owner.enum';
import { StubCurrentUserUtil } from './nest-harness';

/**
 * T-12 (`docs/specs/innovation-use/details-api`) — **F-E**, `design.md`
 * §10.3's F-E row / §5.7. Backs R-IUA-001 AC.1/AC.2 (behavioral), R-IUA-011
 * AC.1/AC.4/AC.5 + scenario, R-IUA-012 AC.1/AC.3.
 *
 * **Route chosen: neither raw insert-only, nor a full `ResultsService`
 * Nest-DI boot.** `ResultsService` takes ~35 constructor dependencies,
 * several of which reach live external integrations (CLARISA, Agresso,
 * OpenSearch, RabbitMQ) that have nothing to do with what this fixture
 * gates. Asserting the two rows after a raw-SQL insert (the task's other
 * permitted option) would not exercise `results.service.ts` at all, so the
 * mandatory falsifications below — mutating `createResultType` /
 * `ipAvailables` — would have nothing to bite: the fixture would stay green
 * whether or not those two lines exist. Instead, this file calls the REAL,
 * unmodified `createResultType` private method directly, via a
 * `ResultsService` instance built with `Object.create(ResultsService
 * .prototype)` and only the two collaborators that method actually reads
 * (`_resultInnovationUseService`, `_resultIpRightsService` — both real,
 * DB-backed instances resolved through a genuine Nest `TestingModule`, not
 * mocks). This is the same class of technique the repo already uses to
 * reach a private/protected surface without paying for an unrelated DI
 * graph, and it means every mutation in the falsification table below is
 * mutating code this fixture actually runs.
 *
 * Likewise, `GreenChecksService.findByResultId` — the method that computes
 * `completness` (`green-checks.service.ts`) — is invoked the same way: a
 * `GreenChecksService` instance built with `Object.create(...)` and only
 * `greenCheckRepository` populated (a real `GreenCheckRepository`, itself
 * needing only a `DataSource`; its `appConfig` constructor argument is
 * never read by `calculateGreenChecks`/the code path this file exercises,
 * so it is left `undefined`). This calls the real, unmodified
 * `findByResultId` — including the real `VISUAL_ONLY_GREEN_CHECKS` Set — so
 * the third falsification below is also biting real production code.
 *
 * **The `indicators`/`indicator_types` gap, and why route (a) was taken.**
 * `calculateGreenChecks` (`green-checks.repository.ts`) reads
 * `results.indicator_id` and switches on it to decide which keys the
 * response carries. Chunk 1's `green-check-ip-rights.fixture-spec.ts` could
 * leave `indicator_id` NULL because `intellectual_property_validation`
 * itself never branches on it for a non-`INNOVATION_DEV` id. This file's
 * key-set criterion is exactly the opposite kind of claim — "the key set
 * for an indicator-2 control result is unchanged" is a claim about how the
 * key set VARIES BY indicator — so a NULL `indicator_id` would prove
 * nothing here. `indicators` and `indicator_type_id`'s parent
 * `indicator_types` were both **empty** in this scratch schema (0 rows), so
 * this file seeds both, idempotently, via `INSERT IGNORE` with the two
 * literal ids the whole spec is about (`IndicatorsEnum.INNOVATION_DEV = 2`,
 * `IndicatorsEnum.INNOVATION_USE = 6`) sharing one placeholder
 * `indicator_types` row. **Never torn down** — the established pattern in
 * this spec (T-10 did the same for `quantification_roles`, following
 * `global-setup.ts`'s own precedent for `actor_roles`/
 * `institution_type_roles` id 1).
 *
 * **A second, larger environment finding, not scoped to Innovation Use.**
 * R-IUA-011's scenario requires proving a full indicator-6 result can reach
 * `completness: true`. `completness` is the AND of every key
 * `calculateGreenChecks` returns except `pool_funding_alignment`
 * (`VISUAL_ONLY_GREEN_CHECKS`, confirmed by reading `find-green-checks.dto
 * .ts` directly — it holds exactly that one entry). That means genuinely
 * reaching `true` requires `general_information_validation`,
 * `alignment_validation`, `geo_location_validation`, `partners_validation`
 * and `evidences_validation` to ALL return true too — none of which are
 * Innovation-Use-specific. Reading each function's body at source (`SHOW
 * CREATE FUNCTION` against the running TEST container — the same
 * empirical-first approach as chunk 1's fixtures, never assumed from
 * memory) found the two cheapest predicates are outright bypasses baked
 * into the functions themselves: `geo_location_validation` returns `true`
 * immediately when `geo_scope_id IN (1, 50)`, and `partners_validation`
 * returns `true` immediately when `results.is_partner_not_applicable =
 * TRUE`. `general_information_validation` and `evidences_validation` need
 * one cheap child row each (a `result_users` contact-person row; one
 * `result_evidences` row). `alignment_validation` is the expensive one — it
 * has no bypass and requires a resolvable `portfolios` row (via
 * `get_portfolio_id_by_result`, keyed on `report_years`), a primary
 * `result_contracts` row, a primary `result_levers` row and a
 * `result_sdgs` row, each carrying its own empty-in-this-schema catalog FK
 * (`contract_roles`, `lever_roles`, `agresso_contracts`, `clarisa_levers`,
 * `clarisa_sdgs`). None of this is Innovation-Use domain data; it is
 * foundational reference data missing from the scratch baseline snapshot,
 * the same class of gap `global-setup.ts`'s own docstring names for
 * `actor_roles`/`institution_type_roles`/`reporting_platforms`/
 * `result_status`. The foundational, hard-coded-by-the-functions ids
 * (`ContractRolesEnum.ALIGNMENT = 1`, `LeverRolesEnum.ALIGNMENT = 1`,
 * `EvidenceRoleEnum.PRINCIPAL_EVIDENCE = 1`, `UserRolesEnum.MAIN_CONTACT =
 * 1`, `ClarisaGeoScopeEnum.GLOBAL = 1`, and one `portfolios` row spanning a
 * wide year range) are seeded via `INSERT IGNORE`, never torn down, exactly
 * as `indicator_types`/`indicators` are above. The individual CLARISA-sync-
 * shaped rows this fixture also needs (one `clarisa_levers`, one
 * `clarisa_sdgs`, one `clarisa_actor_types`, one `alliance_user_staff`, one
 * `agresso_contracts`) are NOT foundational — any working id satisfies the
 * functions — so they are fixture-private, seeded and torn down exactly
 * like every sibling file's private CLARISA rows.
 *
 * **Why a third result (`result3Id`).** R-IUA-011 AC.5's own wording is
 * "every section complete EXCEPT IP Rights" — so `result1Id`'s "false"
 * checkpoint must have Innovation Use details themselves already complete,
 * leaving `ip_rights` as the sole blocker. Under that arrangement, adding
 * `innovation_use` to `VISUAL_ONLY_GREEN_CHECKS` would NOT flip that
 * checkpoint (the still-blocking `ip_rights` key is untouched by the
 * mutation) — so it would not be a meaningful falsifying input for that
 * assertion. `result3Id` inverts the arrangement: every section including
 * IP Rights complete, Innovation Use details deliberately left incomplete
 * (no `result_innovation_use` row at all — the stored function handles a
 * missing row by returning `false`, verified at source, not assumed).
 * `innovation_use` is then the SOLE blocker, which is exactly the state
 * that gives the third mandated falsification (adding `innovation_use` to
 * `VISUAL_ONLY_GREEN_CHECKS`) something real to bite.
 *
 * **Band:** `900_000`-`900_900` are taken (read from every sibling
 * `*.fixture-spec.ts` header directly, FP-45/KZ-002): `900_000`
 * sp-versioning-objective-blocks, `900_100` innovation-use-validation,
 * `900_200` innovation-use-lifecycle-routines, `900_300`
 * innovation-use-detail-round-trip, `900_400` green-check-ip-rights,
 * `900_500` innovation-dev-lifecycle-routines-unchanged, `900_600`
 * innovation-dev-validation-behavioral, `900_700`
 * innovation-use-section-round-trip, `900_800` innovation-use-role-
 * isolation, `900_900` innovation-use-level-boundary. This file reserves
 * `901_000` for `results.result_official_code` and the `901_0xx` band for
 * every private catalog id below. Reserves report year **2112** and
 * platform code `T12IURC` — distinct from every reserved year/code so far
 * (2094, 2096, 2097, 2098, 2101, 2102, 2103, 2109, 2110, 2111).
 *
 * **Falsifying input (this file's own, in addition to the mandatory
 * falsification table in the task report):** remove
 * `IndicatorsEnum.INNOVATION_USE` from `ipAvailables` in
 * `results.service.ts` → no `result_ip_rights` row is created for
 * `result1Id`, and `completness` never reaches `true` even after the
 * "complete IP Rights" step, because the update silently affects zero rows.
 *
 * **FAIL-5 remediation (`validation-report.md`, 2026-08-20;
 * `docs/specs/innovation-use/details-api` R-IUA-012 AC.1).** The
 * "completness: false ... true" `it` (`result1Id`, above) discharges AC.1's
 * "a green-check read issued after a section save reflects the saved data"
 * through `ipRightsService.update` — a *different* section's save — while
 * completing Innovation Use's OWN detail row by raw SQL
 * (`UPDATE result_innovation_use ...` / `INSERT INTO result_actors ...`).
 * At the time this defect was found, `harness.innovationUseService.update()`
 * was never called anywhere in this file. Literally satisfiable (IP Rights
 * is a section too), but not R-IUA-012's own user story, which is about the
 * section the client just saved reflecting immediately — this spec's own
 * Innovation Use section. **Corrected 2026-08-20:** this sentence is no
 * longer true of the file as a whole — the FAIL-5 remediation below is
 * exactly the fix, and its own `it` (`R-IUA-012 AC.1 — a green-check read
 * issued after THIS section's own save …`) now calls
 * `harness.innovationUseService.create(result4Id)` and
 * `harness.innovationUseService.update(result4Id, …)` directly, closing the
 * gap this paragraph describes. An earlier audit round read this sentence,
 * found no code contradicting it nearby, and reported FAIL-5 as
 * unaddressed — a stale comment producing a false finding in an audit of a
 * spec whose recurring defect is stale comments.
 * **A fourth result (`result4Id`), added rather than rewriting the existing
 * arrangement** (replacing the raw SQL on `result1Id` would destabilise the
 * exact 9-key set assertion, both `completness` directions, and the
 * indicator-2 control, all of which read `result1Id`/`result2Id` at fixed
 * points in this file's sequential `it` execution) — isolated on its own
 * result so it needs no other section complete and cannot perturb any
 * existing assertion. Its own `it` drives `innovation_use_level_id` +
 * one aggregate actor row through the REAL, unmodified
 * `ResultInnovationUseService.update()` (`create()` first, mirroring
 * `ResultInnovationDevService.create`, to seed the bare detail row — no raw
 * SQL) and asserts BOTH sides of the `innovation_use` green-check
 * transition, not just the post-save value (KZ-001: a post-save-only
 * assertion cannot distinguish "the save did it" from "it was already
 * true").
 */
describe('Creating an indicator-6 result wires both child rows and makes the green-check gate genuinely reachable (T-12, F-E)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2112;
  const platformCode = 'T12IURC';
  const actingUserId = 901_020;

  // Fixture-private catalog ids (band 901_0xx) — any working id satisfies
  // the stored functions; these are not foundational the way the ids in
  // the header comment above are.
  const clarisaActorTypeCode = 901_010;
  const clarisaLeverId = 901_011; // must not be 9 — that id is special-cased
  const clarisaSdgId = 901_012;
  const staffCarnet = 'T12IURC01';
  const agreementId = 'T12IURC-CTR-01';

  let harness: {
    moduleRef: TestingModule;
    dataSource: DataSource;
    innovationUseService: ResultInnovationUseService;
    ipRightsService: ResultIpRightsService;
    close: () => Promise<void>;
  };
  let dataSource: DataSource;
  let readGreenChecks: (resultId: number) => Promise<Record<string, unknown>>;

  let result1Id: number; // indicator 6 — full creation + false/true completeness
  let result2Id: number; // indicator 2 — control, key-set-unchanged only
  let result3Id: number; // indicator 6 — everything complete EXCEPT innovation_use
  let result4Id: number; // indicator 6 — FAIL-5: isolates innovation_use's OWN save → green-check transition

  let platformSeeded = false;
  let reportYearSeeded = false;
  let actorTypeSeeded = false;
  let leverSeeded = false;
  let sdgSeeded = false;
  let staffSeeded = false;
  let contractSeeded = false;

  let nextCode = 901_000_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  /**
   * `ResultsUtil`'s only in-graph consumers are the CONTROLLERS this
   * harness never routes through (matching `nest-harness.ts`'s own
   * `StubResultsUtil`), EXCEPT `ResultIpRightsService.update()`, which
   * reads `this._resultsUtil.result.indicator_id` to decide whether the
   * OICR-only fields apply. This stub is the minimal extension that fact
   * requires.
   */
  class StubResultsUtilWithIndicator {
    constructor(private readonly indicator: IndicatorsEnum) {}
    get result(): Record<string, unknown> {
      return { indicator_id: this.indicator };
    }
    get platformCode(): string | undefined {
      return undefined;
    }
    get resultId(): number | undefined {
      return undefined;
    }
    get resultCode(): number | undefined {
      return undefined;
    }
    get statusId(): number | undefined {
      return undefined;
    }
    get indicatorId(): number | undefined {
      return this.indicator;
    }
  }

  async function createResultCreationHarness(userId: number) {
    const currentUser = new StubCurrentUserUtil(userId);
    const resultsUtil = new StubResultsUtilWithIndicator(
      IndicatorsEnum.INNOVATION_USE,
    );

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(rawTestDataSource.options),
        GlobalUtilsModule,
        ResultInnovationUseModule,
        ResultIpRightsModule,
      ],
    })
      .overrideProvider(CurrentUserUtil)
      .useValue(currentUser)
      .overrideProvider(ResultsUtil)
      .useValue(resultsUtil)
      .compile();

    await moduleRef.init();

    return {
      moduleRef,
      dataSource: moduleRef.get(DataSource),
      innovationUseService: moduleRef.get(ResultInnovationUseService),
      ipRightsService: moduleRef.get(ResultIpRightsService),
      close: async () => {
        await moduleRef.close();
      },
    };
  }

  /**
   * Calls the REAL, unmodified `ResultsService.createResultType` private
   * method — see the file header for why this is the chosen route. Only
   * the two collaborators that method reads for indicator 6 are populated;
   * every other of `ResultsService`'s ~35 constructor dependencies is
   * simply absent from the stub, which is safe because `createResultType`
   * never touches them for this indicator.
   */
  async function runCreateResultType(resultId: number): Promise<void> {
    const resultsServiceStub: Record<string, unknown> = Object.create(
      ResultsService.prototype,
    );
    resultsServiceStub._resultInnovationUseService =
      harness.innovationUseService;
    resultsServiceStub._resultIpRightsService = harness.ipRightsService;

    await (
      resultsServiceStub as unknown as {
        createResultType: (
          id: number,
          indicator: IndicatorsEnum,
        ) => Promise<void>;
      }
    ).createResultType(resultId, IndicatorsEnum.INNOVATION_USE);
  }

  /**
   * Calls the REAL, unmodified `GreenChecksService.findByResultId` — see
   * the file header. Only `greenCheckRepository` is populated; every other
   * constructor dependency (RabbitMQ, templating, OICR, `ResultsUtil`) is
   * absent, which is safe because `findByResultId` never touches them.
   */
  function buildGreenChecksReader(
    ds: DataSource,
  ): (resultId: number) => Promise<Record<string, unknown>> {
    const repository = new GreenCheckRepository(ds, undefined as never);
    const serviceStub: Record<string, unknown> = Object.create(
      GreenChecksService.prototype,
    );
    serviceStub.greenCheckRepository = repository;

    return (resultId: number) =>
      (
        serviceStub as unknown as {
          findByResultId: (id: number) => Promise<Record<string, unknown>>;
        }
      ).findByResultId(resultId);
  }

  /**
   * Seeds the non-Innovation-Use sections a result needs to make
   * `general_information`, `alignment`, `geo_location`, `partners` and
   * `evidences` all resolve true — see the file header for why each one is
   * needed and how it was verified at source. Shared by `result1Id` and
   * `result3Id`.
   */
  async function seedCompletableSections(resultId: number): Promise<void> {
    await dataSource.query(
      `INSERT INTO result_users (result_id, user_role_id, user_id, is_active) VALUES (?, ?, ?, 1)`,
      [resultId, UserRolesEnum.MAIN_CONTACT, staffCarnet],
    );
    await dataSource.query(
      `INSERT INTO result_evidences (result_id, evidence_role_id, evidence_url, evidence_description, is_active) VALUES (?, ?, ?, ?, 1)`,
      [
        resultId,
        EvidenceRoleEnum.PRINCIPAL_EVIDENCE,
        'https://example.org/fixture-evidence',
        'Fixture evidence description',
      ],
    );
    await dataSource.query(
      `INSERT INTO result_contracts (result_id, contract_role_id, contract_id, is_primary, is_active) VALUES (?, ?, ?, 1, 1)`,
      [resultId, ContractRolesEnum.ALIGNMENT, agreementId],
    );
    await dataSource.query(
      `INSERT INTO result_levers (result_id, lever_role_id, lever_id, is_primary, is_active) VALUES (?, ?, ?, 1, 1)`,
      [resultId, LeverRolesEnum.ALIGNMENT, clarisaLeverId],
    );
    await dataSource.query(
      `INSERT INTO result_sdgs (result_id, clarisa_sdg_id, is_active) VALUES (?, ?, 1)`,
      [resultId, clarisaSdgId],
    );
  }

  beforeAll(async () => {
    harness = await createResultCreationHarness(actingUserId);
    dataSource = harness.dataSource;
    readGreenChecks = buildGreenChecksReader(dataSource);

    // --- Foundational catalog top-ups (INSERT IGNORE, NEVER torn down) ---
    // `indicator_types` / `indicators`: see file header.
    await dataSource.query(
      `INSERT IGNORE INTO indicator_types (indicator_type_id, name) VALUES (1, 'Fixture indicator type')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO indicators (indicator_id, name, indicator_type_id) VALUES (?, 'Innovation Development', 1), (?, 'Innovation Use', 1)`,
      [IndicatorsEnum.INNOVATION_DEV, IndicatorsEnum.INNOVATION_USE],
    );
    // The five non-Innovation-Use green-check sections: see file header.
    await dataSource.query(
      `INSERT IGNORE INTO contract_roles (contract_role_id, name) VALUES (?, 'alignment')`,
      [ContractRolesEnum.ALIGNMENT],
    );
    await dataSource.query(
      `INSERT IGNORE INTO lever_roles (lever_role_id, name) VALUES (?, 'alignment')`,
      [LeverRolesEnum.ALIGNMENT],
    );
    await dataSource.query(
      `INSERT IGNORE INTO evidence_roles (evidence_role_id, name) VALUES (?, 'principal-evidence')`,
      [EvidenceRoleEnum.PRINCIPAL_EVIDENCE],
    );
    await dataSource.query(
      `INSERT IGNORE INTO user_roles (user_role_id, name) VALUES (?, 'main-contact')`,
      [UserRolesEnum.MAIN_CONTACT],
    );
    await dataSource.query(
      `INSERT IGNORE INTO clarisa_geo_scope (code, name) VALUES (?, 'Global')`,
      [ClarisaGeoScopeEnum.GLOBAL],
    );
    await dataSource.query(
      `INSERT IGNORE INTO intellectual_property_owner (intellectual_property_owner_id, name) VALUES (?, 'Intellectual CTA')`,
      [IntellectualPropertyOwnerEnum.INTELLECTUAL_CTA],
    );
    // Wide range so any fixture's report year resolves a portfolio.
    await dataSource.query(
      `INSERT IGNORE INTO portfolios (id, name, description, start_year, end_year) VALUES (1, 'Fixture portfolio', 'Seeded so alignment_validation can resolve a portfolio for any fixture report year', 2000, 2200)`,
    );

    // --- Fixture-private rows (own band, checked, deleted in afterAll) ---
    const [existingActorType] = await dataSource.query(
      `SELECT code FROM clarisa_actor_types WHERE code = ?`,
      [clarisaActorTypeCode],
    );
    if (!existingActorType) {
      await dataSource.query(
        `INSERT INTO clarisa_actor_types (code, name) VALUES (?, 'T-12 F-E fixture actor type')`,
        [clarisaActorTypeCode],
      );
      actorTypeSeeded = true;
    }

    const [existingLever] = await dataSource.query(
      `SELECT id FROM clarisa_levers WHERE id = ?`,
      [clarisaLeverId],
    );
    if (!existingLever) {
      await dataSource.query(
        `INSERT INTO clarisa_levers (id, short_name, full_name) VALUES (?, 'T12FE', 'T-12 F-E fixture lever')`,
        [clarisaLeverId],
      );
      leverSeeded = true;
    }

    const [existingSdg] = await dataSource.query(
      `SELECT id FROM clarisa_sdgs WHERE id = ?`,
      [clarisaSdgId],
    );
    if (!existingSdg) {
      await dataSource.query(
        `INSERT INTO clarisa_sdgs (id, short_name) VALUES (?, 'T-12 F-E fixture SDG')`,
        [clarisaSdgId],
      );
      sdgSeeded = true;
    }

    const [existingStaff] = await dataSource.query(
      `SELECT carnet FROM alliance_user_staff WHERE carnet = ?`,
      [staffCarnet],
    );
    if (!existingStaff) {
      await dataSource.query(
        `INSERT INTO alliance_user_staff (carnet, first_name, last_name) VALUES (?, 'Fixture', 'Contact')`,
        [staffCarnet],
      );
      staffSeeded = true;
    }

    const [existingContract] = await dataSource.query(
      `SELECT agreement_id FROM agresso_contracts WHERE agreement_id = ?`,
      [agreementId],
    );
    if (!existingContract) {
      await dataSource.query(
        `INSERT INTO agresso_contracts (agreement_id) VALUES (?)`,
        [agreementId],
      );
      contractSeeded = true;
    }

    // --- Own platform code / report year (private, torn down) ---
    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [platformCode],
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, 'T-12 F-E fixture platform')`,
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

    // --- result1Id: indicator 6, general_information/geo_location/partners
    // baked in at insert time (title/description/geo_scope_id/
    // is_partner_not_applicable). ---
    result1Id = (
      await dataSource.query(
        `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id, indicator_id, title, description, geo_scope_id, is_partner_not_applicable)
         VALUES (1, ?, ?, ?, 0, NULL, ?, 'T-12 F-E fixture result', 'A fully seeded indicator-6 result proving green-check reachability.', ?, 1)`,
        [
          nextOfficialCode(),
          platformCode,
          reportYear,
          IndicatorsEnum.INNOVATION_USE,
          ClarisaGeoScopeEnum.GLOBAL,
        ],
      )
    ).insertId;

    // --- result2Id: indicator 2 control — key-set-unchanged only, no
    // completeness seeding needed. ---
    result2Id = (
      await dataSource.query(
        `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id, indicator_id)
         VALUES (1, ?, ?, ?, 0, NULL, ?)`,
        [
          nextOfficialCode(),
          platformCode,
          reportYear,
          IndicatorsEnum.INNOVATION_DEV,
        ],
      )
    ).insertId;

    // --- result3Id: indicator 6, everything EXCEPT Innovation Use details
    // complete (see file header — this is what gives the
    // `VISUAL_ONLY_GREEN_CHECKS` falsification something real to bite). ---
    result3Id = (
      await dataSource.query(
        `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id, indicator_id, title, description, geo_scope_id, is_partner_not_applicable)
         VALUES (1, ?, ?, ?, 0, NULL, ?, 'T-12 F-E fixture result (innovation_use left incomplete)', 'Proves innovation_use itself blocks completness.', ?, 1)`,
        [
          nextOfficialCode(),
          platformCode,
          reportYear,
          IndicatorsEnum.INNOVATION_USE,
          ClarisaGeoScopeEnum.GLOBAL,
        ],
      )
    ).insertId;

    // --- result4Id: indicator 6, FAIL-5 — deliberately minimal. Only
    // `innovation_use` itself is exercised here (via the real
    // `ResultInnovationUseService.update()`, see the file header), so none
    // of `seedCompletableSections`'s other-section rows are needed — the
    // new `it` below never reads `completness` for this result. ---
    result4Id = (
      await dataSource.query(
        `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id, indicator_id)
         VALUES (1, ?, ?, ?, 0, NULL, ?)`,
        [
          nextOfficialCode(),
          platformCode,
          reportYear,
          IndicatorsEnum.INNOVATION_USE,
        ],
      )
    ).insertId;

    await seedCompletableSections(result1Id);
    await seedCompletableSections(result3Id);

    // result3: IP Rights complete directly (raw SQL — this result exists
    // only to isolate the innovation_use key, not to re-prove the creation
    // path, which result1Id already does). No result_innovation_use row at
    // all — `innovation_use_validation` handles the missing row by
    // returning false (verified at source, see file header).
    await dataSource.query(
      `INSERT INTO result_ip_rights (result_ip_rights_id, asset_ip_owner_id, publicity_restriction, requires_futher_development) VALUES (?, ?, 0, 0)`,
      [result3Id, IntellectualPropertyOwnerEnum.INTELLECTUAL_CTA],
    );
  });

  afterAll(async () => {
    if (!harness) {
      return;
    }

    await dataSource.query(
      `DELETE FROM result_actors WHERE result_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );
    await dataSource.query(
      `DELETE FROM result_evidences WHERE result_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );
    await dataSource.query(
      `DELETE FROM result_contracts WHERE result_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );
    await dataSource.query(
      `DELETE FROM result_levers WHERE result_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );
    await dataSource.query(
      `DELETE FROM result_sdgs WHERE result_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );
    await dataSource.query(
      `DELETE FROM result_users WHERE result_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );
    await dataSource.query(
      `DELETE FROM result_innovation_use WHERE result_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );
    await dataSource.query(
      `DELETE FROM result_ip_rights WHERE result_ip_rights_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );
    await dataSource.query(
      `DELETE FROM results WHERE result_id IN (?, ?, ?, ?)`,
      [result1Id, result2Id, result3Id, result4Id],
    );

    if (contractSeeded) {
      await dataSource.query(
        `DELETE FROM agresso_contracts WHERE agreement_id = ?`,
        [agreementId],
      );
    }
    if (staffSeeded) {
      await dataSource.query(
        `DELETE FROM alliance_user_staff WHERE carnet = ?`,
        [staffCarnet],
      );
    }
    if (sdgSeeded) {
      await dataSource.query(`DELETE FROM clarisa_sdgs WHERE id = ?`, [
        clarisaSdgId,
      ]);
    }
    if (leverSeeded) {
      await dataSource.query(`DELETE FROM clarisa_levers WHERE id = ?`, [
        clarisaLeverId,
      ]);
    }
    if (actorTypeSeeded) {
      await dataSource.query(`DELETE FROM clarisa_actor_types WHERE code = ?`, [
        clarisaActorTypeCode,
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

  it('creates exactly one active result_innovation_use row (created_by = the acting user) and exactly one active result_ip_rights row', async () => {
    await runCreateResultType(result1Id);

    const innovationUseRows = await dataSource.query(
      `SELECT created_by, is_active FROM result_innovation_use WHERE result_id = ? AND is_active = TRUE`,
      [result1Id],
    );
    expect(innovationUseRows).toHaveLength(1);
    expect(Number(innovationUseRows[0].created_by)).toBe(actingUserId);

    const ipRightsRows = await dataSource.query(
      `SELECT result_ip_rights_id FROM result_ip_rights WHERE result_ip_rights_id = ? AND is_active = TRUE`,
      [result1Id],
    );
    expect(ipRightsRows).toHaveLength(1);
  });

  it('exposes an innovation_use key for the indicator-6 result and leaves the indicator-2 control key set unchanged', async () => {
    const greenChecksIndicator6 = await readGreenChecks(result1Id);
    const greenChecksIndicator2 = await readGreenChecks(result2Id);

    expect(Object.keys(greenChecksIndicator6).sort()).toEqual(
      [
        'general_information',
        'alignment',
        'geo_location',
        'partners',
        'evidences',
        'pool_funding_alignment',
        'innovation_use',
        'ip_rights',
        'completness',
      ].sort(),
    );

    expect(Object.keys(greenChecksIndicator2).sort()).toEqual(
      [
        'general_information',
        'alignment',
        'geo_location',
        'partners',
        'evidences',
        'pool_funding_alignment',
        'innovation_dev',
        'ip_rights',
        'completness',
      ].sort(),
    );
    expect(greenChecksIndicator2).not.toHaveProperty('innovation_use');
  });

  it('is completness: false with everything complete except IP Rights, then completness: true once IP Rights is completed too — the read reflects the save', async () => {
    // Complete Innovation Use details themselves: a low use level (no
    // justification required below level 6) plus one aggregate-mode actor
    // row, matching innovation_use_validation's requirements verified at
    // source in the file header.
    await dataSource.query(
      `UPDATE result_innovation_use SET innovation_use_level_id = 1 WHERE result_id = ?`,
      [result1Id],
    );
    await dataSource.query(
      `INSERT INTO result_actors (result_id, actor_role_id, actor_type_id, sex_age_disaggregation_not_apply, actors_count, is_active) VALUES (?, ?, ?, 1, 5, 1)`,
      [result1Id, ActorRolesEnum.INNOVATION_USE, clarisaActorTypeCode],
    );

    const beforeIpRights = await readGreenChecks(result1Id);
    expect(beforeIpRights.innovation_use).toBeTruthy();
    expect(beforeIpRights.ip_rights).toBeFalsy();
    expect(beforeIpRights.completness).toBeFalsy();

    // The section save (R-IUA-012 AC.1's "after a section save").
    await harness.ipRightsService.update(result1Id, {
      asset_ip_owner: IntellectualPropertyOwnerEnum.INTELLECTUAL_CTA,
      publicity_restriction: false,
      requires_futher_development: false,
    });

    const afterIpRights = await readGreenChecks(result1Id);
    expect(afterIpRights.ip_rights).toBeTruthy();
    expect(afterIpRights.completness).toBeTruthy();
  });

  it('is completness: false when Innovation Use details themselves are the sole incomplete section (everything else, including IP Rights, complete)', async () => {
    const greenChecks = await readGreenChecks(result3Id);

    expect(greenChecks.general_information).toBeTruthy();
    expect(greenChecks.alignment).toBeTruthy();
    expect(greenChecks.geo_location).toBeTruthy();
    expect(greenChecks.partners).toBeTruthy();
    expect(greenChecks.evidences).toBeTruthy();
    expect(greenChecks.ip_rights).toBeTruthy();
    expect(greenChecks.innovation_use).toBeFalsy();
    expect(greenChecks.completness).toBeFalsy();
  });

  it("R-IUA-012 AC.1 — a green-check read issued after THIS section's own save (ResultInnovationUseService.update, not IP Rights) reflects the saved data: innovation_use flips false -> true across the save", async () => {
    // Arrange — the bare detail row, via the real service's own `create()`
    // (mirrors `ResultInnovationDevService.create`; no raw SQL). No level,
    // no actors yet: `innovation_use_validation` requires
    // `innovation_use_level_id IS NOT NULL` (commonFields) and at least one
    // actor row (`tempFullActors > 0`), so this state is `false`.
    await harness.innovationUseService.create(result4Id);

    const before = await readGreenChecks(result4Id);
    expect(before.innovation_use).toBeFalsy();

    // Act — THE section's own save. Level 1 (below 6, no justification
    // required) plus one aggregate-mode actor row, the same minimal
    // `innovation_use_validation`-satisfying shape the pre-existing
    // (result1Id) arrangement seeds by raw SQL — here seeded through the
    // real, unmodified `ResultInnovationUseService.update()` instead.
    await harness.innovationUseService.update(result4Id, {
      innovation_use_level_id: 1,
      actors: [
        {
          actor_type_id: clarisaActorTypeCode,
          sex_age_disaggregation_not_apply: true,
          actors_count: 5,
        },
      ],
    } as CreateResultInnovationUseDto);

    const after = await readGreenChecks(result4Id);

    // Both sides of the transition (KZ-001) — a post-save-only assertion
    // cannot distinguish "the save did it" from "it was already true".
    expect(before.innovation_use).toBeFalsy();
    expect(after.innovation_use).toBeTruthy();

    // A SECOND, independent signal that THIS call is what produced the
    // state — not merely "the same data arrived by some means". Raw SQL
    // setting `innovation_use_level_id` and inserting the actor row (the
    // arrangement FAIL-5 flags, and what `result1Id`'s pre-existing `it`
    // above still does) reaches the identical `innovation_use_validation`
    // TRUE state without ever touching `updated_by` —
    // `innovation_use_validation` reads only the detail/actor columns, not
    // audit columns, so the green-check transition alone cannot tell "went
    // through `ResultInnovationUseService.update()`" apart from "the same
    // columns got the same values by raw SQL". `update()`'s step 6 writes
    // `...this._currentUser.audit(SetAuditEnum.UPDATE)` into the SAME
    // statement that sets `innovation_use_level_id` (R-IUA-013 AC.7) — a
    // raw-SQL revert of the Act step above never sets this column, so this
    // assertion is what actually reddens under that mutation.
    const [detailRow] = await dataSource.query(
      `SELECT updated_by FROM result_innovation_use WHERE result_id = ? AND is_active = TRUE`,
      [result4Id],
    );
    expect(Number(detailRow.updated_by)).toBe(actingUserId);
  });
});
