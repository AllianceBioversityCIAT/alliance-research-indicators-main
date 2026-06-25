import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { StrategicObjectivesController } from './strategic-objectives.controller';
import { StrategicObjectivesService } from './strategic-objectives.service';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreateStrategicObjectiveDto } from './dto/create-strategic-objective.dto';
import { UpdateStrategicObjectiveDto } from './dto/update-strategic-objective.dto';

jest.mock('../../shared/utils/response.utils');

describe('StrategicObjectivesController', () => {
  let controller: StrategicObjectivesController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrategicObjectivesController],
      providers: [
        { provide: StrategicObjectivesService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
        mockPortfolioUtilProvider,
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StrategicObjectivesController>(
      StrategicObjectivesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a strategic objective and return formatted response', async () => {
      const dto: CreateStrategicObjectiveDto = {
        name: 'Objective A',
        description: 'Description',
        portfolio_id: 1,
      };
      const data = { id: 1, ...dto };
      mockService.create.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Strategic objective created successfully',
        data,
        status: HttpStatus.CREATED,
      });
    });
  });

  describe('findAll', () => {
    it('should return strategic objectives filtered by portfolio with formatted response', async () => {
      const data = [{ id: 1, name: 'A' }];
      mockService.findAll.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalledWith(null);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Strategic objectives found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('findOne', () => {
    it('should return a strategic objective by id with formatted response', async () => {
      const data = { id: 7, name: 'B' };
      mockService.findOne.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.findOne('7');

      expect(mockService.findOne).toHaveBeenCalledWith(7);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Strategic objective found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('update', () => {
    it('should update a strategic objective and return formatted response', async () => {
      const dto: UpdateStrategicObjectiveDto = {
        name: 'Updated',
        portfolio_id: 2,
      };
      const data = { id: 4, ...dto };
      mockService.update.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.update('4', dto);

      expect(mockService.update).toHaveBeenCalledWith(4, dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Strategic objective updated successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('remove', () => {
    it('should delete a strategic objective and return formatted response', async () => {
      const data = 9;
      mockService.remove.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.remove('9');

      expect(mockService.remove).toHaveBeenCalledWith(9);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Strategic objective id 9 was deleted successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });
});
