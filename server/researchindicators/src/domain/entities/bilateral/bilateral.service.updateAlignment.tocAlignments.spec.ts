import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
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
});
