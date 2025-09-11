import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { ResultOicrRepository } from './result-oicr.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';

describe('ResultOicrRepository', () => {
  let repository: ResultOicrRepository;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockAppConfig: jest.Mocked<AppConfig>;

  beforeEach(async () => {
    // Create mocks
    mockEntityManager = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockAppConfig = {
      ARI_CLIENT_HOST: 'https://test-client.example.com',
      get: jest.fn(),
      SPRM_EMAIL_SAFE: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ResultOicrRepository,
          useFactory: () =>
            new ResultOicrRepository(mockEntityManager, mockAppConfig),
        },
        { provide: EntityManager, useValue: mockEntityManager },
        { provide: AppConfig, useValue: mockAppConfig },
      ],
    }).compile();

    repository = module.get<ResultOicrRepository>(ResultOicrRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDataToNewOicrMessage', () => {
    it('should return OICR message data with correct oicr_link', async () => {
      // Arrange
      const resultId = 123;
      const mockQueryResult = [
        {
          result_code: 'OICR-2024-001',
          result_title: 'Test OICR Result',
          contract_code: 'CONTRACT-001',
          contract_description: 'Test Contract Description',
          principal_investigator: 'Dr. John Doe',
          primary_lever: 'Climate Adaptation',
          main_contact_person: 'Jane, Smith',
          oicr_description: 'This is a test OICR description',
          oicr_link: '',
        },
      ];

      const expectedResult = {
        ...mockQueryResult[0],
        oicr_link:
          'https://test-client.example.com/result/OICR-2024-001/general-information',
      };

      // Mock the query method
      jest.spyOn(repository, 'query').mockResolvedValue(mockQueryResult);

      // Act
      const result = await repository.getDataToNewOicrMessage(resultId);

      // Assert
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [resultId],
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM results r'),
        [resultId],
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE r.is_active = TRUE'),
        [resultId],
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('AND r.result_id = ?'),
        [resultId],
      );
      expect(result).toEqual(expectedResult);
      expect(result.oicr_link).toBe(
        'https://test-client.example.com/result/OICR-2024-001/general-information',
      );
    });

    it('should handle query with no results', async () => {
      // Arrange
      const resultId = 999;
      const mockQueryResult = [];

      jest.spyOn(repository, 'query').mockResolvedValue(mockQueryResult);

      // Act & Assert
      await expect(
        repository.getDataToNewOicrMessage(resultId),
      ).rejects.toThrow();
    });

    it('should handle query with null result', async () => {
      // Arrange
      const resultId = 999;
      const mockQueryResult = [null];

      jest.spyOn(repository, 'query').mockResolvedValue(mockQueryResult);

      // Act & Assert
      await expect(
        repository.getDataToNewOicrMessage(resultId),
      ).rejects.toThrow();
    });

    it('should use correct SQL query structure', async () => {
      // Arrange
      const resultId = 123;
      const mockQueryResult = [
        {
          result_code: 'OICR-2024-001',
          result_title: 'Test OICR Result',
          contract_code: 'CONTRACT-001',
          contract_description: 'Test Contract Description',
          principal_investigator: 'Dr. John Doe',
          primary_lever: 'Climate Adaptation',
          main_contact_person: 'Jane, Smith',
          oicr_description: 'This is a test OICR description',
          oicr_link: '',
        },
      ];

      jest.spyOn(repository, 'query').mockResolvedValue(mockQueryResult);

      // Act
      await repository.getDataToNewOicrMessage(resultId);

      // Assert - Verify query structure
      const [actualQuery] = (repository.query as jest.Mock).mock.calls[0];

      // Check that the query includes all expected tables and joins
      expect(actualQuery).toContain('FROM results r');
      expect(actualQuery).toContain(
        'INNER JOIN result_oicrs ro ON ro.result_id = r.result_id',
      );
      expect(actualQuery).toContain(
        'INNER JOIN result_contracts rc ON rc.result_id = r.result_id',
      );
      expect(actualQuery).toContain(
        'INNER JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id',
      );
      expect(actualQuery).toContain(
        'LEFT JOIN result_levers rl ON rl.result_id = r.result_id',
      );
      expect(actualQuery).toContain(
        'LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id',
      );
      expect(actualQuery).toContain(
        'LEFT JOIN result_users ru ON ru.result_id = r.result_id',
      );
      expect(actualQuery).toContain(
        'LEFT JOIN alliance_user_staff aus ON aus.carnet = ru.user_id',
      );

      // Check WHERE conditions
      expect(actualQuery).toContain('WHERE r.is_active = TRUE');
      expect(actualQuery).toContain('AND r.result_id = ?');
      expect(actualQuery).toContain('LIMIT 1');

      // Check selected fields
      expect(actualQuery).toContain('r.result_official_code as result_code');
      expect(actualQuery).toContain('r.title as result_title');
      expect(actualQuery).toContain('rc.contract_id as contract_code');
      expect(actualQuery).toContain('ac.description as contract_description');
      expect(actualQuery).toContain(
        'ac.project_lead_description as principal_investigator',
      );
      expect(actualQuery).toContain(
        "IFNULL(cl.full_name, 'No lever associated') as primary_lever",
      );
      expect(actualQuery).toContain(
        "IF(aus.carnet IS NOT NULL, CONCAT(aus.first_name, ', ',aus.last_name), 'Not Provided') as main_contact_person",
      );
      expect(actualQuery).toContain('r.description as oicr_description');
    });

    it('should handle different ARI_CLIENT_HOST configurations', async () => {
      // Arrange
      const resultId = 123;
      const mockQueryResult = [
        {
          result_code: 'OICR-2024-002',
          result_title: 'Another Test OICR',
          contract_code: 'CONTRACT-002',
          contract_description: 'Another Test Contract',
          principal_investigator: 'Dr. Jane Doe',
          primary_lever: 'Climate Mitigation',
          main_contact_person: 'John, Smith',
          oicr_description: 'Another test OICR description',
          oicr_link: '',
        },
      ];

      // Create a new mock AppConfig with different host
      const differentMockAppConfig = {
        ARI_CLIENT_HOST: 'http://localhost:3000',
        get: jest.fn(),
        SPRM_EMAIL_SAFE: jest.fn(),
      } as any;

      // Create a new repository instance with different config
      const differentRepository = new ResultOicrRepository(
        mockEntityManager,
        differentMockAppConfig,
      );

      jest
        .spyOn(differentRepository, 'query')
        .mockResolvedValue(mockQueryResult);

      // Act
      const result =
        await differentRepository.getDataToNewOicrMessage(resultId);

      // Assert
      expect(result.oicr_link).toBe(
        'http://localhost:3000/result/OICR-2024-002/general-information',
      );
    });

    it('should handle special characters in result_code', async () => {
      // Arrange
      const resultId = 123;
      const mockQueryResult = [
        {
          result_code: 'OICR-2024-001_special-chars',
          result_title: 'Test OICR with Special Characters',
          contract_code: 'CONTRACT-001',
          contract_description: 'Test Contract Description',
          principal_investigator: 'Dr. John Doe',
          primary_lever: 'Climate Adaptation',
          main_contact_person: 'Jane, Smith',
          oicr_description: 'This is a test OICR description',
          oicr_link: '',
        },
      ];

      jest.spyOn(repository, 'query').mockResolvedValue(mockQueryResult);

      // Act
      const result = await repository.getDataToNewOicrMessage(resultId);

      // Assert
      expect(result.oicr_link).toBe(
        'https://test-client.example.com/result/OICR-2024-001_special-chars/general-information',
      );
    });
  });
});
