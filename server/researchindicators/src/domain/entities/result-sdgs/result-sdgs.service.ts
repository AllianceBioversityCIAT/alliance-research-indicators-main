import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultSdg } from './entities/result-sdg.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { selectManager } from '../../shared/utils/orm.util';

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

  async saveSdgAi(
    resultId: number,
    sdgs: ResultSdg[],
    manager?: EntityManager,
  ) {
    const tempManager = selectManager(manager, ResultSdg, this.mainRepo);
    const existingSdgs = await tempManager.find({
      where: {
        result_id: resultId,
        is_active: true,
      },
    });

    const sdgsToInsert: Partial<ResultSdg>[] = [
      ...existingSdgs,
      ...(sdgs?.filter((el) => el.clarisa_sdg_id) ?? []),
    ];

    return this.create(
      resultId,
      sdgsToInsert,
      'clarisa_sdg_id',
      undefined,
      manager,
    );
  }
}
