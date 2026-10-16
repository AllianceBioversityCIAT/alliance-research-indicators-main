import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrgUnitRepository,
  YearViewRawRow,
} from './repositories/org-unit.repository';
import {
  OrgUnitVersionRepository,
  VersionDetailRawRow,
} from './repositories/org-unit-version.repository';
import {
  DelegateStaffRawRow,
  OrgUnitDelegateRepository,
} from './repositories/org-unit-delegate.repository';
import { OrgStructureClock } from './org-structure.clock';
import {
  ORG_LEVEL_BY_ID,
  ORG_MAX_YEARS_AHEAD,
  ORG_MIN_YEAR,
} from './org-structure.constants';
import {
  OrgLevelCode,
  OrgStaffRef,
  OrgUnitDetailResponse,
  OrgUnitVersionResponse,
  YearRange,
  YearViewRow,
} from './organizational-structure.types';

/**
 * Read side of the module (design.md 2.1, 5.7): year view, selectable years
 * and one entry with its versions. A SINGLETON by design (D-ORG-1 / P-5): it
 * injects repositories and the clock only, never `CurrentUserUtil`, so a
 * consumer module can inject it without being pulled into request scope. It
 * is also the surface other modules will call in-process (T-04).
 */
@Injectable()
export class OrgStructureReadService {
  constructor(
    private readonly unitRepository: OrgUnitRepository,
    private readonly versionRepository: OrgUnitVersionRepository,
    private readonly delegateRepository: OrgUnitDelegateRepository,
    private readonly clock: OrgStructureClock,
  ) {}

  /** Accepted years: 2000 to current + 10 (design 5.1); anything else is a 400 naming `year`. */
  assertYearInRange(year: number): void {
    const max = this.clock.currentYear() + ORG_MAX_YEARS_AHEAD;
    if (!Number.isInteger(year) || year < ORG_MIN_YEAR || year > max) {
      throw new BadRequestException({
        message: {
          description: `year must be between ${ORG_MIN_YEAR} and ${max}`,
          field: 'year',
        },
      });
    }
  }

  /** B1. `year` defaults to the current year. */
  async getYearView(
    year?: number,
    includeEnded = false,
  ): Promise<YearViewRow[]> {
    const viewYear = year ?? this.clock.currentYear();
    this.assertYearInRange(viewYear);

    const rows = await this.unitRepository.findYearViewRows(
      viewYear,
      includeEnded,
    );
    const delegates = await this.delegatesByUnit(
      rows.map((row) => Number(row.id)),
    );

    return rows.map((row) => this.toYearViewRow(row, delegates));
  }

  /**
   * B2 (R-ORG-006): from the earliest version start to the latest version
   * start, and always containing the current year, so the default selection is
   * selectable on an empty database and when every version starts later.
   */
  async getYearRange(): Promise<YearRange> {
    const current = this.clock.currentYear();
    const bounds = await this.unitRepository.findVersionStartBounds();
    const min = bounds.min_year === null ? current : Number(bounds.min_year);
    const max = bounds.max_year === null ? current : Number(bounds.max_year);
    return {
      min: Math.min(min, current),
      max: Math.max(max, current),
      current,
    };
  }

  /** B5: the entry, all its versions (oldest first) and its current delegates. */
  async getUnitDetail(id: number): Promise<OrgUnitDetailResponse> {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) {
      throw new NotFoundException(`Organizational unit ${id} not found`);
    }

    const [versions, delegates] = await Promise.all([
      this.versionRepository.findDetailedByUnit(id),
      this.delegatesByUnit([id]),
    ]);

