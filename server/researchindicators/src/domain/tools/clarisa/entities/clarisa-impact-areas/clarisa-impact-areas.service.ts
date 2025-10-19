import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaImpactArea } from './entities/clarisa-impact-area.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

@Injectable()
export class ClarisaImpactAreasService extends ControlListBaseService<
  ClarisaImpactArea,
  Repository<ClarisaImpactArea>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ClarisaImpactArea,
      dataSource.getRepository(ClarisaImpactArea),
      currentUser,
      'name',
    );
  }
}
