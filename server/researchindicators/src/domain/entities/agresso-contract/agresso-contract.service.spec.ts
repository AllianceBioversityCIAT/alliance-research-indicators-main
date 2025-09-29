import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { AgressoContract } from './entities/agresso-contract.entity';
import { AgressoContractWhere } from './dto/agresso-contract.dto';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';
import { StringKeys } from '../../shared/global-dto/types-global';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { OrderFieldsEnum } from './enum/order-fields.enum';
import { AgressoContractStatus } from '../../shared/enum/agresso-contract.enum';

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
  };

  const mockCurrentUser = {
    user_id: 123,
    getUserId: jest.fn().mockReturnValue(123),
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
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
      ],
    }).compile();

    service = module.get<AgressoContractService>(AgressoContractService);
    dataSource = module.get<DataSource>(DataSource);
    repository = module.get<AgressoContractRepository>(
      AgressoContractRepository,
    );
    currentUser = module.get<CurrentUserUtil>(CurrentUserUtil);
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
    it('should find contract result by contract id', async () => {
      const contractId = 'CONTRACT123';
      const expectedContract = {
        agreement_id: contractId,
        projectDescription: 'Contract with Results',
        indicators: [
          {
            indicator: { indicator_id: 1, name: 'Indicator 1' },
            count_results: 5,
          },
        ],
      };

      mockRepository.findOneContract.mockResolvedValue(expectedContract);

      const result = await service.findContratResultByContractId(contractId);

      expect(repository.findOneContract).toHaveBeenCalledWith(contractId);
      expect(result).toEqual(expectedContract);
    });

    it('should return null when contract not found', async () => {
      const contractId = 'NONEXISTENT';
      mockRepository.findOneContract.mockResolvedValue(null);

      const result = await service.findContratResultByContractId(contractId);

      expect(repository.findOneContract).toHaveBeenCalledWith(contractId);
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
        currentUser.user_id,
        OrderFieldsEnum.START_DATE,
        'DESC',
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
        currentUser.user_id,
        undefined,
        'ASC',
        undefined,
      );
      expect(result).toEqual(expectedContracts);
    });
  });
});