    return {
      id: Number(unit.id),
      code: unit.code,
      status: unit.status,
      statusFromYear: unit.status_from_year ?? null,
      successorId:
        unit.successor_id === null || unit.successor_id === undefined
          ? null
          : Number(unit.successor_id),
      versions: versions.map((row) => this.toVersionResponse(row)),
      delegates: delegates.get(id) ?? [],
    };
  }

  private async delegatesByUnit(
    unitIds: number[],
  ): Promise<Map<number, OrgStaffRef[]>> {
    const rows = await this.delegateRepository.findStaffByUnitIds(unitIds);
    const byUnit = new Map<number, OrgStaffRef[]>();
    for (const row of rows) {
      const unitId = Number(row.org_unit_id);
      const list = byUnit.get(unitId) ?? [];
      list.push(this.toStaffRef(row));
      byUnit.set(unitId, list);
    }
    return byUnit;
  }

  private toYearViewRow(
    row: YearViewRawRow,
    delegates: Map<number, OrgStaffRef[]>,
  ): YearViewRow {
    const id = Number(row.id);
    return {
      id,
      code: row.code,
      status: row.status,
      statusFromYear: row.status_from_year ?? null,
      version: {
        from: Number(row.valid_from_year),
        to: row.valid_to_year === null ? null : Number(row.valid_to_year),
        name: row.name,
        acronym: row.acronym ?? null,
        levelId: Number(row.level_value_id),
        levelCode: this.toLevelCode(row.level_value_id),
        levelName: row.level_name ?? null,
        parentId: row.parent_id === null ? null : Number(row.parent_id),
        parentCode: row.parent_code ?? null,
        parentName: row.parent_name ?? null,
        director: this.toDirector(row),
      },
      delegates: delegates.get(id) ?? [],
      scheduledFromYear:
        row.scheduled_from_year === null ||
        row.scheduled_from_year === undefined
          ? null
          : Number(row.scheduled_from_year),
    };
  }

  private toVersionResponse(row: VersionDetailRawRow): OrgUnitVersionResponse {
    return {
      id: Number(row.id),
      from: Number(row.valid_from_year),
      to: row.valid_to_year === null ? null : Number(row.valid_to_year),
      name: row.name,
      acronym: row.acronym ?? null,
      levelId: Number(row.level_value_id),
      levelCode: this.toLevelCode(row.level_value_id),
      levelName: row.level_name ?? null,
      parentId: row.parent_id === null ? null : Number(row.parent_id),
      parentCode: row.parent_code ?? null,
      parentName: row.parent_name ?? null,
      director: this.toDirector(row),
    };
  }

  /**
   * Level label from the immutable seeded value id (D-ORG-4), NEVER from the
   * admin-editable `control_list_values.code`, which an admin can rename. An id
   * outside 20-23 cannot be saved through the write path; it reads as null.
   */
  private toLevelCode(levelValueId: number | string): OrgLevelCode | null {
    return (ORG_LEVEL_BY_ID[Number(levelValueId)] as OrgLevelCode) ?? null;
  }

  /** Director joined from staff; null when the version has none (R-ORG-016). */
  private toDirector(
    row: Pick<
      YearViewRawRow,
      | 'director_carnet'
      | 'director_first_name'
      | 'director_last_name'
      | 'director_email'
      | 'director_is_active'
    >,
  ): OrgStaffRef | null {
    if (row.director_carnet === null || row.director_carnet === undefined) {
      return null;
    }
    return this.toStaffRef({
      staff_carnet: row.director_carnet,
      first_name: row.director_first_name,
      last_name: row.director_last_name,
      email: row.director_email,
      is_active: row.director_is_active,
    });
  }

  /**
   * `isActiveStaff` = `alliance_user_staff.is_active` (the column the existing
   * staff search filters on, design P-10). T-02 settles the write-side rule
   * (P-14) and, if it picks another column, changes it here only.
   */
  private toStaffRef(
    row: Pick<
      DelegateStaffRawRow,
      'staff_carnet' | 'first_name' | 'last_name' | 'email' | 'is_active'
    >,
  ): OrgStaffRef {
    return {
      carnet: row.staff_carnet,
      name: [row.first_name, row.last_name]
        .filter((part) => !!part && part.trim().length > 0)
        .map((part) => part.trim())
        .join(' '),
      email: row.email ?? null,
      isActiveStaff: Number(row.is_active) === 1,
    };
  }
}
