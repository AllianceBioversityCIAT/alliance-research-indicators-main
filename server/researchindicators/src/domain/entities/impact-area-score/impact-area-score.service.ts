import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { ImpactAreaScore } from './entities/impact-area-score.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ImpactAreaScoreService extends ControlListBaseService<
  ImpactAreaScore,
  Repository<ImpactAreaScore>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ImpactAreaScore,
      dataSource.getRepository(ImpactAreaScore),
      currentUser,
      'name',
    );
  }
}
