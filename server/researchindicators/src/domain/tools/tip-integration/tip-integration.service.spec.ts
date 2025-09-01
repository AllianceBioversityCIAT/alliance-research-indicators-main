import { Test, TestingModule } from '@nestjs/testing';
import { TipIntegrationService } from './tip-integration.service';
import { ResultsService } from '../../entities/results/results.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import * as mapperModule from './mapper/tip-integration.mapper';

describe('TipIntegrationService', () => {
  let service: TipIntegrationService;
  let resultsService: jest.Mocked<ResultsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipIntegrationService,
        { provide: ResultsService, useValue: { findResultTIPData: jest.fn() } },
        {
          provide: AppConfig,
          useValue: { ARI_CLIENT_HOST: 'http://client.example' },
        },
      ],
    }).compile();

    service = module.get<TipIntegrationService>(TipIntegrationService);
    resultsService = module.get(ResultsService);

    jest
      .spyOn(mapperModule, 'tipIntegrationMapper')
      .mockImplementation((result: any) => ({ id: result.result_id }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should map results and pass options through', async () => {
    const raw = [{ result_id: 1 }, { result_id: 2 }] as any;
    resultsService.findResultTIPData.mockResolvedValue(raw);

    const options = { year: 2024, productType: 2 };
    const data = await service.getAllIprData(options);

    expect(resultsService.findResultTIPData).toHaveBeenCalledWith(options);
    expect(data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should work without options', async () => {
    resultsService.findResultTIPData.mockResolvedValue([] as any);
    const data = await service.getAllIprData();
    expect(resultsService.findResultTIPData).toHaveBeenCalledWith({
      year: undefined,
      productType: undefined,
    });
    expect(data).toEqual([]);
  });
});
