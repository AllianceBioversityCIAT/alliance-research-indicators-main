import { Test, TestingModule } from '@nestjs/testing';
import { ResultImpactOutcomesService } from './result-impact-outcomes.service';

describe('ResultImpactOutcomesService', () => {
  let service: ResultImpactOutcomesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultImpactOutcomesService],
    }).compile();

    service = module.get<ResultImpactOutcomesService>(ResultImpactOutcomesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
