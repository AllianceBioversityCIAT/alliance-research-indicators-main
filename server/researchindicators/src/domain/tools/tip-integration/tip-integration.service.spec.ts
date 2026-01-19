import { Test, TestingModule } from '@nestjs/testing';
import { TipIntegrationService } from './tip-integration.service';
import { ResultsService } from '../../entities/results/results.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { ResultRepository } from '../../entities/results/repositories/result.repository';
import { ClarisaLeversService } from '../clarisa/entities/clarisa-levers/clarisa-levers.service';
import { ClarisaRegionsService } from '../clarisa/entities/clarisa-regions/clarisa-regions.service';
import { ClarisaCountriesService } from '../clarisa/entities/clarisa-countries/clarisa-countries.service';
import { QueryService } from '../../shared/utils/query.service';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import * as mapperModule from './mapper/tip-integration.mapper';
import { TipIntegrationRepository } from './repository/tip-integration.repository';

describe('TipIntegrationService', () => {
  let service: TipIntegrationService;
  let resultsService: jest.Mocked<ResultsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipIntegrationService,
        { provide: ResultsService, useValue: { findResultTIPData: jest.fn() } },
        { provide: ResultRepository, useValue: {} },
        { provide: ClarisaLeversService, useValue: {} },
        { provide: ClarisaRegionsService, useValue: {} },
        { provide: ClarisaCountriesService, useValue: {} },
        { provide: QueryService, useValue: {} },
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: DataSource, useValue: {} },
        { provide: ResultKnowledgeProductService, useValue: {} },
        { provide: CurrentUserUtil, useValue: {} },
        {
          provide: AppConfig,
          useValue: {
            ARI_CLIENT_HOST: 'http://client.example',
            TIP_API_URL: 'http://tip.example',
            TIP_TOKEN: 'test-token',
          },
        },
        { provide: TipIntegrationRepository, useValue: {} },
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
