import { Test, TestingModule } from '@nestjs/testing';
import { ResultCountriesSubNationalsController } from './result-countries-sub-nationals.controller';
import { ResultCountriesSubNationalsService } from './result-countries-sub-nationals.service';

describe('ResultCountriesSubNationalsController', () => {
  let controller: ResultCountriesSubNationalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultCountriesSubNationalsController],
      providers: [
        {
          provide: ResultCountriesSubNationalsService,
          useValue: {},
        },
      ],
    }).compile();
    controller = module.get(ResultCountriesSubNationalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
