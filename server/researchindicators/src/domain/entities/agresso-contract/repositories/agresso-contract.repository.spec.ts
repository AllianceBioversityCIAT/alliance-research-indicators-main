import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AgressoContractRepository } from './agresso-contract.repository';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { AlianceManagementApp } from '../../../tools/broker/aliance-management.app';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { OrderFieldsEnum } from '../enum/order-fields.enum';
import { effectivePoolFundingContributorSql } from '../../../shared/utils/pool-funding.util';
import { InstitutionRolesEnum } from '../../institution-roles/enums/institution-roles.enum';
import { UserRolesEnum } from '../../user-roles/enum/user-roles.enum';
import { AgressoContractStatus } from '../../../shared/enum/agresso-contract.enum';
import {
  isValidText,
  escapeLikeString,
} from '../../../shared/utils/query-sanitizer.util';

// Mock the utility functions
jest.mock('../../../shared/utils/object.utils', () => ({
  isEmpty: jest.fn(
    (value) => value === undefined || value === null || value === '',
  ),
}));

jest.mock('../../../shared/utils/query-sanitizer.util', () => ({
  isValidText: jest.fn(() => true),
  escapeLikeString: jest.fn((s: string) => s),
}));

describe('AgressoContractRepository', () => {
  let repository: AgressoContractRepository;
  let dataSource: DataSource; // eslint-disable-line @typescript-eslint/no-unused-vars
  let currentUser: CurrentUserUtil;
  let alianceManagementApp: AlianceManagementApp;

  const mockDataSource = {
    createEntityManager: jest.fn(),
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([
        { indicator_id: 1, name: 'Indicator 1' },
        { indicator_id: 2, name: 'Indicator 2' },
      ]),
    }),
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
    (isValidText as jest.Mock).mockReturnValue(true);
    (escapeLikeString as jest.Mock).mockImplementation((s: string) => s);

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

    it('should normalize page to 1 when page is below 1', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);
      await repository.findAllContracts({ page: 0, limit: 5 }, {}, {});
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5 OFFSET 0'),
      );
    });

    it('should default page to 1 when page is empty', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);
      await repository.findAllContracts(
        { page: undefined as any, limit: 10 },
        {},
        {},
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10 OFFSET 0'),
      );
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
    it('should find one contract by contract ID and project cgiar_entities from pooled_funding_contracts', async () => {
      const contractId = 'CONTRACT123';
      const rawContract = {
        agreement_id: contractId,
        projectDescription: 'Single Contract',
        indicators: [],
        cgiar_entities: [{ code: 'CR1', name: 'Entity 1' }],
      };

      (repository.query as jest.Mock).mockResolvedValue([rawContract]);

      const result = await repository.findOneContract(contractId);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ac.agreement_id = ?'),
        [contractId],
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM pooled_funding_contracts pfc'),
        [contractId],
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('AS cgiar_entities'),
        [contractId],
      );
      expect(result).toEqual({
        ...rawContract,
        cgiar_entities: [{ code: 'CR1', name: 'Entity 1' }],
      });
    });

    it('should return contract with extended fields (funding_type, center_amount_usd, sdgs, cgiar_entities) and byte-identical existing fields', async () => {
      const contractId = 'CONTRACT123';
      const rawContract = {
        agreement_id: contractId,
        projectDescription: 'Single Contract',
        project_lead_description: 'Lead Investigator',
        start_date: new Date('2023-01-01'),
        end_date: new Date('2025-12-31'),
        indicators: [
          {
            indicator: {
              indicator_id: 1,
              name: 'Indicator 1',
              description: 'Desc 1',
              indicator_type_id: 1,
              long_description: 'Long desc',
              icon_src: 'icon.png',
              other_names: 'Other',
              is_active: true,
            },
            count_results: 5,
          },
        ],
        funding_type: 'BILATERAL',
        center_amount_usd: 150000.5,
        grant_amount_usd: 200000.0,
        contract_status: 'ongoing',
        status_name: 'Ongoing',
        sdgs: [{ id: 1, name: 'No Poverty' }],
        cgiar_entities: [
          { code: 'CR1', name: 'Entity 1' },
          { code: 'CR2', name: 'Entity 2' },
        ],
      };

      (repository.query as jest.Mock).mockResolvedValue([rawContract]);

      const result = await repository.findOneContract(contractId);

      expect(result).toEqual({
        agreement_id: contractId,
        projectDescription: 'Single Contract',
        project_lead_description: 'Lead Investigator',
        start_date: new Date('2023-01-01'),
        end_date: new Date('2025-12-31'),
        indicators: rawContract.indicators,
        funding_type: 'BILATERAL',
        center_amount_usd: 150000.5,
        grant_amount_usd: 200000.0,
        contract_status: 'ongoing',
        status_name: 'Ongoing',
        sdgs: [{ id: 1, name: 'No Poverty' }],
        cgiar_entities: [
          { code: 'CR1', name: 'Entity 1' },
          { code: 'CR2', name: 'Entity 2' },
        ],
      });
    });

    it('should return cgiar_entities as empty array [] when absent or null in DB response', async () => {
      const contractId = 'CONTRACT123';
      const rawContractWithoutCgiar = {
        agreement_id: contractId,
        projectDescription: 'Single Contract',
        indicators: [],
        cgiar_entities: null,
      };

      (repository.query as jest.Mock).mockResolvedValue([
        rawContractWithoutCgiar,
      ]);

      const result = await repository.findOneContract(contractId);

      expect(result.cgiar_entities).toEqual([]);
    });

    it('should parse JSON strings for cgiar_entities, indicators, and sdgs if returned as string from DB driver', async () => {
      const contractId = 'CONTRACT123';
      const rawContractWithStrings = {
        agreement_id: contractId,
        projectDescription: 'Single Contract',
        indicators: JSON.stringify([
          {
            indicator: { indicator_id: 1, name: 'Ind' },
            count_results: 3,
          },
        ]),
        cgiar_entities: JSON.stringify([{ code: 'E1', name: 'Entity 1' }]),
        sdgs: JSON.stringify([{ id: 2, name: 'Zero Hunger' }]),
      };

      (repository.query as jest.Mock).mockResolvedValue([
        rawContractWithStrings,
      ]);

      const result = await repository.findOneContract(contractId);

      expect(result.indicators).toEqual([
        {
          indicator: { indicator_id: 1, name: 'Ind' },
          count_results: 3,
        },
      ]);
      expect(result.cgiar_entities).toEqual([{ code: 'E1', name: 'Entity 1' }]);
      expect(result.sdgs).toEqual([{ id: 2, name: 'Zero Hunger' }]);
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
          expected: 'ac.start_date ASC ',
        },
        {
          field: OrderFieldsEnum.END_DATE,
          expected: 'ac.end_date ASC ',
        },
        {
          field: OrderFieldsEnum.END_DATE_GLOBAL,
          expected: 'ac.endDateGlobal ASC ',
        },
        {
          field: OrderFieldsEnum.END_DATE_FINANCE,
          expected: 'ac.endDatefinance ASC ',
        },
        {
          field: OrderFieldsEnum.CONTRACT_CODE,
          expected: 'ac.agreement_id ASC ',
        },
        {
          field: OrderFieldsEnum.PROJECT_NAME,
          expected: 'ac.projectDescription ASC ',
        },
        {
          field: OrderFieldsEnum.PRINCIPAL_INVESTIGATOR,
          expected: 'ac.project_lead_description ASC ',
        },
        {
          field: OrderFieldsEnum.STATUS,
          expected: 'ac.contract_status ASC ',
        },
        {
          field: OrderFieldsEnum.LEAD_CENTER,
          expected: 'ac.ubwClientDescription ASC ',
        },
        {
          field: OrderFieldsEnum.LEVER,
          expected: 'cl.id ASC ',
        },
        {
          field: OrderFieldsEnum.COUNT_RESULTS,
          expected: 'contract_total_results ASC ',
        },
        {
          // R-BIL-102 AC.1 — ordering uses the effective predicate, not the raw column
          field: OrderFieldsEnum.POOL_FUNDING_CONTRIBUTOR,
          expected: `${effectivePoolFundingContributorSql('ac')} ASC `,
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
      expect(result).toBe('ac.start_date ASC ');
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
      const userId = { sec_user_id: 123 } as any;
      const orderFields = OrderFieldsEnum.START_DATE;
      const direction = 'DESC';

      (repository.query as jest.Mock).mockResolvedValue([
        {
          agreement_id: 'CONTRACT001',
          projectDescription: 'Test Project',
          project_lead_description: 'John Doe',
          description: 'Contract description',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          endDateGlobal: '2023-12-31',
          endDatefinance: '2023-12-31',
          contract_status: 'ongoing',
          indicator_id: 1,
          count_results: 5,
          lever_id: 1,
          lever_short_name: 'Lever 1',
          lever_full_name: 'Lever One',
          lever_other_names: 'L1',
        },
      ]);

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
        expect.stringContaining('ORDER BY'),
      );
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should get contracts without filters', async () => {
      const expectedContracts = [];
      (repository.query as jest.Mock).mockResolvedValue(expectedContracts);

      const result = await repository.getContracts();

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.not.stringContaining('AND ac.agreement_id'),
      );
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should include user filter when userId is provided', async () => {
      const userId = { sec_user_id: 456 } as any;
      (repository.query as jest.Mock).mockResolvedValue([]);

      await repository.getContracts({}, userId);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining(`AND r.created_by = ${userId.sec_user_id}`),
      );
    });

    it('should not include user filter when userId is null', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);

      await repository.getContracts({}, null);

      expect(repository.query).toHaveBeenCalledWith(
        expect.not.stringContaining('AND r.created_by'),
      );
    });

    it('should throw when search query has invalid characters', async () => {
      (isValidText as jest.Mock).mockReturnValueOnce(false);
      await expect(
        repository.getContracts(
          {},
          undefined,
          undefined,
          undefined,
          undefined,
          'bad<>',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should build LIKE conditions from search query tokens', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);
      await repository.getContracts(
        {},
        undefined,
        undefined,
        undefined,
        undefined,
        'alpha beta',
      );
      const sql = (repository.query as jest.Mock).mock.calls[0][0] as string;
      expect(escapeLikeString).toHaveBeenCalled();
      expect(sql).toContain("ac.description LIKE '%alpha%'");
      expect(sql).toContain("ac.agreement_id LIKE '%beta%'");
    });

    it('should run count query and set metadata when paginated', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '12' }])
        .mockResolvedValueOnce([
          {
            agreement_id: 'C1',
            indicator_id: 1,
            count_results: 2,
            projectDescription: 'P',
            project_lead_description: 'PI',
            description: 'D',
            start_date: 'a',
            end_date: 'b',
            endDateGlobal: 'c',
            endDatefinance: 'd',
            contract_status: 'ongoing',
            lever_id: 1,
            lever_short_name: 's',
            lever_full_name: 'f',
            lever_other_names: 'o',
            is_science_program: 0,
            funding_type: 'x',
            ubwClientDescription: 'CIAT',
          },
        ]);

      const out = await repository.getContracts(
        {},
        undefined,
        OrderFieldsEnum.CONTRACT_CODE,
        'ASC',
        { page: 2, limit: 5 },
      );

      expect(repository.query).toHaveBeenCalledTimes(2);
      expect(
        (repository.query as jest.Mock).mock.calls[0][0] as string,
      ).toContain('COUNT(DISTINCT ac.agreement_id)');
      expect(out.metadata).toMatchObject({
        total: 12,
        page: 2,
        limit: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should add exclude_pooled_funding and merge rows per contract', async () => {
      (repository.query as jest.Mock).mockResolvedValue([
        {
          agreement_id: 'SAME',
          indicator_id: 1,
          count_results: 1,
          projectDescription: 'P',
          project_lead_description: 'PI',
          description: 'D',
          start_date: 'a',
          end_date: 'b',
          endDateGlobal: 'c',
          endDatefinance: 'd',
          contract_status: 'ongoing',
          lever_id: 1,
          lever_short_name: 's',
          lever_full_name: 'f',
          lever_other_names: 'o',
          is_science_program: 0,
          funding_type: 'x',
          ubwClientDescription: 'CIAT',
        },
        {
          agreement_id: 'SAME',
          indicator_id: 2,
          count_results: 4,
          projectDescription: 'P',
          project_lead_description: 'PI',
          description: 'D',
          start_date: 'a',
          end_date: 'b',
          endDateGlobal: 'c',
          endDatefinance: 'd',
          contract_status: 'ongoing',
          lever_id: 1,
          lever_short_name: 's',
          lever_full_name: 'f',
          lever_other_names: 'o',
          is_science_program: 0,
          funding_type: 'x',
          ubwClientDescription: 'CIAT',
        },
      ]);

      const out = await repository.getContracts({
        exclude_pooled_funding: true,
        with_indicators: true,
      } as any);

      expect(
        (repository.query as jest.Mock).mock.calls[0][0] as string,
      ).toContain('AND pfc.id IS NULL');
      expect(out.data).toHaveLength(1);
    });

    // @sdd-spec bilateral-module/mapping-drives-pool-funding-tag
    // The effective predicate is compared against the imported helper output so the
    // OR/EXISTS text is never hardcoded here; if the helper changes, these follow it.
    it('should project the effective pool-funding predicate, not the raw column', async () => {
      // R-BIL-100 AC.1–AC.4 — a single effective predicate
      // (COALESCE(...)=1 OR EXISTS(... is_active = 1)) drives every flag outcome.
      (repository.query as jest.Mock).mockResolvedValue([]);

      await repository.getContracts();

      const sql = (repository.query as jest.Mock).mock.calls[0][0] as string;
      const predicate = effectivePoolFundingContributorSql('ac');

      expect(sql).toContain(`${predicate} AS is_pool_funding_contributor`);
      // The predicate appears exactly once (the projection) when no filter is applied.
      expect(sql.split(predicate).length - 1).toBe(1);
      // Fails if the raw-column projection is restored in the inner select.
      expect(sql).not.toMatch(/^\s*ac\.is_pool_funding_contributor,\s*$/m);
    });

    it('should filter with the effective predicate on both count and main queries when pool-funding is true', async () => {
      // R-BIL-101 AC.1 — mapping-derived contracts are included in the "true" set.
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '1' }])
        .mockResolvedValueOnce([]);

      await repository.getContracts(
        { is_pool_funding_contributor: true } as any,
        undefined,
        undefined,
        undefined,
        { page: 1, limit: 10 },
      );

      const countSql = (repository.query as jest.Mock).mock
        .calls[0][0] as string;
      const mainSql = (repository.query as jest.Mock).mock
        .calls[1][0] as string;
      const predicate = effectivePoolFundingContributorSql('ac');

      expect(countSql).toContain(`AND ${predicate} = 1`);
      expect(mainSql).toContain(`AND ${predicate} = 1`);
      // Fails if the old raw-column filter is restored (tasks.md T-04 acceptance).
      expect(countSql).not.toContain('AND ac.is_pool_funding_contributor =');
      expect(mainSql).not.toContain('AND ac.is_pool_funding_contributor =');
    });

    it('should filter with the effective predicate on both count and main queries when pool-funding is false', async () => {
      // R-BIL-101 AC.3 — mapping-derived contracts are excluded from the "false" set
      // because the predicate (not the raw column) is what gets compared to 0.
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await repository.getContracts(
        { is_pool_funding_contributor: false } as any,
        undefined,
        undefined,
        undefined,
        { page: 1, limit: 10 },
      );

      const countSql = (repository.query as jest.Mock).mock
        .calls[0][0] as string;
      const mainSql = (repository.query as jest.Mock).mock
        .calls[1][0] as string;
      const predicate = effectivePoolFundingContributorSql('ac');

      expect(countSql).toContain(`AND ${predicate} = 0`);
      expect(mainSql).toContain(`AND ${predicate} = 0`);
      expect(countSql).not.toContain('AND ac.is_pool_funding_contributor =');
      expect(mainSql).not.toContain('AND ac.is_pool_funding_contributor =');
    });

    it('should not add the pool-funding predicate as a filter when it is absent', async () => {
      // R-BIL-100 / R-BIL-101 — with no filter param the predicate is only projected,
      // never used as a WHERE filter (so an unfiltered query keeps every contract).
      (repository.query as jest.Mock).mockResolvedValue([]);

      await repository.getContracts({ contract_code: 'X' } as any);

      const sql = (repository.query as jest.Mock).mock.calls[0][0] as string;
      const predicate = effectivePoolFundingContributorSql('ac');

      expect(sql).not.toContain(`AND ${predicate} = `);
    });
  });

  describe('buildStatusFilterClause', () => {
    it('should return empty string for null, non-array or empty list', () => {
      expect(repository['buildStatusFilterClause'](null as any)).toBe('');
      expect(repository['buildStatusFilterClause'](undefined as any)).toBe('');
      expect(repository['buildStatusFilterClause']([])).toBe('');
    });

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

  describe('getTopPrimaryLeversReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getTopPrimaryLeversReport('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return top primary levers report with default limit', async () => {
      (repository.query as jest.Mock).mockResolvedValue([
        {
          lever_id: 3,
          short_name: 'Lever 3',
          full_name: 'Climate Action',
          count: 6,
        },
      ]);

      const result = await repository.getTopPrimaryLeversReport('A100');

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('result_lever.is_primary = TRUE'),
        ['A100', 10],
      );
      expect(result).toEqual({
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
      });
    });

    it('should cap limit to 100', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.getTopPrimaryLeversReport('A100', 500);

      expect(result.limit).toBe(100);
      expect((repository.query as jest.Mock).mock.calls[0][1]).toEqual([
        'A100',
        100,
      ]);
    });
  });

  describe('getTopContributorsReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getTopContributorsReport('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return top contributors report with default limit', async () => {
      (repository.query as jest.Mock).mockResolvedValue([
        {
          contract_id: 'B200',
          contract_description: 'Secondary project',
          project_name: 'Project B',
          count: 4,
        },
      ]);

      const result = await repository.getTopContributorsReport('A100');

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('secondary_contract.is_primary = FALSE'),
        ['A100', 10],
      );
      expect(result).toEqual({
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
      });
    });

    it('should cap limit to 100', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.getTopContributorsReport('A100', 500);

      expect(result.limit).toBe(100);
      expect((repository.query as jest.Mock).mock.calls[0][1]).toEqual([
        'A100',
        100,
      ]);
    });
  });

  describe('getTopMainContactPersonsReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(
        repository.getTopMainContactPersonsReport(''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return top main contact persons report with default limit', async () => {
      (repository.query as jest.Mock).mockResolvedValue([
        {
          user_id: '12345',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane.doe@example.org',
          count: 5,
        },
      ]);

      const result = await repository.getTopMainContactPersonsReport('A100');

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('result_users result_user'),
        ['A100', UserRolesEnum.MAIN_CONTACT, 10],
      );
      expect(result).toEqual({
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
      });
    });

    it('should cap limit to 100', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.getTopMainContactPersonsReport(
        'A100',
        500,
      );

      expect(result.limit).toBe(100);
      expect((repository.query as jest.Mock).mock.calls[0][1]).toEqual([
        'A100',
        UserRolesEnum.MAIN_CONTACT,
        100,
      ]);
    });
  });

  describe('getContractStaffReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getContractStaffReport('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);

      await expect(repository.getContractStaffReport('A100')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return all populated staff members', async () => {
      (repository.query as jest.Mock).mockResolvedValue([
        {
          project_lead_description: 'JOHN DOE',
          programAssistantName: 'jane smith',
          researchAssistantName: 'bob wilson',
        },
      ]);

      const result = await repository.getContractStaffReport('A100');

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('agresso_contracts ac'),
        ['A100'],
      );
      expect(result).toEqual({
        contract_id: 'A100',
        staff: [
          { name: 'John Doe', role: 'Project Lead' },
          { name: 'Jane Smith', role: 'Program Assistant' },
          { name: 'Bob Wilson', role: 'Research Assistant' },
        ],
      });
    });

    it('should omit null or blank staff fields', async () => {
      (repository.query as jest.Mock).mockResolvedValue([
        {
          project_lead_description: 'john doe',
          programAssistantName: null,
          researchAssistantName: '   ',
        },
      ]);

      const result = await repository.getContractStaffReport('A100');

      expect(result).toEqual({
        contract_id: 'A100',
        staff: [{ name: 'John Doe', role: 'Project Lead' }],
      });
    });
  });

  describe('getFundingTypes', () => {
    it('should return distinct funding types excluding empty values', async () => {
      (repository.query as jest.Mock).mockResolvedValue([
        { funding_type: 'BILATERAL' },
        { funding_type: null },
        { funding_type: 'MULTILATERAL' },
        { funding_type: '' },
      ]);

      const result = await repository.getFundingTypes();

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT DISTINCT funding_type FROM agresso_contracts',
        ),
      );
      expect(result).toEqual([
        { funding_type: 'BILATERAL' },
        { funding_type: 'MULTILATERAL' },
      ]);
    });
  });

  describe('getTopPartnersReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getTopPartnersReport('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return top partners report with default limit', async () => {
      (repository.query as jest.Mock).mockResolvedValue([
        {
          institution_id: 101,
          institution_name: 'Partner Org',
          acronym: 'PO',
          count: 5,
        },
      ]);

      const result = await repository.getTopPartnersReport('A100');

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('result_institutions'),
        ['A100', InstitutionRolesEnum.PARTNERS, 10],
      );
      expect(result).toEqual({
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
      });
    });

    it('should cap limit to 100', async () => {
      (repository.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.getTopPartnersReport('A100', 500);

      expect(result.limit).toBe(100);
      expect((repository.query as jest.Mock).mock.calls[0][1]).toEqual([
        'A100',
        InstitutionRolesEnum.PARTNERS,
        100,
      ]);
    });
  });

  describe('getGeoScopeReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getGeoScopeReport('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should build geographic scope report with default limit', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            global_count: '5',
            regional_count: '3',
            countries_count: '12',
            sub_national_count: '8',
            yet_to_be_determined_count: '1',
          },
        ])
        .mockResolvedValueOnce([
          { region_id: 150, region_name: 'Africa', count: 4 },
        ])
        .mockResolvedValueOnce([
          {
            isoAlpha2: 'KE',
            country_name: 'Kenya',
            country_count: 10,
            country_rank: 1,
            sub_national_id: 1001,
            sub_national_name: 'Nairobi',
            sub_count: 6,
            sub_rank: 1,
          },
        ]);

      const result = await repository.getGeoScopeReport('A100');

      expect(repository.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        contract_id: 'A100',
        limit: 10,
        geo_scope_summary: {
          global: 5,
          regional: 3,
          countries: 12,
          sub_national: 8,
          yet_to_be_determined: 1,
        },
        top_regions: [{ region_id: 150, region_name: 'Africa', count: 4 }],
        top_countries: [
          {
            iso_alpha_2: 'KE',
            country_name: 'Kenya',
            count: 10,
            top_sub_nationals: [
              {
                sub_national_id: 1001,
                sub_national_name: 'Nairobi',
                count: 6,
              },
            ],
          },
        ],
      });
    });

    it('should cap limit to 100', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.getGeoScopeReport('A100', 500);

      expect(result.limit).toBe(100);
      expect((repository.query as jest.Mock).mock.calls[1][1]).toEqual([
        'A100',
        100,
      ]);
    });
  });

  describe('getResultsSummaryReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getResultsSummaryReport('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should build results summary report with four grouped queries (asserts generated SQL text + bound params)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          { status_id: 1, name: 'Approved', count: 5 },
          { status_id: 2, name: 'Submitted', count: 3 },
        ])
        .mockResolvedValueOnce([
          { year: 2024, count: 6 },
          { year: 2023, count: 2 },
        ])
        .mockResolvedValueOnce([{ partner_institutions: 7 }])
        .mockResolvedValueOnce([
          { indicator_id: 1, year: 2023, count: 2 },
          { indicator_id: 1, year: 2024, count: 3 },
          { indicator_id: 2, year: 2024, count: 3 },
        ]);

      const result = await repository.getResultsSummaryReport('A1676');

      expect(repository.query).toHaveBeenCalledTimes(4);

      const statusSql = (repository.query as jest.Mock).mock.calls[0][0];
      const yearSql = (repository.query as jest.Mock).mock.calls[1][0];
      const partnerSql = (repository.query as jest.Mock).mock.calls[2][0];
      const indicatorYearSql = (repository.query as jest.Mock).mock.calls[3][0];

      // Shared subquery predicates appear in every grouped query (subquery is interpolated)
      expect(statusSql).toContain('is_primary = TRUE');
      expect(statusSql).toContain('is_snapshot = FALSE');
      expect(statusSql).toContain('is_active');
      expect(yearSql).toContain('is_primary = TRUE');
      expect(yearSql).toContain('is_snapshot = FALSE');
      expect(yearSql).toContain('is_active');
      expect(partnerSql).toContain('is_primary = TRUE');
      expect(partnerSql).toContain('is_snapshot = FALSE');
      expect(partnerSql).toContain('is_active');
      expect(indicatorYearSql).toContain('is_primary = TRUE');
      expect(indicatorYearSql).toContain('is_snapshot = FALSE');
      expect(indicatorYearSql).toContain('is_active');

      // LEFT JOIN appears in the by_status query (judgment SU2 — result_status_id is nullable)
      expect(statusSql).toContain('LEFT JOIN');

      // Grouped queries carry a GROUP BY
      expect(statusSql).toContain('GROUP BY');
      expect(yearSql).toContain('GROUP BY');
      expect(indicatorYearSql).toContain('GROUP BY');

      // Bound params: status, year & indicatorYear queries take only contractId; partners adds the role id
      expect((repository.query as jest.Mock).mock.calls[0][1]).toEqual([
        'A1676',
      ]);
      expect((repository.query as jest.Mock).mock.calls[1][1]).toEqual([
        'A1676',
      ]);
      expect((repository.query as jest.Mock).mock.calls[2][1]).toEqual([
        'A1676',
        InstitutionRolesEnum.PARTNERS,
      ]);
      expect((repository.query as jest.Mock).mock.calls[3][1]).toEqual([
        'A1676',
      ]);

      expect(result).toEqual({
        total: 8,
        by_status: [
          { status_id: 1, name: 'Approved', count: 5 },
          { status_id: 2, name: 'Submitted', count: 3 },
        ],
        by_year: [
          { year: 2024, count: 6 },
          { year: 2023, count: 2 },
        ],
        partner_institutions: 7,
        by_indicator_year: [
          { indicator_id: 1, year: 2023, count: 2 },
          { indicator_id: 1, year: 2024, count: 3 },
          { indicator_id: 2, year: 2024, count: 3 },
        ],
      });
    });

    it('should preserve NULL-status and NULL-year rows in explicit buckets with bucket-sum invariant', async () => {
      // Disqualifier guard: a fixture without NULL rows proves nothing — both are present here.
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          { status_id: 1, name: 'Approved', count: 5 },
          { status_id: null, name: 'No status', count: 3 },
        ])
        .mockResolvedValueOnce([
          { year: 2024, count: 6 },
          { year: null, count: 2 },
        ])
        .mockResolvedValueOnce([{ partner_institutions: 4 }])
        .mockResolvedValueOnce([
          { indicator_id: 1, year: 2024, count: 5 },
          { indicator_id: 2, year: 2024, count: 1 },
          { indicator_id: 2, year: null, count: 2 },
        ]);

      const result = await repository.getResultsSummaryReport('A100');

      // NULL-status bucket preserved (LEFT JOIN result_status, not an inner join that drops it)
      expect(result.by_status).toContainEqual({
        status_id: null,
        name: 'No status',
        count: 3,
      });
      // NULL-year bucket preserved (no join to drop it — judgment W8)
      expect(result.by_year).toContainEqual({
        year: null,
        count: 2,
      });
      // NULL-year bucket in by_indicator_year preserved
      expect(result.by_indicator_year).toContainEqual({
        indicator_id: 2,
        year: null,
        count: 2,
      });

      // AC.2 — bucket-sum invariant: by_status sums to total AND by_year sums to total
      const statusSum = result.by_status.reduce(
        (sum, row) => sum + row.count,
        0,
      );
      const yearSum = result.by_year.reduce((sum, row) => sum + row.count, 0);
      const matrixSum = result.by_indicator_year.reduce(
        (sum, row) => sum + row.count,
        0,
      );
      expect(result.total).toBe(statusSum);
      expect(result.total).toBe(yearSum);
      expect(result.total).toBe(matrixSum);
      expect(result.total).toBe(8);
    });

    it('should reconcile indicator-year matrix cell sums with total, indicator totals, and year totals without fabricated zero cells (R-DA-002 AC.1 / Scenario)', async () => {
      // Contract with results across 2 indicators (1 and 2) and 2 years (2023, 2024) + null-year bucket:
      // Indicator 1: 2023 (count: 3), 2024 (count: 4) -> indicator total = 7
      // Indicator 2: 2024 (count: 2), null-year (count: 1) -> indicator total = 3
      // Empty pair: Indicator 2 in 2023 has 0 results and MUST NOT be emitted (absent = no cell)
      // Empty pair: Indicator 1 in null-year has 0 results and MUST NOT be emitted
      // Year totals: 2023 = 3, 2024 = 6, null = 1 -> sum = 10
      // Total = 10
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          { status_id: 1, name: 'Approved', count: 7 },
          { status_id: 2, name: 'Submitted', count: 3 },
        ])
        .mockResolvedValueOnce([
          { year: 2023, count: 3 },
          { year: 2024, count: 6 },
          { year: null, count: 1 },
        ])
        .mockResolvedValueOnce([{ partner_institutions: 5 }])
        .mockResolvedValueOnce([
          { indicator_id: 1, year: 2023, count: 3 },
          { indicator_id: 1, year: 2024, count: 4 },
          { indicator_id: 2, year: 2024, count: 2 },
          { indicator_id: 2, year: null, count: 1 },
        ]);

      const result = await repository.getResultsSummaryReport('A1676');

      expect(result.total).toBe(10);

      // 1. Assert null-year cell is present and properly mapped
      expect(result.by_indicator_year).toContainEqual({
        indicator_id: 2,
        year: null,
        count: 1,
      });

      // 2. Assert no fabricated zero cells for empty pairs (Indicator 2 in 2023, Indicator 1 in null)
      expect(result.by_indicator_year).not.toContainEqual(
        expect.objectContaining({ indicator_id: 2, year: 2023 }),
      );
      expect(result.by_indicator_year).not.toContainEqual(
        expect.objectContaining({ indicator_id: 1, year: null }),
      );
      expect(result.by_indicator_year.some((cell) => cell.count === 0)).toBe(
        false,
      );
      expect(result.by_indicator_year).toHaveLength(4);

      // 3. Assert cell sums reconcile with total
      const totalCellSum = result.by_indicator_year.reduce(
        (sum, cell) => sum + cell.count,
        0,
      );
      expect(totalCellSum).toBe(result.total);

      // 4. Assert cell sums per indicator reconcile with indicator totals
      const indicator1Sum = result.by_indicator_year
        .filter((cell) => cell.indicator_id === 1)
        .reduce((sum, cell) => sum + cell.count, 0);
      const indicator2Sum = result.by_indicator_year
        .filter((cell) => cell.indicator_id === 2)
        .reduce((sum, cell) => sum + cell.count, 0);

      expect(indicator1Sum).toBe(7);
      expect(indicator2Sum).toBe(3);
      expect(indicator1Sum + indicator2Sum).toBe(result.total);

      // 5. Assert cell sums per year reconcile with by_year counts
      for (const yearBucket of result.by_year) {
        const yearCellSum = result.by_indicator_year
          .filter((cell) => cell.year === yearBucket.year)
          .reduce((sum, cell) => sum + cell.count, 0);
        expect(yearCellSum).toBe(yearBucket.count);
      }
    });

    it('should return empty buckets for an unknown/inaccessible contract (sibling behavior)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ partner_institutions: 0 }])
        .mockResolvedValueOnce([]);

      const result = await repository.getResultsSummaryReport('UNKNOWN');

      expect(result).toEqual({
        total: 0,
        by_status: [],
        by_year: [],
        partner_institutions: 0,
        by_indicator_year: [],
      });
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

  describe('getSpAlignmentReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getSpAlignmentReport('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should build SP alignment report with alignments and count queries (asserts generated SQL text + bound params)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            sp_code: 'SP-01',
            name: 'Science Program 1',
            category: 'Science programs',
            icon_key: 'SP-01',
            result_official_code: 100,
            result_title: 'Result Title 100',
            role: 'PRIMARY',
          },
        ])
        .mockResolvedValueOnce([
          {
            total_results: 1,
            results_with_alignment: 1,
          },
        ]);

      const result = await repository.getSpAlignmentReport('A1676');

      expect(repository.query).toHaveBeenCalledTimes(2);

      const alignmentSql = (repository.query as jest.Mock).mock.calls[0][0];
      const countSql = (repository.query as jest.Mock).mock.calls[1][0];

      // Assert primary contract results subquery predicates
      expect(alignmentSql).toContain('is_primary = TRUE');
      expect(alignmentSql).toContain('is_snapshot = FALSE');
      expect(alignmentSql).toContain('is_active');
      expect(countSql).toContain('is_primary = TRUE');
      expect(countSql).toContain('is_snapshot = FALSE');
      expect(countSql).toContain('is_active');

      // Assert required joins
      expect(alignmentSql).toContain('result_pool_funding_alignment');
      expect(alignmentSql).toContain('result_pool_funding_alignment_sp');
      expect(alignmentSql).toContain('clarisa_science_programs');

      // Assert COALESCE mapping to UNKNOWN in SQL
      expect(alignmentSql).toContain(
        "COALESCE(rpfas.sp_role, 'UNKNOWN') AS role",
      );

      // Assert parameter binding
      expect((repository.query as jest.Mock).mock.calls[0][1]).toEqual([
        'A1676',
      ]);
      expect((repository.query as jest.Mock).mock.calls[1][1]).toEqual([
        'A1676',
      ]);

      expect(result).toEqual({
        sps: [
          {
            sp_code: 'SP-01',
            name: 'Science Program 1',
            category: 'Science programs',
            icon_key: 'SP-01',
            links: [
              {
                result_official_code: '100',
                result_title: 'Result Title 100',
                role: 'PRIMARY',
              },
            ],
          },
        ],
        results_with_alignment: 1,
        results_without_alignment: 0,
      });
    });

    it('should place a result linked to multiple SPs under each SP with its respective role (AC.2)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            sp_code: 'SP-01',
            name: 'Science Program 1',
            category: 'Science programs',
            icon_key: 'SP-01',
            result_official_code: 100,
            result_title: 'Result 100',
            role: 'PRIMARY',
          },
          {
            sp_code: 'SP-02',
            name: 'Science Program 2',
            category: 'Accelerators',
            icon_key: 'SP-02',
            result_official_code: 100,
            result_title: 'Result 100',
            role: 'CONTRIBUTING',
          },
        ])
        .mockResolvedValueOnce([
          {
            total_results: 1,
            results_with_alignment: 1,
          },
        ]);

      const result = await repository.getSpAlignmentReport('A100');

      expect(result.sps).toHaveLength(2);
      expect(result.sps[0]).toEqual({
        sp_code: 'SP-01',
        name: 'Science Program 1',
        category: 'Science programs',
        icon_key: 'SP-01',
        links: [
          {
            result_official_code: '100',
            result_title: 'Result 100',
            role: 'PRIMARY',
          },
        ],
      });
      expect(result.sps[1]).toEqual({
        sp_code: 'SP-02',
        name: 'Science Program 2',
        category: 'Accelerators',
        icon_key: 'SP-02',
        links: [
          {
            result_official_code: '100',
            result_title: 'Result 100',
            role: 'CONTRIBUTING',
          },
        ],
      });
      expect(result.results_with_alignment).toBe(1);
      expect(result.results_without_alignment).toBe(0);
    });

    it('should preserve UNKNOWN role mapping for rows where sp_role was NULL (AC.3 / K-012)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            sp_code: 'SP-01',
            name: 'Science Program 1',
            category: null,
            icon_key: null,
            result_official_code: 200,
            result_title: 'Legacy Result',
            role: 'UNKNOWN',
          },
        ])
        .mockResolvedValueOnce([
          {
            total_results: 2,
            results_with_alignment: 1,
          },
        ]);

      const result = await repository.getSpAlignmentReport('A100');

      expect(result.sps).toEqual([
        {
          sp_code: 'SP-01',
          name: 'Science Program 1',
          category: null,
          icon_key: null,
          links: [
            {
              result_official_code: '200',
              result_title: 'Legacy Result',
              role: 'UNKNOWN',
            },
          ],
        },
      ]);
      expect(result.results_with_alignment).toBe(1);
      expect(result.results_without_alignment).toBe(1);
    });

    it('should return sps: [] and correct counters for a contract with zero alignments (AC.4)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            total_results: 5,
            results_with_alignment: 0,
          },
        ]);

      const result = await repository.getSpAlignmentReport('NON-BILATERAL');

      expect(result).toEqual({
        sps: [],
        results_with_alignment: 0,
        results_without_alignment: 5,
      });
    });

    it('should return sps: [] and 0 counters when contract has no results at all', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            total_results: 0,
            results_with_alignment: 0,
          },
        ]);

      const result = await repository.getSpAlignmentReport('EMPTY-CONTRACT');

      expect(result).toEqual({
        sps: [],
        results_with_alignment: 0,
        results_without_alignment: 0,
      });
    });
  });

  describe('getContractDashboard', () => {
    const mockSummary = {
      total: 10,
      by_status: [{ status_id: 1, name: 'Completed', count: 10 }],
      by_year: [{ year: 2024, count: 10 }],
      partner_institutions: 5,
      by_indicator_year: [{ indicator_id: 1, year: 2024, count: 10 }],
    };

    const mockPartners = {
      contract_id: 'C-100',
      limit: 5,
      top_partners: [
        {
          institution_id: 1,
          institution_name: 'Partner 1',
          acronym: 'P1',
          count: 4,
        },
      ],
    };

    const mockLevers = {
      contract_id: 'C-100',
      limit: 5,
      top_primary_levers: [
        {
          lever_id: 1,
          short_name: 'Lever 1',
          full_name: 'Full Lever 1',
          icon: null,
          count: 8,
        },
      ],
    };

    const mockContacts = {
      contract_id: 'C-100',
      limit: 5,
      top_main_contact_persons: [
        {
          user_id: 'U1',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@cgiar.org',
          count: 6,
        },
      ],
    };

    const mockContributors = {
      contract_id: 'C-100',
      limit: 5,
      top_contributors: [
        {
          contract_id: 'C-200',
          contract_description: 'Contributor desc',
          project_name: 'Contributor proj',
          count: 3,
        },
      ],
    };

    const mockGeoScope = {
      contract_id: 'C-100',
      limit: 5,
      geo_scope_summary: {
        global: 1,
        regional: 2,
        countries: 3,
        sub_national: 4,
        yet_to_be_determined: 0,
      },
      top_regions: [{ region_id: 1, region_name: 'Africa', count: 2 }],
      top_countries: [
        {
          iso_alpha_2: 'KE',
          country_name: 'Kenya',
          count: 3,
          top_sub_nationals: [],
        },
      ],
    };

    const mockSpAlignment = {
      sps: [
        {
          sp_code: 'SP-01',
          name: 'Science Program 1',
          category: 'Science programs',
          icon_key: 'SP-01',
          links: [
            {
              result_official_code: '100',
              result_title: 'Result Title 100',
              role: 'PRIMARY' as const,
            },
          ],
        },
      ],
      results_with_alignment: 1,
      results_without_alignment: 0,
    };

    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getContractDashboard('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        repository.getContractDashboard(null as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getContractDashboard(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should execute all 7 subqueries in parallel and return fully-populated composite object for bilateral contracts', async () => {
      jest
        .spyOn(repository, 'getResultsSummaryReport')
        .mockResolvedValue(mockSummary as any);
      jest
        .spyOn(repository, 'getTopPartnersReport')
        .mockResolvedValue(mockPartners as any);
      jest
        .spyOn(repository, 'getTopPrimaryLeversReport')
        .mockResolvedValue(mockLevers as any);
      jest
        .spyOn(repository, 'getTopMainContactPersonsReport')
        .mockResolvedValue(mockContacts as any);
      jest
        .spyOn(repository, 'getTopContributorsReport')
        .mockResolvedValue(mockContributors as any);
      jest
        .spyOn(repository, 'getGeoScopeReport')
        .mockResolvedValue(mockGeoScope as any);
      jest
        .spyOn(repository, 'getSpAlignmentReport')
        .mockResolvedValue(mockSpAlignment as any);

      const result = await repository.getContractDashboard('C-100');

      expect(repository.getResultsSummaryReport).toHaveBeenCalledWith('C-100');
      expect(repository.getTopPartnersReport).toHaveBeenCalledWith('C-100');
      expect(repository.getTopPrimaryLeversReport).toHaveBeenCalledWith(
        'C-100',
      );
      expect(repository.getTopMainContactPersonsReport).toHaveBeenCalledWith(
        'C-100',
      );
      expect(repository.getTopContributorsReport).toHaveBeenCalledWith('C-100');
      expect(repository.getGeoScopeReport).toHaveBeenCalledWith('C-100');
      expect(repository.getSpAlignmentReport).toHaveBeenCalledWith('C-100');

      expect(result.errors).toEqual([]);
      expect(result.data).toEqual({
        summary: mockSummary,
        tops: {
          partners: mockPartners.top_partners,
          primary_levers: mockLevers.top_primary_levers,
          main_contacts: mockContacts.top_main_contact_persons,
          contributors: mockContributors.top_contributors,
        },
        geo_scope: mockGeoScope,
        sp_alignment: mockSpAlignment,
      });
    });

    it('should isolate a single subquery failure (e.g. getGeoScopeReport) and record error without failing the dashboard', async () => {
      jest
        .spyOn(repository, 'getResultsSummaryReport')
        .mockResolvedValue(mockSummary as any);
      jest
        .spyOn(repository, 'getTopPartnersReport')
        .mockResolvedValue(mockPartners as any);
      jest
        .spyOn(repository, 'getTopPrimaryLeversReport')
        .mockResolvedValue(mockLevers as any);
      jest
        .spyOn(repository, 'getTopMainContactPersonsReport')
        .mockResolvedValue(mockContacts as any);
      jest
        .spyOn(repository, 'getTopContributorsReport')
        .mockResolvedValue(mockContributors as any);
      jest
        .spyOn(repository, 'getGeoScopeReport')
        .mockRejectedValue(new Error('Geo query timeout'));
      jest
        .spyOn(repository, 'getSpAlignmentReport')
        .mockResolvedValue(mockSpAlignment as any);

      const result = await repository.getContractDashboard('C-100');

      expect(result.data.geo_scope).toBeNull();
      expect(result.data.summary).toEqual(mockSummary);
      expect(result.data.tops?.partners).toEqual(mockPartners.top_partners);
      expect(result.data.tops?.primary_levers).toEqual(
        mockLevers.top_primary_levers,
      );
      expect(result.data.tops?.main_contacts).toEqual(
        mockContacts.top_main_contact_persons,
      );
      expect(result.data.tops?.contributors).toEqual(
        mockContributors.top_contributors,
      );
      expect(result.data.sp_alignment).toEqual(mockSpAlignment);
      expect(result.errors).toEqual(['geo_scope: Geo query timeout']);
    });

    it('should isolate multiple subquery failures and populate errors array with each failure descriptor', async () => {
      jest
        .spyOn(repository, 'getResultsSummaryReport')
        .mockRejectedValue(new Error('Summary syntax error'));
      jest
        .spyOn(repository, 'getTopPartnersReport')
        .mockRejectedValue(new Error('Partners DB lock'));
      jest
        .spyOn(repository, 'getTopPrimaryLeversReport')
        .mockResolvedValue(mockLevers as any);
      jest
        .spyOn(repository, 'getTopMainContactPersonsReport')
        .mockResolvedValue(mockContacts as any);
      jest
        .spyOn(repository, 'getTopContributorsReport')
        .mockResolvedValue(mockContributors as any);
      jest
        .spyOn(repository, 'getGeoScopeReport')
        .mockResolvedValue(mockGeoScope as any);
      jest
        .spyOn(repository, 'getSpAlignmentReport')
        .mockResolvedValue(mockSpAlignment as any);

      const result = await repository.getContractDashboard('C-100');

      expect(result.data.summary).toBeNull();
      expect(result.data.tops?.partners).toBeNull();
      expect(result.data.tops?.primary_levers).toEqual(
        mockLevers.top_primary_levers,
      );
      expect(result.data.tops?.main_contacts).toEqual(
        mockContacts.top_main_contact_persons,
      );
      expect(result.data.tops?.contributors).toEqual(
        mockContributors.top_contributors,
      );
      expect(result.data.geo_scope).toEqual(mockGeoScope);
      expect(result.data.sp_alignment).toEqual(mockSpAlignment);
      expect(result.errors).toEqual([
        'summary: Summary syntax error',
        'partners: Partners DB lock',
      ]);
    });

    it('should return sp_alignment: null without error for non-bilateral contract when spAlignmentReport resolves to null', async () => {
      jest
        .spyOn(repository, 'getResultsSummaryReport')
        .mockResolvedValue(mockSummary as any);
      jest
        .spyOn(repository, 'getTopPartnersReport')
        .mockResolvedValue(mockPartners as any);
      jest
        .spyOn(repository, 'getTopPrimaryLeversReport')
        .mockResolvedValue(mockLevers as any);
      jest
        .spyOn(repository, 'getTopMainContactPersonsReport')
        .mockResolvedValue(mockContacts as any);
      jest
        .spyOn(repository, 'getTopContributorsReport')
        .mockResolvedValue(mockContributors as any);
      jest
        .spyOn(repository, 'getGeoScopeReport')
        .mockResolvedValue(mockGeoScope as any);
      jest
        .spyOn(repository, 'getSpAlignmentReport')
        .mockResolvedValue(null as any);

      const result = await repository.getContractDashboard('C-POOL');

      expect(result.data.sp_alignment).toBeNull();
      expect(result.errors).toEqual([]);
      expect(result.data.summary).toEqual(mockSummary);
      expect(result.data.tops?.partners).toEqual(mockPartners.top_partners);
      expect(result.data.geo_scope).toEqual(mockGeoScope);
    });
  });

  describe('getIndicatorTotalResults', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getIndicatorTotalResults('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        repository.getIndicatorTotalResults(null as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getIndicatorTotalResults(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query primary contract results grouped by indicator_id (asserts generated SQL + params)', async () => {
      (repository.query as jest.Mock).mockResolvedValueOnce([
        { indicator_id: 1, count: '5' },
        { indicator_id: 2, count: 3 },
        { indicator_id: 6, count: '10' },
      ]);

      const result = await repository.getIndicatorTotalResults('A1676');

      expect(repository.query).toHaveBeenCalledTimes(1);

      const [sql, params] = (repository.query as jest.Mock).mock.calls[0];

      // Assert generated SQL text + bound params (KZ-001)
      expect(sql).toContain('SELECT DISTINCT r.result_id, r.indicator_id');
      expect(sql).toContain('FROM results r');
      expect(sql).toContain('INNER JOIN result_contracts rc');
      expect(sql).toContain('rc.contract_id = ?');
      expect(sql).toContain('rc.is_primary = TRUE');
      expect(sql).toContain('rc.is_active = TRUE');
      expect(sql).toContain('r.is_active = TRUE');
      expect(sql).toContain('r.is_snapshot = FALSE');
      expect(sql).toContain('GROUP BY cr.indicator_id');
      expect(sql).toContain('WHERE cr.indicator_id IS NOT NULL');
      expect(params).toEqual(['A1676']);

      // Asserts mapping
      expect(result).toEqual({
        1: 5,
        2: 3,
        6: 10,
      });
    });

    it('should return empty record when no indicator results exist', async () => {
      (repository.query as jest.Mock).mockResolvedValueOnce([]);

      const result = await repository.getIndicatorTotalResults('EMPTY-01');

      expect(result).toEqual({});
    });
  });

  describe('getReportingVelocityReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getReportingVelocityReport('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        repository.getReportingVelocityReport(null as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getReportingVelocityReport(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query monthly reporting velocity over the last 24 months grouped by created_at month (asserts generated SQL + params)', async () => {
      (repository.query as jest.Mock).mockResolvedValueOnce([
        { month: '2025-01', count: '4' },
        { month: '2025-02', count: 2 },
        { month: '2026-03', count: '7' },
      ]);

      const result = await repository.getReportingVelocityReport('A1676');

      expect(repository.query).toHaveBeenCalledTimes(1);

      const [sql, params] = (repository.query as jest.Mock).mock.calls[0];

      // Assert generated SQL text + bound params (KZ-001)
      expect(sql).toContain('SELECT DISTINCT r.result_id, r.created_at');
      expect(sql).toContain("DATE_FORMAT(cr.created_at, '%Y-%m')");
      expect(sql).toContain('DATE_SUB(NOW(), INTERVAL 24 MONTH)');
      expect(sql).toContain("GROUP BY DATE_FORMAT(cr.created_at, '%Y-%m')");
      expect(sql).toContain('ORDER BY month ASC');
      expect(sql).toContain('rc.is_primary = TRUE');
      expect(sql).toContain('rc.is_active = TRUE');
      expect(sql).toContain('r.is_active = TRUE');
      expect(sql).toContain('r.is_snapshot = FALSE');

      // MUST-clause requirement: groups by created_at month, NEVER by report_year
      expect(sql).not.toContain('report_year');
      expect(sql).not.toContain('report_year_id');

      expect(params).toEqual(['A1676']);

      // Asserts returned shape
      expect(result).toEqual([
        { month: '2025-01', count: 4 },
        { month: '2025-02', count: 2 },
        { month: '2026-03', count: 7 },
      ]);
    });

    it('should return empty list when no activity in last 24 months', async () => {
      (repository.query as jest.Mock).mockResolvedValueOnce([]);

      const result = await repository.getReportingVelocityReport('INACTIVE-01');

      expect(result).toEqual([]);
    });
  });

  describe('getCapacitySharingDetailsReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(
        repository.getCapacitySharingDetailsReport('', 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getCapacitySharingDetailsReport(null as any, 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getCapacitySharingDetailsReport(undefined as any, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query capacity sharing details and return correctly populated DTO (asserts generated SQL + params + lookup joins)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            n: '3',
            total_trainees: '150',
            female_count: '80',
            male_count: '60',
            non_binary_count: '10',
          },
        ])
        .mockResolvedValueOnce([
          { id: 1, name: 'Short-term', count: '2' },
          { id: 2, name: 'Long-term', count: '1' },
        ])
        .mockResolvedValueOnce([
          { id: 1, name: 'In person', count: '2' },
          { id: 2, name: 'Virtual', count: '1' },
        ])
        .mockResolvedValueOnce([{ id: 1, name: 'Group', count: '3' }]);

      const result = await repository.getCapacitySharingDetailsReport(
        'A1676',
        5,
      );

      expect(repository.query).toHaveBeenCalledTimes(4);

      const [summarySql, summaryParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [sessionLengthsSql, sessionLengthsParams] = (
        repository.query as jest.Mock
      ).mock.calls[1];
      const [deliveryModalitiesSql, deliveryModalitiesParams] = (
        repository.query as jest.Mock
      ).mock.calls[2];
      const [sessionTypesSql, sessionTypesParams] = (
        repository.query as jest.Mock
      ).mock.calls[3];

      // Summary query assertions (KZ-001)
      expect(summarySql).toContain('SELECT DISTINCT r.result_id');
      expect(summarySql).toContain('FROM results r');
      expect(summarySql).toContain('INNER JOIN result_contracts rc');
      expect(summarySql).toContain('rc.contract_id = ?');
      expect(summarySql).toContain('rc.is_primary = TRUE');
      expect(summarySql).toContain('rc.is_active = TRUE');
      expect(summarySql).toContain('r.is_active = TRUE');
      expect(summarySql).toContain('r.is_snapshot = FALSE');
      expect(summarySql).toContain('INNER JOIN result_capacity_sharing rcs');
      expect(summarySql).toContain('rcs.result_id = cr.result_id');
      expect(summarySql).toContain('rcs.is_active = TRUE');
      expect(summarySql).toContain('COUNT(DISTINCT rcs.result_id) AS n');
      expect(summarySql).toContain(
        'COALESCE(SUM(rcs.session_participants_total), 0) AS total_trainees',
      );
      expect(summarySql).toContain(
        'COALESCE(SUM(rcs.session_participants_female), 0) AS female_count',
      );
      expect(summarySql).toContain(
        'COALESCE(SUM(rcs.session_participants_male), 0) AS male_count',
      );
      expect(summarySql).toContain(
        'COALESCE(SUM(rcs.session_participants_non_binary), 0) AS non_binary_count',
      );
      expect(summaryParams).toEqual(['A1676']);

      // Session lengths lookup join assertions
      expect(sessionLengthsSql).toContain('INNER JOIN session_lengths sl');
      expect(sessionLengthsSql).toContain(
        'sl.session_length_id = rcs.session_length_id',
      );
      expect(sessionLengthsSql).toContain('sl.is_active = TRUE');
      expect(sessionLengthsSql).toContain('sl.name AS name');
      expect(sessionLengthsSql).toContain(
        'GROUP BY sl.session_length_id, sl.name',
      );
      expect(sessionLengthsSql).toContain('ORDER BY count DESC, sl.name ASC');
      expect(sessionLengthsParams).toEqual(['A1676']);

      // Delivery modalities lookup join assertions
      expect(deliveryModalitiesSql).toContain(
        'INNER JOIN delivery_modalities dm',
      );
      expect(deliveryModalitiesSql).toContain(
        'dm.delivery_modality_id = rcs.delivery_modality_id',
      );
      expect(deliveryModalitiesSql).toContain('dm.is_active = TRUE');
      expect(deliveryModalitiesSql).toContain('dm.name AS name');
      expect(deliveryModalitiesSql).toContain(
        'GROUP BY dm.delivery_modality_id, dm.name',
      );
      expect(deliveryModalitiesSql).toContain(
        'ORDER BY count DESC, dm.name ASC',
      );
      expect(deliveryModalitiesParams).toEqual(['A1676']);

      // Session types lookup join assertions
      expect(sessionTypesSql).toContain('INNER JOIN session_types st');
      expect(sessionTypesSql).toContain(
        'st.session_type_id = rcs.session_type_id',
      );
      expect(sessionTypesSql).toContain('st.is_active = TRUE');
      expect(sessionTypesSql).toContain('st.name AS name');
      expect(sessionTypesSql).toContain('GROUP BY st.session_type_id, st.name');
      expect(sessionTypesSql).toContain('ORDER BY count DESC, st.name ASC');
      expect(sessionTypesParams).toEqual(['A1676']);

      // Asserts mapping
      expect(result).toEqual({
        meta: {
          total_results: 5,
          n: 3,
        },
        total_trainees: 150,
        gender_split: [
          { gender: 'female', count: 80 },
          { gender: 'male', count: 60 },
          { gender: 'non_binary', count: 10 },
        ],
        session_lengths: [
          { id: 1, name: 'Short-term', count: 2 },
          { id: 2, name: 'Long-term', count: 1 },
        ],
        delivery_modalities: [
          { id: 1, name: 'In person', count: 2 },
          { id: 2, name: 'Virtual', count: 1 },
        ],
        session_types: [{ id: 1, name: 'Group', count: 3 }],
      });
    });

    it('should handle sparse satellite scenario when n < totalResults (absent != 0 semantics)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            n: '2',
            total_trainees: '45',
            female_count: '25',
            male_count: '20',
            non_binary_count: '0',
          },
        ])
        .mockResolvedValueOnce([{ id: 1, name: 'Short-term', count: '2' }])
        .mockResolvedValueOnce([{ id: 1, name: 'In person', count: '2' }])
        .mockResolvedValueOnce([{ id: 1, name: 'Individual', count: '2' }]);

      const result = await repository.getCapacitySharingDetailsReport(
        'A1676',
        10,
      );

      expect(result.meta).toEqual({
        total_results: 10,
        n: 2,
      });
      expect(result.total_trainees).toBe(45);
      expect(result.gender_split).toEqual([
        { gender: 'female', count: 25 },
        { gender: 'male', count: 20 },
        { gender: 'non_binary', count: 0 },
      ]);
    });

    it('should return zeroes and empty arrays when n is 0', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            n: '0',
            total_trainees: '0',
            female_count: '0',
            male_count: '0',
            non_binary_count: '0',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.getCapacitySharingDetailsReport(
        'A1676',
        4,
      );

      expect(result).toEqual({
        meta: {
          total_results: 4,
          n: 0,
        },
        total_trainees: 0,
        gender_split: [],
        session_lengths: [],
        delivery_modalities: [],
        session_types: [],
      });
    });
  });

  describe('getKnowledgeProductDetailsReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(
        repository.getKnowledgeProductDetailsReport('', 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getKnowledgeProductDetailsReport(null as any, 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getKnowledgeProductDetailsReport(undefined as any, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query knowledge product details and return correctly populated DTO (asserts generated SQL + params)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '4' }])
        .mockResolvedValueOnce([
          { name: 'Open access', count: '3' },
          { name: 'Restricted', count: '1' },
        ])
        .mockResolvedValueOnce([
          { name: 'Peer Reviewed Journal Article', count: '4' },
        ])
        .mockResolvedValueOnce([
          { id: null, name: 'Journal Article', count: '4' },
        ])
        .mockResolvedValueOnce([
          { year: 2024, count: '3' },
          { year: 2025, count: '1' },
        ]);

      const result = await repository.getKnowledgeProductDetailsReport(
        'A1676',
        6,
      );

      expect(repository.query).toHaveBeenCalledTimes(5);

      const [countSql, countParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [openAccessSql, openAccessParams] = (repository.query as jest.Mock)
        .mock.calls[1];
      const [accessStatusSql, accessStatusParams] = (
        repository.query as jest.Mock
      ).mock.calls[2];
      const [typesSql, typesParams] = (repository.query as jest.Mock).mock
        .calls[3];
      const [pubYearSql, pubYearParams] = (repository.query as jest.Mock).mock
        .calls[4];

      // Count query assertions (KZ-001)
      expect(countSql).toContain('SELECT DISTINCT r.result_id');
      expect(countSql).toContain('INNER JOIN result_knowledge_products rkp');
      expect(countSql).toContain('rkp.result_id = cr.result_id');
      expect(countSql).toContain('rkp.is_active = TRUE');
      expect(countSql).toContain('COUNT(DISTINCT rkp.result_id) AS n');
      expect(countParams).toEqual(['A1676']);

      // Open access query assertions
      expect(openAccessSql).toContain(
        "WHEN rkp.open_access = TRUE THEN 'Open access'",
      );
      expect(openAccessSql).toContain(
        "WHEN rkp.open_access = FALSE THEN 'Restricted'",
      );
      expect(openAccessSql).toContain("ELSE 'Unknown'");
      expect(openAccessSql).toContain('ORDER BY count DESC, name ASC');
      expect(openAccessParams).toEqual(['A1676']);

      // Access status query assertions
      expect(accessStatusSql).toContain(
        "COALESCE(NULLIF(TRIM(rkp.access_status), ''), 'Unknown')",
      );
      expect(accessStatusSql).toContain('ORDER BY count DESC, name ASC');
      expect(accessStatusParams).toEqual(['A1676']);

      // Types query assertions
      expect(typesSql).toContain(
        "COALESCE(NULLIF(TRIM(rkp.type), ''), 'Unknown')",
      );
      expect(typesSql).toContain('ORDER BY count DESC, name ASC');
      expect(typesParams).toEqual(['A1676']);

      // Publications by year assertions
      expect(pubYearSql).toContain(
        'CAST(SUBSTRING(TRIM(rkp.publication_date), 1, 4) AS UNSIGNED)',
      );
      expect(pubYearSql).toContain('ORDER BY year ASC');
      expect(pubYearParams).toEqual(['A1676']);

      // Asserts mapping
      expect(result).toEqual({
        meta: {
          total_results: 6,
          n: 4,
        },
        open_access_split: [
          { name: 'Open access', count: 3 },
          { name: 'Restricted', count: 1 },
        ],
        access_status: [{ name: 'Peer Reviewed Journal Article', count: 4 }],
        types: [{ id: null, name: 'Journal Article', count: 4 }],
        publications_by_year: [
          { year: 2024, count: 3 },
          { year: 2025, count: 1 },
        ],
      });
    });

    it('should handle sparse satellite scenario when n < totalResults', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '3' }])
        .mockResolvedValueOnce([{ name: 'Open access', count: '3' }])
        .mockResolvedValueOnce([{ name: 'Published', count: '3' }])
        .mockResolvedValueOnce([{ id: null, name: 'Book Chapter', count: '3' }])
        .mockResolvedValueOnce([{ year: 2023, count: '3' }]);

      const result = await repository.getKnowledgeProductDetailsReport(
        'A1676',
        8,
      );

      expect(result.meta).toEqual({
        total_results: 8,
        n: 3,
      });
      expect(result.open_access_split).toEqual([
        { name: 'Open access', count: 3 },
      ]);
    });

    it('should return empty arrays when n is 0', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '0' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.getKnowledgeProductDetailsReport(
        'A1676',
        3,
      );

      expect(result).toEqual({
        meta: {
          total_results: 3,
          n: 0,
        },
        open_access_split: [],
        access_status: [],
        types: [],
        publications_by_year: [],
      });
    });
  });

  describe('getOicrDetailsReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(repository.getOicrDetailsReport('', 5)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        repository.getOicrDetailsReport(null as any, 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getOicrDetailsReport(undefined as any, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query OICR details and return correctly populated DTO (asserts generated SQL + params + lookup joins)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '2' }])
        .mockResolvedValueOnce([
          { id: 1, name: 'Level 1 - Discovery', count: '1' },
          { id: 2, name: 'Level 2 - Piloting', count: '1' },
        ])
        .mockResolvedValueOnce([
          { name: 'External use', count: '1' },
          { name: 'Internal', count: '1' },
        ]);

      const result = await repository.getOicrDetailsReport('A1676', 4);

      expect(repository.query).toHaveBeenCalledTimes(3);

      const [countSql, countParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [maturityLevelsSql, maturityLevelsParams] = (
        repository.query as jest.Mock
      ).mock.calls[1];
      const [externalUseSql, externalUseParams] = (
        repository.query as jest.Mock
      ).mock.calls[2];

      // Count query assertions (KZ-001)
      expect(countSql).toContain('SELECT DISTINCT r.result_id');
      expect(countSql).toContain('INNER JOIN result_oicrs ro');
      expect(countSql).toContain('ro.result_id = cr.result_id');
      expect(countSql).toContain('ro.is_active = TRUE');
      expect(countSql).toContain('COUNT(DISTINCT ro.result_id) AS n');
      expect(countParams).toEqual(['A1676']);

      // Maturity levels lookup join assertions
      expect(maturityLevelsSql).toContain('INNER JOIN maturity_levels ml');
      expect(maturityLevelsSql).toContain('ml.id = ro.maturity_level_id');
      expect(maturityLevelsSql).toContain('ml.is_active = TRUE');
      expect(maturityLevelsSql).toContain('ml.name AS name');
      expect(maturityLevelsSql).toContain('GROUP BY ml.id, ml.name');
      expect(maturityLevelsSql).toContain('ORDER BY count DESC, ml.name ASC');
      expect(maturityLevelsParams).toEqual(['A1676']);

      // External use query assertions
      expect(externalUseSql).toContain(
        "WHEN ro.for_external_use = TRUE THEN 'External use'",
      );
      expect(externalUseSql).toContain(
        "WHEN ro.for_external_use = FALSE THEN 'Internal'",
      );
      expect(externalUseSql).toContain("ELSE 'Not specified'");
      expect(externalUseSql).toContain('ORDER BY count DESC, name ASC');
      expect(externalUseParams).toEqual(['A1676']);

      // Asserts mapping
      expect(result).toEqual({
        meta: {
          total_results: 4,
          n: 2,
        },
        maturity_levels: [
          { id: 1, name: 'Level 1 - Discovery', count: 1 },
          { id: 2, name: 'Level 2 - Piloting', count: 1 },
        ],
        external_use_split: [
          { name: 'External use', count: 1 },
          { name: 'Internal', count: 1 },
        ],
      });
    });

    it('should handle sparse satellite scenario when n < totalResults', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '2' }])
        .mockResolvedValueOnce([
          { id: 3, name: 'Level 3 - Scaling', count: '2' },
        ])
        .mockResolvedValueOnce([{ name: 'External use', count: '2' }]);

      const result = await repository.getOicrDetailsReport('A1676', 5);

      expect(result.meta).toEqual({
        total_results: 5,
        n: 2,
      });
      expect(result.maturity_levels).toEqual([
        { id: 3, name: 'Level 3 - Scaling', count: 2 },
      ]);
      expect(result.external_use_split).toEqual([
        { name: 'External use', count: 2 },
      ]);
    });

    it('should return empty arrays when n is 0', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '0' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.getOicrDetailsReport('A1676', 2);

      expect(result).toEqual({
        meta: {
          total_results: 2,
          n: 0,
        },
        maturity_levels: [],
        external_use_split: [],
      });
    });
  });

  describe('getInnovationDevDetailsReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(
        repository.getInnovationDevDetailsReport('', 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getInnovationDevDetailsReport(null as any, 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getInnovationDevDetailsReport(undefined as any, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query innovation dev details and return correctly populated DTO (asserts generated SQL + params + lookup joins + scalability boolean logic)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '3' }])
        .mockResolvedValueOnce([
          {
            id: 1,
            name: 'Level 1 - Basic principles observed',
            level: 1,
            count: '1',
          },
          {
            id: 2,
            name: 'Level 2 - Technology concept formulated',
            level: 2,
            count: '2',
          },
        ])
        .mockResolvedValueOnce([
          { id: 10, name: 'Technological innovation', count: '2' },
          { id: 20, name: 'Capacity development', count: '1' },
        ])
        .mockResolvedValueOnce([
          { id: 5, name: 'Research material', count: '3' },
        ])
        .mockResolvedValueOnce([
          { id: 1, name: 'Farmers', count: '2' },
          { id: 2, name: 'Researchers', count: '1' },
        ])
        .mockResolvedValueOnce([
          {
            is_cheaper_than_alternatives_true: '2',
            is_cheaper_than_alternatives_answered: '3',
            is_simpler_to_use_true: '1',
            is_simpler_to_use_answered: '2',
            does_perform_better_true: '3',
            does_perform_better_answered: '3',
            is_desirable_to_users_true: '2',
            is_desirable_to_users_answered: '2',
            has_commercial_viability_true: '1',
            has_commercial_viability_answered: '3',
            has_suitable_enabling_environment_true: '0',
            has_suitable_enabling_environment_answered: '1',
            has_evidence_of_uptake_true: '1',
            has_evidence_of_uptake_answered: '2',
          },
        ]);

      const result = await repository.getInnovationDevDetailsReport('A1676', 5);

      expect(repository.query).toHaveBeenCalledTimes(6);

      const [countSql, countParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [readinessSql, readinessParams] = (repository.query as jest.Mock)
        .mock.calls[1];
      const [typesSql, typesParams] = (repository.query as jest.Mock).mock
        .calls[2];
      const [naturesSql, naturesParams] = (repository.query as jest.Mock).mock
        .calls[3];
      const [usersSql, usersParams] = (repository.query as jest.Mock).mock
        .calls[4];
      const [scalabilitySql, scalabilityParams] = (
        repository.query as jest.Mock
      ).mock.calls[5];

      // Count query assertions (KZ-001)
      expect(countSql).toContain('SELECT DISTINCT r.result_id');
      expect(countSql).toContain('INNER JOIN result_innovation_dev rid');
      expect(countSql).toContain('rid.result_id = cr.result_id');
      expect(countSql).toContain('rid.is_active = TRUE');
      expect(countSql).toContain('COUNT(DISTINCT rid.result_id) AS n');
      expect(countParams).toEqual(['A1676']);

      // Readiness levels lookup join assertions & ordering
      expect(readinessSql).toContain(
        'INNER JOIN clarisa_innovation_readiness_levels cirl',
      );
      expect(readinessSql).toContain('cirl.id = rid.innovation_readiness_id');
      expect(readinessSql).toContain('cirl.is_active = TRUE');
      expect(readinessSql).toContain('cirl.name AS name');
      expect(readinessSql).toContain('cirl.level AS level');
      expect(readinessSql).toContain('GROUP BY cirl.id, cirl.name, cirl.level');
      expect(readinessSql).toContain('ORDER BY cirl.level ASC');
      expect(readinessParams).toEqual(['A1676']);

      // Innovation types lookup join assertions
      expect(typesSql).toContain('INNER JOIN clarisa_innovation_types cit');
      expect(typesSql).toContain('cit.code = rid.innovation_type_id');
      expect(typesSql).toContain('cit.is_active = TRUE');
      expect(typesSql).toContain('cit.code AS id');
      expect(typesSql).toContain('cit.name AS name');
      expect(typesSql).toContain('GROUP BY cit.code, cit.name');
      expect(typesSql).toContain('ORDER BY count DESC, cit.name ASC');
      expect(typesParams).toEqual(['A1676']);

      // Innovation natures lookup join assertions
      expect(naturesSql).toContain(
        'INNER JOIN clarisa_innovation_characteristics cic',
      );
      expect(naturesSql).toContain('cic.id = rid.innovation_nature_id');
      expect(naturesSql).toContain('cic.is_active = TRUE');
      expect(naturesSql).toContain('cic.id AS id');
      expect(naturesSql).toContain('cic.name AS name');
      expect(naturesSql).toContain('GROUP BY cic.id, cic.name');
      expect(naturesSql).toContain('ORDER BY count DESC, cic.name ASC');
      expect(naturesParams).toEqual(['A1676']);

      // Anticipated users lookup join assertions
      expect(usersSql).toContain(
        'INNER JOIN innovation_dev_anticipated_users idau',
      );
      expect(usersSql).toContain('idau.id = rid.anticipated_users_id');
      expect(usersSql).toContain('idau.is_active = TRUE');
      expect(usersSql).toContain('idau.id AS id');
      expect(usersSql).toContain('idau.name AS name');
      expect(usersSql).toContain('GROUP BY idau.id, idau.name');
      expect(usersSql).toContain('ORDER BY count DESC, idau.name ASC');
      expect(usersParams).toEqual(['A1676']);

      // Scalability profile 7-boolean logic assertions (NULL is neither true nor answered)
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.is_cheaper_than_alternatives = 1 THEN 1 ELSE 0 END) AS is_cheaper_than_alternatives_true',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.is_cheaper_than_alternatives IS NOT NULL THEN 1 ELSE 0 END) AS is_cheaper_than_alternatives_answered',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.is_simpler_to_use = 1 THEN 1 ELSE 0 END) AS is_simpler_to_use_true',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.is_simpler_to_use IS NOT NULL THEN 1 ELSE 0 END) AS is_simpler_to_use_answered',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.does_perform_better = 1 THEN 1 ELSE 0 END) AS does_perform_better_true',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.does_perform_better IS NOT NULL THEN 1 ELSE 0 END) AS does_perform_better_answered',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.is_desirable_to_users = 1 THEN 1 ELSE 0 END) AS is_desirable_to_users_true',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.is_desirable_to_users IS NOT NULL THEN 1 ELSE 0 END) AS is_desirable_to_users_answered',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.has_commercial_viability = 1 THEN 1 ELSE 0 END) AS has_commercial_viability_true',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.has_commercial_viability IS NOT NULL THEN 1 ELSE 0 END) AS has_commercial_viability_answered',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.has_suitable_enabling_environment = 1 THEN 1 ELSE 0 END) AS has_suitable_enabling_environment_true',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.has_suitable_enabling_environment IS NOT NULL THEN 1 ELSE 0 END) AS has_suitable_enabling_environment_answered',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.has_evidence_of_uptake = 1 THEN 1 ELSE 0 END) AS has_evidence_of_uptake_true',
      );
      expect(scalabilitySql).toContain(
        'SUM(CASE WHEN rid.has_evidence_of_uptake IS NOT NULL THEN 1 ELSE 0 END) AS has_evidence_of_uptake_answered',
      );
      expect(scalabilityParams).toEqual(['A1676']);

      // Asserts mapping
      expect(result).toEqual({
        meta: {
          total_results: 5,
          n: 3,
        },
        readiness_levels: [
          {
            id: 1,
            name: 'Level 1 - Basic principles observed',
            level: 1,
            count: 1,
          },
          {
            id: 2,
            name: 'Level 2 - Technology concept formulated',
            level: 2,
            count: 2,
          },
        ],
        innovation_types: [
          { id: 10, name: 'Technological innovation', count: 2 },
          { id: 20, name: 'Capacity development', count: 1 },
        ],
        innovation_natures: [{ id: 5, name: 'Research material', count: 3 }],
        anticipated_users: [
          { id: 1, name: 'Farmers', count: 2 },
          { id: 2, name: 'Researchers', count: 1 },
        ],
        scalability_profile: [
          {
            key: 'is_cheaper_than_alternatives',
            name: 'Cheaper than alternatives',
            true_count: 2,
            answered_count: 3,
          },
          {
            key: 'is_simpler_to_use',
            name: 'Simpler to use',
            true_count: 1,
            answered_count: 2,
          },
          {
            key: 'does_perform_better',
            name: 'Does perform better',
            true_count: 3,
            answered_count: 3,
          },
          {
            key: 'is_desirable_to_users',
            name: 'Desirable to users',
            true_count: 2,
            answered_count: 2,
          },
          {
            key: 'has_commercial_viability',
            name: 'Commercial viability',
            true_count: 1,
            answered_count: 3,
          },
          {
            key: 'has_suitable_enabling_environment',
            name: 'Suitable enabling environment',
            true_count: 0,
            answered_count: 1,
          },
          {
            key: 'has_evidence_of_uptake',
            name: 'Evidence of uptake',
            true_count: 1,
            answered_count: 2,
          },
        ],
      });
    });

    it('should handle sparse satellite scenario when n < totalResults', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '2' }])
        .mockResolvedValueOnce([
          { id: 1, name: 'Level 1', level: 1, count: '2' },
        ])
        .mockResolvedValueOnce([
          { id: 10, name: 'Technological innovation', count: '2' },
        ])
        .mockResolvedValueOnce([
          { id: 5, name: 'Research material', count: '2' },
        ])
        .mockResolvedValueOnce([{ id: 1, name: 'Farmers', count: '2' }])
        .mockResolvedValueOnce([
          {
            is_cheaper_than_alternatives_true: '1',
            is_cheaper_than_alternatives_answered: '2',
            is_simpler_to_use_true: '1',
            is_simpler_to_use_answered: '2',
            does_perform_better_true: '1',
            does_perform_better_answered: '2',
            is_desirable_to_users_true: '1',
            is_desirable_to_users_answered: '2',
            has_commercial_viability_true: '1',
            has_commercial_viability_answered: '2',
            has_suitable_enabling_environment_true: '1',
            has_suitable_enabling_environment_answered: '2',
            has_evidence_of_uptake_true: '1',
            has_evidence_of_uptake_answered: '2',
          },
        ]);

      const result = await repository.getInnovationDevDetailsReport('A1676', 7);

      expect(result.meta).toEqual({
        total_results: 7,
        n: 2,
      });
      expect(result.readiness_levels).toEqual([
        { id: 1, name: 'Level 1', level: 1, count: 2 },
      ]);
    });

    it('should return empty arrays when n is 0', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '0' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.getInnovationDevDetailsReport('A1676', 3);

      expect(result).toEqual({
        meta: {
          total_results: 3,
          n: 0,
        },
        readiness_levels: [],
        innovation_types: [],
        innovation_natures: [],
        anticipated_users: [],
        scalability_profile: [],
      });
    });
  });

  describe('getPolicyChangeDetailsReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(
        repository.getPolicyChangeDetailsReport('', 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getPolicyChangeDetailsReport(null as any, 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getPolicyChangeDetailsReport(undefined as any, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query policy change details and return correctly populated DTO (asserts generated SQL + params + lookup joins + funnel ordering + implicated institutions)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '2' }])
        .mockResolvedValueOnce([
          { id: 1, name: 'Stage 1: Research taken up', order: 1, count: '1' },
          { id: 2, name: 'Stage 2: Policy enacted', order: 2, count: '1' },
        ])
        .mockResolvedValueOnce([
          { id: 3, name: 'Policy or Strategy', count: '2' },
        ])
        .mockResolvedValueOnce([{ count: '5' }]);

      const result = await repository.getPolicyChangeDetailsReport('A1676', 4);

      expect(repository.query).toHaveBeenCalledTimes(4);

      const [countSql, countParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [stageFunnelSql, stageFunnelParams] = (
        repository.query as jest.Mock
      ).mock.calls[1];
      const [policyTypesSql, policyTypesParams] = (
        repository.query as jest.Mock
      ).mock.calls[2];
      const [implicatedSql, implicatedParams] = (repository.query as jest.Mock)
        .mock.calls[3];

      // Count query assertions (KZ-001)
      expect(countSql).toContain('SELECT DISTINCT r.result_id');
      expect(countSql).toContain('INNER JOIN result_policy_change rpc');
      expect(countSql).toContain('rpc.result_id = cr.result_id');
      expect(countSql).toContain('rpc.is_active = TRUE');
      expect(countSql).toContain('COUNT(DISTINCT rpc.result_id) AS n');
      expect(countParams).toEqual(['A1676']);

      // Stage funnel lookup join assertions and ordering (R-1: ORDER BY ps.policy_stage_id ASC)
      expect(stageFunnelSql).toContain('INNER JOIN policy_stage ps');
      expect(stageFunnelSql).toContain(
        'ps.policy_stage_id = rpc.policy_stage_id',
      );
      expect(stageFunnelSql).toContain('ps.is_active = TRUE');
      expect(stageFunnelSql).toContain('ps.policy_stage_id AS id');
      expect(stageFunnelSql).toContain('ps.name AS name');
      expect(stageFunnelSql).toContain('ps.policy_stage_id AS `order`');
      expect(stageFunnelSql).toContain('GROUP BY ps.policy_stage_id, ps.name');
      expect(stageFunnelSql).toContain('ORDER BY ps.policy_stage_id ASC');
      expect(stageFunnelParams).toEqual(['A1676']);

      // Policy types lookup join assertions
      expect(policyTypesSql).toContain('INNER JOIN policy_types pt');
      expect(policyTypesSql).toContain(
        'pt.policy_type_id = rpc.policy_type_id',
      );
      expect(policyTypesSql).toContain('pt.is_active = TRUE');
      expect(policyTypesSql).toContain('pt.policy_type_id AS id');
      expect(policyTypesSql).toContain('pt.name AS name');
      expect(policyTypesSql).toContain('GROUP BY pt.policy_type_id, pt.name');
      expect(policyTypesSql).toContain('ORDER BY count DESC, pt.name ASC');
      expect(policyTypesParams).toEqual(['A1676']);

      // Implicated institutions query assertions (result_institutions role 4)
      expect(implicatedSql).toContain('INNER JOIN result_institutions ri');
      expect(implicatedSql).toContain('ri.result_id = cr.result_id');
      expect(implicatedSql).toContain('ri.is_active = TRUE');
      expect(implicatedSql).toContain('ri.institution_role_id = 4');
      expect(implicatedSql).toContain(
        'COUNT(DISTINCT ri.institution_id) AS count',
      );
      expect(implicatedParams).toEqual(['A1676']);

      // Asserts mapping
      expect(result).toEqual({
        meta: {
          total_results: 4,
          n: 2,
        },
        stage_funnel: [
          { id: 1, name: 'Stage 1: Research taken up', order: 1, count: 1 },
          { id: 2, name: 'Stage 2: Policy enacted', order: 2, count: 1 },
        ],
        policy_types: [{ id: 3, name: 'Policy or Strategy', count: 2 }],
        implicated_institutions_count: 5,
      });
    });

    it('should handle sparse satellite scenario when n < totalResults', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '2' }])
        .mockResolvedValueOnce([
          { id: 1, name: 'Stage 1: Research taken up', order: 1, count: '2' },
        ])
        .mockResolvedValueOnce([
          { id: 1, name: 'Policy or Strategy', count: '2' },
        ])
        .mockResolvedValueOnce([{ count: '3' }]);

      const result = await repository.getPolicyChangeDetailsReport('A1676', 6);

      expect(result.meta).toEqual({
        total_results: 6,
        n: 2,
      });
      expect(result.stage_funnel).toEqual([
        { id: 1, name: 'Stage 1: Research taken up', order: 1, count: 2 },
      ]);
      expect(result.implicated_institutions_count).toBe(3);
    });

    it('should return empty arrays and 0 count when n is 0', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '0' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.getPolicyChangeDetailsReport('A1676', 4);

      expect(result).toEqual({
        meta: {
          total_results: 4,
          n: 0,
        },
        stage_funnel: [],
        policy_types: [],
        implicated_institutions_count: 0,
      });
    });
  });

  describe('getInnovationUseDetailsReport', () => {
    it('should throw BadRequestException when contract id is empty', async () => {
      await expect(
        repository.getInnovationUseDetailsReport('', 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getInnovationUseDetailsReport(null as any, 5),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getInnovationUseDetailsReport(undefined as any, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query innovation use details and return correctly populated DTO (asserts generated SQL + params + lookup joins + gender youth sums + actor types breakdown + quantifications)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '3' }])
        .mockResolvedValueOnce([
          {
            women_youth: '15',
            women_not_youth: '25',
            men_youth: '30',
            men_not_youth: '40',
          },
        ])
        .mockResolvedValueOnce([
          {
            actor_type_id: 1,
            actor_type_name: 'Farmers',
            women_youth: '10',
            women_not_youth: '15',
            men_youth: '20',
            men_not_youth: '25',
          },
          {
            actor_type_id: 2,
            actor_type_name: 'Researchers',
            women_youth: '5',
            women_not_youth: '10',
            men_youth: '10',
            men_not_youth: '15',
          },
        ])
        .mockResolvedValueOnce([
          { id: 1, name: 'Government', count: '2' },
          { id: 2, name: 'NGO', count: '1' },
        ])
        .mockResolvedValueOnce([
          { unit: 'Hectares', total: '500', count: '2' },
          { unit: 'People', total: '1200', count: '1' },
        ]);

      const result = await repository.getInnovationUseDetailsReport('A1676', 5);

      expect(repository.query).toHaveBeenCalledTimes(5);

      const [countSql, countParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [overallSql, overallParams] = (repository.query as jest.Mock).mock
        .calls[1];
      const [actorReachSql, actorReachParams] = (repository.query as jest.Mock)
        .mock.calls[2];
      const [orgTypesSql, orgTypesParams] = (repository.query as jest.Mock).mock
        .calls[3];
      const [quantSql, quantParams] = (repository.query as jest.Mock).mock
        .calls[4];

      // Count query assertions (KZ-001) - checks LEFT JOINs to actors, institution types, and quantifications
      expect(countSql).toContain('SELECT DISTINCT r.result_id');
      expect(countSql).toContain('LEFT JOIN result_actors ra');
      expect(countSql).toContain('ra.result_id = cr.result_id');
      expect(countSql).toContain('ra.is_active = TRUE');
      expect(countSql).toContain('LEFT JOIN result_institution_types rit');
      expect(countSql).toContain('rit.result_id = cr.result_id');
      expect(countSql).toContain('rit.is_active = TRUE');
      expect(countSql).toContain('LEFT JOIN result_quantifications rq');
      expect(countSql).toContain('rq.result_id = cr.result_id');
      expect(countSql).toContain('rq.is_active = TRUE');
      expect(countSql).toContain('ra.result_id IS NOT NULL');
      expect(countSql).toContain('rit.result_id IS NOT NULL');
      expect(countSql).toContain('rq.result_id IS NOT NULL');
      expect(countSql).toContain('COUNT(DISTINCT cr.result_id) AS n');
      expect(countParams).toEqual(['A1676']);

      // Overall gender youth reach query assertions
      expect(overallSql).toContain('INNER JOIN result_actors ra');
      expect(overallSql).toContain('ra.result_id = cr.result_id');
      expect(overallSql).toContain('ra.is_active = TRUE');
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.women_youth), 0) AS women_youth',
      );
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.women_not_youth), 0) AS women_not_youth',
      );
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.men_youth), 0) AS men_youth',
      );
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.men_not_youth), 0) AS men_not_youth',
      );
      expect(overallParams).toEqual(['A1676']);

      // Actor reach breakdown query assertions (clarisa_actor_types lookup join)
      expect(actorReachSql).toContain('INNER JOIN result_actors ra');
      expect(actorReachSql).toContain('INNER JOIN clarisa_actor_types cat');
      expect(actorReachSql).toContain('cat.code = ra.actor_type_id');
      expect(actorReachSql).toContain('cat.is_active = TRUE');
      expect(actorReachSql).toContain('cat.code AS actor_type_id');
      expect(actorReachSql).toContain('cat.name AS actor_type_name');
      expect(actorReachSql).toContain(
        'COALESCE(SUM(ra.women_youth), 0) AS women_youth',
      );
      expect(actorReachSql).toContain(
        'COALESCE(SUM(ra.women_not_youth), 0) AS women_not_youth',
      );
      expect(actorReachSql).toContain(
        'COALESCE(SUM(ra.men_youth), 0) AS men_youth',
      );
      expect(actorReachSql).toContain(
        'COALESCE(SUM(ra.men_not_youth), 0) AS men_not_youth',
      );
      expect(actorReachSql).toContain('GROUP BY cat.code, cat.name');
      expect(actorReachParams).toEqual(['A1676']);

      // Organization types query assertions (clarisa_institution_types lookup join)
      expect(orgTypesSql).toContain('INNER JOIN result_institution_types rit');
      expect(orgTypesSql).toContain('rit.result_id = cr.result_id');
      expect(orgTypesSql).toContain('rit.is_active = TRUE');
      expect(orgTypesSql).toContain('INNER JOIN clarisa_institution_types cit');
      expect(orgTypesSql).toContain('cit.code = rit.institution_type_id');
      expect(orgTypesSql).toContain('cit.is_active = TRUE');
      expect(orgTypesSql).toContain('cit.code AS id');
      expect(orgTypesSql).toContain('cit.name AS name');
      expect(orgTypesSql).toContain('GROUP BY cit.code, cit.name');
      expect(orgTypesSql).toContain('ORDER BY count DESC, cit.name ASC');
      expect(orgTypesParams).toEqual(['A1676']);

      // Quantifications query assertions
      expect(quantSql).toContain('INNER JOIN result_quantifications rq');
      expect(quantSql).toContain('rq.result_id = cr.result_id');
      expect(quantSql).toContain('rq.is_active = TRUE');
      expect(quantSql).toContain(
        "COALESCE(NULLIF(TRIM(rq.unit), ''), 'Unknown') AS unit",
      );
      expect(quantSql).toContain(
        'COALESCE(SUM(rq.quantification_number), 0) AS total',
      );
      expect(quantSql).toContain('COUNT(DISTINCT rq.result_id) AS count');
      expect(quantSql).toContain('ORDER BY count DESC, unit ASC');
      expect(quantParams).toEqual(['A1676']);

      // Asserts mapping
      expect(result).toEqual({
        meta: {
          total_results: 5,
          n: 3,
        },
        gender_youth_reach: {
          overall: {
            women_youth: 15,
            women_not_youth: 25,
            men_youth: 30,
            men_not_youth: 40,
            total: 110,
          },
          by_actor_type: [
            {
              actor_type_id: 1,
              actor_type_name: 'Farmers',
              women_youth: 10,
              women_not_youth: 15,
              men_youth: 20,
              men_not_youth: 25,
              total: 70,
            },
            {
              actor_type_id: 2,
              actor_type_name: 'Researchers',
              women_youth: 5,
              women_not_youth: 10,
              men_youth: 10,
              men_not_youth: 15,
              total: 40,
            },
          ],
        },
        organization_types: [
          { id: 1, name: 'Government', count: 2 },
          { id: 2, name: 'NGO', count: 1 },
        ],
        quantifications: [
          { unit: 'Hectares', total: 500, count: 2 },
          { unit: 'People', total: 1200, count: 1 },
        ],
      });
    });

    it('should handle sparse satellite scenario when n < totalResults', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '3' }])
        .mockResolvedValueOnce([
          {
            women_youth: '15',
            women_not_youth: '25',
            men_youth: '30',
            men_not_youth: '40',
          },
        ])
        .mockResolvedValueOnce([
          {
            actor_type_id: 1,
            actor_type_name: 'Farmers',
            women_youth: '15',
            women_not_youth: '25',
            men_youth: '30',
            men_not_youth: '40',
          },
        ])
        .mockResolvedValueOnce([{ id: 1, name: 'Government', count: '2' }])
        .mockResolvedValueOnce([{ unit: 'People', total: '20', count: '1' }]);

      const result = await repository.getInnovationUseDetailsReport('A1676', 8);

      expect(result.meta).toEqual({
        total_results: 8,
        n: 3,
      });
      expect(result.gender_youth_reach.overall).toEqual({
        women_youth: 15,
        women_not_youth: 25,
        men_youth: 30,
        men_not_youth: 40,
        total: 110,
      });
    });

    it('should return empty arrays and 0 reach when n is 0', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '0' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.getInnovationUseDetailsReport('A1676', 5);

      expect(result).toEqual({
        meta: {
          total_results: 5,
          n: 0,
        },
        gender_youth_reach: {
          overall: {
            women_youth: 0,
            women_not_youth: 0,
            men_youth: 0,
            men_not_youth: 0,
            total: 0,
          },
          by_actor_type: [],
        },
        organization_types: [],
        quantifications: [],
      });
    });
  });

  describe('getReachSection (private, F4 insights)', () => {
    it('should query portfolio reach and return correctly populated DTO (asserts generated SQL + params + NULL-excluded sums + custom-name fallback + not_disaggregated_rows separated)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            n: '4',
            women_youth: '10',
            women_not_youth: '5',
            men_youth: '8',
            men_not_youth: '3',
            not_disaggregated_rows: '2',
          },
        ])
        .mockResolvedValueOnce([
          {
            actor_type_id: 1,
            actor_type_name: 'Farmers / (agro)pastoralist / herders / fishers',
            women_youth: '6',
            women_not_youth: '2',
            men_youth: '4',
            men_not_youth: '1',
          },
          {
            actor_type_id: 5,
            actor_type_name: 'Community radio hosts',
            women_youth: '4',
            women_not_youth: '3',
            men_youth: '4',
            men_not_youth: '2',
          },
        ]);

      const result = await repository['getReachSection']('A511', 5);

      expect(repository.query).toHaveBeenCalledTimes(2);

      const [overallSql, overallParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [byActorTypeSql, byActorTypeParams] = (
        repository.query as jest.Mock
      ).mock.calls[1];

      // Overall query assertions (KZ-001) — SUM naturally excludes per-row
      // NULLs; the outer COALESCE only guards an all-NULL/no-row aggregate.
      expect(overallSql).toContain('SELECT DISTINCT r.result_id');
      expect(overallSql).toContain('INNER JOIN result_actors ra');
      expect(overallSql).toContain('ra.result_id = cr.result_id');
      expect(overallSql).toContain('ra.is_active = TRUE');
      expect(overallSql).toContain('COUNT(DISTINCT ra.result_id) AS n');
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.women_youth), 0) AS women_youth',
      );
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.women_not_youth), 0) AS women_not_youth',
      );
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.men_youth), 0) AS men_youth',
      );
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.men_not_youth), 0) AS men_not_youth',
      );
      // not_disaggregated_rows counted separately from the sums, never inside them
      expect(overallSql).toContain(
        'SUM(CASE WHEN ra.sex_age_disaggregation_not_apply = TRUE THEN 1 ELSE 0 END) AS not_disaggregated_rows',
      );
      expect(overallParams).toEqual(['A511']);

      // Per-actor-type breakdown: lookup join + custom-name fallback for "other" (code 5)
      expect(byActorTypeSql).toContain('INNER JOIN clarisa_actor_types cat');
      expect(byActorTypeSql).toContain('cat.code = ra.actor_type_id');
      expect(byActorTypeSql).toContain('cat.is_active = TRUE');
      expect(byActorTypeSql).toContain('WHEN cat.code = 5');
      expect(byActorTypeSql).toContain(
        "COALESCE(NULLIF(TRIM(MAX(ra.actor_type_custom_name)), ''), cat.name)",
      );
      expect(byActorTypeSql).toContain('GROUP BY cat.code, cat.name');
      expect(byActorTypeSql).toContain('DESC, cat.name ASC');
      expect(byActorTypeParams).toEqual(['A511']);

      expect(result).toEqual({
        meta: { total_results: 5, n: 4 },
        overall: {
          women_youth: 10,
          women_not_youth: 5,
          men_youth: 8,
          men_not_youth: 3,
          total: 26,
        },
        by_actor_type: [
          {
            actor_type_id: 1,
            actor_type_name: 'Farmers / (agro)pastoralist / herders / fishers',
            women_youth: 6,
            women_not_youth: 2,
            men_youth: 4,
            men_not_youth: 1,
            total: 13,
          },
          {
            actor_type_id: 5,
            actor_type_name: 'Community radio hosts',
            women_youth: 4,
            women_not_youth: 3,
            men_youth: 4,
            men_not_youth: 2,
            total: 13,
          },
        ],
        not_disaggregated_rows: 2,
      });
    });

    it('should return zeros, empty by_actor_type, and 0 not_disaggregated_rows when the contract has no actor rows', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            n: '0',
            women_youth: '0',
            women_not_youth: '0',
            men_youth: '0',
            men_not_youth: '0',
            not_disaggregated_rows: '0',
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await repository['getReachSection']('A511', 5);

      expect(result).toEqual({
        meta: { total_results: 5, n: 0 },
        overall: {
          women_youth: 0,
          women_not_youth: 0,
          men_youth: 0,
          men_not_youth: 0,
          total: 0,
        },
        by_actor_type: [],
        not_disaggregated_rows: 0,
      });
    });

    it('K-004: generated SQL keeps NULLs excluded via COALESCE(SUM(...), 0) — never SUM(COALESCE(...)) — regression pinned on the exact SQL text', async () => {
      // This spec pins the exact NULL-safe aggregate shape. If the
      // implementation regresses to wrapping COALESCE around the raw column
      // inside SUM (SUM(COALESCE(ra.women_youth, 0))) instead of bounding the
      // aggregate result (COALESCE(SUM(ra.women_youth), 0)), this assertion
      // reddens on the exact generated SQL text (KZ-001).
      // Observed RED verbatim when mutated (2026-08-24, reverted after capture):
      //   expect(received).toContain(expected)
      //   Expected substring: "COALESCE(SUM(ra.women_youth), 0) AS women_youth"
      //   Received string:    "...SUM(COALESCE(ra.women_youth, 0)) AS women_youth..."
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            n: '1',
            women_youth: '3',
            women_not_youth: null,
            men_youth: null,
            men_not_youth: '0',
            not_disaggregated_rows: '0',
          },
        ])
        .mockResolvedValueOnce([]);

      await repository['getReachSection']('A511', 1);

      const [overallSql] = (repository.query as jest.Mock).mock.calls[0];
      expect(overallSql).toContain(
        'COALESCE(SUM(ra.women_youth), 0) AS women_youth',
      );
      expect(overallSql).not.toContain('SUM(COALESCE(ra.women_youth, 0))');
    });
  });

  describe('getSdgCoverageSection (private, F4 insights)', () => {
    it('should query SDG coverage and return correctly populated DTO (asserts generated SQL + params + distinct counts + lookup join)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '3' }])
        .mockResolvedValueOnce([
          {
            sdg_id: 2,
            short_name: 'Zero Hunger',
            full_name: 'SDG 2 - Zero Hunger',
            count: '2',
          },
          {
            sdg_id: 13,
            short_name: 'Climate Action',
            full_name: 'SDG 13 - Climate Action',
            count: '1',
          },
        ]);

      const result = await repository['getSdgCoverageSection']('A511', 5);

      expect(repository.query).toHaveBeenCalledTimes(2);

      const [countSql, countParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [breakdownSql, breakdownParams] = (repository.query as jest.Mock)
        .mock.calls[1];

      // Count query assertions (KZ-001)
      expect(countSql).toContain('SELECT DISTINCT r.result_id');
      expect(countSql).toContain('INNER JOIN result_sdgs rs');
      expect(countSql).toContain('rs.result_id = cr.result_id');
      expect(countSql).toContain('rs.is_active = TRUE');
      expect(countSql).toContain('COUNT(DISTINCT rs.result_id) AS n');
      expect(countParams).toEqual(['A511']);

      // Breakdown query: distinct-result counting + lookup join to clarisa_sdgs
      expect(breakdownSql).toContain('COUNT(DISTINCT rs.result_id) AS count');
      expect(breakdownSql).toContain('INNER JOIN clarisa_sdgs cs');
      expect(breakdownSql).toContain('cs.id = rs.clarisa_sdg_id');
      expect(breakdownSql).toContain('cs.is_active = TRUE');
      expect(breakdownSql).toContain('cs.short_name AS short_name');
      expect(breakdownSql).toContain('cs.full_name AS full_name');
      expect(breakdownSql).toContain(
        'GROUP BY cs.id, cs.short_name, cs.full_name',
      );
      expect(breakdownSql).toContain('ORDER BY count DESC, cs.id ASC');
      expect(breakdownParams).toEqual(['A511']);

      expect(result).toEqual({
        meta: { total_results: 5, n: 3 },
        sdgs: [
          {
            sdg_id: 2,
            short_name: 'Zero Hunger',
            full_name: 'SDG 2 - Zero Hunger',
            count: 2,
          },
          {
            sdg_id: 13,
            short_name: 'Climate Action',
            full_name: 'SDG 13 - Climate Action',
            count: 1,
          },
        ],
      });
    });

    it('should return n = 0 and empty sdgs array when the contract reports no SDGs', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '0' }])
        .mockResolvedValueOnce([]);

      const result = await repository['getSdgCoverageSection']('A511', 5);

      expect(result).toEqual({
        meta: { total_results: 5, n: 0 },
        sdgs: [],
      });
    });
  });

  describe('getEvidenceSection (private, F4 insights)', () => {
    it('should query evidence completeness and return correctly populated DTO (asserts generated SQL + params + lookup join)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            n: '4',
            evidences_total: '7',
            private_count: '2',
            public_count: '5',
          },
        ])
        .mockResolvedValueOnce([
          { evidence_role_id: 1, name: 'Primary source', count: '4' },
          { evidence_role_id: 2, name: 'Supporting document', count: '3' },
        ]);

      const result = await repository['getEvidenceSection']('A511', 6);

      expect(repository.query).toHaveBeenCalledTimes(2);

      const [totalsSql, totalsParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [roleSql, roleParams] = (repository.query as jest.Mock).mock
        .calls[1];

      // Totals query assertions (KZ-001)
      expect(totalsSql).toContain('SELECT DISTINCT r.result_id');
      expect(totalsSql).toContain('INNER JOIN result_evidences re');
      expect(totalsSql).toContain('re.result_id = cr.result_id');
      expect(totalsSql).toContain('re.is_active = TRUE');
      expect(totalsSql).toContain('COUNT(DISTINCT re.result_id) AS n');
      expect(totalsSql).toContain(
        'COUNT(re.result_evidence_id) AS evidences_total',
      );
      expect(totalsSql).toContain(
        'SUM(CASE WHEN re.is_private = TRUE THEN 1 ELSE 0 END) AS private_count',
      );
      expect(totalsParams).toEqual(['A511']);

      // Role breakdown query: lookup join to evidence_roles
      expect(roleSql).toContain('INNER JOIN evidence_roles er');
      expect(roleSql).toContain('er.evidence_role_id = re.evidence_role_id');
      expect(roleSql).toContain('er.is_active = TRUE');
      expect(roleSql).toContain('er.name AS name');
      expect(roleSql).toContain('GROUP BY er.evidence_role_id, er.name');
      expect(roleSql).toContain('ORDER BY count DESC, er.name ASC');
      expect(roleParams).toEqual(['A511']);

      expect(result).toEqual({
        meta: { total_results: 6, n: 4 },
        results_with_evidence: 4,
        evidences_total: 7,
        public_count: 5,
        private_count: 2,
        by_role: [
          { evidence_role_id: 1, name: 'Primary source', count: 4 },
          { evidence_role_id: 2, name: 'Supporting document', count: 3 },
        ],
      });
    });

    it('should return zeros and empty by_role when no evidence exists', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([
          {
            n: '0',
            evidences_total: '0',
            private_count: '0',
            public_count: '0',
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await repository['getEvidenceSection']('A511', 6);

      expect(result).toEqual({
        meta: { total_results: 6, n: 0 },
        results_with_evidence: 0,
        evidences_total: 0,
        public_count: 0,
        private_count: 0,
        by_role: [],
      });
    });
  });

  describe('getContributingLeversSection (private, F4 insights)', () => {
    it('should query contributing (non-primary) levers and return correctly populated DTO (asserts generated SQL + params + is_primary = FALSE predicate + lookup join)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '2' }])
        .mockResolvedValueOnce([
          {
            lever_id: 10,
            short_name: 'Gender Equality',
            full_name: 'Gender Equality Lever',
            count: '2',
          },
          {
            lever_id: 11,
            short_name: 'Climate Adaptation',
            full_name: 'Climate Adaptation Lever',
            count: '1',
          },
        ]);

      const result = await repository['getContributingLeversSection'](
        'A511',
        5,
      );

      expect(repository.query).toHaveBeenCalledTimes(2);

      const [countSql, countParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [breakdownSql, breakdownParams] = (repository.query as jest.Mock)
        .mock.calls[1];

      // Count query assertions (KZ-001) — non-primary predicate
      expect(countSql).toContain('SELECT DISTINCT r.result_id');
      expect(countSql).toContain('INNER JOIN result_levers rl');
      expect(countSql).toContain('rl.result_id = cr.result_id');
      expect(countSql).toContain('rl.is_primary = FALSE');
      expect(countSql).toContain('rl.is_active = TRUE');
      expect(countSql).toContain('COUNT(DISTINCT rl.result_id) AS n');
      expect(countParams).toEqual(['A511']);

      // Breakdown query: same lever-join exemplar as getTopPrimaryLeversReport, flipped predicate
      expect(breakdownSql).toContain('FROM result_levers result_lever');
      expect(breakdownSql).toContain('INNER JOIN clarisa_levers clarisa_lever');
      expect(breakdownSql).toContain(
        'clarisa_lever.id = result_lever.lever_id',
      );
      expect(breakdownSql).toContain('WHERE result_lever.is_primary = FALSE');
      expect(breakdownSql).toContain('result_lever.is_active = TRUE');
      expect(breakdownSql).toContain(
        'COUNT(DISTINCT result_lever.result_id) AS count',
      );
      expect(breakdownSql).toContain('ORDER BY count DESC, clarisa_lever.id');
      expect(breakdownParams).toEqual(['A511']);

      expect(result).toEqual({
        meta: { total_results: 5, n: 2 },
        levers: [
          {
            lever_id: 10,
            short_name: 'Gender Equality',
            full_name: 'Gender Equality Lever',
            count: 2,
          },
          {
            lever_id: 11,
            short_name: 'Climate Adaptation',
            full_name: 'Climate Adaptation Lever',
            count: 1,
          },
        ],
      });
    });

    it('should return n = 0 and empty levers array when the contract has no non-primary levers', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '0' }])
        .mockResolvedValueOnce([]);

      const result = await repository['getContributingLeversSection'](
        'A511',
        5,
      );

      expect(result).toEqual({
        meta: { total_results: 5, n: 0 },
        levers: [],
      });
    });
  });

  describe('getKeywordsSection (private, F4 insights)', () => {
    it('should query normalized keyword frequency and return correctly populated DTO (asserts generated SQL + params + normalization expression + distinct result counting + cap/order)', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '3' }])
        .mockResolvedValueOnce([
          { keyword: 'soil health', count: '3' },
          { keyword: 'climate', count: '1' },
        ]);

      const result = await repository['getKeywordsSection']('A511', 5);

      expect(repository.query).toHaveBeenCalledTimes(2);

      const [countSql, countParams] = (repository.query as jest.Mock).mock
        .calls[0];
      const [keywordsSql, keywordsParams] = (repository.query as jest.Mock).mock
        .calls[1];

      // Count query assertions (KZ-001)
      expect(countSql).toContain('SELECT DISTINCT r.result_id');
      expect(countSql).toContain('INNER JOIN result_keywords rk');
      expect(countSql).toContain('rk.result_id = cr.result_id');
      expect(countSql).toContain('rk.is_active = TRUE');
      expect(countSql).toContain('COUNT(DISTINCT rk.result_id) AS n');
      expect(countParams).toEqual(['A511']);

      // Keyword breakdown: normalization expression (D-F4-5 — SQL, MySQL
      // 8.0.45-0ubuntu0.22.04.1 confirmed REGEXP_REPLACE support), distinct
      // result counting per keyword (never DOUBLE-counting a result that
      // repeats a keyword), cap 30, order count desc / keyword asc
      expect(keywordsSql).toContain(
        "LOWER(TRIM(REGEXP_REPLACE(rk.keyword, '[[:space:]]+', ' ')))",
      );
      expect(keywordsSql).toContain('COUNT(DISTINCT rk.result_id) AS count');
      expect(keywordsSql).toContain('GROUP BY');
      expect(keywordsSql).toContain('ORDER BY count DESC, keyword ASC');
      expect(keywordsSql).toContain('LIMIT 30');
      expect(keywordsParams).toEqual(['A511']);

      expect(result).toEqual({
        meta: { total_results: 5, n: 3 },
        keywords: [
          { keyword: 'soil health', count: 3 },
          { keyword: 'climate', count: 1 },
        ],
      });
    });

    it('should return n = 0 and empty keywords array when the contract has no keywords', async () => {
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '0' }])
        .mockResolvedValueOnce([]);

      const result = await repository['getKeywordsSection']('A511', 5);

      expect(result).toEqual({
        meta: { total_results: 5, n: 0 },
        keywords: [],
      });
    });

    it('caps at the top 30 keywords ordered by count desc then keyword asc (31-item fixture; the 31st candidate must not appear)', async () => {
      // Simulates what MySQL's GROUP BY + ORDER BY count DESC, keyword ASC +
      // LIMIT 30 would already have reduced 31 normalized candidates down to.
      // The repository must not re-sort or re-truncate — the cap/order
      // assertions above pin that the SQL itself does this; this fixture
      // pins that the DTO mapping passes the top-30 rows through unaltered.
      const candidates = Array.from({ length: 31 }, (_, i) => ({
        keyword: `keyword-${String(i).padStart(2, '0')}`,
        count: 31 - i, // strictly descending, unique counts
      }));
      const top30 = candidates.slice(0, 30);

      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '31' }])
        .mockResolvedValueOnce(
          top30.map((k) => ({ keyword: k.keyword, count: String(k.count) })),
        );

      const result = await repository['getKeywordsSection']('A511', 40);

      const [keywordsSql] = (repository.query as jest.Mock).mock.calls[1];
      expect(keywordsSql).toContain('LIMIT 30');
      expect(keywordsSql).toContain('ORDER BY count DESC, keyword ASC');

      expect(result.keywords).toHaveLength(30);
      expect(result.keywords[0]).toEqual({ keyword: 'keyword-00', count: 31 });
      expect(result.keywords[29]).toEqual({ keyword: 'keyword-29', count: 2 });
      expect(result.keywords.some((k) => k.keyword === 'keyword-30')).toBe(
        false,
      );
    });

    it('K-004: dropping DISTINCT from the keyword count would double-count a result repeating a keyword — regression pinned on the exact SQL text', async () => {
      // A result storing the same normalized keyword twice must count once
      // per the R-IN-002 keyword scenario ("must NOT count the same result
      // twice for a keyword it stores twice"). Since `query` is mocked at
      // the unit level (KZ-001: assert generated SQL, never the live DB),
      // this is pinned as a text assertion on COUNT(DISTINCT rk.result_id) —
      // dropping DISTINCT reddens this exact string.
      // Observed RED verbatim when mutated (2026-08-24, reverted after capture):
      //   expect(received).toContain(expected)
      //   Expected substring: "COUNT(DISTINCT rk.result_id) AS count"
      //   Received string:    "...COUNT(rk.result_id) AS count..."
      (repository.query as jest.Mock)
        .mockResolvedValueOnce([{ n: '1' }])
        .mockResolvedValueOnce([{ keyword: 'soil health', count: '1' }]);

      await repository['getKeywordsSection']('A511', 1);

      const [keywordsSql] = (repository.query as jest.Mock).mock.calls[1];
      expect(keywordsSql).toContain('COUNT(DISTINCT rk.result_id) AS count');
      expect(keywordsSql).not.toContain('COUNT(rk.result_id) AS count');
    });
  });

  describe('getIndicatorDetailsReport', () => {
    const mockCapacitySharing: any = {
      meta: { total_results: 4, n: 3 },
      total_trainees: 50,
      gender_split: [{ gender: 'female', count: 30 }],
      session_lengths: [{ id: 1, name: 'Short-term', count: 3 }],
      delivery_modalities: [{ id: 1, name: 'In person', count: 3 }],
      session_types: [{ id: 1, name: 'Group', count: 3 }],
    };

    const mockInnovationDev: any = {
      meta: { total_results: 2, n: 2 },
      readiness_levels: [{ id: 1, name: 'Level 1', level: 1, count: 2 }],
      innovation_types: [{ id: 1, name: 'Technological', count: 2 }],
      innovation_natures: [{ id: 1, name: 'Product', count: 2 }],
      anticipated_users: [{ id: 1, name: 'Farmers', count: 2 }],
      scalability_profile: [
        {
          key: 'is_cheaper_than_alternatives',
          name: 'Cheaper than alternatives',
          true_count: 2,
          answered_count: 2,
        },
      ],
    };

    const mockKnowledgeProduct: any = {
      meta: { total_results: 5, n: 4 },
      open_access_split: [{ name: 'Open Access', count: 3 }],
      access_status: [{ name: 'Published', count: 4 }],
      types: [{ id: 1, name: 'Journal Article', count: 4 }],
      publications_by_year: [{ year: 2025, count: 4 }],
    };

    const mockPolicyChange: any = {
      meta: { total_results: 3, n: 3 },
      stage_funnel: [{ id: 1, name: 'Stage 1', order: 1, count: 3 }],
      policy_types: [{ id: 1, name: 'Policy', count: 3 }],
      implicated_institutions_count: 2,
    };

    const mockOicr: any = {
      meta: { total_results: 1, n: 1 },
      maturity_levels: [{ id: 1, name: 'Mature', count: 1 }],
      external_use_split: [{ name: 'External use', count: 1 }],
    };

    const mockInnovationUse: any = {
      meta: { total_results: 6, n: 4 },
      gender_youth_reach: {
        overall: {
          women_youth: 10,
          women_not_youth: 20,
          men_youth: 15,
          men_not_youth: 25,
          total: 70,
        },
        by_actor_type: [],
      },
      organization_types: [{ id: 1, name: 'Government', count: 2 }],
      quantifications: [{ unit: 'Hectares', total: 100, count: 2 }],
    };

    const mockVelocity: any = [
      { month: '2025-01', count: 2 },
      { month: '2025-02', count: 3 },
    ];

    it('should throw BadRequestException if contractId is empty, null, or undefined', async () => {
      await expect(repository.getIndicatorDetailsReport('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        repository.getIndicatorDetailsReport(null as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.getIndicatorDetailsReport(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should compose report for mixed indicators contract (present returned, zero-result omitted)', async () => {
      jest.spyOn(repository, 'getIndicatorTotalResults').mockResolvedValue({
        1: 4,
        2: 2,
        3: 5,
        4: 3,
      });

      const getCapSharingSpy = jest
        .spyOn(repository, 'getCapacitySharingDetailsReport')
        .mockResolvedValue(mockCapacitySharing);
      const getInnovDevSpy = jest
        .spyOn(repository, 'getInnovationDevDetailsReport')
        .mockResolvedValue(mockInnovationDev);
      const getKpSpy = jest
        .spyOn(repository, 'getKnowledgeProductDetailsReport')
        .mockResolvedValue(mockKnowledgeProduct);
      const getPolicySpy = jest
        .spyOn(repository, 'getPolicyChangeDetailsReport')
        .mockResolvedValue(mockPolicyChange);
      const getOicrSpy = jest
        .spyOn(repository, 'getOicrDetailsReport')
        .mockResolvedValue(mockOicr);
      const getInnovUseSpy = jest
        .spyOn(repository, 'getInnovationUseDetailsReport')
        .mockResolvedValue(mockInnovationUse);
      const getVelocitySpy = jest
        .spyOn(repository, 'getReportingVelocityReport')
        .mockResolvedValue(mockVelocity);

      const result = await repository.getIndicatorDetailsReport('A511');

      // Present sections
      expect(result.data.capacity_sharing).toEqual(mockCapacitySharing);
      expect(result.data.innovation_dev).toEqual(mockInnovationDev);
      expect(result.data.knowledge_product).toEqual(mockKnowledgeProduct);
      expect(result.data.policy_change).toEqual(mockPolicyChange);
      expect(result.data.reporting_velocity).toEqual(mockVelocity);

      // Tri-state assertion: Zero-result indicators must be omitted (undefined), NOT null
      expect(result.data.oicr).toBeUndefined();
      expect('oicr' in result.data).toBe(false);
      expect(result.data.innovation_use).toBeUndefined();
      expect('innovation_use' in result.data).toBe(false);

      // No errors
      expect(result.errors).toEqual([]);

      // Spies called only for indicators with count > 0
      expect(getCapSharingSpy).toHaveBeenCalledWith('A511', 4);
      expect(getInnovDevSpy).toHaveBeenCalledWith('A511', 2);
      expect(getKpSpy).toHaveBeenCalledWith('A511', 5);
      expect(getPolicySpy).toHaveBeenCalledWith('A511', 3);
      expect(getOicrSpy).not.toHaveBeenCalled();
      expect(getInnovUseSpy).not.toHaveBeenCalled();
      expect(getVelocitySpy).toHaveBeenCalledWith('A511');
    });

    it('should handle partial failure by setting failed section to null, logging error, and returning errors array', async () => {
      const loggerSpy = jest
        .spyOn(repository['logger'], '_error')
        .mockImplementation();

      jest.spyOn(repository, 'getIndicatorTotalResults').mockResolvedValue({
        1: 3,
        2: 2,
      });

      jest
        .spyOn(repository, 'getCapacitySharingDetailsReport')
        .mockResolvedValue(mockCapacitySharing);
      jest
        .spyOn(repository, 'getInnovationDevDetailsReport')
        .mockRejectedValue(
          new Error('Connection timeout in innovation dev query'),
        );
      jest
        .spyOn(repository, 'getReportingVelocityReport')
        .mockResolvedValue(mockVelocity);

      const result = await repository.getIndicatorDetailsReport('A511');

      expect(result.data.capacity_sharing).toEqual(mockCapacitySharing);
      expect(result.data.innovation_dev).toBeNull();
      expect(result.data.reporting_velocity).toEqual(mockVelocity);
      expect(result.data.knowledge_product).toBeUndefined();
      expect(result.errors).toEqual([
        'innovation_dev: Connection timeout in innovation dev query',
      ]);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to get innovation dev details for contract A511',
        ),
      );
    });

    it('should handle partial failure when reporting velocity fails', async () => {
      const loggerSpy = jest
        .spyOn(repository['logger'], '_error')
        .mockImplementation();

      jest.spyOn(repository, 'getIndicatorTotalResults').mockResolvedValue({
        1: 3,
      });

      jest
        .spyOn(repository, 'getCapacitySharingDetailsReport')
        .mockResolvedValue(mockCapacitySharing);
      jest
        .spyOn(repository, 'getReportingVelocityReport')
        .mockRejectedValue(new Error('Velocity DB error'));

      const result = await repository.getIndicatorDetailsReport('A511');

      expect(result.data.capacity_sharing).toEqual(mockCapacitySharing);
      expect(result.data.reporting_velocity).toBeNull();
      expect(result.errors).toEqual(['reporting_velocity: Velocity DB error']);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to get reporting velocity for contract A511',
        ),
      );
    });

    it('should throw InternalServerErrorException when all attempted queries fail', async () => {
      jest.spyOn(repository['logger'], '_error').mockImplementation();

      jest.spyOn(repository, 'getIndicatorTotalResults').mockResolvedValue({
        1: 2,
        3: 4,
      });

      jest
        .spyOn(repository, 'getCapacitySharingDetailsReport')
        .mockRejectedValue(new Error('Capacity error'));
      jest
        .spyOn(repository, 'getKnowledgeProductDetailsReport')
        .mockRejectedValue(new Error('KP error'));
      jest
        .spyOn(repository, 'getReportingVelocityReport')
        .mockRejectedValue(new Error('Velocity error'));

      await expect(
        repository.getIndicatorDetailsReport('A511'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should return empty velocity and omit all sections for a contract with zero results across all indicators', async () => {
      jest.spyOn(repository, 'getIndicatorTotalResults').mockResolvedValue({});
      jest
        .spyOn(repository, 'getReportingVelocityReport')
        .mockResolvedValue([]);

      const result = await repository.getIndicatorDetailsReport('A511');

      expect(result.data.reporting_velocity).toEqual([]);
      expect(result.data.capacity_sharing).toBeUndefined();
      expect(result.data.innovation_dev).toBeUndefined();
      expect(result.data.knowledge_product).toBeUndefined();
      expect(result.data.policy_change).toBeUndefined();
      expect(result.data.oicr).toBeUndefined();
      expect(result.data.innovation_use).toBeUndefined();
      expect(result.errors).toEqual([]);
    });

    it('should populate all 6 sections when all indicators have results and succeed', async () => {
      jest.spyOn(repository, 'getIndicatorTotalResults').mockResolvedValue({
        1: 4,
        2: 2,
        3: 5,
        4: 3,
        5: 1,
        6: 6,
      });

      jest
        .spyOn(repository, 'getCapacitySharingDetailsReport')
        .mockResolvedValue(mockCapacitySharing);
      jest
        .spyOn(repository, 'getInnovationDevDetailsReport')
        .mockResolvedValue(mockInnovationDev);
      jest
        .spyOn(repository, 'getKnowledgeProductDetailsReport')
        .mockResolvedValue(mockKnowledgeProduct);
      jest
        .spyOn(repository, 'getPolicyChangeDetailsReport')
        .mockResolvedValue(mockPolicyChange);
      jest
        .spyOn(repository, 'getOicrDetailsReport')
        .mockResolvedValue(mockOicr);
      jest
        .spyOn(repository, 'getInnovationUseDetailsReport')
        .mockResolvedValue(mockInnovationUse);
      jest
        .spyOn(repository, 'getReportingVelocityReport')
        .mockResolvedValue(mockVelocity);

      const result = await repository.getIndicatorDetailsReport('A511');

      expect(result.data.capacity_sharing).toEqual(mockCapacitySharing);
      expect(result.data.innovation_dev).toEqual(mockInnovationDev);
      expect(result.data.knowledge_product).toEqual(mockKnowledgeProduct);
      expect(result.data.policy_change).toEqual(mockPolicyChange);
      expect(result.data.oicr).toEqual(mockOicr);
      expect(result.data.innovation_use).toEqual(mockInnovationUse);
      expect(result.data.reporting_velocity).toEqual(mockVelocity);
      expect(result.errors).toEqual([]);
    });
  });
});
