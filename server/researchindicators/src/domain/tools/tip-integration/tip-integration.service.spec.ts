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
import { DataSource } from 'typeorm';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import * as mapperModule from './mapper/tip-integration.mapper';
import { TipIntegrationRepository } from './repository/tip-integration.repository';
import { SyncProcessLogService } from '../../entities/sync-process-log/sync-process-log.service';
import { SaveResultService } from '../../shared/services/save-all-sections.service';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { BadRequestException } from '@nestjs/common';
import { TipKnowledgeProductDto } from './dto/response-year-tip.dto';
import { of, throwError } from 'rxjs';
import { PrmsRepository } from '../open-search/prms/repositories/prms.repository';
import { ClarisaSdgsService } from '../clarisa/entities/clarisa-sdgs/clarisa-sdgs.service';
import { TemportalDataResponse } from '../open-search/prms/dto/prms-response.dto';
import { SyncStagingRecordsEntity } from '../open-search/prms/entities/sync-staging-records.entity';

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

  const mockResultRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
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
          },
        },
        {
          provide: SaveResultService,
          useValue: {
            bulkSaveAllSections: jest.fn().mockResolvedValue(undefined),
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
    });

    it('should fetch TIP data, load temporal results, process and end sync', async () => {
      const mockResponse = { data: [], data_count: 0 };
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: mockResponse }));
      jest.spyOn(service, 'processing').mockResolvedValue([]);
      prmsRepository.findTemporalResults.mockResolvedValue([]);

      await service.getKnowledgeProductsByYear(2025);

      expect(syncProcessLogService.initiateSync).toHaveBeenCalled();
      expect(prmsRepository.findTemporalResults).toHaveBeenCalledWith(
        expect.any(String),
      );
      expect(service.processing).toHaveBeenCalledWith([], 2025);
      expect(saveResultService.bulkSaveAllSections).toHaveBeenCalledWith([], {
        platformCode: ReportingPlatformEnum.TIP,
        resultSaved: expect.any(Array),
        counters: expect.any(Object),
        manageOfficialCode: true,
        findOptions: { public_link: 'public_link' },
      });
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
      jest
        .spyOn(service, 'processing')
        .mockResolvedValue([{ official_code: 1 }] as any);
      prmsRepository.findTemporalResults.mockResolvedValue([
        wrapTemporal({ ...baseProduct, name: 'KP 1' }),
      ] as any);

      await service.getKnowledgeProductsByYear(2026);

      expect(getRequestSpy).toHaveBeenCalledTimes(2);
      expect(getRequestSpy.mock.calls[1][0]).toContain('offset=50');
      expect((service as any).sleep).toHaveBeenCalledTimes(1);
      expect(mockStagingRepo.save).toHaveBeenCalledTimes(2);
      expect(saveResultService.bulkSaveAllSections).toHaveBeenCalledTimes(1);
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

    it('should throw BadRequestException and clean temporal data when TIP API request fails', async () => {
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.getKnowledgeProductsByYear(2025)).rejects.toThrow(
        BadRequestException,
      );
      expect(prmsRepository.deleteTemporalResults).toHaveBeenCalledWith(
        expect.any(String),
      );
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
      const results = await service.processing(
        [wrapTemporal(baseProduct)],
        2025,
      );

      expect(results).toHaveLength(1);
      expect(results[0].createResult.contract_id).toBe('AGR-001');
      expect(results[0].createResult.year).toBe(2025);
    });

    it('should map a product with project as non-empty array', async () => {
      const product = wrapTemporal({
        ...baseProduct,
        project: [{ agreement_id: 'AGR-002', description: 'P2' }],
      });
      const results = await service.processing([product], 2025);

      expect(results[0].createResult.contract_id).toBe('AGR-002');
    });

    it('should use null contract_id when project is empty array', async () => {
      const product = wrapTemporal({ ...baseProduct, project: [] });
      const results = await service.processing([product], 2025);

      expect(results[0].createResult.contract_id).toBeNull();
    });

    it('should not call user lookup when submitter is null', async () => {
      await service.processing([wrapTemporal(baseProduct)], 2025);

      expect(resultRepository.findUserByEmailOrCarnet).not.toHaveBeenCalled();
    });

    it('should map evidence with link and doi', async () => {
      const results = await service.processing(
        [wrapTemporal(baseProduct)],
        2025,
      );
      const evidences = results[0].evidence.evidence as any[];

      expect(evidences[0].evidence_url).toBe('http://link.example');
      expect(evidences[1].evidence_url).toBe('10.1234/test');
    });

    it('should map knowledge product fields correctly', async () => {
      const results = await service.processing(
        [wrapTemporal(baseProduct)],
        2025,
      );

      expect(results[0].knowledgeProduct.citation).toBe('Test Citation');
      expect(results[0].knowledgeProduct.open_access).toBe(true);
      expect(results[0].knowledgeProduct.type).toBe('Journal article');
    });

    it('should map tip_id from the TIP product id', async () => {
      const results = await service.processing(
        [wrapTemporal(baseProduct)],
        2025,
      );

      expect(results[0].knowledgeProduct.tip_id).toBe(555);
    });

    it('should map public_link, created_at and is_version_applied from temporal data', async () => {
      const results = await service.processing(
        [wrapTemporal(baseProduct, { is_version: true })],
        2025,
      );

      expect(results[0].public_link).toBe('http://link.example');
      expect(results[0].created_at).toEqual(new Date('2025-01-01'));
      expect(results[0].is_version_applied).toBe(true);
    });

    it('should default is_version_applied to false when is_version is missing', async () => {
      const results = await service.processing(
        [wrapTemporal(baseProduct, { is_version: undefined })],
        2025,
      );

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

      const results = await service.processing([product], 2025);

      expect(clarisaSdgsService.findSdgByTipFormat).toHaveBeenCalledWith([
        'SDG 7 - Affordable Energy',
      ]);
      expect(results[0].alignments.result_sdgs).toEqual([
        { clarisa_sdg_id: 7 },
      ]);
    });

    it('should return empty array when input is empty', async () => {
      const results = await service.processing([], 2025);

      expect(results).toEqual([]);
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
});
