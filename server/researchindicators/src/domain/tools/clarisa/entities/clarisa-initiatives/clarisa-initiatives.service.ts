import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInitiative } from './entities/clarisa-initiative.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

@Injectable()
export class ClarisaInitiativesService extends ControlListBaseService<
  ClarisaInitiative,
  Repository<ClarisaInitiative>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ClarisaInitiative,
      dataSource.getRepository(ClarisaInitiative),
      currentUser,
      'name',
    );
  }
}
