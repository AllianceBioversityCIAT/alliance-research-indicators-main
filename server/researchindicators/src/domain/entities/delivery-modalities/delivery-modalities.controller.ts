import { Controller } from '@nestjs/common';
import { DeliveryModalitiesService } from './delivery-modalities.service';
@Controller('delivery-modalities')
export class DeliveryModalitiesController {
  constructor(
    private readonly deliveryModalitiesService: DeliveryModalitiesService,
  ) {}
}
