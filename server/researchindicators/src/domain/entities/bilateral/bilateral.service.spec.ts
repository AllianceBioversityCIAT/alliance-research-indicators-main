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
          },
          {
            code: 'SP02',
            name: 'Sustainable Farming',
            category: 'Science programs',
            color: '#84cc16',
            icon_key: 'SP02',
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

    it('AC.1 + AC.3 — persists SP06 as PRIMARY and SP09 as CONTRIBUTING, exactly one row each (sp_codes keeps its meaning — Primary not sent twice)', async () => {
      findContext.mockResolvedValueOnce(eligibleContext());
      findActiveAlignment.mockResolvedValueOnce(null);

      const dto: UpdatePoolFundingAlignmentDto = {
        has_contribution: true,
        sp_codes: ['SP06', 'SP09'],
        primary_sp_code: 'SP06',
      };

      await expect(
        service.updateAlignment(19792, '19792', dto, user),
      ).resolves.toBeDefined();

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
