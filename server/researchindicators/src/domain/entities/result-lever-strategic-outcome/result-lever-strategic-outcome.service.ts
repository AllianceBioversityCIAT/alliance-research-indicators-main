import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultLeverStrategicOutcome } from './entities/result-lever-strategic-outcome.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultLeverStrategicOutcomeService extends BaseServiceSimple<
  ResultLeverStrategicOutcome,
  Repository<ResultLeverStrategicOutcome>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultLeverStrategicOutcome,
      dataSource.getRepository(ResultLeverStrategicOutcome),
      'result_lever_id',
      currentUser,
    );
  }

  async findByMultiplesResultLeverIds(
    result_lever_ids: number[],
  ): Promise<ResultLeverStrategicOutcome[]> {
    return this.mainRepo.find({
      where: { result_lever_id: In(result_lever_ids), is_active: true },
    });
  }
}
