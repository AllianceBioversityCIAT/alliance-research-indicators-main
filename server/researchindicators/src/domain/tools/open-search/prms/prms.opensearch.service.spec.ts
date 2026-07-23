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
import {
  ResultResponseMapper,
  PrmsTemporalResponseMapper,
} from './dto/prms-response.dto';
import { ResultTypeEnum } from './enum/rsult-type.enum';
import { SyncProcessEnum } from '../../../entities/sync-process-log/enum/sync-process.enum';
import { PrmsKnowledgeProductDto } from './dto/prms-response.dto';
import { SaveResultService } from '../../../shared/services/save-all-sections.service';
import { PrmsRepository } from './repositories/prms.repository';
import { SyncStagingRecordsEntity } from './entities/sync-staging-records.entity';
import { ClarisaCountriesService } from '../../clarisa/entities/clarisa-countries/clarisa-countries.service';
import { ClarisaRegionsService } from '../../clarisa/entities/clarisa-regions/clarisa-regions.service';
import { ClarisaInstitutionsService } from '../../clarisa/entities/clarisa-institutions/clarisa-institutions.service';

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
  let saveResultService: jest.Mocked<SaveResultService>;
  let prmsRepository: jest.Mocked<PrmsRepository>;
  let clarisaCountriesService: jest.Mocked<ClarisaCountriesService>;
  let clarisaRegionsService: jest.Mocked<ClarisaRegionsService>;
  let clarisaInstitutionsService: jest.Mocked<ClarisaInstitutionsService>;
  let temporalRepoHandle: { save: jest.Mock };

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
      policy_change_summary: null,
    };
    return Object.assign(base, overrides);
  };

  const buildTemporalMapper = (
    dataOverrides: Partial<ResultResponseMapper> = {},
    temporalOverrides: Partial<
      Pick<PrmsTemporalResponseMapper, 'code' | 'year' | 'is_version'>
    > = {},
  ): PrmsTemporalResponseMapper => {
    const data = buildResultMapper(dataOverrides);
    return {
      code: parseInt(data.result_code),
      year: parseInt(data.year),
      is_version: false,
      data,
      ...temporalOverrides,
    };
  };

  beforeEach(async () => {
    resultRepoHandle = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    allianceStaffRepoHandle = {
      findOne: jest.fn(),
    };
    temporalRepoHandle = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === AllianceUserStaff) {
          return allianceStaffRepoHandle;
        }
        if (entity === SyncStagingRecordsEntity) {
          return temporalRepoHandle;
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
          useValue: {
            deleteFullResultById: jest.fn().mockResolvedValue(undefined),
          },
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
            findOne: jest.fn().mockResolvedValue({ id: 88 }),
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
          provide: ClarisaCountriesService,
          useValue: {
            findByIso2: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ClarisaRegionsService,
          useValue: {
            findByUm49Codes: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ClarisaInstitutionsService,
          useValue: {
            findByCodes: jest.fn().mockResolvedValue([]),
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
    saveResultService = module.get(SaveResultService);
    prmsRepository = module.get(PrmsRepository);
    clarisaCountriesService = module.get(ClarisaCountriesService);
    clarisaRegionsService = module.get(ClarisaRegionsService);
    clarisaInstitutionsService = module.get(ClarisaInstitutionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should paginate PRMS search, process temporal rows, and close sync log', async () => {
      const temporalRow = buildTemporalMapper();
      prmsRepository.findTemporalResults.mockResolvedValue([temporalRow]);
      httpService.get.mockReturnValue(
        of({
          data: {
            total: 1,
            page: 1,
            size: 50,
            totalPages: 2,
            data: [temporalRow.data],
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
      expect(prmsRepository.findTemporalResults).toHaveBeenCalled();
      expect(saveResultService.bulkSaveAllSections).toHaveBeenCalled();
      expect(syncProcessLogService.update).toHaveBeenCalled();
      expect(syncProcessLogService.endSync).toHaveBeenCalledWith(99);
      expect(prmsRepository.deleteTemporalResults).toHaveBeenCalled();
    });

    it('should always delete temporal results even when sync fails', async () => {
      syncProcessLogService.initiateSync.mockRejectedValueOnce(
        new Error('sync failed'),
      );

      await service.getData(2024);

      expect(prmsRepository.deleteTemporalResults).toHaveBeenCalled();
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
        buildTemporalMapper({
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

    it('should map is_version_applied from temporal row', async () => {
      const out = await service.processData([
        buildTemporalMapper({}, { is_version: true }),
      ]);
      expect(out[0].is_version_applied).toBe(true);
    });

    it('should map a valid row without created_by', async () => {
      const row = buildTemporalMapper({
        result_level: { code: 'L9', name: '', description: '' },
      });
      const out = await service.processData([row]);
      expect(out).toHaveLength(1);
      expect(out[0].createResult.indicator_id).toBeDefined();
      expect(out[0].alignments.contracts.length).toBeGreaterThan(0);
      expect(clarisaLeversService.findOne).toHaveBeenCalledWith('L9');
      expect(
        pooledFundingContractsService.findMappingPooledFundingContracts,
      ).toHaveBeenCalledWith('PFUND');
    });

    it('should prefer PRMS lever id over Clarisa when both are present', async () => {
      clarisaLeversService.findOne.mockResolvedValueOnce({ id: 999 } as any);
      clarisaLeversService.findByShortName.mockResolvedValueOnce({
        id: 1,
      } as any);
      const out = await service.processData([buildTemporalMapper()]);
      expect(out[0].alignments.primary_levers[0].lever_id).toBe(999);
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
        buildTemporalMapper({
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
        buildTemporalMapper({
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
        buildTemporalMapper({
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
        buildTemporalMapper({
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

      const out = await service.processData([buildTemporalMapper()]);
      expect(out[0].alignments.contracts).toEqual([]);
    });

    it('should tolerate missing clarisa lever id', async () => {
      clarisaLeversService.findOne.mockResolvedValueOnce(null as any);
      clarisaLeversService.findByShortName.mockResolvedValueOnce(null as any);
      const out = await service.processData([buildTemporalMapper()]);
      expect(out[0].alignments.primary_levers[0].lever_id).toBeUndefined();
    });

    it('should fall back to Clarisa lever when PRMS lever is missing', async () => {
      clarisaLeversService.findOne.mockResolvedValueOnce(null as any);
      clarisaLeversService.findByShortName.mockResolvedValueOnce({
        id: 42,
      } as any);
      const out = await service.processData([buildTemporalMapper()]);
      expect(out[0].alignments.primary_levers[0].lever_id).toBe(42);
    });

    it('should not push primary contract when agreement_id is empty', async () => {
      pooledFundingContractsService.findMappingPooledFundingContracts.mockResolvedValueOnce(
        [
          {
            agreement_id: '',
            ubwClientDescription: 'exbio',
            departmentId: 10,
          },
        ] as any,
      );

      const out = await service.processData([buildTemporalMapper()]);
      expect(out[0].alignments.contracts).toEqual([]);
      expect(out[0].createResult.contract_id).toBe('');
    });

    it('should map an empty geoScope and partners when PRMS sends no geo or partner data', async () => {
      const out = await service.processData([buildTemporalMapper()]);
      expect(clarisaCountriesService.findByIso2).not.toHaveBeenCalled();
      expect(clarisaRegionsService.findByUm49Codes).not.toHaveBeenCalled();
      expect(clarisaInstitutionsService.findByCodes).not.toHaveBeenCalled();
      expect(out[0].geoScope.countries).toEqual([]);
      expect(out[0].geoScope.regions).toEqual([]);
      expect(out[0].partners.institutions).toEqual([]);
    });

    it('should map geoScope from PRMS geographic_focus, regions and countries', async () => {
      clarisaCountriesService.findByIso2.mockResolvedValueOnce([
        { isoAlpha2: 'AX' } as any,
        { isoAlpha2: 'AF' } as any,
      ]);
      clarisaRegionsService.findByUm49Codes.mockResolvedValueOnce([
        { um49Code: 150 } as any,
      ]);

      const out = await service.processData([
        buildTemporalMapper({
          geographic_focus: { code: '3', description: 'Multi-national' },
          regions: [{ code: '150', name: 'Europe' }],
          countries: [
            { code: 'AX', name: 'Aland Islands' },
            { code: 'AF', name: 'Afghanistan' },
          ],
        }),
      ]);

      expect(clarisaCountriesService.findByIso2).toHaveBeenCalledWith([
        'AX',
        'AF',
      ]);
      expect(clarisaRegionsService.findByUm49Codes).toHaveBeenCalledWith([150]);
      expect(out[0].geoScope.geo_scope_id).toBe(3);
      expect(out[0].geoScope.countries).toEqual([
        { isoAlpha2: 'AX' },
        { isoAlpha2: 'AF' },
      ]);
      expect(out[0].geoScope.regions).toEqual([{ region_id: 150 }]);
    });

    it('should map partners from PRMS contributing_partners via Clarisa institution codes', async () => {
      clarisaInstitutionsService.findByCodes.mockResolvedValueOnce([
        { code: 1 } as any,
        { code: 70 } as any,
      ]);

      const out = await service.processData([
        buildTemporalMapper({
          contributing_partners: [
            { code: '1', name: 'WUR', acronym: 'WUR' },
            { code: '70', name: 'ULBS', acronym: 'ULBS' },
          ],
        }),
      ]);

      expect(clarisaInstitutionsService.findByCodes).toHaveBeenCalledWith([
        1, 70,
      ]);
      expect(out[0].partners.institutions).toEqual([
        { institution_id: 1 },
        { institution_id: 70 },
      ]);
    });

    it('should map an empty evidence list when PRMS sends no evidences', async () => {
      const out = await service.processData([buildTemporalMapper()]);
      expect(out[0].evidence.evidence).toEqual([]);
    });

    it('should map evidence from PRMS evidences', async () => {
      const out = await service.processData([
        buildTemporalMapper({
          evidences: [{ link: 'link.com', description: 'gender 1' }],
        }),
      ]);

      expect(out[0].evidence.evidence).toEqual([
        { evidence_url: 'link.com', evidence_description: 'gender 1' },
      ]);
    });

    it('should skip evidences without a link', async () => {
      const out = await service.processData([
        buildTemporalMapper({
          evidences: [{ link: '', description: 'no link' }],
        }),
      ]);

      expect(out[0].evidence.evidence).toEqual([]);
    });

    it('should map policy_change_summary for POLICY_CHANGE indicators', async () => {
      clarisaInstitutionsService.findByCodes.mockResolvedValueOnce([
        { code: 8064 } as any,
        { code: 2714 } as any,
      ]);

      const out = await service.processData([
        buildTemporalMapper({
          indicator_category: {
            code: String(ResultTypeEnum.POLICY_CHANGE),
            name: 'Policy Change',
          },
          policy_change_summary: {
            amount: 500000,
            amount_status_label: 'Estimated',
            policy_type: {
              id: 1,
              name: 'Program, budget or investment',
              definition: 'def',
            },
            policy_stage: {
              id: 6,
              name: 'Stage 1',
              definition: 'def',
            },
            linked_innovation_dev: false,
            linked_innovation_use: false,
            result_related_to: [],
            policy_implementing_organizations: [
              {
                id: 8064,
                name: 'Papalotla - Grupo Nandi',
                acronym: null,
                institution_type_name: 'Private company',
              },
              {
                id: 2714,
                name: 'Semillas Papalotla SA de DV',
                acronym: 'Papalotla',
                institution_type_name: 'Private company',
              },
            ],
          },
        }),
      ]);

      expect(clarisaInstitutionsService.findByCodes).toHaveBeenCalledWith([
        8064, 2714,
      ]);
      // PRMS policy_type 1 (Program…) → STAR policy_type_id 3
      expect(out[0].policyChange).toEqual({
        policy_type_id: 3,
        policy_stage_id: 6,
        evidence_stage: undefined,
        implementing_organization: [
          { institution_id: 8064 },
          { institution_id: 2714 },
        ],
        innovation_development: undefined,
        innovation_use: undefined,
      });
    });

    it('should homologate PRMS policy_type ids to STAR policy_type_id', async () => {
      const cases = [
        { prmsId: 1, starId: 3 },
        { prmsId: 2, starId: 2 },
        { prmsId: 3, starId: 1 },
      ];

      for (const { prmsId, starId } of cases) {
        const out = await service.processData([
          buildTemporalMapper({
            indicator_category: {
              code: String(ResultTypeEnum.POLICY_CHANGE),
              name: 'Policy Change',
            },
            policy_change_summary: {
              amount: 0,
              amount_status_label: '',
              policy_type: { id: prmsId, name: '', definition: '' },
              policy_stage: { id: 6, name: '', definition: '' },
              linked_innovation_dev: false,
              linked_innovation_use: false,
              result_related_to: [],
              policy_implementing_organizations: [],
            },
          }),
        ]);

        expect(out[0].policyChange.policy_type_id).toBe(starId);
      }
    });

    it('should leave policyChange undefined when policy_change_summary is null', async () => {
      const out = await service.processData([
        buildTemporalMapper({
          indicator_category: {
            code: String(ResultTypeEnum.POLICY_CHANGE),
            name: 'Policy Change',
          },
          policy_change_summary: null,
        }),
      ]);

      expect(out[0].policyChange).toBeUndefined();
      expect(clarisaInstitutionsService.findByCodes).not.toHaveBeenCalled();
    });

    it('should not map policyChange for non policy-change indicators', async () => {
      const out = await service.processData([
        buildTemporalMapper({
          policy_change_summary: {
            amount: 1,
            amount_status_label: 'Estimated',
            policy_type: { id: 1, name: 't', definition: 'd' },
            policy_stage: { id: 6, name: 's', definition: 'd' },
            linked_innovation_dev: false,
            linked_innovation_use: false,
            result_related_to: [],
            policy_implementing_organizations: [
              { id: 1, name: 'a', acronym: null, institution_type_name: 'x' },
            ],
          },
        }),
      ]);

      expect(out[0].policyChange).toBeUndefined();
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

    it('does not duplicate an evidence entry whose url already exists', () => {
      const body = new ExternalMappersDto();
      body.evidence = {
        evidence: [
          { evidence_url: 'http://handle', evidence_description: 'gender 1' },
        ] as any,
      } as any;
      const kp = {
        knowledge_product_type: 'JOURNAL',
        handle: 'http://handle',
        doi: '10.1000/xyz',
      } as PrmsKnowledgeProductDto;

      (service as any).processKnowledgeProduct(kp, body);

      expect(body.evidence.evidence).toHaveLength(2);
      expect(
        body.evidence.evidence.filter(
          (el) => el.evidence_url === 'http://handle',
        ),
      ).toHaveLength(1);
      expect(
        body.evidence.evidence.find((el) => el.evidence_url === '10.1000/xyz'),
      ).toBeDefined();
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
      const alignmentArg =
        resultsService.updateResultAlignment.mock.calls[0][1];
      expect(alignmentArg.primary_levers.length).toBeGreaterThan(0);
    });

    it('should rollback when processing throws after createResult', async () => {
      resultRepoHandle.findOne.mockResolvedValueOnce(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 888,
        result_official_code: 55,
      } as any);
      resultsService.updateGeneralInfo.mockRejectedValueOnce(new Error('boom'));

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
});
