import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaCountriesService } from './clarisa-countries.service';

describe('ClarisaCountriesService', () => {
  let service: ClarisaCountriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaCountriesService],
    }).compile();

    service = module.get<ClarisaCountriesService>(ClarisaCountriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
