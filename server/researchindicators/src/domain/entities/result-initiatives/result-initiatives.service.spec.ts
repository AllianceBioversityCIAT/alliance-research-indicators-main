import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResultInitiativesService } from './result-initiatives.service';
import { ResultInitiative } from './entities/result-initiative.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultInitiativesService', () => {
  let service: ResultInitiativesService;
  let currentUser: CurrentUserUtil;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    metadata: {
      primaryColumns: [
        {
          propertyName: 'id',
        },
      ],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
    createQueryBuilder: jest.fn(),
    transaction: jest.fn(),
  };

  const mockCurrentUser = {
    user: {
      id: 1,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
    },
    audit: jest.fn().mockReturnValue({
      created_date: new Date(),
      last_updated_date: new Date(),
      created_by: 1,
      last_updated_by: 1,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultInitiativesService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(ResultInitiative),
          useValue: mockRepository,
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
      ],
    }).compile();

    service = module.get<ResultInitiativesService>(ResultInitiativesService);
    currentUser = module.get<CurrentUserUtil>(CurrentUserUtil);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(service).toBeInstanceOf(ResultInitiativesService);
      expect(service['entity']).toBe(ResultInitiative);
      expect(service['resultKey']).toBe('result_id');
      expect(service['currentUser']).toBe(currentUser);
    });
  });

  describe('create', () => {
    const resultId = 1;
    const mockInitiativeData = [
      { clarisa_initiative_id: 1 },
      { clarisa_initiative_id: 2 },
    ];

    beforeEach(() => {
      mockRepository.find.mockResolvedValue([]);
      mockRepository.save.mockResolvedValue([
        {
          id: 1,
          result_id: resultId,
          clarisa_initiative_id: 1,
          is_active: true,
        },
        {
          id: 2,
          result_id: resultId,
          clarisa_initiative_id: 2,
          is_active: true,
        },
      ]);
    });

    it('should create new result initiatives successfully', async () => {
      const result = await service.create(
        resultId,
        mockInitiativeData,
        'clarisa_initiative_id',
      );

      expect(mockRepository.find).toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].result_id).toBe(resultId);
      expect(result[1].result_id).toBe(resultId);
    });

    it('should handle empty data array', async () => {
      // Reset the mock to return empty array for this specific test
      mockRepository.save.mockResolvedValueOnce([]);

      const result = await service.create(
        resultId,
        [],
        'clarisa_initiative_id',
      );

      expect(mockRepository.save).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it('should filter out empty clarisa_initiative_id values', async () => {
      const invalidData = [
        { clarisa_initiative_id: 1 },
        { clarisa_initiative_id: null },
        { clarisa_initiative_id: undefined },
        { clarisa_initiative_id: 2 },
      ];

      await service.create(resultId, invalidData, 'clarisa_initiative_id');

      // Should only process items with valid clarisa_initiative_id
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clarisa_initiative_id: expect.any(Object), // In([1, 2])
        }),
      });
    });
  });

  describe('find', () => {
    const resultId = 1;
    const mockResultInitiatives = [
      { id: 1, result_id: resultId, clarisa_initiative_id: 1, is_active: true },
      { id: 2, result_id: resultId, clarisa_initiative_id: 2, is_active: true },
    ];

    beforeEach(() => {
      mockRepository.find.mockResolvedValue(mockResultInitiatives);
    });

    it('should find result initiatives by result_id', async () => {
      const result = await service.find(resultId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          result_id: resultId,
          is_active: true,
        },
        relations: undefined,
      });
      expect(result).toEqual(mockResultInitiatives);
    });

    it('should find result initiatives with relations', async () => {
      const relations = {} as any; // Since ResultInitiative doesn't have defined relations in the entity
      await service.find(resultId, undefined, relations);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          result_id: resultId,
          is_active: true,
        },
        relations,
      });
    });

    it('should handle array of result_ids', async () => {
      const resultIds = [1, 2, 3];
      await service.find(resultIds);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          result_id: expect.any(Object), // In([1, 2, 3])
          is_active: true,
        },
        relations: undefined,
      });
    });
  });

  describe('transformArrayToSaveObject', () => {
    it('should transform array of numbers to save objects', () => {
      const initiativeIds = [1, 2, 3];
      const result = service.transformArrayToSaveObject(initiativeIds);

      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should transform array with default data', () => {
      const initiativeIds = [1, 2];
      const defaultData = { result_id: 100 } as any;
      const result = service.transformArrayToSaveObject(
        initiativeIds,
        defaultData,
      );

      expect(result).toEqual([
        { id: 1, result_id: 100 },
        { id: 2, result_id: 100 },
      ]);
    });

    it('should handle empty array', () => {
      const result = service.transformArrayToSaveObject([]);
      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors in create method', async () => {
      const error = new Error('Database error');
      mockRepository.find.mockRejectedValue(error);

      await expect(
        service.create(
          1,
          [{ clarisa_initiative_id: 1 }],
          'clarisa_initiative_id',
        ),
      ).rejects.toThrow('Database error');
    });

    it('should handle repository errors in find method', async () => {
      const error = new Error('Database error');
      mockRepository.find.mockRejectedValue(error);

      await expect(service.find(1)).rejects.toThrow('Database error');
    });
  });

  describe('inheritance from BaseServiceSimple', () => {
    it('should have access to inherited methods', () => {
      expect(typeof service.create).toBe('function');
      expect(typeof service.find).toBe('function');
      expect(typeof service.transformArrayToSaveObject).toBe('function');
    });

    it('should have correct primary key', () => {
      expect(service['primaryKey']).toBe('id');
    });

    it('should have correct result key', () => {
      expect(service['resultKey']).toBe('result_id');
    });

    it('should not have role key since it was not provided', () => {
      expect(service['roleKey']).toBeNull();
    });
  });

  describe('business logic specific to initiatives', () => {
    it('should properly handle initiative relationships', async () => {
      const resultId = 1;
      const initiativeData = [
        { clarisa_initiative_id: 101 },
        { clarisa_initiative_id: 102 },
      ];

      // Mock existing data
      mockRepository.find.mockResolvedValue([
        {
          id: 1,
          result_id: resultId,
          clarisa_initiative_id: 101,
          is_active: false,
        },
      ]);

      mockRepository.save.mockResolvedValue([
        {
          id: 1,
          result_id: resultId,
          clarisa_initiative_id: 101,
          is_active: true,
        },
        {
          id: 2,
          result_id: resultId,
          clarisa_initiative_id: 102,
          is_active: true,
        },
      ]);

      const result = await service.create(
        resultId,
        initiativeData,
        'clarisa_initiative_id',
      );

      expect(result).toHaveLength(2);
      expect(result.every((item) => item.is_active)).toBe(true);
      expect(result.map((item) => item.clarisa_initiative_id)).toEqual([
        101, 102,
      ]);
    });

    it('should validate clarisa_initiative_id is required', async () => {
      const resultId = 1;
      const invalidData = [
        { clarisa_initiative_id: null },
        { clarisa_initiative_id: undefined },
        {},
      ];

      await service.create(resultId, invalidData, 'clarisa_initiative_id');

      // Should call find with empty array since no valid items
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clarisa_initiative_id: expect.objectContaining({
            _type: 'in',
            _value: [],
          }),
        }),
      });
    });
  });
});
