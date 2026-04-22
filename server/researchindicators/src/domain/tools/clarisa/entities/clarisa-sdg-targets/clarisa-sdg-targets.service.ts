import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaSdgTarget } from './entities/clarisa-sdg-target.entity';
import { AppConfig } from '../../../../shared/utils/app-config.util';

@Injectable()
export class ClarisaSdgTargetsService extends ControlListBaseService<
  ClarisaSdgTarget,
  Repository<ClarisaSdgTarget>
> {
  constructor(
    dataSource: DataSource,
    currentUser: CurrentUserUtil,
    private readonly appConfig: AppConfig,
  ) {
    super(
      ClarisaSdgTarget,
      dataSource.getRepository(ClarisaSdgTarget),
      currentUser,
      'sdg_target_code',
    );
  }
}
