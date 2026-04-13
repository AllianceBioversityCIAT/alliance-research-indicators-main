import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DynamoFeedbackController } from './dynamo-feedback.controller';
import { DynamoFeedbackService } from './dynamo-feedback.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('DynamoFeedbackController', () => {
  let controller: DynamoFeedbackController;
  const mockService = {
    saveData: jest.fn(),
    getAllFeedback: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamoFeedbackController],
      providers: [
        { provide: DynamoFeedbackService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(DynamoFeedbackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('saveData', async () => {
    const body = { text: 'x' } as any;
    const saved = { ok: true };
    mockService.saveData.mockResolvedValue(saved);
    mockFormat.mockReturnValue({});
    await controller.saveData(body);
    expect(mockService.saveData).toHaveBeenCalledWith(body);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Feedback saved successfully',
      status: HttpStatus.OK,
      data: saved,
    });
  });

  it('getAllFeedback', async () => {
    const list = [];
    mockService.getAllFeedback.mockResolvedValue(list);
    mockFormat.mockReturnValue({});
    await controller.getAllFeedback();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Feedback retrieved successfully',
      status: HttpStatus.OK,
      data: list,
    });
  });
});
