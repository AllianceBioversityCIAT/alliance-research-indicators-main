import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  DataSource,
  FindOptionsWhere,
  Repository,
  UpdateQueryBuilder,
} from 'typeorm';
import { ResultContract } from '../entities/result-contract.entity';
import { UpdateResultContractWhereDto } from '../dto/update-result-contract-where.dto';
import { updateQueryBuilderWhere } from '../../../shared/utils/queries.util';

@Injectable()
export class ResultContractsRepository extends Repository<ResultContract> {
  constructor(private readonly dataSource: DataSource) {
    super(ResultContract, dataSource.createEntityManager());
  }

  async updateActiveStatus(where: UpdateResultContractWhereDto) {
    let update = this.createQueryBuilder()
      .update()
      .set({
        is_active: false,
      })
      .where('result_id = :resultId', { resultId: where?.result_id });

    updateQueryBuilderWhere<ResultContract>(
      update,
      { contract_role_id: where.contract_role_id },
      '{{ATTR}} = {{VALUES}}',
    );

    updateQueryBuilderWhere<ResultContract>(
      update,
      where.not_in,
      '{{ATTR}} NOT IN {{VALUES}}',
    );

    return update.execute();
  }
}
