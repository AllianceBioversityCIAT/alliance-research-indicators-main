import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SaveResultService } from './save-all-sections.service';
import { ResultsService } from '../../entities/results/results.service';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { QueryService } from '../utils/query.service';
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
            deleteFullResultById: jest.fn().mockResolvedValue(undefined),
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
      expect(counters[CounterResultsEnum.UPDATED]).toBe(1);
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

  describe('duplicateResultValidation', () => {
    it('should omit PRMS when TIP duplicate exists for the same public link', async () => {
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 99,
          platform_code: ReportingPlatformEnum.TIP,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);

      const result = await service.duplicateResultValidation({
        platformCode: ReportingPlatformEnum.PRMS,
        publicLink: 'https://example.org/doc',
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
      });

      expect(result.shouldOmit).toBe(true);
      expect(result.resultsToDelete).toEqual([]);
      expect(resultRepoHandle.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            public_link: 'https://example.org/doc',
          }),
        }),
      );
    });

    it('should mark PRMS duplicate for deletion when incoming TIP wins', async () => {
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 88,
          platform_code: ReportingPlatformEnum.PRMS,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);

      const result = await service.duplicateResultValidation({
        platformCode: ReportingPlatformEnum.TIP,
        publicLink: 'https://example.org/doc',
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
      });

      expect(result.shouldOmit).toBe(false);
      expect(result.resultsToDelete).toEqual([88]);
    });

    it('should skip deduplication when only external_link would match', async () => {
      const result = await service.duplicateResultValidation({
        platformCode: ReportingPlatformEnum.TIP,
        publicLink: null,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
      });

      expect(result).toEqual({
        shouldOmit: false,
        resultsToDelete: [],
        protectedFromDeletion: [],
      });
      expect(resultRepoHandle.find).not.toHaveBeenCalled();
    });

    it('should protect duplicates referenced in link_results.other_result_id', async () => {
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 77,
          platform_code: ReportingPlatformEnum.PRMS,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);
      linkResultRepoHandle.find.mockResolvedValue([{ other_result_id: 77 }]);

      const result = await service.duplicateResultValidation({
        platformCode: ReportingPlatformEnum.TIP,
        publicLink: 'https://example.org/doc',
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
      });

      expect(result.resultsToDelete).toEqual([]);
      expect(result.protectedFromDeletion).toEqual([77]);
    });
  });

  describe('saveAllSections duplicate handling', () => {
    it('should skip PRMS save when a higher-priority duplicate exists', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 55,
          platform_code: ReportingPlatformEnum.TIP,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, prmsExtraData(counters));

      expect(resultsService.createResult).not.toHaveBeenCalled();
      expect(counters[CounterResultsEnum.CREATED]).toBe(0);
      expect(currentUser.clearSystemUser).toHaveBeenCalled();
    });

    it('should not deduplicate when incoming row has only external_link', async () => {
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

      expect(resultRepoHandle.find).not.toHaveBeenCalled();
      expect(resultsService.createResult).toHaveBeenCalled();
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
