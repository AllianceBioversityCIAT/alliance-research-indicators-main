import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultLeverStrategicOutcome } from './entities/result-lever-strategic-outcome.entity';
import { DataSource, DeepPartial, EntityManager, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultLever } from '../result-levers/entities/result-lever.entity';

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

  public async create<Enum extends string | number>(
    resultId: number,
    dataToSave: Partial<ResultLever> | Partial<ResultLever>[],
    generalCompareKey: keyof ResultLeverStrategicOutcome,
    dataRole?: Enum,
    manager?: EntityManager,
    otherAttributes?: (keyof ResultLeverStrategicOutcome)[],
    deleteOthersAttributes?: {
      [K in keyof ResultLeverStrategicOutcome]?: ResultLeverStrategicOutcome[K];
    },
    notDeleteIds?: number[],
  ): Promise<
    (DeepPartial<ResultLeverStrategicOutcome> & ResultLeverStrategicOutcome)[]
  > {
    const tempDataToSave = Array.isArray(dataToSave)
      ? dataToSave
      : [dataToSave];
    const response: (DeepPartial<ResultLeverStrategicOutcome> &
      ResultLeverStrategicOutcome)[] = [];

    for (const item of tempDataToSave) {
      const created = await super.create(
        resultId,
        item.result_lever_strategic_outcomes,
        generalCompareKey,
        dataRole,
        manager,
        otherAttributes,
        deleteOthersAttributes,
        notDeleteIds,
      );
      response.push(...(Array.isArray(created) ? created : [created]));
    }
    return response;
  }
}
