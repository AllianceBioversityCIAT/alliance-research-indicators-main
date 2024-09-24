import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultContract } from '../entities/result-contract.entity';
import { updateQueryBuilderWhere } from '../../../shared/utils/queries.util';
import { ValueOrArray } from '../../../shared/global-dto/types';

@Injectable()
export class ResultContractsRepository extends Repository<ResultContract> {
  constructor(private readonly dataSource: DataSource) {
    super(ResultContract, dataSource.createEntityManager());
  }

  async updateActiveStatus(where: ValueOrArray<ResultContract>) {
    const update = this.createQueryBuilder()
      .update()
      .set({
        is_active: false,
      })
      .where('result_id = :resultId', { resultId: where?.result_id });

    updateQueryBuilderWhere<ResultContract>(update, {
      contract_role_id: { value: where.contract_role_id, not: false },
      result_id: { value: where.result_id, not: false },
      result_contract_id: { value: where.result_contract_id, not: true },
    });

    return update.execute();
  }
}
