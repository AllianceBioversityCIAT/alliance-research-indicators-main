import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';

describe('IndicatorsController', () => {
  let controller: IndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndicatorsController],
      providers: [IndicatorsService],
    }).compile();

    controller = module.get<IndicatorsController>(IndicatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
