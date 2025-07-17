import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInnovationCharacteristic } from './entities/clarisa-innovation-characteristic.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
@Injectable()
export class ClarisaInnovationCharacteristicsService extends ControlListBaseService<
  ClarisaInnovationCharacteristic,
  Repository<ClarisaInnovationCharacteristic>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ClarisaInnovationCharacteristic,
      dataSource.getRepository(ClarisaInnovationCharacteristic),
      currentUser,
      'name',
    );
  }
}
