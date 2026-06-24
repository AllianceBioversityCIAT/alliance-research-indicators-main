import { Test, TestingModule } from '@nestjs/testing';
import { mockPortfolioUtilProvider } from '../../../../shared/testing/mock-portfolio.util';
import { HttpStatus } from '@nestjs/common';
import { ClarisaLeversController } from './clarisa-levers.controller';
import { ClarisaLeversService } from './clarisa-levers.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ResultsUtil } from '../../../../shared/utils/results.util';
import { RolesGuard } from '../../../../shared/guards/roles.guard';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaLeversController', () => {
  let controller: ClarisaLeversController;
  const raw = [{ id: 1 }];
  const mapped = [{ id: 1, icon: 'x' }];
  const mockService = {
    findAllWithPortfolio: jest.fn().mockResolvedValue(raw),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    iconMapper: jest.fn().mockReturnValue(mapped),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockService.findAllWithPortfolio.mockResolvedValue(raw);
    mockService.iconMapper.mockReturnValue(mapped);
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaLeversController],
      providers: [
        { provide: ClarisaLeversService, useValue: mockService },
        mockPortfolioUtilProvider,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ClarisaLeversController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('find', () => {
    it('should map icons and return formatted response', async () => {
      mockFormat.mockReturnValue({ ok: true });

      await controller.find();

      expect(mockService.findAllWithPortfolio).toHaveBeenCalledWith(null);
      expect(mockService.iconMapper).toHaveBeenCalledWith(raw);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Levers found',
        data: mapped,
        status: HttpStatus.OK,
      });
    });
  });

  describe('findById', () => {
    it('should return a lever by id with formatted response', async () => {
      const data = { id: 2 };
      mockService.findOne.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.findById('2');

      expect(mockService.findOne).toHaveBeenCalledWith(2);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Levers found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('create', () => {
    it('should create a lever and return formatted response', async () => {
      const dto = {
        portfolio_id: 1,
        full_name: 'Lever 1',
        short_name: 'L1',
      };
      const data = { id: 10, ...dto };
      mockService.create.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Clarisa lever created successfully',
        data,
        status: HttpStatus.CREATED,
      });
    });
  });

  describe('update', () => {
    it('should update a lever and return formatted response', async () => {
      const dto = {
        portfolio_id: 2,
        full_name: 'Updated lever',
      };
      const data = { id: 4, ...dto };
      mockService.update.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.update('4', dto);

      expect(mockService.update).toHaveBeenCalledWith(4, dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Clarisa lever updated successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('remove', () => {
    it('should delete a lever and return formatted response', async () => {
      mockService.remove.mockResolvedValue(9);
      mockFormat.mockReturnValue({ ok: true });

      await controller.remove('9');

      expect(mockService.remove).toHaveBeenCalledWith(9);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Clarisa lever id 9 was deleted successfully',
        data: 9,
        status: HttpStatus.OK,
      });
    });
  });
});
