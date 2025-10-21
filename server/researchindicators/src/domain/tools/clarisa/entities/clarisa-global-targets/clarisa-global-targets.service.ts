import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaGlobalTarget } from './entities/clarisa-global-target.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

@Injectable()
export class ClarisaGlobalTargetsService extends ControlListBaseService<
  ClarisaGlobalTarget,
  Repository<ClarisaGlobalTarget>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ClarisaGlobalTarget,
      dataSource.getRepository(ClarisaGlobalTarget),
      currentUser,
    );
  }
}
