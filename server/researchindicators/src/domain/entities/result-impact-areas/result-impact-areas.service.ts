import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultImpactArea } from './entities/result-impact-area.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultImpactAreasService extends BaseServiceSimple<
  ResultImpactArea,
  Repository<ResultImpactArea>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultImpactArea,
      dataSource.getRepository(ResultImpactArea),
      'result_id',
      currentUser,
    );
  }
}
