import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { DeliveryModality } from './entities/delivery-modality.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class DeliveryModalitiesService extends ControlListBaseService<
  DeliveryModality,
  Repository<DeliveryModality>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      DeliveryModality,
      dataSource.getRepository(DeliveryModality),
      currentUser,
    );
  }
}
