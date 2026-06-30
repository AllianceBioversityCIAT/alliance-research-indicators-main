import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultStrategicObjective } from './entities/result-strategic-objective.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ResultStrategicObjectivesService extends BaseServiceSimple<
  ResultStrategicObjective,
  Repository<ResultStrategicObjective>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultStrategicObjective,
      dataSource.getRepository(ResultStrategicObjective),
      'result_id',
      currentUser,
      'role_id',
    );
  }
}
