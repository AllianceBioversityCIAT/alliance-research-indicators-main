import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TagsService } from './tags.service';
import { Tag } from './entities/tag.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('TagsService', () => {
  let service: TagsService;
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
        TagsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: mockRepository,
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
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
      expect(service).toBeInstanceOf(TagsService);
      expect(service['entity']).toBe(Tag);
      expect(service['findByNameKey']).toBe('name');
      expect(service['currentUser']).toBe(currentUser);
    });

    it('should set primary key correctly', () => {
      expect(service['primaryKey']).toBe('id');
    });
  });

  describe('findAll', () => {
    const mockTags = [
      { id: 1, name: 'Technology', is_active: true },
      { id: 2, name: 'Innovation', is_active: true },
    ];

    beforeEach(() => {
      mockRepository.find.mockResolvedValue(mockTags);
    });

    it('should find all active tags', async () => {
      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: {},
      });
      expect(result).toEqual(mockTags);
    });

    it('should find tags with relations', async () => {
      const relations = { result_tags: true };
      await service.findAll(relations);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations,
      });
    });

    it('should find tags with custom where clause', async () => {
      const customWhere = { name: 'Technology', is_active: true };
      await service.findAll({}, customWhere);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: customWhere,
        relations: {},
      });
    });
  });

  describe('findOne', () => {
    const mockTag = { id: 1, name: 'Technology', is_active: true };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(mockTag);
    });

    it('should find one tag by id', async () => {
      const tagId = 1;
      const result = await service.findOne(tagId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          id: tagId,
        },
      });
      expect(result).toEqual(mockTag);
    });

    it('should handle string id parameter', async () => {
      const tagId = '1';
      await service.findOne(tagId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          id: tagId,
        },
      });
    });

    it('should return null if tag not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    const mockTag = { id: 1, name: 'Technology', is_active: true };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(mockTag);
    });

    it('should find tag by name using LIKE operator', async () => {
      const searchName = 'Tech';
      const result = await service.findByName(searchName);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'like',
            _value: '%Tech%',
          }),
        },
      });
      expect(result).toEqual(mockTag);
    });

    it('should handle exact name match', async () => {
      const searchName = 'Technology';
      await service.findByName(searchName);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'like',
            _value: '%Technology%',
          }),
        },
      });
    });

    it('should return null if no tag found by name', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByName('NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('findByNames', () => {
    const mockTags = [
      { id: 1, name: 'Technology', is_active: true },
      { id: 2, name: 'Innovation', is_active: true },
    ];

    beforeEach(() => {
      mockRepository.find.mockResolvedValue(mockTags);
    });

    it('should find tags by array of names', async () => {
      const searchNames = ['Technology', 'Innovation'];
      const result = await service.findByNames(searchNames);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'in',
            _value: ['Technology', 'Innovation'],
          }),
        },
      });
      expect(result).toEqual(mockTags);
    });

    it('should handle single name in array', async () => {
      const searchNames = ['Technology'];
      await service.findByNames(searchNames);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'in',
            _value: ['Technology'],
          }),
        },
      });
    });

    it('should handle empty array', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByNames([]);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'in',
            _value: [],
          }),
        },
      });
      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors in findAll', async () => {
      const error = new Error('Database error');
      mockRepository.find.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('Database error');
    });

    it('should handle repository errors in findOne', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findOne(1)).rejects.toThrow('Database error');
    });

    it('should handle repository errors in findByName', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findByName('test')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle repository errors in findByNames', async () => {
      const error = new Error('Database error');
      mockRepository.find.mockRejectedValue(error);

      await expect(service.findByNames(['test'])).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('inheritance from ControlListBaseService', () => {
    it('should have access to inherited methods', () => {
      expect(typeof service.findAll).toBe('function');
      expect(typeof service.findOne).toBe('function');
      expect(typeof service.findByName).toBe('function');
      expect(typeof service.findByNames).toBe('function');
    });

    it('should have correct primary key', () => {
      expect(service['primaryKey']).toBe('id');
    });

    it('should have correct findByNameKey', () => {
      expect(service['findByNameKey']).toBe('name');
    });

    it('should not have resultKey or roleKey since they are not used in ControlListBaseService', () => {
      expect(service['resultKey']).toBeNull();
      expect(service['roleKey']).toBeNull();
    });
  });

  describe('tag-specific business logic', () => {
    it('should properly handle tag relationships with result_tags', async () => {
      const mockTagsWithRelations = [
        {
          id: 1,
          name: 'Technology',
          is_active: true,
          result_tags: [
            { id: 1, result_id: 1, tag_id: 1 },
            { id: 2, result_id: 2, tag_id: 1 },
          ],
        },
      ];

      mockRepository.find.mockResolvedValue(mockTagsWithRelations);

      const result = await service.findAll({ result_tags: true });

      expect(result).toEqual(mockTagsWithRelations);
      expect(result[0].result_tags).toHaveLength(2);
    });

    it('should filter only active tags', async () => {
      const allTags = [
        { id: 1, name: 'Active Tag', is_active: true },
        { id: 2, name: 'Inactive Tag', is_active: false },
      ];

      // Mock should only return active tags
      mockRepository.find.mockImplementation(({ where }) => {
        if (where.is_active === true) {
          return Promise.resolve([allTags[0]]);
        }
        return Promise.resolve(allTags);
      });

      await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: {},
      });
    });

    it('should handle tag name search case insensitively', async () => {
      const mockTag = { id: 1, name: 'Technology', is_active: true };
      mockRepository.findOne.mockResolvedValue(mockTag);

      await service.findByName('tech');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'like',
            _value: '%tech%',
          }),
        },
      });
    });
  });
});
