import { Test, TestingModule } from '@nestjs/testing';
import { ResultKeywordsService } from './result-keywords.service';

describe('ResultKeywordsService', () => {
  let service: ResultKeywordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultKeywordsService],
    }).compile();

    service = module.get<ResultKeywordsService>(ResultKeywordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
