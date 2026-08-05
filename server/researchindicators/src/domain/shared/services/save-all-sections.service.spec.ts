import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SaveResultService } from './save-all-sections.service';
import { ResultsService } from '../../entities/results/results.service';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { DuplicateCandidateRepository } from '../../entities/results/repositories/duplicate-candidate.repository';
import { DuplicateResolutionRunner } from './duplicate-resolution-runner.service';
import { QueryService, ResultDeleteStatus } from '../utils/query.service';
import { CurrentUserUtil } from '../utils/current-user.util';
import { ExternalMappersDto } from '../global-dto/external-mappers.dto';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import {
  CounterResults,
  CounterResultsEnum,
} from '../../tools/tip-integration/dto/response-year-tip.dto';
import { LinkResult } from '../../entities/link-results/entities/link-result.entity';

describe('SaveResultService', () => {
  let service: SaveResultService;
  let resultRepoHandle: {
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
  };
  let linkResultRepoHandle: { find: jest.Mock };
  let getRepository: jest.Mock;
  let resultsService: jest.Mocked<ResultsService>;
  let knowledgeProductService: jest.Mocked<ResultKnowledgeProductService>;
  let queryService: jest.Mocked<QueryService>;
  let duplicateCandidates: any;
  let resolutionRunner: any;
  let currentUser: jest.Mocked<CurrentUserUtil>;

  const minimalResultDto = (): ExternalMappersDto => {
    const r = new ExternalMappersDto();
    r.official_code = 7001;
    r.external_link = 'e';
    r.created_at = new Date();
    r.status_id = ResultStatusEnum.SUBMITTED_IN_PRMS;
    r.userData = { sec_user_id: 1 } as any;
    r.createResult = {
      year: 2024,
      indicator_id: 1,
      title: 't',
      description: 'd',
      contract_id: 'c',
    } as any;
    r.generalInformation = {
      title: 't',
      description: 'd',
      keywords: [],
      main_contact_person: null,
      main_contact_person_ai: null,
      year: 2024,
    };
    r.alignments = {
      primary_levers: [],
      contracts: [],
      contributor_levers: [],
      result_sdgs: [],
    } as any;
    return r;
  };

  const prmsExtraData = (counters = new CounterResults()) => ({
    platformCode: ReportingPlatformEnum.PRMS,
    appliedVersion: true,
    counters,
    resultSaved: [] as number[],
    currentCode: { current: 0 },
  });

  const tipExtraData = (counters = new CounterResults()) => ({
    platformCode: ReportingPlatformEnum.TIP,
    appliedVersion: false,
    counters,
    resultSaved: [] as number[],
    currentCode: { current: 0 },
  });

  beforeEach(async () => {
    resultRepoHandle = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };
    linkResultRepoHandle = {
      find: jest.fn().mockResolvedValue([]),
    };
    getRepository = jest.fn((entity) => {
      if (entity === LinkResult) return linkResultRepoHandle;
      return resultRepoHandle;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveResultService,
        {
          provide: DataSource,
          useValue: {
            getRepository,
          },
        },
        {
          provide: ResultsService,
          useValue: {
            createResult: jest.fn(),
            updateGeneralInfo: jest.fn(),
            updateResultAlignment: jest.fn(),
            updateInactiveResult: jest.fn(),
            updateResultStatus: jest.fn().mockResolvedValue(undefined),
            newOfficialCode: jest.fn(),
            findResultAlignment: jest
              .fn()
              .mockResolvedValue({ primary_levers: [] }),
            saveGeoLocation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResultKnowledgeProductService,
          useValue: { update: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: QueryService,
          useValue: {
            deleteFullResultById: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: DuplicateCandidateRepository,
          useValue: {
            findCandidatesForIncoming: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: DuplicateResolutionRunner,
          useValue: {
            applyGroup: jest.fn().mockResolvedValue({
              auditRecordId: 1,
              outcomes: [],
              deleted: 0,
              protectedRows: 0,
              failed: 0,
              hardDeleteEnabled: true,
            }),
          },
        },
        {
          provide: CurrentUserUtil,
          useValue: {
            setSystemUser: jest.fn(),
            clearSystemUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SaveResultService);
    resultsService = module.get(ResultsService);
    knowledgeProductService = module.get(ResultKnowledgeProductService);
    queryService = module.get(QueryService);
    duplicateCandidates = module.get(DuplicateCandidateRepository);
    resolutionRunner = module.get(DuplicateResolutionRunner);
    currentUser = module.get(CurrentUserUtil);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveAllSections', () => {
    it('should create PRMS result and increment created counter', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 1,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();

      await service.saveAllSections(
        minimalResultDto(),
        prmsExtraData(counters),
      );

      expect(resultsService.createResult).toHaveBeenCalledWith(
        expect.anything(),
        ReportingPlatformEnum.PRMS,
        expect.objectContaining({
          isSnapshot: false,
        }),
        7001,
      );
      expect(resultsService.updateResultStatus).toHaveBeenCalledWith(
        1,
        ResultStatusEnum.SUBMITTED_IN_PRMS,
      );
      expect(counters[CounterResultsEnum.CREATED]).toBe(1);
      expect(currentUser.setSystemUser).toHaveBeenCalled();
      expect(currentUser.clearSystemUser).toHaveBeenCalled();
    });

    it('should mark snapshot when is_version_applied is true on the DTO', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 2,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoSnapshot = minimalResultDto();
      dtoSnapshot.is_version_applied = true;
      const counters = new CounterResults();
      const extraData = prmsExtraData(counters);

      await service.bulkSaveAllSections([dto, dtoSnapshot], extraData);

      const firstCallOpts = resultsService.createResult.mock.calls[0][2];
      const secondCallOpts = resultsService.createResult.mock.calls[1][2];
      expect(firstCallOpts.isSnapshot).toBe(false);
      expect(secondCallOpts.isSnapshot).toBe(true);
    });

    it('should not mark snapshot when appliedVersion is false even if official code repeats', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 10,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoDuplicate = minimalResultDto();
      const counters = new CounterResults();

      await service.bulkSaveAllSections(
        [dto, dtoDuplicate],
        tipExtraData(counters),
      );

      expect(resultsService.createResult).toHaveBeenCalledTimes(2);
      for (const call of resultsService.createResult.mock.calls) {
        expect(call[2].isSnapshot).toBe(false);
      }
    });

    it('should not mark snapshot for PRMS when each bulk item has a different official code', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 1,
        result_official_code: 7001,
      } as any);
      const dtoA = minimalResultDto();
      const dtoB = minimalResultDto();
      dtoB.official_code = 7002;
      const counters = new CounterResults();

      await service.bulkSaveAllSections([dtoA, dtoB], prmsExtraData(counters));

      expect(resultsService.createResult.mock.calls[0][2].isSnapshot).toBe(
        false,
      );
      expect(resultsService.createResult.mock.calls[1][2].isSnapshot).toBe(
        false,
      );
    });

    it('should create result with the platform code from extraData', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 20,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(minimalResultDto(), tipExtraData());

      expect(resultsService.createResult).toHaveBeenCalledWith(
        expect.anything(),
        ReportingPlatformEnum.TIP,
        expect.anything(),
        7001,
      );
    });

    it('should generate a new official code when manageOfficialCode is enabled', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.newOfficialCode.mockResolvedValue(9999);
      resultsService.createResult.mockResolvedValue({
        result_id: 21,
        result_official_code: 9999,
      } as any);

      await service.saveAllSections(minimalResultDto(), {
        ...tipExtraData(),
        manageOfficialCode: true,
      });

      expect(resultsService.newOfficialCode).toHaveBeenCalledWith(
        ReportingPlatformEnum.TIP,
      );
      expect(resultsService.createResult).toHaveBeenCalledWith(
        expect.anything(),
        ReportingPlatformEnum.TIP,
        expect.anything(),
        9999,
      );
    });

    it('should use the DTO official code when manageOfficialCode is disabled', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 22,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(minimalResultDto(), tipExtraData());

      expect(resultsService.newOfficialCode).not.toHaveBeenCalled();
      expect(resultsService.createResult).toHaveBeenCalledWith(
        expect.anything(),
        ReportingPlatformEnum.TIP,
        expect.anything(),
        7001,
      );
    });

    it('should search existing result by findOptions instead of official code', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 30,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/kp';

      await service.saveAllSections(dto, {
        ...tipExtraData(),
        findOptions: { public_link: 'public_link' },
      });

      expect(resultRepoHandle.findOne).toHaveBeenCalledWith({
        where: {
          platform_code: ReportingPlatformEnum.TIP,
          report_year_id: 2024,
          public_link: 'https://example.org/kp',
        },
      });
    });

    it('should search by official code when findOptions is not provided', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 31,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(minimalResultDto(), tipExtraData());

      expect(resultRepoHandle.findOne).toHaveBeenCalledWith({
        where: {
          result_official_code: 7001,
          platform_code: ReportingPlatformEnum.TIP,
          report_year_id: 2024,
        },
      });
    });

    it('should update inactive result when PRMS row already exists', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 9,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();

      await service.saveAllSections(
        minimalResultDto(),
        prmsExtraData(counters),
      );

      expect(resultsService.updateInactiveResult).toHaveBeenCalledWith(
        9,
        false,
      );
      expect(resultsService.updateResultStatus).toHaveBeenCalledWith(
        9,
        ResultStatusEnum.SUBMITTED_IN_PRMS,
      );
      expect(counters[CounterResultsEnum.UPDATED]).toBe(1);
    });

    it('should apply statusMapper when provided in extraData', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 15,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.status_id = 99 as ResultStatusEnum;

      await service.saveAllSections(dto, {
        ...prmsExtraData(),
        statusMapper: {
          99: ResultStatusEnum.APPROVED,
        },
      });

      expect(resultsService.updateResultStatus).toHaveBeenCalledWith(
        15,
        ResultStatusEnum.APPROVED,
      );
    });

    it('should mark snapshot on update when is_version_applied is true', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 9,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoSnapshot = minimalResultDto();
      dtoSnapshot.is_version_applied = true;
      const counters = new CounterResults();
      const extraData = prmsExtraData(counters);

      await service.bulkSaveAllSections([dto, dtoSnapshot], extraData);

      expect(resultsService.updateInactiveResult).toHaveBeenCalledTimes(2);
      expect(resultsService.updateInactiveResult.mock.calls[0]).toEqual([
        9,
        false,
      ]);
      expect(resultsService.updateInactiveResult.mock.calls[1]).toEqual([
        9,
        true,
      ]);
    });

    it('should not mark snapshot on update when is_version_applied is false', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 11,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoDuplicate = minimalResultDto();
      const counters = new CounterResults();

      await service.bulkSaveAllSections(
        [dto, dtoDuplicate],
        tipExtraData(counters),
      );

      expect(resultsService.updateInactiveResult).toHaveBeenCalledTimes(2);
      for (const call of resultsService.updateInactiveResult.mock.calls) {
        expect(call).toEqual([11, false]);
      }
    });

    it('should increment error counter and rollback on failure after create', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 42,
        result_official_code: 7001,
      } as any);
      resultsService.updateGeneralInfo.mockRejectedValueOnce(new Error('x'));
      const counters = new CounterResults();

      await service.saveAllSections(
        minimalResultDto(),
        prmsExtraData(counters),
      );

      expect(queryService.deleteFullResultById).toHaveBeenCalledWith(42);
      expect(counters[CounterResultsEnum.ERROR]).toBe(1);
    });

    it('should warn, not throw, when the rollback delete is REFUSED', async () => {
      // T-07 pivot per-caller verdict: `deleteFullResultById` resolves
      // (never rejects) on a REFUSED outcome, so the `.catch` on the
      // rollback promise never sees it — without inspecting the resolved
      // array, a rollback that left the row in place would be silent.
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 43,
        result_official_code: 7002,
      } as any);
      resultsService.updateGeneralInfo.mockRejectedValueOnce(new Error('x'));
      queryService.deleteFullResultById.mockResolvedValueOnce([
        { resultId: 43, status: ResultDeleteStatus.REFUSED },
      ]);
      const warnSpy = jest.spyOn((service as any).logger, 'warn');
      const counters = new CounterResults();

      await service.saveAllSections(
        minimalResultDto(),
        prmsExtraData(counters),
      );

      expect(queryService.deleteFullResultById).toHaveBeenCalledWith(43);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('43'));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('manual handling'),
      );
      warnSpy.mockRestore();
    });

    it('should throw when platform code is missing', async () => {
      await expect(
        service.saveAllSections(minimalResultDto(), {
          counters: new CounterResults(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should persist public_link and sync geo location and knowledge product', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 5,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/public';
      dto.geoScope = { geo_scope_id: 2, countries: [] } as any;
      dto.knowledgeProduct = { open_access: true, citation: 'cite' } as any;

      await service.saveAllSections(dto, prmsExtraData(counters));

      expect(resultRepoHandle.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          public_link: 'https://example.org/public',
          external_link: 'e',
        }),
      );
      expect(resultsService.saveGeoLocation).toHaveBeenCalledWith(
        5,
        dto.geoScope,
      );
      expect(knowledgeProductService.update).toHaveBeenCalledWith(
        5,
        dto.knowledgeProduct,
      );
      expect(counters[CounterResultsEnum.UPDATED]).toBe(1);
    });

    it('should merge STAR primary levers before updating alignment', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 3,
        result_official_code: 7001,
      } as any);
      resultsService.findResultAlignment.mockResolvedValue({
        primary_levers: [{ lever_id: 1, is_primary: true }],
      } as any);
      const dto = minimalResultDto();
      dto.alignments.primary_levers = [
        { lever_id: 2, is_primary: false },
      ] as any;

      await service.saveAllSections(dto, prmsExtraData());

      expect(resultsService.findResultAlignment).toHaveBeenCalledWith(3);
      const alignmentArg =
        resultsService.updateResultAlignment.mock.calls[0][1];
      expect(alignmentArg.primary_levers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lever_id: 1, is_primary: true }),
          expect.objectContaining({ lever_id: 2, is_primary: false }),
        ]),
      );
    });
  });

  describe('buildDuplicateGroup', () => {
    const candidate = (
      resultId: number,
      platformCode: ReportingPlatformEnum,
      indicatorId: IndicatorsEnum,
    ) => ({
      resultId,
      resultOfficialCode: resultId * 10,
      platformCode,
      indicatorId,
      reportYearId: 2024,
      rawPublicLink: 'https://example.org/doc',
      normalizedPublicLink: 'example.org/doc',
    });

    it('skips deduplication entirely when there is no public link', async () => {
      const group = await service.buildDuplicateGroup({
        publicLink: null,
        reportYearId: 2024,
        platformCode: ReportingPlatformEnum.TIP,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      });

      expect(group.resolution).toBeNull();
      expect(group.incomingIsLoser).toBe(false);
      expect(
        duplicateCandidates.findCandidatesForIncoming,
      ).not.toHaveBeenCalled();
    });

    it('collapses the incoming payload and findResult into ONE participant', async () => {
      // Counting them separately put two same-platform rows in the group for one
      // physical row and fired the ambiguity branch on every routine re-sync.
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        candidate(
          5,
          ReportingPlatformEnum.TIP,
          IndicatorsEnum.KNOWLEDGE_PRODUCT,
        ),
        candidate(
          6,
          ReportingPlatformEnum.AICCRA,
          IndicatorsEnum.INNOVATION_DEV,
        ),
      ]);

      const group = await service.buildDuplicateGroup({
        publicLink: 'https://example.org/doc',
        reportYearId: 2024,
        platformCode: ReportingPlatformEnum.TIP,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        findResult: { result_id: 5, result_official_code: 50 } as any,
      });

      expect(group.participants).toHaveLength(2);
      expect(
        group.participants.filter((p: any) => p.resultId === 5),
      ).toHaveLength(1);
      // The participant carries the stored id with the incoming platform/indicator.
      expect(group.participants[0]).toMatchObject({
        resultId: 5,
        platformCode: ReportingPlatformEnum.TIP,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      });
    });

    it('marks the incoming row a loser when a higher-priority duplicate is stored', async () => {
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        candidate(
          99,
          ReportingPlatformEnum.TIP,
          IndicatorsEnum.KNOWLEDGE_PRODUCT,
        ),
      ]);

      const group = await service.buildDuplicateGroup({
        publicLink: 'https://example.org/doc',
        reportYearId: 2024,
        platformCode: ReportingPlatformEnum.PRMS,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      });

      expect(group.incomingIsLoser).toBe(true);
      expect(group.resolution!.winner!.resultId).toBe(99);
    });

    it('carries the stored losing row into the resolution when the incoming row wins', async () => {
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        candidate(
          88,
          ReportingPlatformEnum.PRMS,
          IndicatorsEnum.KNOWLEDGE_PRODUCT,
        ),
      ]);

      const group = await service.buildDuplicateGroup({
        publicLink: 'https://example.org/doc',
        reportYearId: 2024,
        platformCode: ReportingPlatformEnum.TIP,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      });

      expect(group.incomingIsLoser).toBe(false);
      expect(group.resolution!.losers.map((l: any) => l.resultId)).toEqual([
        88,
      ]);
    });

    it('produces no deletable losers for a contradictory group', async () => {
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        candidate(
          70,
          ReportingPlatformEnum.AICCRA,
          IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        ),
        candidate(
          71,
          ReportingPlatformEnum.TIP,
          IndicatorsEnum.KNOWLEDGE_PRODUCT,
        ),
      ]);

      const group = await service.buildDuplicateGroup({
        publicLink: 'https://example.org/doc',
        reportYearId: 2024,
        platformCode: ReportingPlatformEnum.TIP,
        indicatorId: IndicatorsEnum.INNOVATION_DEV,
      });

      expect(group.resolution!.classification).toBe('UNRESOLVED_CONFLICT');
      expect(group.resolution!.losers).toEqual([]);
      expect(group.incomingIsLoser).toBe(false);
    });
  });

  describe('saveAllSections duplicate handling', () => {
    const storedCandidate = (
      resultId: number,
      platformCode: ReportingPlatformEnum,
      indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT,
    ) => ({
      resultId,
      resultOfficialCode: resultId * 10,
      platformCode,
      indicatorId,
      reportYearId: 2024,
      rawPublicLink: 'https://example.org/doc',
      normalizedPublicLink: 'example.org/doc',
    });

    it('skips the save and counts an omission when a higher-priority duplicate exists', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        storedCandidate(55, ReportingPlatformEnum.TIP),
      ]);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, prmsExtraData(counters));

      expect(resultsService.createResult).not.toHaveBeenCalled();
      expect(counters[CounterResultsEnum.CREATED]).toBe(0);
      // Previously an omission was counted nowhere, so the reported bug could look
      // handled while the duplicate survived.
      expect(counters[CounterResultsEnum.OMITTED_DUPLICATE]).toBe(1);
      expect(currentUser.clearSystemUser).toHaveBeenCalled();
    });

    it("REGRESSION: submits the losing row's OWN stored family for deletion", async () => {
      // The reported bug. A stored PRMS row for link L loses to TIP; on every
      // later PRMS sync the old code excluded it from candidates and returned, so
      // the duplicate survived forever while OMITTED_DUPLICATE made it look
      // handled. Red before the fix.
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 500,
        result_official_code: 7001,
      });
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        storedCandidate(500, ReportingPlatformEnum.PRMS),
        storedCandidate(600, ReportingPlatformEnum.TIP),
      ]);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, prmsExtraData(counters));

      expect(counters[CounterResultsEnum.OMITTED_DUPLICATE]).toBe(1);
      expect(resolutionRunner.applyGroup).toHaveBeenCalledTimes(1);
      const applied = resolutionRunner.applyGroup.mock.calls[0][0];
      expect(applied.resolution.losers.map((l: any) => l.resultId)).toEqual([
        500,
      ]);
      expect(applied.resolution.winner.resultId).toBe(600);
    });

    it('REGRESSION: never hands the group winner to the deletion loop', async () => {
      // Because the incoming payload and findResult are one participant, a stored
      // row that prevails cannot be scheduled for deletion. The previous design
      // keyed on "incoming is not the winner" and deleted findResult regardless.
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 700,
        result_official_code: 7002,
      });
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        storedCandidate(700, ReportingPlatformEnum.TIP),
        storedCandidate(
          800,
          ReportingPlatformEnum.AICCRA,
          IndicatorsEnum.INNOVATION_DEV,
        ),
      ]);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, tipExtraData(counters));

      const applied = resolutionRunner.applyGroup.mock.calls[0][0];
      expect(applied.resolution.winner.resultId).toBe(700);
      expect(
        applied.resolution.losers.map((l: any) => l.resultId),
      ).not.toContain(700);
      expect(applied.resolution.losers.map((l: any) => l.resultId)).toEqual([
        800,
      ]);
      expect(counters[CounterResultsEnum.UPDATED]).toBe(1);
    });

    it('resolves a routine re-sync normally rather than declining it as same-system', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 900,
        result_official_code: 7003,
      });
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        storedCandidate(900, ReportingPlatformEnum.TIP),
        storedCandidate(901, ReportingPlatformEnum.PRMS),
      ]);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, tipExtraData(counters));

      const applied = resolutionRunner.applyGroup.mock.calls[0][0];
      expect(applied.resolution.classification).toBe('RESOLVED');
      expect(counters[CounterResultsEnum.UPDATED]).toBe(1);
      expect(counters[CounterResultsEnum.OMITTED_DUPLICATE]).toBe(0);
    });

    it('runs the deletion step only AFTER the winner is written', async () => {
      const order: string[] = [];
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockImplementation(async () => {
        order.push('create');
        return { result_id: 10, result_official_code: 7004 } as any;
      });
      resolutionRunner.applyGroup.mockImplementation(async () => {
        order.push('delete');
        return {
          auditRecordId: 1,
          outcomes: [],
          deleted: 1,
          protectedRows: 0,
          failed: 0,
          hardDeleteEnabled: true,
        };
      });
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        storedCandidate(1000, ReportingPlatformEnum.PRMS),
      ]);
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, tipExtraData(new CounterResults()));

      expect(order).toEqual(['create', 'delete']);
    });

    it('a throwing deletion step leaves the winner stored and does not roll it back', async () => {
      // The catch in saveAllSections deletes the result it just created. A
      // duplicate-cleanup failure must never reach it.
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 11,
        result_official_code: 7005,
      } as any);
      resolutionRunner.applyGroup.mockRejectedValue(
        new Error('audit write failed'),
      );
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        storedCandidate(1100, ReportingPlatformEnum.PRMS),
      ]);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, tipExtraData(counters));

      expect(counters[CounterResultsEnum.CREATED]).toBe(1);
      expect(counters[CounterResultsEnum.ERROR]).toBe(0);
      expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    });

    it('does not run the deletion step when the save failed', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockRejectedValue(new Error('boom'));
      duplicateCandidates.findCandidatesForIncoming.mockResolvedValue([
        storedCandidate(1200, ReportingPlatformEnum.PRMS),
      ]);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, tipExtraData(counters));

      expect(counters[CounterResultsEnum.ERROR]).toBe(1);
      expect(resolutionRunner.applyGroup).not.toHaveBeenCalled();
    });

    it('does not deduplicate when the incoming row has only external_link', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = null;
      dto.external_link = 'https://tip-platform.org/result/1';
      resultsService.createResult.mockResolvedValue({
        result_id: 1,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(dto, tipExtraData(counters));

      expect(
        duplicateCandidates.findCandidatesForIncoming,
      ).not.toHaveBeenCalled();
      expect(resultsService.createResult).toHaveBeenCalled();
      expect(resolutionRunner.applyGroup).not.toHaveBeenCalled();
    });
  });

  describe('bulkSaveAllSections', () => {
    it('should process every result in the batch', async () => {
      const saveSpy = jest
        .spyOn(service, 'saveAllSections')
        .mockResolvedValue(undefined);
      const dtoA = minimalResultDto();
      const dtoB = minimalResultDto();
      dtoB.official_code = 7002;

      await service.bulkSaveAllSections([dtoA, dtoB], prmsExtraData());

      expect(saveSpy).toHaveBeenCalledTimes(2);
      saveSpy.mockRestore();
    });
  });
});
