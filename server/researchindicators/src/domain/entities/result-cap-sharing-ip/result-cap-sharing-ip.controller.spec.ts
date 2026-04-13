import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultCapSharingIpController } from './result-cap-sharing-ip.controller';
import { ResultIpRightsService } from '../result-ip-rights/result-ip-rights.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';

jest.mock('../../shared/utils/response.utils');

describe('ResultCapSharingIpController', () => {
  let controller: ResultCapSharingIpController;
  const mockIpService = {
    findByResultId: jest.fn(),
    update: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultCapSharingIpController],
      providers: [
        { provide: ResultIpRightsService, useValue: mockIpService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 4,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();
    controller = module.get(ResultCapSharingIpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findByResultId', async () => {
    const data = [];
    mockIpService.findByResultId.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.findByResultId();
    expect(mockIpService.findByResultId).toHaveBeenCalledWith(4);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result capacity sharing ip found',
      status: HttpStatus.OK,
      data,
    });
  });

  it('update', async () => {
    const dto = {} as any;
    mockIpService.update.mockResolvedValue(undefined);
    mockFormat.mockReturnValue({});
    await controller.update(dto);
    expect(mockIpService.update).toHaveBeenCalledWith(4, dto);
  });
});
