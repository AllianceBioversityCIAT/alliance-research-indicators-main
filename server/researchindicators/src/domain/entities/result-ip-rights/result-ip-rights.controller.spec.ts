import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultIpRightsController } from './result-ip-rights.controller';
import { ResultIpRightsService } from './result-ip-rights.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

jest.mock('../../shared/utils/response.utils');

describe('ResultIpRightsController', () => {
  let controller: ResultIpRightsController;
  const mockService = {
    findByResultId: jest.fn(),
    update: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultIpRightsController],
      providers: [
        { provide: ResultIpRightsService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 3,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ResultIpRightsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findByResultId', async () => {
    const data = [];
    mockService.findByResultId.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.findByResultId();
    expect(mockService.findByResultId).toHaveBeenCalledWith(3);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result intellectual property rights found',
      status: HttpStatus.OK,
      data,
    });
  });

  it('update', async () => {
    const dto = {} as any;
    mockService.update.mockResolvedValue(undefined);
    mockFormat.mockReturnValue({});
    await controller.update(dto);
    expect(mockService.update).toHaveBeenCalledWith(3, dto);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result intellectual property rights updated',
      status: HttpStatus.OK,
    });
  });
});
