import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInnovationType } from './entities/clarisa-innovation-type.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
@Injectable()
export class ClarisaInnovationTypesService extends ControlListBaseService<
  ClarisaInnovationType,
  Repository<ClarisaInnovationType>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ClarisaInnovationType,
      dataSource.getRepository(ClarisaInnovationType),
      currentUser,
      'name',
    );
  }
}
