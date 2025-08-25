import { Test, TestingModule } from '@nestjs/testing';
import { ProjectIndicatorsService } from './project_indicators.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectIndicator } from './entities/project_indicator.entity';
import { Repository, DataSource } from 'typeorm';
import { CreateProjectIndicatorDto } from './dto/create-project_indicator.dto';

describe('ProjectIndicatorsService', () => {
  let service: ProjectIndicatorsService;
  let indicatorRepository: Repository<ProjectIndicator>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const indicatorRepositoryMock = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    const dataSourceMock = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectIndicatorsService,
        { provide: getRepositoryToken(ProjectIndicator), useValue: indicatorRepositoryMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<ProjectIndicatorsService>(ProjectIndicatorsService);
    indicatorRepository = module.get<Repository<ProjectIndicator>>(getRepositoryToken(ProjectIndicator));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return mapped indicators', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            code: 'A',
            name: 'Indicator A',
            description: 'desc',
            number_type: 'int',
            number_format: 'format',
            target_unit: 'unit',
            target_value: 10,
            base_line: 5,
            year: [2022],
            type: 'type1',
          },
        ]),
      };
      (indicatorRepository.createQueryBuilder as any).mockReturnValue(qb);

      const result = await service.findAll('agreement1');
      expect(result).toEqual([
        {
          id: 1,
          code: 'A',
          name: 'Indicator A',
          description: 'desc',
          numberType: 'int',
          numberFormat: 'format',
          targetUnit: 'unit',
          targetValue: 10,
          baseline: 5,
          years: [2022],
          type: 'type1',
        },
      ]);
      expect(qb.where).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalled();
      expect(qb.getRawMany).toHaveBeenCalled();
    });
  });

  describe('syncIndicator', () => {
    it('should update existing indicator', async () => {
      const dto: CreateProjectIndicatorDto = {
        id: 1,
        code: 'C',
        name: 'Name',
        description: 'Desc',
        numberType: 'int',
        numberFormat: 'fmt',
        targetUnit: 'unit',
        targetValue: 100,
        baseline: 10,
        years: [2023],
        agreement_id: 'ag1',
        type: 'type',
      };
      const indicator = { id: 1 };
      (indicatorRepository.findOne as any).mockResolvedValue(indicator);
      (indicatorRepository.save as any).mockResolvedValue({ ...indicator, ...dto });

      const result = await service.syncIndicator(dto);
      expect(result).toMatchObject(dto);
      expect(indicatorRepository.findOne).toHaveBeenCalledWith({ where: { id: dto.id } });
      expect(indicatorRepository.save).toHaveBeenCalled();
    });

    it('should throw if indicator not found', async () => {
      (indicatorRepository.findOne as any).mockResolvedValue(null);
      const dto: CreateProjectIndicatorDto = { id: 99 } as any;
      await expect(service.syncIndicator(dto)).rejects.toThrow('Indicator with id 99 not found');
    });

    it('should create new indicator', async () => {
      const dto: CreateProjectIndicatorDto = {
        code: 'C',
        name: 'Name',
        description: 'Desc',
        numberType: 'int',
        numberFormat: 'fmt',
        targetUnit: 'unit',
        targetValue: 100,
        baseline: 10,
        years: [2023],
        agreement_id: 'ag1',
        type: 'type',
      };
      (indicatorRepository.create as any).mockReturnValue(dto);
      (indicatorRepository.save as any).mockResolvedValue(dto);

      const result = await service.syncIndicator(dto);
      expect(result).toEqual(dto);
      expect(indicatorRepository.create).toHaveBeenCalled();
      expect(indicatorRepository.save).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should update indicator as deleted', async () => {
      (indicatorRepository.update as any).mockResolvedValue({ affected: 1 });
      const result = await service.softDelete(1);
      expect(result).toEqual({ affected: 1 });
      expect(indicatorRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        is_active: false,
      }));
    });
  });

  describe('findByResult', () => {
    it('should return contracts for result', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            agreement_id: 'ag1',
            contract_description: 'desc',
            result_id: 'r1',
            result_official_code: 'code',
            result_title: 'title',
          },
        ]),
      };
      (indicatorRepository.createQueryBuilder as any).mockReturnValue(qb);

      const result = await service.findByResult('r1');
      expect(result).toEqual({
        result_id: 'r1',
        result_official_code: 'code',
        result_title: 'title',
        contracts: [
          { agreement_id: 'ag1', description: 'desc' },
        ],
      });
    });

    it('should return empty contracts if no rows', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      (indicatorRepository.createQueryBuilder as any).mockReturnValue(qb);

      const result = await service.findByResult('r2');
      expect(result).toEqual({
        result_id: 'r2',
        result_official_code: null,
        result_title: null,
        contracts: [],
      });
    });
  });

  describe('getIndicatorsHierarchy', () => {
    it('should return indicators hierarchy', async () => {
      (dataSource.query as any).mockResolvedValue([
        {
          project_indicator_id: 1,
          indicator_code: 'IC',
          indicator_name: 'IN',
          indicator_description: 'desc',
          number_type: 'int',
          number_format: 'fmt',
          target_unit: 'unit',
          target_value: 10,
          base_line: 5,
          year: [2022],
          type: 'type',
          item_id: 100,
          item_name: 'Group',
          item_code: 'G1',
          parent_id: null,
        },
      ]);

      const result = await service.getIndicatorsHierarchy('ag1');
      expect(result).toEqual([
        {
          id: 1,
          code: 'IC',
          name: 'IN',
          description: 'desc',
          numberType: 'int',
          numberFormat: 'fmt',
          targetUnit: 'unit',
          targetValue: 10,
          baseLine: 5,
          year: [2022],
          type: 'type',
          group_item: {
            id: 100,
            name: 'Group',
            code: 'G1',
            parent_id: null,
            parent_item: null,
          },
        },
      ]);
      expect(dataSource.query).toHaveBeenCalled();
    });

    it('should return empty array if no indicators', async () => {
      (dataSource.query as any).mockResolvedValue([]);
      const result = await service.getIndicatorsHierarchy('ag1');
      expect(result).toEqual([]);
    });
  });

  describe('findContributionsByResult', () => {
    it('should group contributions by indicator', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            indicator_id: 1,
            code: 'IC1',
            name: 'Indicator 1',
            description: 'Desc 1',
            target_unit: 'unit1',
            number_type: 'int',
            number_format: 'fmt1',
            target_value: 100,
            base_line: 10,
            year: [2022],
            type: 'type1',
            contribution_value: 50,
            result_id: 'r1',
            result_official_code: 'RC1',
            title: 'Result 1',
            result_description: 'Result Desc 1',
          },
          {
            indicator_id: 1,
            code: 'IC1',
            name: 'Indicator 1',
            description: 'Desc 1',
            target_unit: 'unit1',
            number_type: 'int',
            number_format: 'fmt1',
            target_value: 100,
            base_line: 10,
            year: [2022],
            type: 'type1',
            contribution_value: 30,
            result_id: 'r2',
            result_official_code: 'RC2',
            title: 'Result 2',
            result_description: 'Result Desc 2',
          },
          {
            indicator_id: 2,
            code: 'IC2',
            name: 'Indicator 2',
            description: 'Desc 2',
            target_unit: 'unit2',
            number_type: 'float',
            number_format: 'fmt2',
            target_value: 200,
            base_line: 20,
            year: [2023],
            type: 'type2',
            contribution_value: 70,
            result_id: 'r3',
            result_official_code: 'RC3',
            title: 'Result 3',
            result_description: 'Result Desc 3',
          },
        ]),
      };
      (indicatorRepository.createQueryBuilder as any).mockReturnValue(qb);

      const result = await service.findContributionsByResult('agreementID');
      expect(result).toEqual([
        {
          indicator_id: 1,
          code: 'IC1',
          name: 'Indicator 1',
          description: 'Desc 1',
          target_unit: 'unit1',
          number_type: 'int',
          number_format: 'fmt1',
          target_value: 100,
          base_line: 10,
          year: [2022],
          type: 'type1',
          contributions: [
            {
              result_id: 'r1',
              result_official_code: 'RC1',
              title: 'Result 1',
              description: 'Result Desc 1',
              contribution_value: 50,
            },
            {
              result_id: 'r2',
              result_official_code: 'RC2',
              title: 'Result 2',
              description: 'Result Desc 2',
              contribution_value: 30,
            },
          ],
        },
        {
          indicator_id: 2,
          code: 'IC2',
          name: 'Indicator 2',
          description: 'Desc 2',
          target_unit: 'unit2',
          number_type: 'float',
          number_format: 'fmt2',
          target_value: 200,
          base_line: 20,
          year: [2023],
          type: 'type2',
          contributions: [
            {
              result_id: 'r3',
              result_official_code: 'RC3',
              title: 'Result 3',
              description: 'Result Desc 3',
              contribution_value: 70,
            },
          ],
        },
      ]);
      expect(qb.select).toHaveBeenCalled();
      expect(qb.innerJoin).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalled();
      expect(qb.getRawMany).toHaveBeenCalled();
    });

    it('should return empty array if no contributions', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      (indicatorRepository.createQueryBuilder as any).mockReturnValue(qb);

      const result = await service.findContributionsByResult('agreementID');
      expect(result).toEqual([]);
    });
  });
});
