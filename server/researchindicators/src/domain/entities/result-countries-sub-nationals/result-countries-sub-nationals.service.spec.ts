import { Test, TestingModule } from '@nestjs/testing';
import { ResultCountriesSubNationalsService } from './result-countries-sub-nationals.service';

describe('ResultCountriesSubNationalsService', () => {
  let service: ResultCountriesSubNationalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultCountriesSubNationalsService],
    }).compile();

    service = module.get<ResultCountriesSubNationalsService>(ResultCountriesSubNationalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
