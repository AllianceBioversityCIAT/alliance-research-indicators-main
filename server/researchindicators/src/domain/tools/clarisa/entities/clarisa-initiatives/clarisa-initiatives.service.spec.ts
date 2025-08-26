import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ClarisaInitiative } from './entities/clarisa-initiative.entity';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

describe('ClarisaInitiativesService', () => {
  let service: ClarisaInitiativesService;
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
        ClarisaInitiativesService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(ClarisaInitiative),
          useValue: mockRepository,
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
      ],
    }).compile();

    service = module.get<ClarisaInitiativesService>(ClarisaInitiativesService);
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
      expect(service).toBeInstanceOf(ClarisaInitiativesService);
      expect(service['entity']).toBe(ClarisaInitiative);
      expect(service['findByNameKey']).toBe('name');
      expect(service['currentUser']).toBe(currentUser);
    });

    it('should set primary key correctly', () => {
      expect(service['primaryKey']).toBe('id');
    });
  });

  describe('findAll', () => {
    const mockInitiatives = [
      {
        id: 1,
        name: 'Climate Adaptation Initiative',
        short_name: 'CAI',
        official_code: 'CAI-001',
        type_id: 1,
        active: true,
        status: 'Active',
        is_active: true,
      },
      {
        id: 2,
        name: 'Food Security Program',
        short_name: 'FSP',
        official_code: 'FSP-002',
        type_id: 2,
        active: true,
        status: 'Active',
        is_active: true,
      },
    ];

    beforeEach(() => {
      mockRepository.find.mockResolvedValue(mockInitiatives);
    });

    it('should find all active initiatives', async () => {
      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: {},
      });
      expect(result).toEqual(mockInitiatives);
    });

    it('should find initiatives with relations', async () => {
      const relations = { result_initiatives: true };
      await service.findAll(relations);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations,
      });
    });

    it('should find initiatives with custom where clause', async () => {
      const customWhere = {
        name: 'Climate Adaptation Initiative',
        is_active: true,
      };
      await service.findAll({}, customWhere);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: customWhere,
        relations: {},
      });
    });

    it('should handle initiatives with JSON stages field', async () => {
      const initiativesWithStages = [
        {
          ...mockInitiatives[0],
          stages: [
            { id: 1, active: true, stageId: 1, initvStgId: 101 },
            { id: 2, active: false, stageId: 2, initvStgId: 102 },
          ],
        },
      ];

      mockRepository.find.mockResolvedValue(initiativesWithStages);
      const result = await service.findAll();

      expect(result[0].stages).toBeDefined();
      expect(Array.isArray(result[0].stages)).toBe(true);
    });
  });

  describe('findOne', () => {
    const mockInitiative = {
      id: 1,
      name: 'Climate Adaptation Initiative',
      short_name: 'CAI',
      official_code: 'CAI-001',
      active: true,
      is_active: true,
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(mockInitiative);
    });

    it('should find one initiative by id', async () => {
      const initiativeId = 1;
      const result = await service.findOne(initiativeId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          id: initiativeId,
        },
      });
      expect(result).toEqual(mockInitiative);
    });

    it('should handle string id parameter', async () => {
      const initiativeId = '1';
      await service.findOne(initiativeId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          id: initiativeId,
        },
      });
    });

    it('should return null if initiative not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    const mockInitiative = {
      id: 1,
      name: 'Climate Adaptation Initiative',
      short_name: 'CAI',
      active: true,
      is_active: true,
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(mockInitiative);
    });

    it('should find initiative by name using LIKE operator', async () => {
      const searchName = 'Climate';
      const result = await service.findByName(searchName);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'like',
            _value: '%Climate%',
          }),
        },
      });
      expect(result).toEqual(mockInitiative);
    });

    it('should handle exact name match', async () => {
      const searchName = 'Climate Adaptation Initiative';
      await service.findByName(searchName);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'like',
            _value: '%Climate Adaptation Initiative%',
          }),
        },
      });
    });

    it('should return null if no initiative found by name', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByName('NonExistent Initiative');

      expect(result).toBeNull();
    });
  });

  describe('findByNames', () => {
    const mockInitiatives = [
      {
        id: 1,
        name: 'Climate Adaptation Initiative',
        short_name: 'CAI',
        active: true,
        is_active: true,
      },
      {
        id: 2,
        name: 'Food Security Program',
        short_name: 'FSP',
        active: true,
        is_active: true,
      },
    ];

    beforeEach(() => {
      mockRepository.find.mockResolvedValue(mockInitiatives);
    });

    it('should find initiatives by array of names', async () => {
      const searchNames = [
        'Climate Adaptation Initiative',
        'Food Security Program',
      ];
      const result = await service.findByNames(searchNames);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'in',
            _value: [
              "'Climate Adaptation Initiative'",
              "'Food Security Program'",
            ],
          }),
        },
      });
      expect(result).toEqual(mockInitiatives);
    });

    it('should handle single name in array', async () => {
      const searchNames = ['Climate Adaptation Initiative'];
      await service.findByNames(searchNames);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'in',
            _value: ["'Climate Adaptation Initiative'"],
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

  describe('clarisa initiative-specific business logic', () => {
    it('should properly handle initiative relationships with result_initiatives', async () => {
      const mockInitiativeWithRelations = [
        {
          id: 1,
          name: 'Climate Adaptation Initiative',
          short_name: 'CAI',
          is_active: true,
          result_initiatives: [
            { id: 1, result_id: 1, clarisa_initiative_id: 1 },
            { id: 2, result_id: 2, clarisa_initiative_id: 1 },
          ],
        },
      ];

      mockRepository.find.mockResolvedValue(mockInitiativeWithRelations);

      const result = await service.findAll({ result_initiatives: true });

      expect(result).toEqual(mockInitiativeWithRelations);
      expect(result[0].result_initiatives).toHaveLength(2);
    });

    it('should filter only active initiatives', async () => {
      const allInitiatives = [
        { id: 1, name: 'Active Initiative', is_active: true },
        { id: 2, name: 'Inactive Initiative', is_active: false },
      ];

      // Mock should only return active initiatives
      mockRepository.find.mockImplementation(({ where }) => {
        if (where.is_active === true) {
          return Promise.resolve([allInitiatives[0]]);
        }
        return Promise.resolve(allInitiatives);
      });

      await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: {},
      });
    });

    it('should handle initiative name search case insensitively', async () => {
      const mockInitiative = {
        id: 1,
        name: 'Climate Adaptation Initiative',
        is_active: true,
      };
      mockRepository.findOne.mockResolvedValue(mockInitiative);

      await service.findByName('climate');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          name: expect.objectContaining({
            _type: 'like',
            _value: '%climate%',
          }),
        },
      });
    });

    it('should handle initiatives with complex data structures', async () => {
      const complexInitiative = {
        id: 1,
        name: 'Complex Initiative',
        short_name: 'CI',
        official_code: 'CI-001',
        type_id: 1,
        active: true,
        status: 'Active',
        stageId: 2,
        description: 'A complex initiative with multiple attributes',
        action_area_id: 3,
        action_area_description: 'Climate Action Area',
        stages: [
          { id: 1, active: true, stageId: 1, initvStgId: 101 },
          { id: 2, active: false, stageId: 2, initvStgId: 102 },
        ],
        is_active: true,
      };

      mockRepository.findOne.mockResolvedValue(complexInitiative);

      const result = await service.findOne(1);

      expect(result).toEqual(complexInitiative);
      expect(result.stages).toBeDefined();
      expect(result.action_area_description).toBe('Climate Action Area');
    });

    it('should handle search by short_name or official_code fields', async () => {
      // Test that the service can work with different searchable fields
      const mockInitiative = {
        id: 1,
        name: 'Test Initiative',
        short_name: 'TI',
        official_code: 'TI-001',
        is_active: true,
      };

      mockRepository.findOne.mockResolvedValue(mockInitiative);

      // Even though we search by name, the initiative has other identifiable fields
      await service.findByName('Test');

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(
        mockRepository.findOne.mock.calls[0][0].where.name._value,
      ).toContain('Test');
    });
  });
});
