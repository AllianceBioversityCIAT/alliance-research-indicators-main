import { DataSource, Repository } from 'typeorm';
import { ReportYear } from '../entities/report-year.entity';
import { Injectable } from '@nestjs/common';
import { isEmpty } from '../../../shared/utils/object.utils';

@Injectable()
export class ReportYearRepository extends Repository<ReportYear> {
  constructor(dataSource: DataSource) {
    super(ReportYear, dataSource.createEntityManager());
  }

  async getAllReportYears(
    between: {
      from: number;
      to: number;
    },
    resultCode?: number,
  ): Promise<ReportYear[]> {
    const query = `SELECT 
                    ry.created_at,
                    ry.created_by,
                    ry.updated_at,
                    ry.updated_by,
                    ry.is_active,
                    ry.deleted_at,
                    ry.report_year
                    ${!isEmpty(resultCode) ? `,IF(r.result_id IS NULL, FALSE, TRUE) AS has_reported` : ''}
                    FROM report_years ry 
                    ${
                      !isEmpty(resultCode)
                        ? `LEFT JOIN results r ON r.report_year_id = ry.report_year 
                                            AND r.is_active = TRUE
                                            AND r.is_snapshot = TRUE
                                            AND r.result_official_code = ?`
                        : ''
                    }
                    WHERE ry.is_active = TRUE
                        AND ry.report_year BETWEEN ? AND ?
                    ORDER BY ry.report_year DESC`;
    const params = [between.from, between.to];
    if (!isEmpty(resultCode)) {
      params.unshift(resultCode);
    }
    return this.query(query, params);
  }
}
