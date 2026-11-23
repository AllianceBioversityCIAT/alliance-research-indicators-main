import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrgUnitVersion } from '../entities/org-unit-version.entity';
import { yearCoverageSql } from '../org-version-timeline.util';

/** Raw row of the per-entry versions query (snake_case, driver types). */
export interface VersionDetailRawRow {
  id: number | string;
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
}

/** One covering version of the resolve query (C1/C2), with its entry. */
export interface CoveringVersionRawRow extends VersionDetailRawRow {
  org_unit_id: number | string;
  unit_code: string;
}

@Injectable()
export class OrgUnitVersionRepository extends Repository<OrgUnitVersion> {
  constructor(dataSource: DataSource) {
    super(OrgUnitVersion, dataSource.createEntityManager());
  }

  /**
   * All versions of one entry, oldest first, with the level code, the parent
   * (its version at THIS version's first year, which the parent always covers,
   * I-3) and the director resolved from staff (R-ORG-016).
   */
  async findDetailedByUnit(unitId: number): Promise<VersionDetailRawRow[]> {
    return this.query(
      `
      SELECT v.id, v.valid_from_year, v.valid_to_year, v.name, v.acronym,
             v.level_value_id, lv.code AS level_code, lv.value AS level_name,
             v.parent_id, pu.code AS parent_code, pv.name AS parent_name,
             v.director_carnet,
             d.first_name AS director_first_name,
             d.last_name AS director_last_name,
             d.email AS director_email,
             d.is_active AS director_is_active
        FROM org_unit_versions v
        LEFT JOIN control_list_values lv ON lv.id = v.level_value_id
        LEFT JOIN org_units pu ON pu.id = v.parent_id
        LEFT JOIN org_unit_versions pv
               ON pv.org_unit_id = v.parent_id
              AND ${yearCoverageSql('pv', 'v.valid_from_year')}
        LEFT JOIN alliance_user_staff d ON d.carnet = v.director_carnet
       WHERE v.org_unit_id = ?
       ORDER BY v.valid_from_year
      `,
      [unitId],
    );
  }

  /**
   * C1/C2 (design 4): for each given entry, the version covering `year`, if
   * any. The parent is the parent's version at `year` itself, which the parent
   * always covers (I-3). At most one row per entry (I-2). The coverage rule is
   * the shared SQL predicate, so a database run, not a mock, pins it (KZ-001).
   */
  async findCoveringByUnits(
    unitIds: number[],
    year: number,
  ): Promise<CoveringVersionRawRow[]> {
    if (unitIds.length === 0) return [];
    const placeholders = unitIds.map(() => '?').join(',');
    return this.query(
      `
      SELECT v.org_unit_id, u.code AS unit_code,
             v.id, v.valid_from_year, v.valid_to_year, v.name, v.acronym,
             v.level_value_id, lv.code AS level_code, lv.value AS level_name,
             v.parent_id, pu.code AS parent_code, pv.name AS parent_name,
             v.director_carnet,
             d.first_name AS director_first_name,
             d.last_name AS director_last_name,
             d.email AS director_email,
             d.is_active AS director_is_active
        FROM (SELECT ? AS y) p
        CROSS JOIN org_unit_versions v
        JOIN org_units u ON u.id = v.org_unit_id
        LEFT JOIN control_list_values lv ON lv.id = v.level_value_id
        LEFT JOIN org_units pu ON pu.id = v.parent_id
        LEFT JOIN org_unit_versions pv
               ON pv.org_unit_id = v.parent_id AND ${yearCoverageSql('pv', 'p.y')}
        LEFT JOIN alliance_user_staff d ON d.carnet = v.director_carnet
       WHERE v.org_unit_id IN (${placeholders})
         AND ${yearCoverageSql('v', 'p.y')}
       ORDER BY v.org_unit_id
      `,
      [year, ...unitIds],
    );
  }

  /** R-ORG-011 AC.1: number of VERSIONS (not entries) using each level value. */
  async countByLevelValueIds(
    valueIds: number[],
  ): Promise<
    Array<{ level_value_id: number | string; versions: number | string }>
  > {
    if (valueIds.length === 0) return [];
    const placeholders = valueIds.map(() => '?').join(',');
    return this.query(
      `SELECT level_value_id, COUNT(*) AS versions
         FROM org_unit_versions
        WHERE level_value_id IN (${placeholders})
        GROUP BY level_value_id`,
      valueIds,
    );
  }

  /** B8: distinct entries with a version under `unitId` that covers `fromYear` or later (design 5.3 children rule). */
  async countChildEntries(unitId: number, fromYear: number): Promise<number> {
    const rows = await this.query(
      `SELECT COUNT(DISTINCT org_unit_id) AS children
         FROM org_unit_versions
        WHERE parent_id = ? AND org_unit_id <> ?
          AND (valid_to_year IS NULL OR valid_to_year > ?)`,
      [unitId, unitId, fromYear],
    );
    return Number(rows[0]?.children ?? 0);
  }
}
