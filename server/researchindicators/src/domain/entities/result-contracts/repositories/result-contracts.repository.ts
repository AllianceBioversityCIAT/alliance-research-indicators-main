import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultContract } from '../entities/result-contract.entity';
import { updateQueryBuilderWhere } from '../../../shared/utils/queries.util';
import { ValueOrArray } from '../../../shared/global-dto/types';
import { FindResultsContractDto } from '../dto/find-results-contract.dto';
import { AppConfig } from '../../../shared/utils/app-config.util';

@Injectable()
export class ResultContractsRepository extends Repository<ResultContract> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appConfig: AppConfig,
  ) {
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

  async findAllResultsByContractId(contract_id: string) {
    const query = `
      select
    	r.*,
    	JSON_OBJECT(
            'indicator_id', i.indicator_id,
            'name', i.name,
            'description', i.description,
            'indicator_type_id', i.indicator_type_id,
            'long_description', i.long_description,
            'icon_src', i.icon_src,
            'other_names', i.other_names,
            'is_active', i.is_active
          ) as \`indicator\`,
    	JSON_OBJECT(
                  'result_status_id', rs.result_status_id,
                  'name', rs.name,
                  'description', rs.description,
                  'is_active', rs.is_active
                ) as \`result_status\`,
    	JSON_OBJECT(
                  'first_name', su.first_name,
                  'last_name', su.last_name,
                  'user_id', su.sec_user_id,
                  'is_active', su.is_active
                ) as \`created_user\`
    from
    	results r
    inner join result_contracts rc on
    	rc.result_id = r.result_id
    inner join agresso_contracts ac on
    	ac.agreement_id = rc.contract_id
    inner join indicators i on
    	i.indicator_id = r.indicator_id
    inner join result_status rs on
    	rs.result_status_id = r.result_status_id
    inner join ${this.appConfig.ARI_SECONDARY_MYSQL_NAME}.sec_users su on
    	su.sec_user_id = r.created_by
    where
    	r.is_active = TRUE
      and r.is_snapshot = FALSE
    	and rc.is_active = TRUE
    	and ac.agreement_id = ?`;

    return this.query(query, [contract_id]) as Promise<
      FindResultsContractDto[]
    >;
  }

  async findContractsLeverByResultId(result_id: number): Promise<number> {
    const query = `select cl.id 
      from result_contracts rc 
      inner join agresso_contracts ac on ac.agreement_id = rc.contract_id 
      left join clarisa_levers cl on cl.short_name = REPLACE(ac.departmentId, 'L', 'Lever ')
      where rc.result_id = ?
        and rc.is_active = true
        and rc.is_primary = true;`;

    return this.query(query, [result_id]).then((response: { id: number }[]) =>
      response?.length ? response[0].id : null,
    );
  }

  async getPrimaryContractByResultIds(
    resultIds: number[],
  ): Promise<ResultContract[]> {
    const query = `SELECT 
      rc.contract_id,
      rc.result_id,
      rc.is_active,
      rc.is_primary,
      ac.*
    FROM result_contracts rc 
      JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
    WHERE rc.is_primary = TRUE
      AND rc.is_active = TRUE
      AND rc.result_id IN (?);`;
    const results = await this.query(query, [resultIds]);
    const response: ResultContract[] = [];

    results.forEach((res: any) => {
      const resultContract = new ResultContract();
      resultContract.contract_id = res.contract_id;
      resultContract.result_id = res.result_id;
      resultContract.is_active = res.is_active;
      resultContract.is_primary = res.is_primary;
      delete res.contract_id;
      delete res.result_id;
      delete res.is_active;
      delete res.is_primary;
      resultContract.agresso_contract = res;
      response.push(resultContract);
    });
    return response;
  }
}
