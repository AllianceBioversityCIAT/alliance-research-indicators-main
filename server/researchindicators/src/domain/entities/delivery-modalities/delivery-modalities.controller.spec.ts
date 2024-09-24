import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryModalitiesController } from './delivery-modalities.controller';
import { DeliveryModalitiesService } from './delivery-modalities.service';

describe('DeliveryModalitiesController', () => {
  let controller: DeliveryModalitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryModalitiesController],
      providers: [DeliveryModalitiesService],
    }).compile();

    controller = module.get<DeliveryModalitiesController>(
      DeliveryModalitiesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
