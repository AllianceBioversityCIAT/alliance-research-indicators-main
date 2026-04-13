import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultPolicyChangeController } from './result-policy-change.controller';
import { ResultPolicyChangeService } from './result-policy-change.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

jest.mock('../../shared/utils/response.utils');

describe('ResultPolicyChangeController', () => {
  let controller: ResultPolicyChangeController;
  const mockService = {
    update: jest.fn(),
    findPolicyChange: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultPolicyChangeController],
      providers: [
        { provide: ResultPolicyChangeService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 6,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ResultPolicyChangeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('updateByResultId', async () => {
    const body = {} as any;
    const out = {};
    mockService.update.mockResolvedValue(out);
    mockFormat.mockReturnValue({});
    await controller.updateByResultId(body);
    expect(mockService.update).toHaveBeenCalledWith(6, body);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result policy change updated',
      status: HttpStatus.OK,
      data: out,
    });
  });

  it('getByResultId', async () => {
    const out = {};
    mockService.findPolicyChange.mockResolvedValue(out);
    mockFormat.mockReturnValue({});
    await controller.getByResultId();
    expect(mockService.findPolicyChange).toHaveBeenCalledWith(6);
  });
});
