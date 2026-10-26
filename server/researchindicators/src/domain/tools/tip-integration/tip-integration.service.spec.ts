import { Test, TestingModule } from '@nestjs/testing';
import { TipIntegrationService } from './tip-integration.service';
import { ResultsService } from '../../entities/results/results.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { ResultRepository } from '../../entities/results/repositories/result.repository';
import { ClarisaLeversService } from '../clarisa/entities/clarisa-levers/clarisa-levers.service';
import { ClarisaRegionsService } from '../clarisa/entities/clarisa-regions/clarisa-regions.service';
import { ClarisaCountriesService } from '../clarisa/entities/clarisa-countries/clarisa-countries.service';
import { QueryService } from '../../shared/utils/query.service';
import { HttpService } from '@nestjs/axios';
import { DataSource, In } from 'typeorm';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import * as mapperModule from './mapper/tip-integration.mapper';
import { TipIntegrationRepository } from './repository/tip-integration.repository';
import { SyncProcessLogService } from '../../entities/sync-process-log/sync-process-log.service';
import { SaveResultService } from '../../shared/services/save-all-sections.service';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { SyncProcessEnum } from '../../entities/sync-process-log/enum/sync-process.enum';
import {
  TipKnowledgeProductDto,
  TipMappedResult,
  TipTocMappingDto,
} from './dto/response-year-tip.dto';
import { BilateralService } from '../../entities/bilateral/bilateral.service';
import { AgressoContract } from '../../entities/agresso-contract/entities/agresso-contract.entity';
import { of, throwError } from 'rxjs';
import { PrmsRepository } from '../open-search/prms/repositories/prms.repository';
import { ClarisaSdgsService } from '../clarisa/entities/clarisa-sdgs/clarisa-sdgs.service';
import { TemportalDataResponse } from '../open-search/prms/dto/prms-response.dto';
import { SyncStagingRecordsEntity } from '../open-search/prms/entities/sync-staging-records.entity';
import {
  TipHandleRepository,
  TipHandleResolution,
  TipHandleRow,
} from './repository/tip-handle.repository';
import {
  persistedStarRefusalData,
  PrmsSyncPersistedRefusalException,
  ResultPrmsSyncService,
} from '../../entities/result-prms-sync/result-prms-sync.service';
import { PrmsSyncOutcome } from '../prms-normalizer/enum/prms-sync-outcome.enum';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';

