import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultInitiative } from './entities/result-initiative.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultInitiativesService extends BaseServiceSimple<
  ResultInitiative,
  Repository<ResultInitiative>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultInitiative,
      dataSource.getRepository(ResultInitiative),
      'result_id',
      currentUser,
    );
  }
}
