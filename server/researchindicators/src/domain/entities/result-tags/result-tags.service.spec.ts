import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResultTagsService } from './result-tags.service';
import { ResultTag } from './entities/result-tag.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultTagsService', () => {
  let service: ResultTagsService;
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
        ResultTagsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(ResultTag),
          useValue: mockRepository,
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
      ],
    }).compile();

    service = module.get<ResultTagsService>(ResultTagsService);
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
      expect(service).toBeInstanceOf(ResultTagsService);
      expect(service['entity']).toBe(ResultTag);
      expect(service['resultKey']).toBe('result_id');
      expect(service['currentUser']).toBe(currentUser);
    });
  });

  describe('create', () => {
    const resultId = 1;
    const mockTagData = [{ tag_id: 1 }, { tag_id: 2 }];

    beforeEach(() => {
      mockRepository.find.mockResolvedValue([]);
      mockRepository.save.mockResolvedValue([
        { id: 1, result_id: resultId, tag_id: 1, is_active: true },
        { id: 2, result_id: resultId, tag_id: 2, is_active: true },
      ]);
    });

    it('should create new result tags successfully', async () => {
      const result = await service.create(resultId, mockTagData, 'tag_id');

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

      const result = await service.create(resultId, [], 'tag_id');

      expect(mockRepository.save).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it('should filter out empty tag_id values', async () => {
      const invalidData = [
        { tag_id: 1 },
        { tag_id: null },
        { tag_id: undefined },
        { tag_id: 2 },
      ];

      await service.create(resultId, invalidData, 'tag_id');

      // Should only process items with valid tag_id
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tag_id: expect.any(Object), // In([1, 2])
        }),
      });
    });
  });

  describe('find', () => {
    const resultId = 1;
    const mockResultTags = [
      { id: 1, result_id: resultId, tag_id: 1, is_active: true },
      { id: 2, result_id: resultId, tag_id: 2, is_active: true },
    ];

    beforeEach(() => {
      mockRepository.find.mockResolvedValue(mockResultTags);
    });

    it('should find result tags by result_id', async () => {
      const result = await service.find(resultId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          result_id: resultId,
          is_active: true,
        },
        relations: undefined,
      });
      expect(result).toEqual(mockResultTags);
    });

    it('should find result tags with relations', async () => {
      const relations = { tag: true };
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
      const tagIds = [1, 2, 3];
      const result = service.transformArrayToSaveObject(tagIds);

      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should transform array with default data', () => {
      const tagIds = [1, 2];
      const defaultData = { result_id: 100 } as any;
      const result = service.transformArrayToSaveObject(tagIds, defaultData);

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
        service.create(1, [{ tag_id: 1 }], 'tag_id'),
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
  });
});
