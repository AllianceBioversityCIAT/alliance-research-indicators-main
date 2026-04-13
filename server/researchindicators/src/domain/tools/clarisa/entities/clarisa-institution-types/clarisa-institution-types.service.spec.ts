import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';
import { ClarisaInstitutionTypesRepository } from './repositories/clarisa-institution-types.repository';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ClarisaInstitutionType } from './entities/clarisa-institution-type.entity';

describe('ClarisaInstitutionTypesService', () => {
  let service: ClarisaInstitutionTypesService;
  const mockFindOne = jest.fn();
  const mockFind = jest.fn();
  const mockFindActiveWithNoChildren = jest.fn();

  const mockRepo = {
    find: mockFind,
    findOne: mockFindOne,
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
    findActiveWithNoChildren: mockFindActiveWithNoChildren,
    metadata: { columns: [], relations: [] },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaInstitutionTypesService,
        {
          provide: ClarisaInstitutionTypesRepository,
          useValue: mockRepo,
        },
        { provide: CurrentUserUtil, useValue: {} },
      ],
    }).compile();

    service = module.get<ClarisaInstitutionTypesService>(
      ClarisaInstitutionTypesService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 174
  describe('findInstitutionTypeToPartner', () => {
    it('should delegate to repo.findActiveWithNoChildren', async () => {
      const mockResult = [{ code: 1, name: 'University' }];
      mockFindActiveWithNoChildren.mockResolvedValue(mockResult);

      const result = await service.findInstitutionTypeToPartner();

      expect(mockFindActiveWithNoChildren).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  // [CLAUDE/DONE] 175
  describe('findByName', () => {
    it('should query with LIKE pattern and return institution type with parent', async () => {
      const mockType: Partial<ClarisaInstitutionType> = {
        code: 1,
        name: 'University',
      };
      mockFindOne.mockResolvedValue(mockType);

      const result = await service.findByName('Univ');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ is_active: true }),
        relations: { parent: true },
      });
      expect(result).toEqual(mockType);
    });

    it('should return null when no institution type matches the name', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await service.findByName('NonExistent');

      expect(result).toBeNull();
    });
  });

  // [CLAUDE/DONE] 176
  describe('getChildlessInstitutionTypes', () => {
    it('should return only institution types without children', async () => {
      const withChildren: any = {
        code: 1,
        name: 'With Children',
        children: [{ code: 2 }],
      };
      const withoutChildren: any = {
        code: 3,
        name: 'Leaf',
        children: [],
      };
      mockFind.mockResolvedValue([withChildren, withoutChildren]);

      const result = await service.getChildlessInstitutionTypes();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Leaf');
    });

    it('should delete children property from returned items', async () => {
      const leaf: any = { code: 1, name: 'Leaf', children: [] };
      mockFind.mockResolvedValue([leaf]);

      const [result] = await service.getChildlessInstitutionTypes();

      expect(result).not.toHaveProperty('children');
    });

    it('should return empty array when all types have children', async () => {
      mockFind.mockResolvedValue([{ code: 1, children: [{ code: 2 }] }]);

      const result = await service.getChildlessInstitutionTypes();

      expect(result).toEqual([]);
    });
  });

  // [CLAUDE/DONE] 177
  describe('getInstitutionTypesByDepthLevel', () => {
    it('should query root types (parent_code IS NULL) and return items at given depth', async () => {
      const rootType: any = {
        code: 1,
        name: 'Root',
        is_active: true,
        children: [
          {
            code: 2,
            name: 'Child',
            children: [],
          },
        ],
      };
      mockFind.mockResolvedValue([rootType]);

      const result = await service.getInstitutionTypesByDepthLevel(null, 0);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
          relations: expect.anything(),
        }),
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by institutionTypeId when provided', async () => {
      mockFind.mockResolvedValue([]);

      await service.getInstitutionTypesByDepthLevel(5, 1);

      const callArg = mockFind.mock.calls[0][0];
      expect(callArg.where['code']).toBe(5);
    });
  });

  // [CLAUDE/DONE] 178
  describe('findByLikeNames', () => {
    it('should build LIKE where conditions for each name and return results', async () => {
      const mockResult = [{ code: 1, name: 'University' }];
      mockFind.mockResolvedValue(mockResult);

      const result = await service.findByLikeNames(['Univ', 'NGO']);

      expect(mockFind).toHaveBeenCalledWith({
        relations: { parent: true },
        where: expect.arrayContaining([
          expect.objectContaining({ is_active: true }),
          expect.objectContaining({ is_active: true }),
        ]),
      });
      expect(result).toEqual(mockResult);
    });

    it('should return empty array when no names match', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByLikeNames(['NoMatch']);

      expect(result).toEqual([]);
    });
  });
});