describe('TipIntegrationService', () => {
  let service: TipIntegrationService;
  let resultsService: jest.Mocked<ResultsService>;
  let tipIntegrationRepository: jest.Mocked<TipIntegrationRepository>;
  let clarisaRegionsService: jest.Mocked<ClarisaRegionsService>;
  let clarisaCountriesService: jest.Mocked<ClarisaCountriesService>;
  let clarisaLeversService: jest.Mocked<ClarisaLeversService>;
  let resultRepository: jest.Mocked<ResultRepository>;
  let syncProcessLogService: jest.Mocked<SyncProcessLogService>;
  let saveResultService: jest.Mocked<SaveResultService>;
  let prmsRepository: jest.Mocked<PrmsRepository>;
  let clarisaSdgsService: jest.Mocked<ClarisaSdgsService>;
  let bilateralService: { importAlignmentFromTip: jest.Mock };
  let tipHandleRepository: { resolve: jest.Mock; idsWithPrmsCode: jest.Mock };
  let resultPrmsSyncService: { sync: jest.Mock };
  let reportingYearResolver: { resolve: jest.Mock };
  let currentUser: { setSystemUser: jest.Mock; clearSystemUser: jest.Mock };

  const mockResultRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockAgressoRepo = {
    find: jest.fn(),
  };

  const echoKnownAgreements = (options?: {
    where?: { agreement_id?: { _value?: string | string[] } };
  }) => {
    const value = options?.where?.agreement_id?._value ?? [];
    const ids = Array.isArray(value) ? value : [value];
    return Promise.resolve(
      ids
        .filter((id) => id != null && id !== '')
        .map((agreement_id) => ({ agreement_id })),
    );
  };

  const mockStagingRepo = {
    save: jest.fn().mockResolvedValue(undefined),
  };

  const wrapTemporal = (
    product: TipKnowledgeProductDto,
    overrides: Partial<TemportalDataResponse<TipKnowledgeProductDto>> = {},
  ): TemportalDataResponse<TipKnowledgeProductDto> => ({
    code: 1,
    year: 2025,
    is_version: false,
    data: product,
    ...overrides,
  });

  const baseProduct: TipKnowledgeProductDto = {
    id: 555,
    created_at: '2025-01-01',
    updated_at: '2025-01-02',
    name: 'Test KP',
    link: 'http://link.example',
    doi: '10.1234/test',
    citation: 'Test Citation',
    access_status: 'Open Access',
    review_status: 'Peer Review',
    publication_date: '2025-01-01',
    project: { agreement_id: 'AGR-001', description: 'Project 1' },
    collection: [],
    levers: ['Lever1', 'Lever2'],
    countries: [{ name: 'Colombia', un_code: 170 }],
    region: [{ name: 'LAC', un_code: 419 }],
    submitter: null,
    type: ['Journal article'],
    sdgs: [],
    keywords: [],
    programs_and_accelerators: [],
    abstract: 'Test abstract',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipIntegrationService,
        {
          provide: ResultsService,
          useValue: {
            findResultTIPData: jest.fn(),
            createResult: jest.fn(),
            updateGeneralInfo: jest.fn(),
            findResultAlignment: jest.fn(),
            updateResultAlignment: jest.fn(),
            saveGeoLocation: jest.fn(),
            newOfficialCode: jest.fn().mockResolvedValue(9001),
          },
        },
        {
          provide: ResultRepository,
          useValue: {
            findUserByEmailOrCarnet: jest.fn(),
            createUserInSecUsers: jest.fn(),
            unpdateCarnetUser: jest.fn(),
          },
        },
        {
          provide: ClarisaLeversService,
          useValue: { findByNames: jest.fn() },
        },
        {
          provide: ClarisaRegionsService,
          useValue: { findByUm49Codes: jest.fn() },
        },
        {
          provide: ClarisaCountriesService,
          useValue: { findByUm49Codes: jest.fn() },
        },
        {
          provide: QueryService,
          useValue: { deleteFullResultById: jest.fn() },
        },
        { provide: HttpService, useValue: { get: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockImplementation((entity) => {
              if (entity === SyncStagingRecordsEntity) {
                return mockStagingRepo;
              }
              if (entity === AgressoContract) {
                return mockAgressoRepo;
              }
              return mockResultRepo;
            }),
          },
        },
        {
          provide: ResultKnowledgeProductService,
          useValue: {
            activeKpByResultId: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: CurrentUserUtil,
          useValue: {
            setSystemUser: jest.fn(),
            clearSystemUser: jest.fn(),
          },
        },
        {
          provide: ResultPrmsSyncService,
          useValue: {
            sync: jest.fn().mockResolvedValue({
              outcome: PrmsSyncOutcome.ACCEPTED,
            }),
          },
        },
        {
          provide: ReportingYearResolver,
          useValue: {
            resolve: jest.fn().mockResolvedValue(2026),
          },
        },
        {
          provide: AppConfig,
          useValue: {
            ARI_CLIENT_HOST: 'http://client.example',
            TIP_API_URL: 'http://tip.example',
            TIP_TOKEN: 'test-token',
          },
        },
        {
          provide: TipIntegrationRepository,
          useValue: {
            allTipResultId: jest.fn(),
            inactiveAllTipResults: jest.fn(),
          },
        },
        {
          provide: SyncProcessLogService,
          useValue: {
            initiateSync: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn().mockResolvedValue(undefined),
            endSync: jest.fn().mockResolvedValue(undefined),
            isInProgressYoungerThan: jest.fn().mockResolvedValue(false),
            markFailed: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SaveResultService,
          useValue: {
            bulkSaveAllSections: jest.fn().mockResolvedValue(undefined),
            saveAllSections: jest.fn().mockResolvedValue({
              resultId: 1,
              outcome: 'created',
            }),
          },
        },
        {
          provide: TipHandleRepository,
          useValue: {
            resolve: jest.fn().mockResolvedValue({
              live: null,
              otherLive: [],
              versions: {},
              otherVersions: [],
            }),
            idsWithPrmsCode: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: BilateralService,
          useValue: {
            importAlignmentFromTip: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrmsRepository,
          useValue: {
            findTemporalResults: jest.fn().mockResolvedValue([]),
            deleteTemporalResults: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ClarisaSdgsService,
          useValue: {
            findSdgByTipFormat: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<TipIntegrationService>(TipIntegrationService);
    resultsService = module.get(ResultsService);
    tipIntegrationRepository = module.get(TipIntegrationRepository);
    clarisaRegionsService = module.get(ClarisaRegionsService);
    clarisaCountriesService = module.get(ClarisaCountriesService);
    clarisaLeversService = module.get(ClarisaLeversService);
    resultRepository = module.get(ResultRepository);
    syncProcessLogService = module.get(SyncProcessLogService);
    saveResultService = module.get(SaveResultService);
    prmsRepository = module.get(PrmsRepository);
    clarisaSdgsService = module.get(ClarisaSdgsService);
    bilateralService = module.get(BilateralService);
    tipHandleRepository = module.get(TipHandleRepository);
    resultPrmsSyncService = module.get(ResultPrmsSyncService);
    reportingYearResolver = module.get(ReportingYearResolver);
    currentUser = module.get(CurrentUserUtil);

    mockAgressoRepo.find.mockReset();
    mockAgressoRepo.find.mockImplementation(echoKnownAgreements);
    mockResultRepo.findOne.mockReset();
    mockResultRepo.findOne.mockResolvedValue({ result_id: 42 });

    jest
      .spyOn(mapperModule, 'tipIntegrationMapper')
      .mockImplementation((result: any) => ({ id: result.result_id }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should map results and pass options through', async () => {
    const raw = [{ result_id: 1 }, { result_id: 2 }] as any;
    resultsService.findResultTIPData.mockResolvedValue(raw);

    const options = { year: 2024, productType: 2 };
    const data = await service.getAllIprData(options);

    expect(resultsService.findResultTIPData).toHaveBeenCalledWith(options);
    expect(data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should work without options', async () => {
    resultsService.findResultTIPData.mockResolvedValue([] as any);
    const data = await service.getAllIprData();
    expect(resultsService.findResultTIPData).toHaveBeenCalledWith({
      year: undefined,
      productType: undefined,
    });
    expect(data).toEqual([]);
  });

  // [CLAUDE/DONE] 191
  describe('inactiveAllTipResults', () => {
    it('should retrieve tip result ids and inactivate each one', async () => {
      const resultCodes = [101, 202];
      const tipResultIds = [1, 2, 3];
      tipIntegrationRepository.allTipResultId.mockResolvedValue(
        tipResultIds as any,
      );
      tipIntegrationRepository.inactiveAllTipResults.mockResolvedValue(
        undefined,
      );

      await service.inactiveAllTipResults(resultCodes);

      expect(tipIntegrationRepository.allTipResultId).toHaveBeenCalledWith(
        resultCodes,
        undefined,
      );
      expect(
        tipIntegrationRepository.inactiveAllTipResults,
      ).toHaveBeenCalledTimes(3);
      expect(
        tipIntegrationRepository.inactiveAllTipResults,
      ).toHaveBeenCalledWith(1);
      expect(
        tipIntegrationRepository.inactiveAllTipResults,
      ).toHaveBeenCalledWith(2);
      expect(
        tipIntegrationRepository.inactiveAllTipResults,
      ).toHaveBeenCalledWith(3);
    });

    it('should not call inactiveAllTipResults when there are no tip result ids', async () => {
      tipIntegrationRepository.allTipResultId.mockResolvedValue([] as any);

      await service.inactiveAllTipResults([]);

      expect(tipIntegrationRepository.allTipResultId).toHaveBeenCalledWith(
        [],
        undefined,
      );
      expect(
        tipIntegrationRepository.inactiveAllTipResults,
      ).not.toHaveBeenCalled();
    });

    it('should forward year to repository when inactivating stale TIP results', async () => {
      const resultCodes = [101];
      tipIntegrationRepository.allTipResultId.mockResolvedValue([9] as any);
      tipIntegrationRepository.inactiveAllTipResults.mockResolvedValue(
        undefined,
      );

      await service.inactiveAllTipResults(resultCodes, 2026);

      expect(tipIntegrationRepository.allTipResultId).toHaveBeenCalledWith(
        resultCodes,
        2026,
      );
      expect(
        tipIntegrationRepository.inactiveAllTipResults,
      ).toHaveBeenCalledWith(9);
    });
  });

  // [CLAUDE/DONE] 192
  describe('getKnowledgeProductsByYear', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      mockStagingRepo.save.mockReset();
      mockStagingRepo.save.mockResolvedValue(undefined);
      syncProcessLogService.isInProgressYoungerThan.mockResolvedValue(false);
    });

    it('should fetch TIP data, load temporal results, process and end sync', async () => {
      const mockResponse = { data: [], data_count: 0 };
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: mockResponse }));
      const mapped = {
        public_link: 'http://link.example',
        is_version_applied: false,
        createResult: { year: 2025 },
        poolFunding: null,
      } as TipMappedResult;
      jest.spyOn(service, 'processing').mockResolvedValue([mapped]);
      prmsRepository.findTemporalResults.mockResolvedValue([]);

      await service.getKnowledgeProductsByYear(2025);

      expect(syncProcessLogService.initiateSync).toHaveBeenCalled();
      expect(prmsRepository.findTemporalResults).toHaveBeenCalledWith(
        expect.any(String),
      );
      expect(service.processing).toHaveBeenCalledWith([]);
      expect(saveResultService.bulkSaveAllSections).not.toHaveBeenCalled();
      expect(saveResultService.saveAllSections).toHaveBeenCalledTimes(2);
      const extras = saveResultService.saveAllSections.mock.calls.map(
        (call) => call[1],
      );
      expect(extras[0].platformCode).toBe(ReportingPlatformEnum.TIP);
      expect(extras[0].manageOfficialCode).toBe(true);
      expect(extras[0].findOptions).toBeUndefined();
      expect(extras[0].target).toEqual({
        officialCode: 9001,
        isSnapshot: true,
      });
      expect(extras[1].target).toEqual({
        officialCode: 9001,
        isSnapshot: false,
        compensateRowOnly: true,
      });
      expect(extras[0]).not.toBe(extras[1]);
      const firstPayload = saveResultService.saveAllSections.mock.calls[0][0];
      const secondPayload = saveResultService.saveAllSections.mock.calls[1][0];
      expect(firstPayload).not.toBe(mapped);
      expect(secondPayload).not.toBe(mapped);
      expect(firstPayload).not.toBe(secondPayload);
      expect(firstPayload).toEqual(mapped);
      expect(secondPayload).toEqual(mapped);
      expect(mapped.is_version_applied).toBe(false);
      expect(syncProcessLogService.update).toHaveBeenCalledWith(
        1,
        expect.any(Object),
      );
      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(1);
    });

    it('should clean temporal results after a successful sync', async () => {
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: { data: [], data_count: 0 } }));
      jest.spyOn(service, 'processing').mockResolvedValue([]);
      prmsRepository.findTemporalResults.mockResolvedValue([]);

      await service.getKnowledgeProductsByYear(2025);

      expect(prmsRepository.deleteTemporalResults).toHaveBeenCalledWith(
        expect.any(String),
      );
    });

    it('should paginate TIP API requests when data_count equals limit', async () => {
      const page1 = {
        data: [{ id: 1, name: 'KP 1' }],
        data_count: 50,
      };
      const page2 = {
        data: [{ id: 2, name: 'KP 2' }],
        data_count: 10,
      };
      const getRequestSpy = jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValueOnce(of({ data: page1 }))
        .mockReturnValueOnce(of({ data: page2 }));
      jest.spyOn(service, 'processing').mockResolvedValue([
        {
          official_code: 1,
          public_link: 'http://link.example',
          createResult: { year: 2026 },
        },
      ] as any);
      prmsRepository.findTemporalResults.mockResolvedValue([
        wrapTemporal({ ...baseProduct, name: 'KP 1' }),
      ] as any);

      await service.getKnowledgeProductsByYear(2026);

      expect(getRequestSpy).toHaveBeenCalledTimes(2);
      expect(getRequestSpy.mock.calls[1][0]).toContain('offset=50');
      expect((service as any).sleep).toHaveBeenCalledTimes(1);
      expect(mockStagingRepo.save).toHaveBeenCalledTimes(2);
      expect(saveResultService.saveAllSections).toHaveBeenCalledTimes(2);
      expect(saveResultService.bulkSaveAllSections).not.toHaveBeenCalled();
    });

    it('should stage each record using the TIP product id as code', async () => {
      const page = {
        data: [{ id: 987, name: 'KP with id' }],
        data_count: 1,
      };
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: page }));
      jest.spyOn(service, 'processing').mockResolvedValue([]);
      prmsRepository.findTemporalResults.mockResolvedValue([]);

      await service.getKnowledgeProductsByYear(2025);

      expect(mockStagingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 987,
          year: 2025,
        }),
      );
    });

    it('should skip Case Study publications when staging TIP records', async () => {
      const page = {
        data: [
          { id: 1, name: 'Journal Article', type: ['Journal Article'] },
          { id: 2, name: 'Case Study', type: ['Case Study'] },
          { id: 3, name: 'Mixed', type: ['Report', ' case study '] },
          { id: 4, name: 'No type' },
        ],
        data_count: 4,
      };
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: page }));
      jest.spyOn(service, 'processing').mockResolvedValue([]);
      prmsRepository.findTemporalResults.mockResolvedValue([]);

      await service.getKnowledgeProductsByYear(2025);

      expect(mockStagingRepo.save).toHaveBeenCalledTimes(2);
      const stagedCodes = mockStagingRepo.save.mock.calls.map(
        ([record]) => record.code,
      );
      expect(stagedCodes).toEqual([1, 4]);
    });

    it('should read staging only after every deferred staging save resolves', async () => {
      const page = {
        data: [
          { id: 1, name: 'KP 1' },
          { id: 2, name: 'KP 2' },
        ],
        data_count: 2,
      };
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: page }));
      jest.spyOn(service, 'processing').mockResolvedValue([]);

      const resolvers: Array<() => void> = [];
      let unresolved = 0;
      let readWhileUnresolved = false;
      mockStagingRepo.save.mockImplementation(
        () =>
          new Promise((resolve) => {
            unresolved += 1;
            resolvers.push(() => {
              unresolved -= 1;
              resolve(undefined);
            });
          }),
      );
      prmsRepository.findTemporalResults.mockImplementation(async () => {
        if (unresolved > 0) readWhileUnresolved = true;
        return [];
      });

      const run = service.getKnowledgeProductsByYear(2025);
      const readyDeadline = Date.now() + 1000;
      while (
        mockStagingRepo.save.mock.calls.length === 0 &&
        Date.now() < readyDeadline
      ) {
        await new Promise((resolve) => setImmediate(resolve));
      }

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockStagingRepo.save).toHaveBeenCalled();
      expect(prmsRepository.findTemporalResults).not.toHaveBeenCalled();
      expect(readWhileUnresolved).toBe(false);

      const releaseDeadline = Date.now() + 1000;
      while (resolvers.length > 0 && Date.now() < releaseDeadline) {
        resolvers.splice(0).forEach((release) => release());
        await new Promise((resolve) => setImmediate(resolve));
      }
      await run;

      expect(readWhileUnresolved).toBe(false);
      expect(mockStagingRepo.save).toHaveBeenCalledTimes(2);
      expect(prmsRepository.findTemporalResults).toHaveBeenCalledTimes(1);
    });

    it('should count one rejected staging save and continue the run', async () => {
      const page = {
        data: [
          { id: 1, name: 'KP ok' },
          { id: 2, name: 'KP bad' },
        ],
        data_count: 2,
      };
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: page }));
      jest.spyOn(service, 'processing').mockResolvedValue([]);
      prmsRepository.findTemporalResults.mockResolvedValue([]);
      const logSpy = jest.spyOn((service as any).logger, 'log');
      mockStagingRepo.save.mockImplementation((record: { code: number }) => {
        if (record.code === 2) {
          return Promise.reject(new Error('write failed'));
        }
        return Promise.resolve(undefined);
      });

      await service.getKnowledgeProductsByYear(2025);

      expect(mockStagingRepo.save).toHaveBeenCalledTimes(2);
      expect(prmsRepository.findTemporalResults).toHaveBeenCalledTimes(1);
      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('staging failures 1'),
      );
    });

    it('should throw BadRequestException and clean temporal data when TIP API request fails', async () => {
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.getKnowledgeProductsByYear(2025)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getKnowledgeProductsByYear(2025)).rejects.toThrow(
        'Error saving temporal data',
      );
      expect(syncProcessLogService.markFailed).toHaveBeenCalledWith(1);
      expect(prmsRepository.deleteTemporalResults).toHaveBeenCalledWith(
        expect.any(String),
      );
    });

    it('refuses a run already in progress with ConflictException and creates no log row', async () => {
      syncProcessLogService.isInProgressYoungerThan.mockResolvedValue(true);
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      let caught: unknown;
      try {
        await service.getKnowledgeProductsByYear(2025);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(ConflictException);
      const conflict = caught as ConflictException;
      expect(conflict.getStatus()).toBe(409);
      expect(conflict.message).toBe('TIP sync already in progress');
      expect(conflict.message).not.toBe('Error saving temporal data');
      expect(warnSpy).toHaveBeenCalledWith(
        'TIP sync refused: a run is already in progress',
      );
      expect(
        syncProcessLogService.isInProgressYoungerThan,
      ).toHaveBeenCalledWith(SyncProcessEnum.TIP_INTEGRATION, 6);
      expect(syncProcessLogService.initiateSync).not.toHaveBeenCalled();
      expect(syncProcessLogService.markFailed).not.toHaveBeenCalled();
      expect(prmsRepository.deleteTemporalResults).not.toHaveBeenCalled();
    });

    it('does not mark a log row FAILED when initiateSync throws before a row exists', async () => {
      syncProcessLogService.initiateSync.mockRejectedValueOnce(
        new Error('insert failed'),
      );

      await expect(service.getKnowledgeProductsByYear(2025)).rejects.toThrow(
        'Error saving temporal data',
      );
      expect(syncProcessLogService.markFailed).not.toHaveBeenCalled();
    });
  });

  // [CLAUDE/DONE] 193
  describe('processing', () => {
    beforeEach(() => {
      clarisaRegionsService.findByUm49Codes.mockResolvedValue([]);
      clarisaCountriesService.findByUm49Codes.mockResolvedValue([]);
      clarisaLeversService.findByNames.mockResolvedValue([]);
    });

    it('should map a product with project as object and return one mapping', async () => {
      const results = await service.processing([wrapTemporal(baseProduct)]);

      expect(results).toHaveLength(1);
      expect(results[0].createResult.contract_id).toBe('AGR-001');
      expect(results[0].createResult.year).toBe(2025);
    });

    it('should map a product with project as non-empty array', async () => {
      const product = wrapTemporal({
        ...baseProduct,
        project: [{ agreement_id: 'AGR-002', description: 'P2' }],
      });
      const results = await service.processing([product]);

      expect(results[0].createResult.contract_id).toBe('AGR-002');
    });

    it('should use null contract_id when project is empty array', async () => {
      const product = wrapTemporal({ ...baseProduct, project: [] });
      const results = await service.processing([product]);

      expect(results[0].createResult.contract_id).toBeNull();
    });

    it('should not call user lookup when submitter is null', async () => {
      await service.processing([wrapTemporal(baseProduct)]);

      expect(resultRepository.findUserByEmailOrCarnet).not.toHaveBeenCalled();
    });

    it('should map evidence with link and doi', async () => {
      const results = await service.processing([wrapTemporal(baseProduct)]);
      const evidences = results[0].evidence.evidence as any[];

      expect(evidences[0].evidence_url).toBe('http://link.example');
      expect(evidences[1].evidence_url).toBe('10.1234/test');
    });

    it('should map knowledge product fields correctly', async () => {
      const results = await service.processing([wrapTemporal(baseProduct)]);

      expect(results[0].knowledgeProduct.citation).toBe('Test Citation');
      expect(results[0].knowledgeProduct.open_access).toBe(true);
      expect(results[0].knowledgeProduct.type).toBe('Journal article');
    });

    it('should map tip_id from the TIP product id', async () => {
      const results = await service.processing([wrapTemporal(baseProduct)]);

      expect(results[0].knowledgeProduct.tip_id).toBe(555);
    });

    it('should map public_link, created_at and is_version_applied from temporal data', async () => {
      const results = await service.processing([
        wrapTemporal(baseProduct, { is_version: true }),
      ]);

      expect(results[0].public_link).toBe('http://link.example');
      expect(results[0].created_at).toEqual(new Date('2025-01-01'));
      expect(results[0].is_version_applied).toBe(true);
    });

    it('should default is_version_applied to false when is_version is missing', async () => {
      const results = await service.processing([
        wrapTemporal(baseProduct, { is_version: undefined }),
      ]);

      expect(results[0].is_version_applied).toBe(false);
    });

    it('should map SDGs from TIP format into alignments', async () => {
      clarisaSdgsService.findSdgByTipFormat.mockResolvedValue([
        { id: 7 },
      ] as any);
      const product = wrapTemporal({
        ...baseProduct,
        sdgs: ['SDG 7 - Affordable Energy'],
      });

      const results = await service.processing([product]);

      expect(clarisaSdgsService.findSdgByTipFormat).toHaveBeenCalledWith([
        'SDG 7 - Affordable Energy',
      ]);
      expect(results[0].alignments.result_sdgs).toEqual([
        { clarisa_sdg_id: 7 },
      ]);
    });

    it('should return empty array when input is empty', async () => {
      const results = await service.processing([]);

      expect(results).toEqual([]);
    });

    it('should skip temporal records with empty data', async () => {
      const results = await service.processing([
        wrapTemporal(baseProduct, { data: null as any }),
      ]);

      expect(results).toEqual([]);
    });

    const a132Mapping: TipTocMappingDto = {
      science_program_id: 'SP01',
      toc_result_id: 7033,
      toc_result_indicator_id: 'f3706ba2-0000-4000-8000-000000000001',
      target_contribution: 1,
      result_title: 'HLO1.AOW1.IO1 Steer to impact',
    };

    it('maps three projects with A132 primary and that project pool funding', async () => {
      const product = wrapTemporal({
        ...baseProduct,
        project: [
          {
            agreement_id: 'A171',
            description: 'second',
            is_primary: false,
          },
          {
            agreement_id: 'A132',
            description: 'primary',
            is_primary: true,
            is_contributing_to_pool_funding: true,
            toc_mapping: a132Mapping,
          },
          {
            agreement_id: 'A1824',
            description: 'third',
            is_primary: false,
          },
        ],
      });

      const results = await service.processing([product]);

      expect(results[0].alignments.contracts).toEqual([
        { contract_id: 'A171', is_primary: false },
        { contract_id: 'A132', is_primary: true },
        { contract_id: 'A1824', is_primary: false },
      ]);
      expect(results[0].createResult.contract_id).toBe('A132');
      expect(results[0].poolFunding).toEqual(a132Mapping);
    });

    it('moves the primary to the flagged project on a re-sync payload', async () => {
      const product = wrapTemporal({
        ...baseProduct,
        project: [
          {
            agreement_id: 'A132',
            description: 'was primary',
            is_primary: false,
          },
          {
            agreement_id: 'A171',
            description: 'now primary',
            is_primary: true,
          },
        ],
      });

      const results = await service.processing([product]);

      expect(results[0].alignments.contracts).toEqual([
        { contract_id: 'A132', is_primary: false },
        { contract_id: 'A171', is_primary: true },
      ]);
      expect(results[0].createResult.contract_id).toBe('A171');
    });

    it('drops an unknown non-primary agreement so the save payload cannot hit the FK', async () => {
      mockAgressoRepo.find.mockResolvedValue([{ agreement_id: 'A132' }]);
      const product = wrapTemporal({
        ...baseProduct,
        project: [
          {
            agreement_id: 'A132',
            description: 'known',
            is_primary: true,
            is_contributing_to_pool_funding: true,
            toc_mapping: a132Mapping,
          },
          { agreement_id: 'ZZ999', description: 'unknown', is_primary: false },
        ],
      });

      const results = await service.processing([product]);

      expect(
        results[0].alignments.contracts.map((contract) => contract.contract_id),
      ).toEqual(['A132']);
      expect(results[0].createResult.contract_id).toBe('A132');
    });

    it('keeps a known non-primary and writes no pool funding when the flagged primary is unknown', async () => {
      mockAgressoRepo.find.mockResolvedValue([{ agreement_id: 'A171' }]);
      const product = wrapTemporal({
        ...baseProduct,
        project: [
          {
            agreement_id: 'ZZ999',
            description: 'unknown primary',
            is_primary: true,
            is_contributing_to_pool_funding: true,
            toc_mapping: a132Mapping,
          },
          { agreement_id: 'A171', description: 'known', is_primary: false },
        ],
      });

      const results = await service.processing([product]);

      expect(results[0].alignments.contracts).toEqual([
        { contract_id: 'A171', is_primary: false },
      ]);
      expect(results[0].createResult.contract_id).toBe('A171');
      expect(results[0].poolFunding).toBeNull();
    });

    it('loads known agreement ids once for a two-result batch', async () => {
      await service.processing([
        wrapTemporal({
          ...baseProduct,
          project: { agreement_id: 'AGR-A', description: 'a' },
        }),
        wrapTemporal({
          ...baseProduct,
          id: 556,
          link: 'http://other.example',
          project: { agreement_id: 'AGR-B', description: 'b' },
        }),
      ]);

      expect(mockAgressoRepo.find).toHaveBeenCalledTimes(1);
      expect(mockAgressoRepo.find).toHaveBeenCalledWith({
        where: { agreement_id: In(['AGR-A', 'AGR-B']) },
        select: { agreement_id: true },
      });
    });

    it('does not query agresso contracts when no project has an agreement id', async () => {
      await service.processing([wrapTemporal({ ...baseProduct, project: [] })]);

      expect(mockAgressoRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('pool-funding import step', () => {
    const runYear = async (processed: TipMappedResult[]) => {
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: { data: [], data_count: 0 } }));
      jest.spyOn(service, 'processing').mockResolvedValue(processed);
      prmsRepository.findTemporalResults.mockResolvedValue([]);
      await service.getKnowledgeProductsByYear(2025);
    };

    const mapping = (
      scienceProgramId: string,
      tocResultId: number,
    ): TipTocMappingDto => ({
      science_program_id: scienceProgramId,
      toc_result_id: tocResultId,
    });

    const row = (
      publicLink: string,
      year: number,
      poolFunding: TipTocMappingDto | null,
      userData: { sec_user_id: number } | null = null,
      isVersionApplied = false,
      tipId = 555,
    ): TipMappedResult =>
      ({
        public_link: publicLink,
        is_version_applied: isVersionApplied,
        createResult: { year },
        poolFunding,
        userData,
        knowledgeProduct: { tip_id: tipId },
      }) as TipMappedResult;

    const savedRows: {
      result_id: number;
      where: Record<string, unknown>;
      target?: {
        isSnapshot?: boolean;
        officialCode?: number;
        resultId?: number;
        compensateRowOnly?: boolean;
      };
    }[] = [];

    beforeEach(() => {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      savedRows.length = 0;
      let nextId = 100;
      saveResultService.saveAllSections.mockImplementation(
        async (result, extra) => {
          const where: Record<string, unknown> = {
            platform_code: extra?.platformCode,
            report_year_id: result.createResult?.year,
          };
          for (const key of Object.keys(extra?.findOptions ?? {})) {
            where[key] = result[extra.findOptions[key]];
          }
          const resultId = nextId++;
          savedRows.push({
            result_id: resultId,
            where,
            target: extra?.target ? { ...extra.target } : undefined,
          });
          const link = result.public_link ?? '';
          let outcome: 'created' | 'updated' | 'error' | 'skipped' = 'skipped';
          if (link.endsWith('/created')) {
            extra.counters.createdRecords += 1;
            outcome = 'created';
          } else if (link.endsWith('/updated')) {
            extra.counters.updatedRecords += 1;
            outcome = 'updated';
          } else if (link.endsWith('/error')) {
            extra.counters.errorRecords += 1;
            outcome = 'error';
          }
          return { resultId, outcome };
        },
      );
      mockResultRepo.findOne.mockImplementation(async (options) => {
        const where = options?.where ?? {};
        const match = savedRows.find((saved) =>
          Object.entries(where).every(
            ([key, value]) => saved.where[key] === value,
          ),
        );
        return match ? { result_id: match.result_id } : null;
      });
    });

    it('imports only results whose created or updated counter moved', async () => {
      await runYear([
        row('http://batch/created', 2025, mapping('SP01', 1)),
        row('http://batch/updated', 2025, mapping('SP01', 2)),
        row('http://batch/omit', 2025, mapping('SP01', 3)),
        row('http://batch/error', 2025, mapping('SP01', 4)),
      ]);

      expect(bilateralService.importAlignmentFromTip).toHaveBeenCalledTimes(4);
      expect(
        bilateralService.importAlignmentFromTip.mock.calls.map(
          (call) => call[1].toc_result_id,
        ),
      ).toEqual([1, 1, 2, 2]);
    });

    it('writes a version per year then the live row, ignoring is_version_applied', async () => {
      await runYear([
        row(
          'http://same.example/created',
          2025,
          mapping('SP01', 7033),
          null,
          true,
          9001,
        ),
        row(
          'http://same.example/created',
          2026,
          mapping('SP02', 8001),
          null,
          false,
          9001,
        ),
      ]);

      const targets = saveResultService.saveAllSections.mock.calls.map(
        (call) => call[1].target,
      );
      expect(targets.map((target) => target.isSnapshot)).toEqual([
        true,
        true,
        false,
      ]);
      expect(
        saveResultService.saveAllSections.mock.calls.map(
          (call) => call[0].createResult.year,
        ),
      ).toEqual([2025, 2026, 2026]);
      expect(
        saveResultService.saveAllSections.mock.calls[0][1].findOptions,
      ).toBeUndefined();
      expect(bilateralService.importAlignmentFromTip).toHaveBeenCalledTimes(3);
      const version2025 = savedRows.find(
        (saved) => saved.where.report_year_id === 2025,
      );
      const version2026 = savedRows.find(
        (saved) =>
          saved.where.report_year_id === 2026 &&
          saved.target?.isSnapshot === true,
      );
      const live = savedRows.find(
        (saved) =>
          saved.where.report_year_id === 2026 &&
          saved.target?.isSnapshot === false,
      );
      expect(bilateralService.importAlignmentFromTip).toHaveBeenNthCalledWith(
        1,
        version2025?.result_id,
        expect.objectContaining({
          science_program_id: 'SP01',
          toc_result_id: 7033,
        }),
        2025,
        null,
        expect.any(Map),
      );
      expect(bilateralService.importAlignmentFromTip).toHaveBeenNthCalledWith(
        2,
        version2026?.result_id,
        expect.objectContaining({
          science_program_id: 'SP02',
          toc_result_id: 8001,
        }),
        2026,
        null,
        expect.any(Map),
      );
      expect(bilateralService.importAlignmentFromTip).toHaveBeenNthCalledWith(
        3,
        live?.result_id,
        expect.objectContaining({
          science_program_id: 'SP02',
          toc_result_id: 8001,
        }),
        2026,
        null,
        expect.any(Map),
      );
      const memos = bilateralService.importAlignmentFromTip.mock.calls.map(
        (call) => call[4],
      );
      expect(memos[0]).toBe(memos[1]);
      expect(memos[1]).toBe(memos[2]);
    });

    it('passes a null actor when userData is null and the submitter id when resolved', async () => {
      await runYear([
        row('http://actor-null/created', 2025, mapping('SP01', 1), null),
        row('http://actor-user/created', 2025, mapping('SP01', 2), {
          sec_user_id: 77,
        }),
      ]);

      expect(bilateralService.importAlignmentFromTip).toHaveBeenCalledTimes(4);
      expect(bilateralService.importAlignmentFromTip.mock.calls[0][3]).toBe(
        null,
      );
      expect(bilateralService.importAlignmentFromTip.mock.calls[1][3]).toBe(
        null,
      );
      expect(bilateralService.importAlignmentFromTip.mock.calls[2][3]).toBe(77);
      expect(bilateralService.importAlignmentFromTip.mock.calls[3][3]).toBe(77);
    });

    it('keeps going when the first import throws and logs that TIP id', async () => {
      bilateralService.importAlignmentFromTip
        .mockRejectedValueOnce(new Error('write failed'))
        .mockResolvedValueOnce(undefined);
      const errorSpy = jest.spyOn((service as any).logger, 'error');

      await runYear([
        row('http://first/created', 2025, mapping('SP01', 1), null, false, 111),
        row(
          'http://second/created',
          2025,
          mapping('SP02', 2),
          null,
          false,
          222,
        ),
      ]);

      expect(bilateralService.importAlignmentFromTip).toHaveBeenCalledTimes(4);
      expect(
        bilateralService.importAlignmentFromTip.mock.calls.map(
          (call) => call[1].science_program_id,
        ),
      ).toEqual(['SP01', 'SP01', 'SP02', 'SP02']);
      const counters = syncProcessLogService.update.mock.calls[0][1];
      expect(counters.createdRecords).toBe(4);
      expect(counters.updatedRecords).toBe(0);
      expect(counters.errorRecords).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith(
        'Error importing TIP pool funding for TIP 111 http://first/created (2025): write failed',
      );
    });

    it('does not find or import when poolFunding is null', async () => {
      await runYear([row('http://gone/created', 2025, null)]);

      expect(mockResultRepo.findOne).not.toHaveBeenCalled();
      expect(bilateralService.importAlignmentFromTip).not.toHaveBeenCalled();
    });
  });

  // [CLAUDE/DONE] 194
  describe('mapRegions', () => {
    it('should extract un_codes and delegate to clarisaRegionsService', async () => {
      const mockRegions = [
        { name: 'LAC', un_code: 419 },
        { name: 'AF', un_code: 2 },
      ] as any;
      const mockResult = [{ um49Code: 419 }] as any;
      clarisaRegionsService.findByUm49Codes.mockResolvedValue(mockResult);

      const result = await service.mapRegions(mockRegions);

      expect(clarisaRegionsService.findByUm49Codes).toHaveBeenCalledWith([
        419, 2,
      ]);
      expect(result).toEqual(mockResult);
    });

    it('should pass empty array when no regions provided', async () => {
      clarisaRegionsService.findByUm49Codes.mockResolvedValue([]);

      const result = await service.mapRegions([]);

      expect(clarisaRegionsService.findByUm49Codes).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });

  // [CLAUDE/DONE] 195
  describe('mapCountries', () => {
    it('should extract un_codes and delegate to clarisaCountriesService', async () => {
      const mockCountries = [
        { name: 'Colombia', un_code: 170 },
        { name: 'Ecuador', un_code: 218 },
      ] as any;
      const mockResult = [{ isoAlpha2: 'CO' }, { isoAlpha2: 'EC' }] as any;
      clarisaCountriesService.findByUm49Codes.mockResolvedValue(mockResult);

      const result = await service.mapCountries(mockCountries);

      expect(clarisaCountriesService.findByUm49Codes).toHaveBeenCalledWith([
        170, 218,
      ]);
      expect(result).toEqual(mockResult);
    });

    it('should pass empty array when no countries provided', async () => {
      clarisaCountriesService.findByUm49Codes.mockResolvedValue([]);

      await service.mapCountries([]);

      expect(clarisaCountriesService.findByUm49Codes).toHaveBeenCalledWith([]);
    });
  });

  // [CLAUDE/DONE] 196
  describe('mapLevers', () => {
    it('should parse lever names like "Lever1" into "Lever 1"', async () => {
      const mockClarisaLevers = [{ id: 1, short_name: 'Lever 1' }] as any;
      clarisaLeversService.findByNames.mockResolvedValue(mockClarisaLevers);

      const result = await service.mapLevers(['Lever1', 'Lever2']);

      expect(clarisaLeversService.findByNames).toHaveBeenCalledWith([
        'Lever 1',
        'Lever 2',
      ]);
      expect(result).toEqual(mockClarisaLevers);
    });

    it('should ignore strings that do not match the Lever pattern', async () => {
      clarisaLeversService.findByNames.mockResolvedValue([]);

      await service.mapLevers(['NoMatch', 'Other', 'CGIAR-Lever']);

      expect(clarisaLeversService.findByNames).toHaveBeenCalledWith([]);
    });

    it('should return empty array when levers list is empty', async () => {
      clarisaLeversService.findByNames.mockResolvedValue([]);

      const result = await service.mapLevers([]);

      expect(clarisaLeversService.findByNames).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });

  describe('per-handle routine', () => {
    type SaveOutcome = 'created' | 'updated' | 'skipped' | 'error';
    type RecordedSave = {
      payload: TipMappedResult;
      extra: {
        target?: {
          resultId?: number;
          officialCode: number;
          isSnapshot: boolean;
          compensateRowOnly?: boolean;
        };
        counters?: {
          createdRecords: number;
          updatedRecords: number;
          errorRecords: number;
        };
      };
      resultId: number;
      outcome: SaveOutcome;
    };

    const recorded: RecordedSave[] = [];

    const emptyResolution = (): TipHandleResolution => ({
      live: null,
      otherLive: [],
      versions: {},
      otherVersions: [],
    });

    const handleRow = (
      resultId: number,
      code: number,
      year: number,
      isSnapshot: boolean,
    ): TipHandleRow => ({
      result_id: resultId,
      result_official_code: code,
      report_year_id: year,
      is_snapshot: isSnapshot,
      is_active: true,
    });

    const payload = (
      handle: string,
      year: number,
      extras: {
        title?: string;
        poolFunding?: TipTocMappingDto | null;
        userData?: { sec_user_id: number } | null;
        tipId?: number;
      } = {},
    ): TipMappedResult =>
      ({
        public_link: handle,
        createResult: { year, title: extras.title ?? `title-${year}` },
        poolFunding: extras.poolFunding ?? null,
        userData: extras.userData ?? null,
        knowledgeProduct: { tip_id: extras.tipId ?? year },
        is_version_applied: false,
      }) as TipMappedResult;

    const versionSaves = () =>
      recorded.filter((row) => row.extra.target?.isSnapshot === true);
    const liveSaves = () =>
      recorded.filter((row) => row.extra.target?.isSnapshot === false);
    const writtenSaves = () =>
      recorded.filter(
        (row) => row.outcome === 'created' || row.outcome === 'updated',
      );

    const run = async (rows: TipMappedResult[]) => {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: { data: [], data_count: 0 } }));
      jest.spyOn(service, 'processing').mockResolvedValue(rows);
      prmsRepository.findTemporalResults.mockResolvedValue([]);
      await service.getKnowledgeProductsByYear(2026);
    };

    const installSave = (
      decide: (
        row: TipMappedResult,
        extra: RecordedSave['extra'],
      ) => SaveOutcome = () => 'created',
    ) => {
      recorded.length = 0;
      let nextId = 1000;
      saveResultService.saveAllSections.mockImplementation(
        async (row, extra) => {
          const mapped = row as TipMappedResult;
          const outcome = decide(mapped, extra);
          const resultId = extra?.target?.resultId ?? nextId++;
          if (outcome === 'created') extra.counters.createdRecords += 1;
          if (outcome === 'updated') extra.counters.updatedRecords += 1;
          if (outcome === 'error') extra.counters.errorRecords += 1;
          recorded.push({ payload: mapped, extra, resultId, outcome });
          return { resultId, outcome };
        },
      );
    };

    beforeEach(() => {
      tipHandleRepository.resolve.mockResolvedValue(emptyResolution());
      resultsService.newOfficialCode.mockResolvedValue(4242);
      installSave();
    });

    it('R-TVR-001 new handle mints one code for the live row and the version', async () => {
      await run([payload('http://h', 2025, { title: 'new-2025' })]);

      expect(resultsService.newOfficialCode).toHaveBeenCalledTimes(1);
      expect(resultsService.newOfficialCode).toHaveBeenCalledWith(
        ReportingPlatformEnum.TIP,
      );
      expect(recorded.map((row) => row.payload.createResult.title)).toEqual([
        'new-2025',
        'new-2025',
      ]);
      expect(recorded[0].extra.target).toEqual({
        officialCode: 4242,
        isSnapshot: true,
      });
      expect(recorded[1].extra.target).toEqual({
        officialCode: 4242,
        isSnapshot: false,
        compensateRowOnly: true,
      });
      expect(recorded[0].extra).not.toBe(recorded[1].extra);

      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(10, 4242, 2025, false),
        otherLive: [],
        versions: { 2025: handleRow(11, 4242, 2025, true) },
        otherVersions: [],
      });
      recorded.length = 0;
      await run([payload('http://h', 2026, { title: 'later-2026' })]);

      expect(resultsService.newOfficialCode).toHaveBeenCalledTimes(1);
      expect(
        recorded.every((row) => row.extra.target?.officialCode === 4242),
      ).toBe(true);
    });

    it('R-TVR-001 same handle another year versions the new year and does not create a live row', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(400, 50, 2025, false),
        otherLive: [],
        versions: { 2025: handleRow(500, 50, 2025, true) },
        otherVersions: [],
      });
      installSave((_row, extra) =>
        extra.target?.resultId != null ? 'updated' : 'created',
      );

      await run([payload('http://h', 2026, { title: 'y2026' })]);

      expect(resultsService.newOfficialCode).not.toHaveBeenCalled();
      expect(versionSaves()).toHaveLength(1);
      expect(versionSaves()[0].extra.target).toEqual({
        officialCode: 50,
        isSnapshot: true,
      });
      expect(versionSaves()[0].outcome).toBe('created');
      expect(versionSaves()[0].payload.createResult.title).toBe('y2026');
      expect(liveSaves()).toHaveLength(1);
      expect(liveSaves()[0].extra.target?.resultId).toBe(400);
      expect(liveSaves()[0].extra.target?.officialCode).toBe(50);
      expect(liveSaves()[0].outcome).toBe('updated');
      expect(liveSaves()[0].payload.createResult.year).toBe(2026);
      const counters = syncProcessLogService.update.mock.calls[0][1];
      expect(counters.createdRecords).toBe(1);
      expect(counters.updatedRecords).toBe(1);
    });

    it('R-TVR-002 first year seen also gets its version', async () => {
      await run([payload('http://h', 2023, { title: 'only-2023' })]);

      expect(
        recorded.map((row) => [
          row.payload.createResult.year,
          row.extra.target?.isSnapshot,
          row.payload.createResult.title,
        ]),
      ).toEqual([
        [2023, true, 'only-2023'],
        [2023, false, 'only-2023'],
      ]);
    });

    it('R-TVR-002 year TIP no longer returns leaves the missing year unchanged', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(300, 8, 2025, false),
        otherLive: [],
        versions: {
          2023: handleRow(301, 8, 2023, true),
          2025: handleRow(302, 8, 2025, true),
        },
        otherVersions: [],
      });
      installSave((_row, extra) =>
        extra.target?.resultId != null ? 'updated' : 'created',
      );

      await run([payload('http://h', 2025, { title: 'still-2025' })]);

      expect(recorded.some((row) => row.extra.target?.resultId === 301)).toBe(
        false,
      );
      expect(versionSaves()[0].extra.target?.resultId).toBe(302);
      expect(versionSaves()[0].payload.createResult.title).toBe('still-2025');
      expect(versionSaves()[0].outcome).toBe('updated');
    });

    it('R-TVR-003 three years: versions ascending then live holds the highest', async () => {
      await run([
        payload('http://h', 2026, { title: 't-2026' }),
        payload('http://h', 2023, { title: 't-2023' }),
        payload('http://h', 2025, { title: 't-2025' }),
      ]);

      expect(
        recorded.map((row) => [
          row.payload.createResult.year,
          row.extra.target?.isSnapshot,
          row.payload.createResult.title,
        ]),
      ).toEqual([
        [2023, true, 't-2023'],
        [2025, true, 't-2025'],
        [2026, true, 't-2026'],
        [2026, false, 't-2026'],
      ]);
      expect(resultsService.newOfficialCode).toHaveBeenCalledTimes(1);
      expect(
        recorded.every((row) => row.extra.target?.officialCode === 4242),
      ).toBe(true);
      expect(new Set(recorded.map((row) => row.extra)).size).toBe(
        recorded.length,
      );
      expect(recorded[0].extra.target?.isSnapshot).toBe(true);
      const counters = syncProcessLogService.update.mock.calls[0][1];
      expect(counters.createdRecords).toBe(4);
      expect(counters.updatedRecords).toBe(0);
    });

    it('R-TVR-003 older year after a newer one leaves the live row untouched', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(400, 10, 2026, false),
        otherLive: [],
        versions: { 2026: handleRow(401, 10, 2026, true) },
        otherVersions: [],
      });

      await run([payload('http://h', 2025, { title: 'only-2025' })]);

      expect(recorded).toHaveLength(1);
      expect(recorded[0].extra.target?.isSnapshot).toBe(true);
      expect(recorded[0].payload.createResult).toEqual({
        year: 2025,
        title: 'only-2025',
      });
      expect(liveSaves()).toHaveLength(0);
    });

    it('live row at 2026 with no version stays untouched when the run brings 2025', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(400, 10, 2026, false),
        otherLive: [],
        versions: {},
        otherVersions: [],
      });

      await run([payload('http://h', 2025, { title: 'older-than-live' })]);

      expect(recorded).toHaveLength(1);
      expect(recorded[0].extra.target).toEqual({
        officialCode: 10,
        isSnapshot: true,
      });
      expect(recorded[0].payload.createResult.year).toBe(2025);
      expect(liveSaves()).toHaveLength(0);
    });

    it('R-TVR-003 new highest year keeps result_id and code', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(400, 77, 2026, false),
        otherLive: [],
        versions: { 2026: handleRow(401, 77, 2026, true) },
        otherVersions: [],
      });
      installSave((_row, extra) =>
        extra.target?.resultId != null ? 'updated' : 'created',
      );

      await run([payload('http://h', 2027, { title: 'y2027' })]);

      expect(resultsService.newOfficialCode).not.toHaveBeenCalled();
      expect(versionSaves()[0].extra.target).toEqual({
        officialCode: 77,
        isSnapshot: true,
      });
      expect(versionSaves()[0].outcome).toBe('created');
      expect(liveSaves()[0].extra.target?.resultId).toBe(400);
      expect(liveSaves()[0].extra.target?.officialCode).toBe(77);
      expect(liveSaves()[0].extra.target?.isSnapshot).toBe(false);
      expect(liveSaves()[0].outcome).toBe('updated');
      expect(liveSaves()[0].payload.createResult).toEqual({
        year: 2027,
        title: 'y2027',
      });
    });

    it('R-TVR-003 highest year skipped as a duplicate is not written', async () => {
      installSave((row) =>
        row.createResult.year === 2026 ? 'skipped' : 'created',
      );
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await run([
        payload('http://h', 2025, {
          title: 'kept-2025',
          poolFunding: { science_program_id: 'SP01', toc_result_id: 1 },
        }),
        payload('http://h', 2026, {
          title: 'dup-2026',
          poolFunding: { science_program_id: 'SP02', toc_result_id: 2 },
        }),
      ]);

      expect(
        writtenSaves().map((row) => [
          row.payload.createResult.year,
          row.extra.target?.isSnapshot,
          row.payload.createResult.title,
        ]),
      ).toEqual([
        [2025, true, 'kept-2025'],
        [2025, false, 'kept-2025'],
      ]);
      expect(
        recorded.some(
          (row) =>
            row.payload.createResult.year === 2026 &&
            (row.outcome === 'created' || row.outcome === 'updated'),
        ),
      ).toBe(false);
      expect(
        recorded.find((row) => row.payload.createResult.year === 2026)?.outcome,
      ).toBe('skipped');
      expect(warnSpy).toHaveBeenCalledWith(
        'TIP handle http://h: highest year 2026 skipped as a duplicate',
      );
      expect(
        bilateralService.importAlignmentFromTip.mock.calls.map((call) => [
          call[1].science_program_id,
          call[2],
        ]),
      ).toEqual([
        ['SP01', 2025],
        ['SP01', 2025],
      ]);
    });

    it('R-TVR-004 two years two mappings stay on their own rows', async () => {
      await run([
        payload('http://h', 2025, {
          title: 'm2025',
          poolFunding: { science_program_id: 'SP01', toc_result_id: 11 },
        }),
        payload('http://h', 2026, {
          title: 'm2026',
          poolFunding: { science_program_id: 'SP02', toc_result_id: 22 },
        }),
      ]);

      const version2025 = recorded.find(
        (row) =>
          row.extra.target?.isSnapshot === true &&
          row.payload.createResult.year === 2025,
      );
      const version2026 = recorded.find(
        (row) =>
          row.extra.target?.isSnapshot === true &&
          row.payload.createResult.year === 2026,
      );
      const live = recorded.find(
        (row) => row.extra.target?.isSnapshot === false,
      );
      expect(version2025?.resultId).not.toBe(version2026?.resultId);
      expect(live?.resultId).not.toBe(version2026?.resultId);
      expect(live?.payload.createResult.title).toBe('m2026');
      expect(version2025?.payload.createResult.title).toBe('m2025');
      expect(
        bilateralService.importAlignmentFromTip.mock.calls.map((call) => [
          call[0],
          call[1].science_program_id,
          call[2],
        ]),
      ).toEqual([
        [version2025?.resultId, 'SP01', 2025],
        [version2026?.resultId, 'SP02', 2026],
        [live?.resultId, 'SP02', 2026],
      ]);
    });

    it('R-TVR-007 legacy handle gets a version and keeps the live result_id', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(400, 12, 2024, false),
        otherLive: [],
        versions: {},
        otherVersions: [],
      });
      installSave((_row, extra) =>
        extra.target?.resultId != null ? 'updated' : 'created',
      );

      await run([payload('http://h', 2024, { title: 'legacy-2024' })]);

      expect(resultsService.newOfficialCode).not.toHaveBeenCalled();
      expect(versionSaves()[0].extra.target).toEqual({
        officialCode: 12,
        isSnapshot: true,
      });
      expect(versionSaves()[0].outcome).toBe('created');
      expect(liveSaves()[0].extra.target?.resultId).toBe(400);
      expect(liveSaves()[0].extra.target?.officialCode).toBe(12);
      expect(liveSaves()[0].outcome).toBe('updated');
      expect(liveSaves()[0].payload.createResult.year).toBe(2024);
    });

    it('skips an empty link with a warn', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await run([
        payload('', 2025, { title: 'blank' }),
        {
          ...payload('http://kept', 2024, { title: 'kept' }),
          public_link: null,
        } as TipMappedResult,
        payload('http://kept', 2024, { title: 'kept' }),
      ]);

      expect(
        warnSpy.mock.calls.filter(
          (call) => call[0] === 'TIP row skipped: empty public link',
        ),
      ).toHaveLength(2);
      expect(recorded).toHaveLength(2);
      expect(
        recorded.every((row) => row.payload.public_link === 'http://kept'),
      ).toBe(true);
      expect(recorded[0].payload.createResult.title).toBe('kept');
    });

    it('repeated handle and year keeps the first payload and warns', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await run([
        payload('http://h', 2025, { title: 'first' }),
        payload('http://h', 2025, { title: 'second' }),
      ]);

      expect(warnSpy).toHaveBeenCalledWith(
        'TIP handle http://h: repeated year 2025; first payload kept',
      );
      expect(versionSaves()).toHaveLength(1);
      expect(versionSaves()[0].payload.createResult.title).toBe('first');
      expect(liveSaves()[0].payload.createResult.title).toBe('first');
      expect(
        recorded.some((row) => row.payload.createResult.title === 'second'),
      ).toBe(false);
    });

    it('version-only handle reuses its code', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: null,
        otherLive: [],
        versions: { 2024: handleRow(9, 42, 2024, true) },
        otherVersions: [],
      });

      await run([payload('http://h', 2025, { title: 'next' })]);

      expect(resultsService.newOfficialCode).not.toHaveBeenCalled();
      expect(
        recorded.every((row) => row.extra.target?.officialCode === 42),
      ).toBe(true);
      expect(versionSaves()[0].extra.target?.resultId).toBeUndefined();
      expect(liveSaves()[0].extra.target?.resultId).toBeUndefined();
      expect(liveSaves()[0].extra.target?.compensateRowOnly).toBe(true);
    });

    it('prefers the live row code when a version row has another code', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(400, 10, 2025, false),
        otherLive: [],
        versions: { 2025: handleRow(401, 99, 2025, true) },
        otherVersions: [],
      });
      installSave((_row, extra) =>
        extra.target?.resultId != null ? 'updated' : 'created',
      );

      await run([payload('http://h', 2026, { title: 'next' })]);

      expect(resultsService.newOfficialCode).not.toHaveBeenCalled();
      expect(recorded).toHaveLength(2);
      expect(
        recorded.every((row) => row.extra.target?.officialCode === 10),
      ).toBe(true);
      expect(
        recorded.some((row) => row.extra.target?.officialCode === 99),
      ).toBe(false);
    });

    it('reuses the higher version year code when versions disagree', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: null,
        otherLive: [],
        versions: {
          2023: handleRow(1, 11, 2023, true),
          2026: handleRow(2, 22, 2026, true),
        },
        otherVersions: [],
      });

      await run([payload('http://h', 2027, { title: 'newest' })]);

      expect(resultsService.newOfficialCode).not.toHaveBeenCalled();
      expect(recorded).toHaveLength(2);
      expect(
        recorded.every((row) => row.extra.target?.officialCode === 22),
      ).toBe(true);
      expect(
        recorded.some((row) => row.extra.target?.officialCode === 11),
      ).toBe(false);
    });

    it('live save receives the TIP levers, not the version save mutation', async () => {
      const tipLevers = [{ lever_id: 7 }];
      const row = payload('http://h', 2025, {
        title: 'levers',
        poolFunding: { science_program_id: 'SP01', toc_result_id: 3 },
      });
      row.alignments = {
        primary_levers: tipLevers,
      } as unknown as TipMappedResult['alignments'];
      const leversAtCall: Array<Array<Record<string, unknown>>> = [];
      saveResultService.saveAllSections.mockImplementation(
        async (input, extra) => {
          const mapped = input as TipMappedResult;
          leversAtCall.push(
            (mapped.alignments?.primary_levers ?? []).map((lever) => ({
              ...lever,
            })),
          );
          if (mapped.alignments) {
            mapped.alignments.primary_levers = [
              {
                lever_id: 7,
                result_lever_id: 50,
                result_lever_sdg_targets: [{ result_lever_sdg_target_id: 900 }],
              },
            ] as never;
          }
          if (mapped.poolFunding) {
            mapped.poolFunding.science_program_id = 'MUTATED';
          }
          extra.counters.createdRecords += 1;
          const resultId = extra.target?.isSnapshot ? 501 : 502;
          return { resultId, outcome: 'created' as const };
        },
      );

      await run([row]);

      expect(leversAtCall).toHaveLength(2);
      expect(leversAtCall[0]).toEqual([{ lever_id: 7 }]);
      expect(leversAtCall[1]).toEqual([{ lever_id: 7 }]);
      expect(leversAtCall[1][0]).not.toHaveProperty('result_lever_id');
      expect(
        bilateralService.importAlignmentFromTip.mock.calls.map(
          (call) => call[1].science_program_id,
        ),
      ).toEqual(['SP01', 'SP01']);
    });

    it('imports an already saved year when a later save in the handle rejects', async () => {
      let calls = 0;
      saveResultService.saveAllSections.mockImplementation(
        async (_row, extra) => {
          calls += 1;
          if (calls === 2) {
            throw new Error('live save failed');
          }
          extra.counters.createdRecords += 1;
          return { resultId: 70, outcome: 'created' as const };
        },
      );

      await run([
        payload('http://h', 2025, {
          title: 'partial',
          poolFunding: { science_program_id: 'SP01', toc_result_id: 3 },
        }),
      ]);

      expect(bilateralService.importAlignmentFromTip).toHaveBeenCalledTimes(1);
      expect(bilateralService.importAlignmentFromTip).toHaveBeenCalledWith(
        70,
        expect.objectContaining({
          science_program_id: 'SP01',
          toc_result_id: 3,
        }),
        2025,
        null,
        expect.any(Map),
      );
      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(1);
    });

    it('passes compensateRowOnly on the live create', async () => {
      await run([payload('http://h', 2025, { title: 'fresh' })]);

      expect(liveSaves()[0].extra.target?.compensateRowOnly).toBe(true);
      expect(versionSaves()[0].extra.target?.compensateRowOnly).toBeUndefined();
    });

    it('imports pool funding only for created and updated outcomes', async () => {
      installSave((row) => {
        if (row.public_link.endsWith('/skip')) return 'skipped';
        if (row.public_link.endsWith('/bad')) return 'error';
        if (row.public_link.endsWith('/upd')) return 'updated';
        return 'created';
      });

      await run([
        payload('http://batch/created', 2025, {
          poolFunding: { science_program_id: 'SP01', toc_result_id: 1 },
        }),
        payload('http://batch/upd', 2025, {
          poolFunding: { science_program_id: 'SP01', toc_result_id: 2 },
        }),
        payload('http://batch/skip', 2025, {
          poolFunding: { science_program_id: 'SP01', toc_result_id: 3 },
        }),
        payload('http://batch/bad', 2025, {
          poolFunding: { science_program_id: 'SP01', toc_result_id: 4 },
        }),
      ]);

      expect(bilateralService.importAlignmentFromTip).toHaveBeenCalledTimes(4);
      expect(
        bilateralService.importAlignmentFromTip.mock.calls.map(
          (call) => call[1].toc_result_id,
        ),
      ).toEqual([1, 1, 2, 2]);
    });

    it('live year move with pool funding imports that mapping', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(400, 5, 2025, false),
        otherLive: [],
        versions: { 2025: handleRow(401, 5, 2025, true) },
        otherVersions: [],
      });
      installSave((_row, extra) =>
        extra.target?.resultId != null ? 'updated' : 'created',
      );

      await run([
        payload('http://h', 2026, {
          title: 'moved',
          poolFunding: { science_program_id: 'SP02', toc_result_id: 9 },
        }),
      ]);

      expect(liveSaves()[0].extra.target?.resultId).toBe(400);
      expect(liveSaves()[0].payload.createResult.year).toBe(2026);
      expect(bilateralService.importAlignmentFromTip).toHaveBeenCalledWith(
        400,
        expect.objectContaining({
          science_program_id: 'SP02',
          toc_result_id: 9,
        }),
        2026,
        null,
        expect.any(Map),
      );
    });

    it('live year move without pool funding does not import', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(400, 5, 2025, false),
        otherLive: [],
        versions: { 2025: handleRow(401, 5, 2025, true) },
        otherVersions: [],
      });
      installSave((_row, extra) =>
        extra.target?.resultId != null ? 'updated' : 'created',
      );

      await run([payload('http://h', 2026, { title: 'moved-bare' })]);

      expect(liveSaves()[0].extra.target?.resultId).toBe(400);
      expect(liveSaves()[0].payload.createResult.year).toBe(2026);
      expect(liveSaves()[0].payload.poolFunding).toBeNull();
      expect(bilateralService.importAlignmentFromTip).not.toHaveBeenCalled();
    });

    it('a rejected handle does not abort the run', async () => {
      const errorSpy = jest.spyOn((service as any).logger, 'error');
      let nextId = 50;
      saveResultService.saveAllSections.mockImplementation(
        async (row, extra) => {
          const mapped = row as TipMappedResult;
          if (mapped.public_link === 'http://bad') {
            throw new Error('compensate failed');
          }
          const resultId = nextId++;
          extra.counters.createdRecords += 1;
          recorded.push({
            payload: mapped,
            extra,
            resultId,
            outcome: 'created',
          });
          return { resultId, outcome: 'created' as const };
        },
      );

      await run([
        payload('http://bad', 2025, { title: 'bad' }),
        payload('http://good', 2024, { title: 'good' }),
      ]);

      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(1);
      expect(
        recorded.some((row) => row.payload.public_link === 'http://good'),
      ).toBe(true);
      expect(
        recorded.some((row) => row.payload.createResult.title === 'good'),
      ).toBe(true);
      expect(errorSpy).toHaveBeenCalledWith(
        'Error saving TIP handle http://bad: compensate failed',
      );
      const counters = syncProcessLogService.update.mock.calls[0][1];
      expect(counters.errorRecords).toBe(1);
      expect(counters.createdRecords).toBe(2);
    });

    it('warns about otherLive and otherVersions rows and does not write them', async () => {
      tipHandleRepository.resolve.mockResolvedValue({
        live: handleRow(10, 3, 2025, false),
        otherLive: [handleRow(77, 4, 2024, false)],
        versions: { 2025: handleRow(11, 3, 2025, true) },
        otherVersions: [handleRow(88, 9, 2025, true)],
      });
      installSave((_row, extra) =>
        extra.target?.resultId != null ? 'updated' : 'created',
      );
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await run([payload('http://h', 2025, { title: 'keep' })]);

      expect(warnSpy).toHaveBeenCalledWith(
        'TIP handle http://h: extra live rows not picked: 77',
      );
      expect(warnSpy).toHaveBeenCalledWith(
        'TIP handle http://h: extra version rows not picked: 88',
      );
      expect(liveSaves()[0].extra.target?.resultId).toBe(10);
      expect(versionSaves()[0].extra.target?.resultId).toBe(11);
      expect(
        recorded.some(
          (row) =>
            row.extra.target?.resultId === 77 ||
            row.extra.target?.resultId === 88,
        ),
      ).toBe(false);
    });

    it('includes skipped in the TIP run summary', async () => {
      installSave((row) =>
        row.createResult.year === 2024 ? 'skipped' : 'created',
      );
      const logSpy = jest.spyOn((service as any).logger, 'log');

      await run([
        payload('http://h', 2024, { title: 'skip-me' }),
        payload('http://h', 2023, { title: 'keep-me' }),
      ]);

      expect(logSpy).toHaveBeenCalledWith(
        'TIP run summary: staging failures 0, created 2, updated 0, skipped 1, error 0',
      );
    });

    it('logs the run summary when the run fails', async () => {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'getRequest').mockReturnValue(
        of({
          data: {
            data: [
              { id: 1, name: 'KP ok', type: ['Journal article'] },
              { id: 2, name: 'KP bad', type: ['Journal article'] },
            ],
            data_count: 2,
          },
        }),
      );
      mockStagingRepo.save.mockImplementation((record: { code: number }) => {
        if (record.code === 2) return Promise.reject(new Error('write failed'));
        return Promise.resolve(undefined);
      });
      prmsRepository.findTemporalResults.mockRejectedValue(
        new Error('read failed'),
      );
      const logSpy = jest.spyOn((service as any).logger, 'log');

      await expect(service.getKnowledgeProductsByYear(2025)).rejects.toThrow(
        'Error saving temporal data',
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('staging failures 1'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('skipped 0'));
    });
  });

  describe('PRMS push phase', () => {
    const mapping: TipTocMappingDto = {
      science_program_id: 'SP01',
      aow_compose_code: 'SP01-AOW05',
    };
    const userA = {
      sec_user_id: 11,
      email: 'ana@alliance.org',
      first_name: 'Ana',
      last_name: 'Arias',
    };
    const userB = {
      sec_user_id: 22,
      email: 'bea@alliance.org',
      first_name: 'Bea',
      last_name: 'Baez',
    };
    const accepted = () => ({ outcome: PrmsSyncOutcome.ACCEPTED });
    const SUMMARY =
      /^PRMS push: candidates=(\d+) skipped=(\d+) not_eligible=(\d+) ACCEPTED=(\d+) REJECTED_BY_PRMS=(\d+) REFUSED_BY_STAR=(\d+) RETRYABLE=(\d+) AUTH_FAILED=(\d+) TRANSPORT_FAILED=(\d+) UNKNOWN=(\d+) NOT_SENT=(\d+) ERROR=(\d+) duration_ms=(\d+)$/;

    function candidateRow(
      handle: string,
      year: number,
      extras: {
        poolFunding?: TipTocMappingDto | null;
        userData?: typeof userA | null;
      } = {},
    ): TipMappedResult {
      return {
        public_link: handle,
        createResult: { year, title: handle },
        poolFunding:
          extras.poolFunding === undefined ? mapping : extras.poolFunding,
        userData: extras.userData === undefined ? userA : extras.userData,
      } as TipMappedResult;
    }

    function installSaves(options: {
      versionId: (payload: TipMappedResult) => number;
      liveId: (payload: TipMappedResult) => number;
      versionOutcome?: (
        payload: TipMappedResult,
      ) => 'created' | 'updated' | 'skipped' | 'error';
    }): void {
      saveResultService.saveAllSections.mockImplementation(
        async (payload, extra) => {
          const mapped = payload as TipMappedResult;
          const isVersion = extra?.target?.isSnapshot === true;
          return {
            resultId: isVersion
              ? options.versionId(mapped)
              : options.liveId(mapped),
            outcome: isVersion
              ? (options.versionOutcome?.(mapped) ?? 'created')
              : 'created',
          };
        },
      );
    }

    async function flushUntil(done: () => boolean, ms = 1000): Promise<void> {
      const deadline = Date.now() + ms;
      while (!done() && Date.now() < deadline) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    function arm(rows: TipMappedResult[]): void {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: { data: [], data_count: 0 } }));
      jest.spyOn(service, 'processing').mockResolvedValue(rows);
      prmsRepository.findTemporalResults.mockResolvedValue([]);
      reportingYearResolver.resolve.mockResolvedValue(2026);
    }

    async function runPush(
      year: number,
      rows: TipMappedResult[],
    ): Promise<void> {
      arm(rows);
      await service.getKnowledgeProductsByYear(year);
    }

    function pushLine(spy: jest.SpyInstance): string {
      const line = spy.mock.calls
        .map((call) => String(call[0]))
        .find((entry) => entry.startsWith('PRMS push:'));
      expect(line).toBeDefined();
      return line as string;
    }

    it('a live save of the reporting year adds no candidate', async () => {
      installSaves({
        versionId: () => 101,
        liveId: () => 202,
      });

      await runPush(2026, [candidateRow('http://h/live', 2026)]);

      expect(
        resultPrmsSyncService.sync.mock.calls.map((call) => call[0]),
      ).toEqual([101]);
    });

    it('adds no candidate when the version save is skipped or errors', async () => {
      installSaves({
        versionId: (payload) =>
          payload.public_link.endsWith('/bad') ? 302 : 301,
        liveId: () => 900,
        versionOutcome: (payload) =>
          payload.public_link.endsWith('/bad') ? 'error' : 'skipped',
      });
      const log = jest.spyOn((service as any).logger, 'log');

      await runPush(2026, [
        candidateRow('http://h/skip', 2026),
        candidateRow('http://h/bad', 2026),
      ]);

      expect(resultPrmsSyncService.sync).not.toHaveBeenCalled();
      expect(pushLine(log)).toBe('PRMS push: candidates=0');
    });

    it('keeps the first candidate when the same resultId is saved twice', async () => {
      installSaves({
        versionId: () => 101,
        liveId: (payload) => (payload.public_link.endsWith('/b') ? 502 : 501),
      });

      await runPush(2026, [
        candidateRow('http://h/a', 2026, { userData: userA }),
        candidateRow('http://h/b', 2026, { userData: userB }),
      ]);

      expect(
        resultPrmsSyncService.sync.mock.calls.map((call) => call[0]),
      ).toEqual([101]);
      expect(resultPrmsSyncService.sync.mock.calls[0][1]).toEqual({
        origin: 'TIP_SYNC',
        tocMapping: mapping,
        author: {
          email: userA.email,
          first_name: userA.first_name,
          last_name: userA.last_name,
        },
      });
    });

    it('logs candidates=0 and does not query or sync a non-reporting year', async () => {
      installSaves({
        versionId: () => 50,
        liveId: () => 51,
      });
      const log = jest.spyOn((service as any).logger, 'log');

      await runPush(2024, [candidateRow('http://h/old', 2024)]);

      expect(tipHandleRepository.idsWithPrmsCode).not.toHaveBeenCalled();
      expect(resultPrmsSyncService.sync).not.toHaveBeenCalled();
      expect(pushLine(log)).toBe('PRMS push: candidates=0');
    });

    it('counts null poolFunding as not_eligible and does not call sync', async () => {
      installSaves({
        versionId: () => 101,
        liveId: () => 202,
      });
      const log = jest.spyOn((service as any).logger, 'log');

      await runPush(2026, [
        candidateRow('http://h/bare', 2026, { poolFunding: null }),
      ]);

      expect(resultPrmsSyncService.sync).not.toHaveBeenCalled();
      expect(tipHandleRepository.idsWithPrmsCode).not.toHaveBeenCalled();
      expect(pushLine(log)).toContain('candidates=1');
      expect(pushLine(log)).toContain('not_eligible=1');
      expect(pushLine(log)).toContain('skipped=0');
    });

    it('counts a row that already has a PRMS code as skipped and does not sync', async () => {
      installSaves({
        versionId: () => 101,
        liveId: () => 202,
      });
      tipHandleRepository.idsWithPrmsCode.mockResolvedValue([101]);
      const log = jest.spyOn((service as any).logger, 'log');

      await runPush(2026, [candidateRow('http://h/coded', 2026)]);

      expect(resultPrmsSyncService.sync).not.toHaveBeenCalled();
      expect(tipHandleRepository.idsWithPrmsCode).toHaveBeenCalledWith([101]);
      expect(pushLine(log)).toContain('candidates=1');
      expect(pushLine(log)).toContain('skipped=1');
      expect(pushLine(log)).toContain('not_eligible=0');
    });

    it('does not start the second sync before the first deferred sync resolves', async () => {
      installSaves({
        versionId: (payload) =>
          payload.public_link.endsWith('/b') ? 202 : 101,
        liveId: (payload) => (payload.public_link.endsWith('/b') ? 1202 : 1101),
      });
      const gates: Array<(value: unknown) => void> = [];
      resultPrmsSyncService.sync.mockImplementation(
        () =>
          new Promise((resolve) => {
            gates.push(resolve);
          }),
      );
      arm([
        candidateRow('http://h/a', 2026, { userData: userA }),
        candidateRow('http://h/b', 2026, { userData: userB }),
      ]);

      const run = service.getKnowledgeProductsByYear(2026);
      try {
        await flushUntil(
          () => resultPrmsSyncService.sync.mock.calls.length >= 1,
        );
        expect(resultPrmsSyncService.sync).toHaveBeenCalledTimes(1);
        expect(resultPrmsSyncService.sync.mock.calls[0][0]).toBe(101);
        expect(syncProcessLogService.update).toHaveBeenCalledWith(
          1,
          expect.any(Object),
        );
        expect(syncProcessLogService.endSync).not.toHaveBeenCalled();

        gates[0](accepted());
        await flushUntil(
          () => resultPrmsSyncService.sync.mock.calls.length >= 2,
        );
        expect(resultPrmsSyncService.sync).toHaveBeenCalledTimes(2);
        expect(resultPrmsSyncService.sync.mock.calls[1][0]).toBe(202);
        gates[1](accepted());
      } finally {
        gates.forEach((release) => release(accepted()));
        await run.catch(() => undefined);
      }

      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(1);
      expect(syncProcessLogService.markFailed).not.toHaveBeenCalled();
    });

    it('counts PrmsSyncPersistedRefusalException as REFUSED_BY_STAR', async () => {
      installSaves({
        versionId: () => 101,
        liveId: () => 202,
      });
      resultPrmsSyncService.sync.mockRejectedValue(
        new PrmsSyncPersistedRefusalException(
          persistedStarRefusalData(
            1,
            'Pool Funding Alignment is not green-checked',
          ),
        ),
      );
      const log = jest.spyOn((service as any).logger, 'log');

      await runPush(2026, [candidateRow('http://h/refused', 2026)]);

      const line = pushLine(log);
      expect(line).toContain('REFUSED_BY_STAR=1');
      expect(line).toContain('NOT_SENT=0');
      expect(line).toContain('ERROR=0');
      expect(currentUser.clearSystemUser).toHaveBeenCalledTimes(1);
    });

    it('counts a 409 ConflictException as NOT_SENT and warns status and message', async () => {
      installSaves({
        versionId: () => 101,
        liveId: () => 202,
      });
      resultPrmsSyncService.sync.mockRejectedValue(
        new ConflictException('already synced'),
      );
      const warn = jest.spyOn((service as any).logger, 'warn');
      const log = jest.spyOn((service as any).logger, 'log');

      await runPush(2026, [candidateRow('http://h/conflict', 2026)]);

      expect(warn).toHaveBeenCalledWith(
        'PRMS push NOT_SENT result 101 status=409 message=already synced',
      );
      expect(pushLine(log)).toContain('NOT_SENT=1');
      expect(pushLine(log)).toContain('REFUSED_BY_STAR=0');
    });

    it('counts a thrown Error as ERROR, sends the next candidate, and ends the run', async () => {
      installSaves({
        versionId: (payload) =>
          payload.public_link.endsWith('/b') ? 202 : 101,
        liveId: (payload) => (payload.public_link.endsWith('/b') ? 1202 : 1101),
      });
      resultPrmsSyncService.sync.mockImplementation((id: number) => {
        if (id === 101) {
          return Promise.reject(new Error('transport down'));
        }
        return Promise.resolve({
          outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
        });
      });
      const log = jest.spyOn((service as any).logger, 'log');
      const errorLog = jest.spyOn((service as any).logger, 'error');

      await runPush(2026, [
        candidateRow('http://h/a', 2026),
        candidateRow('http://h/b', 2026, { userData: userB }),
      ]);

      expect(
        resultPrmsSyncService.sync.mock.calls.map((call) => call[0]),
      ).toEqual([101, 202]);
      expect(errorLog).toHaveBeenCalledWith(
        'PRMS push ERROR result 101: transport down',
      );
      const line = pushLine(log);
      expect(line).toContain('ERROR=1');
      expect(line).toContain('REJECTED_BY_PRMS=1');
      expect(line).toContain('candidates=2');
      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(1);
      expect(syncProcessLogService.markFailed).not.toHaveBeenCalled();
      expect(currentUser.clearSystemUser).toHaveBeenCalledTimes(2);
    });

    it('clears the system user after a throwing candidate before the next sync', async () => {
      installSaves({
        versionId: (payload) =>
          payload.public_link.endsWith('/b') ? 202 : 101,
        liveId: (payload) => (payload.public_link.endsWith('/b') ? 1202 : 1101),
      });
      const gates: Array<{
        resolve: (value: unknown) => void;
        reject: (reason?: unknown) => void;
      }> = [];
      resultPrmsSyncService.sync.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            gates.push({ resolve, reject });
          }),
      );
      arm([
        candidateRow('http://h/a', 2026, { userData: null }),
        candidateRow('http://h/b', 2026, { userData: userB }),
      ]);

      const run = service.getKnowledgeProductsByYear(2026);
      try {
        await flushUntil(
          () => resultPrmsSyncService.sync.mock.calls.length >= 1,
        );
        expect(currentUser.setSystemUser).toHaveBeenNthCalledWith(
          1,
          null,
          true,
        );
        expect(resultPrmsSyncService.sync.mock.calls[0][1]).toEqual({
          origin: 'TIP_SYNC',
          tocMapping: mapping,
          author: null,
        });
        expect(currentUser.clearSystemUser).not.toHaveBeenCalled();

        gates[0].reject(new Error('boom'));
        await flushUntil(
          () =>
            currentUser.clearSystemUser.mock.calls.length >= 1 ||
            resultPrmsSyncService.sync.mock.calls.length >= 2,
        );
        expect(currentUser.clearSystemUser).toHaveBeenCalledTimes(1);
        expect(resultPrmsSyncService.sync).toHaveBeenCalledTimes(2);
        expect(currentUser.setSystemUser).toHaveBeenNthCalledWith(
          2,
          userB,
          true,
        );
        expect(resultPrmsSyncService.sync.mock.calls[1][1].author).toEqual({
          email: userB.email,
          first_name: userB.first_name,
          last_name: userB.last_name,
        });
        gates[1].resolve(accepted());
      } finally {
        gates.forEach((gate) => gate.resolve(accepted()));
        await run.catch(() => undefined);
      }

      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(1);
      expect(syncProcessLogService.markFailed).not.toHaveBeenCalled();
    });

    it('logs every summary key and the counts sum to candidates', async () => {
      installSaves({
        versionId: (payload) => {
          if (payload.public_link.endsWith('/coded')) return 2;
          if (payload.public_link.endsWith('/ok')) return 3;
          if (payload.public_link.endsWith('/conflict')) return 4;
          return 1;
        },
        liveId: (payload) => {
          if (payload.public_link.endsWith('/coded')) return 12;
          if (payload.public_link.endsWith('/ok')) return 13;
          if (payload.public_link.endsWith('/conflict')) return 14;
          return 11;
        },
      });
      tipHandleRepository.idsWithPrmsCode.mockImplementation(
        async (ids: number[]) => ids.filter((id) => id === 2),
      );
      resultPrmsSyncService.sync.mockImplementation((id: number) => {
        if (id === 4) {
          throw new ConflictException('already synced');
        }
        return Promise.resolve(accepted());
      });
      const log = jest.spyOn((service as any).logger, 'log');

      await runPush(2026, [
        candidateRow('http://h/bare', 2026, { poolFunding: null }),
        candidateRow('http://h/coded', 2026),
        candidateRow('http://h/ok', 2026),
        candidateRow('http://h/conflict', 2026),
      ]);

      const line = pushLine(log);
      expect(line).not.toContain('IN_FLIGHT');
      const match = line.match(SUMMARY);
      expect(match).not.toBeNull();
      const candidates = Number(match?.[1]);
      const counted = (match ?? []).slice(2, 13).map(Number);
      expect(counted.reduce((sum, value) => sum + value, 0)).toBe(candidates);
      expect(candidates).toBe(4);
      expect(Number(match?.[2])).toBe(1);
      expect(Number(match?.[3])).toBe(1);
      expect(Number(match?.[4])).toBe(1);
      expect(Number(match?.[11])).toBe(1);
      expect(Number(match?.[12])).toBe(0);
      expect(Number(match?.[13])).toBeGreaterThanOrEqual(0);
    });

    it('still ends the run when the code query throws', async () => {
      installSaves({
        versionId: () => 101,
        liveId: () => 202,
      });
      tipHandleRepository.idsWithPrmsCode.mockRejectedValue(
        new Error('code query failed'),
      );
      const errorLog = jest.spyOn((service as any).logger, 'error');

      await runPush(2026, [candidateRow('http://h/query', 2026)]);

      expect(errorLog).toHaveBeenCalledWith(
        'PRMS push phase failed: code query failed',
      );
      expect(resultPrmsSyncService.sync).not.toHaveBeenCalled();
      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(1);
      expect(syncProcessLogService.markFailed).not.toHaveBeenCalled();
    });
  });
});
