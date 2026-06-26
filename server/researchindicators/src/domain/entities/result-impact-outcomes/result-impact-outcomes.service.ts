import { Injectable } from '@nestjs/common';
import { CreateResultImpactOutcomeDto } from './dto/create-result-impact-outcome.dto';
import { UpdateResultImpactOutcomeDto } from './dto/update-result-impact-outcome.dto';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultImpactOutcome } from './entities/result-impact-outcome.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultImpactOutcomesService extends BaseServiceSimple<
  ResultImpactOutcome,
  Repository<ResultImpactOutcome>
> {

  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultImpactOutcome,
      dataSource.getRepository(ResultImpactOutcome),
      'result_id',
      currentUser,
      'role_id'
    );
  }
}
