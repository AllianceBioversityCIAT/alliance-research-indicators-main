import { BadRequestException, NotFoundException } from '@nestjs/common';
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
