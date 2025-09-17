import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultInnovationToolFunction } from './entities/result-innovation-tool-function.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultInnovationToolFunctionService extends BaseServiceSimple<
  ResultInnovationToolFunction,
  Repository<ResultInnovationToolFunction>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultInnovationToolFunction,
      dataSource.getRepository(ResultInnovationToolFunction),
      'result_id',
      currentUser,
      null,
    );
  }
}
