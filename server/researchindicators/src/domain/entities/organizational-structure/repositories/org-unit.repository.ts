import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrgUnit } from '../entities/org-unit.entity';
import { yearCoverageSql } from '../org-version-timeline.util';

/** Raw row of the year-view query (snake_case, driver types). */
export interface YearViewRawRow {
  id: number | string;
  code: string;
  status: 'active' | 'inactive' | 'deleted';
  status_from_year: number | null;
  valid_from_year: number;
  valid_to_year: number | null;
  name: string;
  acronym: string | null;
  level_value_id: number | string;
  level_code: string | null;
  level_name: string | null;
  parent_id: number | string | null;
  parent_code: string | null;
  parent_name: string | null;
  director_carnet: string | null;
  director_first_name: string | null;
  director_last_name: string | null;
  director_email: string | null;
  director_is_active: number | null;
  scheduled_from_year: number | null;
}

@Injectable()
export class OrgUnitRepository extends Repository<OrgUnit> {
  constructor(dataSource: DataSource) {
    super(OrgUnit, dataSource.createEntityManager());
  }

  /**
   * B1 (design 5.7): one query. A version is selected when it covers the
   * viewed year; with `includeEnded`, an entry ended in a year at or before the
   * viewed one is also selected through its LAST version (the one that ends
   * exactly at `status_from_year`). The parent is the parent's version at the
   * last year the child version covers within the view
   * (`LEAST(year, to - 1)`), which the parent always covers (I-3).
   * `scheduled_from_year` is the smallest later version start per entry.
   */
  async findYearViewRows(
    year: number,
    includeEnded: boolean,
  ): Promise<YearViewRawRow[]> {
    const refYear = 'LEAST(p.y, COALESCE(v.valid_to_year - 1, p.y))';
    const endedClause = includeEnded
      ? `OR (u.status <> 'active' AND u.status_from_year IS NOT NULL
            AND u.status_from_year <= p.y AND v.valid_to_year = u.status_from_year)`
      : '';
    const sql = `
      SELECT u.id, u.code, u.status, u.status_from_year,
             v.valid_from_year, v.valid_to_year, v.name, v.acronym,
             v.level_value_id, lv.code AS level_code, lv.value AS level_name,
             v.parent_id, pu.code AS parent_code, pv.name AS parent_name,
             v.director_carnet,
             d.first_name AS director_first_name,
             d.last_name AS director_last_name,
             d.email AS director_email,
             d.is_active AS director_is_active,
             (SELECT MIN(nv.valid_from_year)
                FROM org_unit_versions nv
               WHERE nv.org_unit_id = u.id AND nv.valid_from_year > p.y) AS scheduled_from_year
        FROM (SELECT ? AS y) p
        CROSS JOIN org_units u
        JOIN org_unit_versions v ON v.org_unit_id = u.id
        LEFT JOIN control_list_values lv ON lv.id = v.level_value_id
        LEFT JOIN org_units pu ON pu.id = v.parent_id
        LEFT JOIN org_unit_versions pv
               ON pv.org_unit_id = v.parent_id AND ${yearCoverageSql('pv', refYear)}
        LEFT JOIN alliance_user_staff d ON d.carnet = v.director_carnet
       WHERE (${yearCoverageSql('v', 'p.y')} ${endedClause})
       ORDER BY u.id
    `;
    return this.query(sql, [year]);
  }

  /** Earliest and latest version START year over all entries (B2). */
  async findVersionStartBounds(): Promise<{
    min_year: number | null;
    max_year: number | null;
  }> {
    const rows: Array<{ min_year: number | null; max_year: number | null }> =
      await this.query(
        `SELECT MIN(valid_from_year) AS min_year, MAX(valid_from_year) AS max_year FROM org_unit_versions`,
      );
    return rows[0] ?? { min_year: null, max_year: null };
  }
}
