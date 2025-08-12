import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorPerItemService } from './indicator_per_item.service';

describe('IndicatorPerItemService', () => {
  let service: IndicatorPerItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IndicatorPerItemService],
    }).compile();

    service = module.get<IndicatorPerItemService>(IndicatorPerItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
