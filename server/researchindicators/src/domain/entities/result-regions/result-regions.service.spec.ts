import { Test, TestingModule } from '@nestjs/testing';
import { ResultRegionsService } from './result-regions.service';

describe('ResultRegionsService', () => {
  let service: ResultRegionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultRegionsService],
    }).compile();

    service = module.get<ResultRegionsService>(ResultRegionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
