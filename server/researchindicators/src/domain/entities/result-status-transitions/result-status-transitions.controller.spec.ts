import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultStatusTransitionsController } from './result-status-transitions.controller';
import { ResultStatusTransitionsService } from './result-status-transitions.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('ResultStatusTransitionsController', () => {
  let controller: ResultStatusTransitionsController;
  const mockService = { findNextStatuses: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultStatusTransitionsController],
      providers: [
        { provide: ResultStatusTransitionsService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(ResultStatusTransitionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findNextStatuses', async () => {
    const next = [];
    mockService.findNextStatuses.mockResolvedValue(next);
    mockFormat.mockReturnValue({});
    await controller.findNextStatuses(2 as any);
    expect(mockService.findNextStatuses).toHaveBeenCalledWith(2);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: next,
      description: 'Next statuses retrieved successfully',
      status: HttpStatus.OK,
    });
  });
});
