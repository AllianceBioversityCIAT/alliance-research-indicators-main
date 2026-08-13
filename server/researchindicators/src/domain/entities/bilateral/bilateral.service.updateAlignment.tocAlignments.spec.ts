import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
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
import { TocResult } from '../../tools/toc-integration/dto/toc-integration.types';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-092..095, R-BIL-097
//
// Focused smoke spec for the `toc_alignments[]` write path (design §6.3).
// T-08 owns the exhaustive write matrix; here the new branches are pinned:
//   1. Legacy body (no toc_alignments) — no gate, no catalog calls, no
//      per-SP upsert (R-BIL-097 AC.3 + regression).
//   2. Version gate — report_year ≠ 2026 + toc_alignments → 409
//      `toc_mapping_version_locked`, nothing persisted (R-BIL-097 AC.2).
//   3. Happy path — "Yes" row upserted with catalog snapshots, "No" row
//      with aligns_with_toc=false only (R-BIL-092 AC.2, R-BIL-095 AC.2).
//   4. Atomic 400 — multiple per-alignment errors collected into a single
//      `errors.toc_alignments` payload; nothing persisted (D-V2-8).
//   5. Cascade — dropping an SP from sp_codes deactivates its ToC row in
//      the same transaction, even on a legacy body (R-BIL-093 AC.1).

