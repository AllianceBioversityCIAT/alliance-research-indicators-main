import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ReportingFeedbackController } from './reporting-feedback.controller';
import { ReportingFeedbackService } from './reporting-feedback.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';

jest.mock('../../shared/utils/response.utils');

describe('ReportingFeedbackController', () => {
  let controller: ReportingFeedbackController;
  const mockService = { handleFeedback: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingFeedbackController],
      providers: [
        { provide: ReportingFeedbackService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();
    controller = module.get(ReportingFeedbackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('updateFeedback', async () => {
    const body = { message: 'help' } as any;
    mockService.handleFeedback.mockResolvedValue(undefined);
    mockFormat.mockReturnValue({});
    await controller.updateFeedback(body);
    expect(mockService.handleFeedback).toHaveBeenCalledWith(body);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Feedback sent',
      status: HttpStatus.OK,
    });
  });
});
