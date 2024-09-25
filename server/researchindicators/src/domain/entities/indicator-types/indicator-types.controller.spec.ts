import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorTypesController } from './indicator-types.controller';
import { IndicatorTypesService } from './indicator-types.service';

describe('IndicatorTypesController', () => {
  let controller: IndicatorTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndicatorTypesController],
      providers: [IndicatorTypesService],
    }).compile();

    controller = module.get<IndicatorTypesController>(IndicatorTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