describe('BilateralService.updateAlignment — toc_alignments write path (T-06)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const emit = jest.fn();
  const transaction = jest.fn();
  const getTocResults = jest.fn();
  const findActiveTocRows = jest.fn();
  const upsertForSp = jest.fn();
  const deactivateForSps = jest.fn();

  const baseContext = (overrides: Partial<Record<string, unknown>> = {}) => ({
    result_id: 19792,
    result_official_code: 19792,
    result_status_id: 1,
    version_id: 1,
    report_year_id: 2026,
    // Capacity Sharing for Development → allowed_levels ['OUTPUT'].
    indicator_id: 1,
    is_synced_to_prms: false,
    is_pool_funding_contributor: true,
    agresso_agreement_id: 'D527',
    platform_code: 'STAR',
    ...overrides,
  });

  const fakeManager = {
    getRepository: () =>
      ({
        update: jest.fn(),
        save: jest.fn().mockResolvedValue({ id: 1 }),
      }) as unknown as Repository<unknown>,
  } as unknown as EntityManager;

  const user: User = { sec_user_id: 42 } as User;

  // Handoff §2-shaped catalog fixture for (SP01, OUTPUT).
  const sp01OutputCatalog: TocResult[] = [
    {
      toc_result_id: 5187,
      toc_internal_id: 'x1',
      title: 'HLO title from catalog',
      description: 'desc',
      toc_type_id: 1,
      toc_level_id: 1,
      official_code: 'SP01',
      work_package_id: 'wp1',
      wp_short_name: 'AOW01',
      phase: '1',
      version_id: 'v1',
      indicators: [
        {
          indicator_id: 5972,
          toc_result_indicator_id: 'i1',
          related_node_id: 'n1',
          indicator_description: 'Indicator description from catalog',
          unit_messurament: 'Number of policies',
          type_value: 'custom',
          type_name: 'Custom',
          location: null,
          targets: [
            { target_value: '7', target_date: '2025' },
            { target_value: '10', target_date: '2026' },
          ],
        },
      ],
    },
  ];

  beforeEach(async () => {
    transaction.mockImplementation(async (cb) => cb(fakeManager));
    findActiveTocRows.mockResolvedValue([]);
    upsertForSp.mockResolvedValue({ id: 1 });
    deactivateForSps.mockResolvedValue(0);

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
        { provide: CapacitySharingBilateralIndicatorTypeHandler, useValue: {} },
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
          useValue: { findAll: jest.fn().mockResolvedValue([]) },
        },
        { provide: ClarisaProjectsService, useValue: {} },
        {
          provide: ClarisaCgiarEntitiesService,
          useValue: { getAreasOfWorkBySp: jest.fn() },
        },
        { provide: PrmsTocService, useValue: {} },
        { provide: TocIntegrationService, useValue: { getTocResults } },
        { provide: BilateralProjectMappingService, useValue: {} },
      ],
    }).compile();

    service = module.get(BilateralService);

    // Short-circuit the read-back + SP validation chain — covered elsewhere.
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

  afterEach(() => jest.clearAllMocks());

  it('legacy body (no toc_alignments) — no version gate, no catalog call, no per-SP upsert (R-BIL-097 AC.3)', async () => {
    // Out-of-version result: the gate must NOT fire on a legacy body.
    findContext.mockResolvedValue(baseContext({ report_year_id: 2024 }));
    findActiveAlignment.mockResolvedValue(null);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'],
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, user),
    ).resolves.toBeDefined();

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(getTocResults).not.toHaveBeenCalled();
    expect(upsertForSp).not.toHaveBeenCalled();
    expect(deactivateForSps).not.toHaveBeenCalled();
  });

  it('version gate — toc_alignments on a non-2026 live version → 409 toc_mapping_version_locked, nothing persisted (R-BIL-097 AC.2)', async () => {
    findContext.mockResolvedValue(baseContext({ report_year_id: 2025 }));
    findActiveAlignment.mockResolvedValue(null);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'],
      toc_alignments: [
        {
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5187,
          indicator_id: 5972,
          quantitative_contribution: 3,
        },
      ],
    };

    let thrown: HttpException | undefined;
    try {
      await service.updateAlignment(19792, '19792', dto, user);
    } catch (err) {
      thrown = err as HttpException;
    }

    expect(thrown).toBeInstanceOf(ConflictException);
    const response = thrown!.getResponse() as {
      message: { code: string };
    };
    expect(response.message.code).toBe('toc_mapping_version_locked');
    expect(transaction).not.toHaveBeenCalled();
    expect(upsertForSp).not.toHaveBeenCalled();
    expect(getTocResults).not.toHaveBeenCalled();
  });

  it('happy path — "Yes" upserts catalog snapshots, "No" upserts aligns_with_toc=false (R-BIL-092, R-BIL-095)', async () => {
    findContext.mockResolvedValue(baseContext());
    findActiveAlignment.mockResolvedValue(null);
    getTocResults.mockResolvedValue(sp01OutputCatalog);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01', 'SP03'],
      toc_alignments: [
        {
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5187,
          indicator_id: 5972,
          quantitative_contribution: 3,
        },
        { sp_code: 'SP03', aligns_with_toc: false },
      ],
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, user),
    ).resolves.toBeDefined();

    // Catalog fetched only for the referenced (SP01, OUTPUT) combo.
    expect(getTocResults).toHaveBeenCalledTimes(1);
    expect(getTocResults).toHaveBeenCalledWith('SP01', 'OUTPUT');

    expect(upsertForSp).toHaveBeenCalledTimes(2);
    expect(upsertForSp).toHaveBeenNthCalledWith(
      1,
      {
        result_id: 19792,
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5187,
        indicator_id: 5972,
        quantitative_contribution: 3,
        // Snapshots copied verbatim from the validated catalog entry,
        // target resolved for 2026 (R-BIL-095 AC.2, D-V2-4).
        toc_result_title: 'HLO title from catalog',
        indicator_description: 'Indicator description from catalog',
        unit_messurament: 'Number of policies',
        target_value: '10',
        target_year: 2026,
      },
      42,
      fakeManager,
    );
    expect(upsertForSp).toHaveBeenNthCalledWith(
      2,
      {
        result_id: 19792,
        sp_code: 'SP03',
        aligns_with_toc: false,
      },
      42,
      fakeManager,
    );
    expect(deactivateForSps).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('atomic 400 — all per-alignment errors collected, nothing persisted (R-BIL-094, D-V2-8)', async () => {
    findContext.mockResolvedValue(baseContext());
    findActiveAlignment.mockResolvedValue(null);
    getTocResults.mockResolvedValue(sp01OutputCatalog);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01', 'SP03'],
      toc_alignments: [
        // level OUTCOME is not allowed for capacity_sharing → level_not_allowed.
        {
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTCOME',
          toc_result_id: 5187,
          indicator_id: 5972,
        },
        // SP99 is not in the effective sp_codes → sp_not_selected.
        { sp_code: 'SP99', aligns_with_toc: false },
      ],
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
        toc_alignments: { sp_code: string; field: string; error: string }[];
      };
    };
    expect(response.message.toc_alignments).toEqual(
      expect.arrayContaining([
        { sp_code: 'SP01', field: 'level', error: 'level_not_allowed' },
        { sp_code: 'SP99', field: 'sp_code', error: 'sp_not_selected' },
      ]),
    );
    expect(response.message.toc_alignments).toHaveLength(2);
    expect(transaction).not.toHaveBeenCalled();
    expect(upsertForSp).not.toHaveBeenCalled();
  });

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-07 / R-BIL-096 AC.2
  //
  // PATCH response ≡ GET is guaranteed by MECHANISM, not by parallel
  // mapping code: updateAlignment's return value IS the post-commit
  // `getAlignment` read-back. This test pins that reuse — if someone
  // ever builds the PATCH response separately, it breaks.
  it('PATCH response ≡ GET — updateAlignment returns the getAlignment read-back verbatim, toc_alignments + version_locked included (R-BIL-096 AC.2)', async () => {
    findContext.mockResolvedValue(baseContext());
    findActiveAlignment.mockResolvedValue(null);
    getTocResults.mockResolvedValue(sp01OutputCatalog);

    const readBack = {
      result_code: '19792',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: true,
      selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      selected_science_programs: [],
      is_synced_to_prms: false,
      is_read_only: false,
      version_locked: false,
      toc_alignments: [
        {
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5187,
          indicator_id: 5972,
          quantitative_contribution: 3,
          toc_result_title: 'HLO title from catalog',
          indicator_description: 'Indicator description from catalog',
          unit_of_measurement: 'Number of policies',
          target_value: '10',
          target_year: 2026,
        },
      ],
    };
    (service.getAlignment as jest.Mock).mockResolvedValueOnce(readBack);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'],
      toc_alignments: [
        {
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5187,
          indicator_id: 5972,
          quantitative_contribution: 3,
        },
      ],
    };

    const out = await service.updateAlignment(19792, '19792', dto, user);

    // Same object the read path produced — single mapping path (D-V2-5).
    expect(out).toBe(readBack);
    expect(service.getAlignment).toHaveBeenCalledTimes(1);
    expect(service.getAlignment).toHaveBeenCalledWith(19792, '19792', user);
    expect(out.version_locked).toBe(false);
    expect(out.toc_alignments).toHaveLength(1);
  });

  it('cascade — dropping an SP from sp_codes deactivates its ToC row even on a legacy body (R-BIL-093 AC.1)', async () => {
    findContext.mockResolvedValue(baseContext());
    findActiveAlignment.mockResolvedValue(null);
    findActiveTocRows.mockResolvedValue([
      { id: 10, sp_code: 'SP01' },
      { id: 11, sp_code: 'SP03' },
    ]);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'], // SP03 deselected; no toc_alignments in the body
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
    expect(upsertForSp).not.toHaveBeenCalled();
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-01 / R-BIL-125 AC.4
  //
  // Characterisation pin, added BEFORE the Primary/Contributing role change
  // lands (design.md §5.3 "What deliberately does not change"): the
  // SP-deselection cascade is keyed ONLY off an SP leaving `sp_codes`. This
  // is the "stays ⇒ untouched" half — the "leaves ⇒ deactivated" half is
  // the test immediately above.
  it('does NOT deactivate a ToC row when its SP stays in sp_codes (R-BIL-125 AC.4 — T-01 cascade pin)', async () => {
    findContext.mockResolvedValue(baseContext());
    findActiveAlignment.mockResolvedValue(null);
    findActiveTocRows.mockResolvedValue([
      { id: 10, sp_code: 'SP01' },
      { id: 11, sp_code: 'SP03' },
    ]);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01', 'SP03'], // both stay selected; no toc_alignments
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, user),
    ).resolves.toBeDefined();

    expect(deactivateForSps).not.toHaveBeenCalled();
    expect(upsertForSp).not.toHaveBeenCalled();
  });

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-08 / R-BIL-092..097, NFR-BIL-090
  //
  // Exhaustive write matrix on top of the T-06 smoke tests above (tasks.md
  // T-08, design §11). Fixtures keep handoff-§2 parity with the read-path
  // specs: toc_result_id 5187, indicator 5972, `unit_messurament: 'Number'`,
  // 2026 target ("10", "2026"). Indicator 6001 is the requirements §6
  // "per-SP independence" scenario's re-submit target.
  describe('T-08 — full write matrix (R-BIL-092..097, NFR-BIL-090)', () => {
    const handoffCatalog: TocResult[] = [
      {
        toc_result_id: 5187,
        toc_internal_id: '3ca9f07b-…',
        title: 'HLO1.AOW1.IO1 Steer to impact',
        description: 'Market intelligence is packaged into…',
        toc_type_id: null,
        toc_level_id: null,
        official_code: 'SP01',
        work_package_id: 'd65e4401-…',
        wp_short_name: 'AOW01',
        phase: '99134294-…',
        version_id: '7e94b127-…',
        indicators: [
          {
            indicator_id: 5972,
            toc_result_indicator_id: '76f57e62-…',
            related_node_id: '70f1200f-…',
            indicator_description: 'Number of new market intelligence briefs',
            unit_messurament: 'Number',
            type_value: 'Number of knowledge products',
            type_name: 'Number of knowledge products',
            location: 'global',
            targets: [
              { target_value: '7', target_date: '2025' },
              { target_value: '10', target_date: '2026' },
            ],
          },
          {
            // Requirements §6 R-BIL-092 scenario: the indicator the
            // contributor switches SP01 to on the second PATCH.
            indicator_id: 6001,
            toc_result_indicator_id: '76f57e63-…',
            related_node_id: '70f12010-…',
            indicator_description: 'Number of events with MI evidence',
            unit_messurament: 'Number',
            type_value: 'custom',
            type_name: 'custom',
            location: 'global',
            targets: [{ target_value: '4', target_date: '2026' }],
          },
        ],
      },
    ];

    const sp01Yes = (indicatorId = 5972, contribution = 3) => ({
      sp_code: 'SP01',
      aligns_with_toc: true,
      level: 'OUTPUT' as const,
      toc_result_id: 5187,
      indicator_id: indicatorId,
      quantitative_contribution: contribution,
    });

    const patchDto = (
      tocAlignments: UpdatePoolFundingAlignmentDto['toc_alignments'],
      spCodes: string[] = ['SP01', 'SP03'],
    ): UpdatePoolFundingAlignmentDto => ({
      has_contribution: true,
      sp_codes: spCodes,
      toc_alignments: tocAlignments,
    });

    const expectAtomic400 = async (
      dto: UpdatePoolFundingAlignmentDto,
    ): Promise<{ sp_code: string; field: string; error: string }[]> => {
      let thrown: HttpException | undefined;
      try {
        await service.updateAlignment(19792, '19792', dto, user);
      } catch (err) {
        thrown = err as HttpException;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      // Atomic (D-V2-8): nothing reaches the transaction, nothing persists.
      expect(transaction).not.toHaveBeenCalled();
      expect(upsertForSp).not.toHaveBeenCalled();
      expect(deactivateForSps).not.toHaveBeenCalled();

      const response = thrown!.getResponse() as {
        message: {
          toc_alignments: { sp_code: string; field: string; error: string }[];
        };
      };
      return response.message.toc_alignments;
    };

    beforeEach(() => {
      findContext.mockResolvedValue(baseContext());
      findActiveAlignment.mockResolvedValue(null);
      getTocResults.mockResolvedValue(handoffCatalog);
    });

    // -----------------------------------------------------------------------
    // R-BIL-092 — per-SP ToC alignment write
    // -----------------------------------------------------------------------
    describe('R-BIL-092 — per-SP write independence + upsert semantics', () => {
      it('AC.1 — PATCH for SP01+SP03 then PATCH changing only SP01: second call writes ONLY SP01, SP03 row never touched', async () => {
        // First PATCH: alignments for both SPs.
        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Yes(), { sp_code: 'SP03', aligns_with_toc: false }]),
          user,
        );
        expect(upsertForSp).toHaveBeenCalledTimes(2);

        // Saved state now has both rows active.
        upsertForSp.mockClear();
        deactivateForSps.mockClear();
        findActiveTocRows.mockResolvedValue([
          { id: 10, sp_code: 'SP01' },
          { id: 11, sp_code: 'SP03' },
        ]);

        // Second PATCH: only SP01 in toc_alignments (SP03 stays selected).
        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Yes(6001, 5)]),
          user,
        );

        // Exactly one write, for SP01 only — no write, no deactivation ever
        // issued for the absent SP03 (no deactivate-all-recreate).
        expect(upsertForSp).toHaveBeenCalledTimes(1);
        expect(upsertForSp.mock.calls[0][0].sp_code).toBe('SP01');
        expect(
          upsertForSp.mock.calls.some((call) => call[0].sp_code === 'SP03'),
        ).toBe(false);
        expect(deactivateForSps).not.toHaveBeenCalled();
      });

      it('AC.2 — { sp_code, aligns_with_toc: false } upserts the explicit "No" with NO ToC refs or snapshots, zero catalog calls', async () => {
        await service.updateAlignment(
          19792,
          '19792',
          patchDto([{ sp_code: 'SP03', aligns_with_toc: false }]),
          user,
        );

        // Exact payload: nothing beyond the "No" answer — the repository
        // nulls level/toc_result_id/indicator_id + every snapshot column
        // (pinned in the T-05 repository spec).
        expect(upsertForSp).toHaveBeenCalledTimes(1);
        expect(upsertForSp).toHaveBeenCalledWith(
          {
            result_id: 19792,
            sp_code: 'SP03',
            aligns_with_toc: false,
          },
          42,
          fakeManager,
        );
        // "No" entries never consult the catalog.
        expect(getTocResults).not.toHaveBeenCalled();
      });

      it('AC.3 — re-submitting the same SP with a different indicator routes through upsertForSp for that single (result, sp) row with the new snapshots', async () => {
        // SP01 already has a saved active row (5972).
        findActiveTocRows.mockResolvedValue([
          { id: 10, sp_code: 'SP01', indicator_id: 5972 },
        ]);

        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Yes(6001, 5)], ['SP01']),
          user,
        );

        // Single upsert keyed (result, sp) — update-in-place semantics live
        // in the repository (T-05 spec); the service passes the new
        // indicator + its 2026-resolved snapshots through verbatim.
        expect(upsertForSp).toHaveBeenCalledTimes(1);
        expect(upsertForSp).toHaveBeenCalledWith(
          {
            result_id: 19792,
            sp_code: 'SP01',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 5187,
            indicator_id: 6001,
            quantitative_contribution: 5,
            toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
            indicator_description: 'Number of events with MI evidence',
            unit_messurament: 'Number',
            target_value: '4',
            target_year: 2026,
          },
          42,
          fakeManager,
        );
      });
    });

    // -----------------------------------------------------------------------
    // R-BIL-093 — SP removal cascade + fresh re-add
    // -----------------------------------------------------------------------
    describe('R-BIL-093 — cascade + fresh re-add', () => {
      it('AC.1 — PATCH dropping SP03 from sp_codes (toc_alignments present) deactivates SP03 inside the transaction', async () => {
        findActiveTocRows.mockResolvedValue([
          { id: 10, sp_code: 'SP01' },
          { id: 11, sp_code: 'SP03' },
        ]);

        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Yes()], ['SP01']), // SP03 deselected
          user,
        );

        expect(deactivateForSps).toHaveBeenCalledTimes(1);
        // `fakeManager` = the cascade runs inside the same transaction as
        // the upsert (design §6.3 step 5).
        expect(deactivateForSps).toHaveBeenCalledWith(
          19792,
          ['SP03'],
          42,
          fakeManager,
        );
        expect(upsertForSp).toHaveBeenCalledTimes(1);
        expect(upsertForSp.mock.calls[0][0].sp_code).toBe('SP01');
      });

      it('AC.2 — re-adding SP03 without a toc_alignments entry starts fresh: no upsert for SP03, no auto-revive of the deactivated row', async () => {
        // SP03's old row is inactive → the active-only repository read
        // excludes it (repository contract, T-05 spec). Only SP01 is live.
        findActiveTocRows.mockResolvedValue([{ id: 10, sp_code: 'SP01' }]);

        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Yes()], ['SP01', 'SP03']), // SP03 re-added
          user,
        );

        // SP03 gets NO write of any kind — its deactivated row stays dead
        // and read-back (active rows only) keeps excluding it.
        expect(
          upsertForSp.mock.calls.some((call) => call[0].sp_code === 'SP03'),
        ).toBe(false);
        expect(deactivateForSps).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // R-BIL-094 — per-alignment validation (atomic 400s)
    // -----------------------------------------------------------------------
    describe('R-BIL-094 — per-alignment validation errors', () => {
      it('AC.1 — unknown indicator_id for SP01 + valid SP03 entry → single 400 identifying SP01/indicator_id; the valid SP03 entry is NOT persisted', async () => {
        const errors = await expectAtomic400(
          patchDto([
            sp01Yes(9999), // not in the (SP01, OUTPUT) catalog
            { sp_code: 'SP03', aligns_with_toc: false }, // valid
          ]),
        );

        expect(errors).toEqual([
          {
            sp_code: 'SP01',
            field: 'indicator_id',
            error: 'unknown_indicator_id',
          },
        ]);
      });

      it('AC.2 — level OUTCOME on a Capacity Sharing result → 400 level_not_allowed, catalog never consulted for that entry', async () => {
        const errors = await expectAtomic400(
          patchDto([{ ...sp01Yes(), level: 'OUTCOME' }]),
        );

        expect(errors).toEqual([
          { sp_code: 'SP01', field: 'level', error: 'level_not_allowed' },
        ]);
        // Disallowed-level entries never reach the catalog check —
        // read and write share the same rule table (R-BIL-091 AC.3).
        expect(getTocResults).not.toHaveBeenCalled();
      });

      it('AC.3 — unknown SP code still returns the legacy errors.unknown_sp_codes array (regression, toc_alignments present)', async () => {
        let thrown: HttpException | undefined;
        try {
          await service.updateAlignment(
            19792,
            '19792',
            patchDto([sp01Yes()], ['SP01', 'SP77']), // SP77 unknown
            user,
          );
        } catch (err) {
          thrown = err as HttpException;
        }

        expect(thrown).toBeInstanceOf(BadRequestException);
        const response = thrown!.getResponse() as {
          message: { unknown_sp_codes: string[] };
        };
        expect(response.message.unknown_sp_codes).toEqual(['SP77']);
        // Legacy contract fires BEFORE the ToC machinery: no gate, no
        // catalog call, nothing persisted.
        expect(getTocResults).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
        expect(upsertForSp).not.toHaveBeenCalled();
      });

      it('error code: duplicate_sp_code — repeated sp_code entries collapse into one per-SP error', async () => {
        const errors = await expectAtomic400(
          patchDto([
            { sp_code: 'SP01', aligns_with_toc: false },
            { sp_code: 'SP01', aligns_with_toc: false },
          ]),
        );

        expect(errors).toEqual([
          { sp_code: 'SP01', field: 'sp_code', error: 'duplicate_sp_code' },
        ]);
      });

      it('error code: sp_not_selected — alignment for an SP outside the effective sp_codes', async () => {
        const errors = await expectAtomic400(
          patchDto([{ sp_code: 'SP99', aligns_with_toc: false }]),
        );

        expect(errors).toEqual([
          { sp_code: 'SP99', field: 'sp_code', error: 'sp_not_selected' },
        ]);
        expect(getTocResults).not.toHaveBeenCalled();
      });

      it('error code: missing_required_fields — bare "Yes" names both floor fields, level + toc_result_id, and ONLY those (R-BIL-111 §5.1, R-BIL-111 AC.4)', async () => {
        const errors = await expectAtomic400(
          patchDto([{ sp_code: 'SP01', aligns_with_toc: true }]),
        );

        // Required floor for aligns_with_toc: true is level + toc_result_id
        // ONLY (D-C1-3) — indicator_id is optional and must NOT appear here.
        expect(errors).toEqual([
          {
            sp_code: 'SP01',
            field: 'level',
            error: 'missing_required_fields',
          },
          {
            sp_code: 'SP01',
            field: 'toc_result_id',
            error: 'missing_required_fields',
          },
        ]);
      });

      it('error code: missing_required_fields — a single missing floor field yields exactly one entry naming it', async () => {
        const errors = await expectAtomic400(
          patchDto([
            {
              sp_code: 'SP01',
              aligns_with_toc: true,
              level: 'OUTPUT',
              // toc_result_id missing
            },
          ]),
        );

        expect(errors).toEqual([
          {
            sp_code: 'SP01',
            field: 'toc_result_id',
            error: 'missing_required_fields',
          },
        ]);
      });

      it('error code: unknown_toc_result_id — toc_result_id absent from the (SP, level) catalog', async () => {
        const errors = await expectAtomic400(
          patchDto([{ ...sp01Yes(), toc_result_id: 9999 }]),
        );

        expect(errors).toEqual([
          {
            sp_code: 'SP01',
            field: 'toc_result_id',
            error: 'unknown_toc_result_id',
          },
        ]);
      });

      it('error code: unknown_indicator_id — indicator absent under a valid toc_result', async () => {
        const errors = await expectAtomic400(patchDto([sp01Yes(9999)]));

        expect(errors).toEqual([
          {
            sp_code: 'SP01',
            field: 'indicator_id',
            error: 'unknown_indicator_id',
          },
        ]);
      });
    });

    // -----------------------------------------------------------------------
    // R-BIL-095 — snapshots: populated on "Yes", null on "No", drift-proof
    // -----------------------------------------------------------------------
    describe('R-BIL-095 — display snapshots', () => {
      it('AC.2 — "Yes" upsert carries every snapshot field from the catalog; "No" upsert carries none (exact payloads)', async () => {
        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Yes(), { sp_code: 'SP03', aligns_with_toc: false }]),
          user,
        );

        expect(upsertForSp).toHaveBeenNthCalledWith(
          1,
          {
            result_id: 19792,
            sp_code: 'SP01',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 5187,
            indicator_id: 5972,
            quantitative_contribution: 3,
            // All five snapshot fields, catalog-verbatim, 2026-resolved
            // target — `unit_messurament` keeps the upstream spelling at
            // rest (D-V2-4).
            toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
            indicator_description: 'Number of new market intelligence briefs',
            unit_messurament: 'Number',
            target_value: '10',
            target_year: 2026,
          },
          42,
          fakeManager,
        );
        // The "No" payload has NO snapshot keys at all — the repository
        // nulls every ToC/snapshot column (T-05 spec pins the nulling).
        expect(upsertForSp).toHaveBeenNthCalledWith(
          2,
          { result_id: 19792, sp_code: 'SP03', aligns_with_toc: false },
          42,
          fakeManager,
        );
      });

      it('AC.1 + R-BIL-096 AC.1 — save → upstream goes empty → read-back still serves the saved snapshots (SP01 "Yes" + SP03 "No"), zero upstream calls', async () => {
        // Real read-back for this test: the saved rows round-trip through
        // an in-memory store standing in for the snapshot table.
        (service.getAlignment as unknown as jest.SpyInstance).mockRestore();
        const savedRows: Record<string, unknown>[] = [];
        upsertForSp.mockImplementation(async (input) => {
          savedRows.push({ id: savedRows.length + 1, ...input });
          return savedRows[savedRows.length - 1];
        });
        findActiveTocRows.mockImplementation(async () => savedRows);

        const patchResponse = await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Yes(), { sp_code: 'SP03', aligns_with_toc: false }]),
          user,
        );

        const expectedTocAlignments = [
          {
            sp_code: 'SP01',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 5187,
            indicator_id: 5972,
            quantitative_contribution: 3,
            toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
            indicator_description: 'Number of new market intelligence briefs',
            // Wire rename from the stored `unit_messurament` (D-V2-4).
            unit_of_measurement: 'Number',
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
        ];
        expect(patchResponse.toc_alignments).toEqual(expectedTocAlignments);

        // Upstream catalog drifts to empty AFTER the save.
        getTocResults.mockClear();
        getTocResults.mockResolvedValue([]);

        const getResponse = await service.getAlignment(19792, '19792', user);

        // Saved titles/values survive the drift (R-BIL-095 AC.1) and the
        // GET returns SP01 ("Yes" + snapshots) and SP03 ("No")
        // (R-BIL-096 AC.1) without ever consulting upstream.
        expect(getResponse.toc_alignments).toEqual(expectedTocAlignments);
        expect(getTocResults).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // R-BIL-097 — version gate (write side; 409 + legacy bypass are pinned
    // in the T-06 smoke tests above)
    // -----------------------------------------------------------------------
    describe('R-BIL-097 — version gate', () => {
      it('AC.1 — result on live version 2026 (driver string form): PATCH with toc_alignments succeeds and persists', async () => {
        // String report_year_id pins the Number(...) coercion on the gate.
        findContext.mockResolvedValue(baseContext({ report_year_id: '2026' }));

        await expect(
          service.updateAlignment(19792, '19792', patchDto([sp01Yes()]), user),
        ).resolves.toBeDefined();

        expect(transaction).toHaveBeenCalledTimes(1);
        expect(upsertForSp).toHaveBeenCalledTimes(1);
        expect(emit).toHaveBeenCalledTimes(1);
      });
    });

    // -----------------------------------------------------------------------
    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-04
    // R-BIL-130 — the shipped 409 version gate keeps firing before Primary
    // validation (T-06, not yet landed). The gate now lives at the call
    // site (`assertTocMappingVersionUnlocked`, ahead of `validateTocAlignments`)
    // instead of inside it — see design.md §4 step 2.
    // -----------------------------------------------------------------------
    describe('R-BIL-130 — version gate vs Primary validation ordering (T-04)', () => {
      it('AC.1 — has_contribution:true + toc_alignments present + non-2026 live version + no primary_sp_code → 409 toc_mapping_version_locked, NOT 400 (report_year_id: 2025)', async () => {
        findContext.mockResolvedValue(baseContext({ report_year_id: 2025 }));

        let thrown: HttpException | undefined;
        try {
          await service.updateAlignment(
            19792,
            '19792',
            patchDto([sp01Yes()]),
            user,
          );
        } catch (err) {
          thrown = err as HttpException;
        }

        expect(thrown).toBeInstanceOf(ConflictException);
        // Assert the actual error code, not merely the HTTP status — a
        // reordering defect could still surface as a 409 with a different
        // code (or with a different exception type entirely).
        const response = thrown!.getResponse() as {
          message: { code: string };
        };
        expect(response.message.code).toBe('toc_mapping_version_locked');
        // Nothing persisted: the gate fires before the transaction opens and
        // before any catalog lookup Primary validation would trigger.
        expect(transaction).not.toHaveBeenCalled();
        expect(upsertForSp).not.toHaveBeenCalled();
        expect(deactivateForSps).not.toHaveBeenCalled();
        expect(getTocResults).not.toHaveBeenCalled();
      });

      it('AC.3 — legacy body (no toc_alignments) on a non-2026 live version bypasses the gate entirely and validates normally (report_year_id: 2025)', async () => {
        // Falsification target for the "extracted unconditionally" wrong
        // implementation: if the call site dropped the `dto.toc_alignments`
        // guard, this legacy body would newly trip the gate and this test
        // would go red with a ConflictException instead of resolving.
        findContext.mockResolvedValue(baseContext({ report_year_id: 2025 }));

        const dto: UpdatePoolFundingAlignmentDto = {
          has_contribution: true,
          sp_codes: ['SP01', 'SP03'],
        };

        await expect(
          service.updateAlignment(19792, '19792', dto, user),
        ).resolves.toBeDefined();

        expect(transaction).toHaveBeenCalledTimes(1);
        expect(getTocResults).not.toHaveBeenCalled();
        expect(upsertForSp).not.toHaveBeenCalled();
        expect(deactivateForSps).not.toHaveBeenCalled();
      });

      // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-06 / R-BIL-130 AC.4
      //
      // Promoted from `it.todo` (T-04 forward obligation (a)): the version
      // gate does not fire on a live-2026 result (it is not locked), so this
      // proves Primary validation is NOT masked where the gate does not
      // apply — a real assertion, not adjacent behaviour.
      it('AC.4 — on a 2026 result, primary_sp_required still fires (the gate does not mask Primary validation where it does not apply)', async () => {
        findContext.mockResolvedValue(baseContext({ report_year_id: 2026 }));

        let thrown: HttpException | undefined;
        try {
          await service.updateAlignment(
            19792,
            '19792',
            patchDto([sp01Yes()]),
            user,
          );
        } catch (err) {
          thrown = err as HttpException;
        }

        expect(thrown).toBeInstanceOf(BadRequestException);
        const response = thrown!.getResponse() as {
          message: { primary_sp: { code: string } };
        };
        expect(response.message.primary_sp.code).toBe('primary_sp_required');
        expect(transaction).not.toHaveBeenCalled();
        expect(getTocResults).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // NFR-BIL-090 — validation-path cold-cache 503
    // -----------------------------------------------------------------------
    describe('NFR-BIL-090 — validation-path 503', () => {
      it('cold-cache catalog failure during validation → 503 propagates, transaction never entered, nothing persisted', async () => {
        getTocResults.mockRejectedValue(
          new ServiceUnavailableException(
            'ToC integration service unavailable',
          ),
        );

        await expect(
          service.updateAlignment(19792, '19792', patchDto([sp01Yes()]), user),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);

        expect(transaction).not.toHaveBeenCalled();
        expect(upsertForSp).not.toHaveBeenCalled();
        expect(deactivateForSps).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // T-03 — conditional validation + contribution_without_indicator
    // (R-BIL-111 §5.1, R-BIL-113, NFR-BIL-110). Scope note: T-03 owns
    // validation only (bilateral.service.ts validateTocAlignments,
    // roughly :855-990). Full non-throwing persistence of a partial row —
    // R-BIL-111 AC.1/AC.2 — is T-04's scope (the snapshot-construction
    // return map, ~:993-1019, still assumes a resolved indicator). Tests
    // below that need to prove "clears validation" for a null-indicator
    // entry therefore assert absence of BadRequestException + correct
    // catalog consultation, not a fully-resolved, non-throwing return —
    // see the scope note on the first such test.
    // -----------------------------------------------------------------------
    describe('T-03 — conditional validation + contribution_without_indicator (R-BIL-111 §5.1, R-BIL-113, NFR-BIL-110)', () => {
      it('validation layer: Level + HLO only (no indicator_id) clears validation — floor satisfied, catalog consulted for the (sp, level) combo, no BadRequestException (R-BIL-111 AC.4, R-BIL-113 AC.4)', async () => {
        let thrown: unknown;
        try {
          await service.updateAlignment(
            19792,
            '19792',
            patchDto(
              [
                {
                  sp_code: 'SP01',
                  aligns_with_toc: true,
                  level: 'OUTPUT',
                  toc_result_id: 5187,
                },
              ],
              ['SP01'],
            ),
            user,
          );
        } catch (err) {
          thrown = err;
        }

        // Scope note (T-03/T-04 split, design §6.1 vs §6.2): this proves the
        // entry clears VALIDATION — it is not rejected as
        // missing_required_fields or any other 400, and the catalog is
        // correctly consulted for its combo. It does not assert the call
        // completes without error end-to-end: the snapshot-construction
        // return map is T-04's scope and still assumes a resolved
        // indicator, so full non-throwing persistence of a null-indicator
        // row is proven by T-04, not here.
        expect(thrown).not.toBeInstanceOf(BadRequestException);
        expect(getTocResults).toHaveBeenCalledTimes(1);
        expect(getTocResults).toHaveBeenCalledWith('SP01', 'OUTPUT');
      });

      it('R-BIL-111 AC.4 — Level-only (toc_result_id absent) rejects with missing_required_fields naming toc_result_id, catalog never consulted', async () => {
        const errors = await expectAtomic400(
          patchDto(
            [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT' }],
            ['SP01'],
          ),
        );

        expect(errors).toEqual([
          {
            sp_code: 'SP01',
            field: 'toc_result_id',
            error: 'missing_required_fields',
          },
        ]);
        expect(getTocResults).not.toHaveBeenCalled();
      });

      it('R-BIL-111 — bare "Yes" (both floor fields absent) rejects naming level AND toc_result_id', async () => {
        const errors = await expectAtomic400(
          patchDto([{ sp_code: 'SP01', aligns_with_toc: true }], ['SP01']),
        );

        expect(errors).toEqual([
          { sp_code: 'SP01', field: 'level', error: 'missing_required_fields' },
          {
            sp_code: 'SP01',
            field: 'toc_result_id',
            error: 'missing_required_fields',
          },
        ]);
      });

      it('R-BIL-113 AC.4 — an absent indicator_id contributes NO error of any kind', async () => {
        const errors = await expectAtomic400(
          patchDto(
            [
              {
                sp_code: 'SP01',
                aligns_with_toc: true,
                level: 'OUTPUT',
                toc_result_id: 5187,
              }, // no indicator_id
              { sp_code: 'SP99', aligns_with_toc: false }, // forces the 400 without reaching the return map
            ],
            ['SP01'],
          ),
        );

        // SP01's absent indicator_id contributes NO error — the only
        // collected error is SP99's sp_not_selected.
        expect(errors).toEqual([
          { sp_code: 'SP99', field: 'sp_code', error: 'sp_not_selected' },
        ]);
        expect(getTocResults).toHaveBeenCalledWith('SP01', 'OUTPUT');
      });

      it('R-BIL-113 AC.6 — quantitative_contribution supplied without indicator_id → 400 contribution_without_indicator on quantitative_contribution, never missing_required_fields (D-C1-8)', async () => {
        const errors = await expectAtomic400(
          patchDto(
            [
              {
                sp_code: 'SP01',
                aligns_with_toc: true,
                level: 'OUTPUT',
                toc_result_id: 5187,
                quantitative_contribution: 12,
              },
            ],
            ['SP01'],
          ),
        );

        expect(errors).toEqual([
          {
            sp_code: 'SP01',
            field: 'quantitative_contribution',
            error: 'contribution_without_indicator',
          },
        ]);
        // Rejected on presence alone — no need to consult the catalog just
        // to reject a structural rule.
        expect(getTocResults).not.toHaveBeenCalled();
      });

      it('R-BIL-113 — "Relaxation does not admit garbage": a foreign indicator_id still rejects with unknown_indicator_id, and the identical request is accepted at the validation layer once indicator_id is omitted entirely', async () => {
        // Half 1 — a foreign indicator_id is still rejected.
        const errors = await expectAtomic400(
          patchDto([sp01Yes(9999)], ['SP01']),
        );
        expect(errors).toEqual([
          {
            sp_code: 'SP01',
            field: 'indicator_id',
            error: 'unknown_indicator_id',
          },
        ]);

        // Half 2 — same level/toc_result_id, indicator_id omitted: accepted
        // at the validation layer (see scope note above).
        getTocResults.mockClear();
        let thrown: unknown;
        try {
          await service.updateAlignment(
            19792,
            '19792',
            patchDto(
              [
                {
                  sp_code: 'SP01',
                  aligns_with_toc: true,
                  level: 'OUTPUT',
                  toc_result_id: 5187,
                },
              ],
              ['SP01'],
            ),
            user,
          );
        } catch (err) {
          thrown = err;
        }
        expect(thrown).not.toBeInstanceOf(BadRequestException);
      });

      it('D-V2-8 atomicity holds across the new floor and the new error code: any single failure in the batch blocks persistence for the whole batch', async () => {
        await expectAtomic400(
          patchDto(
            [
              { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT' }, // missing toc_result_id
              {
                sp_code: 'SP03',
                aligns_with_toc: true,
                level: 'OUTPUT',
                toc_result_id: 5187,
                quantitative_contribution: 5,
              }, // contribution_without_indicator
            ],
            ['SP01', 'SP03'],
          ),
        );
        // expectAtomic400 already asserts transaction/upsertForSp/
        // deactivateForSps were never called — pinning atomicity across
        // BOTH the untouched floor check and the new contribution guard in
        // the same batch.
      });

      describe('NFR-BIL-110 — fan-out stays deduplicated', () => {
        it('one getTocResults call per distinct (sp_code, level) combo on a mixed batch; a partial entry correctly contributes a call (0→1 — an intended increase, not a regression, design §6.1)', async () => {
          const errors = await expectAtomic400(
            patchDto(
              [
                // Partial — no indicator_id. Clears the floor, so it now
                // requires a catalog call to validate its toc_result_id.
                {
                  sp_code: 'SP01',
                  aligns_with_toc: true,
                  level: 'OUTPUT',
                  toc_result_id: 5187,
                },
                // Complete — unaffected by this spec.
                { ...sp01Yes(), sp_code: 'SP03' },
                // Forces the batch to 400 before construction, keeping this
                // test clear of the (out-of-scope) snapshot return map.
                { sp_code: 'SP99', aligns_with_toc: false },
              ],
              ['SP01', 'SP03'],
            ),
          );

          expect(errors).toEqual([
            { sp_code: 'SP99', field: 'sp_code', error: 'sp_not_selected' },
          ]);
          // One call per distinct (sp_code, level) combo — do NOT assert
          // zero calls for the partial SP01 entry (design §6.1 — that
          // would be a backwards, false-green assertion).
          expect(getTocResults).toHaveBeenCalledTimes(2);
          expect(getTocResults).toHaveBeenCalledWith('SP01', 'OUTPUT');
          expect(getTocResults).toHaveBeenCalledWith('SP03', 'OUTPUT');
        });

        it('zero getTocResults calls when every entry fails the required floor', async () => {
          const errors = await expectAtomic400(
            patchDto([
              { sp_code: 'SP01', aligns_with_toc: true }, // bare "Yes"
              { sp_code: 'SP03', aligns_with_toc: true, level: 'OUTPUT' }, // missing toc_result_id
            ]),
          );

          expect(
            errors.every((error) => error.error === 'missing_required_fields'),
          ).toBe(true);
          expect(getTocResults).not.toHaveBeenCalled();
        });
      });
    });

    // -----------------------------------------------------------------------
    // T-04 — partial snapshot construction (R-BIL-111 AC.1/AC.2/AC.5,
    // R-BIL-114 AC.1-3, R-BIL-118 AC.3). Closes the crash path T-03
    // deliberately left open: after T-03, a Level+HLO-only "Yes" clears
    // validation but the return map (bilateral.service.ts ~:1034-1060)
    // still destructured `indicator` unconditionally and dereferenced it —
    // `TypeError` on a full round trip. T-03's own scope note above says
    // this must be proven here, not there.
    // -----------------------------------------------------------------------
    describe('T-04 — partial snapshot construction (R-BIL-111 AC.1/AC.2/AC.5, R-BIL-114 AC.1-3, R-BIL-118 AC.3)', () => {
      const sp01Partial = () => ({
        sp_code: 'SP01',
        aligns_with_toc: true as const,
        level: 'OUTPUT' as const,
        toc_result_id: 5187,
        // no indicator_id — Level + HLO floor only.
      });

      it('non-throwing end-to-end round trip for a Level+HLO-only entry — the TypeError crash path T-03 left open is closed (R-BIL-111 AC.1/AC.2)', async () => {
        await expect(
          service.updateAlignment(
            19792,
            '19792',
            patchDto([sp01Partial()], ['SP01']),
            user,
          ),
        ).resolves.toBeDefined();

        expect(upsertForSp).toHaveBeenCalledTimes(1);
      });

      it('partial row persists with the exact null set — indicator_id, indicator_description, unit_messurament, target_value, target_year null; level/toc_result_id/toc_result_title populated (R-BIL-111 AC.1, R-BIL-114 AC.1)', async () => {
        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Partial()], ['SP01']),
          user,
        );

        // Field-by-field assertion on the payload actually passed to the
        // repository — not merely that the call resolved.
        expect(upsertForSp).toHaveBeenCalledWith(
          {
            result_id: 19792,
            sp_code: 'SP01',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 5187,
            indicator_id: null,
            quantitative_contribution: null,
            toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
            indicator_description: null,
            unit_messurament: null,
            target_value: null,
            target_year: null,
          },
          42,
          fakeManager,
        );
      });

      it('complete row (indicator resolved) is byte-identical to pre-change output — no regression from the new partial branch', async () => {
        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Yes()], ['SP01']),
          user,
        );

        expect(upsertForSp).toHaveBeenCalledWith(
          {
            result_id: 19792,
            sp_code: 'SP01',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 5187,
            indicator_id: 5972,
            quantitative_contribution: 3,
            toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
            indicator_description: 'Number of new market intelligence briefs',
            unit_messurament: 'Number',
            target_value: '10',
            target_year: 2026,
          },
          42,
          fakeManager,
        );
      });

      it('PATCH response ≡ subsequent GET for the same partial state (R-BIL-114 AC.2)', async () => {
        (service.getAlignment as unknown as jest.SpyInstance).mockRestore();
        const savedRows: Record<string, unknown>[] = [];
        upsertForSp.mockImplementation(async (input) => {
          savedRows.push({ id: savedRows.length + 1, ...input });
          return savedRows[savedRows.length - 1];
        });
        findActiveTocRows.mockImplementation(async () => savedRows);

        const patchResponse = await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Partial()], ['SP01']),
          user,
        );

        const getResponse = await service.getAlignment(19792, '19792', user);

        expect(getResponse.toc_alignments).toEqual(
          patchResponse.toc_alignments,
        );
        expect(patchResponse.toc_alignments).toEqual([
          {
            sp_code: 'SP01',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 5187,
            indicator_id: null,
            quantitative_contribution: null,
            toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
            indicator_description: null,
            unit_of_measurement: null,
            target_value: null,
            target_year: null,
          },
        ]);
      });

      it('writing a partial row for SP01 leaves SP03’s saved complete row untouched (R-BIL-118 AC.3)', async () => {
        findActiveTocRows.mockResolvedValue([
          {
            id: 11,
            sp_code: 'SP03',
            aligns_with_toc: true,
            level: 'OUTPUT',
            toc_result_id: 5187,
            indicator_id: 5972,
            quantitative_contribution: 3,
            toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
            indicator_description: 'Number of new market intelligence briefs',
            unit_messurament: 'Number',
            target_value: '10',
            target_year: 2026,
          },
        ]);

        await service.updateAlignment(
          19792,
          '19792',
          patchDto([sp01Partial()], ['SP01', 'SP03']),
          user,
        );

        // Only SP01 is written; SP03's saved row is never upserted or
        // deactivated by this PATCH.
        expect(upsertForSp).toHaveBeenCalledTimes(1);
        expect(upsertForSp.mock.calls[0][0].sp_code).toBe('SP01');
        expect(
          upsertForSp.mock.calls.some((call) => call[0].sp_code === 'SP03'),
        ).toBe(false);
        expect(deactivateForSps).not.toHaveBeenCalled();
      });
    });
  });
});
