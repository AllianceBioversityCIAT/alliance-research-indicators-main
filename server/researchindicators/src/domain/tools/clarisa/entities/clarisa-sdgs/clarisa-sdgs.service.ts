import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaSdg } from './entities/clarisa-sdg.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

@Injectable()
export class ClarisaSdgsService extends ControlListBaseService<
  ClarisaSdg,
  Repository<ClarisaSdg>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(ClarisaSdg, dataSource.getRepository(ClarisaSdg), currentUser);
  }
}
