import { Test, TestingModule } from '@nestjs/testing';
import { ResultCountriesController } from './result-countries.controller';
import { ResultCountriesService } from './result-countries.service';

describe('ResultCountriesController', () => {
  let controller: ResultCountriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultCountriesController],
      providers: [ResultCountriesService],
    }).compile();

    controller = module.get<ResultCountriesController>(
      ResultCountriesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
