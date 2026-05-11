import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DataSource, Like } from 'typeorm';
import { of } from 'rxjs';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { ResultRepository } from '../../../entities/results/repositories/result.repository';
import { ResultsService } from '../../../entities/results/results.service';
import { QueryService } from '../../../shared/utils/query.service';
import { ResultKnowledgeProductService } from '../../../entities/result-knowledge-product/result-knowledge-product.service';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { PooledFundingContractsService } from '../../../entities/pooled-funding-contracts/pooled-funding-contracts.service';
import { ClarisaLeversService } from '../../clarisa/entities/clarisa-levers/clarisa-levers.service';
import { SyncProcessLogService } from '../../../entities/sync-process-log/sync-process-log.service';
import { ExternalMappersDto } from '../../../shared/global-dto/external-mappers.dto';
import { AllianceUserStaff } from '../../../entities/alliance-user-staff/entities/alliance-user-staff.entity';
import { ReportingPlatformEnum } from '../../../entities/results/enum/reporting-platform.enum';
import { ResultStatusEnum } from '../../../entities/result-status/enum/result-status.enum';
import { ResultResponseMapper } from './dto/prms-response.dto';
import { ResultTypeEnum } from './enum/rsult-type.enum';
import { SyncProcessEnum } from '../../../entities/sync-process-log/enum/sync-process.enum';
import { PrmsKnowledgeProductDto } from './dto/prms-response.dto';
import {
  CounterResults,
  CounterResultsEnum,
} from '../../tip-integration/dto/response-year-tip.dto';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    Like: jest.fn((v: string) => v),
  };
});

