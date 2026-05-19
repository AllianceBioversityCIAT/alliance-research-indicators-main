import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SaveResultService } from './save-all-sections.service';
import { ResultsService } from '../../entities/results/results.service';
import { QueryService } from '../utils/query.service';
import { CurrentUserUtil } from '../utils/current-user.util';
import { ExternalMappersDto } from '../global-dto/external-mappers.dto';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';
import {
  CounterResults,
  CounterResultsEnum,
} from '../../tools/tip-integration/dto/response-year-tip.dto';

describe('SaveResultService', () => {
  let service: SaveResultService;
  let resultRepoHandle: { findOne: jest.Mock; update: jest.Mock };
  let resultsService: jest.Mocked<ResultsService>;
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
    currentCode: null as number | null,
  });

  beforeEach(async () => {
    resultRepoHandle = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveResultService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue(resultRepoHandle),
          },
        },
        {
          provide: ResultsService,
          useValue: {
            createResult: jest.fn(),
            updateGeneralInfo: jest.fn(),
            updateResultAlignment: jest.fn(),
            updateInactiveResult: jest.fn(),
          },
        },
        {
          provide: QueryService,
          useValue: { deleteFullResultById: jest.fn().mockResolvedValue(undefined) },
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

      await service.saveAllSections(minimalResultDto(), prmsExtraData(counters));

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

    it('should mark snapshot when official code repeats with appliedVersion', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 2,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoSnapshot = minimalResultDto();
      const counters = new CounterResults();
      const extraData = prmsExtraData(counters);

      await service.bulkSaveAllSections([dto, dtoSnapshot], extraData);

      const secondCallOpts = resultsService.createResult.mock.calls[1][2];
      expect(secondCallOpts.isSnapshot).toBe(true);
    });

    it('should update inactive result when PRMS row already exists', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 9,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();

      await service.saveAllSections(minimalResultDto(), prmsExtraData(counters));

      expect(resultsService.updateInactiveResult).toHaveBeenCalledWith(9, false);
      expect(counters[CounterResultsEnum.UPDATED]).toBe(1);
    });

    it('should increment error counter and rollback on failure after create', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 42,
        result_official_code: 7001,
      } as any);
      resultsService.updateGeneralInfo.mockRejectedValueOnce(new Error('x'));
      const counters = new CounterResults();

      await service.saveAllSections(minimalResultDto(), prmsExtraData(counters));

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
