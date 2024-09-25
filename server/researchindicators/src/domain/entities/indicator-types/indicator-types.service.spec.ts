import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorTypesService } from './indicator-types.service';

describe('IndicatorTypesService', () => {
  let service: IndicatorTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IndicatorTypesService],
    }).compile();

    service = module.get<IndicatorTypesService>(IndicatorTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
