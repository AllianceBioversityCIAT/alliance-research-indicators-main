import { DataSource, Repository } from 'typeorm';
import { ResultLever } from '../entities/result-lever.entity';
import { updateQueryBuilderWhere } from '../../../shared/utils/queries.util';
import { BasicWhere, ValueOrArray } from '../../../shared/global-dto/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ResultLeversRepository extends Repository<ResultLever> {
  constructor(private readonly dataSource: DataSource) {
    super(ResultLever, dataSource.createEntityManager());
  }

  async updateActiveStatus(where: ValueOrArray<ResultLever>) {
    let update = this.createQueryBuilder()
      .update()
      .set({
        is_active: false,
      })
      .where('1 = 1');

    updateQueryBuilderWhere<ResultLever>(update, {
      lever_id: { value: where.lever_id, not: false },
      result_id: { value: where.result_id, not: false },
      lever_role_id: { value: where.lever_role_id, not: false },
      result_lever_id: { value: where.result_lever_id, not: true },
    });

    return update.execute();
  }
}
