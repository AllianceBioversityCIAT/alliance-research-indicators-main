import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Indicator } from '../entities/indicator.entity';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { FindResultAmountDto } from '../dto/find-result-amount.dto';

@Injectable()
export class IndicatorRepository extends Repository<Indicator> {
  constructor(
    dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
  ) {
    super(Indicator, dataSource.createEntityManager());
  }

  async findAmountResultsByIndicatorCurrentUser() {
    const query = `
            SELECT
        	i.indicator_id,
        	i.name,
        	i.indicator_type_id,
        	i.description,
        	i.long_description,
        	i.icon_src,
        	i.other_names,
        	COUNT(r.result_id) as amount_results
        FROM
        	indicators i
        LEFT JOIN results r on
        	r.indicator_id = i.indicator_id
        	AND r.is_active = 1
			AND r.is_snapshot = 0
        	AND r.created_by = ${this.currentUser.user_id}
        WHERE
        	i.is_active = TRUE
        GROUP BY
        	i.indicator_id,
        	i.name,
        	i.indicator_type_id,
        	i.description,
        	i.long_description,
        	i.icon_src,
        	i.other_names
		ORDER BY i.position ASC;`;

    return this.query(query) as Promise<FindResultAmountDto[]>;
  }

  async findIndicatorByAmmountResults() {
    const query = `
	SELECT
		i.indicator_id,
		i.name,
		i.indicator_type_id,
		i.description,
		i.long_description,
		i.icon_src,
		i.other_names
	FROM
		indicators i
		INNER JOIN results r on r.indicator_id = i.indicator_id
		  						AND r.is_active = 1
	WHERE
		i.is_active = TRUE
	GROUP BY
		i.indicator_id,
		i.name,
		i.indicator_type_id,
		i.description,
		i.long_description,
		i.icon_src,
		i.other_names
	ORDER BY i.position ASC;
	`;
    return this.query(query) as Promise<Indicator[]>;
  }
}
