import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { MaturityLevel } from './entities/maturity-level.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class MaturityLevelService extends ControlListBaseService<
  MaturityLevel,
  Repository<MaturityLevel>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      MaturityLevel,
      dataSource.getRepository(MaturityLevel),
      currentUser,
      'name',
    );
  }
}
