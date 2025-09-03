import { Test, TestingModule } from '@nestjs/testing';
import { GroupsItemsService } from './groups_items.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';
import { DataSource, Repository } from 'typeorm';
import { EntityManager } from 'typeorm';

describe('GroupsItemsService', () => {
  let service: GroupsItemsService;
  let repo: Repository<GroupItem>;

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
          { name: 'Level1', level: 1, custom_field_1: 'cf1' },
          { name: 'Level2', level: 2, custom_field_2: 'cf2' },
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
      expect(result.levels.length).toBe(2);
      expect(result.levels[0].custom_fields.length).toBe(1);
      expect(result.structures.length).toBe(1);
      expect(result.structures[0].items.length).toBe(1);
      expect(result.structures[0].indicators.length).toBe(1);
    });

    it('should skip groups without name or code', async () => {
      const mockGroups = [
        {
          id: 1,
          name: null,
          code: 'P1',
          parent_id: null,
          indicatorPerItem: [],
        },
        {
          id: 2,
          name: 'Parent',
          code: null,
          parent_id: null,
          indicatorPerItem: [],
        },
        {
          id: 3,
          name: 'Valid',
          code: 'C1',
          parent_id: null,
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
      expect(result.structures.length).toBe(1);
      expect(result.structures[0].name).toBe('Valid');
    });

    it('should handle empty groups', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.findAll('agreement1');
      expect(result.structures).toEqual([]);
      expect(result.levels.length).toBe(2);
    });
  });

  describe('syncGroupItemIndicators', () => {
    it('should insert new indicator relation', async () => {
      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
        query: jest.fn().mockResolvedValue({}),
      } as unknown as EntityManager;

      await service['syncGroupItemIndicators'](
        1,
        [{ id: 2 }],
        'agreement1',
        manager,
      );
      expect(manager.query).toHaveBeenCalledWith(
        'INSERT INTO indicator_per_item (group_item_id, project_indicator_id) VALUES (?, ?)',
        [1, 2],
      );
    });

    it('should delete indicator relation not in payload', async () => {
      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([{ indicatorId: 2 }]),
          delete: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({}),
        }),
        query: jest.fn().mockResolvedValue({}),
      } as unknown as EntityManager;

      await service['syncGroupItemIndicators'](1, [], 'agreement1', manager);
      expect(manager.createQueryBuilder().delete).toHaveBeenCalled();
      expect(manager.createQueryBuilder().execute).toHaveBeenCalled();
    });
  });
});
