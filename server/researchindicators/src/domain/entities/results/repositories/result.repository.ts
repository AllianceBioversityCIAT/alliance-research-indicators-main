import { EntityManager, Repository } from 'typeorm';
import { Result } from '../entities/result.entity';
import { Injectable } from '@nestjs/common';
import { ElasticFindEntity } from '../../../tools/open-search/dto/elastic-find-entity.dto';
import { FindAllOptions } from '../../../shared/enum/find-all-options';
import { ResultOpensearchDto } from '../../../tools/open-search/results/dto/result.opensearch.dto';

@Injectable()
export class ResultRepository
  extends Repository<Result>
  implements ElasticFindEntity<ResultOpensearchDto>
{
  constructor(private readonly entityManager: EntityManager) {
    super(Result, entityManager);
  }

  findDataForOpenSearch(
    option: FindAllOptions,
    ids?: number[],
  ): Promise<ResultOpensearchDto[]> {
    const query: string = `
	select 
		r.result_id,
		r.result_official_code,
		r.version_id,
		r.title,
		r.description,
		r.indicator_id,
		r.geo_scope_id,
		r.report_year_id,
		r.result_status_id,
		JSON_OBJECT('result_status_id', rs.result_status_id,
					'name', rs.name,
					'description', rs.description) as result_status,
		JSON_OBJECT('indicator_id', i.indicator_id,
					'name', i.name,
					'other_names', i.other_names,
					'description', i.description,
					'long_description', i.long_description,
					'indicator_type_id', i.indicator_type_id,
					'icon_src', i.icon_src) as \`indicator\`,
		if(count(rk.keyword) = 0 , JSON_ARRAY(), JSON_ARRAYAGG(rk.keyword)) as keywords
		from results r
			inner join indicators i on r.indicator_id = i.indicator_id 
			inner join result_status rs on rs.result_status_id = r.result_status_id 
			left join result_keywords rk on rk.result_id = r.result_id 
		where 1 = 1
		${ids && ids.length > 0 ? `and r.result_id in (${ids.join(',')})` : ''}
		${option !== FindAllOptions.SHOW_ALL ? 'and r.is_active = 1' : ''}
		GROUP by r.result_id,
			r.result_official_code,
			r.version_id,
			r.title,
			r.description,
			r.indicator_id,
			r.geo_scope_id,
			r.report_year_id,
			r.result_status_id
	`;
    return this.query(query);
  }

  async findResults(pagination: ResultPaginationWhere): Promise<Result[]> {
    const where: Record<string, string> = {
      limit: '',
    };

    if (Object.keys(pagination).length === 2)
      where.limit = `LIMIT ${pagination.limit} OFFSET ${pagination.offset}`;

    const query: string = `
        SELECT
        	r.id as code,
        	r.description,
        	r.is_active,
        	r.last_updated_date,
        	r.gender_tag_level_id,
        	r.version_id,
        	r.result_type_id,
        	r.status as deprecate_status,
        	r.last_updated_by,
        	r.reported_year_id as year,
        	r.created_date,
        	r.result_level_id,
        	r.title,
        	r.legacy_id,
        	r.krs_url,
        	r.is_krs,
        	r.climate_change_tag_level_id,
        	r.no_applicable_partner,
        	r.has_regions,
        	r.has_countries,
        	r.geographic_scope_id,
        	r.lead_contact_person,
        	r.result_code,
        	r.status_id,
        	rs.status_name as status,
        	rs.status_description,
        	r.nutrition_tag_level_id,
        	r.environmental_biodiversity_tag_level_id,
        	r.poverty_tag_level_id,
        	r.is_discontinued,
        	r.is_replicated,
        	r.last_action_type,
        	r.justification_action_type,
        	r.in_qa,
        	CONCAT(u.last_name,' ',u.first_name) as result_owner,
        	CONCAT(u.last_name,' ',u.first_name) as created_by,
            concat('Lever ',ROUND((RAND() * (10-1))+1)) as lever,
            CONCAT(if(ROUND((RAND() * (2-1))+1)= 1, 'G','CPG'),ROUND((RAND() * (999-100))+100)) as project,
            rt.name as indicator
        FROM    
        	result r
        INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
        INNER JOIN users u ON u.id = r.created_by 
        INNER JOIN result_type rt ON rt.id = r.result_type_id
        WHERE r.is_active = TRUE
        ${where.limit};
    `;

    return this.entityManager.query(query, [
      pagination.limit,
      pagination.offset,
    ]);
  }
}

export interface ResultPaginationWhere {
  limit?: number;
  offset?: number;
}
