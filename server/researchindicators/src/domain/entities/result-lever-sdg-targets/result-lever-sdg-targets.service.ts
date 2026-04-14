import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultLeverSdgTarget } from './entities/result-lever-sdg-target.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultLeverSdgTargetsService extends BaseServiceSimple<
  ResultLeverSdgTarget,
  Repository<ResultLeverSdgTarget>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultLeverSdgTarget,
      dataSource.getRepository(ResultLeverSdgTarget),
      'result_lever_id',
      currentUser,
    );
  }

  async findByMultiplesResultLeverIds(
    result_lever_ids: number[],
  ): Promise<ResultLeverSdgTarget[]> {
    return this.mainRepo.find({
      where: { result_lever_id: In(result_lever_ids), is_active: true },
    });
  }
}
