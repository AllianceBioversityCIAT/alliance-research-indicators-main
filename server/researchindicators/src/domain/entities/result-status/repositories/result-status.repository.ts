import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultStatus } from '../entities/result-status.entity';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { FindResultAmountStatusDto } from '../dto/find-result-amount-status.dto';

@Injectable()
export class ResultStatusRepository extends Repository<ResultStatus> {
  constructor(
    dataSource: DataSource,
    private currentUser: CurrentUserUtil,
  ) {
    super(ResultStatus, dataSource.createEntityManager());
  }

  async findAmountOfResultsByStatusCurrentUser() {
    const query = `
        SELECT
        	rs.result_status_id ,
        	rs.name,
        	rs.description,
        	COUNT(r.result_id) as amount_results
        FROM
        	result_status rs
        LEFT JOIN results r on
        	r.result_status_id = rs.result_status_id
        	AND r.created_by = ${this.currentUser.user_id}
        GROUP by
        	rs.result_status_id,
        	rs.name,
        	rs.description;
    `;

    return this.query(query) as Promise<FindResultAmountStatusDto[]>;
  }
}
