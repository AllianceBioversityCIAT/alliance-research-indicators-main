import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaGeoScope } from './entities/clarisa-geo-scope.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
@Injectable()
export class ClarisaGeoScopeService extends ControlListBaseService<
  ClarisaGeoScope,
  Repository<ClarisaGeoScope>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ClarisaGeoScope,
      dataSource.getRepository(ClarisaGeoScope),
      currentUser,
    );
  }
}
