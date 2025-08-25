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

    it('should create parent and child when structures is empty', async () => {
      const managerMock: any = {
        find: jest.fn().mockResolvedValue([]),
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
      };
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
      expect(result.message).toBe(
        'Registro(s) creado(s) con acuerdo y nombre(s) de nivel',
      );
      expect(result.data.parent).toBeDefined();
      expect(result.data.child).toBeDefined();
    });

    it('should throw error if no names and no structures', async () => {
      const managerMock: any = {};
      dataSource.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(managerMock));
      const dto = { agreement_id: 'agreement1', structures: [] };
      await expect(service.syncStructures2(dto)).rejects.toThrow(
        'Debe enviarse al menos name_level_1 o name_level_2',
      );
    });

    it('should process structures and deactivate missing parents/children', async () => {
      const managerMock: any = {
        find: jest.fn().mockResolvedValue([]),
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
      };

      dataSource.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(managerMock));

      const dto = {
        agreement_id: 'agreement1',
        name_level_1: 'Level1',
        name_level_2: 'Level2',
        structures: [
          {
            name: 'Parent',
            code: 'P1',
            indicators: [],
            items: [
              {
                name: 'Child',
                code: 'C1',
                indicators: [],
              },
            ],
          },
        ],
      };
      const result = await service.syncStructures2(dto);
      expect(result.message).toBe('Sincronización de padres completada');
    });
  });
});
