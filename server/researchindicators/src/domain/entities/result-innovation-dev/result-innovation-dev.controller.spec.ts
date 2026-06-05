import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultInnovationDevController } from './result-innovation-dev.controller';
import { ResultInnovationDevService } from './result-innovation-dev.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

jest.mock('../../shared/utils/response.utils');

describe('ResultInnovationDevController', () => {
  let controller: ResultInnovationDevController;
  const mockService = {
    update: jest.fn(),
    findOne: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInnovationDevController],
      providers: [
        { provide: ResultInnovationDevService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 11,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ResultInnovationDevController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create (patch)', async () => {
    const dto = {} as any;
    const res = {};
    mockService.update.mockResolvedValue(res);
    mockFormat.mockReturnValue({});
    await controller.create(dto);
    expect(mockService.update).toHaveBeenCalledWith(11, dto);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result Innovation Development created successfully',
      data: res,
      status: HttpStatus.OK,
    });
  });

  it('findOne', async () => {
    const res = {};
    mockService.findOne.mockResolvedValue(res);
    mockFormat.mockReturnValue({});
    await controller.findOne();
    expect(mockService.findOne).toHaveBeenCalledWith(11);
  });
});
