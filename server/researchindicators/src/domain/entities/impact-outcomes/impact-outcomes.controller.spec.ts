import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ImpactOutcomesController } from './impact-outcomes.controller';
import { ImpactOutcomesService } from './impact-outcomes.service';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreateImpactOutcomeDto } from './dto/create-impact-outcome.dto';
import { UpdateImpactOutcomeDto } from './dto/update-impact-outcome.dto';

jest.mock('../../shared/utils/response.utils');

describe('ImpactOutcomesController', () => {
  let controller: ImpactOutcomesController;

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
      controllers: [ImpactOutcomesController],
      providers: [
        { provide: ImpactOutcomesService, useValue: mockService },
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

    controller = module.get<ImpactOutcomesController>(ImpactOutcomesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an impact outcome and return formatted response', async () => {
      const dto: CreateImpactOutcomeDto = {
        name: 'Outcome A',
        description: 'Description',
        portfolio_id: 1,
      };
      const data = { id: 1, ...dto };
      mockService.create.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Impact outcome created successfully',
        data,
        status: HttpStatus.CREATED,
      });
    });
  });

  describe('findAll', () => {
    it('should return impact outcomes filtered by portfolio with formatted response', async () => {
      const data = [{ id: 1, name: 'A' }];
      mockService.findAll.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalledWith(null);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Impact outcomes found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('findOne', () => {
    it('should return an impact outcome by id with formatted response', async () => {
      const data = { id: 7, name: 'B' };
      mockService.findOne.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.findOne('7');

      expect(mockService.findOne).toHaveBeenCalledWith(7);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Impact outcome found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('update', () => {
    it('should update an impact outcome and return formatted response', async () => {
      const dto: UpdateImpactOutcomeDto = {
        name: 'Updated',
        portfolio_id: 2,
      };
      const data = { id: 4, ...dto };
      mockService.update.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.update('4', dto);

      expect(mockService.update).toHaveBeenCalledWith(4, dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Impact outcome updated successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('remove', () => {
    it('should delete an impact outcome and return formatted response', async () => {
      const data = 9;
      mockService.remove.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.remove('9');

      expect(mockService.remove).toHaveBeenCalledWith(9);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Impact outcome id 9 was deleted successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });
});
