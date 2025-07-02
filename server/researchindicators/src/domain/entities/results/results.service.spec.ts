import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Not } from 'typeorm';
import { ResultsService } from './results.service';
import { ResultRepository } from './repositories/result.repository';
import { ResultContractsService } from '../result-contracts/result-contracts.service';
import { ResultLeversService } from '../result-levers/result-levers.service';
import { ResultKeywordsService } from '../result-keywords/result-keywords.service';
import { ResultUsersService } from '../result-users/result-users.service';
import { ResultCapacitySharingService } from '../result-capacity-sharing/result-capacity-sharing.service';
import { ResultPolicyChangeService } from '../result-policy-change/result-policy-change.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { ResultCountriesService } from '../result-countries/result-countries.service';
import { ResultRegionsService } from '../result-regions/result-regions.service';
import { ResultCountriesSubNationalsService } from '../result-countries-sub-nationals/result-countries-sub-nationals.service';
import { ClarisaGeoScopeService } from '../../tools/clarisa/entities/clarisa-geo-scope/clarisa-geo-scope.service';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { OpenSearchResultApi } from '../../tools/open-search/results/result.opensearch.api';
import { IndicatorsService } from '../indicators/indicators.service';
import { ClarisaSubNationalsService } from '../../tools/clarisa/entities/clarisa-sub-nationals/clarisa-sub-nationals.service';
import { ResultCapSharingIpService } from '../result-cap-sharing-ip/result-cap-sharing-ip.service';
import { AllianceUserStaffService } from '../alliance-user-staff/alliance-user-staff.service';
import { ClarisaLeversService } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { AgressoContractService } from '../agresso-contract/agresso-contract.service';
import { ResultInnovationDevService } from '../result-innovation-dev/result-innovation-dev.service';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { CreateResultDto } from './dto/create-result.dto';
import { SetAutitEnum } from '../../shared/utils/current-user.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';
import { ContractRolesEnum } from '../result-contracts/enum/contract-roles.enum';
import { ElasticOperationEnum } from '../../tools/open-search/dto/elastic-operation.dto';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';

