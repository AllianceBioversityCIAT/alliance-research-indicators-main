import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { LeverStrategicOutcomeController } from './lever-strategic-outcome.controller';
import { LeverStrategicOutcomeService } from './lever-strategic-outcome.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('LeverStrategicOutcomeController', () => {
  let controller: LeverStrategicOutcomeController;
  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByLeverId: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeverStrategicOutcomeController],
      providers: [
        { provide: LeverStrategicOutcomeService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(LeverStrategicOutcomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find inherits BaseController behavior', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Lever Strategic Outcome found',
      data: [],
      status: HttpStatus.OK,
    });
  });

  describe('findByLeverId', () => {
    it('should format outcomes for lever', async () => {
      const data = [{ id: 1 }];
      mockService.findByLeverId.mockResolvedValue(data);
      mockFormat.mockReturnValue({ data });
      await controller.findByLeverId(7);
      expect(mockService.findByLeverId).toHaveBeenCalledWith(7);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        data,
        description: 'List of Lever Strategic Outcomes for lever ID 7',
        status: HttpStatus.OK,
      });
    });
  });
});