describe('PrmsOpenSearchService', () => {
  let service: PrmsOpenSearchService;
  let httpService: jest.Mocked<HttpService>;
  let dataSource: { getRepository: jest.Mock };
  let resultRepoHandle: { findOne: jest.Mock; update: jest.Mock };
  let allianceStaffRepoHandle: { findOne: jest.Mock };
  let resultsService: jest.Mocked<ResultsService>;
  let resultRepository: jest.Mocked<ResultRepository>;
  let queryService: jest.Mocked<QueryService>;
  let pooledFundingContractsService: jest.Mocked<PooledFundingContractsService>;
  let clarisaLeversService: jest.Mocked<ClarisaLeversService>;
  let syncProcessLogService: jest.Mocked<SyncProcessLogService>;

  const buildResultMapper = (
    overrides: Partial<ResultResponseMapper> = {},
  ): ResultResponseMapper => {
    const base: ResultResponseMapper = {
      created_date: new Date('2024-01-01'),
      last_updated_date: new Date('2024-01-02'),
      result_code: '9001',
      status_id: '1',
      year: '2024',
      pdf_link: 'https://pdf.example',
      prms_link: 'https://prms.example',
      last_update_at: '',
      is_active: true,
      result_title: 'Title',
      description: 'Desc',
      result_level: { code: 'L1', name: '', description: '' },
      indicator_category: {
        code: String(ResultTypeEnum.KNOWLEDGE_PRODUCT),
        name: 'KP',
      },
      toc_alignment: [],
      geographic_focus: { code: '', description: '' },
      regions: [],
      countries: [],
      contributing_centers: [
        { code: '', name: '', acronym: 'ABC', is_lead: true },
      ],
      contributing_partners: [],
      evidences: [],
      primary_entity: { official_code: 'PFUND', name: 'Entity' },
      created_by: undefined,
    };
    return Object.assign(base, overrides);
  };

  beforeEach(async () => {
    resultRepoHandle = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    allianceStaffRepoHandle = {
      findOne: jest.fn(),
    };
    dataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === AllianceUserStaff) {
          return allianceStaffRepoHandle;
        }
        return resultRepoHandle;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrmsOpenSearchService,
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
        {
          provide: AppConfig,
          useValue: { SEARCH_PRMS_URL: 'https://prms-search.test' },
        },
        {
          provide: ResultRepository,
          useValue: {
            findUserByEmailOrCarnet: jest.fn(),
            unpdateCarnetUser: jest.fn(),
          },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ResultsService,
          useValue: {
            createResult: jest.fn(),
            updateGeneralInfo: jest.fn(),
            findResultAlignment: jest.fn().mockResolvedValue({
              primary_levers: [],
            }),
            updateResultAlignment: jest.fn(),
            saveGeoLocation: jest.fn(),
            createUserProcess: jest.fn(),
            updateInactiveResult: jest.fn(),
          },
        },
        {
          provide: QueryService,
          useValue: { deleteFullResultById: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ResultKnowledgeProductService,
          useValue: { update: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CurrentUserUtil,
          useValue: {
            setSystemUser: jest.fn(),
            clearSystemUser: jest.fn(),
          },
        },
        {
          provide: PooledFundingContractsService,
          useValue: {
            findMappingPooledFundingContracts: jest.fn().mockResolvedValue([
              {
                agreement_id: 'primary-ag',
                ubwClientDescription: 'exbio',
                departmentId: 10,
              },
              {
                agreement_id: 'contrib-ag',
                ubwClientDescription: 'other',
                departmentId: 11,
              },
            ]),
          },
        },
        {
          provide: ClarisaLeversService,
          useValue: {
            homologatedData: jest.fn().mockResolvedValue('LEVER'),
            findByShortName: jest.fn().mockResolvedValue({ id: 77 }),
          },
        },
        {
          provide: SyncProcessLogService,
          useValue: {
            initiateSync: jest.fn().mockResolvedValue({ id: 99 }),
            update: jest.fn().mockResolvedValue(undefined),
            endSync: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(PrmsOpenSearchService);
    httpService = module.get(HttpService);
    resultsService = module.get(ResultsService);
    resultRepository = module.get(ResultRepository);
    queryService = module.get(QueryService);
    pooledFundingContractsService = module.get(PooledFundingContractsService);
    clarisaLeversService = module.get(ClarisaLeversService);
    syncProcessLogService = module.get(SyncProcessLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should paginate PRMS search, process rows, and close sync log', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            total: 1,
            page: 1,
            size: 50,
            totalPages: 2,
            data: [],
          },
        }) as any,
      );

      await service.getData(2024);

      expect(syncProcessLogService.initiateSync).toHaveBeenCalledWith(
        SyncProcessEnum.PRMS_INTEGRATION,
      );
      expect(httpService.get).toHaveBeenCalledTimes(2);
      const firstUrl = httpService.get.mock.calls[0][0] as string;
      expect(firstUrl).toContain('year=2024');
      expect(syncProcessLogService.update).toHaveBeenCalled();
      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(99);
    });

    it('should omit year query param when year is empty', async () => {
      httpService.get.mockReturnValue(
        of({
          data: { totalPages: 1, data: [] },
        }) as any,
      );

      await service.getData(undefined as unknown as number);

      const url = httpService.get.mock.calls[0][0] as string;
      expect(url).not.toContain('&year=');
    });
  });

  describe('processData', () => {
    it('should skip items whose indicator is not homologated', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn');
      const data = [
        buildResultMapper({
          indicator_category: {
            code: String(ResultTypeEnum.CAPACITY_CHANGE),
            name: 'X',
          },
        }),
      ];
      const out = await service.processData(data);
      expect(out).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should map a valid row without created_by', async () => {
      const out = await service.processData([buildResultMapper()]);
      expect(out).toHaveLength(1);
      expect(out[0].createResult.indicator_id).toBeDefined();
      expect(out[0].alignments.contracts.length).toBeGreaterThan(0);
      expect(pooledFundingContractsService.findMappingPooledFundingContracts).toHaveBeenCalledWith(
        'PFUND',
      );
    });

    it('should create user from alliance staff when STAR user is missing and creator email is empty', async () => {
      resultRepository.findUserByEmailOrCarnet.mockResolvedValue(null as any);
      allianceStaffRepoHandle.findOne.mockResolvedValue({
        email: 'staff@alliance.org',
        center: 'ABC',
      } as any);
      resultsService.createUserProcess.mockResolvedValue({
        sec_user_id: 1,
      } as any);

      const out = await service.processData([
        buildResultMapper({
          created_by: {
            first_name: 'A',
            last_name: 'B',
            email: '',
          },
        }),
      ]);

      expect(Like).toHaveBeenCalled();
      expect(allianceStaffRepoHandle.findOne).toHaveBeenCalled();
      expect(resultsService.createUserProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'staff@alliance.org',
          center: 'ABC',
        }),
      );
      expect(out[0].userData).toEqual({ sec_user_id: 1 });
    });

    it('should reuse sec user and refresh carnet from alliance staff when creator email is empty', async () => {
      resultRepository.findUserByEmailOrCarnet.mockResolvedValue({
        sec_user_id: 5,
        carnet: 'OLD',
      } as any);
      allianceStaffRepoHandle.findOne.mockResolvedValue({
        email: 'staff@alliance.org',
        center: 'NEWCENTER',
      } as any);

      const out = await service.processData([
        buildResultMapper({
          created_by: {
            first_name: 'A',
            last_name: 'B',
            email: '',
          },
        }),
      ]);

      expect(resultRepository.unpdateCarnetUser).toHaveBeenCalledWith(5, 'OLD');
      expect(allianceStaffRepoHandle.findOne).toHaveBeenCalled();
      expect(out[0].userData.carnet).toBe('NEWCENTER');
    });

    it('should keep carnet when sec user exists but alliance staff is missing', async () => {
      resultRepository.findUserByEmailOrCarnet.mockResolvedValue({
        sec_user_id: 5,
        carnet: 'KEPT',
      } as any);
      allianceStaffRepoHandle.findOne.mockResolvedValue(null);

      const out = await service.processData([
        buildResultMapper({
          created_by: {
            first_name: 'A',
            last_name: 'B',
            email: 'user@example.org',
          },
        }),
      ]);

      expect(resultRepository.unpdateCarnetUser).toHaveBeenCalled();
      expect(out[0].userData.carnet).toBe('KEPT');
    });

    it('should leave userData unset when creator is not mapped in STAR or staff', async () => {
      resultRepository.findUserByEmailOrCarnet.mockResolvedValue(null);
      allianceStaffRepoHandle.findOne.mockResolvedValue(null);

      const out = await service.processData([
        buildResultMapper({
          created_by: {
            first_name: 'X',
            last_name: 'Y',
            email: 'ghost@example.org',
          },
        }),
      ]);

      expect(resultsService.createUserProcess).not.toHaveBeenCalled();
      expect(out[0].userData).toBeNull();
    });

    it('should map contributing contracts without agreement id', async () => {
      pooledFundingContractsService.findMappingPooledFundingContracts.mockResolvedValueOnce(
        [
          {
            agreement_id: '',
            ubwClientDescription: 'exbio',
            departmentId: 10,
          },
        ] as any,
      );

      const out = await service.processData([buildResultMapper()]);
      expect(out[0].alignments.contracts).toEqual([]);
    });

    it('should tolerate missing clarisa lever id', async () => {
      clarisaLeversService.findByShortName.mockResolvedValueOnce(null as any);
      const out = await service.processData([buildResultMapper()]);
      expect(out[0].alignments.primary_levers[0].lever_id).toBeUndefined();
    });
  });

  describe('processKnowledgeProduct (private)', () => {
    it('returns early when knowledge product is empty', () => {
      const body = new ExternalMappersDto();
      (service as any).processKnowledgeProduct(undefined, body);
      expect(body.knowledgeProduct).toBeUndefined();
    });

    it('maps a single product with handle and doi and merges evidence', () => {
      const body = new ExternalMappersDto();
      const kp = {
        knowledge_product_type: 'JOURNAL',
        handle: 'http://handle',
        doi: '10.1000/xyz',
      } as PrmsKnowledgeProductDto;

      (service as any).processKnowledgeProduct(kp, body);

      expect(body.external_link).toBe('http://handle');
      expect(body.knowledgeProduct.type).toBe('JOURNAL');
      expect(body.evidence.evidence).toHaveLength(2);
    });

    it('maps an array and preserves prior evidence entries', () => {
      const body = new ExternalMappersDto();
      body.evidence = {
        evidence: [{ evidence_url: 'x', evidence_description: 'y' } as any],
      } as any;
      const kpList = [
        { knowledge_product_type: 'A', handle: '', doi: '' },
      ] as PrmsKnowledgeProductDto[];

      (service as any).processKnowledgeProduct(kpList, body);

      expect(body.evidence.evidence.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('mapToExternalCreateResultDto', () => {
    const basePayload = (): ExternalMappersDto => {
      const dto = new ExternalMappersDto();
      dto.official_code = 55;
      dto.external_link = 'link';
      dto.created_at = new Date();
      dto.userData = { sec_user_id: 1 } as any;
      dto.createResult = { year: 2024 } as any;
      dto.generalInformation = {} as any;
      dto.alignments = { primary_levers: [] } as any;
      dto.geoScope = {} as any;
      dto.knowledgeProduct = {} as any;
      return dto;
    };

    it('should create a new TIP-backed result when none exists', async () => {
      resultRepoHandle.findOne.mockResolvedValueOnce(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 500,
        result_official_code: 55,
      } as any);

      await service.mapToExternalCreateResultDto([basePayload()]);

      expect(resultsService.createResult).toHaveBeenCalled();
      expect(resultsService.updateGeneralInfo).toHaveBeenCalled();
      expect(resultsService.updateResultAlignment).toHaveBeenCalled();
      expect(resultsService.saveGeoLocation).toHaveBeenCalled();
    });

    it('should update an existing TIP-backed result', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 300,
        result_official_code: 55,
      } as any);

      await service.mapToExternalCreateResultDto([basePayload()]);

      expect(resultsService.createResult).not.toHaveBeenCalled();
      expect(resultsService.updateGeneralInfo).toHaveBeenCalled();
    });

    it('should merge primary levers from STAR alignment and payload', async () => {
      resultsService.findResultAlignment.mockResolvedValueOnce({
        primary_levers: [{ lever_id: 1, is_primary: true } as any],
      } as any);
      const payload = basePayload();
      payload.alignments = {
        primary_levers: [{ lever_id: 2, is_primary: false } as any],
      } as any;
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 300,
        result_official_code: 55,
      } as any);

      await service.mapToExternalCreateResultDto([payload]);

      expect(resultsService.updateResultAlignment).toHaveBeenCalled();
      const alignmentArg = resultsService.updateResultAlignment.mock.calls[0][1];
      expect(alignmentArg.primary_levers.length).toBeGreaterThan(0);
    });

    it('should rollback when processing throws after createResult', async () => {
      resultRepoHandle.findOne.mockResolvedValueOnce(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 888,
        result_official_code: 55,
      } as any);
      resultsService.updateGeneralInfo.mockRejectedValueOnce(
        new Error('boom'),
      );

      await service.mapToExternalCreateResultDto([basePayload()]);

      expect(queryService.deleteFullResultById).toHaveBeenCalledWith(888);
    });

    it('should log and skip rollback when update fails without new result', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 300,
        result_official_code: 55,
      } as any);
      resultsService.updateGeneralInfo.mockRejectedValueOnce(
        new Error('fail-update'),
      );

      await service.mapToExternalCreateResultDto([basePayload()]);

      expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    });
  });

  describe('createResultInStar', () => {
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

    it('should create PRMS result and increment created counter', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 1,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();
      const saved: number[] = [];

      await service.createResultInStar(
        [minimalResultDto()],
        saved,
        null as unknown as number,
        counters,
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
    });

    it('should mark snapshot when official code repeats', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 2,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoSnapshot = minimalResultDto();
      const counters = new CounterResults();

      await service.createResultInStar(
        [dto, dtoSnapshot],
        [],
        null as unknown as number,
        counters,
      );

      const secondCallOpts = resultsService.createResult.mock.calls[1][2];
      expect(secondCallOpts.isSnapshot).toBe(true);
    });

    it('should update inactive result when PRMS row already exists', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 9,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();

      await service.createResultInStar(
        [minimalResultDto()],
        [],
        null as unknown as number,
        counters,
      );

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

      await service.createResultInStar(
        [minimalResultDto()],
        [],
        null as unknown as number,
        counters,
      );

      expect(queryService.deleteFullResultById).toHaveBeenCalledWith(42);
      expect(counters[CounterResultsEnum.ERROR]).toBe(1);
    });

    it('should accept default CounterResults argument shape', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 9,
        result_official_code: 7001,
      } as any);
      await service.createResultInStar(
        [minimalResultDto()],
        [],
        null as unknown as number,
      );
      expect(resultsService.updateInactiveResult).toHaveBeenCalled();
    });
  });
});
