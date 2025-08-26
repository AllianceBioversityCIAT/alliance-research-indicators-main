import { Test, TestingModule } from '@nestjs/testing';
import { GroupsItemsService } from './groups_items.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';
import { DataSource, Repository } from 'typeorm';

describe('GroupsItemsService', () => {
  let service: GroupsItemsService;
  let repo: Repository<GroupItem>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const repoMock = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    const dataSourceMock = {
      transaction: jest.fn(),
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([
          { name: 'Level1', level: 1 },
          { name: 'Level2', level: 2 },
        ]),
        createQueryBuilder: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findOne: jest.fn(),
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsItemsService,
        { provide: getRepositoryToken(GroupItem), useValue: repoMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<GroupsItemsService>(GroupsItemsService);
    repo = module.get<Repository<GroupItem>>(getRepositoryToken(GroupItem));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return structured groups', async () => {
      const mockGroups = [
        {
          id: 1,
          name: 'Parent',
          code: 'P1',
          parent_id: null,
          group_name: 'Level1',
          indicatorPerItem: [
            {
              projectIndicator: {
                id: 10,
                name: 'Ind1',
                description: 'desc',
                number_type: 'int',
                number_format: 'decimal',
                year: [2022],
                target_unit: 'unit',
                target_value: 100,
                base_line: 10,
                is_active: true,
              },
            },
          ],
        },
        {
          id: 2,
          name: 'Child',
          code: 'C1',
          parent_id: 1,
          group_name: 'Level2',
          indicatorPerItem: [],
        },
      ];
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockGroups),
      };
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.findAll('agreement1');
      expect(result.name_level_1).toBe('Level1');
      expect(result.name_level_2).toBe('Level2');
      expect(result.structures.length).toBe(1);
      expect(result.structures[0].items.length).toBe(1);
      expect(result.structures[0].indicators.length).toBe(1);
    });
  });

  describe('syncStructures2', () => {
    function createMockQueryBuilder() {
      return {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
        getCount: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
    }

    function createMockEntityManager() {
      return {
        find: jest.fn().mockResolvedValue([{ id: 111, is_active: true }]),
        create: jest.fn().mockImplementation((_, obj) => obj),
        save: jest.fn().mockImplementation(async (obj) => ({
          ...obj,
          id: Math.floor(Math.random() * 1000),
        })),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
        findOne: jest.fn().mockResolvedValue(null),
        remove: jest.fn().mockResolvedValue({}),
        softDelete: jest.fn().mockResolvedValue({ affected: 0 }),
        query: jest.fn().mockResolvedValue({}),
      };
    }

    it('should create new parent and child when none exist', async () => {
      const managerMock = createMockEntityManager();
      dataSource.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(managerMock));

      const dtoCreate = {
        agreement_id: 'agreement1',
        name_level_1: 'Level1',
        name_level_2: 'Level2',
        structures: [
          {
            name: 'Parent',
            code: 'P1',
            items: [
              {
                name: 'Child',
                code: 'C1',
                indicators: [
                  {
                    name: 'Child Indicator',
                    description: 'Child test indicator',
                    code: 'CIND1',
                    number_type: 'type2',
                    number_format: 'format2',
                    years: [2023],
                    target_unit: 'unit2',
                    target_value: 50,
                    base_line: 25,
                    type: 'type2',
                    level: 2,
                  },
                ],
              },
            ],
            indicators: [
              {
                name: 'Indicator 1',
                description: 'Test indicator',
                code: 'IND1',
                number_type: 'type1',
                number_format: 'format1',
                years: [2023, 2024],
                target_unit: 'unit1',
                target_value: 100,
                base_line: 50,
                type: 'type1',
                level: 1,
              },
            ],
          },
        ],
      };

      const result = await service.syncStructures2(dtoCreate);
      expect(result).toEqual({
        message: 'Sincronización de padres completada',
      });
      expect(managerMock.save).toHaveBeenCalled();
      expect(managerMock.create).toHaveBeenCalled();
      expect(managerMock.update).toHaveBeenCalled();
    });

    it('should update existing parent and child', async () => {
      const parentId = 123;
      const childId = 456;
      const managerMock = createMockEntityManager();
      managerMock.find.mockImplementationOnce(async () => [
        {
          id: parentId,
          name: 'OldParent',
          code: 'OP',
          agreement_id: 'agreement1',
          parent_id: null,
        },
      ]);

      // Mock the second call for existing children
      managerMock.find.mockImplementationOnce(async () => [
        {
          id: childId,
          name: 'OldChild',
          code: 'OC',
          agreement_id: 'agreement1',
          parent_id: parentId,
        },
      ]);

      // Mock save to return the saved entity with id
      managerMock.save.mockImplementation(async (entity) => ({
        ...entity,
        id: entity.id || Math.floor(Math.random() * 1000),
      }));

      dataSource.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(managerMock));

      const dtoUpdate = {
        agreement_id: 'agreement1',
        name_level_1: 'Level1',
        name_level_2: 'Level2',
        structures: [
          {
            id: parentId,
            name: 'UpdatedParent',
            code: 'UP1',
            indicators: [],
            items: [
              {
                id: childId,
                name: 'UpdatedChild',
                code: 'UC1',
                indicators: [],
              },
            ],
          },
        ],
      };

      const result = await service.syncStructures2(dtoUpdate);
      expect(result).toEqual({
        message: 'Sincronización de padres completada',
      });
      expect(managerMock.save).toHaveBeenCalled();
    });

    it('should deactivate parents and children not in payload', async () => {
      const parentId = 111;
      const managerMock = createMockEntityManager();
      dataSource.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(managerMock));

      const dto = {
        agreement_id: 'agreement1',
        name_level_1: 'Level1',
        name_level_2: 'Level2',
        structures: [],
      };

      const result = await service.syncStructures2(dto);
      expect(result).toEqual({
        message: 'Sincronización de padres completada',
      });
      expect(managerMock.update).toHaveBeenCalledWith(
        expect.anything(),
        { id: parentId },
        expect.objectContaining({ is_active: false }),
      );
    });

    it('should handle indicators creation and association', async () => {
      const managerMock = createMockEntityManager();
      dataSource.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(managerMock));

      const dtoIndicators = {
        agreement_id: 'agreement1',
        name_level_1: 'Level1',
        name_level_2: 'Level2',
        structures: [
          {
            name: 'Parent',
            code: 'P1',
            indicators: [
              {
                id: 1,
                name: 'Ind1',
                code: 'C1',
                description: 'desc',
                number_type: 'int',
                number_format: 'decimal',
                years: [2022],
                target_unit: 'unit',
                target_value: 100,
                base_line: 10,
                type: 'type1',
                level: 1,
              },
            ],
            items: [],
          },
        ],
      };

      const result = await service.syncStructures2(dtoIndicators);
      expect(result).toEqual({
        message: 'Sincronización de padres completada',
      });
      expect(managerMock.save).toHaveBeenCalled();
      expect(managerMock.create).toHaveBeenCalled();
      expect(managerMock.query).toHaveBeenCalled();
    });
  });
});
