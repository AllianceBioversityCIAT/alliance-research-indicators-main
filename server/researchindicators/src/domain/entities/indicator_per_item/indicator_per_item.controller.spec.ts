import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorPerItemController } from './indicator_per_item.controller';
import { IndicatorPerItemService } from './indicator_per_item.service';

describe('IndicatorPerItemController', () => {
  let controller: IndicatorPerItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndicatorPerItemController],
      providers: [IndicatorPerItemService],
    }).compile();

    controller = module.get<IndicatorPerItemController>(
      IndicatorPerItemController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
