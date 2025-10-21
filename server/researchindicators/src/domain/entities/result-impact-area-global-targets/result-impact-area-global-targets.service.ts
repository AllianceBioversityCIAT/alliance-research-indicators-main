import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultImpactAreaGlobalTarget } from './entities/result-impact-area-global-target.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultImpactAreaGlobalTargetsService extends BaseServiceSimple<
  ResultImpactAreaGlobalTarget,
  Repository<ResultImpactAreaGlobalTarget>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultImpactAreaGlobalTarget,
      dataSource.getRepository(ResultImpactAreaGlobalTarget),
      'result_impact_area_id',
      currentUser,
    );
  }

  async findByResultImpactAreaIds(impactAreaIds: number[]) {
    return this.mainRepo.find({
      where: {
        result_impact_area_id: In(impactAreaIds),
        is_active: true,
      },
    });
  }
}
