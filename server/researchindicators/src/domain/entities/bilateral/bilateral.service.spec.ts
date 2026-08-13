import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BilateralService } from './bilateral.service';
import { ResultRepository } from '../results/repositories/result.repository';
import { ResultPoolFundingAlignmentRepository } from './repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingIndicatorMappingRepository } from './repositories/result-pool-funding-indicator-mapping.repository';
import { ResultPoolFundingTocAlignmentRepository } from './repositories/result-pool-funding-toc-alignment.repository';
import { ServerGateway } from '../../tools/socket/server.gateway';
import { CapacitySharingBilateralIndicatorTypeHandler } from './handlers/capacity-sharing.handler';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from './handlers/innovation-development.handler';
import { KnowledgeProductBilateralIndicatorTypeHandler } from './handlers/knowledge-product.handler';
import { NoopBilateralIndicatorTypeHandler } from './handlers/noop.handler';
import { PolicyChangeBilateralIndicatorTypeHandler } from './handlers/policy-change.handler';
import { ClarisaScienceProgramsService } from '../../tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaCgiarEntitiesService } from '../../tools/clarisa/cgiar-entities/clarisa-cgiar-entities.service';
import { PrmsTocService } from '../../tools/prms-toc/prms-toc.service';
import { TocIntegrationService } from '../../tools/toc-integration/toc-integration.service';
import { BilateralProjectMappingService } from '../bilateral-project-mapping/bilateral-project-mapping.service';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { UpdatePoolFundingAlignmentDto } from './dto/update-pool-funding-alignment.dto';
import { ResultPoolFundingAlignmentSp } from './entities/result-pool-funding-alignment-sp.entity';
import { ResultPoolFundingAlignment } from './entities/result-pool-funding-alignment.entity';
import { ResultReviewHistory } from '../result-review-history/entities/result-review-history.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.6 / NFR-BIL-070
//
// Canonical BilateralService spec. Covers:
//   - getAlignment        — happy / eligible-false / not-found
//   - toSelectedSciencePrograms (private)  — via getAlignment enrichment
//   - listIndicators      — empty / stale-mapping grouping / filter
//   - upsertContribution  — happy / unknown indicator type / lever not selected
//   - deleteContribution  — happy / 404 when no previous mapping
//
// The deep scenarios for the SP picker (R-BIL-076 + R-BIL-078) live in the
// focused-scope spec `bilateral.service.getScienceProgramsForResult.spec.ts`
// (T-15.11). PATCH validation lives in `bilateral.service.normalizeLeverCodes
// .spec.ts` (T-15.1). The source-based read-only gate lives in
// `bilateral.service.sourceReadOnlyGate.spec.ts` (T-15.2).

