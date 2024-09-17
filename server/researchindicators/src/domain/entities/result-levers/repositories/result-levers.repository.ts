import { DataSource, Repository } from 'typeorm';
import { ResultLever } from '../entities/result-lever.entity';
import { updateQueryBuilderWhere } from '../../../shared/utils/queries.util';
import { BasicWhere } from '../../../shared/global-dto/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ResultLeversRepository extends Repository<ResultLever> {
  constructor(private readonly dataSource: DataSource) {
    super(ResultLever, dataSource.createEntityManager());
  }

  async updateActiveStatus<T>(where: BasicWhere<T>) {
    let update = this.createQueryBuilder()
      .update()
      .set({
        is_active: false,
      })
      .where('1 = 1');

    updateQueryBuilderWhere<ResultLever>(
      update,
      where.in,
      '{{ATTR}} = {{VALUES}}',
    );

    updateQueryBuilderWhere<ResultLever>(
      update,
      where.not_in,
      '{{ATTR}} NOT IN {{VALUES}}',
    );

    return update.execute();
  }
}
