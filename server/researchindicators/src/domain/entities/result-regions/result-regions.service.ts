import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultRegion } from './entities/result-region.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class ResultRegionsService extends BaseServiceSimple<
  ResultRegion,
  Repository<ResultRegion>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultRegion,
      dataSource.getRepository(ResultRegion),
      'result_id',
      currentUser,
    );
  }
}
