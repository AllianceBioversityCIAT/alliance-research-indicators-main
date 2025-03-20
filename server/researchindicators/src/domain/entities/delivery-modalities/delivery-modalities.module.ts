import { Module } from '@nestjs/common';
import { DeliveryModalitiesService } from './delivery-modalities.service';
import { DeliveryModalitiesController } from './delivery-modalities.controller';

@Module({
  controllers: [DeliveryModalitiesController],
  providers: [DeliveryModalitiesService],
})
export class DeliveryModalitiesModule {}
