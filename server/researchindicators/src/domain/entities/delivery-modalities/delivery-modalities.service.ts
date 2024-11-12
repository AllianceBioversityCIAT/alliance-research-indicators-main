import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { DeliveryModality } from './entities/delivery-modality.entity';
@Injectable()
export class DeliveryModalitiesService extends ControlListBaseService<
  DeliveryModality,
  Repository<DeliveryModality>
> {
  constructor(dataSource: DataSource) {
    super(DeliveryModality, dataSource.getRepository(DeliveryModality));
  }
}
