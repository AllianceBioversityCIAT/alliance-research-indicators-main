import { Test, TestingModule } from '@nestjs/testing';
import { TipIntegrationController } from './tip-integration.controller';
import { TipIntegrationService } from './tip-integration.service';
import { HttpStatus } from '@nestjs/common';
import { QueryIndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';

describe('TipIntegrationController', () => {
  let controller: TipIntegrationController;
  let service: jest.Mocked<TipIntegrationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipIntegrationController],
      providers: [
        // Mock the interceptor used with @UseInterceptors to avoid resolving its deps
        {
          provide: SetUpInterceptor,
          useValue: { intercept: jest.fn((_ctx, next) => next.handle()) },
        },
        // Provide ResultsUtil so that the interceptor's constructor can be resolved if needed
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn() },
        },
        {
          provide: TipIntegrationService,
          useValue: {
            getAllIprData: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TipIntegrationController>(TipIntegrationController);
    service = module.get(TipIntegrationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handleGetIprData should delegate to service', async () => {
    const mockData = [{ id: 1 }] as any;
    service.getAllIprData.mockResolvedValue(mockData);

    const res = await controller.handleGetIprData();
    expect(service.getAllIprData).toHaveBeenCalledWith();
    expect(res).toBe(mockData);
  });

  it('getIprDataRest should map product_type and format response', async () => {
    const mockData = [{ id: 1 }] as any;
    service.getAllIprData.mockResolvedValue(mockData);

    const res = await controller.getIprDataRest(
      2025 as any,
      QueryIndicatorsEnum.INNOVATION_DEV,
    );

    expect(service.getAllIprData).toHaveBeenCalledWith({
      year: 2025,
      productType: 2, // IndicatorsEnum.INNOVATION_DEV
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.description).toBe('IPR data found successfully');
    expect(res.data).toBe(mockData);
  });

  it('getIprDataRest should pass undefineds when no filters', async () => {
    const mockData = [] as any;
    service.getAllIprData.mockResolvedValue(mockData);

    const res = await controller.getIprDataRest(undefined as any, undefined);

    expect(service.getAllIprData).toHaveBeenCalledWith({
      year: undefined,
      productType: undefined,
    });
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.data).toEqual([]);
  });
});
