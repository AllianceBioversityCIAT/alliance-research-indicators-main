import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultCapacitySharingController } from './result-capacity-sharing.controller';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

jest.mock('../../shared/utils/response.utils');

describe('ResultCapacitySharingController', () => {
  let controller: ResultCapacitySharingController;
  const mockService = {
    update: jest.fn(),
    findByResultId: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultCapacitySharingController],
      providers: [
        { provide: ResultCapacitySharingService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 7,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ResultCapacitySharingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('updateResultCapacitySharing', async () => {
    const body = {} as any;
    const out = {};
    mockService.update.mockResolvedValue(out);
    mockFormat.mockReturnValue({});
    await controller.updateResultCapacitySharing(body);
    expect(mockService.update).toHaveBeenCalledWith(7, body);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result capacity sharing updated',
      status: HttpStatus.OK,
      data: out,
    });
  });

  it('getCapacitySharing', async () => {
    const out = {};
    mockService.findByResultId.mockResolvedValue(out);
    mockFormat.mockReturnValue({});
    await controller.getCapacitySharing();
    expect(mockService.findByResultId).toHaveBeenCalledWith(7);
  });
});
