import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultOicrAudience } from './entities/result-oicr-audience.entity';

@Injectable()
export class ResultOicrAudiencesService extends BaseServiceSimple<
  ResultOicrAudience,
  Repository<ResultOicrAudience>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultOicrAudience,
      dataSource.getRepository(ResultOicrAudience),
      'result_id',
      currentUser,
    );
  }
}
