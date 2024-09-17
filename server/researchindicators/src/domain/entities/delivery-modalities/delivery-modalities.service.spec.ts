import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryModalitiesService } from './delivery-modalities.service';

describe('DeliveryModalitiesService', () => {
  let service: DeliveryModalitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryModalitiesService],
    }).compile();

    service = module.get<DeliveryModalitiesService>(DeliveryModalitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
