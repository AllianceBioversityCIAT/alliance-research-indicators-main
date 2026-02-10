import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { ResultStatusTransition } from './entities/result-status-transition.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultStatusTransitionsService extends ControlListBaseService<
  ResultStatusTransition,
  Repository<ResultStatusTransition>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ResultStatusTransition,
      dataSource.getRepository(ResultStatusTransition),
      currentUser,
    );
  }

  async findNextStatuses(fromStatusId: number) {
    return this.mainRepo.find({
      where: {
        from_status_id: fromStatusId,
        is_active: true,
      },
    });
  }
}
