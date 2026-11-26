import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultOicrThematicKeyword } from './entities/result-oicr-thematic-keyword.entity';

@Injectable()
export class ResultOicrThematicKeywordsService extends BaseServiceSimple<
  ResultOicrThematicKeyword,
  Repository<ResultOicrThematicKeyword>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultOicrThematicKeyword,
      dataSource.getRepository(ResultOicrThematicKeyword),
      'result_id',
      currentUser,
    );
  }
}
