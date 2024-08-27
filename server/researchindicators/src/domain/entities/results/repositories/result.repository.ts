import { DataSource } from 'typeorm';
import { Result } from '../entities/result.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ResultRepository {
  constructor(private dataSource: DataSource) {}

  async findResults(pagination: ResultPaginationWhere) {
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

    return this.dataSource.query(query, [
      pagination.limit,
      pagination.offset,
    ]) as Promise<Result[]>;
  }
}

export interface ResultPaginationWhere {
  limit?: number;
  offset?: number;
}
