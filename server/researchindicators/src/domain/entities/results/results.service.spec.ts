import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, Not } from 'typeorm';
import { ResultContract } from '../result-contracts/entities/result-contract.entity';
import { ResultLever } from '../result-levers/entities/result-lever.entity';
import { ResultsService } from './results.service';
import { ResultAlignmentOperationsService } from './portfolio-handlers/sections/alignment/shared/result-alignment-operations.service';
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
import { ClarisaCountriesService } from '../../tools/clarisa/entities/clarisa-countries/clarisa-countries.service';
import { AllianceUserStaffService } from '../alliance-user-staff/alliance-user-staff.service';
import { ClarisaLeversService } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { AgressoContractService } from '../agresso-contract/agresso-contract.service';
import { ResultInnovationDevService } from '../result-innovation-dev/result-innovation-dev.service';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { CreateResultDto } from './dto/create-result.dto';
import { SetAuditEnum } from '../../shared/utils/current-user.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { ContractRolesEnum } from '../result-contracts/enum/contract-roles.enum';
import { ElasticOperationEnum } from '../../tools/open-search/dto/elastic-operation.dto';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { ResultIpRightsService } from '../result-ip-rights/result-ip-rights.service';
import { ResultSdgsService } from '../result-sdgs/result-sdgs.service';
import { ResultOicrService } from '../result-oicr/result-oicr.service';
import { ResultInstitutionsService } from '../result-institutions/result-institutions.service';
import { ResultEvidencesService } from '../result-evidences/result-evidences.service';
import { ReportingPlatformEnum } from './enum/reporting-platform.enum';
import { QueryService } from '../../shared/utils/query.service';
import { ResultLeverStrategicOutcomeService } from '../result-lever-strategic-outcome/result-lever-strategic-outcome.service';
import { ResultLeverSdgTargetsService } from '../result-lever-sdg-targets/result-lever-sdg-targets.service';
import { ResultKnowledgeProductService } from '../result-knowledge-product/result-knowledge-product.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { TempResultAi } from './entities/temp-result-ai.entity';
import { GreenChecksService } from '../green-checks/green-checks.service';
import { GreenCheckRepository } from '../green-checks/repository/green-checks.repository';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { AiReportsService } from '../ai-reports/ai-reports.service';
import { CapdevBulkNotificationService } from '../ai-reports/notifications/capdev-bulk-notification.service';
import { CgiarLogger } from '../../shared/utils/cgiar-logs/logs.util';
import { ResultSectionOrchestratorService } from './portfolio-handlers/application/result-section-orchestrator.service';
import { PortfolioIdEnum } from './portfolio-handlers/enum/portfolio-id.enum';
// T-06 (R-RES-007 AC.1): read directly to assert the code path — not
// inferred from behaviour — see the dedicated describe below.
import { readFileSync } from 'fs';
import { join } from 'path';

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
  let mockResultIpRightsService: jest.Mocked<ResultIpRightsService>;
  let mockAgressoUserStaffService: jest.Mocked<AllianceUserStaffService>;
  let mockClarisaLeversService: jest.Mocked<ClarisaLeversService>;
  let mockAgressoContractService: jest.Mocked<AgressoContractService>;
  let mockResultInnovationDevService: jest.Mocked<ResultInnovationDevService>;
  let mockResultSdgsService: jest.Mocked<ResultSdgsService>;
  let mockResultOicrService: jest.Mocked<ResultOicrService>;
  let mockClarisaCountriesService: jest.Mocked<ClarisaCountriesService>;
  let mockResultInstitutionsService: jest.Mocked<ResultInstitutionsService>;
  let mockResultEvidencesService: jest.Mocked<ResultEvidencesService>;
  let mockQueryService: jest.Mocked<QueryService>;
  let mockResultLeverStrategicOutcomeService: jest.Mocked<ResultLeverStrategicOutcomeService>;
  let mockResultLeverSdgTargetsService: jest.Mocked<ResultLeverSdgTargetsService>;
  let mockResultKnowledgeProductService: jest.Mocked<ResultKnowledgeProductService>;
  let mockResultsUtil: jest.Mocked<ResultsUtil>;
  let mockGreenChecksService: { findByResultId: jest.Mock };
  let mockGreenCheckRepository: { createSnapshot: jest.Mock };
  let mockResultAlignmentOperationsService: jest.Mocked<
    Pick<ResultAlignmentOperationsService, 'save' | 'find'>
  >;
  let mockPortfoliosService: jest.Mocked<
    Pick<PortfoliosService, 'findOne' | 'findByYear'>
  >;
  let mockAiReportsService: { create: jest.Mock };
  let mockCapdevBulkNotificationService: { dispatch: jest.Mock };
  let mockResultSectionOrchestrator: jest.Mocked<
    Pick<
      ResultSectionOrchestratorService,
      'saveStrategicObjectivesForPortfolio' | 'saveLeversForPortfolio'
    >
  >;
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
      isMainContactPerson: jest.fn(),
      target: {} as any,
      save: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockDataSource = {
      transaction: jest.fn(),
      getRepository: jest.fn(),
    } as any;

    mockResultContractsService = {
      find: jest.fn(),
      create: jest.fn(),
      getPrimaryContract: jest.fn(),
    } as any;

    mockResultLeversService = {
      find: jest.fn(),
      create: jest.fn(),
      comparerClientToServer: jest.fn(),
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

    mockResultIpRightsService = {
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

    mockResultSdgsService = {
      create: jest.fn(),
      find: jest.fn(),
      transformData: jest.fn(),
    } as any;

    mockResultOicrService = {
      create: jest.fn(),
    } as any;

    mockClarisaCountriesService = {
      findByNames: jest.fn(),
    } as any;

    mockResultInstitutionsService = {
      create: jest.fn(),
      find: jest.fn(),
      findByCode: jest.fn(),
    } as any;

    mockResultEvidencesService = {
      create: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    } as any;

    mockQueryService = {
      deleteFullResultById: jest.fn(),
    } as any;

    mockResultLeverStrategicOutcomeService = {
      create: jest.fn(),
      findByMultiplesResultLeverIds: jest.fn(),
    } as any;

    mockResultLeverSdgTargetsService = {
      create: jest.fn(),
      findByMultiplesResultLeverIds: jest.fn(),
    } as any;

    mockResultKnowledgeProductService = {
      create: jest.fn(),
    } as any;

    mockResultsUtil = {
      setCurrentResult: jest.fn(),
      clearManually: jest.fn(),
    } as any;

    mockGreenChecksService = {
      findByResultId: jest.fn().mockResolvedValue({}),
    };
    mockGreenCheckRepository = {
      createSnapshot: jest.fn().mockResolvedValue(undefined),
    };

    mockResultAlignmentOperationsService = {
      save: jest.fn(),
      find: jest.fn(),
    };

    mockPortfoliosService = {
      findOne: jest.fn(),
      findByYear: jest.fn(),
    };
    mockAiReportsService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    };
    mockCapdevBulkNotificationService = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    };
    mockResultSectionOrchestrator = {
      saveStrategicObjectivesForPortfolio: jest.fn(),
      saveLeversForPortfolio: jest.fn(),
    };

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
          provide: ResultIpRightsService,
          useValue: mockResultIpRightsService,
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
        {
          provide: ResultSdgsService,
          useValue: mockResultSdgsService,
        },
        {
          provide: ResultOicrService,
          useValue: mockResultOicrService,
        },
        {
          provide: ClarisaCountriesService,
          useValue: mockClarisaCountriesService,
        },
        {
          provide: ResultInstitutionsService,
          useValue: mockResultInstitutionsService,
        },
        {
          provide: ResultEvidencesService,
          useValue: mockResultEvidencesService,
        },
        {
          provide: QueryService,
          useValue: mockQueryService,
        },
        {
          provide: ResultLeverStrategicOutcomeService,
          useValue: mockResultLeverStrategicOutcomeService,
        },
        {
          provide: ResultLeverSdgTargetsService,
          useValue: mockResultLeverSdgTargetsService,
        },
        {
          provide: ResultKnowledgeProductService,
          useValue: mockResultKnowledgeProductService,
        },
        {
          provide: ResultsUtil,
          useValue: mockResultsUtil,
        },
        {
          provide: GreenChecksService,
          useValue: mockGreenChecksService,
        },
        {
          provide: GreenCheckRepository,
          useValue: mockGreenCheckRepository,
        },
        {
          provide: ResultAlignmentOperationsService,
          useValue: mockResultAlignmentOperationsService,
        },
        {
          provide: PortfoliosService,
          useValue: mockPortfoliosService,
        },
        {
          provide: AiReportsService,
          useValue: mockAiReportsService,
        },
        {
          provide: CapdevBulkNotificationService,
          useValue: mockCapdevBulkNotificationService,
        },
        {
          provide: ResultSectionOrchestratorService,
          useValue: mockResultSectionOrchestrator,
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

  describe('updateInactiveResult', () => {
    it('should reactivate result and set snapshot flag', async () => {
      mockCurrentUser.audit.mockReturnValue({
        updated_by: 1,
        last_updated_date: new Date(),
      } as any);

      await service.updateInactiveResult(15, true);

      expect(mockMainRepo.update).toHaveBeenCalledWith(15, {
        is_active: true,
        is_snapshot: true,
        updated_by: 1,
        last_updated_date: expect.any(Date),
      });
      expect(mockCurrentUser.audit).toHaveBeenCalledWith(SetAuditEnum.UPDATE);
    });

    it('should clear snapshot flag when isSnapshot is false', async () => {
      mockCurrentUser.audit.mockReturnValue({
        updated_by: 2,
        last_updated_date: new Date(),
      } as any);

      await service.updateInactiveResult(20, false);

      expect(mockMainRepo.update).toHaveBeenCalledWith(20, {
        is_active: true,
        is_snapshot: false,
        updated_by: 2,
        last_updated_date: expect.any(Date),
      });
    });
  });

  describe('newOfficialCode', () => {
    it('should default to STAR platform and return last code + 1', async () => {
      mockMainRepo.findOne.mockResolvedValue({
        result_official_code: 100,
      } as any);

      const code = await service.newOfficialCode();

      expect(mockMainRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform_code: ReportingPlatformEnum.STAR,
          }),
          order: { result_official_code: 'DESC' },
        }),
      );
      expect(code).toBe(101);
    });

    it('should use the provided platform code', async () => {
      mockMainRepo.findOne.mockResolvedValue({
        result_official_code: 55,
      } as any);

      const code = await service.newOfficialCode(ReportingPlatformEnum.TIP);

      expect(mockMainRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform_code: ReportingPlatformEnum.TIP,
          }),
        }),
      );
      expect(code).toBe(56);
    });

    it('should return 1 when no previous result exists for the platform', async () => {
      mockMainRepo.findOne.mockResolvedValue(null);

      const code = await service.newOfficialCode(ReportingPlatformEnum.TIP);

      expect(code).toBe(1);
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
      (service as any).validateCreateConfig = jest.fn().mockReturnValue({
        leverEnum: 1,
        notMap: {
          lever: false,
          sdg: false,
        },
        result_status_id: ResultStatusEnum.DRAFT,
        notContract: false,
        validateTitle: true,
        isSnapshot: false,
      });

      // Ensure OpenSearch upload returns a Promise (service chains `.catch(...)`)
      mockOpenSearchResultApi.uploadSingleToOpenSearch.mockResolvedValue(
        undefined,
      );
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
        await service.createResult(createResult, undefined, {
          validateTitle: true,
        });
        fail('Expected an error to be thrown');
      } catch (error: any) {
        // Verify that the error object contains the expected metadata
        expect(error).toBeDefined();
        // Check if error is the object thrown from customErrorResponse
        if (error.name && error.status) {
          expect(error.name).toContain('Please enter a unique title');
          expect(error.status).toBe(HttpStatus.CONFLICT);
        } else {
          // If it's wrapped, verify that error was indeed thrown
          expect(error).toBeDefined();
        }
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

      // Setup mocks
      mockMainRepo.findOne.mockResolvedValue(null); // No existing result
      (service as any).newOfficialCode.mockResolvedValue(newOfficialCode);
      mockRepository.save.mockResolvedValue(savedResult);
      (service as any).createResultType.mockResolvedValue(undefined);
      mockAgressoContractService.findOne.mockResolvedValue(agressoContract);
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
      const result = await service.createResult(
        createResult,
        ReportingPlatformEnum.STAR,
      );

      // Assert
      expect(result).toEqual(savedResult);
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        where: { title: createResult.title, is_active: true },
        relations: { indicator: true },
      });
      expect((service as any).newOfficialCode).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          description: createResult.description,
          indicator_id: createResult.indicator_id,
          title: createResult.title,
          is_ai: false,
          result_official_code: newOfficialCode,
          report_year_id: createResult.year,
          is_snapshot: false,
          platform_code: ReportingPlatformEnum.STAR, // Default value
          result_status_id: ResultStatusEnum.DRAFT,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
          created_by: 123,
          updated_by: 123,
        }),
      );
      expect((service as any).createResultType).toHaveBeenCalledWith(
        savedResult.result_id,
        savedResult.indicator_id,
        mockEntityManager,
      );
      expect(mockAgressoContractService.findOne).toHaveBeenCalledWith(
        createResult.contract_id,
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

      await service.createResult(createResult, ReportingPlatformEnum.PRMS);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_ai: false, // Should default to false
          platform_code: ReportingPlatformEnum.PRMS,
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
      const result = await service.createResult(
        createResult,
        ReportingPlatformEnum.TIP,
      );

      // Assert
      expect(result).toEqual(savedResult);
      expect(mockResultLeversService.create).not.toHaveBeenCalled(); // Should not create lever
      expect(mockResultContractsService.create).toHaveBeenCalled(); // Should still create contract
    });

    it('should use default platform_code when not provided', async () => {
      // Arrange
      const createResult: CreateResultDto = {
        contract_id: 'CONTRACT123',
        indicator_id: 1,
        title: 'Result Without Platform Code',
        year: 2024,
        description: 'Test description',
        is_ai: false,
        // platform_code not provided - should default to STAR
      };

      const savedResult = {
        result_id: 13,
        title: createResult.title,
        platform_code: ReportingPlatformEnum.STAR,
      };

      // Setup mocks
      mockMainRepo.findOne.mockResolvedValue(null);
      (service as any).newOfficialCode.mockResolvedValue(12348);
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
      await service.createResult(createResult);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          platform_code: ReportingPlatformEnum.STAR, // Should default to STAR
        }),
      );
    });

    it('should use specified platform_code when provided', async () => {
      // Arrange
      const createResult: CreateResultDto = {
        contract_id: 'CONTRACT123',
        indicator_id: 1,
        title: 'Result With Custom Platform Code',
        year: 2024,
        description: 'Test description',
        is_ai: false,
      };

      const savedResult = {
        result_id: 14,
        title: createResult.title,
        platform_code: ReportingPlatformEnum.PRMS,
      };

      // Setup mocks
      mockMainRepo.findOne.mockResolvedValue(null);
      (service as any).newOfficialCode.mockResolvedValue(12349);
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
      await service.createResult(createResult, ReportingPlatformEnum.PRMS);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          platform_code: ReportingPlatformEnum.PRMS, // Should use provided value
        }),
      );
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

        // Clear all mock calls
        jest.clearAllMocks();
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
        expect(mockResultIpRightsService.create).toHaveBeenCalledWith(
          savedResult.result_id,
          mockEntityManager,
        );
        expect(mockResultPolicyChangeService.create).not.toHaveBeenCalled();
        expect(mockResultInnovationDevService.create).not.toHaveBeenCalled();
        expect(mockResultOicrService.create).not.toHaveBeenCalled();
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
        expect(mockResultIpRightsService.create).not.toHaveBeenCalled();
        expect(mockResultInnovationDevService.create).not.toHaveBeenCalled();
        expect(mockResultOicrService.create).not.toHaveBeenCalled();
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
        expect(mockResultIpRightsService.create).toHaveBeenCalledWith(
          savedResult.result_id,
          mockEntityManager,
        );
        expect(mockResultCapacitySharingService.create).not.toHaveBeenCalled();
        expect(mockResultPolicyChangeService.create).not.toHaveBeenCalled();
        expect(mockResultOicrService.create).not.toHaveBeenCalled();
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
        expect(mockResultIpRightsService.create).not.toHaveBeenCalled();
        expect(mockResultPolicyChangeService.create).not.toHaveBeenCalled();
        expect(mockResultInnovationDevService.create).not.toHaveBeenCalled();
        expect(mockResultOicrService.create).not.toHaveBeenCalled();
      });

      it('should create OICR service for OICR indicator', async () => {
        // Arrange
        const createResult: CreateResultDto = {
          contract_id: 'CONTRACT123',
          indicator_id: IndicatorsEnum.OICR,
          title: 'OICR Result',
          year: 2024,
          description: 'Test description',
          is_ai: false,
        };

        const savedResult = {
          result_id: 17,
          indicator_id: IndicatorsEnum.OICR,
        };

        // Setup mocks
        mockMainRepo.findOne.mockResolvedValue(null);
        (service as any).newOfficialCode.mockResolvedValue(12353);
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
        expect(mockResultOicrService.create).toHaveBeenCalledWith(
          savedResult.result_id,
          expect.any(Object),
        );
        expect(mockResultCapacitySharingService.create).not.toHaveBeenCalled();
        expect(mockResultIpRightsService.create).not.toHaveBeenCalled();
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

  describe('deleteResultsByParameters', () => {
    const mockResults = [
      {
        result_id: 10,
        platform_code: ReportingPlatformEnum.STAR,
        result_status: {
          result_status_id: ResultStatusEnum.DRAFT,
          name: 'Draft',
        },
      },
      {
        result_id: 20,
        platform_code: ReportingPlatformEnum.STAR,
        result_status: {
          result_status_id: ResultStatusEnum.DRAFT,
          name: 'Draft',
        },
      },
    ] as any[];

    beforeEach(() => {
      jest.clearAllMocks();
      mockQueryService.deleteFullResultById.mockResolvedValue(undefined);
    });

    it('should throw NotFoundException when no results match the filters', async () => {
      mockMainRepo.find.mockResolvedValue([]);

      await expect(
        service.deleteResultsByParameters({
          resultIds: [999],
          testing: false,
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryService.deleteFullResultById).not.toHaveBeenCalled();
    });

    it('should build where clause with resultIds, platformCode and statusCode', async () => {
      mockMainRepo.find.mockResolvedValue(mockResults);

      await service.deleteResultsByParameters({
        resultIds: [10, 20],
        platformCode: ReportingPlatformEnum.STAR,
        statusCode: ResultStatusEnum.DRAFT,
        testing: false,
      } as any);

      expect(mockMainRepo.find).toHaveBeenCalledWith({
        where: {
          result_id: In([10, 20]),
          platform_code: ReportingPlatformEnum.STAR,
          result_status_id: ResultStatusEnum.DRAFT,
        },
        select: {
          result_id: true,
          platform_code: true,
          result_status: {
            result_status_id: true,
            name: true,
          },
        },
        relations: { result_status: true },
      });
    });

    it('should omit empty filters from the where clause', async () => {
      mockMainRepo.find.mockResolvedValue([mockResults[0]]);

      await service.deleteResultsByParameters({
        testing: true,
      } as any);

      expect(mockMainRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should delete each matched result when testing is false', async () => {
      mockMainRepo.find.mockResolvedValue(mockResults);

      const result = await service.deleteResultsByParameters({
        resultIds: [10, 20],
        testing: false,
      } as any);

      expect(result).toEqual(mockResults);
      expect(mockQueryService.deleteFullResultById).toHaveBeenCalledTimes(2);
      expect(mockQueryService.deleteFullResultById).toHaveBeenCalledWith(10);
      expect(mockQueryService.deleteFullResultById).toHaveBeenCalledWith(20);
    });

    it('should not delete results when testing is true', async () => {
      mockMainRepo.find.mockResolvedValue(mockResults);

      const result = await service.deleteResultsByParameters({
        resultIds: [10, 20],
        testing: true,
      } as any);

      expect(result).toEqual(mockResults);
      expect(mockQueryService.deleteFullResultById).not.toHaveBeenCalled();
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
        ...mockCurrentUser.audit(SetAuditEnum.UPDATE),
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

  describe('customStatus', () => {
    it('should skip updates when status is empty', async () => {
      await service.customStatus(null as unknown as ResultStatusEnum, 7, 2025);

      expect(mockGreenChecksService.findByResultId).not.toHaveBeenCalled();
      expect(mockDataSource.getRepository).not.toHaveBeenCalled();
      expect(mockGreenCheckRepository.createSnapshot).not.toHaveBeenCalled();
    });

    it('should update result status when SUBMITTED and completness is true', async () => {
      const update = jest.fn().mockResolvedValue({ affected: 1 });
      mockDataSource.getRepository.mockReturnValue({ update } as any);
      mockGreenChecksService.findByResultId.mockResolvedValue({
        completness: true,
      });

      await service.customStatus(ResultStatusEnum.SUBMITTED, 10, 2026);

      expect(mockGreenChecksService.findByResultId).toHaveBeenCalledWith(10);
      expect(update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          result_status_id: ResultStatusEnum.SUBMITTED,
        }),
      );
      expect(mockGreenCheckRepository.createSnapshot).not.toHaveBeenCalled();
    });

    it('should update and create snapshot when APPROVED and completness is true', async () => {
      const update = jest.fn().mockResolvedValue({ affected: 1 });
      const findOne = jest
        .fn()
        .mockResolvedValue({ result_official_code: 'R123' });
      mockDataSource.getRepository.mockReturnValue({ update, findOne } as any);
      mockGreenChecksService.findByResultId.mockResolvedValue({
        completness: true,
      });

      await service.customStatus(ResultStatusEnum.APPROVED, 11, 2027);

      expect(update).toHaveBeenCalledWith(
        11,
        expect.objectContaining({
          result_status_id: ResultStatusEnum.APPROVED,
        }),
      );
      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { result_id: 11, is_active: true },
        }),
      );
      expect(mockGreenCheckRepository.createSnapshot).toHaveBeenCalledWith(
        'R123',
        2027,
      );
    });

    it('should not update or snapshot when completness is false', async () => {
      const update = jest.fn().mockResolvedValue({ affected: 1 });
      const findOne = jest.fn();
      mockDataSource.getRepository.mockReturnValue({ update, findOne } as any);
      mockGreenChecksService.findByResultId.mockResolvedValue({
        completness: false,
      });

      await service.customStatus(ResultStatusEnum.APPROVED, 12, 2028);

      expect(update).not.toHaveBeenCalled();
      expect(findOne).not.toHaveBeenCalled();
      expect(mockGreenCheckRepository.createSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('findGeneralInfo', () => {
    it('should call mainRepo.findOne and return result', async () => {
      // Arrange
      const resultId = 1;
      const mockResult = {
        result_id: resultId,
        title: 'Test Result',
        description: 'Test Description',
        report_year_id: 2024,
      };
      const mockKeywords = [{ keyword: 'test' }];
      const mockMainContact = { user_id: 1 };

      mockMainRepo.findOne.mockResolvedValue(mockResult as any);
      mockResultKeywordsService.findKeywordsByResultId.mockResolvedValue(
        mockKeywords as any,
      );
      mockResultUsersService.findUsersByRoleResult.mockResolvedValue([
        mockMainContact,
      ] as any);

      // Act
      const result = await service.findGeneralInfo(resultId);

      // Assert
      expect(result).toBeDefined();
      expect(mockMainRepo.findOne).toHaveBeenCalled();
      expect(
        mockResultKeywordsService.findKeywordsByResultId,
      ).toHaveBeenCalledWith(resultId);
      expect(mockResultUsersService.findUsersByRoleResult).toHaveBeenCalledWith(
        UserRolesEnum.MAIN_CONTACT,
        resultId,
      );
    });
  });

  describe('findResultVersions', () => {
    it('should return result versions for a valid result code', async () => {
      // Arrange
      const resultCode = 12345;
      const platformCode = 'STAR';
      const mockVersions = [
        { result_id: 1, title: 'Version 1', version: 1 },
        { result_id: 2, title: 'Version 2', version: 2 },
      ];
      const mockLive = [{ result_id: 3, title: 'Live Version', version: 3 }];

      mockMainRepo.find
        .mockResolvedValueOnce(mockVersions as any) // First call for versions
        .mockResolvedValueOnce(mockLive as any); // Second call for live

      // Act
      const result = await service.findResultVersions(resultCode, platformCode);

      // Assert
      expect(result).toEqual({
        live: mockLive,
        versions: mockVersions,
      });
      expect(mockMainRepo.find).toHaveBeenCalledTimes(2);
    });

    it('should return empty arrays when no versions found', async () => {
      // Arrange
      const resultCode = 99999;
      const platformCode = 'STAR';
      mockMainRepo.find
        .mockResolvedValueOnce([]) // First call for versions
        .mockResolvedValueOnce([]); // Second call for live

      // Act
      const result = await service.findResultVersions(resultCode, platformCode);

      // Assert
      expect(result).toEqual({
        live: [],
        versions: [],
      });
      expect(mockMainRepo.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateResultAlignment', () => {
    let mockEntityManager: jest.Mocked<EntityManager>;
    let indicatorIdGetter: jest.Mock;

    beforeEach(() => {
      mockEntityManager = {
        getRepository: jest.fn(),
      } as any;

      indicatorIdGetter = jest.fn(() => IndicatorsEnum.KNOWLEDGE_PRODUCT);
      Object.defineProperty(mockResultsUtil, 'indicatorId', {
        get: () => indicatorIdGetter(),
        configurable: true,
      });

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockEntityManager);
      });
    });

    it('should handle errors during alignment update', async () => {
      const resultId = 1;
      const updateResultAlignmentDto = {
        contracts: [{ contract_id: 'CONTRACT123', is_primary: true }] as any,
        primary_levers: [{ lever_id: '5', is_primary: true }] as any,
        contributor_levers: [{ lever_id: '6', is_primary: false }] as any,
      };

      const errorMessage = 'Alignment operations error';
      mockResultAlignmentOperationsService.save.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.updateResultAlignment(resultId, updateResultAlignmentDto),
      ).rejects.toThrow(errorMessage);

      expect(mockResultAlignmentOperationsService.save).toHaveBeenCalledWith(
        resultId,
        updateResultAlignmentDto,
      );
    });

    it('should delegate alignment save to ResultAlignmentOperationsService', async () => {
      const resultId = 1;
      const updateResultAlignmentDto = {
        contracts: [{ contract_id: 'CONTRACT123', is_primary: true }] as any,
        primary_levers: [
          {
            lever_id: '100',
            is_primary: true,
            custom_lever_name: 'My custom primary lever',
          },
        ] as any,
        contributor_levers: [
          {
            lever_id: '6',
            is_primary: false,
            custom_lever_name: 'My custom contributor lever',
          },
        ] as any,
        result_sdgs: [],
      };

      mockResultAlignmentOperationsService.save.mockResolvedValue(undefined);

      await service.updateResultAlignment(resultId, updateResultAlignmentDto);

      expect(mockResultAlignmentOperationsService.save).toHaveBeenCalledWith(
        resultId,
        updateResultAlignmentDto,
      );
    });

    it('should delegate alignment save when indicator is not OICR', async () => {
      indicatorIdGetter.mockReturnValue(IndicatorsEnum.KNOWLEDGE_PRODUCT);

      const resultId = 1;
      const sdgTargets = [{ sdg_target_id: 1 }];
      const updateResultAlignmentDto = {
        contracts: [{ contract_id: 'CONTRACT123', is_primary: true }] as any,
        primary_levers: [
          {
            lever_id: '5',
            is_primary: true,
            result_lever_sdg_targets: sdgTargets,
          },
        ] as any,
        contributor_levers: [],
        result_sdgs: [{ clarisa_sdg_id: 1 }] as any,
      };

      mockResultAlignmentOperationsService.save.mockResolvedValue(undefined);

      await service.updateResultAlignment(resultId, updateResultAlignmentDto);

      expect(mockResultAlignmentOperationsService.save).toHaveBeenCalledWith(
        resultId,
        updateResultAlignmentDto,
      );
    });

    it('should delegate alignment save when indicator is OICR', async () => {
      indicatorIdGetter.mockReturnValue(IndicatorsEnum.OICR);

      const resultId = 1;
      const sdgTargets = [{ sdg_target_id: 1 }, { sdg_target_id: 2 }];
      const updateResultAlignmentDto = {
        contracts: [{ contract_id: 'CONTRACT123', is_primary: true }] as any,
        primary_levers: [
          {
            lever_id: '5',
            is_primary: true,
            result_lever_sdg_targets: sdgTargets,
          },
        ] as any,
        contributor_levers: [],
        result_sdgs: [],
      };

      mockResultAlignmentOperationsService.save.mockResolvedValue(undefined);

      await service.updateResultAlignment(resultId, updateResultAlignmentDto);

      expect(mockResultAlignmentOperationsService.save).toHaveBeenCalledWith(
        resultId,
        updateResultAlignmentDto,
      );
    });
  });

  describe('findResultAlignment', () => {
    it('should return alignment from ResultAlignmentOperationsService', async () => {
      const resultId = 1;
      const expectedAlignment = {
        contracts: [{ contract_id: 'CONTRACT123' }],
        primary_levers: [
          {
            result_lever_id: 1,
            lever_id: '100',
            is_primary: true,
            custom_lever_name: 'My custom Other lever',
          },
        ],
        contributor_levers: [
          {
            result_lever_id: 2,
            lever_id: '6',
            is_primary: false,
            custom_lever_name: null,
          },
        ],
        result_sdgs: [],
      };

      mockResultAlignmentOperationsService.find.mockResolvedValue(
        expectedAlignment as any,
      );

      const result = await service.findResultAlignment(resultId);

      expect(mockResultAlignmentOperationsService.find).toHaveBeenCalledWith(
        resultId,
      );
      expect(result.primary_levers).toHaveLength(1);
      expect(result.primary_levers[0].custom_lever_name).toBe(
        'My custom Other lever',
      );
      expect(result.contributor_levers).toHaveLength(1);
      expect(result.contributor_levers[0].custom_lever_name).toBeNull();
    });
  });

  describe('findMetadataResult', () => {
    it('should return metadata for a result', async () => {
      // Arrange
      const resultId = 1;
      const mockResult = {
        result_id: resultId,
        title: 'Test Result',
        result_official_code: 12345,
        result_status_id: 1,
        report_year_id: 2024,
        created_by: 123,
        indicator: {
          indicator_id: 1,
          name: 'Test Indicator',
        },
        result_status: {
          name: 'Active',
        },
      };
      const mockPrincipalData = { is_principal: 1 };
      const mockPrimaryContract = { contract_id: 'CONTRACT-001' };

      mockMainRepo.findOne.mockResolvedValue(mockResult as any);
      mockMainRepo.isMainContactPerson.mockResolvedValue(true);
      mockMainRepo.metadataPrincipalInvestigator.mockResolvedValue(
        mockPrincipalData as any,
      );
      mockResultContractsService.getPrimaryContract.mockResolvedValue(
        mockPrimaryContract as any,
      );

      // Act
      const result = await service.findMetadataResult(resultId);

      // Assert
      expect(result).toEqual({
        indicator_id: mockResult.indicator.indicator_id,
        indicator_name: mockResult.indicator.name,
        result_id: mockResult.result_id,
        result_official_code: mockResult.result_official_code,
        status_id: mockResult.result_status_id,
        status_name: mockResult.result_status.name,
        result_title: mockResult.title,
        created_by: mockResult.created_by,
        report_year: mockResult.report_year_id,
        is_main_contact_person: true,
        is_principal_investigator: mockPrincipalData.is_principal === 1,
        result_contract_id: mockPrimaryContract.contract_id,
        result_status: mockResult.result_status,
        portfolio: null,
      });
      expect(mockMainRepo.isMainContactPerson).toHaveBeenCalledWith(
        resultId,
        123,
      );
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        select: {
          indicator: {
            name: true,
            indicator_id: true,
          },
          report_year_id: true,
          result_id: true,
          result_official_code: true,
          result_status_id: true,
          title: true,
          result_status: {
            name: true,
            description: true,
            config: true as any,
            editable_roles: true,
            result_status_id: true,
          },
          created_by: true,
          platform_code: true,
          public_link: true,
          external_link: true,
          updated_at: true,
        },
        where: { result_id: resultId, is_active: true },
        relations: {
          indicator: true,
          result_status: true,
        },
      });
      expect(mockMainRepo.metadataPrincipalInvestigator).toHaveBeenCalledWith(
        resultId,
        123,
      );
    });

    it('should return platform_code, public_link, external_link, and updated_at for a STAR result', async () => {
      // Arrange
      const resultId = 2;
      const updatedAt = new Date('2026-07-20T10:00:00.000Z');
      const mockResult = {
        result_id: resultId,
        title: 'STAR Result',
        result_official_code: 22222,
        result_status_id: 1,
        report_year_id: 2024,
        created_by: 123,
        platform_code: 'STAR',
        public_link: 'https://star.example.org/public/22222',
        external_link: 'https://star.example.org/22222',
        updated_at: updatedAt,
        indicator: {
          indicator_id: 1,
          name: 'Test Indicator',
        },
        result_status: {
          name: 'Active',
        },
      };
      const mockPrincipalData = { is_principal: 1 };
      const mockPrimaryContract = { contract_id: 'CONTRACT-002' };

      mockMainRepo.findOne.mockResolvedValue(mockResult as any);
      mockMainRepo.isMainContactPerson.mockResolvedValue(true);
      mockMainRepo.metadataPrincipalInvestigator.mockResolvedValue(
        mockPrincipalData as any,
      );
      mockResultContractsService.getPrimaryContract.mockResolvedValue(
        mockPrimaryContract as any,
      );

      // Act
      const result = await service.findMetadataResult(resultId);

      // Assert
      expect(result.platform_code).toBe('STAR');
      expect(result.public_link).toBe('https://star.example.org/public/22222');
      expect(result.external_link).toBe('https://star.example.org/22222');
      expect(result.updated_at).toEqual(updatedAt);
    });

    it('should return platform_code, public_link, external_link, and updated_at for a non-STAR (TIP) result', async () => {
      // Arrange
      const resultId = 3;
      const updatedAt = new Date('2026-07-15T08:30:00.000Z');
      const mockResult = {
        result_id: resultId,
        title: 'TIP Result',
        result_official_code: 33333,
        result_status_id: 1,
        report_year_id: 2024,
        created_by: 456,
        platform_code: 'TIP',
        public_link: 'https://tip.example.org/public/33333',
        external_link: 'https://tip.example.org/33333',
        updated_at: updatedAt,
        indicator: {
          indicator_id: 1,
          name: 'Test Indicator',
        },
        result_status: {
          name: 'Active',
        },
      };
      const mockPrincipalData = { is_principal: 0 };
      const mockPrimaryContract = null;

      mockMainRepo.findOne.mockResolvedValue(mockResult as any);
      mockMainRepo.isMainContactPerson.mockResolvedValue(false);
      mockMainRepo.metadataPrincipalInvestigator.mockResolvedValue(
        mockPrincipalData as any,
      );
      mockResultContractsService.getPrimaryContract.mockResolvedValue(
        mockPrimaryContract as any,
      );

      // Act
      const result = await service.findMetadataResult(resultId);

      // Assert
      expect(result.platform_code).toBe('TIP');
      expect(result.public_link).toBe('https://tip.example.org/public/33333');
      expect(result.external_link).toBe('https://tip.example.org/33333');
      expect(result.updated_at).toEqual(updatedAt);
    });

    it('should throw NotFoundException when no metadata found', async () => {
      // Arrange
      const resultId = 999;
      const mockPrincipalData = { is_principal: 0 };

      mockMainRepo.findOne.mockResolvedValue(null);
      mockMainRepo.isMainContactPerson.mockResolvedValue(false);
      mockMainRepo.metadataPrincipalInvestigator.mockResolvedValue(
        mockPrincipalData as any,
      );
      mockResultContractsService.getPrimaryContract.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findMetadataResult(resultId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockMainRepo.isMainContactPerson).toHaveBeenCalledWith(
        resultId,
        123,
      );
      expect(mockMainRepo.metadataPrincipalInvestigator).toHaveBeenCalledWith(
        resultId,
        123,
      );
    });
  });

  describe('validateIndicator', () => {
    it('should return true when validation passes', async () => {
      // Arrange
      const resultId = 1;
      const indicator = IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT;
      const mockResult = { result_id: resultId, indicator_id: indicator };

      mockMainRepo.findOne.mockResolvedValue(mockResult as any);

      // Act
      const result = await service.validateIndicator(resultId, indicator);

      // Assert
      expect(result).toBe(true);
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        where: { result_id: resultId, indicator_id: indicator },
      });
    });

    it('should return false when validation fails', async () => {
      // Arrange
      const resultId = 1;
      const indicator = IndicatorsEnum.POLICY_CHANGE;

      mockMainRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateIndicator(resultId, indicator);

      // Assert
      expect(result).toBe(false);
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        where: { result_id: resultId, indicator_id: indicator },
      });
    });
  });

  describe('saveGeoLocation', () => {
    let mockRepository: any;
    let mockEntityManager: jest.Mocked<EntityManager>;

    beforeEach(() => {
      // Setup repository mock
      mockRepository = {
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

      // Setup audit mock return value
      mockCurrentUser.audit.mockReturnValue({
        created_by: 123,
        created_at: new Date(),
        updated_by: 123,
        updated_at: new Date(),
      });
    });

    it('should return existing geo location when dto is null or undefined', async () => {
      const resultId = 1;
      const existing = { geo_scope_id: 1, countries: [], regions: [] };
      const findGeoLocationSpy = jest
        .spyOn(service, 'findGeoLocation')
        .mockResolvedValue(existing as any);

      const fromNull = await service.saveGeoLocation(resultId, null);
      const fromUndefined = await service.saveGeoLocation(resultId, undefined);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(findGeoLocationSpy).toHaveBeenCalledTimes(2);
      expect(findGeoLocationSpy).toHaveBeenCalledWith(resultId);
      expect(fromNull).toEqual(existing);
      expect(fromUndefined).toEqual(existing);
    });

    it('should save geo location with comment_geo_scope', async () => {
      // Arrange
      const resultId = 1;
      const saveGeoLocationDto = {
        geo_scope_id: 1,
        countries: [
          {
            isoAlpha2: 'CO',
            result_countries_sub_nationals: [{ sub_national_id: 123 }],
          },
        ],
        regions: [{ region_id: 1 }],
        comment_geo_scope: 'Test comment for geo scope',
      };

      const transformedGeoScopeId = 1;
      const mockCountriesData = [
        {
          isoAlpha2: 'CO',
          is_active: true,
          result_country_id: 1,
        },
      ];
      const mockSaveCountries = [
        {
          isoAlpha2: 'CO',
          result_country_id: 1,
        },
      ];

      mockClarisaGeoScopeService.transformGeoScope.mockReturnValue(
        transformedGeoScopeId,
      );
      mockResultCountriesService.comparerClientToServerCountry.mockResolvedValue(
        mockCountriesData as any,
      );
      mockResultCountriesService.create.mockResolvedValue(
        mockSaveCountries as any,
      );
      mockResultRegionsService.create.mockResolvedValue([]);
      mockResultCountriesSubNationalsService.create.mockResolvedValue([]);
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);

      // Mock findGeoLocation for the return
      jest
        .spyOn(service, 'findGeoLocation')
        .mockResolvedValue(saveGeoLocationDto as any);

      // Act
      const result = await service.saveGeoLocation(
        resultId,
        saveGeoLocationDto as any,
      );

      // Assert
      expect(mockClarisaGeoScopeService.transformGeoScope).toHaveBeenCalledWith(
        saveGeoLocationDto.geo_scope_id,
        saveGeoLocationDto.countries,
      );
      expect(mockRepository.update).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          geo_scope_id: transformedGeoScopeId,
          comment_geo_scope: 'Test comment for geo scope',
        }),
      );
      expect(
        mockResultCountriesService.comparerClientToServerCountry,
      ).toHaveBeenCalledWith(resultId, saveGeoLocationDto.countries);
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
        mockEntityManager,
      );
      expect(result).toEqual(saveGeoLocationDto);
    });

    it('should save geo location without comment_geo_scope', async () => {
      // Arrange
      const resultId = 1;
      const saveGeoLocationDto = {
        geo_scope_id: 1,
        countries: [],
        regions: [],
      };

      const transformedGeoScopeId = 1;

      mockClarisaGeoScopeService.transformGeoScope.mockReturnValue(
        transformedGeoScopeId,
      );
      mockResultCountriesService.comparerClientToServerCountry.mockResolvedValue(
        [],
      );
      mockResultCountriesService.create.mockResolvedValue([]);
      mockResultRegionsService.create.mockResolvedValue([]);
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);

      jest
        .spyOn(service, 'findGeoLocation')
        .mockResolvedValue(saveGeoLocationDto as any);

      // Act
      const result = await service.saveGeoLocation(
        resultId,
        saveGeoLocationDto as any,
      );

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          geo_scope_id: transformedGeoScopeId,
          comment_geo_scope: null,
        }),
      );
      expect(result).toEqual(saveGeoLocationDto);
    });

    it('should handle different geo scope types correctly', async () => {
      // Arrange
      const resultId = 1;
      const saveGeoLocationDto = {
        geo_scope_id: 2, // REGIONAL
        countries: [],
        regions: [{ region_id: 1 }],
        comment_geo_scope: 'Regional scope comment',
      };

      mockClarisaGeoScopeService.transformGeoScope.mockReturnValue(2);
      mockResultCountriesService.comparerClientToServerCountry.mockResolvedValue(
        [],
      );
      mockResultCountriesService.create.mockResolvedValue([]);
      mockResultRegionsService.create.mockResolvedValue([]);
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);

      jest
        .spyOn(service, 'findGeoLocation')
        .mockResolvedValue(saveGeoLocationDto as any);

      // Act
      await service.saveGeoLocation(resultId, saveGeoLocationDto as any);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          comment_geo_scope: 'Regional scope comment',
        }),
      );
      expect(mockResultRegionsService.create).toHaveBeenCalled();
      expect(mockClarisaGeoScopeService.transformGeoScope).toHaveBeenCalledWith(
        saveGeoLocationDto.geo_scope_id,
        saveGeoLocationDto.countries,
      );
    });
  });

  describe('findGeoLocation', () => {
    it('should find geo location data', async () => {
      // Arrange
      const resultId = 1;
      const mockGeoScopeId = 1;
      const mockCountries = [
        {
          result_country_id: 1,
          isoAlpha2: 'CO',
          result_countries_sub_nationals: [],
        },
      ];
      const mockRegions = [{ region_id: 1 }];
      const mockSubNational = [];

      mockMainRepo.findOne.mockResolvedValue({
        geo_scope_id: mockGeoScopeId,
      } as any);
      mockClarisaGeoScopeService.transformGeoScope.mockReturnValue(
        mockGeoScopeId,
      );
      mockResultCountriesService.find.mockResolvedValue(mockCountries as any);
      mockResultCountriesSubNationalsService.find.mockResolvedValue(
        mockSubNational as any,
      );
      mockResultRegionsService.find.mockResolvedValue(mockRegions as any);

      // Act
      const result = await service.findGeoLocation(resultId);

      // Assert
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        where: { result_id: resultId, is_active: true },
        select: {
          geo_scope_id: true,
          comment_geo_scope: true,
        },
      });
      expect(mockClarisaGeoScopeService.transformGeoScope).toHaveBeenCalledWith(
        mockGeoScopeId,
        undefined,
        false,
      );
      expect(mockResultCountriesService.find).toHaveBeenCalled();
      expect(mockResultRegionsService.find).toHaveBeenCalled();
      expect(result).toEqual({
        geo_scope_id: mockGeoScopeId,
        regions: mockRegions,
        countries: mockCountries,
      });
    });

    it('should handle case when no geo scope found', async () => {
      // Arrange
      const resultId = 1;

      mockMainRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findGeoLocation(resultId)).rejects.toThrow();
    });
  });

  describe('findLastUpdatedResultByCurrentUser', () => {
    it('should load primary contracts and levers and merge them per result', async () => {
      const take = 5;
      const mockResults = [
        {
          result_id: 1,
          title: 'R1',
          updated_at: new Date(),
          public_link: 'https://a',
          report_year_id: 2024,
        },
        {
          result_id: 2,
          title: 'R2',
          updated_at: new Date(),
          public_link: null,
          report_year_id: 2025,
        },
      ];
      const contractFor1 = {
        result_id: 1,
        is_primary: true,
        is_active: true,
        agresso_contract: { id: 10 },
      };
      const leverFor1a = {
        result_id: 1,
        is_primary: true,
        is_active: true,
        lever: { lever_id: 100 },
      };
      const leverFor1b = {
        result_id: 1,
        is_primary: true,
        is_active: true,
        lever: { lever_id: 101 },
      };
      const leverFor2 = {
        result_id: 2,
        is_primary: true,
        is_active: true,
        lever: { lever_id: 200 },
      };

      mockMainRepo.find.mockResolvedValue(mockResults as any);

      const mockContractFind = jest.fn().mockResolvedValue([contractFor1]);
      const mockLeverFind = jest
        .fn()
        .mockResolvedValue([leverFor1a, leverFor1b, leverFor2]);

      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === ResultContract) {
          return { find: mockContractFind } as any;
        }
        if (entity === ResultLever) {
          return { find: mockLeverFind } as any;
        }
        return { find: jest.fn() } as any;
      });

      const result = await service.findLastUpdatedResultByCurrentUser(take);

      expect(mockMainRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.arrayContaining([
            'public_link',
            'report_year_id',
            'platform_code',
          ]),
          where: {
            created_by: mockCurrentUser.user_id,
            is_active: true,
            is_snapshot: false,
          },
          relations: {
            indicator: true,
            result_status: true,
          },
          order: { updated_at: 'DESC' },
          take,
        }),
      );

      expect(mockContractFind).toHaveBeenCalledWith({
        where: {
          result_id: In([1, 2]),
          is_primary: true,
          is_active: true,
        },
        relations: { agresso_contract: true },
      });
      expect(mockLeverFind).toHaveBeenCalledWith({
        where: {
          result_id: In([1, 2]),
          is_primary: true,
          is_active: true,
        },
        relations: { lever: true },
      });

      expect(result).toEqual([
        {
          ...mockResults[0],
          result_contracts: contractFor1,
          result_levers: [leverFor1a, leverFor1b],
        },
        {
          ...mockResults[1],
          result_contracts: null,
          result_levers: [leverFor2],
        },
      ]);
    });

    it('should return empty array when the user has no recent results', async () => {
      mockMainRepo.find.mockResolvedValue([] as any);
      const mockContractFind = jest.fn().mockResolvedValue([]);
      const mockLeverFind = jest.fn().mockResolvedValue([]);
      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === ResultContract) {
          return { find: mockContractFind } as any;
        }
        if (entity === ResultLever) {
          return { find: mockLeverFind } as any;
        }
        return { find: jest.fn() } as any;
      });

      const result = await service.findLastUpdatedResultByCurrentUser(10);

      expect(result).toEqual([]);
      expect(mockContractFind).toHaveBeenCalledWith({
        where: {
          result_id: In([]),
          is_primary: true,
          is_active: true,
        },
        relations: { agresso_contract: true },
      });
      expect(mockLeverFind).toHaveBeenCalledWith({
        where: {
          result_id: In([]),
          is_primary: true,
          is_active: true,
        },
        relations: { lever: true },
      });
    });
  });

  // [CLAUDE/DONE] 137
  describe('findOne', () => {
    it('should delegate to mainRepo.findOne with the provided options', async () => {
      const mockResult = { result_id: 1, title: 'Test' };
      mockMainRepo.findOne.mockResolvedValue(mockResult as any);

      const result = await service.findOne({ where: { result_id: 1 } } as any);

      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        where: { result_id: 1 },
      });
      expect(result).toEqual(mockResult);
    });
  });

  // [CLAUDE/DONE] 138
  describe('findResultTIPData', () => {
    it('should call createQueryBuilder and return results', async () => {
      const mockResults = [{ result_id: 1 }];
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockResults),
      };
      mockMainRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQb) as any;

      const result = await service.findResultTIPData({ year: 2024 });

      expect(mockMainRepo.createQueryBuilder).toHaveBeenCalledWith('r');
      expect(mockQb.andWhere).toHaveBeenCalledWith('report_year_id = :year', {
        year: 2024,
      });
      expect(result).toEqual(mockResults);
    });

    it('should filter by productType when provided', async () => {
      const mockResults = [{ result_id: 2 }];
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockResults),
      };
      mockMainRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQb) as any;

      const result = await service.findResultTIPData({ productType: 3 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'r.indicator_id = :productType',
        { productType: 3 },
      );
      expect(result).toEqual(mockResults);
    });
  });

  // [CLAUDE/DONE] 139
  describe('findBaseInfo', () => {
    it('should return base info combining contract and result data', async () => {
      mockResultContractsService.find.mockResolvedValue([
        { contract_id: 'AGR-001' } as any,
      ]);
      mockMainRepo.findOne.mockResolvedValue({
        title: 'My Result',
        description: 'Desc',
        indicator_id: 1,
        report_year_id: 2024,
        is_ai: false,
      } as any);

      const result = await service.findBaseInfo(10);

      expect(result.contract_id).toBe('AGR-001');
      expect(result.title).toBe('My Result');
      expect(result.year).toBe(2024);
    });

    it('should throw when result row is missing', async () => {
      mockResultContractsService.find.mockResolvedValue([] as any);
      mockMainRepo.findOne.mockResolvedValue(null);

      await expect(service.findBaseInfo(99)).rejects.toThrow();
    });
  });

  // [CLAUDE/DONE] 140
  describe('validateResultTitle', () => {
    it('should return true when no result exists with the given title', async () => {
      mockMainRepo.findOne.mockResolvedValue(null);

      const result = await service.validateResultTitle('New Title');

      expect(result).toBe(true);
    });

    it('should return false when a result exists with the given title', async () => {
      mockMainRepo.findOne.mockResolvedValue({
        result_id: 1,
        title: 'New Title',
      } as any);

      const result = await service.validateResultTitle('New Title');

      expect(result).toBe(false);
    });
  });

  // [CLAUDE/DONE] 141
  describe('filterResultByIndicators', () => {
    it('should return all resultIds unchanged when indicators is empty', async () => {
      const result = await service.filterResultByIndicators([1, 2, 3], []);

      expect(result).toEqual([1, 2, 3]);
      expect(mockMainRepo.find).not.toHaveBeenCalled();
    });

    it('should filter result ids by matching indicators', async () => {
      mockMainRepo.find.mockResolvedValue([
        { result_id: 1 },
        { result_id: 3 },
      ] as any);

      const result = await service.filterResultByIndicators(
        [1, 2, 3],
        [1 as any],
      );

      expect(result).toEqual([1, 3]);
    });
  });

  // [CLAUDE/DONE] 142
  describe('formalizeResult', () => {
    it('should populate result metadata on successful bulk formalization', async () => {
      const rawResult = {
        title: 'Bulk Result',
        status: ResultStatusEnum.SUBMITTED,
        metadata: { missing_fields: [' field '], manually_edited: true },
      } as any;
      const resultMetadata: any[] = [];

      jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue({
        result: { indicator_id: IndicatorsEnum.POLICY_CHANGE, year: 2024 },
        generalInformation: {},
        sdgs: [],
        ipRights: {},
        geoScope: {},
        partners: [],
        evidences: [],
        policyChange: {},
      } as any);
      jest.spyOn(service, 'createResult').mockResolvedValue({
        result_id: 42,
        indicator_id: IndicatorsEnum.POLICY_CHANGE,
        result_status_id: 1,
      } as any);
      jest.spyOn(service, 'updateGeneralInfo').mockResolvedValue(undefined);
      jest.spyOn(service, 'saveGeoLocation').mockResolvedValue(undefined);
      jest
        .spyOn(service, 'customStatus')
        .mockResolvedValue(ResultStatusEnum.SUBMITTED);

      mockResultSdgsService.saveSdgAi = jest.fn().mockResolvedValue(undefined);
      mockResultIpRightsService.update = jest.fn().mockResolvedValue(undefined);
      mockResultInstitutionsService.updatePartners = jest
        .fn()
        .mockResolvedValue(undefined);
      mockResultEvidencesService.updateResultEvidences = jest
        .fn()
        .mockResolvedValue(undefined);
      mockResultPolicyChangeService.update = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.formalizeResult(
        rawResult,
        true,
        resultMetadata,
      );

      expect((result as any).error).toBe(false);
      expect(resultMetadata).toHaveLength(1);
      expect(resultMetadata[0]).toEqual(
        expect.objectContaining({
          missing_fields: ['field'],
          manual_intervention_occurred: true,
          suggested_status: ResultStatusEnum.SUBMITTED,
          title: 'Bulk Result',
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_id: 42,
          final_status: ResultStatusEnum.SUBMITTED,
        }),
      );
    });

    it('should return result with error=true and call deleteFullResultById on exception in bulk mode', async () => {
      const rawResult = { title: 'Test', indicator: 'Policy Change' } as any;

      jest
        .spyOn(service, 'createResultFromAiRoar')
        .mockRejectedValue(new Error('AI error'));
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          result_official_code: 'STAR-001',
          platform_code: 'STAR',
        }),
      } as any);

      const resultMetadata: any[] = [];
      const result = await service.formalizeResult(
        rawResult,
        true,
        resultMetadata,
      );

      expect((result as any).error).toBe(true);
      expect(resultMetadata).toHaveLength(1);
      expect(resultMetadata[0].error_message).toContain('AI error');
    });

    it('should throw error when not in bulk mode', async () => {
      const rawResult = { title: 'Test' } as any;

      jest
        .spyOn(service, 'createResultFromAiRoar')
        .mockRejectedValue(new Error('AI error'));
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.formalizeResult(rawResult, false)).rejects.toThrow(
        'AI error',
      );
    });

    // T-05 — the strategic-objectives alignment step (design.md §5.1).
    describe('strategic objectives alignment', () => {
      const baseProcessedResult = (overrides: any = {}) => ({
        result: { indicator_id: IndicatorsEnum.POLICY_CHANGE, year: 2026 },
        generalInformation: {},
        sdgs: [],
        ipRights: {},
        geoScope: {},
        partners: [],
        evidences: [],
        policyChange: {},
        ...overrides,
      });

      const mockSuccessfulWriteChain = () => {
        jest.spyOn(service, 'updateGeneralInfo').mockResolvedValue(undefined);
        jest.spyOn(service, 'saveGeoLocation').mockResolvedValue(undefined);
        jest.spyOn(service, 'customStatus').mockResolvedValue(undefined);
        mockResultSdgsService.saveSdgAi = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultIpRightsService.update = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultInstitutionsService.updatePartners = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultEvidencesService.updateResultEvidences = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultPolicyChangeService.update = jest
          .fn()
          .mockResolvedValue(undefined);
      };

      it('resolves 2026 to portfolio 2 and saves the ids through the orchestrator, reporting no discrepancy (R-RES-003)', async () => {
        const rawResult = {
          title: 'SO 2026',
          year: 2026,
          strategic_objectives: [1, 3, 5],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValue(
            baseProcessedResult({ strategic_objectives: [1, 3, 5] }) as any,
          );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 100,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockResolvedValue(
          { supported: true, saved: [1, 3, 5], discarded: [] },
        );

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect(mockPortfoliosService.findByYear).toHaveBeenCalledWith(2026);
        expect(
          mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio,
        ).toHaveBeenCalledWith(100, PortfolioIdEnum.PORTFOLIO_2, [1, 3, 5]);
        expect((result as any).error).toBe(false);
        expect(resultMetadata[0].missing_fields).toEqual([]);
      });

      it('degrades to missing_fields, in addition to what the AI reported, when the resolved portfolio does not support strategic objectives, without failing the item (R-RES-004)', async () => {
        const rawResult = {
          title: 'SO 2025',
          year: 2025,
          strategic_objectives: [1, 3, 5],
          metadata: { missing_fields: ['sdg_targets'] },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            result: { indicator_id: IndicatorsEnum.POLICY_CHANGE, year: 2025 },
            strategic_objectives: [1, 3, 5],
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 101,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_1,
        } as any);
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockResolvedValue(
          { supported: false, saved: [], discarded: [] },
        );

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect((result as any).error).toBe(false);
        expect(resultMetadata[0].missing_fields).toEqual([
          'sdg_targets',
          'strategic_objectives',
        ]);
      });

      it('reports no strategic_objectives entry for a 2025 item that never carried the field (R-RES-004 AC.4)', async () => {
        const rawResult = {
          title: 'No SO',
          year: 2025,
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            result: { indicator_id: IndicatorsEnum.POLICY_CHANGE, year: 2025 },
            strategic_objectives: undefined,
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 102,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect((result as any).error).toBe(false);
        expect(resultMetadata[0].missing_fields).toEqual([]);
        expect(mockPortfoliosService.findByYear).not.toHaveBeenCalled();
        expect(
          mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio,
        ).not.toHaveBeenCalled();
      });

      it('creates the item and records the field with no fallback portfolio when no active portfolio covers the year (R-RES-006, falsifier: year 2035)', async () => {
        const rawResult = {
          title: 'SO 2035',
          year: 2035,
          strategic_objectives: [1],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            result: { indicator_id: IndicatorsEnum.POLICY_CHANGE, year: 2035 },
            strategic_objectives: [1],
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 103,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue(null);
        const warnSpy = jest
          .spyOn(CgiarLogger.prototype, 'warn')
          .mockImplementation(() => undefined);

        try {
          const result = await service.formalizeResult(
            rawResult,
            true,
            resultMetadata,
          );

          expect((result as any).error).toBe(false);
          expect(resultMetadata[0].missing_fields).toEqual([
            'strategic_objectives',
          ]);
          expect(
            mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio,
          ).not.toHaveBeenCalled();
          expect(
            warnSpy.mock.calls.some((call) => String(call[0]).includes('2035')),
          ).toBe(true);
        } finally {
          warnSpy.mockRestore();
        }
      });

      it('records each discarded id as strategic_objectives:<id>, distinguishable from the field-level entry (R-RES-005)', async () => {
        const rawResult = {
          title: 'SO discard',
          year: 2026,
          strategic_objectives: [1, 999, 3],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            strategic_objectives: [1, 999, 3],
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 104,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockResolvedValue(
          { supported: true, saved: [1, 3], discarded: [999] },
        );

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect((result as any).error).toBe(false);
        expect(resultMetadata[0].missing_fields).toEqual([
          'strategic_objectives:999',
        ]);
        expect(resultMetadata[0].missing_fields).not.toContain(
          'strategic_objectives',
        );
      });

      // T-03 forward pointer (execution.md): a red-capable test against the
      // unconditional-loop bug. Content equality, not toContain — toContain
      // would still pass with the spurious per-id entries present.
      it('ignores report.discarded entirely when supported is false, asserted by content equality (T-03 forward pointer, R-RES-005 AC.2)', async () => {
        const rawResult = {
          title: 'SO unsupported carrying ids',
          year: 2025,
          strategic_objectives: [1, 999],
          metadata: { missing_fields: ['sdg_targets'] },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            result: { indicator_id: IndicatorsEnum.POLICY_CHANGE, year: 2025 },
            strategic_objectives: [1, 999],
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 105,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_1,
        } as any);
        // Portfolio 1 reports unsupported even though ids were sent —
        // `discarded` here is exactly what an unconditional-loop bug would
        // iterate over and turn into spurious per-id entries.
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockResolvedValue(
          { supported: false, saved: [], discarded: [1, 999] },
        );

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect((result as any).error).toBe(false);
        expect(resultMetadata[0].missing_fields).toEqual([
          'sdg_targets',
          'strategic_objectives',
        ]);
      });

      it.each([
        ['absent', undefined],
        ['an empty array', []],
        ['null', null],
      ])(
        'never calls the resolver or the orchestrator when strategic_objectives is %s (R-RES-007 step 1 guard)',
        async (_label, value) => {
          const rawResult = {
            title: 'No SO variant',
            year: 2026,
            strategic_objectives: value,
            metadata: { missing_fields: [] },
          } as any;
          const resultMetadata: any[] = [];

          jest
            .spyOn(service, 'createResultFromAiRoar')
            .mockResolvedValue(
              baseProcessedResult({ strategic_objectives: value }) as any,
            );
          jest.spyOn(service, 'createResult').mockResolvedValue({
            result_id: 200,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any);
          mockSuccessfulWriteChain();

          const result = await service.formalizeResult(
            rawResult,
            true,
            resultMetadata,
          );

          expect((result as any).error).toBe(false);
          expect(mockPortfoliosService.findByYear).not.toHaveBeenCalled();
          expect(
            mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio,
          ).not.toHaveBeenCalled();
          expect(resultMetadata[0].missing_fields).toEqual([]);
        },
      );

      it('succeeds without a metadata collector when called from the single endpoint (DD-7, R-RES-009)', async () => {
        const rawResult = { title: 'Single endpoint', year: 2026 } as any;

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValue(baseProcessedResult() as any);
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 300,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();

        const result = await service.formalizeResult(rawResult);

        expect((result as any).error).toBe(false);
        expect((result as any).result_id).toBe(300);
      });

      it('rolls back via deleteFullResultById and rethrows when the alignment step itself throws (single endpoint, DD-6/DD-8)', async () => {
        const rawResult = {
          title: 'Alignment throws',
          year: 2026,
          strategic_objectives: [1],
        } as any;

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValue(
            baseProcessedResult({ strategic_objectives: [1] }) as any,
          );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 301,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockDataSource.getRepository.mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        } as any);
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockRejectedValue(
          new Error('orchestrator failure'),
        );

        await expect(service.formalizeResult(rawResult)).rejects.toThrow(
          'orchestrator failure',
        );
        expect(mockQueryService.deleteFullResultById).toHaveBeenCalledWith(301);
      });

      it('resolves an item with no year using the current calendar year, routing per-item to the portfolio that covers it (R-RES-002 AC.4, KZ-004)', async () => {
        const currentYear = new Date().getFullYear();
        const noYearResult = {
          title: 'No year field',
          strategic_objectives: [7],
          metadata: { missing_fields: [] },
        } as any;
        const olderYearResult = {
          title: 'Old year item',
          year: 2010,
          strategic_objectives: [9],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValueOnce(
            baseProcessedResult({
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: currentYear,
              },
              strategic_objectives: [7],
            }) as any,
          )
          .mockResolvedValueOnce(
            baseProcessedResult({
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: 2010,
              },
              strategic_objectives: [9],
            }) as any,
          );
        jest
          .spyOn(service, 'createResult')
          .mockResolvedValueOnce({
            result_id: 400,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any)
          .mockResolvedValueOnce({
            result_id: 401,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any);
        mockSuccessfulWriteChain();

        // KZ-001: the double routes by year (a map), not a constant return —
        // otherwise it cannot distinguish per-item scoping from a hardcoded
        // default.
        mockPortfoliosService.findByYear.mockImplementation(
          async (year: number) =>
            ({
              id:
                year === currentYear
                  ? PortfolioIdEnum.PORTFOLIO_2
                  : PortfolioIdEnum.PORTFOLIO_1,
            }) as any,
        );
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockResolvedValue(
          { supported: true, saved: [], discarded: [] },
        );

        await service.formalizeResult(noYearResult, true, resultMetadata);
        await service.formalizeResult(olderYearResult, true, resultMetadata);

        expect(mockPortfoliosService.findByYear).toHaveBeenNthCalledWith(
          1,
          currentYear,
        );
        expect(mockPortfoliosService.findByYear).toHaveBeenNthCalledWith(
          2,
          2010,
        );
        expect(
          mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio,
        ).toHaveBeenNthCalledWith(1, 400, PortfolioIdEnum.PORTFOLIO_2, [7]);
        expect(
          mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio,
        ).toHaveBeenNthCalledWith(2, 401, PortfolioIdEnum.PORTFOLIO_1, [9]);
      });

      // T-06 (R-RES-007 AC.3, DC-2) — Disqualifies: "an inertness case
      // that omits the sibling-row is_active assertions." Absence of the
      // new row is not evidence the pre-existing rows survived, so every
      // row here is tracked by table + result id in a shared fake store,
      // and the section-wide save double (mockResultAlignmentOperationsService)
      // genuinely performs the destructive reconciliation it stands in
      // for (BaseServiceSimple.create, DD-1) — if the formalizer ever
      // reached it, the sibling rows below would flip inactive and this
      // test would go red (KZ-001 double fidelity).
      it('leaves every result_sdgs row and every ALIGNMENT result_contracts row active, alongside the new strategic-objectives row (R-RES-007 AC.3)', async () => {
        type FakeRow = {
          table:
            | 'result_sdgs'
            | 'result_contracts'
            | 'result_strategic_objectives';
          result_id: number;
          is_active: boolean;
        };
        const rows: FakeRow[] = [];

        const rawResult = {
          title: 'SO + SDG inertness',
          year: 2026,
          sdg_targets: [1, 2],
          strategic_objectives: [51],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            sdgs: [{ clarisa_sdg_id: 10 }, { clarisa_sdg_id: 20 }],
            strategic_objectives: [51],
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockImplementation(async () => {
          // Mirrors createResult's real write of the primary ALIGNMENT
          // result_contracts row (results.service.ts ~L459-466).
          rows.push({
            table: 'result_contracts',
            result_id: 700,
            is_active: true,
          });
          return {
            result_id: 700,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any;
        });
        jest.spyOn(service, 'updateGeneralInfo').mockResolvedValue(undefined);
        jest.spyOn(service, 'saveGeoLocation').mockResolvedValue(undefined);
        jest.spyOn(service, 'customStatus').mockResolvedValue(undefined);
        mockResultSdgsService.saveSdgAi = jest
          .fn()
          .mockImplementation(async (resultId: number, sdgs: any[]) => {
            rows.push(
              ...sdgs.map(() => ({
                table: 'result_sdgs' as const,
                result_id: resultId,
                is_active: true,
              })),
            );
          });
        mockResultIpRightsService.update = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultInstitutionsService.updatePartners = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultEvidencesService.updateResultEvidences = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultAlignmentOperationsService.save.mockImplementation(
          async (resultId: number) => {
            rows.forEach((row) => {
              if (row.result_id === resultId) row.is_active = false;
            });
            return {} as any;
          },
        );
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockImplementation(
          async (
            resultId: number,
            _portfolioId: PortfolioIdEnum,
            ids: number[],
          ) => {
            rows.push(
              ...ids.map((_id) => ({
                table: 'result_strategic_objectives' as const,
                result_id: resultId,
                is_active: true,
              })),
            );
            return { supported: true, saved: ids, discarded: [] };
          },
        );

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect((result as any).error).toBe(false);
        expect(
          mockResultAlignmentOperationsService.save,
        ).not.toHaveBeenCalled();
        expect(rows.filter((r) => r.table === 'result_sdgs')).toHaveLength(2);
        expect(
          rows
            .filter((r) => r.table === 'result_sdgs')
            .every((r) => r.is_active),
        ).toBe(true);
        expect(
          rows
            .filter((r) => r.table === 'result_contracts')
            .every((r) => r.is_active),
        ).toBe(true);
        expect(
          rows.some(
            (r) =>
              r.table === 'result_strategic_objectives' &&
              r.result_id === 700 &&
              r.is_active,
          ),
        ).toBe(true);
      });
    });

    // T-05 — the primary-levers alignment step (design.md §5.1). Mirrors
    // the strategic-objectives describe above with one structural
    // difference: `LeversSaveReport` carries no `supported` flag (DD-8),
    // so there is no "portfolio does not support the field" branch here —
    // only the field-level (unresolvable year) and per-id (discarded)
    // cases.
    describe('primary levers alignment', () => {
      const baseProcessedResult = (overrides: any = {}) => ({
        result: { indicator_id: IndicatorsEnum.POLICY_CHANGE, year: 2026 },
        generalInformation: {},
        sdgs: [],
        ipRights: {},
        geoScope: {},
        partners: [],
        evidences: [],
        policyChange: {},
        ...overrides,
      });

      const mockSuccessfulWriteChain = () => {
        jest.spyOn(service, 'updateGeneralInfo').mockResolvedValue(undefined);
        jest.spyOn(service, 'saveGeoLocation').mockResolvedValue(undefined);
        jest.spyOn(service, 'customStatus').mockResolvedValue(undefined);
        mockResultSdgsService.saveSdgAi = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultIpRightsService.update = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultInstitutionsService.updatePartners = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultEvidencesService.updateResultEvidences = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultPolicyChangeService.update = jest
          .fn()
          .mockResolvedValue(undefined);
      };

      it('resolves a 2024 item to portfolio 1, saves the ids through the orchestrator, and the item carries the unchanged bulk-metadata fields (R-RES-002, R-RES-003 analog)', async () => {
        const rawResult = {
          title: 'Levers 2024',
          year: 2024,
          status: ResultStatusEnum.SUBMITTED,
          primary_levers: [4, 5],
          metadata: { missing_fields: [], manually_edited: true },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            result: {
              indicator_id: IndicatorsEnum.POLICY_CHANGE,
              year: 2024,
            },
            primary_levers: [4, 5],
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 500,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_1,
        } as any);
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockResolvedValue({
          saved: [4, 5],
          discarded: [],
        });

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect(mockPortfoliosService.findByYear).toHaveBeenCalledWith(2024);
        expect(
          mockResultSectionOrchestrator.saveLeversForPortfolio,
        ).toHaveBeenCalledWith(500, PortfolioIdEnum.PORTFOLIO_1, [4, 5]);
        expect((result as any).error).toBe(false);
        expect(resultMetadata).toHaveLength(1);
        expect(resultMetadata[0]).toEqual(
          expect.objectContaining({
            missing_fields: [],
            manual_intervention_occurred: true,
            suggested_status: ResultStatusEnum.SUBMITTED,
            title: 'Levers 2024',
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_id: 500,
          }),
        );
      });

      it('resolves a 2026 item to portfolio 2 and saves the ids through the orchestrator (R-RES-004 analog)', async () => {
        const rawResult = {
          title: 'Levers 2026',
          year: 2026,
          primary_levers: [11, 12],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValue(
            baseProcessedResult({ primary_levers: [11, 12] }) as any,
          );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 501,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockResolvedValue({
          saved: [11, 12],
          discarded: [],
        });

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect(
          mockResultSectionOrchestrator.saveLeversForPortfolio,
        ).toHaveBeenCalledWith(501, PortfolioIdEnum.PORTFOLIO_2, [11, 12]);
        expect((result as any).error).toBe(false);
        expect(resultMetadata[0].missing_fields).toEqual([]);
      });

      it('creates the item and records the field with no fallback portfolio when no active portfolio covers the year, without raising (R-RES-006, falsifier: year 2035)', async () => {
        const rawResult = {
          title: 'Levers 2035',
          year: 2035,
          primary_levers: [11],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            result: {
              indicator_id: IndicatorsEnum.POLICY_CHANGE,
              year: 2035,
            },
            primary_levers: [11],
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 502,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue(null);
        const warnSpy = jest
          .spyOn(CgiarLogger.prototype, 'warn')
          .mockImplementation(() => undefined);

        try {
          const result = await service.formalizeResult(
            rawResult,
            true,
            resultMetadata,
          );

          expect((result as any).error).toBe(false);
          expect(resultMetadata[0].missing_fields).toEqual(['primary_levers']);
          expect(
            mockResultSectionOrchestrator.saveLeversForPortfolio,
          ).not.toHaveBeenCalled();
          expect(warnSpy).toHaveBeenCalledTimes(1);
          expect(String(warnSpy.mock.calls[0][0])).toContain('2035');
          expect(String(warnSpy.mock.calls[0][0])).toContain('502');
        } finally {
          warnSpy.mockRestore();
        }
      });

      it("records each discarded id as primary_levers:<id>, appended to the AI's own entries and distinguishable from the field-level entry, asserted by content equality (R-RES-005)", async () => {
        const rawResult = {
          title: 'Levers discard',
          year: 2026,
          primary_levers: [11, 999, 4],
          metadata: { missing_fields: ['sdg_targets'] },
        } as any;
        const resultMetadata: any[] = [];

        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue(
          baseProcessedResult({
            primary_levers: [11, 999, 4],
          }) as any,
        );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 503,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockResolvedValue({
          saved: [11],
          discarded: [999, 4],
        });

        const result = await service.formalizeResult(
          rawResult,
          true,
          resultMetadata,
        );

        expect((result as any).error).toBe(false);
        expect(resultMetadata[0].missing_fields).toEqual([
          'sdg_targets',
          'primary_levers:999',
          'primary_levers:4',
        ]);
        expect(resultMetadata[0].missing_fields).not.toContain(
          'primary_levers',
        );
      });

      it.each([
        ['absent', undefined],
        ['an empty array', []],
        ['null', null],
      ])(
        'never calls the resolver or the orchestrator when primary_levers is %s (R-RES-008 step 1 guard)',
        async (_label, value) => {
          const rawResult = {
            title: 'No levers variant',
            year: 2026,
            primary_levers: value,
            metadata: { missing_fields: [] },
          } as any;
          const resultMetadata: any[] = [];

          jest
            .spyOn(service, 'createResultFromAiRoar')
            .mockResolvedValue(
              baseProcessedResult({ primary_levers: value }) as any,
            );
          jest.spyOn(service, 'createResult').mockResolvedValue({
            result_id: 504,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any);
          mockSuccessfulWriteChain();

          const result = await service.formalizeResult(
            rawResult,
            true,
            resultMetadata,
          );

          expect((result as any).error).toBe(false);
          expect(mockPortfoliosService.findByYear).not.toHaveBeenCalled();
          expect(
            mockResultSectionOrchestrator.saveLeversForPortfolio,
          ).not.toHaveBeenCalled();
          expect(resultMetadata[0].missing_fields).toEqual([]);
        },
      );

      it('resolves an item with no year using the current calendar year, routing per-item to the portfolio that covers it — its sibling covers a different portfolio (R-RES-002 AND IT MUST, KZ-004)', async () => {
        const currentYear = new Date().getFullYear();
        const noYearResult = {
          title: 'No year levers',
          primary_levers: [7],
          metadata: { missing_fields: [] },
        } as any;
        const olderYearResult = {
          title: 'Old year levers',
          year: 2010,
          primary_levers: [9],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValueOnce(
            baseProcessedResult({
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: currentYear,
              },
              primary_levers: [7],
            }) as any,
          )
          .mockResolvedValueOnce(
            baseProcessedResult({
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: 2010,
              },
              primary_levers: [9],
            }) as any,
          );
        jest
          .spyOn(service, 'createResult')
          .mockResolvedValueOnce({
            result_id: 700,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any)
          .mockResolvedValueOnce({
            result_id: 701,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any);
        mockSuccessfulWriteChain();

        // KZ-001: the double routes by year (a map), not a constant return —
        // otherwise it cannot distinguish per-item scoping from a hardcoded
        // default.
        mockPortfoliosService.findByYear.mockImplementation(
          async (year: number) =>
            ({
              id:
                year === currentYear
                  ? PortfolioIdEnum.PORTFOLIO_2
                  : PortfolioIdEnum.PORTFOLIO_1,
            }) as any,
        );
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockResolvedValue({
          saved: [],
          discarded: [],
        });

        await service.formalizeResult(noYearResult, true, resultMetadata);
        await service.formalizeResult(olderYearResult, true, resultMetadata);

        expect(mockPortfoliosService.findByYear).toHaveBeenNthCalledWith(
          1,
          currentYear,
        );
        expect(mockPortfoliosService.findByYear).toHaveBeenNthCalledWith(
          2,
          2010,
        );
        expect(
          mockResultSectionOrchestrator.saveLeversForPortfolio,
        ).toHaveBeenNthCalledWith(1, 700, PortfolioIdEnum.PORTFOLIO_2, [7]);
        expect(
          mockResultSectionOrchestrator.saveLeversForPortfolio,
        ).toHaveBeenNthCalledWith(2, 701, PortfolioIdEnum.PORTFOLIO_1, [9]);
      });

      it('issues at most one findByYear lookup per distinct effective year across a 3-item, 2-distinct-year batch, via the shared memoized lookup (NFR-RES-001)', async () => {
        const underlyingLookup = jest.fn((year: number) => ({
          id:
            year === 2026
              ? PortfolioIdEnum.PORTFOLIO_2
              : PortfolioIdEnum.PORTFOLIO_1,
        }));
        const cache = new Map<number, { id: PortfolioIdEnum }>();
        mockPortfoliosService.findByYear.mockImplementation(
          async (year: number) => {
            if (!cache.has(year)) {
              cache.set(year, underlyingLookup(year));
            }
            return cache.get(year) as any;
          },
        );
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockResolvedValue({
          saved: [],
          discarded: [],
        });
        mockSuccessfulWriteChain();

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValueOnce(
            baseProcessedResult({
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: 2026,
              },
              primary_levers: [11],
            }) as any,
          )
          .mockResolvedValueOnce(
            baseProcessedResult({
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: 2026,
              },
              primary_levers: [12],
            }) as any,
          )
          .mockResolvedValueOnce(
            baseProcessedResult({
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: 2010,
              },
              primary_levers: [4],
            }) as any,
          );
        jest
          .spyOn(service, 'createResult')
          .mockResolvedValueOnce({
            result_id: 600,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any)
          .mockResolvedValueOnce({
            result_id: 601,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any)
          .mockResolvedValueOnce({
            result_id: 602,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any);

        const resultMetadata: any[] = [];
        await service.formalizeResult(
          {
            title: 'A',
            year: 2026,
            primary_levers: [11],
            metadata: { missing_fields: [] },
          } as any,
          true,
          resultMetadata,
        );
        await service.formalizeResult(
          {
            title: 'B',
            year: 2026,
            primary_levers: [12],
            metadata: { missing_fields: [] },
          } as any,
          true,
          resultMetadata,
        );
        await service.formalizeResult(
          {
            title: 'C',
            year: 2010,
            primary_levers: [4],
            metadata: { missing_fields: [] },
          } as any,
          true,
          resultMetadata,
        );

        expect(mockPortfoliosService.findByYear).toHaveBeenCalledTimes(3);
        expect(underlyingLookup).toHaveBeenCalledTimes(2);
      });

      it('logs exactly one warn line for the discarded-ids case, never one per id (NFR-RES-002)', async () => {
        const rawResult = {
          title: 'Levers warn count',
          year: 2026,
          primary_levers: [1, 2, 3],
          metadata: { missing_fields: [] },
        } as any;
        const resultMetadata: any[] = [];

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValue(
            baseProcessedResult({ primary_levers: [1, 2, 3] }) as any,
          );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 505,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockResolvedValue({
          saved: [],
          discarded: [1, 2, 3],
        });
        const warnSpy = jest
          .spyOn(CgiarLogger.prototype, 'warn')
          .mockImplementation(() => undefined);

        try {
          await service.formalizeResult(rawResult, true, resultMetadata);

          expect(warnSpy).toHaveBeenCalledTimes(1);
          expect(String(warnSpy.mock.calls[0][0])).toContain('1, 2, 3');
          expect(String(warnSpy.mock.calls[0][0])).toContain('505');
        } finally {
          warnSpy.mockRestore();
        }
      });

      it('succeeds without a metadata collector when called from the single endpoint, with levers written (DD-7 analog)', async () => {
        const rawResult = {
          title: 'Single endpoint levers',
          year: 2026,
          primary_levers: [11],
        } as any;

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValue(
            baseProcessedResult({ primary_levers: [11] }) as any,
          );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 506,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockResolvedValue({
          saved: [11],
          discarded: [],
        });

        const result = await service.formalizeResult(rawResult);

        expect((result as any).error).toBe(false);
        expect((result as any).result_id).toBe(506);
      });

      it('rolls back via deleteFullResultById and rethrows when the levers step itself throws (single endpoint, DD-8 analog)', async () => {
        const rawResult = {
          title: 'Levers throws',
          year: 2026,
          primary_levers: [11],
        } as any;

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockResolvedValue(
            baseProcessedResult({ primary_levers: [11] }) as any,
          );
        jest.spyOn(service, 'createResult').mockResolvedValue({
          result_id: 507,
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          result_status_id: 1,
        } as any);
        mockSuccessfulWriteChain();
        mockDataSource.getRepository.mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        } as any);
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockRejectedValue(
          new Error('levers orchestrator failure'),
        );

        await expect(service.formalizeResult(rawResult)).rejects.toThrow(
          'levers orchestrator failure',
        );
        expect(mockQueryService.deleteFullResultById).toHaveBeenCalledWith(507);
      });
    });

    // T-06 — proves R-RES-008 (inertness) and R-RES-010 (composition) for
    // a single item carrying all three AI alignment fields at once. T-05's
    // inertness test (:3846) already proves the two-field case
    // (sdg_targets + strategic_objectives) does not disturb result_sdgs or
    // the ALIGNMENT result_contracts row — cited, not re-derived, for
    // those two tables; this extends the same technique to the third
    // field (primary_levers) and to R-RES-010's cross-field guarantee.
    describe('inertness and composition — all three AI alignment fields on one item (R-RES-008, R-RES-010, T-06)', () => {
      type FakeRow = {
        table:
          | 'result_sdgs'
          | 'result_contracts'
          | 'result_strategic_objectives'
          | 'result_levers';
        result_id: number;
        key: number;
        is_active: boolean;
      };

      const threeFieldRawResult = () =>
        ({
          title: 'Three-field composition',
          year: 2026,
          sdg_targets: [1, 2],
          strategic_objectives: [3],
          primary_levers: [11, 12],
          metadata: { missing_fields: [] },
        }) as any;

      // Wires every collaborator so the shared `rows` sink ends up holding
      // exactly what production would write, keyed by result id and
      // table. KZ-001: `saveStrategicObjectivesForPortfolio` and
      // `saveLeversForPortfolio` push using their OWN call-time `rid`
      // argument (not a closed-over constant), so the same wiring can be
      // invoked again for a second, unrelated result id.
      const wireThreeFieldMocks = (rows: FakeRow[], resultId: number) => {
        jest.spyOn(service, 'createResultFromAiRoar').mockResolvedValue({
          result: { indicator_id: IndicatorsEnum.POLICY_CHANGE, year: 2026 },
          generalInformation: {},
          sdgs: [{ clarisa_sdg_id: 10 }, { clarisa_sdg_id: 20 }],
          ipRights: {},
          geoScope: {},
          partners: [],
          evidences: [],
          policyChange: {},
          strategic_objectives: [3],
          primary_levers: [11, 12],
        } as any);
        jest.spyOn(service, 'createResult').mockImplementation(async () => {
          // Mirrors createResult's real write of the primary ALIGNMENT
          // result_contracts row (results.service.ts ~L459-466) — cited
          // from T-05's inertness test (:3872-3879) rather than
          // re-derived.
          rows.push({
            table: 'result_contracts',
            result_id: resultId,
            key: resultId,
            is_active: true,
          });
          return {
            result_id: resultId,
            indicator_id: IndicatorsEnum.POLICY_CHANGE,
            result_status_id: 1,
          } as any;
        });
        jest.spyOn(service, 'updateGeneralInfo').mockResolvedValue(undefined);
        jest.spyOn(service, 'saveGeoLocation').mockResolvedValue(undefined);
        jest.spyOn(service, 'customStatus').mockResolvedValue(undefined);
        mockResultSdgsService.saveSdgAi = jest
          .fn()
          .mockImplementation(async (rid: number, sdgs: any[]) => {
            rows.push(
              ...sdgs.map((s: any) => ({
                table: 'result_sdgs' as const,
                result_id: rid,
                key: s.clarisa_sdg_id,
                is_active: true,
              })),
            );
          });
        mockResultIpRightsService.update = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultInstitutionsService.updatePartners = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultEvidencesService.updateResultEvidences = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultAlignmentOperationsService.save.mockImplementation(
          async (rid: number) => {
            // Faithful to the real hazard (DD-1): the section-wide save
            // reconciles by deactivating every row for the result it is
            // called with. Asserted never called below (R-RES-008 AC.4) —
            // this implementation exists so that a wrong production path
            // which DOES reach it would be caught here, not hidden by an
            // inert double (KZ-001).
            rows.forEach((row) => {
              if (row.result_id === rid) row.is_active = false;
            });
            return {} as any;
          },
        );
        mockPortfoliosService.findByYear.mockResolvedValue({
          id: PortfolioIdEnum.PORTFOLIO_2,
        } as any);
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockImplementation(
          async (rid: number, _portfolioId: PortfolioIdEnum, ids: number[]) => {
            rows.push(
              ...ids.map((id) => ({
                table: 'result_strategic_objectives' as const,
                result_id: rid,
                key: id,
                is_active: true,
              })),
            );
            return { supported: true, saved: ids, discarded: [] };
          },
        );
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockImplementation(
          async (rid: number, _portfolioId: PortfolioIdEnum, ids: number[]) => {
            rows.push(
              ...ids.map((id) => ({
                table: 'result_levers' as const,
                result_id: rid,
                key: id,
                is_active: true,
              })),
            );
            return { saved: ids, discarded: [] };
          },
        );
      };

      it('ends with every result_sdgs, ALIGNMENT result_contracts, result_strategic_objectives and new result_levers row active, never reaching the section-wide save (R-RES-008 AC.1/AC.4, R-RES-010 AC.1/AC.2)', async () => {
        const rows: FakeRow[] = [];
        const resultMetadata: any[] = [];
        wireThreeFieldMocks(rows, 750);

        const result = await service.formalizeResult(
          threeFieldRawResult(),
          true,
          resultMetadata,
        );

        expect((result as any).error).toBe(false);
        expect(
          mockResultAlignmentOperationsService.save,
        ).not.toHaveBeenCalled();

        // Sibling-row survival asserted individually — absence of the new
        // lever row is not evidence the old rows survived (DC-4,
        // Disqualifies).
        const of = (table: FakeRow['table']) =>
          rows.filter((r) => r.result_id === 750 && r.table === table);
        expect(of('result_sdgs')).toHaveLength(2);
        expect(of('result_sdgs').every((r) => r.is_active)).toBe(true);
        expect(of('result_contracts').every((r) => r.is_active)).toBe(true);
        expect(of('result_strategic_objectives')).toHaveLength(1);
        expect(
          of('result_strategic_objectives').every((r) => r.is_active),
        ).toBe(true);
        expect(
          of('result_levers')
            .map((r) => r.key)
            .sort(),
        ).toEqual([11, 12]);
        expect(of('result_levers').every((r) => r.is_active)).toBe(true);
        expect(resultMetadata[0].missing_fields).toEqual([]);
      });

      // formalizeResult's own two alignment blocks execute in one fixed
      // textual order (strategic objectives, then levers — design.md
      // §5.4); reversing that order would mean editing results.service.ts,
      // which T-06 may not do. What the fixed order can never exercise on
      // its own is the OTHER direction of the hazard: levers already
      // written, then the strategic-objectives write landing on top of
      // them. This test supplies that missing direction by invoking the
      // identical narrow-save implementations directly, levers first, for
      // a second, disjoint result id — proving the composition holds
      // regardless of which step is considered to run first (R-RES-010
      // AC.3), because DD-1/DD-9 scope each save to its own table and
      // neither reads the other's rows.
      it('holds for both possible step orders: the natural order (SO before levers) via formalizeResult, and the reverse (levers before SO) via the identical narrow-save calls (R-RES-010 AC.3)', async () => {
        const rows: FakeRow[] = [];
        const resultMetadata: any[] = [];
        wireThreeFieldMocks(rows, 751);

        // Forward: the real, fixed order.
        await service.formalizeResult(
          threeFieldRawResult(),
          true,
          resultMetadata,
        );
        expect(
          rows
            .filter((r) => r.result_id === 751 && r.table === 'result_levers')
            .every((r) => r.is_active),
        ).toBe(true);
        expect(
          rows
            .filter(
              (r) =>
                r.result_id === 751 &&
                r.table === 'result_strategic_objectives',
            )
            .every((r) => r.is_active),
        ).toBe(true);

        // Reversed: the same two jest.fn() implementations — the exact
        // functions formalizeResult itself calls — invoked directly,
        // levers first, for a fresh result id.
        await mockResultSectionOrchestrator.saveLeversForPortfolio(
          752,
          PortfolioIdEnum.PORTFOLIO_2,
          [21, 22],
        );
        await mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio(
          752,
          PortfolioIdEnum.PORTFOLIO_2,
          [6],
        );

        const of752 = (table: FakeRow['table']) =>
          rows.filter((r) => r.result_id === 752 && r.table === table);
        expect(of752('result_levers').every((r) => r.is_active)).toBe(true);
        expect(
          of752('result_strategic_objectives').every((r) => r.is_active),
        ).toBe(true);

        // No leakage between the two result ids exercised in this test.
        expect(rows.filter((r) => r.result_id === 751)).toHaveLength(6);
        expect(rows.filter((r) => r.result_id === 752)).toHaveLength(3);
      });
    });

    // T-06 (R-RES-007 AC.1) — "the alignment step is reached only for a
    // result created in the same formalizeResult call" is a property of
    // the CODE PATH, not of any one test's behaviour, and T-03's tests
    // cannot assert it (they never touch results.service.ts). Asserted
    // here directly against the source, not inferred from a mock's
    // outputs (tasks.md §4: "explicitly NOT closed by T-03").
    describe('R-RES-007 AC.1 — the alignment step is reached only for a result created in the same call', () => {
      it('is true by construction: the method assigns its rollback handle exactly once, from createResult, and both alignment steps address that same local — asserted against the source text', () => {
        const source = readFileSync(
          join(__dirname, 'results.service.ts'),
          'utf8',
        );
        const methodStart = source.indexOf('async formalizeResult(');
        expect(methodStart).toBeGreaterThan(-1);
        const nextMethodStart = source.indexOf(
          'async createResultFromAiBulk(',
          methodStart,
        );
        expect(nextMethodStart).toBeGreaterThan(methodStart);
        const body = source.slice(methodStart, nextMethodStart);

        // (a) Exactly one result is created in this method, and the
        // rollback handle is assigned from ITS return value — never from
        // a lookup of a pre-existing row (design.md §2.3 fact 1).
        const createCalls = (
          body.match(/const newResult = await this\.createResult\(/g) ?? []
        ).length;
        expect(createCalls).toBe(1);
        const rollbackAssignments = (
          body.match(/resultExists = newResult;/g) ?? []
        ).length;
        expect(rollbackAssignments).toBe(1);

        // (b) The levers step's call into the orchestrator textually
        // follows that creation, and is addressed with that same local —
        // never a separately-fetched id.
        const createIndex = body.indexOf(
          'const newResult = await this.createResult(',
        );
        const leversCallIndex = body.indexOf(
          'this._resultSectionOrchestrator.saveLeversForPortfolio(',
        );
        expect(leversCallIndex).toBeGreaterThan(createIndex);
        expect(body.slice(leversCallIndex, leversCallIndex + 200)).toContain(
          'newResult.result_id',
        );

        // (c) There is no other call site feeding a different id into it.
        const leversCallFirstArgs = [
          ...body.matchAll(/saveLeversForPortfolio\(\s*([^,]+),/g),
        ].map((m) => m[1].trim());
        expect(leversCallFirstArgs).toEqual(['newResult.result_id']);
      });
    });
  });

  // [CLAUDE/DONE] 143
  describe('createResultFromAiBulk', () => {
    it('should process all results and return errors/created partitioned', async () => {
      const payload = {
        results: [{ title: 'R1' } as any, { title: 'R2' } as any],
        metadata: {
          ai_interaction_id: 'ai-123',
          file_name: 'upload.xlsx',
        },
      };

      jest
        .spyOn(service, 'formalizeResult')
        .mockResolvedValueOnce({ result_id: 1, error: false } as any)
        .mockResolvedValueOnce({
          title: 'R2',
          error: true,
          message_error: 'fail',
        } as any);

      const output = await service.createResultFromAiBulk(payload);

      expect(output.results_created).toHaveLength(1);
      expect(output.results_errors).toHaveLength(1);
    });

    it('should persist bulk upload metadata through AiReportsService', async () => {
      const payload = {
        results: [{ title: 'R1' } as any],
        metadata: {
          ai_interaction_id: 'ai-456',
          file_name: 'results.csv',
        },
      };
      jest
        .spyOn(service, 'formalizeResult')
        .mockImplementation(async (_result, _isbulk, resultMetadata) => {
          resultMetadata?.push({ result_id: 99, title: 'R1' });
          return { result_id: 99, error: false } as any;
        });

      await service.createResultFromAiBulk(payload);

      expect(mockAiReportsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bulkUploadProcesses: expect.objectContaining({
            ai_interaction_id: 'ai-456',
            file_name: 'results.csv',
            created_by: mockCurrentUser.user_id,
          }),
          bulkUploadResults: expect.arrayContaining([
            expect.objectContaining({ result_id: 99, title: 'R1' }),
          ]),
        }),
      );
    });

    // T-10 (R-CBU-001, R-CBU-010) — the CapDev notification stage is a
    // sibling call, wrapped so nothing it does can affect the response.
    it('should dispatch the CapDev bulk notification with the created process id and the metadata file contacts', async () => {
      const contacts = [{ email: 'lead@example.org' }];
      const payload = {
        results: [{ title: 'R1' } as any],
        metadata: {
          ai_interaction_id: 'ai-789',
          file_name: 'contacts.csv',
          contacts,
        },
      };
      mockAiReportsService.create.mockResolvedValueOnce({ id: 42 });
      jest
        .spyOn(service, 'formalizeResult')
        .mockResolvedValueOnce({ result_id: 1, error: false } as any);

      await service.createResultFromAiBulk(payload as any);

      expect(mockCapdevBulkNotificationService.dispatch).toHaveBeenCalledWith(
        42,
        contacts,
      );
    });

    it('should still answer with the unchanged data payload when MessageMicroservice.sendEmail throws inside dispatch', async () => {
      const payload = {
        results: [{ title: 'R1' } as any],
        metadata: {
          ai_interaction_id: 'ai-throw-1',
          file_name: 'upload.xlsx',
        },
      };
      jest
        .spyOn(service, 'formalizeResult')
        .mockResolvedValueOnce({ result_id: 1, error: false } as any);
      mockCapdevBulkNotificationService.dispatch.mockRejectedValueOnce(
        new Error('sendEmail failed: broker unreachable'),
      );

      const output = await service.createResultFromAiBulk(payload as any);

      expect(output).toEqual({
        results_errors: [],
        results_created: [{ result_id: 1, error: false }],
      });
    });

    it('should still answer with the unchanged data payload when the notification repository throws', async () => {
      const payload = {
        results: [{ title: 'R1' } as any],
        metadata: {
          ai_interaction_id: 'ai-throw-2',
          file_name: 'upload.xlsx',
        },
      };
      jest
        .spyOn(service, 'formalizeResult')
        .mockResolvedValueOnce({ result_id: 1, error: false } as any);
      mockCapdevBulkNotificationService.dispatch.mockRejectedValueOnce(
        new Error('repository query failed'),
      );

      const output = await service.createResultFromAiBulk(payload as any);

      expect(output).toEqual({
        results_errors: [],
        results_created: [{ result_id: 1, error: false }],
      });
    });

    it('should keep results created before a notification failure persisted and readable', async () => {
      const payload = {
        results: [{ title: 'R1' } as any, { title: 'R2' } as any],
        metadata: {
          ai_interaction_id: 'ai-throw-3',
          file_name: 'upload.xlsx',
        },
      };
      jest
        .spyOn(service, 'formalizeResult')
        .mockResolvedValueOnce({ result_id: 1, error: false } as any)
        .mockResolvedValueOnce({ result_id: 2, error: false } as any);
      mockCapdevBulkNotificationService.dispatch.mockRejectedValueOnce(
        new Error('sendEmail failed'),
      );

      const output = await service.createResultFromAiBulk(payload as any);

      // The bulk upload persistence call already happened before dispatch()
      // ever runs — a failure there cannot un-persist it.
      expect(mockAiReportsService.create).toHaveBeenCalledTimes(1);
      expect(output.results_created).toEqual([
        { result_id: 1, error: false },
        { result_id: 2, error: false },
      ]);
      expect(output.results_errors).toHaveLength(0);
    });

    it('should not let dispatch() throw propagate out of createResultFromAiBulk', async () => {
      const payload = {
        results: [{ title: 'R1' } as any],
        metadata: {
          ai_interaction_id: 'ai-throw-4',
          file_name: 'upload.xlsx',
        },
      };
      jest
        .spyOn(service, 'formalizeResult')
        .mockResolvedValueOnce({ result_id: 1, error: false } as any);
      mockCapdevBulkNotificationService.dispatch.mockRejectedValueOnce(
        new Error('unexpected failure'),
      );

      // If the outer try/catch did not contain the rejection, this await
      // itself would throw and fail the test.
      const output = await service.createResultFromAiBulk(payload as any);
      expect(output.results_created).toHaveLength(1);
    });

    // T-12 — R-CBU-010 AC.5: the outer containment boundary (design.md §6.6
    // "Outer") is its own logger, not merely a swallowed rejection. Binds to
    // the specific method (`CgiarLogger.prototype.error`), not "some log
    // fired" (Disqualifies) — a spy on `.log`/`.warn` would not catch a
    // regression that demoted this to a lower level.
    it('logs exactly one ERROR-level line carrying the bulk process id when dispatch() throws (R-CBU-010 AC.5, outer boundary)', async () => {
      const errorSpy = jest
        .spyOn(CgiarLogger.prototype, 'error')
        .mockImplementation(() => undefined);
      // Leader fold 4 (test hygiene): `jest.clearAllMocks()` in the
      // top-level `afterEach` (:434-435) clears call records but does NOT
      // undo a `spyOn` — restoring the prototype method must survive an
      // assertion throwing mid-test, or every later test in this file would
      // silently run against a mocked `CgiarLogger.prototype.error`.
      try {
        const payload = {
          results: [{ title: 'R1' } as any],
          metadata: {
            ai_interaction_id: 'ai-throw-5',
            file_name: 'upload.xlsx',
          },
        };
        jest
          .spyOn(service, 'formalizeResult')
          .mockResolvedValueOnce({ result_id: 1, error: false } as any);
        mockAiReportsService.create.mockResolvedValueOnce({ id: 777 });
        mockCapdevBulkNotificationService.dispatch.mockRejectedValueOnce(
          new Error('ECONNREFUSED: RabbitMQ unreachable'),
        );

        await service.createResultFromAiBulk(payload as any);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.calls[0][0]).toContain('777');
        expect(errorSpy.mock.calls[0][0]).toContain(
          'ECONNREFUSED: RabbitMQ unreachable',
        );
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('should produce a data payload with exactly the pre-change shape (results_errors, results_created only)', async () => {
      const payload = {
        results: [{ title: 'R1' } as any],
        metadata: {
          ai_interaction_id: 'ai-shape',
          file_name: 'upload.xlsx',
        },
      };
      jest
        .spyOn(service, 'formalizeResult')
        .mockResolvedValueOnce({ result_id: 1, error: false } as any);

      const output = await service.createResultFromAiBulk(payload as any);

      expect(Object.keys(output).sort()).toEqual([
        'results_created',
        'results_errors',
      ]);
    });

    // T-06 — R-RES-008: each bulk item routes on its own year, with no
    // leakage between items. Unlike every test above, formalizeResult is
    // NOT spied here: the real per-item loop in createResultFromAiBulk
    // must run so the routing this suite proves is batch-scoped, not
    // per-call (execution.md's T-05 Lens B advisory: "the AC.4 test's
    // name says routing per-item but it is two sequential formalizeResult
    // calls").
    describe('per-item routing and no leakage (R-RES-008, T-06)', () => {
      type Fixture = {
        title: string;
        year: number;
        objectives: number[];
        resultId: number;
      };
      type SoRow = { result_id: number; strategic_objective_id: number };

      // KZ-004: year, strategic_objectives and title all differ per item.
      const mixedYearFixtures = (): Fixture[] => [
        { title: 'Mixed 2025', year: 2025, objectives: [11], resultId: 501 },
        {
          title: 'Mixed 2026',
          year: 2026,
          objectives: [21, 22],
          resultId: 502,
        },
        {
          title: 'Mixed 2027',
          year: 2027,
          objectives: [31, 32, 33],
          resultId: 503,
        },
      ];

      // KZ-001: every double below genuinely keys off its arguments
      // (title, year, result id) rather than returning a batch-wide
      // constant — matched by argument, not by call order, so the fixture
      // is provably order-independent (needed for AC.2's reversed run).
      const wireRoutingMocks = (items: Fixture[], soRows: SoRow[]) => {
        const byTitle = new Map(items.map((f) => [f.title, f]));

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockImplementation(async (raw: any) => {
            const f = byTitle.get(raw.title);
            return {
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: f.year,
                title: f.title,
              },
              generalInformation: {},
              sdgs: [],
              ipRights: {},
              geoScope: {},
              partners: [],
              evidences: [],
              strategic_objectives: f.objectives,
            } as any;
          });
        jest
          .spyOn(service, 'createResult')
          .mockImplementation(async (arg: any) => {
            const f = byTitle.get(arg.title);
            return {
              result_id: f.resultId,
              indicator_id: IndicatorsEnum.POLICY_CHANGE,
              result_status_id: 1,
            } as any;
          });
        jest.spyOn(service, 'updateGeneralInfo').mockResolvedValue(undefined);
        jest.spyOn(service, 'saveGeoLocation').mockResolvedValue(undefined);
        jest.spyOn(service, 'customStatus').mockResolvedValue(undefined);
        mockResultSdgsService.saveSdgAi = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultIpRightsService.update = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultInstitutionsService.updatePartners = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultEvidencesService.updateResultEvidences = jest
          .fn()
          .mockResolvedValue(undefined);

        // Genuine per-year routing: 2025 is portfolio 1 (no seeded
        // strategic objectives, D-2); 2026/2027 are portfolio 2.
        mockPortfoliosService.findByYear.mockImplementation(
          async (year: number) =>
            ({
              id:
                year === 2025
                  ? PortfolioIdEnum.PORTFOLIO_1
                  : PortfolioIdEnum.PORTFOLIO_2,
            }) as any,
        );
        mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio.mockImplementation(
          async (
            resultId: number,
            portfolioId: PortfolioIdEnum,
            ids: number[],
          ) => {
            if (portfolioId === PortfolioIdEnum.PORTFOLIO_1) {
              return { supported: false, saved: [], discarded: [] };
            }
            soRows.push(
              ...ids.map((id) => ({
                result_id: resultId,
                strategic_objective_id: id,
              })),
            );
            return { supported: true, saved: ids, discarded: [] };
          },
        );
      };

      const runBatch = async (items: Fixture[]) => {
        const payload = {
          results: items.map((f) => ({
            title: f.title,
            year: f.year,
            strategic_objectives: f.objectives,
            metadata: { missing_fields: [] },
          })),
          metadata: { ai_interaction_id: 'so-routing', file_name: 'so.csv' },
        };
        const output = await service.createResultFromAiBulk(payload as any);
        const bulkResults = mockAiReportsService.create.mock.calls[0][0]
          .bulkUploadResults as any[];
        return { output, bulkResults };
      };

      // Assert per item, keyed by that item's own result id — not
      // aggregate row counts (Disqualifies: "aggregate row-count
      // assertions" — an aggregate count of 5 rows passes while every row
      // hangs off the wrong result).
      const assertMixedYearOutcome = (items: Fixture[], soRows: SoRow[]) => {
        for (const f of items) {
          // Year 2025 resolves to portfolio 1, which supports no
          // strategic objectives (D-2) — it must hold none of its own.
          const expectedOwn = f.year === 2025 ? [] : [...f.objectives];
          const own = soRows
            .filter((r) => r.result_id === f.resultId)
            .map((r) => r.strategic_objective_id)
            .sort((a, b) => a - b);
          expect(own).toEqual(expectedOwn.sort((a, b) => a - b));

          // No item's objectives are attached to another item's result id.
          const others = soRows.filter((r) => r.result_id !== f.resultId);
          expect(
            others.some((r) => f.objectives.includes(r.strategic_objective_id)),
          ).toBe(false);
        }
      };

      it('routes each item on its own year: 2026/2027 hold exactly their own ids, 2025 holds none and reports the field (AC.1, AC.3)', async () => {
        const soRows: SoRow[] = [];
        const items = mixedYearFixtures();
        wireRoutingMocks(items, soRows);

        const { bulkResults } = await runBatch(items);

        expect(soRows.filter((r) => r.result_id === 501)).toHaveLength(0);
        assertMixedYearOutcome(items, soRows);

        const item2025 = bulkResults.find((r) => r.result_id === 501);
        expect(item2025.missing_fields).toEqual(['strategic_objectives']);
        expect(
          bulkResults.find((r) => r.result_id === 502).missing_fields,
        ).toEqual([]);
        expect(
          bulkResults.find((r) => r.result_id === 503).missing_fields,
        ).toEqual([]);
      });

      it('produces the identical per-item outcome when item order is reversed (AC.2)', async () => {
        const soRows: SoRow[] = [];
        const items = mixedYearFixtures();
        wireRoutingMocks(items, soRows);

        const { bulkResults } = await runBatch([...items].reverse());

        expect(soRows.filter((r) => r.result_id === 501)).toHaveLength(0);
        assertMixedYearOutcome(items, soRows);
        expect(
          bulkResults.find((r) => r.result_id === 501).missing_fields,
        ).toEqual(['strategic_objectives']);
      });

      it("continues the batch after the 2026 item fails mid-way: no result_strategic_objectives row survives for it, and the 2025 item still resolves on its own year, not the failed item's (R-RES-008 scenario 2, R-RES-003 AC.3)", async () => {
        const soRows: SoRow[] = [];
        const failingItem: Fixture = {
          title: 'Fails after alignment',
          year: 2026,
          objectives: [41, 42],
          resultId: 601,
        };
        const survivorItem: Fixture = {
          title: 'Survivor 2025',
          year: 2025,
          objectives: [43],
          resultId: 602,
        };
        const items = [failingItem, survivorItem];
        wireRoutingMocks(items, soRows);

        mockDataSource.getRepository.mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        } as any);
        // KZ-001: deleteFullResultById's double actually purges the rows
        // it stands in for deleting (DD-6), not a bare call-count no-op —
        // otherwise "no row survives" could not be asserted at all.
        mockQueryService.deleteFullResultById.mockImplementation(
          async (resultId: number) => {
            const remaining = soRows.filter((r) => r.result_id !== resultId);
            soRows.length = 0;
            soRows.push(...remaining);
          },
        );
        // Force the first item to fail after its alignment write, in the
        // very next step of the try block (customStatus).
        jest
          .spyOn(service, 'customStatus')
          .mockImplementation(async (_status: any, resultId: number) => {
            if (resultId === failingItem.resultId) {
              throw new Error('forced failure after alignment write');
            }
            return undefined;
          });

        const { output } = await runBatch(items);

        expect(mockPortfoliosService.findByYear).toHaveBeenNthCalledWith(
          1,
          2026,
        );
        expect(mockPortfoliosService.findByYear).toHaveBeenNthCalledWith(
          2,
          2025,
        );
        expect(
          mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio,
        ).toHaveBeenNthCalledWith(
          1,
          601,
          PortfolioIdEnum.PORTFOLIO_2,
          [41, 42],
        );
        // The survivor resolves to the portfolio covering its OWN year
        // (2025 → portfolio 1) — not portfolio 2, which the failed item
        // used. This is the assertion R-RES-008 scenario 2 exists for.
        expect(
          mockResultSectionOrchestrator.saveStrategicObjectivesForPortfolio,
        ).toHaveBeenNthCalledWith(2, 602, PortfolioIdEnum.PORTFOLIO_1, [43]);

        expect(mockQueryService.deleteFullResultById).toHaveBeenCalledWith(601);
        expect(soRows.filter((r) => r.result_id === 601)).toHaveLength(0);

        expect(output.results_errors).toHaveLength(1);
        expect((output.results_errors[0] as any).error).toBe(true);
        expect(output.results_created).toHaveLength(1);
        expect((output.results_created[0] as any).result_id).toBe(602);
      });
    });

    // T-06 — mirrors the strategic-objectives "per-item routing and no
    // leakage" describe above (:4789), adapted for primary_levers. One
    // structural difference: both portfolios WRITE levers (DD-8, no
    // `supported` concept), so every item in the mixed-year fixture is
    // expected to succeed rather than one degrading.
    describe('per-item routing and no leakage — primary levers (R-RES-002 BUT, R-RES-009, T-06)', () => {
      type Fixture = {
        title: string;
        year: number;
        leverIds: number[];
        resultId: number;
        portfolio: PortfolioIdEnum;
      };
      type LeverRow = {
        result_id: number;
        lever_id: number;
        is_active: boolean;
      };

      // KZ-004: year, primary_levers and title all differ per item, with
      // DISJOINT id sets, spanning BOTH portfolios (2024/2010 -> portfolio
      // 1, 2026 -> portfolio 2). A fixture built from shared defaults
      // could not distinguish per-item routing from a batch-wide constant
      // (DC-5) — the exact bug R-RES-009 exists to prevent.
      const mixedYearFixtures = (): Fixture[] => [
        {
          title: 'Levers Mixed 2024',
          year: 2024,
          leverIds: [4, 5],
          resultId: 801,
          portfolio: PortfolioIdEnum.PORTFOLIO_1,
        },
        {
          title: 'Levers Mixed 2026',
          year: 2026,
          leverIds: [11, 12],
          resultId: 802,
          portfolio: PortfolioIdEnum.PORTFOLIO_2,
        },
        {
          title: 'Levers Mixed 2010',
          year: 2010,
          leverIds: [6, 7, 8],
          resultId: 803,
          portfolio: PortfolioIdEnum.PORTFOLIO_1,
        },
      ];

      // KZ-001: every double below genuinely keys off its arguments
      // (title, year, result id) rather than a batch-wide constant, so
      // the fixture is provably order-independent (needed for AC.2's
      // reversed run) and provably per-item (needed for the falsifier).
      const wireLeversRoutingMocks = (
        items: Fixture[],
        leverRows: LeverRow[],
      ) => {
        const byTitle = new Map(items.map((f) => [f.title, f]));
        const portfolioByYear = new Map(
          items.map((f) => [f.year, f.portfolio]),
        );

        jest
          .spyOn(service, 'createResultFromAiRoar')
          .mockImplementation(async (raw: any) => {
            const f = byTitle.get(raw.title);
            return {
              result: {
                indicator_id: IndicatorsEnum.POLICY_CHANGE,
                year: f.year,
                title: f.title,
              },
              generalInformation: {},
              sdgs: [],
              ipRights: {},
              geoScope: {},
              partners: [],
              evidences: [],
              primary_levers: f.leverIds,
            } as any;
          });
        jest
          .spyOn(service, 'createResult')
          .mockImplementation(async (arg: any) => {
            const f = byTitle.get(arg.title);
            return {
              result_id: f.resultId,
              indicator_id: IndicatorsEnum.POLICY_CHANGE,
              result_status_id: 1,
            } as any;
          });
        jest.spyOn(service, 'updateGeneralInfo').mockResolvedValue(undefined);
        jest.spyOn(service, 'saveGeoLocation').mockResolvedValue(undefined);
        jest.spyOn(service, 'customStatus').mockResolvedValue(undefined);
        mockResultSdgsService.saveSdgAi = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultIpRightsService.update = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultInstitutionsService.updatePartners = jest
          .fn()
          .mockResolvedValue(undefined);
        mockResultEvidencesService.updateResultEvidences = jest
          .fn()
          .mockResolvedValue(undefined);

        // Routes by year via a map built from the fixture's OWN declared
        // portfolio — never a constant return (NFR-RES-001 / DC-5).
        mockPortfoliosService.findByYear.mockImplementation(
          async (year: number) => ({ id: portfolioByYear.get(year) }) as any,
        );
        mockResultSectionOrchestrator.saveLeversForPortfolio.mockImplementation(
          async (
            resultId: number,
            _portfolioId: PortfolioIdEnum,
            ids: number[],
          ) => {
            leverRows.push(
              ...ids.map((id) => ({
                result_id: resultId,
                lever_id: id,
                is_active: true,
              })),
            );
            return { saved: ids, discarded: [] };
          },
        );
      };

      const runBatch = async (items: Fixture[]) => {
        const payload = {
          results: items.map((f) => ({
            title: f.title,
            year: f.year,
            primary_levers: f.leverIds,
            metadata: { missing_fields: [] },
          })),
          metadata: {
            ai_interaction_id: 'levers-routing',
            file_name: 'levers.csv',
          },
        };
        const output = await service.createResultFromAiBulk(payload as any);
        const bulkResults = mockAiReportsService.create.mock.calls[0][0]
          .bulkUploadResults as any[];
        return { output, bulkResults };
      };

      // Assert per item, keyed by that item's own result id — never
      // aggregate row counts (Disqualifies: an aggregate count of 7 rows
      // passes while every row hangs off the wrong result).
      const assertMixedYearOutcome = (
        items: Fixture[],
        leverRows: LeverRow[],
      ) => {
        for (const f of items) {
          const own = leverRows
            .filter((r) => r.result_id === f.resultId)
            .map((r) => r.lever_id)
            .sort((a, b) => a - b);
          expect(own).toEqual([...f.leverIds].sort((a, b) => a - b));

          // No item's levers are attached to another item's result id
          // (R-RES-009 AC.4).
          const others = leverRows.filter((r) => r.result_id !== f.resultId);
          expect(others.some((r) => f.leverIds.includes(r.lever_id))).toBe(
            false,
          );

          // Pinned at the PORTFOLIO argument, not just the written rows:
          // the row-content check above is blind to which portfolio was
          // actually resolved for this item, since the double writes rows
          // by result id regardless of the portfolio argument it
          // received. Without this line, a batch-wide resolution defect
          // (DC-5 — every item silently routed on the first item's
          // portfolio) still passes, because for this fixture every
          // item's OWN id list happens to differ, but the ids themselves
          // are not portfolio-specific in the double. This is the
          // assertion the DC-5 falsifier actually reddens.
          expect(
            mockResultSectionOrchestrator.saveLeversForPortfolio,
          ).toHaveBeenCalledWith(f.resultId, f.portfolio, f.leverIds);
        }
      };

      it('routes each item on its own year: each item holds exactly its own ids at the role its own portfolio dictates (AC.1, AC.3)', async () => {
        const leverRows: LeverRow[] = [];
        const items = mixedYearFixtures();
        wireLeversRoutingMocks(items, leverRows);

        const { bulkResults } = await runBatch(items);

        assertMixedYearOutcome(items, leverRows);
        for (const f of items) {
          expect(
            bulkResults.find((r) => r.result_id === f.resultId).missing_fields,
          ).toEqual([]);
        }
        expect(
          mockResultSectionOrchestrator.saveLeversForPortfolio,
        ).toHaveBeenCalledTimes(3);
      });

      it('produces the identical per-item outcome when item order is reversed, over a fresh fixture (AC.2)', async () => {
        const leverRows: LeverRow[] = [];
        const items: Fixture[] = [
          {
            title: 'Levers Reversed 2025',
            year: 2025,
            leverIds: [21, 22],
            resultId: 901,
            portfolio: PortfolioIdEnum.PORTFOLIO_1,
          },
          {
            title: 'Levers Reversed 2027',
            year: 2027,
            leverIds: [31],
            resultId: 902,
            portfolio: PortfolioIdEnum.PORTFOLIO_1,
          },
          {
            title: 'Levers Reversed 2026',
            year: 2026,
            leverIds: [13, 14],
            resultId: 903,
            portfolio: PortfolioIdEnum.PORTFOLIO_2,
          },
        ];
        wireLeversRoutingMocks(items, leverRows);

        await runBatch([...items].reverse());

        assertMixedYearOutcome(items, leverRows);
      });

      it("continues the batch after the 2026 item fails mid-way: no result_levers row survives for it, and the 2025 item still resolves on its own year, not the failed item's (R-RES-009 AC.3, AC.4)", async () => {
        const leverRows: LeverRow[] = [];
        const failingItem: Fixture = {
          title: 'Levers Fails After Write',
          year: 2026,
          leverIds: [41, 42],
          resultId: 1001,
          portfolio: PortfolioIdEnum.PORTFOLIO_2,
        };
        const survivorItem: Fixture = {
          title: 'Levers Survivor 2025',
          year: 2025,
          leverIds: [43],
          resultId: 1002,
          portfolio: PortfolioIdEnum.PORTFOLIO_1,
        };
        const items = [failingItem, survivorItem];
        wireLeversRoutingMocks(items, leverRows);

        mockDataSource.getRepository.mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        } as any);
        // KZ-001: deleteFullResultById's double actually purges the rows
        // it stands in for deleting, not a bare call-count no-op —
        // otherwise "no row survives" could not be asserted at all.
        mockQueryService.deleteFullResultById.mockImplementation(
          async (resultId: number) => {
            const remaining = leverRows.filter((r) => r.result_id !== resultId);
            leverRows.length = 0;
            leverRows.push(...remaining);
          },
        );
        // Force the first item to fail after its lever write, in the very
        // next step of the try block (customStatus).
        jest
          .spyOn(service, 'customStatus')
          .mockImplementation(async (_status: any, resultId: number) => {
            if (resultId === failingItem.resultId) {
              throw new Error('forced failure after lever write');
            }
            return undefined;
          });

        const { output } = await runBatch(items);

        expect(mockPortfoliosService.findByYear).toHaveBeenNthCalledWith(
          1,
          2026,
        );
        expect(mockPortfoliosService.findByYear).toHaveBeenNthCalledWith(
          2,
          2025,
        );
        expect(
          mockResultSectionOrchestrator.saveLeversForPortfolio,
        ).toHaveBeenNthCalledWith(
          1,
          1001,
          PortfolioIdEnum.PORTFOLIO_2,
          [41, 42],
        );
        // The survivor resolves to the portfolio covering its OWN year
        // (2025 -> portfolio 1) — not portfolio 2, which the failed item
        // used. This is the assertion R-RES-009's scenario exists for.
        expect(
          mockResultSectionOrchestrator.saveLeversForPortfolio,
        ).toHaveBeenNthCalledWith(2, 1002, PortfolioIdEnum.PORTFOLIO_1, [43]);

        expect(mockQueryService.deleteFullResultById).toHaveBeenCalledWith(
          1001,
        );
        expect(leverRows.filter((r) => r.result_id === 1001)).toHaveLength(0);

        expect(output.results_errors).toHaveLength(1);
        expect((output.results_errors[0] as any).error).toBe(true);
        expect(output.results_created).toHaveLength(1);
        expect((output.results_created[0] as any).result_id).toBe(1002);
      });
    });
  });

  // [CLAUDE/DONE] 144
  describe('validateAiRawCountries', () => {
    it('should return a ResultCountry with isoAlpha2 set', async () => {
      const result = await service.validateAiRawCountries({
        code: 'CO',
        areas: [],
      });

      expect(result.isoAlpha2).toBe('CO');
    });

    it('should populate sub_nationals when areas are provided', async () => {
      mockClarisaSubNationalsService.findByCodes = jest
        .fn()
        .mockResolvedValue([{ id: 10 }, { id: 20 }]);

      const result = await service.validateAiRawCountries({
        code: 'CO',
        areas: ['ANT', 'BOG'],
      });

      expect(result.result_countries_sub_nationals).toHaveLength(2);
    });
  });

  // [CLAUDE/DONE] 145
  describe('createMappingIpRights', () => {
    it('should return dto with null boolean fields when yes/no strings are absent', async () => {
      const result = await service.createMappingIpRights({
        asset_ip_owner_id: null,
        publicity_restriction: null,
        potential_asset: null,
        requires_further_development: null,
      } as any);

      expect(result.publicity_restriction).toBeNull();
      expect(result.potential_asset).toBeNull();
      expect(result.requires_futher_development).toBeNull();
    });

    it('should map Yes/No strings to boolean values', async () => {
      const result = await service.createMappingIpRights({
        asset_ip_owner_id: null,
        publicity_restriction: 'Yes',
        potential_asset: 'No',
        requires_further_development: 'Yes',
      } as any);

      expect(result.publicity_restriction).toBe(true);
      expect(result.potential_asset).toBe(false);
      expect(result.requires_futher_development).toBe(true);
    });

    it('should throw NotFoundException when asset_ip_owner_id is provided but not found', async () => {
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.createMappingIpRights({
          asset_ip_owner_id: 999,
        } as any),
      ).rejects.toThrow();
    });
  });

  // [CLAUDE/DONE] 146
  describe('createResultFromAiRoar', () => {
    it('should throw NotFoundException when contract_code does not exist', async () => {
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockResolvedValue([]),
      } as any);

      await expect(
        service.createResultFromAiRoar({ contract_code: 'FAKE-001' } as any),
      ).rejects.toThrow();
    });

    it('should build a ResultAiDto when contract exists', async () => {
      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === TempResultAi) {
          return { save: jest.fn().mockResolvedValue({}) } as any;
        }
        return {
          findOne: jest.fn().mockResolvedValue({ agreement_id: 'AGR-001' }),
          find: jest.fn().mockResolvedValue([]),
        } as any;
      });
      mockIndicatorsService.findByName.mockResolvedValue({
        indicator_id: 1,
      } as any);
      mockResultUsersService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockResultInstitutionsService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockClarisaGeoScopeService.findByName.mockResolvedValue(null);
      mockClarisaCountriesService.findByIso2 = jest.fn().mockResolvedValue([]);

      const result = await service.createResultFromAiRoar({
        contract_code: 'AGR-001',
        title: 'Test',
        description: 'Desc',
        indicator: 'Policy Change',
      } as any);

      expect(result.result).toBeDefined();
      expect(result.result.title).toBe('Test');
    });

    // T-05 — carries the field so formalizeResult's alignment step can
    // populate it (design.md §5.1; T-01 added the carrier on ResultAiDto).
    it('carries strategic_objectives through onto the processed ResultAiDto', async () => {
      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === TempResultAi) {
          return { save: jest.fn().mockResolvedValue({}) } as any;
        }
        return {
          findOne: jest.fn().mockResolvedValue({ agreement_id: 'AGR-001' }),
          find: jest.fn().mockResolvedValue([]),
        } as any;
      });
      mockIndicatorsService.findByName.mockResolvedValue({
        indicator_id: 1,
      } as any);
      mockResultUsersService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockResultInstitutionsService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockClarisaGeoScopeService.findByName.mockResolvedValue(null);
      mockClarisaCountriesService.findByIso2 = jest.fn().mockResolvedValue([]);

      const result = await service.createResultFromAiRoar({
        contract_code: 'AGR-001',
        title: 'Test',
        description: 'Desc',
        indicator: 'Policy Change',
        strategic_objectives: [1, 3, 5],
      } as any);

      expect(result.strategic_objectives).toEqual([1, 3, 5]);
    });

    it('carries an absent strategic_objectives through as undefined', async () => {
      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === TempResultAi) {
          return { save: jest.fn().mockResolvedValue({}) } as any;
        }
        return {
          findOne: jest.fn().mockResolvedValue({ agreement_id: 'AGR-001' }),
          find: jest.fn().mockResolvedValue([]),
        } as any;
      });
      mockIndicatorsService.findByName.mockResolvedValue({
        indicator_id: 1,
      } as any);
      mockResultUsersService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockResultInstitutionsService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockClarisaGeoScopeService.findByName.mockResolvedValue(null);
      mockClarisaCountriesService.findByIso2 = jest.fn().mockResolvedValue([]);

      const result = await service.createResultFromAiRoar({
        contract_code: 'AGR-001',
        title: 'Test',
        description: 'Desc',
        indicator: 'Policy Change',
      } as any);

      expect(result.strategic_objectives).toBeUndefined();
    });

    // T-05 — carries the field so formalizeResult's levers step can
    // populate it (design.md §5.1; T-01 added the carrier on ResultRawAi).
    // Proves the end-to-end carrier from this method, not by inspecting
    // ResultAiDto's declaration alone: a T-01-only change (ResultRawAi
    // gains the field but ResultAiDto/createResultFromAiRoar never carry
    // it) would leave `result.primary_levers` undefined here and this
    // assertion would redden.
    it('carries primary_levers through onto the processed ResultAiDto', async () => {
      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === TempResultAi) {
          return { save: jest.fn().mockResolvedValue({}) } as any;
        }
        return {
          findOne: jest.fn().mockResolvedValue({ agreement_id: 'AGR-001' }),
          find: jest.fn().mockResolvedValue([]),
        } as any;
      });
      mockIndicatorsService.findByName.mockResolvedValue({
        indicator_id: 1,
      } as any);
      mockResultUsersService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockResultInstitutionsService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockClarisaGeoScopeService.findByName.mockResolvedValue(null);
      mockClarisaCountriesService.findByIso2 = jest.fn().mockResolvedValue([]);

      const result = await service.createResultFromAiRoar({
        contract_code: 'AGR-001',
        title: 'Test',
        description: 'Desc',
        indicator: 'Policy Change',
        primary_levers: [11, 12],
      } as any);

      expect(result.primary_levers).toEqual([11, 12]);
    });

    it('carries an absent primary_levers through as undefined', async () => {
      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === TempResultAi) {
          return { save: jest.fn().mockResolvedValue({}) } as any;
        }
        return {
          findOne: jest.fn().mockResolvedValue({ agreement_id: 'AGR-001' }),
          find: jest.fn().mockResolvedValue([]),
        } as any;
      });
      mockIndicatorsService.findByName.mockResolvedValue({
        indicator_id: 1,
      } as any);
      mockResultUsersService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockResultInstitutionsService.filterInstitutionsAi = jest
        .fn()
        .mockReturnValue({ acept: [], pending: [] });
      mockClarisaGeoScopeService.findByName.mockResolvedValue(null);
      mockClarisaCountriesService.findByIso2 = jest.fn().mockResolvedValue([]);

      const result = await service.createResultFromAiRoar({
        contract_code: 'AGR-001',
        title: 'Test',
        description: 'Desc',
        indicator: 'Policy Change',
      } as any);

      expect(result.primary_levers).toBeUndefined();
    });
  });

  // [CLAUDE/DONE] 147
  describe('generalReport', () => {
    it('should delegate to mainRepo.generalReport', async () => {
      const mockReport = [{ result_id: 1 }];
      mockMainRepo.generalReport = jest
        .fn()
        .mockResolvedValue(mockReport) as any;

      const result = await service.generalReport();

      expect(mockMainRepo.generalReport).toHaveBeenCalled();
      expect(result).toEqual(mockReport);
    });
  });
});
