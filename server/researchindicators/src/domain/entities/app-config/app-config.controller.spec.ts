import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { RolesGuard } from '../../shared/guards/roles.guard';

jest.mock('../../shared/utils/response.utils');

describe('AppConfigController', () => {
  let controller: AppConfigController;
  const mockService = {
    findConfigByKey: jest.fn(),
    getAllConfigs: jest.fn(),
    updateConfig: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppConfigController],
      providers: [{ provide: AppConfigService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AppConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllConfigs', async () => {
    const payload = {
      data: [{ key: 'a' }],
      pagination: {
        total: 1,
        page: 2,
        limit: 10,
        pageSize: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    };
    mockService.getAllConfigs.mockResolvedValue(payload);
    mockFormat.mockReturnValue({});

    await controller.getAllConfigs(
      'email',
      'EMAIL',
      'READINESS_LEVEL_7',
      '2',
      '10',
      'key' as any,
      'DESC',
    );

    expect(mockService.getAllConfigs).toHaveBeenCalledWith(
      { category: 'EMAIL', subcategory: 'READINESS_LEVEL_7' },
      { field: 'key', order: 'DESC' },
      { page: 2, limit: 10 },
      'email',
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: payload,
      description: 'Configurations retrieved successfully',
      status: HttpStatus.OK,
    });
  });

  it('getAllConfigs without limit ignores page query param', async () => {
    mockService.getAllConfigs.mockResolvedValue({ data: [], pagination: {} });
    mockFormat.mockReturnValue({});

    await controller.getAllConfigs(
      undefined,
      undefined,
      undefined,
      '3',
      undefined,
      'key' as any,
      'ASC',
    );

    expect(mockService.getAllConfigs).toHaveBeenCalledWith(
      { category: undefined, subcategory: undefined },
      { field: 'key', order: 'ASC' },
      undefined,
      undefined,
    );
  });

  it('getConfigByKey', async () => {
    const cfg = { key: 'k' };
    mockService.findConfigByKey.mockResolvedValue(cfg);
    mockFormat.mockReturnValue({});
    await controller.getConfigByKey('k');
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: cfg,
      description: 'Configuration retrieved successfully',
      status: HttpStatus.OK,
    });
  });

  it('updateConfig', async () => {
    const updated = { key: 'x' };
    mockService.updateConfig.mockResolvedValue(updated);
    mockFormat.mockReturnValue({});
    await controller.updateConfig('x', { value: '1' } as any);
    expect(mockService.updateConfig).toHaveBeenCalledWith('x', { value: '1' });
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: updated,
      description: 'Configuration updated successfully',
      status: HttpStatus.OK,
    });
  });
});
