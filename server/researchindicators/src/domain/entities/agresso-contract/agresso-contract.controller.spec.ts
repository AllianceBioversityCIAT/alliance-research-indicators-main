import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { AgressoContractController } from './agresso-contract.controller';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractStatus } from '../../shared/enum/agresso-contract.enum';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { OrderFieldsEnum } from './enum/order-fields.enum';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { AgressoFindNamePayload } from './dto/agresso-find-options.payload';
import { ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

// Mock ResponseUtils
jest.mock('../../shared/utils/response.utils', () => ({
  ResponseUtils: {
    format: jest.fn((params) => ({
      description: params.description,
      status: params.status,
      data: params.data,
    })),
  },
}));

describe('AgressoContractController', () => {
  let controller: AgressoContractController;
  let service: AgressoContractService;

  const mockAgressoContractService = {
    findContracts: jest.fn(),
    findByName: jest.fn(),
    findContractsResultByCurrentUser: jest.fn(),
    findContratResultByContractId: jest.fn(),
    findAgressoContracts: jest.fn(),
    setPoolFundingTag: jest.fn(),
    getGeoScopeReport: jest.fn(),
    getTopPartnersReport: jest.fn(),
    getTopContributorsReport: jest.fn(),
    getTopPrimaryLeversReport: jest.fn(),
    getTopMainContactPersonsReport: jest.fn(),
    getContractStaffReport: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgressoContractController],
      providers: [
        {
          provide: AgressoContractService,
          useValue: mockAgressoContractService,
        },
      ],
    }).compile();

    controller = module.get<AgressoContractController>(
      AgressoContractController,
    );
    service = module.get<AgressoContractService>(AgressoContractService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTopPrimaryLeversReport', () => {
    it('should return top primary levers report', async () => {
      const mockReport = {
        contract_id: 'A100',
        limit: 10,
        top_primary_levers: [
          {
            lever_id: 3,
            short_name: 'Lever 3',
            full_name: 'Climate Action',
            count: 6,
          },
        ],
      };

      mockAgressoContractService.getTopPrimaryLeversReport.mockResolvedValue(
        mockReport,
      );

      const result = await controller.getTopPrimaryLeversReport('A100', '10');

      expect(
        mockAgressoContractService.getTopPrimaryLeversReport,
      ).toHaveBeenCalledWith('A100', 10);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contract top primary levers report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
      expect(result).toEqual({
        description: 'Contract top primary levers report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
    });
  });

  describe('getTopContributorsReport', () => {
    it('should return top contributors report', async () => {
      const mockReport = {
        contract_id: 'A100',
        limit: 10,
        top_contributors: [
          {
            contract_id: 'B200',
            contract_description: 'Secondary project',
            project_name: 'Project B',
            count: 4,
          },
        ],
      };

      mockAgressoContractService.getTopContributorsReport.mockResolvedValue(
        mockReport,
      );

      const result = await controller.getTopContributorsReport('A100', '10');

      expect(
        mockAgressoContractService.getTopContributorsReport,
      ).toHaveBeenCalledWith('A100', 10);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contract top contributors report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
      expect(result).toEqual({
        description: 'Contract top contributors report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
    });
  });

  describe('getTopMainContactPersonsReport', () => {
    it('should return top main contact persons report for a contract', async () => {
      const mockReport = {
        contract_id: 'A100',
        limit: 10,
        top_main_contact_persons: [
          {
            user_id: '12345',
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane.doe@example.org',
            count: 5,
          },
        ],
      };

      mockAgressoContractService.getTopMainContactPersonsReport.mockResolvedValue(
        mockReport,
      );

      const result = await controller.getTopMainContactPersonsReport(
        'A100',
        '10',
      );

      expect(
        mockAgressoContractService.getTopMainContactPersonsReport,
      ).toHaveBeenCalledWith('A100', 10);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contract top main contact persons report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
      expect(result).toEqual({
        description: 'Contract top main contact persons report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
    });
  });

  describe('getContractStaffReport', () => {
    it('should return contract staff report', async () => {
      const mockReport = {
        contract_id: 'A100',
        staff: [
          { name: 'John Doe', role: 'Project Lead' },
          { name: 'Jane Smith', role: 'Program Assistant' },
        ],
      };

      mockAgressoContractService.getContractStaffReport.mockResolvedValue(
        mockReport,
      );

      const result = await controller.getContractStaffReport('A100');

      expect(
        mockAgressoContractService.getContractStaffReport,
      ).toHaveBeenCalledWith('A100');
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contract staff report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
      expect(result).toEqual({
        description: 'Contract staff report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
    });
  });

  describe('getTopPartnersReport', () => {
    it('should return top partners report for a contract', async () => {
      const mockReport = {
        contract_id: 'A100',
        limit: 10,
        top_partners: [
          {
            institution_id: 101,
            institution_name: 'Partner Org',
            acronym: 'PO',
            count: 5,
          },
        ],
      };

      mockAgressoContractService.getTopPartnersReport.mockResolvedValue(
        mockReport,
      );

      const result = await controller.getTopPartnersReport('A100', '10');

      expect(
        mockAgressoContractService.getTopPartnersReport,
      ).toHaveBeenCalledWith('A100', 10);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contract top partners report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
      expect(result).toEqual({
        description: 'Contract top partners report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
    });
  });

  describe('getGeoScopeReport', () => {
    it('should return geographic scope report for a contract', async () => {
      const mockReport = {
        contract_id: 'A100',
        limit: 10,
        geo_scope_summary: {
          global: 5,
          regional: 3,
          countries: 12,
          sub_national: 8,
          yet_to_be_determined: 1,
        },
        top_regions: [],
        top_countries: [],
      };

      mockAgressoContractService.getGeoScopeReport.mockResolvedValue(
        mockReport,
      );

      const result = await controller.getGeoScopeReport('A100', '10');

      expect(service.getGeoScopeReport).toHaveBeenCalledWith('A100', 10);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contract geographic scope report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
      expect(result).toEqual({
        description: 'Contract geographic scope report generated',
        status: HttpStatus.OK,
        data: mockReport,
      });
    });

    it('should use default limit when query param is not provided', async () => {
      mockAgressoContractService.getGeoScopeReport.mockResolvedValue({});

      await controller.getGeoScopeReport('A100', undefined);

      expect(service.getGeoScopeReport).toHaveBeenCalledWith('A100', undefined);
    });
  });

  describe('find', () => {
    it('should find contracts with all parameters', async () => {
      const mockContracts = [
        {
          agreement_id: 'TEST001',
          projectDescription: 'Test Project',
          contract_status: AgressoContractStatus.ONGOING,
        },
      ];

      mockAgressoContractService.findContracts.mockResolvedValue(mockContracts);

      const result = await controller.find(
        'PROJECT001',
        'FUNDING_TYPE',
        AgressoContractStatus.ONGOING,
        '1',
        '10',
        'true',
        TrueFalseEnum.TRUE,
      );

      expect(service.findContracts).toHaveBeenCalledWith(
        {
          agreement_id: 'PROJECT001',
          funding_type: 'FUNDING_TYPE',
          contract_status: AgressoContractStatus.ONGOING,
          is_pool_funding_contributor: true,
        },
        {
          limit: 10,
          page: 1,
        },
        {
          countries: 'true',
        },
      );

      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });

      expect(result).toEqual({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });
    });

    it('should find contracts with minimal parameters', async () => {
      const mockContracts = [];
      mockAgressoContractService.findContracts.mockResolvedValue(mockContracts);

      const result = await controller.find(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(service.findContracts).toHaveBeenCalledWith(
        {
          agreement_id: undefined,
          funding_type: undefined,
          contract_status: undefined,
          is_pool_funding_contributor: undefined,
        },
        {
          limit: NaN,
          page: NaN,
        },
        {
          countries: undefined,
        },
      );

      expect(result).toEqual({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });
    });
  });

  describe('findAgreementById', () => {
    it('should find contracts by name', async () => {
      const payload: AgressoFindNamePayload = {
        first_name: 'John',
        last_name: 'Doe',
      };

      const mockContracts = [
        {
          agreement_id: 'TEST001',
          project_lead_description: 'John Doe',
        },
      ];

      mockAgressoContractService.findByName.mockResolvedValue(mockContracts);

      const result = await controller.findAgreementById(payload);

      expect(service.findByName).toHaveBeenCalledWith('John', 'Doe');
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });

      expect(result).toEqual({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });
    });
  });

  describe('findContractsByCurrentUser', () => {
    it('should find contracts by current user', async () => {
      const mockContracts = [
        {
          agreement_id: 'USER001',
          projectDescription: 'User Project',
        },
      ];

      mockAgressoContractService.findContractsResultByCurrentUser.mockResolvedValue(
        mockContracts,
      );

      const result = await controller.findContractsByCurrentUser();

      expect(service.findContractsResultByCurrentUser).toHaveBeenCalled();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });

      expect(result).toEqual({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });
    });
  });

  describe('findContractsByContractId', () => {
    it('should find contracts by contract id', async () => {
      const contractId = 'CONTRACT123';
      const mockContract = {
        agreement_id: contractId,
        projectDescription: 'Test Contract',
      };

      mockAgressoContractService.findContratResultByContractId.mockResolvedValue(
        mockContract,
      );

      const result = await controller.findContractsByContractId(contractId);

      expect(service.findContratResultByContractId).toHaveBeenCalledWith(
        contractId,
      );
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContract,
      });

      expect(result).toEqual({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContract,
      });
    });
  });

  describe('findContracts', () => {
    it('should find agresso contracts with all filters', async () => {
      const mockContracts = [
        {
          agreement_id: 'TEST001',
          projectDescription: 'Filtered Project',
        },
      ];

      mockAgressoContractService.findAgressoContracts.mockResolvedValue(
        mockContracts,
      );

      const result = await controller.findContracts(
        TrueFalseEnum.TRUE,
        'CONTRACT001',
        'Test Project',
        'John Doe',
        ['1', '2'],
        [AgressoContractStatus.ONGOING, AgressoContractStatus.COMPLETED],
        '2023-01-01',
        '2023-12-31',
        OrderFieldsEnum.START_DATE,
        '1',
        '10',
        'test query',
        'DESC',
        undefined,
        TrueFalseEnum.TRUE,
        TrueFalseEnum.TRUE,
      );

      expect(service.findAgressoContracts).toHaveBeenCalledWith(
        TrueFalseEnum.TRUE,
        {
          contract_code: 'CONTRACT001',
          project_name: 'Test Project',
          principal_investigator: 'John Doe',
          lever: ['1', '2'],
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          status: [
            AgressoContractStatus.ONGOING,
            AgressoContractStatus.COMPLETED,
          ],
          exclude_pooled_funding: false,
          with_indicators: true,
          is_pool_funding_contributor: true,
        },
        OrderFieldsEnum.START_DATE,
        'DESC',
        { limit: 10, page: 1 },
        'test query',
      );

      expect(result).toEqual({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });
    });

    it('should find agresso contracts with minimal filters and default direction', async () => {
      const mockContracts = [];
      mockAgressoContractService.findAgressoContracts.mockResolvedValue(
        mockContracts,
      );

      const result = await controller.findContracts(
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        [],
        undefined,
        undefined,
        undefined,
        '1',
        '10',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(service.findAgressoContracts).toHaveBeenCalledWith(
        undefined,
        {
          contract_code: undefined,
          project_name: undefined,
          principal_investigator: undefined,
          lever: [],
          start_date: undefined,
          end_date: undefined,
          status: [],
          exclude_pooled_funding: false,
          with_indicators: true,
          is_pool_funding_contributor: undefined,
        },
        undefined,
        'ASC',
        { limit: 10, page: 1 },
        undefined,
      );

      expect(result).toEqual({
        description: 'Contracts found',
        status: HttpStatus.OK,
        data: mockContracts,
      });
    });

    it('should handle status mapping correctly', async () => {
      const mockContracts = [];
      mockAgressoContractService.findAgressoContracts.mockResolvedValue(
        mockContracts,
      );

      await controller.findContracts(
        TrueFalseEnum.FALSE,
        undefined,
        undefined,
        undefined,
        [],
        ['ongoing', 'completed'] as AgressoContractStatus[],
        undefined,
        undefined,
        undefined,
        '1',
        '10',
        undefined,
        'ASC',
        undefined,
        undefined,
        TrueFalseEnum.FALSE,
      );

      expect(service.findAgressoContracts).toHaveBeenCalledWith(
        TrueFalseEnum.FALSE,
        expect.objectContaining({
          is_pool_funding_contributor: false,
          status: [
            AgressoContractStatus.ONGOING,
            AgressoContractStatus.COMPLETED,
          ],
        }),
        undefined,
        'ASC',
        { limit: 10, page: 1 },
        undefined,
      );
    });

    it('should expose pool funding contributor query metadata for Swagger', () => {
      const parameters = Reflect.getMetadata(
        DECORATORS.API_PARAMETERS,
        controller.findContracts,
      );

      expect(parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            in: 'query',
            name: 'pool-funding-contributor',
            type: Boolean,
          }),
        ]),
      );
    });
  });

  describe('updatePoolFundingTag', () => {
    it('should update the pool funding contributor tag', async () => {
      const updatedContract = {
        agreement_id: 'BIL-001',
        is_pool_funding_contributor: true,
      };
      mockAgressoContractService.setPoolFundingTag.mockResolvedValue(
        updatedContract,
      );

      const result = await controller.updatePoolFundingTag('BIL-001', {
        is_pool_funding_contributor: true,
      });

      expect(service.setPoolFundingTag).toHaveBeenCalledWith('BIL-001', true);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Pool funding contributor tag updated',
        status: HttpStatus.OK,
        data: updatedContract,
      });
      expect(result).toEqual({
        description: 'Pool funding contributor tag updated',
        status: HttpStatus.OK,
        data: updatedContract,
      });
    });

    it('should declare CENTER_ADMIN and SYSTEM_ADMIN roles', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        controller.updatePoolFundingTag,
      );

      expect(roles).toEqual([
        SecRolesEnum.CENTER_ADMIN,
        SecRolesEnum.SYSTEM_ADMIN,
      ]);
    });

    it('should declare Swagger operation, param, and body metadata', () => {
      const operation = Reflect.getMetadata(
        DECORATORS.API_OPERATION,
        controller.updatePoolFundingTag,
      );
      const parameters = Reflect.getMetadata(
        DECORATORS.API_PARAMETERS,
        controller.updatePoolFundingTag,
      );
      const bodyParameter = parameters.find(
        (parameter) => parameter.in === 'body',
      );

      expect(operation).toMatchObject({
        summary: 'Update the pool funding contributor tag',
      });
      expect(parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            in: 'path',
            name: 'code',
            type: String,
          }),
        ]),
      );
      expect(bodyParameter).toMatchObject({
        in: 'body',
      });
    });

    it('should expose a body parameter for validation', () => {
      const paramsMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        AgressoContractController,
        'updatePoolFundingTag',
      );

      expect(Object.values(paramsMetadata)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            data: undefined,
          }),
        ]),
      );
    });
  });
});
