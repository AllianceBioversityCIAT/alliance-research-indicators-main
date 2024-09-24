import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaCountriesController } from './clarisa-countries.controller';
import { ClarisaCountriesService } from './clarisa-countries.service';

describe('ClarisaCountriesController', () => {
  let controller: ClarisaCountriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaCountriesController],
      providers: [ClarisaCountriesService],
    }).compile();

    controller = module.get<ClarisaCountriesController>(
      ClarisaCountriesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