describe('BilateralService — canonical coverage (T-15.6)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const findStaleMappings = jest.fn();
  const findActiveMapping = jest.fn();
  const findAllCatalog = jest.fn();
  const transaction = jest.fn();
  const emit = jest.fn();
  // T-07 — read-back source (snapshot table) + upstream client, kept as
  // named mocks so the drift test can assert zero upstream involvement.
  const findActiveTocRows = jest.fn();
  const getTocResults = jest.fn();
  const getTocResultsForSps = jest.fn();
  // R-BIL-117 AC.3 — named so the gate-bypass test can assert it is never
  // reached when the read-only gate rejects the write first.
  const tocUpsertForSp = jest.fn();
  // T-01 (R-BIL-125 AC.4) — named so the cascade-pin tests below can assert
  // deactivation calls; behavior is unchanged (still a bare jest.fn()).
  const deactivateForSps = jest.fn();

  // Mimic TypeORM's actual save: echo back the payload (merged with an id)
  // so `savedMapping` carries the lever_code / indicator_code / indicator_type
  // values the service later reads in `toMappingResponse`.
  const fakeRepo = {
    update: jest.fn(),
    save: jest
      .fn()
      .mockImplementation(async (payload: Record<string, unknown>) => ({
        id: 1,
        ...payload,
      })),
  };
  const fakeManager = {
    getRepository: () => fakeRepo as unknown as Repository<unknown>,
  } as unknown as EntityManager;

  const user: User = { sec_user_id: 42 } as User;
  // R-BIL-117 AC.2 — SYSTEM_ADMIN identity used to prove the read-only
  // gate rejects writes regardless of role (it runs before RolesGuard's
  // SYSTEM_ADMIN bypass would ever matter).
  const systemAdmin: User = { sec_user_id: 1 } as User;

  // Sentinel handler used for upsertContribution happy path — NOOP-style
  // (no FK; narrative goes into `other_contribution_narrative`).
  const noopHandler = {
    indicatorType: 'NOOP',
    validate: jest.fn(),
    upsert: jest.fn().mockResolvedValue({ fkField: null, fkId: 0 }),
    delete: jest.fn(),
  };
  const capacitySharingHandler = {
    indicatorType: 'capacity_sharing',
    validate: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    transaction.mockImplementation(async (cb) => cb(fakeManager));
    findActiveTocRows.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralService,
        { provide: DataSource, useValue: { transaction } },
        {
          provide: ResultRepository,
          useValue: { findPoolFundingAlignmentContext: findContext },
        },
        {
          provide: ResultPoolFundingAlignmentRepository,
          useValue: { findActiveAlignmentByResultId: findActiveAlignment },
        },
        {
          provide: ResultPoolFundingIndicatorMappingRepository,
          useValue: {
            findActiveStaleMappingsByResultAndLevers: findStaleMappings,
            findActiveMappingByResultLeverIndicator: findActiveMapping,
          },
        },
        {
          // T-07 — getAlignment now reads active ToC rows from here
          // (snapshot-sourced read-back, R-BIL-096 / R-BIL-095).
          provide: ResultPoolFundingTocAlignmentRepository,
          useValue: {
            findActiveByResultId: findActiveTocRows,
            upsertForSp: tocUpsertForSp,
            deactivateForSps,
          },
        },
        {
          provide: ServerGateway,
          useValue: { emitPoolFundingAlignmentChanged: emit },
        },
        {
          provide: CapacitySharingBilateralIndicatorTypeHandler,
          useValue: capacitySharingHandler,
        },
        {
          provide: InnovationDevelopmentBilateralIndicatorTypeHandler,
          useValue: {
            indicatorType: 'innovation_development',
            upsert: jest.fn(),
            delete: jest.fn(),
            validate: jest.fn(),
          },
        },
        {
          provide: KnowledgeProductBilateralIndicatorTypeHandler,
          useValue: {
            indicatorType: 'knowledge_product',
            upsert: jest.fn(),
            delete: jest.fn(),
            validate: jest.fn(),
          },
        },
        { provide: NoopBilateralIndicatorTypeHandler, useValue: noopHandler },
        {
          provide: PolicyChangeBilateralIndicatorTypeHandler,
          useValue: {
            indicatorType: 'policy_change',
            upsert: jest.fn(),
            delete: jest.fn(),
            validate: jest.fn(),
          },
        },
        {
          provide: ClarisaScienceProgramsService,
          useValue: { findAll: findAllCatalog },
        },
        { provide: ClarisaProjectsService, useValue: {} },
        {
          provide: ClarisaCgiarEntitiesService,
          useValue: { getAreasOfWorkBySp: jest.fn() },
        },
        { provide: PrmsTocService, useValue: {} },
        {
          // T-07 drift guard — methods are jest.fn()s so the read-back
          // tests can assert the upstream client is NEVER touched.
          provide: TocIntegrationService,
          useValue: { getTocResults, getTocResultsForSps },
        },
        { provide: BilateralProjectMappingService, useValue: {} },
      ],
    }).compile();

    service = module.get(BilateralService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // getAlignment
  // ---------------------------------------------------------------------------
  describe('getAlignment', () => {
    it('returns the full shape with enriched selected_science_programs', async () => {
      findContext.mockResolvedValueOnce({
        result_id: 19792,
        result_official_code: 19792,
        is_pool_funding_contributor: true,
        is_synced_to_prms: false,
        platform_code: 'STAR',
        // D-V2-7: literal report year. String on purpose — pins the
        // Number(...) comparison (T-07 / R-BIL-096).
        report_year_id: '2026',
      });
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'SP01' },
          { lever_code: 'SP02', lever_name: 'SP02' },
        ],
        // T-08 — role carrier, ascending sp_code as the repository's
        // ORDER BY already guarantees.
        sp_roles: [
          { sp_code: 'SP01', sp_role: 'PRIMARY' },
          { sp_code: 'SP02', sp_role: 'CONTRIBUTING' },
        ],
      });
      findAllCatalog.mockResolvedValueOnce([
        {
          official_code: 'SP01',
          name: 'Breeding for Tomorrow',
          category: 'Science programs',
          color: '#ef4444',
          icon_key: 'SP01',
        },
        {
          official_code: 'SP02',
          name: 'Sustainable Farming',
          category: 'Science programs',
          color: '#84cc16',
          icon_key: 'SP02',
        },
      ]);

      const out = await service.getAlignment(19792, '19792', user);

      expect(out).toEqual({
        result_code: '19792',
        eligible: true,
        has_pool_funding_alignment_eligible: true,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'SP01' },
          { lever_code: 'SP02', lever_name: 'SP02' },
        ],
        selected_science_programs: [
          {
            code: 'SP01',
            name: 'Breeding for Tomorrow',
            category: 'Science programs',
            color: '#ef4444',
            icon_key: 'SP01',
            role: 'PRIMARY',
          },
          {
            code: 'SP02',
            name: 'Sustainable Farming',
            category: 'Science programs',
            color: '#84cc16',
            icon_key: 'SP02',
            role: 'CONTRIBUTING',
          },
        ],
        is_synced_to_prms: false,
        is_read_only: false,
        // T-07 (R-BIL-096): both fields ALWAYS present on the response.
        version_locked: false,
        toc_alignments: [],
      });
    });

    it('hides the alignment payload when the result is not pool-funding-eligible', async () => {
      findContext.mockResolvedValueOnce({
        result_id: 19792,
        result_official_code: 19792,
        is_pool_funding_contributor: false,
        is_synced_to_prms: false,
      });
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
        // T-08 / RA-04 — deliberately NON-empty: the alignment row itself
        // DOES carry a resolved Primary. The eligibility gate must still
        // hide it (`visibleAlignment?.sp_roles ?? []`, never
        // `alignment.sp_roles`) — a test where this fixture were empty
        // would pass even if the service read the raw `alignment` by
        // mistake, which is exactly the "not interchangeable with the
        // phantom-member test" disqualifier this fixture exists to avoid.
        sp_roles: [{ sp_code: 'SP01', sp_role: 'PRIMARY' }],
      });
      // T-07: saved rows exist, but the eligibility gate hides them the
      // same way it hides the rest of the alignment payload.
      findActiveTocRows.mockResolvedValueOnce([
        { sp_code: 'SP01', aligns_with_toc: true },
      ]);

      const out = await service.getAlignment(19792, '19792', user);

      expect(out.eligible).toBe(false);
      expect(out.has_contribution).toBeNull();
      expect(out.selected_levers).toEqual([]);
      // R-BIL-123 / RA-04 — the eligibility gate, not the sp_roles content,
      // decides this: sp_roles was populated above and still yields [].
      expect(out.selected_science_programs).toEqual([]);
      // T-07 (R-BIL-096): both fields present even on the ineligible state.
      expect(out.toc_alignments).toEqual([]);
      expect(out.version_locked).toBe(true); // no report_year_id ⇒ ≠ 2026
      // findAll on the catalog must NOT be called when there are no codes to enrich.
      expect(findAllCatalog).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the result is missing', async () => {
      findContext.mockResolvedValueOnce(null);
      await expect(
        service.getAlignment(999, '999', user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    // -------------------------------------------------------------------------
    // T-07 — toc_alignments[] + version_locked read-back
    // (@sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-07 /
    //  R-BIL-096, R-BIL-095)
    // -------------------------------------------------------------------------
    describe('toc_alignments read-back (T-07)', () => {
      const eligibleContext = (reportYearId: number | string = 2026) => ({
        result_id: 19792,
        result_official_code: 19792,
        is_pool_funding_contributor: true,
        is_synced_to_prms: false,
        platform_code: 'STAR',
        report_year_id: reportYearId,
      });

      // Snapshot rows exactly as the MySQL driver hands them back: the
      // decimal `quantitative_contribution` arrives as a STRING (no entity
      // transformer) and the snapshot column keeps the upstream
      // `unit_messurament` spelling (D-V2-4).
      const yesRow = {
        id: 10,
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5187,
        indicator_id: 5972,
        quantitative_contribution: '3.50',
        toc_result_title: 'HLO title from snapshot',
        indicator_description: 'Indicator description from snapshot',
        unit_messurament: 'Number of policies',
        target_value: '10',
        target_year: 2026,
      };
      const noRow = {
        id: 11,
        sp_code: 'SP03',
        aligns_with_toc: false,
        level: null,
        toc_result_id: null,
        indicator_id: null,
        quantitative_contribution: null,
        toc_result_title: null,
        indicator_description: null,
        unit_messurament: null,
        target_value: null,
        target_year: null,
      };

      it('maps saved rows to the frozen §5 shape — rename + decimal coercion (R-BIL-096 AC.1)', async () => {
        findContext.mockResolvedValueOnce(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce(null);
        findActiveTocRows.mockResolvedValueOnce([yesRow, noRow]);

        const out = await service.getAlignment(19792, '19792', user);

        expect(out.version_locked).toBe(false);
        expect(out.toc_alignments).toEqual([
          {
            sp_code: 'SP01',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 5187,
            indicator_id: 5972,
            // Coerced decimal string → number so the wire type holds.
            quantitative_contribution: 3.5,
            toc_result_title: 'HLO title from snapshot',
            indicator_description: 'Indicator description from snapshot',
            // Stored `unit_messurament` renamed at the wire (D-V2-4).
            unit_of_measurement: 'Number of policies',
            target_value: '10',
            target_year: 2026,
          },
          {
            sp_code: 'SP03',
            aligns_with_toc: false,
            level: null,
            toc_result_id: null,
            indicator_id: null,
            quantitative_contribution: null,
            toc_result_title: null,
            indicator_description: null,
            unit_of_measurement: null,
            target_value: null,
            target_year: null,
          },
        ]);
      });

      it('returns toc_alignments: [] when there are no saved rows', async () => {
        findContext.mockResolvedValueOnce(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce(null);
        findActiveTocRows.mockResolvedValueOnce([]);

        const out = await service.getAlignment(19792, '19792', user);

        expect(out.toc_alignments).toEqual([]);
        expect(out.version_locked).toBe(false);
      });

      it('version_locked: true when the live version ≠ 2026 (R-BIL-097 read signal)', async () => {
        findContext.mockResolvedValueOnce(eligibleContext(2024));
        findActiveAlignment.mockResolvedValueOnce(null);
        findActiveTocRows.mockResolvedValueOnce([]);

        const out = await service.getAlignment(19792, '19792', user);

        expect(out.version_locked).toBe(true);
        expect(out.toc_alignments).toEqual([]);
      });

      it('drift guard — read-back is snapshot-sourced with ZERO upstream involvement (R-BIL-095 AC.1)', async () => {
        findContext.mockResolvedValueOnce(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce(null);
        findActiveTocRows.mockResolvedValueOnce([yesRow, noRow]);

        const out = await service.getAlignment(19792, '19792', user);

        // Saved snapshots come back even though the upstream client would
        // return nothing — the lambda-toc client is NEVER touched here.
        expect(out.toc_alignments).toHaveLength(2);
        expect(getTocResults).not.toHaveBeenCalled();
        expect(getTocResultsForSps).not.toHaveBeenCalled();
      });
    });

    // -------------------------------------------------------------------------
    // sp_roles carrier — role on the read-back
    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-08 /
    //   R-BIL-123 (AC.1-AC.3), R-BIL-126 AC.2, R-BIL-125 AC.2 (read-back half)
    // -------------------------------------------------------------------------
    describe('sp_roles carrier — role on the read-back (T-08)', () => {
      const eligibleContext = () => ({
        result_id: 19792,
        result_official_code: 19792,
        is_pool_funding_contributor: true,
        is_synced_to_prms: false,
        platform_code: 'STAR',
        report_year_id: 2026,
      });

      const catalog = [
        {
          official_code: 'SP06',
          name: 'SP06 name',
          category: 'Science programs',
          color: '#111111',
          icon_key: 'SP06',
        },
        {
          official_code: 'SP09',
          name: 'SP09 name',
          category: 'Science programs',
          color: '#222222',
          icon_key: 'SP09',
        },
      ];

      // Scenario: "Role survives a round-trip" (requirements.md R-BIL-123).
      it('AC.1 — exactly one entry with role: "PRIMARY"; sp_code-ascending order preserved (round-trip scenario)', async () => {
        findContext.mockResolvedValueOnce(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce({
          id: 501,
          result_id: 19792,
          has_contribution: true,
          selected_levers: [
            { lever_code: 'SP06', lever_name: 'SP06' },
            { lever_code: 'SP09', lever_name: 'SP09' },
          ],
          // Already sp_code-ascending, mirroring the repository's
          // `ORDER BY rpfas.sp_code ASC` — this test asserts the SERVICE
          // does not disturb that order, not that it re-sorts.
          sp_roles: [
            { sp_code: 'SP06', sp_role: 'PRIMARY' },
            { sp_code: 'SP09', sp_role: 'CONTRIBUTING' },
          ],
        });
        findAllCatalog.mockResolvedValueOnce(catalog);

        const out = await service.getAlignment(19792, '19792', user);

        expect(out.selected_science_programs).toEqual([
          {
            code: 'SP06',
            name: 'SP06 name',
            category: 'Science programs',
            color: '#111111',
            icon_key: 'SP06',
            role: 'PRIMARY',
          },
          {
            code: 'SP09',
            name: 'SP09 name',
            category: 'Science programs',
            color: '#222222',
            icon_key: 'SP09',
            role: 'CONTRIBUTING',
          },
        ]);
        // AND IT MUST preserve the existing ordering contract (sp_code ASC).
        expect(out.selected_science_programs.map((sp) => sp.code)).toEqual([
          'SP06',
          'SP09',
        ]);
        expect(
          out.selected_science_programs.filter((sp) => sp.role === 'PRIMARY'),
        ).toHaveLength(1);
      });

      // R-BIL-123 AC.2 — supporting test only, NOT the AC.2 discharge.
      // This proves `getAlignment` is a deterministic mapping over its
      // mocked input: two calls with the same fixture return byte-identical
      // `selected_science_programs`. It does NOT call `updateAlignment` and
      // so cannot observe the PATCH half of AC.2 at all — it would pass
      // unchanged even if `updateAlignment` mutated or dropped a field
      // after reading it back (the exact defect the Reviewer built during
      // T-08 attempt 1 review, which this test's own two-read structure
      // cannot see). The assertion that actually falsifies GET/PATCH
      // parity — reading `updateAlignment`'s own return value — lives in
      // 'AC.1 + AC.3' below. The write-then-read path across the
      // transaction boundary remains T-13's integration test (TEST
      // datasource); this test and 'AC.1 + AC.3' both stay within
      // getAlignment's read side.
      it('AC.2 — two independent reads of the same stored state return byte-identical selected_science_programs (getAlignment is a pure mapping over its input; does NOT exercise the PATCH/updateAlignment half of AC.2)', async () => {
        const alignmentFixture = () => ({
          id: 501,
          result_id: 19792,
          has_contribution: true,
          selected_levers: [
            { lever_code: 'SP06', lever_name: 'SP06' },
            { lever_code: 'SP09', lever_name: 'SP09' },
          ],
          sp_roles: [
            { sp_code: 'SP06', sp_role: 'PRIMARY' as const },
            { sp_code: 'SP09', sp_role: 'CONTRIBUTING' as const },
          ],
        });

        findContext.mockResolvedValue(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce(alignmentFixture());
        findAllCatalog.mockResolvedValueOnce(catalog);
        const firstRead = await service.getAlignment(19792, '19792', user);

        findActiveAlignment.mockResolvedValueOnce(alignmentFixture());
        findAllCatalog.mockResolvedValueOnce(catalog);
        const secondRead = await service.getAlignment(19792, '19792', user);

        expect(secondRead.selected_science_programs).toEqual(
          firstRead.selected_science_programs,
        );
      });

      // R-BIL-123 AC.3 (service half) — proves `getAlignment` passes
      // `selected_levers` through untouched: whatever the repository
      // returns is what the wire gets, field-by-field (keys, not just
      // values). This does NOT prove the repository itself never leaks
      // `sp_role` onto `selected_levers` — that fixture is hand-written
      // here, so a leak inside the repository's own construction would not
      // surface in this test. The repository half of AC.3 (the leak this
      // guards against actually happening) is proven against real raw rows
      // in `ResultPoolFundingAlignmentRepository — sp_roles LEFT JOIN
      // null-sp_code guard (T-08 / RA-08)` below.
      it('AC.3 (service half) — selected_levers is byte-identical as it passes through getAlignment', async () => {
        findContext.mockResolvedValueOnce(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce({
          id: 501,
          result_id: 19792,
          has_contribution: true,
          selected_levers: [
            { lever_code: 'SP06', lever_name: 'SP06' },
            { lever_code: 'SP09', lever_name: 'SP09' },
          ],
          sp_roles: [
            { sp_code: 'SP06', sp_role: 'PRIMARY' },
            { sp_code: 'SP09', sp_role: 'CONTRIBUTING' },
          ],
        });
        findAllCatalog.mockResolvedValueOnce(catalog);

        const out = await service.getAlignment(19792, '19792', user);

        expect(out.selected_levers).toEqual([
          { lever_code: 'SP06', lever_name: 'SP06' },
          { lever_code: 'SP09', lever_name: 'SP09' },
        ]);
        for (const lever of out.selected_levers) {
          expect(Object.keys(lever).sort()).toEqual([
            'lever_code',
            'lever_name',
          ]);
        }
      });

      // R-BIL-126 AC.2 — legacy alignment (sp_role = NULL on every row,
      // surfaced by the repository as `sp_role: null`) ⇒ 200 with
      // `role: null` on every entry, not an error and not a synthesised role.
      it('R-BIL-126 AC.2 — legacy alignment (sp_role = NULL) returns role: null on every entry', async () => {
        findContext.mockResolvedValueOnce(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce({
          id: 77,
          result_id: 19792,
          has_contribution: true,
          selected_levers: [
            { lever_code: 'SP06', lever_name: 'SP06' },
            { lever_code: 'SP09', lever_name: 'SP09' },
          ],
          sp_roles: [
            { sp_code: 'SP06', sp_role: null },
            { sp_code: 'SP09', sp_role: null },
          ],
        });
        findAllCatalog.mockResolvedValueOnce(catalog);

        const out = await service.getAlignment(19792, '19792', user);

        expect(out.selected_science_programs).toEqual([
          expect.objectContaining({ code: 'SP06', role: null }),
          expect.objectContaining({ code: 'SP09', role: null }),
        ]);
      });

      // R-BIL-125 AC.2 (read-back half — REASSIGNED from T-07, 2026-08-13,
      // user-approved; execution.md → Pivot Record: T-08). T-07 proved only
      // the write half (deactivateForSps not called on a role change); no
      // test anywhere asserted the OUTPUT side — that an active ToC row for
      // a Contributing SP still appears in toc_alignments[]. `getAlignment`
      // runs UNMOCKED here, which is why this was impossible in T-07
      // (`tocAlignments.spec.ts` mocks `getAlignment` to `{}` for every
      // test). The read-back's ToC filter is role-blind by design
      // (bilateral.service.ts: `toc_alignments: (eligible ? tocAlignmentRows
      // : []).map(...)`) and this test asserts that it STAYS that way — it
      // is not new behavior, it is the first assertion of existing
      // behavior against a role-differentiated fixture.
      it("R-BIL-125 AC.2 (read-back half) — a Contributing SP's active ToC row still appears in toc_alignments[], alongside the Primary's", async () => {
        findContext.mockResolvedValueOnce(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce({
          id: 501,
          result_id: 19792,
          has_contribution: true,
          selected_levers: [
            { lever_code: 'SP06', lever_name: 'SP06' },
            { lever_code: 'SP09', lever_name: 'SP09' },
          ],
          sp_roles: [
            { sp_code: 'SP06', sp_role: 'PRIMARY' },
            { sp_code: 'SP09', sp_role: 'CONTRIBUTING' },
          ],
        });
        findAllCatalog.mockResolvedValueOnce(catalog);
        // SP09 is Contributing (per sp_roles above) yet has an active,
        // saved ToC row — the read filter must not exclude it.
        findActiveTocRows.mockResolvedValueOnce([
          { id: 1, sp_code: 'SP06', aligns_with_toc: true },
          { id: 2, sp_code: 'SP09', aligns_with_toc: true },
        ]);

        const out = await service.getAlignment(19792, '19792', user);

        expect(out.toc_alignments.map((row) => row.sp_code)).toEqual([
          'SP06',
          'SP09',
        ]);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Regression net (AC-1676, T-01) — read-only gate (R-BIL-117). This gate
  // already exists on unmodified code; this block pins it BEFORE the
  // T-03/T-04 partial-ToC relaxation lands, so a future regression fails a
  // test tied to this spec rather than relying solely on
  // `bilateral.service.sourceReadOnlyGate.spec.ts` (T-15.2), which was
  // written for a different ticket's traceability. Per-SP isolation
  // (R-BIL-118) is pinned at the repository layer, see
  // `repositories/result-pool-funding-toc-alignment.repository.spec.ts`.
  //
  // @sdd-spec docs/specs/bilateral/toc-optional-mapping — T-01 / R-BIL-117
  // ---------------------------------------------------------------------------
  describe('read-only gate — is_read_only union + write rejection (R-BIL-117)', () => {
    const contextFor = (overrides: {
      platform_code: string;
      is_synced_to_prms: boolean;
    }) => ({
      result_id: 19792,
      result_official_code: 19792,
      is_pool_funding_contributor: true,
      report_year_id: 2026,
      ...overrides,
    });

    // R-BIL-117 AC.1 — is_read_only is the UNION of PRMS-sourced and
    // is_synced_to_prms. Covers all four truth-table combinations; the
    // (STAR, synced) and (PRMS, synced) rows are not exercised by the
    // existing sourceReadOnlyGate spec, which only asserts is_read_only on
    // the (PRMS, not-synced) row.
    it.each([
      { platform_code: 'STAR', is_synced_to_prms: false, expected: false },
      { platform_code: 'STAR', is_synced_to_prms: true, expected: true },
      { platform_code: 'PRMS', is_synced_to_prms: false, expected: true },
      { platform_code: 'PRMS', is_synced_to_prms: true, expected: true },
    ])(
      'is_read_only=$expected for platform_code=$platform_code, is_synced_to_prms=$is_synced_to_prms',
      async ({ platform_code, is_synced_to_prms, expected }) => {
        findContext.mockResolvedValueOnce(
          contextFor({ platform_code, is_synced_to_prms }),
        );
        findActiveAlignment.mockResolvedValueOnce(null);
        findActiveTocRows.mockResolvedValueOnce([]);

        const out = await service.getAlignment(19792, '19792', user);

        expect(out.is_read_only).toBe(expected);
      },
    );

    // R-BIL-117 AC.2 — 409 on write under each condition, including for
    // SYSTEM_ADMIN. The BOTH-true combination is not exercised by the
    // existing sourceReadOnlyGate spec (each condition is tested there in
    // isolation, never together).
    it('rejects a SYSTEM_ADMIN write with 409 when the result is BOTH PRMS-sourced AND already synced', async () => {
      findContext.mockResolvedValueOnce(
        contextFor({ platform_code: 'PRMS', is_synced_to_prms: true }),
      );
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP01'],
      };

      let thrown: HttpException | undefined;
      try {
        await service.updateAlignment(19792, '19792', dto, systemAdmin);
      } catch (err) {
        thrown = err as HttpException;
      }

      expect(thrown).toBeInstanceOf(ConflictException);
      // The PRMS-source gate runs first (bilateral.service.ts:659), so its
      // wording wins over the synced-to-PRMS gate even when both fire.
      expect(thrown!.message).toBe(
        'Result is PRMS-sourced; bilateral alignment is read-only in STAR',
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('rejects a SYSTEM_ADMIN write with 409 when the result is synced to PRMS but not PRMS-sourced', async () => {
      findContext.mockResolvedValueOnce(
        contextFor({ platform_code: 'STAR', is_synced_to_prms: true }),
      );
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP01'],
      };

      await expect(
        service.updateAlignment(19792, '19792', dto, systemAdmin),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(transaction).not.toHaveBeenCalled();
    });

    // R-BIL-117 AC.3 — the partial-ToC relaxation (T-03/T-04) must not open
    // a write path that bypasses this gate. Pinned here on TODAY's code: a
    // request carrying `toc_alignments` is rejected by the same top-level
    // gate before any ToC-specific processing runs.
    it('a write carrying toc_alignments is rejected by the SAME gate before any ToC processing runs', async () => {
      findContext.mockResolvedValueOnce(
        contextFor({ platform_code: 'PRMS', is_synced_to_prms: false }),
      );
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP01'],
        toc_alignments: [
          {
            sp_code: 'SP01',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 1,
          },
        ],
      };

      await expect(
        service.updateAlignment(19792, '19792', dto, systemAdmin),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tocUpsertForSp).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // updateAlignment — SP-deselection ToC cascade pin (T-01 / R-BIL-125 AC.4)
  //
  // Characterisation tests recording TODAY's behavior BEFORE the Primary/
  // Contributing role change lands (design.md §5.3 "What deliberately does
  // not change"): a ToC row is deactivated ONLY when its sp_code leaves
  // sp_codes. Asserted in both directions so a later regression — e.g. a
  // role-change cascade, which R-BIL-125 explicitly forbids — is
  // attributable rather than merely visible.
  //
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-01 / R-BIL-125
  // ---------------------------------------------------------------------------
  describe('updateAlignment — SP-deselection ToC cascade pin (T-01 / R-BIL-125 AC.4)', () => {
    const eligibleContext = () => ({
      result_id: 19792,
      result_official_code: 19792,
      is_pool_funding_contributor: true,
      is_synced_to_prms: false,
      platform_code: 'STAR',
      report_year_id: 2026,
    });

    beforeEach(() => {
      // Short-circuit the read-back and the SP-catalog fan-out — both are
      // covered elsewhere; this describe pins only the cascade decision.
      jest.spyOn(service, 'getAlignment').mockResolvedValue({} as never);
      jest.spyOn(service, 'getScienceProgramsForResult').mockResolvedValue({
        result_code: '19792',
        mapping_status: 'mapped',
        clarisa_project: { id: 1, short_name: 'p' },
        science_programs: ['SP01', 'SP03'].map((code) => ({
          code,
          name: `name-of-${code}`,
          category: null,
          color: null,
          icon_key: null,
          allocation: 50,
        })),
      });
    });

    it('deactivates a ToC row when its SP leaves sp_codes', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);
      findActiveTocRows.mockResolvedValueOnce([
        { id: 10, sp_code: 'SP01' },
        { id: 11, sp_code: 'SP03' },
      ]);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP01'], // SP03 leaves sp_codes
      };

      await expect(
        service.updateAlignment(19792, '19792', dto, user),
      ).resolves.toBeDefined();

      expect(deactivateForSps).toHaveBeenCalledTimes(1);
      expect(deactivateForSps).toHaveBeenCalledWith(
        19792,
        ['SP03'],
        42,
        fakeManager,
      );
    });

    it('does NOT deactivate a ToC row when its SP stays in sp_codes', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);
      findActiveTocRows.mockResolvedValueOnce([
        { id: 10, sp_code: 'SP01' },
        { id: 11, sp_code: 'SP03' },
      ]);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP01', 'SP03'], // both stay selected
      };

      await expect(
        service.updateAlignment(19792, '19792', dto, user),
      ).resolves.toBeDefined();

      expect(deactivateForSps).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // updateAlignment — resolvePrimarySpCode + role derivation + persistence
  //
  // The core of the spec: R-BIL-120 (persisted role), R-BIL-121 AC.1/AC.2
  // (service-side "≥ 1 Primary"), R-BIL-122 (Primary must be selected, with
  // the two rejection paths kept distinguishable), R-BIL-126 AC.4 (legacy
  // repair), R-BIL-130 AC.4 promotion lives in the tocAlignments spec.
  //
  // A dedicated `scopedManager` is used here (rather than the shared
  // `fakeManager`, which returns the SAME mock repo for every entity) so the
  // SP-row save can be asserted by its OWN spy — the disqualifier is
  // explicit that a presence-assertion ("a sp_role field was passed") is not
  // enough; the full (sp_code, sp_role) PAIRS must be asserted per row.
  //
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-06 / R-BIL-120, R-BIL-121, R-BIL-122, R-BIL-126
  // ---------------------------------------------------------------------------
  describe('updateAlignment — resolvePrimarySpCode + role persistence (T-06)', () => {
    const alignmentSpSave = jest.fn().mockResolvedValue([]);
    const alignmentSpUpdate = jest.fn();
    const alignmentSave = jest.fn().mockResolvedValue({ id: 501 });
    const alignmentUpdate = jest.fn();
    const historySave = jest.fn().mockResolvedValue({ id: 1 });

    const scopedManager = {
      getRepository: (entity: unknown) => {
        if (entity === ResultPoolFundingAlignmentSp) {
          return { save: alignmentSpSave, update: alignmentSpUpdate };
        }
        if (entity === ResultPoolFundingAlignment) {
          return { save: alignmentSave, update: alignmentUpdate };
        }
        if (entity === ResultReviewHistory) {
          return { save: historySave };
        }
        throw new Error(
          `T-06 scopedManager: unexpected getRepository(${String(entity)})`,
        );
      },
    } as unknown as EntityManager;

    const eligibleContext = () => ({
      result_id: 19792,
      result_official_code: 19792,
      is_pool_funding_contributor: true,
      is_synced_to_prms: false,
      platform_code: 'STAR',
      report_year_id: 2026,
    });

    const spRolePairs = (call: unknown) =>
      (call as { sp_code: string; sp_role: string }[]).map((row) => [
        row.sp_code,
        row.sp_role,
      ]);

    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(scopedManager));
      jest.spyOn(service, 'getAlignment').mockResolvedValue({} as never);
      jest.spyOn(service, 'getScienceProgramsForResult').mockResolvedValue({
        result_code: '19792',
        mapping_status: 'mapped',
        clarisa_project: { id: 1, short_name: 'p' },
        science_programs: ['SP06', 'SP09'].map((code) => ({
          code,
          name: `name-of-${code}`,
          category: null,
          color: null,
          icon_key: null,
          allocation: 50,
        })),
      });
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-08 forward
    // pointer. `jest.clearAllMocks()` (the file's top-level `afterEach`)
    // clears `.mock.calls` but NOT a mock's `.mockImplementation` — so
    // `transaction`'s implementation above (bound to this describe's
    // `scopedManager`, which throws on any entity it doesn't recognize)
    // would otherwise persist as a stale default for whichever describe
    // runs next. The outer `beforeEach` already reassigns it to
    // `fakeManager` before every test, which is why no failure has been
    // observed yet — this `mockReset()` removes the implementation
    // explicitly rather than relying on that ordering.
    afterEach(() => {
      transaction.mockReset();
    });

    it('AC.1 + AC.3 — persists SP06 as PRIMARY and SP09 as CONTRIBUTING, exactly one row each (sp_codes keeps its meaning — Primary not sent twice)', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);

      // R-BIL-123 AC.2 (PATCH half — Reviewer FAIL, T-08 attempt 2). The
      // describe-level `beforeEach` mocks `getAlignment` to `{}`, so this
      // override gives it a REAL role-bearing shape instead, then the
      // assertion below reads `updateAlignment`'s OWN return value. That is
      // what makes AC.2 falsifiable: if anything between `const response =
      // await this.getAlignment(...)` and `updateAlignment`'s `return
      // response` (bilateral.service.ts:869-876) drops or rewrites a field
      // — e.g. stripping `role` off `selected_science_programs` — this
      // assertion goes red. The two-read test below never calls
      // `updateAlignment` at all, so it cannot see that defect (see its
      // comment).
      jest.spyOn(service, 'getAlignment').mockResolvedValueOnce({
        result_code: '19792',
        selected_science_programs: [
          { code: 'SP06', role: 'PRIMARY' },
          { code: 'SP09', role: 'CONTRIBUTING' },
        ],
      } as never);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06', 'SP09'],
        primary_sp_code: 'SP06',
      };

      const result = await service.updateAlignment(19792, '19792', dto, user);
      expect(result).toBeDefined();

      // updateAlignment's return value must carry the SAME (sp_code, role)
      // pairs the read-back it built from carried — proving PATCH returns
      // GET's result untouched, not merely that it was called.
      expect(
        result.selected_science_programs.map((sp) => [sp.code, sp.role]),
      ).toEqual([
        ['SP06', 'PRIMARY'],
        ['SP09', 'CONTRIBUTING'],
      ]);

      expect(alignmentSpSave).toHaveBeenCalledTimes(1);
      const [rows] = alignmentSpSave.mock.calls[0];
      expect(rows).toHaveLength(2);
      expect(spRolePairs(rows)).toEqual([
        ['SP06', 'PRIMARY'],
        ['SP09', 'CONTRIBUTING'],
      ]);
    });

    it('AC.2 — has_contribution:false persists ZERO SP rows and does not require primary_sp_code', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = { has_contribution: false };

      await expect(
        service.updateAlignment(19792, '19792', dto, user),
      ).resolves.toBeDefined();

      expect(alignmentSpSave).not.toHaveBeenCalled();
    });

    it('AC.4 — lever_codes + primary_sp_code behaves identically to sp_codes + primary_sp_code', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        lever_codes: ['SP06', 'SP09'],
        primary_sp_code: 'SP06',
      };

      await expect(
        service.updateAlignment(19792, '19792', dto, user),
      ).resolves.toBeDefined();

      const [rows] = alignmentSpSave.mock.calls[0];
      expect(spRolePairs(rows)).toEqual([
        ['SP06', 'PRIMARY'],
        ['SP09', 'CONTRIBUTING'],
      ]);
    });

    it('R-BIL-121 AC.1 — primary_sp_code absent ⇒ 400 primary_sp_required, nothing persisted', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06'],
      };

      let thrown: HttpException | undefined;
      try {
        await service.updateAlignment(19792, '19792', dto, user);
      } catch (err) {
        thrown = err as HttpException;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      const response = thrown!.getResponse() as {
        message: { primary_sp: { code: string } };
      };
      expect(response.message.primary_sp.code).toBe('primary_sp_required');
      // Rejected pre-transaction: no partial write observable.
      expect(transaction).not.toHaveBeenCalled();
      expect(alignmentSpSave).not.toHaveBeenCalled();
    });

    it.each(['', '   '])(
      'R-BIL-121 AC.2 — primary_sp_code %j is treated as absent ⇒ the same 400, nothing persisted',
      async (value) => {
        findContext.mockResolvedValueOnce(eligibleContext());
        findActiveAlignment.mockResolvedValueOnce(null);

        const dto: UpdatePoolFundingAlignmentDto = {
          has_contribution: true,
          sp_codes: ['SP06'],
          primary_sp_code: value,
        };

        let thrown: HttpException | undefined;
        try {
          await service.updateAlignment(19792, '19792', dto, user);
        } catch (err) {
          thrown = err as HttpException;
        }

        expect(thrown).toBeInstanceOf(BadRequestException);
        const response = thrown!.getResponse() as {
          message: { primary_sp: { code: string } };
        };
        expect(response.message.primary_sp.code).toBe('primary_sp_required');
        expect(transaction).not.toHaveBeenCalled();
        expect(alignmentSpSave).not.toHaveBeenCalled();
      },
    );

    // R-BIL-122 AC.4 — AC.1 and AC.2 below are TWO DISTINCT tests asserting
    // DIFFERENT error payloads (errors.primary_sp vs errors.unknown_sp_codes).
    // A single test covering only one case does not discharge the other,
    // however green — both are required and neither is a proxy for it.
    it('R-BIL-122 AC.1 — primary_sp_code valid for the result but unselected ⇒ 400 primary_sp_not_selected (errors.primary_sp)', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06'],
        primary_sp_code: 'SP09', // valid for the result, but not selected
      };

      let thrown: HttpException | undefined;
      try {
        await service.updateAlignment(19792, '19792', dto, user);
      } catch (err) {
        thrown = err as HttpException;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      const response = thrown!.getResponse() as {
        message: {
          primary_sp?: { code: string };
          unknown_sp_codes?: string[];
        };
      };
      expect(response.message.primary_sp?.code).toBe('primary_sp_not_selected');
      expect(response.message.unknown_sp_codes).toBeUndefined();
      expect(transaction).not.toHaveBeenCalled();
    });

    it('R-BIL-122 AC.2 — primary_sp_code NOT a valid SP for the result ⇒ the pre-existing 400 errors.unknown_sp_codes (distinct payload from AC.1)', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06'],
        primary_sp_code: 'SP99', // not a valid SP for this result at all
      };

      let thrown: HttpException | undefined;
      try {
        await service.updateAlignment(19792, '19792', dto, user);
      } catch (err) {
        thrown = err as HttpException;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      const response = thrown!.getResponse() as {
        message: {
          primary_sp?: { code: string };
          unknown_sp_codes?: string[];
        };
      };
      expect(response.message.unknown_sp_codes).toEqual(['SP99']);
      expect(response.message.primary_sp).toBeUndefined();
      expect(transaction).not.toHaveBeenCalled();
    });

    it('R-BIL-126 AC.4 — a legacy (sp_role = NULL) editable alignment is repaired by one normal PATCH', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      // Previous alignment shaped exactly like a pre-migration legacy
      // alignment: two SP rows, no role concept (represented here by the
      // absence of any role field on the read model — sp_role = NULL rows
      // read back as plain lever_code entries, R-BIL-126 AC.2).
      findActiveAlignment.mockResolvedValueOnce({
        id: 77,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP06', lever_name: 'SP06' },
          { lever_code: 'SP09', lever_name: 'SP09' },
        ],
      });

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06', 'SP09'],
        primary_sp_code: 'SP09',
      };

      await expect(
        service.updateAlignment(19792, '19792', dto, user),
      ).resolves.toBeDefined();

      // The legacy rows are deactivated exactly as before (unchanged
      // behavior) …
      expect(alignmentSpUpdate).toHaveBeenCalledWith(
        { alignment_id: 77, is_active: true },
        expect.objectContaining({ is_active: false }),
      );
      // … and the freshly-written rows carry a real role: the alignment is
      // "repaired" by the ordinary write path, no special migration case.
      const [rows] = alignmentSpSave.mock.calls[0];
      expect(spRolePairs(rows)).toEqual([
        ['SP06', 'CONTRIBUTING'],
        ['SP09', 'PRIMARY'],
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // listIndicators
  // ---------------------------------------------------------------------------
  describe('listIndicators', () => {
    const baseContext = {
      result_id: 19792,
      result_official_code: 19792,
      is_pool_funding_contributor: true,
      is_synced_to_prms: false,
      platform_code: 'STAR',
    };

    it('returns [] when alignment has no contribution', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: false,
        selected_levers: [],
      });

      const out = await service.listIndicators(19792, '19792', {}, user);
      expect(out).toEqual([]);
      expect(findStaleMappings).not.toHaveBeenCalled();
    });

    it('groups stale mappings by lever_code under each selected lever', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'SP01' },
          { lever_code: 'SP02', lever_name: 'SP02' },
        ],
      });
      findAllCatalog.mockResolvedValueOnce([]);
      findStaleMappings.mockResolvedValueOnce([
        {
          id: 1,
          result_id: 19792,
          lever_code: 'SP01',
          indicator_code: 'IND-A',
          indicator_type: 'output',
          is_stale: true,
        },
        {
          id: 2,
          result_id: 19792,
          lever_code: 'SP02',
          indicator_code: 'IND-B',
          indicator_type: 'outcome',
          is_stale: true,
        },
      ]);

      const out = await service.listIndicators(19792, '19792', {}, user);

      expect(out).toHaveLength(2);
      expect(out[0]).toMatchObject({
        lever_code: 'SP01',
        indicators: [
          expect.objectContaining({ indicator_code: 'IND-A', is_stale: true }),
        ],
      });
      expect(out[1]).toMatchObject({
        lever_code: 'SP02',
        indicators: [expect.objectContaining({ indicator_code: 'IND-B' })],
      });
    });

    it('filters by indicator_type when supplied', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });
      findAllCatalog.mockResolvedValueOnce([]);
      findStaleMappings.mockResolvedValueOnce([
        {
          id: 1,
          result_id: 19792,
          lever_code: 'SP01',
          indicator_code: 'IND-A',
          indicator_type: 'output',
          is_stale: true,
        },
        {
          id: 2,
          result_id: 19792,
          lever_code: 'SP01',
          indicator_code: 'IND-B',
          indicator_type: 'outcome',
          is_stale: true,
        },
      ]);

      const out = await service.listIndicators(
        19792,
        '19792',
        { indicator_type: 'output' },
        user,
      );

      // Only the 'output' indicator survives the filter.
      expect(out[0].indicators.map((i) => i.indicator_code)).toEqual(['IND-A']);
    });
  });

  // ---------------------------------------------------------------------------
  // upsertContribution
  // ---------------------------------------------------------------------------
  describe('upsertContribution', () => {
    const baseContext = {
      result_id: 19792,
      result_official_code: 19792,
      version_id: 1,
      is_pool_funding_contributor: true,
      is_synced_to_prms: false,
      platform_code: 'STAR',
    };

    it('runs the transaction on the happy path', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });
      findActiveMapping.mockResolvedValueOnce(null);

      const out = await service.upsertContribution(
        19792,
        '19792',
        'IND-001',
        { indicator_type: 'NOOP', narrative: 'x' } as never,
        user,
        'SP01',
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(noopHandler.upsert).toHaveBeenCalledTimes(1);
      expect(out).toMatchObject({
        result_code: '19792',
        lever_code: 'SP01',
        indicator_code: 'IND-001',
        indicator_type: 'NOOP',
      });
    });

    it('throws when the indicator_type does not match any registered handler', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });

      await expect(
        service.upsertContribution(
          19792,
          '19792',
          'IND-001',
          { indicator_type: 'NOT_A_REAL_TYPE' } as never,
          user,
          'SP01',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('throws when the lever is not part of the active alignment', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });

      let thrown: HttpException | undefined;
      try {
        await service.upsertContribution(
          19792,
          '19792',
          'IND-001',
          { indicator_type: 'NOOP' } as never,
          user,
          'SP99', // not in selected_levers
        );
      } catch (err) {
        thrown = err as HttpException;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteContribution
  // ---------------------------------------------------------------------------
  describe('deleteContribution', () => {
    const baseContext = {
      result_id: 19792,
      result_official_code: 19792,
      version_id: 1,
      is_pool_funding_contributor: true,
      is_synced_to_prms: false,
      platform_code: 'STAR',
    };

    it('deletes the previous mapping and runs the transaction', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });
      findActiveMapping.mockResolvedValueOnce({
        id: 7,
        result_id: 19792,
        lever_code: 'SP01',
        indicator_code: 'IND-001',
        indicator_type: 'NOOP',
      });

      await service.deleteContribution(19792, '19792', 'IND-001', user, 'SP01');

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(noopHandler.delete).toHaveBeenCalledTimes(1);
    });

    it('throws 404 when there is no mapping to delete', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });
      findActiveMapping.mockResolvedValueOnce(null);

      await expect(
        service.deleteContribution(19792, '19792', 'IND-001', user, 'SP01'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(transaction).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// ResultPoolFundingAlignmentRepository.findActiveAlignmentByResultId —
// sp_roles LEFT JOIN null-sp_code guard (RA-08)
//
// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-08 / R-BIL-123
//
// This is deliberately a REPOSITORY-level test, not a `BilateralService`
// test with `findActiveAlignmentByResultId` mocked: the eligibility-gate
// test above and this one are NOT interchangeable (both would show `[]` in
// the passing case), and asserting on a mock's own canned return would be
// tautological — the actual guard being proven here is inside
// `result-pool-funding-alignment.repository.ts`, filtering the raw row
// shape a real LEFT JOIN produces when an alignment has zero active SP
// rows (one row, with `sp_code`/`sp_role` NULL, same shape `selected_levers`
// already guards against via `Boolean(row.lever_code)`).
//
// A dedicated repository spec FILE (`result-pool-funding-alignment
// .repository.spec.ts`) is T-09's scope (NFR-BIL-122's query-count
// assertion + R-BIL-123 AC.3); this single targeted test stays in this
// file per T-08's own task instructions and does not create that file.
// ---------------------------------------------------------------------------
describe('ResultPoolFundingAlignmentRepository — sp_roles LEFT JOIN null-sp_code guard (T-08 / RA-08)', () => {
  it('an alignment with zero active SP rows yields sp_roles: [] and selected_levers: [], not a phantom { sp_code: null } member', async () => {
    const dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    const repository = new ResultPoolFundingAlignmentRepository(dataSource);

    // The raw row shape a real LEFT JOIN with zero active
    // `result_pool_funding_alignment_sp` rows actually produces: exactly
    // one row, carrying the parent alignment's columns, with every
    // rpfas.* column (including sp_code and sp_role) NULL.
    jest.spyOn(repository, 'query').mockResolvedValue([
      {
        id: 501,
        result_id: 19792,
        has_contribution: 1,
        lever_code: null,
        lever_name: null,
        sp_code: null,
        sp_role: null,
      },
    ]);

    const out = await repository.findActiveAlignmentByResultId(19792);

    expect(out?.selected_levers).toEqual([]);
    expect(out?.sp_roles).toEqual([]);
  });

  it('a mixed result (one active SP row) keeps only the non-null sp_code entry in sp_roles', async () => {
    const dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    const repository = new ResultPoolFundingAlignmentRepository(dataSource);

    jest.spyOn(repository, 'query').mockResolvedValue([
      {
        id: 501,
        result_id: 19792,
        has_contribution: 1,
        lever_code: 'SP06',
        lever_name: 'SP06',
        sp_code: 'SP06',
        sp_role: 'PRIMARY',
      },
    ]);

    const out = await repository.findActiveAlignmentByResultId(19792);

    expect(out?.sp_roles).toEqual([{ sp_code: 'SP06', sp_role: 'PRIMARY' }]);
  });

  // R-BIL-123 AC.3 — this MUST run against the real repository construction,
  // not a `BilateralService` test with `findActiveAlignmentByResultId`
  // mocked: a service-level fixture that hand-writes `selected_levers` as a
  // literal (as the `bilateral.service.spec.ts` "AC.3" test above does)
  // cannot detect `sp_role` being leaked onto `selected_levers` INSIDE the
  // repository — it only reflects whatever the mock was told to return.
  // (Verified empirically during T-08's falsification pass: leaking
  // `sp_role` onto `selected_levers` in the repository left that
  // service-level test green.) This test builds `selected_levers` from the
  // same raw row the `sp_roles` tests above use, so a leak shows up as an
  // unexpected key.
  it('AC.3 — selected_levers carries ONLY lever_code/lever_name; sp_role never leaks onto it, even though the same row supplies both', async () => {
    const dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    const repository = new ResultPoolFundingAlignmentRepository(dataSource);

    jest.spyOn(repository, 'query').mockResolvedValue([
      {
        id: 501,
        result_id: 19792,
        has_contribution: 1,
        lever_code: 'SP06',
        lever_name: 'SP06',
        sp_code: 'SP06',
        sp_role: 'PRIMARY',
      },
    ]);

    const out = await repository.findActiveAlignmentByResultId(19792);

    expect(out?.selected_levers).toEqual([
      { lever_code: 'SP06', lever_name: 'SP06' },
    ]);
    expect(Object.keys(out?.selected_levers[0] ?? {}).sort()).toEqual([
      'lever_code',
      'lever_name',
    ]);
  });
});
