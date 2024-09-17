import { Test, TestingModule } from '@nestjs/testing';
import { ResultCountriesService } from './result-countries.service';

describe('ResultCountriesService', () => {
  let service: ResultCountriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultCountriesService],
    }).compile();

    service = module.get<ResultCountriesService>(ResultCountriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
