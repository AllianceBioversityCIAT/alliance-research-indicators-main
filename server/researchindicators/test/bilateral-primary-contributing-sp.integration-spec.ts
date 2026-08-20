import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BilateralService } from '../src/domain/entities/bilateral/bilateral.service';
import { ResultRepository } from '../src/domain/entities/results/repositories/result.repository';
import { ResultPoolFundingAlignmentRepository } from '../src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingIndicatorMappingRepository } from '../src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository';
import { ResultPoolFundingTocAlignmentRepository } from '../src/domain/entities/bilateral/repositories/result-pool-funding-toc-alignment.repository';
import { ServerGateway } from '../src/domain/tools/socket/server.gateway';
import { CapacitySharingBilateralIndicatorTypeHandler } from '../src/domain/entities/bilateral/handlers/capacity-sharing.handler';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from '../src/domain/entities/bilateral/handlers/innovation-development.handler';
import { KnowledgeProductBilateralIndicatorTypeHandler } from '../src/domain/entities/bilateral/handlers/knowledge-product.handler';
import { NoopBilateralIndicatorTypeHandler } from '../src/domain/entities/bilateral/handlers/noop.handler';
import { PolicyChangeBilateralIndicatorTypeHandler } from '../src/domain/entities/bilateral/handlers/policy-change.handler';
import { ClarisaScienceProgramsService } from '../src/domain/tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.service';
import { ClarisaProjectsService } from '../src/domain/tools/clarisa/projects/clarisa-projects.service';
import { ClarisaCgiarEntitiesService } from '../src/domain/tools/clarisa/cgiar-entities/clarisa-cgiar-entities.service';
import { PrmsTocService } from '../src/domain/tools/prms-toc/prms-toc.service';
import { TocIntegrationService } from '../src/domain/tools/toc-integration/toc-integration.service';
import { BilateralProjectMappingService } from '../src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service';
import { User } from '../src/domain/complementary-entities/secondary/user/user.entity';
import { UpdatePoolFundingAlignmentDto } from '../src/domain/entities/bilateral/dto/update-pool-funding-alignment.dto';
import { BilateralScienceProgramsResponse } from '../src/domain/entities/bilateral/dto/bilateral-science-programs.response.dto';
import {
  createT13DataSource,
  resolveT13Config,
} from './support/t13-data-source';
import {
  resetAndBuildT13Schema,
  dropT13Schema,
  SchemaProvenance,
} from './support/t13-schema';

// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-13
//
// Integration test: PATCH -> read-back round-trip against a REAL MySQL
// schema (R-BIL-121 AC.3/AC.4 automated DB half, R-BIL-123 AC.2, R-BIL-126
// AC.2/AC.3, defect class D-6 partial). See tasks.md T-13.
//
// DISQUALIFICATION GUARD: this suite connects to a real MySQL container
// (see test/support/t13-data-source.ts) and the schema is built exclusively
// by invoking real migration classes' up(queryRunner) — never
// `synchronize: true`. If this datasource cannot connect, every test in
// this file fails loudly at `beforeAll` rather than silently no-op'ing —
// there is no in-memory or mock fallback anywhere in this file.
//
// Scope boundary (task instruction, F-7): this is NOT an HTTP e2e test. No
// AppModule, no auth/JWT, no controller. It wires the real DataSource + the
// real ResultPoolFundingAlignmentRepository directly into a real
// BilateralService instance (same construction pattern as
// bilateral.service.spec.ts), with only the CLARISA/PRMS/socket/handler
// dependencies mocked — none of those are part of what T-13 verifies.
//
// D-6 STATED LIMITATION (verbatim from design.md §9 / tasks.md T-13):
// "an integration test exercises service + repository and does not execute
// the client. D-6 (cross-tier role drift) therefore stays only partially
// gated: both sides of the contract are asserted independently, never in
// one run." This suite does not, and cannot, close that gap — it must not
// be read downstream as full cross-tier coverage.
describe('T-13 — Bilateral primary/contributing SP: PATCH -> read-back integration', () => {
  let dataSource: DataSource;
  let provenance: SchemaProvenance;

  beforeAll(async () => {
    dataSource = createT13DataSource();
    await dataSource.initialize();
    provenance = await resetAndBuildT13Schema(dataSource);
    console.log(
      `[T-13] schema built via route (b): real migration classes' up(). ` +
        `MySQL engine: ${provenance.engineVersion}. ` +
        `generation_expression: ${provenance.generationExpression}`,
    );
  }, 60000);

  afterAll(async () => {
    await dropT13Schema(dataSource);
    await dataSource.destroy();
  });

  // ---------------------------------------------------------------------
  // Schema provenance — "the migration ran" as a queried fact, not a claim.
  // ---------------------------------------------------------------------
  describe('schema provenance', () => {
    it('was connected using the T13_MYSQL_* config, never ARI_MYSQL_* / ARI_TEST_MYSQL_*', () => {
      const config = resolveT13Config();
      expect(config.host).not.toBe(process.env.ARI_MYSQL_HOST);
      expect(config.host).not.toBe(process.env.ARI_TEST_MYSQL_HOST);
    });

    it("active_primary_alignment carries the T-02 migration's exact expression", async () => {
      const rows = (await dataSource.query(
        `SELECT GENERATION_EXPRESSION AS expr, IS_NULLABLE AS nullable
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'result_pool_funding_alignment_sp'
           AND column_name = 'active_primary_alignment'`,
      )) as { expr: string; nullable: string }[];

      expect(rows).toHaveLength(1);
      const expr = rows[0].expr;

      // Value is keyed on alignment_id alone — the design.md §3.1 trap this
      // check exists to catch is an expression that also folds sp_role (or
      // sp_code) into the VALUE (e.g. via CONCAT), which would make the
      // column non-NULL for CONTRIBUTING rows too.
      expect(expr).toMatch(/is_active`?\s*=\s*1/);
      expect(expr.toLowerCase()).toMatch(
        /sp_role`?\s*=\s*_?utf8mb4?\\?'primary\\?'/,
      );
      expect(expr).toMatch(/,\s*`?alignment_id`?\s*,\s*null\)/i);
      expect(expr.toLowerCase()).not.toContain('concat');

      const indexRows = (await dataSource.query(
        `SELECT NON_UNIQUE FROM information_schema.statistics
         WHERE table_schema = DATABASE()
           AND table_name = 'result_pool_funding_alignment_sp'
           AND index_name = 'idx_rpfas_active_primary'`,
      )) as { NON_UNIQUE: number }[];
      expect(indexRows).toHaveLength(1);
      expect(Number(indexRows[0].NON_UNIQUE)).toBe(0); // 0 = UNIQUE
    });
  });

  // ---------------------------------------------------------------------
  // DB-invariant probes — automated versions of the Leader's manual probes.
  // Inserted directly against the real table, independent of the service,
  // so the UNIQUE index is proven by a real insert (per task instructions).
  // ---------------------------------------------------------------------
  describe('DB-invariant probes (idx_rpfas_active_primary)', () => {
    async function seedResultStub(resultId: number): Promise<void> {
      await dataSource.query('INSERT INTO `results` (`result_id`) VALUES (?)', [
        resultId,
      ]);
    }

    async function createAlignmentRow(resultId: number): Promise<number> {
      await dataSource.query(
        'INSERT INTO `result_pool_funding_alignment` (`result_id`, `has_contribution`) VALUES (?, 1)',
        [resultId],
      );
      const rows = (await dataSource.query(
        'SELECT id FROM `result_pool_funding_alignment` WHERE result_id = ? AND is_active = 1',
        [resultId],
      )) as { id: number }[];
      return Number(rows[0].id);
    }

    async function seedAlignment(resultId: number): Promise<number> {
      await seedResultStub(resultId);
      return createAlignmentRow(resultId);
    }

    async function insertSpRow(
      alignmentId: number,
      spCode: string,
      role: 'PRIMARY' | 'CONTRIBUTING' | null,
      isActive = true,
    ): Promise<unknown> {
      return dataSource.query(
        'INSERT INTO `result_pool_funding_alignment_sp` (`alignment_id`, `sp_code`, `sp_role`, `is_active`) VALUES (?, ?, ?, ?)',
        [alignmentId, spCode, role, isActive ? 1 : 0],
      );
    }

    it('R-BIL-121 AC.3 — a second active PRIMARY row for the same alignment is rejected (ER_DUP_ENTRY)', async () => {
      const alignmentId = await seedAlignment(900101);
      await insertSpRow(alignmentId, 'SP01', 'PRIMARY', true);

      await expect(
        insertSpRow(alignmentId, 'SP02', 'PRIMARY', true),
      ).rejects.toMatchObject({
        driverError: expect.objectContaining({ code: 'ER_DUP_ENTRY' }),
      });
    });

    it('R-BIL-121 AC.3 (converse) — any number of active CONTRIBUTING rows are permitted on the same alignment', async () => {
      const alignmentId = await seedAlignment(900102);
      await insertSpRow(alignmentId, 'SP01', 'PRIMARY', true);
      await insertSpRow(alignmentId, 'SP02', 'CONTRIBUTING', true);
      await insertSpRow(alignmentId, 'SP03', 'CONTRIBUTING', true);
      await insertSpRow(alignmentId, 'SP04', 'CONTRIBUTING', true);

      const rows = (await dataSource.query(
        'SELECT sp_code, sp_role FROM `result_pool_funding_alignment_sp` WHERE alignment_id = ? AND is_active = 1 ORDER BY sp_code',
        [alignmentId],
      )) as { sp_code: string; sp_role: string }[];

      expect(rows).toEqual([
        { sp_code: 'SP01', sp_role: 'PRIMARY' },
        { sp_code: 'SP02', sp_role: 'CONTRIBUTING' },
        { sp_code: 'SP03', sp_role: 'CONTRIBUTING' },
        { sp_code: 'SP04', sp_role: 'CONTRIBUTING' },
      ]);
    });

    it('R-BIL-121 AC.4 — deactivating the active PRIMARY then inserting a new one is accepted (re-save)', async () => {
      const alignmentId = await seedAlignment(900103);
      await insertSpRow(alignmentId, 'SP01', 'PRIMARY', true);

      await dataSource.query(
        'UPDATE `result_pool_funding_alignment_sp` SET is_active = 0 WHERE alignment_id = ? AND sp_code = ?',
        [alignmentId, 'SP01'],
      );

      await expect(
        insertSpRow(alignmentId, 'SP05', 'PRIMARY', true),
      ).resolves.toBeDefined();

      // And it can be re-saved a SECOND time — "any number of times" per AC.4.
      await dataSource.query(
        'UPDATE `result_pool_funding_alignment_sp` SET is_active = 0 WHERE alignment_id = ? AND sp_code = ?',
        [alignmentId, 'SP05'],
      );
      await expect(
        insertSpRow(alignmentId, 'SP01', 'PRIMARY', true),
      ).resolves.toBeDefined();

      const activeRows = (await dataSource.query(
        'SELECT sp_code FROM `result_pool_funding_alignment_sp` WHERE alignment_id = ? AND is_active = 1 AND sp_role = ?',
        [alignmentId, 'PRIMARY'],
      )) as { sp_code: string }[];
      expect(activeRows).toEqual([{ sp_code: 'SP01' }]);
    });

    // Not in tasks.md's list — added per the Leader's instruction: this is
    // the assertion that proves the index is scoped PER ALIGNMENT, not
    // globally. Without it, the first three probes would be equally
    // consistent with an (accidentally) global unique index.
    it('cross-alignment independence — an active PRIMARY on one alignment does not block an active PRIMARY on a different alignment', async () => {
      const alignmentA = await seedAlignment(900104);
      const alignmentB = await seedAlignment(900105);

      await insertSpRow(alignmentA, 'SP01', 'PRIMARY', true);

      await expect(
        insertSpRow(alignmentB, 'SP01', 'PRIMARY', true),
      ).resolves.toBeDefined();
    });
  });

  // ---------------------------------------------------------------------
  // PATCH -> read-back round trip through the REAL BilateralService.
  // Only CLARISA/PRMS/socket/handler dependencies are mocked — the
  // DataSource and ResultPoolFundingAlignmentRepository are real, so
  // updateAlignment's transaction commits for real and getAlignment reads
  // back for real.
  // ---------------------------------------------------------------------
  describe('PATCH -> read-back round trip (real BilateralService, real schema)', () => {
    let service: BilateralService;
    const findContext = jest.fn();
    const findActiveTocRows = jest.fn().mockResolvedValue([]);
    const upsertForSp = jest.fn();
    const deactivateForSps = jest.fn();
    const emit = jest.fn();
    const findAllCatalog = jest.fn();

    const user: User = { sec_user_id: 4242 } as User;
    const RESULT_ID = 900001;
    const RESULT_CODE = 'STAR-900001';
    const RESAVE_RESULT_ID = 900003;
    const RESAVE_RESULT_CODE = 'STAR-900003';

    const baseContext = {
      result_id: RESULT_ID,
      result_official_code: RESULT_CODE,
      result_status_id: 1,
      version_id: 10,
      report_year_id: 2026,
      is_synced_to_prms: false,
      platform_code: 'STAR',
      indicator_id: 1,
      agresso_agreement_id: 'D999',
      is_pool_funding_contributor: true,
    };

    const catalog = [
      {
        official_code: 'SP06',
        name: 'SP06 name',
        category: 'cat',
        color: null,
        icon_key: null,
      },
      {
        official_code: 'SP09',
        name: 'SP09 name',
        category: 'cat',
        color: null,
        icon_key: null,
      },
    ];

    const mappedSpResponse = (
      codes: string[],
    ): BilateralScienceProgramsResponse => ({
      result_code: RESULT_CODE,
      mapping_status: 'mapped',
      clarisa_project: { id: 1, short_name: 'T13-project' },
      science_programs: codes.map((code) => ({
        code,
        name: `name-${code}`,
        category: 'cat',
        color: null,
        icon_key: null,
        allocation: 50,
      })),
    });

    beforeAll(async () => {
      await dataSource.query(
        'INSERT INTO `results` (`result_id`) VALUES (?), (?)',
        [RESULT_ID, RESAVE_RESULT_ID],
      );
      findContext.mockResolvedValue(baseContext);
      findAllCatalog.mockResolvedValue(catalog);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BilateralService,
          { provide: DataSource, useValue: dataSource },
          {
            provide: ResultRepository,
            useValue: { findPoolFundingAlignmentContext: findContext },
          },
          {
            provide: ResultPoolFundingAlignmentRepository,
            useValue: new ResultPoolFundingAlignmentRepository(dataSource),
          },
          {
            provide: ResultPoolFundingIndicatorMappingRepository,
            useValue: {},
          },
          {
            provide: ResultPoolFundingTocAlignmentRepository,
            useValue: {
              findActiveByResultId: findActiveTocRows,
              upsertForSp,
              deactivateForSps,
            },
          },
          {
            provide: ServerGateway,
            useValue: { emitPoolFundingAlignmentChanged: emit },
          },
          {
            provide: CapacitySharingBilateralIndicatorTypeHandler,
            useValue: {},
          },
          {
            provide: InnovationDevelopmentBilateralIndicatorTypeHandler,
            useValue: {},
          },
          {
            provide: KnowledgeProductBilateralIndicatorTypeHandler,
            useValue: {},
          },
          { provide: NoopBilateralIndicatorTypeHandler, useValue: {} },
          { provide: PolicyChangeBilateralIndicatorTypeHandler, useValue: {} },
          {
            provide: ClarisaScienceProgramsService,
            useValue: { findAll: findAllCatalog },
          },
          { provide: ClarisaProjectsService, useValue: {} },
          { provide: ClarisaCgiarEntitiesService, useValue: {} },
          { provide: PrmsTocService, useValue: {} },
          { provide: TocIntegrationService, useValue: {} },
          { provide: BilateralProjectMappingService, useValue: {} },
        ],
      }).compile();

      service = module.get(BilateralService);

      // Bypasses the CLARISA project chain (agresso -> bilateral_project_mapping
      // -> CLARISA project) — out of T-13's scope (harness construction for an
      // unrelated integration). getScienceProgramsForResult is public and this
      // is the same interception pattern bilateral.service.normalizeLeverCodes
      // .spec.ts already uses.
      jest
        .spyOn(service, 'getScienceProgramsForResult')
        .mockResolvedValue(mappedSpResponse(['SP06', 'SP09']));
    });

    afterAll(() => jest.restoreAllMocks());

    it('round trip: PATCH with primary_sp_code persists both roles for real, and the response reports them', async () => {
      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06', 'SP09'],
        primary_sp_code: 'SP06',
      };

      const patchResponse = await service.updateAlignment(
        RESULT_ID,
        RESULT_CODE,
        dto,
        user,
      );

      expect(
        patchResponse.selected_science_programs.map((sp) => ({
          code: sp.code,
          role: sp.role,
        })),
      ).toEqual([
        { code: 'SP06', role: 'PRIMARY' },
        { code: 'SP09', role: 'CONTRIBUTING' },
      ]);

      // Real DB assertion — independent of the service's returned shape,
      // queried directly against the table the migration altered.
      const rows = (await dataSource.query(
        `SELECT rpfas.sp_code, rpfas.sp_role
         FROM result_pool_funding_alignment_sp rpfas
         JOIN result_pool_funding_alignment rpfa ON rpfa.id = rpfas.alignment_id
         WHERE rpfa.result_id = ? AND rpfa.is_active = 1 AND rpfas.is_active = 1
         ORDER BY rpfas.sp_code`,
        [RESULT_ID],
      )) as { sp_code: string; sp_role: string }[];

      expect(rows).toEqual([
        { sp_code: 'SP06', sp_role: 'PRIMARY' },
        { sp_code: 'SP09', sp_role: 'CONTRIBUTING' },
      ]);

      // --- Seam 1 (T-08 review advisory, execution.md:2319) -------------
      // updateAlignment builds its response via an internal call to
      // getAlignment AFTER the real transaction commits (this DataSource is
      // real, so `await this.dataSource.transaction(...)` really does not
      // resolve until commit — this crosses the transaction boundary for
      // real, which a mocked-manager unit test structurally cannot do).
      // The closure the advisory asked for: a SUBSEQUENT, INDEPENDENT call
      // to getAlignment with the same (resultId, resultCode, user) must
      // agree with what PATCH already returned.
      const independentGet = await service.getAlignment(
        RESULT_ID,
        RESULT_CODE,
        user,
      );
      expect(independentGet).toEqual(patchResponse);
    });

    it('re-save: promoting a different Primary is accepted by the same alignment (R-BIL-121 AC.4, service level)', async () => {
      findContext.mockResolvedValue({
        ...baseContext,
        result_id: RESAVE_RESULT_ID,
        result_official_code: RESAVE_RESULT_CODE,
      });

      const firstSave: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06', 'SP09'],
        primary_sp_code: 'SP06',
      };
      await service.updateAlignment(
        RESAVE_RESULT_ID,
        RESAVE_RESULT_CODE,
        firstSave,
        user,
      );

      const secondSave: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06', 'SP09'],
        primary_sp_code: 'SP09',
      };
      const secondResponse = await service.updateAlignment(
        RESAVE_RESULT_ID,
        RESAVE_RESULT_CODE,
        secondSave,
        user,
      );

      expect(
        secondResponse.selected_science_programs.map((sp) => ({
          code: sp.code,
          role: sp.role,
        })),
      ).toEqual([
        { code: 'SP06', role: 'CONTRIBUTING' },
        { code: 'SP09', role: 'PRIMARY' },
      ]);

      // Exactly one active PRIMARY row exists for the CURRENT active
      // alignment of this result — the old alignment (and its rows) were
      // deactivated, not left dangling to collide with the new one.
      const activePrimaryRows = (await dataSource.query(
        `SELECT rpfas.sp_code
         FROM result_pool_funding_alignment_sp rpfas
         JOIN result_pool_funding_alignment rpfa ON rpfa.id = rpfas.alignment_id
         WHERE rpfa.result_id = ? AND rpfa.is_active = 1 AND rpfas.is_active = 1 AND rpfas.sp_role = 'PRIMARY'`,
        [RESAVE_RESULT_ID],
      )) as { sp_code: string }[];
      expect(activePrimaryRows).toEqual([{ sp_code: 'SP09' }]);
    });

    afterAll(() => {
      findContext.mockReset();
    });
  });

  // ---------------------------------------------------------------------
  // Legacy fixture — sp_role = NULL, including a PRMS-locked (is_read_only)
  // alignment. R-BIL-126 AC.2/AC.3.
  // ---------------------------------------------------------------------
  describe('legacy fixture — sp_role = NULL survives read-back (R-BIL-126)', () => {
    let service: BilateralService;
    const findContext = jest.fn();
    const findActiveTocRows = jest.fn().mockResolvedValue([]);
    const emit = jest.fn();
    const findAllCatalog = jest.fn();

    const user: User = { sec_user_id: 4242 } as User;
    const RESULT_ID = 900002;
    const RESULT_CODE = 'STAR-900002';

    // is_synced_to_prms: true simulates the R-BIL-126 scenario — "A
    // PRMS-locked legacy alignment is left alone" — a legacy, role-less
    // alignment that is ALSO read-only.
    const readOnlyContext = {
      result_id: RESULT_ID,
      result_official_code: RESULT_CODE,
      result_status_id: 5,
      version_id: 3,
      report_year_id: 2025,
      is_synced_to_prms: true,
      platform_code: 'STAR',
      indicator_id: 1,
      agresso_agreement_id: 'D111',
      is_pool_funding_contributor: true,
    };

    const catalog = [
      {
        official_code: 'SP06',
        name: 'SP06 name',
        category: 'cat',
        color: null,
        icon_key: null,
      },
      {
        official_code: 'SP09',
        name: 'SP09 name',
        category: 'cat',
        color: null,
        icon_key: null,
      },
    ];

    beforeAll(async () => {
      await dataSource.query('INSERT INTO `results` (`result_id`) VALUES (?)', [
        RESULT_ID,
      ]);
      await dataSource.query(
        'INSERT INTO `result_pool_funding_alignment` (`result_id`, `has_contribution`) VALUES (?, 1)',
        [RESULT_ID],
      );
      const alignmentRows = (await dataSource.query(
        'SELECT id FROM `result_pool_funding_alignment` WHERE result_id = ? AND is_active = 1',
        [RESULT_ID],
      )) as { id: number }[];
      const alignmentId = Number(alignmentRows[0].id);

      // Legacy rows: sp_role left NULL — exactly what pre-migration rows
      // look like after the (backfill-free) T-02 migration ran (R-BIL-126
      // AC.1).
      await dataSource.query(
        'INSERT INTO `result_pool_funding_alignment_sp` (`alignment_id`, `sp_code`, `sp_role`, `is_active`) VALUES (?, ?, NULL, 1)',
        [alignmentId, 'SP06'],
      );
      await dataSource.query(
        'INSERT INTO `result_pool_funding_alignment_sp` (`alignment_id`, `sp_code`, `sp_role`, `is_active`) VALUES (?, ?, NULL, 1)',
        [alignmentId, 'SP09'],
      );

      findContext.mockResolvedValue(readOnlyContext);
      findAllCatalog.mockResolvedValue(catalog);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BilateralService,
          { provide: DataSource, useValue: dataSource },
          {
            provide: ResultRepository,
            useValue: { findPoolFundingAlignmentContext: findContext },
          },
          {
            provide: ResultPoolFundingAlignmentRepository,
            useValue: new ResultPoolFundingAlignmentRepository(dataSource),
          },
          {
            provide: ResultPoolFundingIndicatorMappingRepository,
            useValue: {},
          },
          {
            provide: ResultPoolFundingTocAlignmentRepository,
            useValue: {
              findActiveByResultId: findActiveTocRows,
              upsertForSp: jest.fn(),
              deactivateForSps: jest.fn(),
            },
          },
          {
            provide: ServerGateway,
            useValue: { emitPoolFundingAlignmentChanged: emit },
          },
          {
            provide: CapacitySharingBilateralIndicatorTypeHandler,
            useValue: {},
          },
          {
            provide: InnovationDevelopmentBilateralIndicatorTypeHandler,
            useValue: {},
          },
          {
            provide: KnowledgeProductBilateralIndicatorTypeHandler,
            useValue: {},
          },
          { provide: NoopBilateralIndicatorTypeHandler, useValue: {} },
          { provide: PolicyChangeBilateralIndicatorTypeHandler, useValue: {} },
          {
            provide: ClarisaScienceProgramsService,
            useValue: { findAll: findAllCatalog },
          },
          { provide: ClarisaProjectsService, useValue: {} },
          { provide: ClarisaCgiarEntitiesService, useValue: {} },
          { provide: PrmsTocService, useValue: {} },
          { provide: TocIntegrationService, useValue: {} },
          { provide: BilateralProjectMappingService, useValue: {} },
        ],
      }).compile();

      service = module.get(BilateralService);
    });

    afterAll(() => jest.restoreAllMocks());

    it('R-BIL-126 AC.2/AC.3 — GET on a legacy alignment returns role: null on every SP and preserves is_read_only', async () => {
      const response = await service.getAlignment(RESULT_ID, RESULT_CODE, user);

      expect(response.is_read_only).toBe(true);
      expect(
        response.selected_science_programs.map((sp) => ({
          code: sp.code,
          role: sp.role,
        })),
      ).toEqual([
        { code: 'SP06', role: null },
        { code: 'SP09', role: null },
      ]);
    });
  });
});
