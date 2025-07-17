import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultSdg } from './entities/result-sdg.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultSdgsService extends BaseServiceSimple<
  ResultSdg,
  Repository<ResultSdg>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultSdg,
      dataSource.getRepository(ResultSdg),
      'result_id',
      currentUser,
    );
  }
}
