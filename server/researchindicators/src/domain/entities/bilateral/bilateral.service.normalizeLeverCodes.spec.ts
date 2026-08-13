import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException } from '@nestjs/common';
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
import { BilateralScienceProgramsResponse } from './dto/bilateral-science-programs.response.dto';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.1
//
// Covers the 4 R-BIL-070 scenarios:
//   1. Code is in the per-result list           → updateAlignment proceeds.
//   2. Code is not in the per-result list       → 400 with structured errors.
//   3. has_contribution = false                 → validation skipped.
//   4. Result is unmapped (empty per-result)    → any non-empty codes reject.
//
// Focused-scope spec — full BilateralService spec lands in T-15.6.

describe('BilateralService.normalizeLeverCodes — PATCH validation (T-15.1)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const emit = jest.fn();
  const transaction = jest.fn();

  const baseContext = {
    result_id: 19792,
    result_official_code: 19792,
    result_status_id: 1,
    version_id: 1,
    is_synced_to_prms: false,
    is_pool_funding_contributor: true,
    agresso_agreement_id: 'D527',
    platform_code: 'STAR',
  };

  const fakeManager = {
    getRepository: () =>
      ({
        update: jest.fn(),
        save: jest.fn().mockResolvedValue({ id: 1 }),
      }) as unknown as Repository<unknown>,
  } as unknown as EntityManager;

  const user: User = { sec_user_id: 42 } as User;

  const mappedSpResponse = (
    codes: string[],
  ): BilateralScienceProgramsResponse => ({
    result_code: '19792',
    mapping_status: 'mapped',
    clarisa_project: { id: 1, short_name: 'T-PJ-003262-...' },
    science_programs: codes.map((code) => ({
      code,
      name: `name-of-${code}`,
      category: 'Science programs',
      color: null,
      icon_key: null,
      allocation: 50,
    })),
  });

  const unmappedSpResponse = (): BilateralScienceProgramsResponse => ({
    result_code: '19792',
    mapping_status: 'unmapped',
    clarisa_project: null,
    science_programs: [],
  });

  beforeEach(async () => {
    transaction.mockImplementation(async (cb) => cb(fakeManager));

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
          // T-06 stub — new constructor dependency; legacy-body PATCHes only
          // hit the R-BIL-093 cascade pre-read (no active ToC rows here).
          provide: ResultPoolFundingTocAlignmentRepository,
          useValue: {
            findActiveByResultId: jest.fn().mockResolvedValue([]),
            upsertForSp: jest.fn(),
            deactivateForSps: jest.fn(),
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
        { provide: TocIntegrationService, useValue: {} },
        { provide: BilateralProjectMappingService, useValue: {} },
      ],
    }).compile();

    service = module.get(BilateralService);

    // Short-circuit the getAlignment call at the end of updateAlignment so
    // the happy-path tests don't need to mock the full read chain.
    jest.spyOn(service, 'getAlignment').mockResolvedValue({} as never);
  });

  afterEach(() => jest.clearAllMocks());

  it('R-BIL-070 scenario 1 — code is in the per-result list → updateAlignment proceeds', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValue(null);
    jest
      .spyOn(service, 'getScienceProgramsForResult')
      .mockResolvedValueOnce(mappedSpResponse(['SP09', 'SP10']));

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP09'],
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, user),
    ).resolves.toBeDefined();

    expect(service.getScienceProgramsForResult).toHaveBeenCalledWith(
      19792,
      '19792',
    );
    // T-05 / RA-02: the return-shape widening must not add a second catalog
    // fetch — the call count stays exactly what it was before this task.
    expect(service.getScienceProgramsForResult).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('R-BIL-070 scenario 2 — unknown code → 400 with structured errors.unknown_sp_codes', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValue(null);
    jest
      .spyOn(service, 'getScienceProgramsForResult')
      .mockResolvedValueOnce(mappedSpResponse(['SP09', 'SP10']));

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP09', 'SP99'],
    };

    let thrown: HttpException | undefined;
    try {
      await service.updateAlignment(19792, '19792', dto, user);
    } catch (err) {
      thrown = err as HttpException;
    }

    expect(thrown).toBeInstanceOf(BadRequestException);
    const response = thrown!.getResponse() as {
      message: { description: string; unknown_sp_codes: string[] };
    };
    expect(response.message.description).toBe('Unknown Science Program codes');
    expect(response.message.unknown_sp_codes).toEqual(['SP99']);
    // No alignment row persisted on the rejection path.
    expect(transaction).not.toHaveBeenCalled();
  });

  it('R-BIL-070 scenario 3 — has_contribution=false skips validation', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValue(null);
    const validatorSpy = jest.spyOn(service, 'getScienceProgramsForResult');

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: false,
      sp_codes: ['SP99'],
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, user),
    ).resolves.toBeDefined();

    expect(validatorSpy).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('R-BIL-070 scenario 4 — unmapped result rejects any non-empty sp_codes', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValue(null);
    jest
      .spyOn(service, 'getScienceProgramsForResult')
      .mockResolvedValueOnce(unmappedSpResponse());

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'],
    };

    let thrown: HttpException | undefined;
    try {
      await service.updateAlignment(19792, '19792', dto, user);
    } catch (err) {
      thrown = err as HttpException;
    }

    expect(thrown).toBeInstanceOf(BadRequestException);
    const response = thrown!.getResponse() as {
      message: { unknown_sp_codes: string[] };
    };
    expect(response.message.unknown_sp_codes).toEqual(['SP01']);
    expect(transaction).not.toHaveBeenCalled();
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-06 / RA-02, T-05 ADVISORY 2
  //
  // T-05's two private-seam tests (`normalizeLeverCodes` invoked directly
  // via an `as unknown as` cast, deleted here) proved `validCodes` before it
  // had any public observable. Now that T-06's `resolvePrimarySpCode` is
  // wired through `updateAlignment`, both claims are genuinely dischargeable
  // through the PUBLIC seam, so they are re-pointed rather than kept at the
  // private one — T-05's forward pointer named this re-point explicitly,
  // conditioned on "once validCodes is observable through updateAlignment."
  it('T-06 — validCodes really is the FULL per-result catalog: a code valid for the result but unselected as Primary returns primary_sp_not_selected, not unknown_sp_codes', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValueOnce(null);
    const getScienceProgramsSpy = jest
      .spyOn(service, 'getScienceProgramsForResult')
      .mockResolvedValueOnce(mappedSpResponse(['SP09', 'SP10']));

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP09'],
      // SP10 is valid for the result (full catalog) but was never selected
      // — the exact discriminating shape T-05 required: a catalog equal to
      // sp_codes cannot tell `validCodes = catalog` apart from the wrong
      // `validCodes = new Set(codes)`, because the two would coincide.
      primary_sp_code: 'SP10',
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
    // A `validCodes` built from the selected set alone would report SP10 as
    // unknown_sp_codes instead — this is the behavioral check, not a
    // presence-assertion.
    expect(response.message.primary_sp?.code).toBe('primary_sp_not_selected');
    expect(response.message.unknown_sp_codes).toBeUndefined();
    // No second catalog fetch — validCodes rides the same call that already
    // validates sp_codes (RA-02).
    expect(getScienceProgramsSpy).toHaveBeenCalledTimes(1);
    expect(getScienceProgramsSpy).toHaveBeenCalledWith(19792, '19792');
    expect(transaction).not.toHaveBeenCalled();
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-06 / T-05 ADVISORY 1
  //
  // Pins design.md §5.1 step 1 running FIRST, behaviourally: with
  // has_contribution:false, `resolvePrimarySpCode` must return null WITHOUT
  // ever consulting `validCodes` — even when primary_sp_code is garbage. A
  // future re-order that checked `primary_sp_code` before `has_contribution`
  // would either throw on the garbage code or fetch the catalog; neither
  // happens here, so a re-order goes red instead of silently producing
  // primary_sp_not_selected (T-05's ADVISORY 1 concrete suggestion). This
  // also supersedes T-05's old "empty validCodes" private-seam test — the
  // property that matters is that the catalog is never consulted, not the
  // literal Set size, and that is what this proves via the public seam.
  it('T-06 — has_contribution:false resolves the Primary as null WITHOUT consulting validCodes, even with a garbage primary_sp_code', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValueOnce(null);
    const getScienceProgramsSpy = jest.spyOn(
      service,
      'getScienceProgramsForResult',
    );

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: false,
      sp_codes: ['SP99'],
      primary_sp_code: 'NOT-A-REAL-CODE',
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, user),
    ).resolves.toBeDefined();

    expect(getScienceProgramsSpy).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
