import { Test, TestingModule } from '@nestjs/testing';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { HttpStatus } from '@nestjs/common';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

jest.mock('../../shared/utils/response.utils');

describe('PortfoliosController', () => {
  let controller: PortfoliosController;

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
      controllers: [PortfoliosController],
      providers: [
        { provide: PortfoliosService, useValue: mockService },
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

    controller = module.get<PortfoliosController>(PortfoliosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a portfolio and return formatted response', async () => {
      const dto: CreatePortfolioDto = {
        name: 'Portfolio A',
        description: 'Description',
        start_year: 2024,
        end_year: 2024,
        clarisa_levers: [],
      };
      const data = { id: 1, ...dto };
      mockService.create.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Portfolio created successfully',
        data,
        status: HttpStatus.CREATED,
      });
    });
  });

  describe('findAll', () => {
    it('should return all portfolios with formatted response', async () => {
      const data = [{ id: 1, name: 'A' }];
      mockService.findAll.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalled();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Portfolios found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('findOne', () => {
    it('should return a portfolio by id with formatted response', async () => {
      const data = { id: 7, name: 'B' };
      mockService.findOne.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.findOne('7');

      expect(mockService.findOne).toHaveBeenCalledWith(7);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Portfolio found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('update', () => {
    it('should update a portfolio and return formatted response', async () => {
      const dto: UpdatePortfolioDto = {
        name: 'Updated',
        start_year: 2024,
        end_year: 2024,
      };
      const data = { affected: 1 };
      mockService.update.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.update('4', dto);

      expect(mockService.update).toHaveBeenCalledWith(4, dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Portfolio updated successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('remove', () => {
    it('should delete a portfolio and return formatted response', async () => {
      const data = 9;
      mockService.remove.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.remove('9');

      expect(mockService.remove).toHaveBeenCalledWith(9);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Portfolio deleted successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });
});