describe('ResultsService', () => {
  let service: ResultsService;
  let mockMainRepo: jest.Mocked<ResultRepository>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockResultContractsService: jest.Mocked<ResultContractsService>;
  let mockResultLeversService: jest.Mocked<ResultLeversService>;
  let mockResultKeywordsService: jest.Mocked<ResultKeywordsService>;
  let mockResultUsersService: jest.Mocked<ResultUsersService>;
  let mockResultCapacitySharingService: jest.Mocked<ResultCapacitySharingService>;
  let mockResultPolicyChangeService: jest.Mocked<ResultPolicyChangeService>;
  let mockCurrentUser: jest.Mocked<CurrentUserUtil>;
  let mockAlianceManagementApp: jest.Mocked<AlianceManagementApp>;
  let mockResultCountriesService: jest.Mocked<ResultCountriesService>;
  let mockResultRegionsService: jest.Mocked<ResultRegionsService>;
  let mockResultCountriesSubNationalsService: jest.Mocked<ResultCountriesSubNationalsService>;
  let mockClarisaGeoScopeService: jest.Mocked<ClarisaGeoScopeService>;
  let mockUpdateDataUtil: jest.Mocked<UpdateDataUtil>;
  let mockOpenSearchResultApi: jest.Mocked<OpenSearchResultApi>;
  let mockIndicatorsService: jest.Mocked<IndicatorsService>;
  let mockClarisaSubNationalsService: jest.Mocked<ClarisaSubNationalsService>;
  let mockResultCapSharingIpService: jest.Mocked<ResultCapSharingIpService>;
  let mockAgressoUserStaffService: jest.Mocked<AllianceUserStaffService>;
  let mockClarisaLeversService: jest.Mocked<ClarisaLeversService>;
  let mockAgressoContractService: jest.Mocked<AgressoContractService>;
  let mockResultInnovationDevService: jest.Mocked<ResultInnovationDevService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockEntityManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    // Create mocks for all dependencies
    mockMainRepo = {
      findResultsFilters: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      deleteResult: jest.fn(),
      metadataPrincipalInvestigator: jest.fn(),
      target: {} as any,
      save: jest.fn(),
    } as any;

    mockDataSource = {
      transaction: jest.fn(),
      getRepository: jest.fn(),
    } as any;

    mockResultContractsService = {
      find: jest.fn(),
      create: jest.fn(),
    } as any;

    mockResultLeversService = {
      find: jest.fn(),
      create: jest.fn(),
    } as any;

    mockResultKeywordsService = {
      findKeywordsByResultId: jest.fn(),
      transformData: jest.fn(),
      create: jest.fn(),
    } as any;

    mockResultUsersService = {
      findUsersByRoleResult: jest.fn(),
      create: jest.fn(),
    } as any;

    mockResultCapacitySharingService = {
      create: jest.fn(),
      update: jest.fn(),
      processedAiInfo: jest.fn(),
    } as any;

    mockResultPolicyChangeService = {
      create: jest.fn(),
      update: jest.fn(),
      processedAiInfo: jest.fn(),
    } as any;

    mockCurrentUser = {
      user_id: 123,
      audit: jest.fn(),
    } as any;

    mockAlianceManagementApp = {
      linkUserToContract: jest.fn(),
    } as any;

    mockResultCountriesService = {
      find: jest.fn(),
      create: jest.fn(),
      comparerClientToServerCountry: jest.fn(),
    } as any;

    mockResultRegionsService = {
      find: jest.fn(),
      create: jest.fn(),
    } as any;

    mockResultCountriesSubNationalsService = {
      find: jest.fn(),
      create: jest.fn(),
    } as any;

    mockClarisaGeoScopeService = {
      findByName: jest.fn(),
      transformGeoScope: jest.fn(),
    } as any;

    mockUpdateDataUtil = {
      updateLastUpdatedDate: jest.fn(),
    } as any;

    mockOpenSearchResultApi = {
      uploadSingleToOpenSearch: jest.fn(),
    } as any;

    mockIndicatorsService = {
      findByName: jest.fn(),
    } as any;

    mockClarisaSubNationalsService = {
      findByNames: jest.fn(),
    } as any;

    mockResultCapSharingIpService = {
      create: jest.fn(),
    } as any;

    mockAgressoUserStaffService = {
      findUserByFirstAndLastName: jest.fn(),
    } as any;

    mockClarisaLeversService = {
      homologatedData: jest.fn(),
      findByName: jest.fn(),
    } as any;

    mockAgressoContractService = {
      findOne: jest.fn(),
    } as any;

    mockResultInnovationDevService = {
      create: jest.fn(),
    } as any;

    mockEntityManager = {
      getRepository: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ResultRepository, useValue: mockMainRepo },
        {
          provide: ResultContractsService,
          useValue: mockResultContractsService,
        },
        { provide: ResultLeversService, useValue: mockResultLeversService },
        { provide: ResultKeywordsService, useValue: mockResultKeywordsService },
        { provide: ResultUsersService, useValue: mockResultUsersService },
        {
          provide: ResultCapacitySharingService,
          useValue: mockResultCapacitySharingService,
        },
        {
          provide: ResultPolicyChangeService,
          useValue: mockResultPolicyChangeService,
        },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: AlianceManagementApp, useValue: mockAlianceManagementApp },
        {
          provide: ResultCountriesService,
          useValue: mockResultCountriesService,
        },
        { provide: ResultRegionsService, useValue: mockResultRegionsService },
        {
          provide: ResultCountriesSubNationalsService,
          useValue: mockResultCountriesSubNationalsService,
        },
        {
          provide: ClarisaGeoScopeService,
          useValue: mockClarisaGeoScopeService,
        },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
        { provide: OpenSearchResultApi, useValue: mockOpenSearchResultApi },
        { provide: IndicatorsService, useValue: mockIndicatorsService },
        {
          provide: ClarisaSubNationalsService,
          useValue: mockClarisaSubNationalsService,
        },
        {
          provide: ResultCapSharingIpService,
          useValue: mockResultCapSharingIpService,
        },
        {
          provide: AllianceUserStaffService,
          useValue: mockAgressoUserStaffService,
        },
        { provide: ClarisaLeversService, useValue: mockClarisaLeversService },
        {
          provide: AgressoContractService,
          useValue: mockAgressoContractService,
        },
        {
          provide: ResultInnovationDevService,
          useValue: mockResultInnovationDevService,
        },
      ],
    }).compile();

    service = module.get<ResultsService>(ResultsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findResults', () => {
    it('should call mainRepo.findResultsFilters with correct parameters', async () => {
      // Arrange
      const filters = {
        limit: 10,
        page: 1,
        contracts: true,
        levers: false,
        indicators: true,
        result_status: false,
        result_audit_data: true,
        primary_contract: false,
        primary_lever: true,
        result_audit_data_objects: false,
        indicator_code: ['IND01'],
        sort_order: 'asc',
        contract_codes: ['CONTRACT123'],
        lever_codes: ['LEVER456'],
        status_codes: ['STATUS789'],
        user_codes: ['USER001'],
        years: ['2023', '2024'],
      };

      const expectedResult = [
        { result_id: 1, title: 'Test Result 1' },
        { result_id: 2, title: 'Test Result 2' },
      ];

      mockMainRepo.findResultsFilters.mockResolvedValue(expectedResult);

      // Act
      const result = await service.findResults(filters);

      // Assert
      expect(mockMainRepo.findResultsFilters).toHaveBeenCalledWith({
        limit: filters.limit,
        page: filters.page,
        contracts: filters.contracts,
        levers: filters.levers,
        indicators: filters.indicators,
        result_status: filters.result_status,
        result_audit_data: filters.result_audit_data,
        primary_contract: filters.primary_contract,
        primary_lever: filters.primary_lever,
        result_audit_data_objects: filters.result_audit_data_objects,
        indicator_code: filters.indicator_code,
        sort_order: filters.sort_order,
        contract_codes: filters.contract_codes,
        lever_codes: filters.lever_codes,
        status_codes: filters.status_codes,
        user_codes: filters.user_codes,
        years: filters.years,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty filters object', async () => {
      // Arrange
      const filters = {};
      const expectedResult = [];

      mockMainRepo.findResultsFilters.mockResolvedValue(expectedResult);

      // Act
      const result = await service.findResults(filters);

      // Assert
      expect(mockMainRepo.findResultsFilters).toHaveBeenCalledWith({
        limit: undefined,
        page: undefined,
        contracts: undefined,
        levers: undefined,
        indicators: undefined,
        result_status: undefined,
        result_audit_data: undefined,
        primary_contract: undefined,
        primary_lever: undefined,
        result_audit_data_objects: undefined,
        indicator_code: undefined,
        sort_order: undefined,
        contract_codes: undefined,
        lever_codes: undefined,
        status_codes: undefined,
        user_codes: undefined,
        years: undefined,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should handle partial filters object', async () => {
      // Arrange
      const filters = {
        limit: 5,
        contracts: true,
        indicator_code: ['TEST_IND'],
      };

      const expectedResult = [{ result_id: 1, title: 'Partial Filter Result' }];

      mockMainRepo.findResultsFilters.mockResolvedValue(expectedResult);

      // Act
      const result = await service.findResults(filters);

      // Assert
      expect(mockMainRepo.findResultsFilters).toHaveBeenCalledWith({
        limit: 5,
        page: undefined,
        contracts: true,
        levers: undefined,
        indicators: undefined,
        result_status: undefined,
        result_audit_data: undefined,
        primary_contract: undefined,
        primary_lever: undefined,
        result_audit_data_objects: undefined,
        indicator_code: ['TEST_IND'],
        sort_order: undefined,
        contract_codes: undefined,
        lever_codes: undefined,
        status_codes: undefined,
        user_codes: undefined,
        years: undefined,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const filters = { limit: 10 };
      const errorMessage = 'Database connection failed';

      mockMainRepo.findResultsFilters.mockRejectedValue(
        new Error(errorMessage),
      );

      // Act & Assert
      await expect(service.findResults(filters)).rejects.toThrow(errorMessage);
      expect(mockMainRepo.findResultsFilters).toHaveBeenCalledTimes(1);
    });

    it('should return the exact result from repository', async () => {
      // Arrange
      const filters = { page: 2, limit: 20 };
      const repositoryResult = {
        data: [
          { result_id: 1, title: 'Result 1', status: 'active' },
          { result_id: 2, title: 'Result 2', status: 'draft' },
        ],
        total: 50,
        currentPage: 2,
        totalPages: 3,
      };

      mockMainRepo.findResultsFilters.mockResolvedValue(repositoryResult);

      // Act
      const result = await service.findResults(filters);

      // Assert
      expect(result).toBe(repositoryResult);
      expect(result).toEqual(repositoryResult);
    });
  });

  describe('createResult', () => {
    let mockEntityManager: jest.Mocked<EntityManager>;
    let mockRepository: any;

    beforeEach(() => {
      // Setup repository mock
      mockRepository = {
        save: jest.fn(),
      };

      // Setup entity manager mock
      mockEntityManager = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;

      // Setup the transaction mock
      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockEntityManager);
      });

      // Setup service method mocks
      (service as any).newOfficialCode = jest.fn();
      (service as any).createResultType = jest.fn();
    });

    it('should throw BadRequestException when required fields are missing', async () => {
      // Arrange
      const invalidCreateResult: Partial<CreateResultDto> = {
        // Missing required fields: contract_id, indicator_id, title, year
        description: 'Test description',
      };

      // Act & Assert
      await expect(
        service.createResult(invalidCreateResult as CreateResultDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw custom error when result title already exists', async () => {
      // Arrange
      const createResult: CreateResultDto = {
        contract_id: 'CONTRACT123',
        indicator_id: 1,
        title: 'Existing Result Title',
        year: 2024,
        description: 'Test description',
        is_ai: false,
      };

      const existingResult = {
        result_id: 1,
        title: 'Existing Result Title',
        indicator: { name: 'Test Indicator' },
      } as any;

      // Mock the findOne to return an existing result, which should trigger the error
      mockMainRepo.findOne.mockResolvedValue(existingResult);

      // Act & Assert
      try {
        await service.createResult(createResult);
        fail('Expected an error to be thrown');
      } catch (error) {
        // Verify that the error has the expected structure from customErrorResponse
        expect(error).toBeDefined();
        expect(error.name).toContain('Please enter a unique title');
        expect(error.status).toBe(HttpStatus.CONFLICT);
      }
    });

    it('should successfully create a new result with all required data', async () => {
      // Arrange
      const createResult: CreateResultDto = {
        contract_id: 'CONTRACT123',
        indicator_id: 1,
        title: 'New Result Title',
        year: 2024,
        description: 'Test description',
        is_ai: false,
      };

      const newOfficialCode = 12345;
      const savedResult = {
        result_id: 10,
        title: createResult.title,
        description: createResult.description,
        indicator_id: createResult.indicator_id,
        result_official_code: newOfficialCode,
        report_year_id: createResult.year,
        is_ai: false,
        is_snapshot: false,
      };

      const agressoContract = {
        agreement_id: 'AGR123',
        departmentId: 'DEPT001',
        center_amount: 1000,
        center_amount_usd: 1000,
        grant_amount: 2000,
        grant_amount_usd: 2000,
      } as any;

      const clarisaLever = {
        id: 5,
        name: 'Test Lever',
        short_name: 'TL',
        result_levers: [],
      } as any;

      // Setup mocks
      mockMainRepo.findOne.mockResolvedValue(null); // No existing result
      (service as any).newOfficialCode.mockResolvedValue(newOfficialCode);
      mockRepository.save.mockResolvedValue(savedResult);
      (service as any).createResultType.mockResolvedValue(undefined);
      mockAgressoContractService.findOne.mockResolvedValue(agressoContract);
      mockClarisaLeversService.homologatedData.mockReturnValue(
        'Test Lever Name',
      );
      mockClarisaLeversService.findByName.mockResolvedValue(clarisaLever);
      mockResultLeversService.create.mockResolvedValue(undefined);
      mockResultContractsService.create.mockResolvedValue(undefined);
      mockCurrentUser.audit.mockReturnValue({
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 123,
        updated_by: 123,
      });
      mockAlianceManagementApp.linkUserToContract.mockResolvedValue(undefined);
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.createResult(createResult);

      // Assert
      expect(result).toEqual(savedResult);
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        where: { title: createResult.title, is_active: true },
        relations: { indicator: true },
      });
      expect((service as any).newOfficialCode).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith({
        description: createResult.description,
        indicator_id: createResult.indicator_id,
        title: createResult.title,
        is_ai: false,
        result_official_code: newOfficialCode,
        report_year_id: createResult.year,
        is_snapshot: false,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        created_by: 123,
        updated_by: 123,
      });
      expect((service as any).createResultType).toHaveBeenCalledWith(
        savedResult.result_id,
        savedResult.indicator_id,
        mockEntityManager,
      );
      expect(mockAgressoContractService.findOne).toHaveBeenCalledWith(
        createResult.contract_id,
      );
      expect(mockClarisaLeversService.homologatedData).toHaveBeenCalledWith(
        agressoContract.departmentId,
      );
      expect(mockClarisaLeversService.findByName).toHaveBeenCalledWith(
        'Test Lever Name',
      );
      expect(mockResultLeversService.create).toHaveBeenCalledWith(
        savedResult.result_id,
        { lever_id: String(clarisaLever.id), is_primary: true },
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        mockEntityManager,
        ['is_primary'],
      );
      expect(mockResultContractsService.create).toHaveBeenCalledWith(
        savedResult.result_id,
        { contract_id: createResult.contract_id, is_primary: true },
        'contract_id',
        ContractRolesEnum.ALIGNMENT,
        mockEntityManager,
        ['is_primary'],
      );
      expect(mockAlianceManagementApp.linkUserToContract).toHaveBeenCalledWith(
        mockCurrentUser.user_id,
        createResult.contract_id,
        SecRolesEnum.CONTRACT_CONTRIBUTOR,
      );
      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).toHaveBeenCalledWith(savedResult.result_id, ElasticOperationEnum.PATCH);
    });

    it('should handle is_ai flag correctly when not provided', async () => {
      // Arrange
      const createResult: CreateResultDto = {
        contract_id: 'CONTRACT123',
        indicator_id: 1,
        title: 'New Result Without AI Flag',
        year: 2024,
        description: 'Test description',
        // is_ai not provided
      };

      const savedResult = {
        result_id: 11,
        title: createResult.title,
        is_ai: false, // Should default to false
      };

      // Setup mocks
      mockMainRepo.findOne.mockResolvedValue(null);
      (service as any).newOfficialCode.mockResolvedValue(12346);
      mockRepository.save.mockResolvedValue(savedResult);
      (service as any).createResultType.mockResolvedValue(undefined);
      mockAgressoContractService.findOne.mockResolvedValue({
        agreement_id: 'AGR123',
        departmentId: 'DEPT001',
        center_amount: 1000,
        center_amount_usd: 1000,
        grant_amount: 2000,
        grant_amount_usd: 2000,
      } as any);
      mockClarisaLeversService.homologatedData.mockReturnValue('Test Lever');
      mockClarisaLeversService.findByName.mockResolvedValue({
        id: 5,
        name: 'Test Lever',
        short_name: 'TL',
        result_levers: [],
      } as any);
      mockCurrentUser.audit.mockReturnValue({});

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await service.createResult(createResult);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_ai: false, // Should default to false
        }),
      );
    });

    it('should handle case when clarisa lever is not found', async () => {
      // Arrange
      const createResult: CreateResultDto = {
        contract_id: 'CONTRACT123',
        indicator_id: 1,
        title: 'Result Without Lever',
        year: 2024,
        description: 'Test description',
        is_ai: true,
      };

      const savedResult = {
        result_id: 12,
        title: createResult.title,
      };

      // Setup mocks
      mockMainRepo.findOne.mockResolvedValue(null);
      (service as any).newOfficialCode.mockResolvedValue(12347);
      mockRepository.save.mockResolvedValue(savedResult);
      (service as any).createResultType.mockResolvedValue(undefined);
      mockAgressoContractService.findOne.mockResolvedValue({
        agreement_id: 'AGR123',
        departmentId: 'DEPT001',
        center_amount: 1000,
        center_amount_usd: 1000,
        grant_amount: 2000,
        grant_amount_usd: 2000,
      } as any);
      mockClarisaLeversService.homologatedData.mockReturnValue(
        'Non-existent Lever',
      );
      mockClarisaLeversService.findByName.mockResolvedValue(null); // Lever not found
      mockCurrentUser.audit.mockReturnValue({});

      // Act
      const result = await service.createResult(createResult);

      // Assert
      expect(result).toEqual(savedResult);
      expect(mockResultLeversService.create).not.toHaveBeenCalled(); // Should not create lever
      expect(mockResultContractsService.create).toHaveBeenCalled(); // Should still create contract
    });

    it('should propagate errors from transaction', async () => {
      // Arrange
      const createResult: CreateResultDto = {
        contract_id: 'CONTRACT123',
        indicator_id: 1,
        title: 'Error Result',
        year: 2024,
        description: 'Test description',
      };

      const errorMessage = 'Transaction failed';
      mockMainRepo.findOne.mockResolvedValue(null);
      (service as any).newOfficialCode.mockResolvedValue(12348);
      mockDataSource.transaction.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(service.createResult(createResult)).rejects.toThrow(
        errorMessage,
      );
    });

    describe('createResultType scenarios', () => {
      beforeEach(() => {
        // Don't mock createResultType for these tests
        (service as any).createResultType =
          service.constructor.prototype.createResultType.bind(service);
      });

      it('should create capacity sharing services for CAPACITY_SHARING_FOR_DEVELOPMENT indicator', async () => {
        // Arrange
        const createResult: CreateResultDto = {
          contract_id: 'CONTRACT123',
          indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          title: 'Capacity Sharing Result',
          year: 2024,
          description: 'Test description',
          is_ai: false,
        };

        const savedResult = {
          result_id: 13,
          indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        };

        // Setup mocks
        mockMainRepo.findOne.mockResolvedValue(null);
        (service as any).newOfficialCode.mockResolvedValue(12349);
        mockRepository.save.mockResolvedValue(savedResult);
        mockAgressoContractService.findOne.mockResolvedValue({
          agreement_id: 'AGR123',
          departmentId: 'DEPT001',
          center_amount: 1000,
          center_amount_usd: 1000,
          grant_amount: 2000,
          grant_amount_usd: 2000,
        } as any);
        mockClarisaLeversService.homologatedData.mockReturnValue('Test Lever');
        mockClarisaLeversService.findByName.mockResolvedValue(null);
        mockCurrentUser.audit.mockReturnValue({});

        // Act
        await service.createResult(createResult);

        // Assert
        expect(mockResultCapacitySharingService.create).toHaveBeenCalledWith(
          savedResult.result_id,
          mockEntityManager,
        );
        expect(mockResultCapSharingIpService.create).toHaveBeenCalledWith(
          savedResult.result_id,
          mockEntityManager,
        );
        expect(mockResultPolicyChangeService.create).not.toHaveBeenCalled();
        expect(mockResultInnovationDevService.create).not.toHaveBeenCalled();
      });

      it('should create policy change service for POLICY_CHANGE indicator', async () => {
        // Arrange
        const createResult: CreateResultDto = {
          contract_id: 'CONTRACT123',
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          title: 'Policy Change Result',
          year: 2024,
          description: 'Test description',
          is_ai: false,
        };

        const savedResult = {
          result_id: 14,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
        };

        // Setup mocks
        mockMainRepo.findOne.mockResolvedValue(null);
        (service as any).newOfficialCode.mockResolvedValue(12350);
        mockRepository.save.mockResolvedValue(savedResult);
        mockAgressoContractService.findOne.mockResolvedValue({
          agreement_id: 'AGR123',
          departmentId: 'DEPT001',
          center_amount: 1000,
          center_amount_usd: 1000,
          grant_amount: 2000,
          grant_amount_usd: 2000,
        } as any);
        mockClarisaLeversService.homologatedData.mockReturnValue('Test Lever');
        mockClarisaLeversService.findByName.mockResolvedValue(null);
        mockCurrentUser.audit.mockReturnValue({});

        // Act
        await service.createResult(createResult);

        // Assert
        expect(mockResultPolicyChangeService.create).toHaveBeenCalledWith(
          savedResult.result_id,
          mockEntityManager,
        );
        expect(mockResultCapacitySharingService.create).not.toHaveBeenCalled();
        expect(mockResultCapSharingIpService.create).not.toHaveBeenCalled();
        expect(mockResultInnovationDevService.create).not.toHaveBeenCalled();
      });

      it('should create innovation dev service for INNOVATION_DEV indicator', async () => {
        // Arrange
        const createResult: CreateResultDto = {
          contract_id: 'CONTRACT123',
          indicator_id: IndicatorsEnum.INNOVATION_DEV,
          title: 'Innovation Dev Result',
          year: 2024,
          description: 'Test description',
          is_ai: false,
        };

        const savedResult = {
          result_id: 15,
          indicator_id: IndicatorsEnum.INNOVATION_DEV,
        };

        // Setup mocks
        mockMainRepo.findOne.mockResolvedValue(null);
        (service as any).newOfficialCode.mockResolvedValue(12351);
        mockRepository.save.mockResolvedValue(savedResult);
        mockAgressoContractService.findOne.mockResolvedValue({
          agreement_id: 'AGR123',
          departmentId: 'DEPT001',
          center_amount: 1000,
          center_amount_usd: 1000,
          grant_amount: 2000,
          grant_amount_usd: 2000,
        } as any);
        mockClarisaLeversService.homologatedData.mockReturnValue('Test Lever');
        mockClarisaLeversService.findByName.mockResolvedValue(null);
        mockCurrentUser.audit.mockReturnValue({});

        // Act
        await service.createResult(createResult);

        // Assert
        expect(mockResultInnovationDevService.create).toHaveBeenCalledWith(
          savedResult.result_id,
          mockEntityManager,
        );
        expect(mockResultCapacitySharingService.create).not.toHaveBeenCalled();
        expect(mockResultCapSharingIpService.create).not.toHaveBeenCalled();
        expect(mockResultPolicyChangeService.create).not.toHaveBeenCalled();
      });

      it('should not call any specialized service for other indicators', async () => {
        // Arrange
        const createResult: CreateResultDto = {
          contract_id: 'CONTRACT123',
          indicator_id: 999 as any, // Unknown indicator
          title: 'Other Indicator Result',
          year: 2024,
          description: 'Test description',
          is_ai: false,
        };

        const savedResult = {
          result_id: 16,
          indicator_id: 999,
        };

        // Setup mocks
        mockMainRepo.findOne.mockResolvedValue(null);
        (service as any).newOfficialCode.mockResolvedValue(12352);
        mockRepository.save.mockResolvedValue(savedResult);
        mockAgressoContractService.findOne.mockResolvedValue({
          agreement_id: 'AGR123',
          departmentId: 'DEPT001',
          center_amount: 1000,
          center_amount_usd: 1000,
          grant_amount: 2000,
          grant_amount_usd: 2000,
        } as any);
        mockClarisaLeversService.homologatedData.mockReturnValue('Test Lever');
        mockClarisaLeversService.findByName.mockResolvedValue(null);
        mockCurrentUser.audit.mockReturnValue({});

        // Act
        await service.createResult(createResult);

        // Assert
        expect(mockResultCapacitySharingService.create).not.toHaveBeenCalled();
        expect(mockResultCapSharingIpService.create).not.toHaveBeenCalled();
        expect(mockResultPolicyChangeService.create).not.toHaveBeenCalled();
        expect(mockResultInnovationDevService.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('deleteResult', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw NotFoundException when result is not found', async () => {
      // Arrange
      const resultId = 999;
      mockMainRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteResult(resultId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        select: {
          result_id: true,
          result_status_id: true,
          created_by: true,
        },
        where: { result_id: resultId },
      });
      expect(mockMainRepo.deleteResult).not.toHaveBeenCalled();
      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when result status is not DRAFT', async () => {
      // Arrange
      const resultId = 1;
      const foundResult = {
        result_id: resultId,
        result_status_id: ResultStatusEnum.SUBMITTED, // Not DRAFT
        created_by: 123,
      } as any;

      mockMainRepo.findOne.mockResolvedValue(foundResult);

      // Act & Assert
      await expect(service.deleteResult(resultId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.deleteResult(resultId)).rejects.toThrow(
        'Only results in editing status can be deleted',
      );

      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        select: {
          result_id: true,
          result_status_id: true,
          created_by: true,
        },
        where: { result_id: resultId },
      });
      expect(mockMainRepo.deleteResult).not.toHaveBeenCalled();
      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).not.toHaveBeenCalled();
    });

    it('should successfully delete result when status is DRAFT', async () => {
      // Arrange
      const resultId = 1;
      const foundResult = {
        result_id: resultId,
        result_status_id: ResultStatusEnum.DRAFT,
        created_by: 123,
      } as any;

      mockMainRepo.findOne.mockResolvedValue(foundResult);
      mockMainRepo.deleteResult.mockResolvedValue(undefined);
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.deleteResult(resultId);

      // Assert
      expect(result).toBe(foundResult);
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        select: {
          result_id: true,
          result_status_id: true,
          created_by: true,
        },
        where: { result_id: resultId },
      });
      expect(mockMainRepo.deleteResult).toHaveBeenCalledWith(
        foundResult.result_id,
      );
      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).toHaveBeenCalledWith(
        { result_id: foundResult.result_id },
        ElasticOperationEnum.DELETE,
      );
    });

    it('should propagate error when repository deleteResult fails', async () => {
      // Arrange
      const resultId = 1;
      const foundResult = {
        result_id: resultId,
        result_status_id: ResultStatusEnum.DRAFT,
        created_by: 123,
      } as any;

      const deleteError = new Error('Database delete failed');
      mockMainRepo.findOne.mockResolvedValue(foundResult);
      mockMainRepo.deleteResult.mockRejectedValue(deleteError);

      // Act & Assert
      await expect(service.deleteResult(resultId)).rejects.toThrow(
        'Database delete failed',
      );
      expect(mockMainRepo.findOne).toHaveBeenCalled();
      expect(mockMainRepo.deleteResult).toHaveBeenCalledWith(
        foundResult.result_id,
      );
      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).not.toHaveBeenCalled();
    });

    it('should propagate error when OpenSearch upload fails', async () => {
      // Arrange
      const resultId = 1;
      const foundResult = {
        result_id: resultId,
        result_status_id: ResultStatusEnum.DRAFT,
        created_by: 123,
      } as any;

      mockMainRepo.findOne.mockResolvedValue(foundResult);
      mockMainRepo.deleteResult.mockResolvedValue(undefined);

      // Mock OpenSearch to fail
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockImplementation(
        () => {
          throw new Error('OpenSearch upload failed');
        },
      );

      // Act & Assert
      await expect(service.deleteResult(resultId)).rejects.toThrow(
        'OpenSearch upload failed',
      );
      expect(mockMainRepo.findOne).toHaveBeenCalled();
      expect(mockMainRepo.deleteResult).toHaveBeenCalledWith(
        foundResult.result_id,
      );
      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).toHaveBeenCalledWith(
        { result_id: foundResult.result_id },
        ElasticOperationEnum.DELETE,
      );
    });

    it('should test different non-DRAFT status values', async () => {
      // Arrange
      const resultId = 1;
      const testCases = [
        ResultStatusEnum.SUBMITTED,
        ResultStatusEnum.APPROVED,
        ResultStatusEnum.REJECTED,
        ResultStatusEnum.REVISED,
        // Add other status values if they exist
      ];

      for (const status of testCases) {
        const foundResult = {
          result_id: resultId,
          result_status_id: status,
          created_by: 123,
        } as any;

        mockMainRepo.findOne.mockResolvedValue(foundResult);

        // Act & Assert
        await expect(service.deleteResult(resultId)).rejects.toThrow(
          ConflictException,
        );

        // Clear mocks for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('updateGeneralInfo', () => {
    let mockEntityManager: jest.Mocked<EntityManager>;
    let mockRepository: any;

    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();

      // Setup repository mock
      mockRepository = {
        findOne: jest.fn(),
        update: jest.fn(),
      };

      // Setup entity manager mock
      mockEntityManager = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;

      // Setup the transaction mock
      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockEntityManager);
      });
    });

    it('should update general info successfully without returning data', async () => {
      // Arrange
      const resultId = 1;
      const updateGeneralInfoDto = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1', 'keyword2'],
        main_contact_person: { user_id: 1 } as any,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockResolvedValue(undefined);

      const mockKeywords = [
        { result_keyword_id: 1, result_id: resultId, keyword: 'keyword1' },
        { result_keyword_id: 2, result_id: resultId, keyword: 'keyword2' },
      ];
      mockResultKeywordsService.transformData.mockReturnValue([
        { keyword: 'keyword1' },
        { keyword: 'keyword2' },
      ] as any);
      mockResultKeywordsService.create.mockResolvedValue(mockKeywords as any);
      mockResultUsersService.create.mockResolvedValue(undefined);
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.updateGeneralInfo(
        resultId,
        updateGeneralInfoDto,
      );

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          result_id: Not(resultId),
          title: updateGeneralInfoDto.title,
          is_active: true,
          is_snapshot: false,
        },
      });

      expect(mockRepository.update).toHaveBeenCalledWith(resultId, {
        title: updateGeneralInfoDto.title,
        description: updateGeneralInfoDto.description,
        report_year_id: updateGeneralInfoDto.year,
        ...mockCurrentUser.audit(SetAutitEnum.UPDATE),
      });

      expect(mockResultKeywordsService.transformData).toHaveBeenCalledWith(
        updateGeneralInfoDto.keywords,
      );
      expect(mockResultKeywordsService.create).toHaveBeenCalledWith(
        resultId,
        [{ keyword: 'keyword1' }, { keyword: 'keyword2' }],
        'keyword',
        null,
        mockEntityManager,
      );

      expect(mockResultUsersService.create).toHaveBeenCalledWith(
        resultId,
        updateGeneralInfoDto.main_contact_person,
        'user_id',
        UserRolesEnum.MAIN_CONTACT,
        mockEntityManager,
      );

      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).toHaveBeenCalledWith(
        {
          result_id: resultId,
          title: updateGeneralInfoDto.title,
          description: updateGeneralInfoDto.description,
          keywords: ['keyword1', 'keyword2'],
        },
        ElasticOperationEnum.PUT,
      );

      expect(result).toBeUndefined();
    });

    it('should update general info successfully and return data when returnData is TRUE', async () => {
      // Arrange
      const resultId = 1;
      const updateGeneralInfoDto = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1', 'keyword2'],
        main_contact_person: { user_id: 1 } as any,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockResolvedValue(undefined);

      const mockKeywords = [
        { result_keyword_id: 1, result_id: resultId, keyword: 'keyword1' },
        { result_keyword_id: 2, result_id: resultId, keyword: 'keyword2' },
      ];
      const mockGeneralInfo = {
        title: updateGeneralInfoDto.title,
        description: updateGeneralInfoDto.description,
        year: updateGeneralInfoDto.year,
        keywords: mockKeywords,
        main_contact_person: updateGeneralInfoDto.main_contact_person,
      };

      mockResultKeywordsService.transformData.mockReturnValue([
        { keyword: 'keyword1' },
        { keyword: 'keyword2' },
      ] as any);
      mockResultKeywordsService.create.mockResolvedValue(mockKeywords as any);
      mockResultUsersService.create.mockResolvedValue(undefined);
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockResolvedValue(
        undefined,
      );

      // Mock findGeneralInfo
      jest
        .spyOn(service, 'findGeneralInfo')
        .mockResolvedValue(mockGeneralInfo as any);

      // Act
      const result = await service.updateGeneralInfo(
        resultId,
        updateGeneralInfoDto,
        TrueFalseEnum.TRUE,
      );

      // Assert
      expect(service.findGeneralInfo).toHaveBeenCalledWith(resultId);
      expect(result).toEqual(mockGeneralInfo);
    });

    it('should throw ConflictException when title already exists', async () => {
      // Arrange
      const resultId = 1;
      const updateGeneralInfoDto = {
        title: 'Existing Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1', 'keyword2'],
        main_contact_person: { user_id: 1 } as any,
      };
      const existingResult = {
        result_id: 2,
        title: updateGeneralInfoDto.title,
      };
      mockRepository.findOne.mockResolvedValue(existingResult);

      // Act & Assert
      await expect(
        service.updateGeneralInfo(resultId, updateGeneralInfoDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.updateGeneralInfo(resultId, updateGeneralInfoDto),
      ).rejects.toThrow('The name of the result is already registered');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          result_id: Not(resultId),
          title: updateGeneralInfoDto.title,
          is_active: true,
          is_snapshot: false,
        },
      });
    });

    it('should handle error when repository update fails', async () => {
      // Arrange
      const resultId = 1;
      const updateGeneralInfoDto = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1'],
        main_contact_person: { user_id: 1 } as any,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        service.updateGeneralInfo(resultId, updateGeneralInfoDto),
      ).rejects.toThrow('Database error');

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should handle error when keywords service fails', async () => {
      // Arrange
      const resultId = 1;
      const updateGeneralInfoDto = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1'],
        main_contact_person: { user_id: 1 } as any,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockResolvedValue(undefined);

      mockResultKeywordsService.transformData.mockReturnValue([
        { keyword: 'keyword1' },
      ] as any);
      mockResultKeywordsService.create.mockRejectedValue(
        new Error('Keywords service error'),
      );

      // Act & Assert
      await expect(
        service.updateGeneralInfo(resultId, updateGeneralInfoDto),
      ).rejects.toThrow('Keywords service error');

      expect(mockResultKeywordsService.create).toHaveBeenCalled();
    });

    it('should handle error when users service fails', async () => {
      // Arrange
      const resultId = 1;
      const updateGeneralInfoDto = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1'],
        main_contact_person: { user_id: 1 } as any,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockResolvedValue(undefined);

      const mockKeywords = [
        { result_keyword_id: 1, result_id: resultId, keyword: 'keyword1' },
      ];
      mockResultKeywordsService.transformData.mockReturnValue([
        { keyword: 'keyword1' },
      ] as any);
      mockResultKeywordsService.create.mockResolvedValue(mockKeywords as any);
      mockResultUsersService.create.mockRejectedValue(
        new Error('Users service error'),
      );

      // Act & Assert
      await expect(
        service.updateGeneralInfo(resultId, updateGeneralInfoDto),
      ).rejects.toThrow('Users service error');

      expect(mockResultUsersService.create).toHaveBeenCalled();
    });

    it('should handle error when OpenSearch fails', async () => {
      // Arrange
      const resultId = 1;
      const updateGeneralInfoDto = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1'],
        main_contact_person: { user_id: 1 } as any,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockResolvedValue(undefined);

      const mockKeywords = [
        { result_keyword_id: 1, result_id: resultId, keyword: 'keyword1' },
      ];
      mockResultKeywordsService.transformData.mockReturnValue([
        { keyword: 'keyword1' },
      ] as any);
      mockResultKeywordsService.create.mockResolvedValue(mockKeywords as any);
      mockResultUsersService.create.mockResolvedValue(undefined);

      // Mock OpenSearch to fail
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockImplementation(
        () => {
          throw new Error('OpenSearch error');
        },
      );

      // Act & Assert
      await expect(
        service.updateGeneralInfo(resultId, updateGeneralInfoDto),
      ).rejects.toThrow('OpenSearch error');

      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).toHaveBeenCalled();
    });

    it('should handle transaction rollback on any error', async () => {
      // Arrange
      const resultId = 1;
      const updateGeneralInfoDto = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1'],
        main_contact_person: { user_id: 1 } as any,
      };

      const transactionError = new Error('Transaction failed');
      mockDataSource.transaction.mockRejectedValue(transactionError);

      // Act & Assert
      await expect(
        service.updateGeneralInfo(resultId, updateGeneralInfoDto),
      ).rejects.toThrow('Transaction failed');

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should work with empty keywords array', async () => {
      // Arrange
      const resultId = 1;
      const updateDtoEmptyKeywords = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: [],
        main_contact_person: { user_id: 1 } as any,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockResolvedValue(undefined);

      const mockKeywords: any[] = [];
      mockResultKeywordsService.transformData.mockReturnValue([]);
      mockResultKeywordsService.create.mockResolvedValue(mockKeywords);
      mockResultUsersService.create.mockResolvedValue(undefined);
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.updateGeneralInfo(
        resultId,
        updateDtoEmptyKeywords,
      );

      // Assert
      expect(mockResultKeywordsService.transformData).toHaveBeenCalledWith([]);
      expect(
        mockOpenSearchResultApi.uploadSingleToOpenSearch,
      ).toHaveBeenCalledWith(
        {
          result_id: resultId,
          title: updateDtoEmptyKeywords.title,
          description: updateDtoEmptyKeywords.description,
          keywords: [],
        },
        ElasticOperationEnum.PUT,
      );
      expect(result).toBeUndefined();
    });

    it('should work with undefined keywords', async () => {
      // Arrange
      const resultId = 1;
      const updateDtoUndefinedKeywords = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: undefined,
        main_contact_person: { user_id: 1 } as any,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockResolvedValue(undefined);

      const mockKeywords: any[] = [];
      mockResultKeywordsService.transformData.mockReturnValue([]);
      mockResultKeywordsService.create.mockResolvedValue(mockKeywords);
      mockResultUsersService.create.mockResolvedValue(undefined);
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.updateGeneralInfo(
        resultId,
        updateDtoUndefinedKeywords,
      );

      // Assert
      expect(mockResultKeywordsService.transformData).toHaveBeenCalledWith(
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it('should work with undefined main_contact_person', async () => {
      // Arrange
      const resultId = 1;
      const updateDtoUndefinedContact = {
        title: 'Updated Result Title',
        description: 'Updated description',
        year: 2024,
        keywords: ['keyword1'],
        main_contact_person: undefined,
      };

      mockRepository.findOne.mockResolvedValue(null); // No conflict
      mockRepository.update.mockResolvedValue(undefined);

      const mockKeywords = [
        { result_keyword_id: 1, result_id: resultId, keyword: 'keyword1' },
      ];
      mockResultKeywordsService.transformData.mockReturnValue([
        { keyword: 'keyword1' },
      ] as any);
      mockResultKeywordsService.create.mockResolvedValue(mockKeywords as any);
      mockResultUsersService.create.mockResolvedValue(undefined);
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.updateGeneralInfo(
        resultId,
        updateDtoUndefinedContact,
      );

      // Assert
      expect(mockResultUsersService.create).toHaveBeenCalledWith(
        resultId,
        undefined,
        'user_id',
        UserRolesEnum.MAIN_CONTACT,
        mockEntityManager,
      );
      expect(result).toBeUndefined();
    });
  });
});
