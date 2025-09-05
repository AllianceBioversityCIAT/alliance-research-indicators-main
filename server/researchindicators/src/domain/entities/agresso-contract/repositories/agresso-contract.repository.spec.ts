import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AgressoContractRepository } from './agresso-contract.repository';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { AlianceManagementApp } from '../../../tools/broker/aliance-management.app';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { OrderFieldsEnum } from '../enum/order-fields.enum';
import { AgressoContractStatus } from '../../../shared/enum/agresso-contract.enum';

// Mock the utility functions
jest.mock('../../../shared/utils/object.utils', () => ({
  isEmpty: jest.fn(
    (value) => value === undefined || value === null || value === '',
  ),
}));

describe('AgressoContractRepository', () => {
  let repository: AgressoContractRepository;
  let dataSource: DataSource; // eslint-disable-line @typescript-eslint/no-unused-vars
  let currentUser: CurrentUserUtil;
  let alianceManagementApp: AlianceManagementApp;

  const mockDataSource = {
    createEntityManager: jest.fn(),
    getRepository: jest.fn(),
  };

  const mockEntityManager = {
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCurrentUser = {
    user_id: 123,
    getUserId: jest.fn().mockReturnValue(123),
  };

  const mockAlianceManagementApp = {
    findUserToContract: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgressoContractRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
        {
          provide: AlianceManagementApp,
          useValue: mockAlianceManagementApp,
        },
      ],
    }).compile();

    repository = module.get<AgressoContractRepository>(
      AgressoContractRepository,
    );
    dataSource = module.get<DataSource>(DataSource);
    currentUser = module.get<CurrentUserUtil>(CurrentUserUtil);
    alianceManagementApp =
      module.get<AlianceManagementApp>(AlianceManagementApp);

    // Setup repository methods
    repository.query = jest.fn();
    repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
    repository['sortResultsWithLodash'] = jest
      .fn()
      .mockImplementation((data) => data);

    mockDataSource.createEntityManager.mockReturnValue(mockEntityManager);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAllContracts', () => {
    it('should find all contracts with pagination and where clause', async () => {
      const pagination = { page: 2, limit: 10 };
      const where = { agreement_id: 'TEST001', funding_type: 'BILATERAL' };
      const relations = { countries: 'true' };

      const expectedContracts = [
        {
          agreement_id: 'TEST001',
          projectDescription: 'Test Project',
          lever: 'Lever 1',
          leverUrl:
            'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L1-Food-environment_COLOR.png',
          countries: [
            { agreement_id: 'TEST001', iso_alpha_2: 'US', is_active: true },
          ],
        },
      ];

      (repository.query as jest.Mock).mockResolvedValue([
        {
          ...expectedContracts[0],
          departmentId: 'L1',
        },
      ]);

      const result = await repository.findAllContracts(
        pagination,
        where,
        relations,
      );

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('select ac.*'),
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10 OFFSET 10'),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('leverUrl');
    });

    it('should find all contracts without pagination', async () => {
      const where = {};
      const relations = {};

      const expectedContracts = [
        {
          agreement_id: 'ALL001',
          projectDescription: 'All Project',
          lever: 'Not available',
          departmentId: 'UNKNOWN',
        },
      ];

      (repository.query as jest.Mock).mockResolvedValue(expectedContracts);

      const result = await repository.findAllContracts(
        undefined,
        where,
        relations,
      );

      expect(repository.query).toHaveBeenCalledWith(
        expect.not.stringContaining('LIMIT'),
      );
      expect(result).toHaveLength(1);
      expect(result[0].leverUrl).toBe('Not available');
    });

    it('should include countries when relations specify countries', async () => {
      const where = {};
      const relations = { countries: 'true' };

      (repository.query as jest.Mock).mockResolvedValue([]);

      await repository.findAllContracts(undefined, where, relations);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('JSON_ARRAYAGG'),
      );
    });

    it('should not include countries when relations do not specify countries', async () => {
      const where = {};
      const relations = {};

      (repository.query as jest.Mock).mockResolvedValue([]);

      await repository.findAllContracts(undefined, where, relations);

      expect(repository.query).toHaveBeenCalledWith(
        expect.not.stringContaining('JSON_ARRAYAGG'),
      );
    });

    it('should map lever URLs correctly', async () => {
      const testCases = [
        {
          departmentId: 'L1',
          expectedUrl:
            'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L1-Food-environment_COLOR.png',
        },
        {
          departmentId: 'L2',
          expectedUrl:
            'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L2-Multifuntional-Landscapes_COLOR.png',
        },
        {
          departmentId: 'L3',
          expectedUrl:
            'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L3-Climate-Action_COLOR.png',
        },
        {
          departmentId: 'L4',
          expectedUrl:
            'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L4-Agrobiodiversity_COLOR.png',
        },
        {
          departmentId: 'L5',
          expectedUrl:
            'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L5-Digital-Inclusion_COLOR.png',
        },
        {
          departmentId: 'L6',
          expectedUrl:
            'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L6-Crops-for-Nutrition_COLOR.png',
        },
        {
          departmentId: 'L7',
          expectedUrl:
            'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L7-Gender-Youth-and-Inclusion_COLOR.png',
        },
        { departmentId: 'UNKNOWN', expectedUrl: 'Not available' },
      ];

      for (const testCase of testCases) {
        (repository.query as jest.Mock).mockResolvedValue([testCase]);
        const result = await repository.findAllContracts(undefined, {}, {});
        expect(result[0].leverUrl).toBe(testCase.expectedUrl);
      }
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
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(expectedContracts);

      const result = await repository.findByName(firstName, lastName);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('ac');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'user_agresso_contract',
        'uac',
        'ac.agreement_id = uac.agreement_id',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ac.project_lead_description REGEXP :first_name',
        { first_name: 'JOHN' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ac.project_lead_description REGEXP :last_name',
        { last_name: 'DOE' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(ac.is_active = false OR uac.user_agresso_contract_id IS NULL)',
      );
      expect(result).toEqual(expectedContracts);
    });

    it('should handle names with spaces correctly', async () => {
      const firstName = 'John Paul';
      const lastName = 'Smith Jones';

      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findByName(firstName, lastName);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ac.project_lead_description REGEXP :first_name',
        { first_name: 'JOHN|PAUL' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ac.project_lead_description REGEXP :last_name',
        { last_name: 'SMITH|JONES' },
      );
    });
  });

  describe('findContractsByUser', () => {
    it('should find contracts by user ID with results', async () => {
      const userId = 123;
      const mockUserContracts = [
        { contract_id: 'CONTRACT001' },
        { contract_id: 'CONTRACT002' },
      ];
      const expectedContracts = [
        {
          agreement_id: 'CONTRACT001',
          projectDescription: 'User Project 1',
          indicators: [
            {
              indicator: { indicator_id: 1, name: 'Indicator 1' },
              count_results: 5,
            },
          ],
        },
      ];

      mockAlianceManagementApp.findUserToContract.mockResolvedValue(
        mockUserContracts,
      );
      (repository.query as jest.Mock).mockResolvedValue(expectedContracts);

      const result = await repository.findContractsByUser(userId);

      expect(alianceManagementApp.findUserToContract).toHaveBeenCalledWith(
        userId,
        SecRolesEnum.CONTRACT_CONTRIBUTOR,
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ac.agreement_id IN (?)'),
        [['CONTRACT001', 'CONTRACT002']],
      );
      expect(result).toEqual(expectedContracts);
    });

    it('should return empty array when user has no contracts', async () => {
      const userId = 456;

      mockAlianceManagementApp.findUserToContract.mockResolvedValue([]);

      const result = await repository.findContractsByUser(userId);

      expect(alianceManagementApp.findUserToContract).toHaveBeenCalledWith(
        userId,
        SecRolesEnum.CONTRACT_CONTRIBUTOR,
      );
      expect(result).toEqual([]);
    });

    it('should return empty array when findUserToContract returns null', async () => {
      const userId = 789;

      mockAlianceManagementApp.findUserToContract.mockResolvedValue(null);

      const result = await repository.findContractsByUser(userId);

      expect(result).toEqual([]);
    });

    it('should use current user ID when userId is not provided', async () => {
      mockAlianceManagementApp.findUserToContract.mockResolvedValue([]);

      await repository.findContractsByUser();

      expect(alianceManagementApp.findUserToContract).toHaveBeenCalledWith(
        currentUser.user_id,
        SecRolesEnum.CONTRACT_CONTRIBUTOR,
      );
    });
  });

  describe('findOneContract', () => {
    it('should find one contract by contract ID', async () => {
      const contractId = 'CONTRACT123';
      const expectedContract = {
        agreement_id: contractId,
        projectDescription: 'Single Contract',
        indicators: [],
      };

      (repository.query as jest.Mock).mockResolvedValue([expectedContract]);

      const result = await repository.findOneContract(contractId);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ac.agreement_id = ?'),
        [contractId],
      );
      expect(result).toEqual(expectedContract);
    });

    it('should return null when contract is not found', async () => {
      const contractId = 'NONEXISTENT';

      (repository.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findOneContract(contractId);

      expect(result).toBeNull();
    });

    it('should return null when contractId is empty', async () => {
      const result1 = await repository.findOneContract('');
      const result2 = await repository.findOneContract(null);
      const result3 = await repository.findOneContract(undefined);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });
  });

  describe('orderBy', () => {
    it('should return correct ORDER BY clause for each field', () => {
      const testCases = [
        {
          field: OrderFieldsEnum.START_DATE,
          expected: 'ORDER BY ac.start_date ASC ',
        },
        {
          field: OrderFieldsEnum.END_DATE,
          expected: 'ORDER BY ac.end_date DESC ',
        },
        {
          field: OrderFieldsEnum.END_DATE_GLOBAL,
          expected: 'ORDER BY ac.endDateGlobal ASC ',
        },
        {
          field: OrderFieldsEnum.END_DATE_FINANCE,
          expected: 'ORDER BY ac.endDatefinance ASC ',
        },
        {
          field: OrderFieldsEnum.CONTRACT_CODE,
          expected: 'ORDER BY ac.agreement_id ASC ',
        },
        {
          field: OrderFieldsEnum.PROJECT_NAME,
          expected: 'ORDER BY ac.projectDescription ASC ',
        },
        {
          field: OrderFieldsEnum.PRINCIPAL_INVESTIGATOR,
          expected: 'ORDER BY ac.project_lead_description ASC ',
        },
        {
          field: OrderFieldsEnum.STATUS,
          expected: 'ORDER BY ac.contract_status ASC ',
        },
      ];

      testCases.forEach(({ field, expected }) => {
        const direction = expected.includes('DESC') ? 'DESC' : 'ASC';
        const result = repository.orderBy(field, direction);
        expect(result).toBe(expected);
      });
    });

    it('should return default ORDER BY when field is empty', () => {
      const result = repository.orderBy('', 'ASC');
      expect(result).toBe('');
    });

    it('should handle unknown fields gracefully', () => {
      const result = repository.orderBy(
        'unknown_field' as OrderFieldsEnum,
        'ASC',
      );
      expect(result).toBe('ORDER BY ac.start_date ASC ');
    });
  });

  describe('getContracts', () => {
    it('should get contracts with all filters', async () => {
      const filter = {
        contract_code: 'CONTRACT001',
        project_name: 'Test Project',
        principal_investigator: 'John Doe',
        lever: [1, 2],
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        status: [
          AgressoContractStatus.ONGOING,
          AgressoContractStatus.COMPLETED,
        ],
      };
      const userId = 123;
      const orderFields = OrderFieldsEnum.START_DATE;
      const direction = 'DESC';

      const expectedContracts = [
        {
          agreement_id: 'CONTRACT001',
          projectDescription: 'Test Project',
          indicators: [],
        },
      ];

      (repository.query as jest.Mock).mockResolvedValue(expectedContracts);

      const result = await repository.getContracts(
        filter,
        userId,
        orderFields,
        direction,
      );

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining("AND ac.agreement_id = 'CONTRACT001'"),
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "AND ac.projectDescription LIKE '%Test Project%'",
        ),
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "AND ac.project_lead_description LIKE '%John Doe%'",
        ),
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('AND cl.id in (1,2)'),
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.not.stringContaining('ORDER BY'),
      );
      expect(repository['sortResultsWithLodash']).toHaveBeenCalledWith(
        expectedContracts,
        'start_date',
        'desc',
      );
      expect(result).toEqual(expectedContracts);
    });

    it('should get contracts without filters', async () => {
      const expectedContracts = [];
      (repository.query as jest.Mock).mockResolvedValue(expectedContracts);

      const result = await repository.getContracts();

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1 = 1'),
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.not.stringContaining('AND ac.agreement_id'),
      );
      expect(result).toEqual(expectedContracts);
    });

    it('should include user filter when userId is provided', async () => {
      const userId = 456;
      (repository.query as jest.Mock).mockResolvedValue([]);

      await repository.getContracts({}, userId);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining(`and r.created_by = ${userId}`),
      );
    });

    it('should not include user filter when userId is null', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);

      await repository.getContracts({}, null);

      expect(repository.query).toHaveBeenCalledWith(
        expect.not.stringContaining('and r.created_by'),
      );
    });
  });

  describe('buildStatusFilterClause', () => {
    it('should build correct status filter clause', () => {
      const statuses = ['ONGOING', 'COMPLETED'];
      const result = repository['buildStatusFilterClause'](statuses);
      expect(result).toBe(
        "AND LOWER(ac.contract_status) in ('ongoing','completed')",
      );
    });

    it('should handle single status', () => {
      const statuses = ['ONGOING'];
      const result = repository['buildStatusFilterClause'](statuses);
      expect(result).toBe("AND LOWER(ac.contract_status) in ('ongoing')");
    });

    it('should handle mixed case statuses', () => {
      const statuses = ['Ongoing', 'COMPLETED', 'suspended'];
      const result = repository['buildStatusFilterClause'](statuses);
      expect(result).toBe(
        "AND LOWER(ac.contract_status) in ('ongoing','completed','suspended')",
      );
    });
  });

  describe('buildDateFilterClause', () => {
    it('should build date range filter when both dates provided', () => {
      const filter = { start_date: '2023-01-01', end_date: '2023-12-31' };
      const result = repository['buildDateFilterClause'](filter);
      expect(result).toBe(
        "AND ac.start_date <= '2023-12-31' AND (ac.end_date >= '2023-01-01' OR ac.end_date IS NULL)",
      );
    });

    it('should build start date filter when only start date provided', () => {
      const filter = { start_date: '2023-01-01' };
      const result = repository['buildDateFilterClause'](filter);
      expect(result).toBe("AND ac.start_date >= '2023-01-01'");
    });

    it('should build end date filter when only end date provided', () => {
      const filter = { end_date: '2023-12-31' };
      const result = repository['buildDateFilterClause'](filter);
      expect(result).toBe(
        "AND (ac.end_date <= '2023-12-31' OR ac.end_date IS NULL)",
      );
    });

    it('should return empty string when no dates provided', () => {
      const filter = {};
      const result = repository['buildDateFilterClause'](filter);
      expect(result).toBe('');
    });

    it('should return empty string when filter is undefined', () => {
      const result = repository['buildDateFilterClause'](undefined);
      expect(result).toBe('');
    });
  });
});
