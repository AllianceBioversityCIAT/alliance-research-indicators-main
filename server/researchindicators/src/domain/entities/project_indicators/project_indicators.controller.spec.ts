import { Test, TestingModule } from '@nestjs/testing';
import { ProjectIndicatorsController } from './project_indicators.controller';
import { ProjectIndicatorsService } from './project_indicators.service';
import { CreateProjectIndicatorDto } from './dto/create-project_indicator.dto';
import { HttpStatus } from '@nestjs/common';
import { ResultsUtil } from '../../shared/utils/results.util';

describe('ProjectIndicatorsController', () => {
  let controller: ProjectIndicatorsController;
  let service: ProjectIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectIndicatorsController],
      providers: [
        {
          provide: ProjectIndicatorsService,
          useValue: {
            findAll: jest.fn(),
            syncIndicator: jest.fn(),
            getIndicatorsHierarchy: jest.fn(),
            findByResult: jest.fn(),
            softDelete: jest.fn(),
            findContributionsByResult: jest.fn(),
          },
        },
        {
          provide: ResultsUtil,
          useValue: {
            transform: jest.fn((data) => data), // mock simple
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectIndicatorsController>(
      ProjectIndicatorsController,
    );
    service = module.get<ProjectIndicatorsService>(ProjectIndicatorsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAll', () => {
    it('should return formatted response with all indicators', async () => {
      const mockData = [{ id: 1 }];
      (service.findAll as jest.Mock).mockResolvedValue(mockData);
      const result = await controller.getAll('agreement1');
      expect(service.findAll).toHaveBeenCalledWith('agreement1');
      expect(result).toEqual({
        description: 'Structure found',
        status: HttpStatus.OK,
        data: mockData,
      });
    });
  });

  describe('create', () => {
    it('should return formatted response after creating indicator', async () => {
      const dto: CreateProjectIndicatorDto = { name: 'Test' } as any;
      const mockData = { id: 1, ...dto };
      (service.syncIndicator as jest.Mock).mockResolvedValue(mockData);
      const result = await controller.create(dto);
      expect(service.syncIndicator).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        description: 'Structure created',
        status: HttpStatus.CREATED,
        data: mockData,
      });
    });
  });

  describe('getHierarchy', () => {
    it('should return formatted response with hierarchy', async () => {
      const mockData = [{ id: 1 }];
      (service.getIndicatorsHierarchy as jest.Mock).mockResolvedValue(mockData);
      const result = await controller.getHierarchy('agreement1');
      expect(service.getIndicatorsHierarchy).toHaveBeenCalledWith('agreement1');
      expect(result).toEqual({
        description: 'Hierarchy found',
        status: HttpStatus.OK,
        data: mockData,
      });
    });
  });

  describe('getByResult', () => {
    it('should return formatted response with indicators by result', async () => {
      const mockData = [{ id: 2 }];
      (service.findByResult as jest.Mock).mockResolvedValue(mockData);
      const result = await controller.getByResult('result1');
      expect(service.findByResult).toHaveBeenCalledWith('result1');
      expect(result).toEqual({
        description: 'Indicators found',
        status: HttpStatus.OK,
        data: mockData,
      });
    });
  });

  describe('softDelete', () => {
    it('should return formatted response after soft deleting indicator', async () => {
      const mockResult = { affected: 1 };
      (service.softDelete as jest.Mock).mockResolvedValue(mockResult);
      const result = await controller.softDelete(1);
      expect(service.softDelete).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        description: 'Indicator deleted successfully',
        status: HttpStatus.OK,
        data: mockResult,
      });
    });
  });

  describe('getContributionsByResult', () => {
    it('should return formatted response with contributions by result', async () => {
      const mockData = [{ id: 3 }];
      (service.findContributionsByResult as jest.Mock).mockResolvedValue(
        mockData,
      );
      const result = await controller.getContributionsByResult('agreement2');
      expect(service.findContributionsByResult).toHaveBeenCalledWith(
        'agreement2',
      );
      expect(result).toEqual({
        description: 'Contributions found',
        status: HttpStatus.OK,
        data: mockData,
      });
    });
  });
});
