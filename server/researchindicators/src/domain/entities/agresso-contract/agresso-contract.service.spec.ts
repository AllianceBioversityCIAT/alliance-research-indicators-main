import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';
import { IndicatorMetadataReportsRepository } from './repositories/indicator-metadata-reports.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { AgressoContract } from './entities/agresso-contract.entity';
import { AgressoContractWhere } from './dto/agresso-contract.dto';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';
import { StringKeys } from '../../shared/global-dto/types-global';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { OrderFieldsEnum } from './enum/order-fields.enum';
import { AgressoContractStatus } from '../../shared/enum/agresso-contract.enum';
import { AppConfig } from '../../shared/utils/app-config.util';
import { ClarisaLeversService } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';

// Mock the utility functions
jest.mock('../../shared/utils/object.utils', () => ({
  cleanObject: jest.fn((obj) => obj),
  parseBoolean: jest.fn((obj) => obj),
}));

describe('AgressoContractService', () => {
  let service: AgressoContractService;
  let dataSource: DataSource; // eslint-disable-line @typescript-eslint/no-unused-vars
  let repository: AgressoContractRepository;
  let currentUser: CurrentUserUtil;
  let clarisaLeversService: ClarisaLeversService;

  const mockDataSource = {
    getRepository: jest.fn(),
    createEntityManager: jest.fn(),
  };

  const mockRepository = {
    findAllContracts: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    findContractsByUser: jest.fn(),
    findOneContract: jest.fn(),
    getContracts: jest.fn(),
    getGeoScopeReport: jest.fn(),
    getTopPartnersReport: jest.fn(),
    getTopContributorsReport: jest.fn(),
    getTopPrimaryLeversReport: jest.fn(),
    getTopMainContactPersonsReport: jest.fn(),
    getContractStaffReport: jest.fn(),
    getFullContractReports: jest.fn(),
    getFundingTypes: jest.fn(),
  };

  const mockIndicatorMetadataReportsRepository = {
    getSimpleIndicatorSections: jest.fn(),
    getCapacitySharingMetadata: jest.fn(),
  };

  const mockCurrentUser = {
    user_id: 123,
    user: { sec_user_id: 123 } as any,
    getUserId: jest.fn().mockReturnValue(123),
  };

  const mockAppConfig = {
    BUCKET_URL: 'https://bucket.example',
  };

  const mockClarisaLeversService = {
    homologatedData: jest.fn(),
    findByShortName: jest.fn(),
    resolveIconUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgressoContractService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AgressoContractRepository,
          useValue: mockRepository,
        },
        {
          provide: IndicatorMetadataReportsRepository,
          useValue: mockIndicatorMetadataReportsRepository,
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
        {
          provide: AppConfig,
          useValue: mockAppConfig,
        },
        {
          provide: ClarisaLeversService,
          useValue: mockClarisaLeversService,
        },
      ],
    }).compile();

    service = module.get<AgressoContractService>(AgressoContractService);
    dataSource = module.get<DataSource>(DataSource);
    repository = module.get<AgressoContractRepository>(
      AgressoContractRepository,
    );
    currentUser = module.get<CurrentUserUtil>(CurrentUserUtil);
    clarisaLeversService =
      module.get<ClarisaLeversService>(ClarisaLeversService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findContracts', () => {
    it('should find contracts with where clause and pagination', async () => {
      const where: AgressoContractWhere = {
        agreement_id: 'TEST001',
        funding_type: 'BILATERAL',
        contract_status: AgressoContractStatus.ONGOING,
      };

      const pagination: PaginationDto = {
        page: 1,
        limit: 10,
      };

      const relations: Partial<StringKeys<AgressoContract>> = {
        countries: 'true',
      };

      const expectedResult = [
        {
          agreement_id: 'TEST001',
          projectDescription: 'Test Project',
          contract_status: AgressoContractStatus.ONGOING,
        },
      ];

      mockRepository.findAllContracts.mockResolvedValue(expectedResult);

      const result = await service.findContracts(where, pagination, relations);

      expect(repository.findAllContracts).toHaveBeenCalledWith(
        pagination,
        where,
        relations,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty where clause', async () => {
      const where: Partial<AgressoContractWhere> = {};
      const pagination: PaginationDto = { page: 1, limit: 5 };
      const relations: Partial<StringKeys<AgressoContract>> = {};

      const expectedResult = [];
      mockRepository.findAllContracts.mockResolvedValue(expectedResult);

      const result = await service.findContracts(
        where as AgressoContractWhere,
        pagination,
        relations,
      );

      expect(repository.findAllContracts).toHaveBeenCalledWith(
        pagination,
        where,
        relations,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should find one contract by agreement_id', async () => {
      const contractId = 'CONTRACT123';
      const expectedContract = {
        agreement_id: contractId,
        projectDescription: 'Single Contract',
        contract_status: AgressoContractStatus.COMPLETED,
      };

      mockRepository.findOne.mockResolvedValue(expectedContract);

      const result = await service.findOne(contractId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          agreement_id: contractId,
        },
      });
      expect(result).toEqual(expectedContract);
    });

    it('should return null when contract not found', async () => {
      const contractId = 'NONEXISTENT';
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(contractId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          agreement_id: contractId,
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find contracts by first and last name', async () => {
      const firstName = 'John';
      const lastName = 'Doe';
      const expectedContracts = [
        {
          agreement_id: 'NAME001',
          project_lead_description: 'John Doe',
          projectDescription: 'Project by John Doe',
        },
        {
          agreement_id: 'NAME002',
          project_lead_description: 'John Doe Smith',
          projectDescription: 'Another project by John Doe',
        },
      ];

      mockRepository.findByName.mockResolvedValue(expectedContracts);

      const result = await service.findByName(firstName, lastName);

      expect(repository.findByName).toHaveBeenCalledWith(firstName, lastName);
      expect(result).toEqual(expectedContracts);
    });

    it('should return empty array when no contracts found by name', async () => {
      const firstName = 'Jane';
      const lastName = 'Smith';

      mockRepository.findByName.mockResolvedValue([]);

      const result = await service.findByName(firstName, lastName);

      expect(repository.findByName).toHaveBeenCalledWith(firstName, lastName);
      expect(result).toEqual([]);
    });
  });

  describe('findContractsResultByCurrentUser', () => {
    it('should find contracts for current user', async () => {
      const expectedContracts = [
        {
          agreement_id: 'USER001',
          projectDescription: 'User Project 1',
          indicators: [],
        },
        {
          agreement_id: 'USER002',
          projectDescription: 'User Project 2',
          indicators: [],
        },
      ];

      mockRepository.findContractsByUser.mockResolvedValue(expectedContracts);

      const result = await service.findContractsResultByCurrentUser();

      expect(repository.findContractsByUser).toHaveBeenCalledWith(
        currentUser.user_id,
      );
      expect(result).toEqual(expectedContracts);
    });
  });

  describe('findContratResultByContractId', () => {
    it('should find contract result enriched with lever data', async () => {
      const contractId = 'CONTRACT123';
      const contract = {
        agreement_id: contractId,
        projectDescription: 'Contract with Results',
        departmentId: 'L3',
        indicators: [
          {
            indicator: { indicator_id: 1, name: 'Indicator 1' },
            count_results: 5,
          },
        ],
      };
      const lever = {
        id: 3,
        short_name: 'Lever 3',
        full_name: 'Lever 3: Climate Action',
      };
      const icon =
        'https://bucket.example/images/levers/L3-Climate-Action_COLOR.png';

      mockRepository.findOneContract.mockResolvedValue(contract);
      mockClarisaLeversService.homologatedData.mockReturnValue('Lever 3');
      mockClarisaLeversService.findByShortName.mockResolvedValue(lever);
      mockClarisaLeversService.resolveIconUrl.mockReturnValue(icon);

      const result = await service.findContratResultByContractId(contractId);

      expect(repository.findOneContract).toHaveBeenCalledWith(contractId);
      expect(clarisaLeversService.homologatedData).toHaveBeenCalledWith('L3');
      expect(clarisaLeversService.findByShortName).toHaveBeenCalledWith(
        'Lever 3',
      );
      expect(clarisaLeversService.resolveIconUrl).toHaveBeenCalledWith(
        lever.short_name,
        lever.full_name,
        lever.id,
      );
      expect(result).toEqual({
        ...contract,
        lever: {
          ...lever,
          icon,
        },
      });
    });

    it('should return null when contract not found', async () => {
      const contractId = 'NONEXISTENT';
      mockRepository.findOneContract.mockResolvedValue(null);

      const result = await service.findContratResultByContractId(contractId);

      expect(repository.findOneContract).toHaveBeenCalledWith(contractId);
      expect(clarisaLeversService.homologatedData).not.toHaveBeenCalled();
      expect(clarisaLeversService.findByShortName).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findAgressoContracts', () => {
    it('should find agresso contracts with current user filter', async () => {
      const filter = {
        contract_code: 'TEST001',
        project_name: 'Test Project',
        principal_investigator: 'John Doe',
        lever: ['1', '2'],
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        status: [AgressoContractStatus.ONGOING],
      };

      const expectedContracts = [
        {
          agreement_id: 'TEST001',
          projectDescription: 'Test Project',
          project_lead_description: 'John Doe',
          indicators: [],
        },
      ];

      mockRepository.getContracts.mockResolvedValue(expectedContracts);

      const result = await service.findAgressoContracts(
        TrueFalseEnum.TRUE,
        filter,
        OrderFieldsEnum.START_DATE,
        'DESC',
      );

      expect(repository.getContracts).toHaveBeenCalledWith(
        filter,
        currentUser.user,
        OrderFieldsEnum.START_DATE,
        'DESC',
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedContracts);
    });

    it('should find agresso contracts without current user filter', async () => {
      const filter = {
        project_name: 'Global Project',
      };

      const expectedContracts = [
        {
          agreement_id: 'GLOBAL001',
          projectDescription: 'Global Project',
          indicators: [],
        },
      ];

      mockRepository.getContracts.mockResolvedValue(expectedContracts);

      const result = await service.findAgressoContracts(
        TrueFalseEnum.FALSE,
        filter,
        OrderFieldsEnum.PROJECT_NAME,
        'ASC',
      );

      expect(repository.getContracts).toHaveBeenCalledWith(
        filter,
        null,
        OrderFieldsEnum.PROJECT_NAME,
        'ASC',
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedContracts);
    });

    it('should use default direction when not specified', async () => {
      const expectedContracts = [];
      mockRepository.getContracts.mockResolvedValue(expectedContracts);

      const result = await service.findAgressoContracts(
        TrueFalseEnum.FALSE,
        {},
        OrderFieldsEnum.CONTRACT_CODE,
      );

      expect(repository.getContracts).toHaveBeenCalledWith(
        {},
        null,
        OrderFieldsEnum.CONTRACT_CODE,
        'ASC',
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedContracts);
    });

    it('should handle undefined filter', async () => {
      const expectedContracts = [];
      mockRepository.getContracts.mockResolvedValue(expectedContracts);

      const result = await service.findAgressoContracts(
        TrueFalseEnum.TRUE,
        undefined,
        undefined,
        undefined,
      );

      expect(repository.getContracts).toHaveBeenCalledWith(
        undefined,
        currentUser.user,
        undefined,
        'ASC',
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedContracts);
    });
  });

  describe('getTopPrimaryLeversReport', () => {
    it('should return top primary levers with native icon from repository', async () => {
      const expectedReport = {
        contract_id: 'A100',
        limit: 10,
        top_primary_levers: [
          {
            lever_id: 3,
            short_name: 'Lever 3',
            full_name: 'Lever 3: Climate Action',
            count: 6,
            icon: 'https://bucket.example/images/levers/L3-Climate-Action_COLOR.png',
          },
        ],
      };
      mockRepository.getTopPrimaryLeversReport.mockResolvedValue(
        expectedReport,
      );

      const result = await service.getTopPrimaryLeversReport('A100', 10);

      expect(repository.getTopPrimaryLeversReport).toHaveBeenCalledWith(
        'A100',
        10,
      );
      expect(result).toEqual(expectedReport);
    });
  });

  describe('getTopContributorsReport', () => {
    it('should delegate top contributors report to repository', async () => {
      const expectedReport = {
        contract_id: 'A100',
        limit: 10,
        top_contributors: [],
      };
      mockRepository.getTopContributorsReport.mockResolvedValue(expectedReport);

      const result = await service.getTopContributorsReport('A100', 10);

      expect(repository.getTopContributorsReport).toHaveBeenCalledWith(
        'A100',
        10,
      );
      expect(result).toEqual(expectedReport);
    });
  });

  describe('getTopMainContactPersonsReport', () => {
    it('should delegate top main contact persons report to repository', async () => {
      const expectedReport = {
        contract_id: 'A100',
        limit: 10,
        top_main_contact_persons: [],
      };
      mockRepository.getTopMainContactPersonsReport.mockResolvedValue(
        expectedReport,
      );

      const result = await service.getTopMainContactPersonsReport('A100', 10);

      expect(repository.getTopMainContactPersonsReport).toHaveBeenCalledWith(
        'A100',
        10,
      );
      expect(result).toEqual(expectedReport);
    });
  });

  describe('getContractStaffReport', () => {
    it('should delegate contract staff report to repository', async () => {
      const expectedReport = {
        contract_id: 'A100',
        staff: [{ name: 'John Doe', role: 'Project Lead' }],
      };
      mockRepository.getContractStaffReport.mockResolvedValue(expectedReport);

      const result = await service.getContractStaffReport('A100');

      expect(repository.getContractStaffReport).toHaveBeenCalledWith('A100');
      expect(result).toEqual(expectedReport);
    });
  });

  describe('getFullContractReports — T-06 sequential composition (DD-11)', () => {
    const baseReport = {
      contract_id: 'A100',
      top_primary_levers: [
        { lever_id: 1, short_name: 'L1', full_name: 'Lever 1', count: 2 },
      ],
      top_contributors: [
        { contributor_id: 1, name: 'Contributor', count: 3 } as any,
      ],
      top_main_contact_persons: [
        { person_id: 1, name: 'Person', count: 1 } as any,
      ],
      staff: [{ name: 'John Doe', role: 'Project Lead' }],
      top_partners: [{ partner_id: 1, name: 'Partner', count: 4 } as any],
      geo_scope: {
        geo_scope_summary: {
          global: 0,
          regional: 0,
          countries: 0,
          sub_national: 0,
          yet_to_be_determined: 0,
        },
        top_regions: [],
        top_countries: [],
      },
    };

    const simpleIndicatorSections = {
      innovation_nature: [{ id: 1, name: 'Nature A', count: 5 }],
      innovation_type: [{ id: 2, name: 'Type A', count: 4 }],
      innovation_readiness: [{ id: 3, name: 'Readiness A', count: 3 }],
      oicr_maturity: [{ id: 4, name: 'Maturity A', count: 2 }],
      policy_type: [{ id: 5, name: 'Policy Type A', count: 1 }],
      policy_stage: [{ id: 6, name: 'Policy Stage A', count: 6 }],
    };

    const capacitySharingMetadata = {
      session_format: [{ id: 1, name: 'Individual', count: 7 }],
      session_type: [{ id: 1, name: 'Training', count: 8 }],
      degree: [{ id: 1, name: 'PhD', count: 2 }],
      gender_individual: [{ id: 1, name: 'Male', count: 5 }],
      gender_group: [
        { id: 1, name: 'Male', count: 10 },
        { id: 2, name: 'Female', count: 20 },
        { id: 3, name: 'Non-binary', count: 0 },
      ],
    };

    beforeEach(() => {
      mockRepository.getFullContractReports.mockResolvedValue(baseReport);
      mockIndicatorMetadataReportsRepository.getSimpleIndicatorSections.mockResolvedValue(
        simpleIndicatorSections,
      );
      mockIndicatorMetadataReportsRepository.getCapacitySharingMetadata.mockResolvedValue(
        capacitySharingMetadata,
      );
    });

    it('delegates the base report to AgressoContractRepository and the 10 new sections to IndicatorMetadataReportsRepository, keyed by contract id', async () => {
      await service.getFullContractReports('A100');

      expect(repository.getFullContractReports).toHaveBeenCalledWith('A100');
      expect(
        mockIndicatorMetadataReportsRepository.getSimpleIndicatorSections,
      ).toHaveBeenCalledWith('A100');
      expect(
        mockIndicatorMetadataReportsRepository.getCapacitySharingMetadata,
      ).toHaveBeenCalledWith('A100');
    });

    it('awaits the base repository before invoking IndicatorMetadataReportsRepository — DD-11, no Promise.all spanning both steps', async () => {
      const callOrder: string[] = [];

      mockRepository.getFullContractReports.mockImplementation(async () => {
        callOrder.push('base:start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        callOrder.push('base:resolved');
        return baseReport;
      });
      mockIndicatorMetadataReportsRepository.getSimpleIndicatorSections.mockImplementation(
        async () => {
          callOrder.push('q1:invoked');
          return simpleIndicatorSections;
        },
      );
      mockIndicatorMetadataReportsRepository.getCapacitySharingMetadata.mockImplementation(
        async () => {
          callOrder.push('q2:invoked');
          return capacitySharingMetadata;
        },
      );

      await service.getFullContractReports('A100');

      // The second repository must not be invoked before the first resolves.
      // A raced (Promise.all-spanning-both) composition would interleave
      // "base:start" ... "q1:invoked"/"q2:invoked" ... "base:resolved" — this
      // asserts the strict order a sequential composition guarantees.
      expect(callOrder).toEqual([
        'base:start',
        'base:resolved',
        'q1:invoked',
        'q2:invoked',
      ]);
    });

    it('returns all 17 fields, the 7 pre-existing ones unchanged in name/shape/content (R-IMC-007 AC.1)', async () => {
      const result = await service.getFullContractReports('A100');

      // The 7 pre-existing fields are spread from the base report, not
      // re-listed — asserting deep equality here is what would catch a
      // re-listing mistake (design §12 DD-11 / R-IMC-007 AC.1).
      expect(result.contract_id).toEqual(baseReport.contract_id);
      expect(result.top_primary_levers).toEqual(baseReport.top_primary_levers);
      expect(result.top_contributors).toEqual(baseReport.top_contributors);
      expect(result.top_main_contact_persons).toEqual(
        baseReport.top_main_contact_persons,
      );
      expect(result.staff).toEqual(baseReport.staff);
      expect(result.top_partners).toEqual(baseReport.top_partners);
      expect(result.geo_scope).toEqual(baseReport.geo_scope);

      expect(Object.keys(result).sort()).toEqual(
        [
          'contract_id',
          'top_partners',
          'top_primary_levers',
          'top_main_contact_persons',
          'top_contributors',
          'staff',
          'geo_scope',
          'innovation_nature',
          'innovation_type',
          'innovation_readiness',
          'oicr_maturity',
          'policy_type',
          'policy_stage',
          'session_format',
          'session_type',
          'gender_distribution',
          'degree',
        ].sort(),
      );
    });

    it('merges gender_individual + gender_group into gender_distribution, sorted count DESC / id ASC, and drops the zero-total Non-binary category', async () => {
      const result = await service.getFullContractReports('A100');

      // Individual Male=5 + group Male=10 => 15; group Female=20 stands alone;
      // group Non-binary=0 is dropped (zero-total).
      expect(result.gender_distribution).toEqual([
        { id: 2, name: 'Female', count: 20 },
        { id: 1, name: 'Male', count: 15 },
      ]);
    });

    it('never leaks gender_individual / gender_group onto the response', async () => {
      const result = await service.getFullContractReports('A100');

      expect(result).not.toHaveProperty('gender_individual');
      expect(result).not.toHaveProperty('gender_group');
    });

    it('carries through the 6 Q1 sections and the 3 non-gender Q2 sections unchanged', async () => {
      const result = await service.getFullContractReports('A100');

      expect(result.innovation_nature).toEqual(
        simpleIndicatorSections.innovation_nature,
      );
      expect(result.innovation_type).toEqual(
        simpleIndicatorSections.innovation_type,
      );
      expect(result.innovation_readiness).toEqual(
        simpleIndicatorSections.innovation_readiness,
      );
      expect(result.oicr_maturity).toEqual(
        simpleIndicatorSections.oicr_maturity,
      );
      expect(result.policy_type).toEqual(simpleIndicatorSections.policy_type);
      expect(result.policy_stage).toEqual(simpleIndicatorSections.policy_stage);
      expect(result.session_format).toEqual(
        capacitySharingMetadata.session_format,
      );
      expect(result.session_type).toEqual(capacitySharingMetadata.session_type);
      expect(result.degree).toEqual(capacitySharingMetadata.degree);
    });

    // --- T-07 additions below (tasks.md § T-06's review, ADVISORY R-1 / R-2) ---
    // Both owed by T-07; neither touches the `callOrder` case above, which
    // remains DD-11's own mechanical guard.

    it('runs Q1 and Q2 concurrently within step 2 — both invoked before either resolves (T-06 review R-1: `callOrder` alone cannot distinguish `Promise.all([Q1,Q2])` from a sequential `await Q1; await Q2`, both emit the identical array)', async () => {
      const callOrder: string[] = [];

      mockIndicatorMetadataReportsRepository.getSimpleIndicatorSections.mockImplementation(
        async () => {
          callOrder.push('q1:invoked');
          await new Promise((resolve) => setTimeout(resolve, 10));
          callOrder.push('q1:resolved');
          return simpleIndicatorSections;
        },
      );
      mockIndicatorMetadataReportsRepository.getCapacitySharingMetadata.mockImplementation(
        async () => {
          callOrder.push('q2:invoked');
          await new Promise((resolve) => setTimeout(resolve, 10));
          callOrder.push('q2:resolved');
          return capacitySharingMetadata;
        },
      );

      await service.getFullContractReports('A100');

      // A sequentialised step 2 would produce
      // ['q1:invoked','q1:resolved','q2:invoked','q2:resolved'] — indistinguishable
      // from a race by the existing callOrder test above. Asserting that both
      // `:invoked` entries precede both `:resolved` entries is what actually
      // gates "step 2, 2 concurrent" (DD-1, DD-11's `max(8,2)=8` arithmetic).
      const invokedIndex = Math.max(
        callOrder.indexOf('q1:invoked'),
        callOrder.indexOf('q2:invoked'),
      );
      const resolvedIndex = Math.min(
        callOrder.indexOf('q1:resolved'),
        callOrder.indexOf('q2:resolved'),
      );
      expect(invokedIndex).toBeLessThan(resolvedIndex);
    });

    it('returns all 10 metadata sections as empty arrays — not null, not absent — for a contract with no results (R-IMC-007 AC.2 at runtime; proven live on A1001 in execution.md § T-03+T-04, not previously covered in CI)', async () => {
      mockRepository.getFullContractReports.mockResolvedValue({
        ...baseReport,
        top_partners: [],
        top_primary_levers: [],
        top_main_contact_persons: [],
        top_contributors: [],
        staff: [],
      });
      mockIndicatorMetadataReportsRepository.getSimpleIndicatorSections.mockResolvedValue(
        {
          innovation_nature: [],
          innovation_type: [],
          innovation_readiness: [],
          oicr_maturity: [],
          policy_type: [],
          policy_stage: [],
        },
      );
      mockIndicatorMetadataReportsRepository.getCapacitySharingMetadata.mockResolvedValue(
        {
          session_format: [],
          session_type: [],
          degree: [],
          gender_individual: [],
          gender_group: [
            { id: 1, name: 'Male', count: 0 },
            { id: 2, name: 'Female', count: 0 },
            { id: 3, name: 'Non-binary', count: 0 },
          ],
        },
      );

      const result = await service.getFullContractReports('A100');

      expect(result.innovation_nature).toEqual([]);
      expect(result.innovation_type).toEqual([]);
      expect(result.innovation_readiness).toEqual([]);
      expect(result.oicr_maturity).toEqual([]);
      expect(result.policy_type).toEqual([]);
      expect(result.policy_stage).toEqual([]);
      expect(result.session_format).toEqual([]);
      expect(result.session_type).toEqual([]);
      expect(result.degree).toEqual([]);
      // gender_distribution: the three gender_group literals are all
      // zero-total here, so mergeGenderDistribution drops every category —
      // an empty array, not the 3 zero-count rows it was fed.
      expect(result.gender_distribution).toEqual([]);
    });
  });

  describe('getTopPartnersReport', () => {
    it('should delegate top partners report to repository', async () => {
      const expectedReport = {
        contract_id: 'A100',
        limit: 10,
        top_partners: [],
      };
      mockRepository.getTopPartnersReport.mockResolvedValue(expectedReport);

      const result = await service.getTopPartnersReport('A100', 10);

      expect(repository.getTopPartnersReport).toHaveBeenCalledWith('A100', 10);
      expect(result).toEqual(expectedReport);
    });
  });

  describe('getGeoScopeReport', () => {
    it('should delegate geographic scope report to repository', async () => {
      const expectedReport = {
        contract_id: 'A100',
        limit: 10,
        geo_scope_summary: {
          global: 1,
          regional: 2,
          countries: 7,
          sub_national: 4,
          yet_to_be_determined: 0,
        },
        top_regions: [],
        top_countries: [],
      };
      mockRepository.getGeoScopeReport.mockResolvedValue(expectedReport);

      const result = await service.getGeoScopeReport('A100', 10);

      expect(repository.getGeoScopeReport).toHaveBeenCalledWith('A100', 10);
      expect(result).toEqual(expectedReport);
    });
  });

  describe('getFundingTypes', () => {
    it('should delegate funding types lookup to repository', async () => {
      const expectedFundingTypes = [
        { funding_type: 'BILATERAL' },
        { funding_type: 'MULTILATERAL' },
      ];
      mockRepository.getFundingTypes.mockResolvedValue(expectedFundingTypes);

      const result = await service.getFundingTypes();

      expect(repository.getFundingTypes).toHaveBeenCalled();
      expect(result).toEqual(expectedFundingTypes);
    });
  });
});
