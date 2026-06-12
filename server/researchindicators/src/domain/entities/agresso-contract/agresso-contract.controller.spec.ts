import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AgressoContractController } from './agresso-contract.controller';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractStatus } from '../../shared/enum/agresso-contract.enum';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { OrderFieldsEnum } from './enum/order-fields.enum';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { AgressoFindNamePayload } from './dto/agresso-find-options.payload';

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
    getGeoScopeReport: jest.fn(),
    getTopPartnersReport: jest.fn(),
    getTopContributorsReport: jest.fn(),
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
      );

      expect(service.findContracts).toHaveBeenCalledWith(
        {
          agreement_id: 'PROJECT001',
          funding_type: 'FUNDING_TYPE',
          contract_status: AgressoContractStatus.ONGOING,
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
      );

      expect(service.findContracts).toHaveBeenCalledWith(
        {
          agreement_id: undefined,
          funding_type: undefined,
          contract_status: undefined,
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
      );

      expect(service.findAgressoContracts).toHaveBeenCalledWith(
        TrueFalseEnum.FALSE,
        expect.objectContaining({
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
  });
});
