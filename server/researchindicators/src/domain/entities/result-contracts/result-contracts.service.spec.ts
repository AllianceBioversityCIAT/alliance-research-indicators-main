import { Test, TestingModule } from '@nestjs/testing';
import { ResultContractsService } from './result-contracts.service';

describe('ResultContractsService', () => {
  let service: ResultContractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultContractsService],
    }).compile();

    service = module.get<ResultContractsService>(ResultContractsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
