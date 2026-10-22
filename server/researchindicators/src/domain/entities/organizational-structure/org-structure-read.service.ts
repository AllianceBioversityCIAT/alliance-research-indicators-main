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
import { In } from 'typeorm';
import { OrgUnit } from './entities/org-unit.entity';
import {
  DelegateStaffRawRow,
  OrgUnitDelegateRepository,
} from './repositories/org-unit-delegate.repository';
import {
  ChangeLogRawRow,
  OrgUnitChangeLogRepository,
} from './repositories/org-unit-change-log.repository';
import { OrgStructureClock } from './org-structure.clock';
import { OrgUnitUsageRegistry } from './org-unit-usage.registry';
import {
  ORG_LEVEL_BY_ID,
  ORG_MAX_RESOLVE_IDS,
  ORG_MAX_YEARS_AHEAD,
  ORG_MIN_YEAR,
} from './org-structure.constants';
import {
  OrgAncestorNode,
  OrgChangeAction,
  OrgChangeLogRow,
  OrgLevelCode,
  OrgLinkedData,
  OrgResolveRow,
  OrgResolvedVersion,
  OrgStaffRef,
  OrgSuccessorNode,
  OrgUnitDetailResponse,
  OrgUnitHistoryResponse,
  OrgUnitStatus,
  OrgUnitVersionResponse,
  YearRange,
  YearViewRow,
} from './organizational-structure.types';

/**
 * Read side of the module (design.md 2.1, 5.7): year view, selectable years
 * and one entry with its versions. A SINGLETON by design (D-ORG-1 / P-5): it
 * injects repositories and the clock only, never `CurrentUserUtil`, so a
 * consumer module can inject it without being pulled into request scope. It
 * is also the surface other modules call in-process (T-04): `resolve`,
 * `ancestors`, `successors` and `assertExists` (design 4, "Exported in-process
 * API"). The usage registry it also reads (B8) has no constructor
 * dependencies, so the singleton property holds.
 */
@Injectable()
export class OrgStructureReadService {
  constructor(
    private readonly unitRepository: OrgUnitRepository,
    private readonly versionRepository: OrgUnitVersionRepository,
    private readonly delegateRepository: OrgUnitDelegateRepository,
    private readonly clock: OrgStructureClock,
    private readonly changeLogRepository: OrgUnitChangeLogRepository,
    private readonly usageRegistry: OrgUnitUsageRegistry,
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
    // Delegates of the version SHOWN for each row (D-ORG-24), not of the entry.
    const delegates = await this.delegatesByVersion(
      rows.map((row) => Number(row.version_id)),
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

  /** B5: the entry and all its versions (oldest first), each with its own delegates (D-ORG-24). */
  async getUnitDetail(id: number): Promise<OrgUnitDetailResponse> {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) {
      throw new NotFoundException(`Organizational unit ${id} not found`);
    }

    const versions = await this.versionRepository.findDetailedByUnit(id);
    const delegates = await this.delegatesByVersion(
      versions.map((row) => Number(row.id)),
    );

    return {
      id: Number(unit.id),
      code: unit.code,
      status: unit.status,
      statusFromYear: unit.status_from_year ?? null,
      successorId:
        unit.successor_id === null || unit.successor_id === undefined
          ? null
          : Number(unit.successor_id),
      versions: versions.map((row) => this.toVersionResponse(row, delegates)),
    };
  }

  /**
   * B6 (R-ORG-009, R-ORG-017 History half): the versions table (each with its
   * delegates, D-ORG-24), then the log newest first. 404 for an id that does not
   * exist, including a physically deleted one: its log is reachable through B7.
   */
  async getUnitHistory(id: number): Promise<OrgUnitHistoryResponse> {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) {
      throw new NotFoundException(`Organizational unit ${id} not found`);
    }
    const [versions, log] = await Promise.all([
      this.versionRepository.findDetailedByUnit(id),
      this.changeLogRepository.findRowsByUnit(id),
    ]);
    const delegates = await this.delegatesByVersion(
      versions.map((row) => Number(row.id)),
    );
    return {
      versions: versions.map((row) => this.toVersionResponse(row, delegates)),
      log: log.map((row) => this.toLogRow(row)),
    };
  }

  /** B7: the log of one entry, newest first. No existence check: it outlives a physical delete. */
  async getChangeLog(unitId: number): Promise<OrgChangeLogRow[]> {
    const rows = await this.changeLogRepository.findRowsByUnit(unitId);
    return rows.map((row) => this.toLogRow(row));
  }

  /**
   * C1 (R-ORG-010, D-ORG-18). One row per requested id, in request order
   * (duplicates collapsed). `year` defaults to the current year.
   * - A version covers the year: `version` set, status `active`.
   * - No version covers it (at or after the end, inside a D-ORG-17 gap, or
   *   before the first version): `version: null`; status is the entry's end
   *   status when the year is at or after `status_from_year`, otherwise
   *   `inactive` (the entry had no covered version that year).
   * An id that does not exist (never did, or physically deleted) returns
   * `{ id, missing: true }` in its place and the call still succeeds, so a
   * roll-up never loses the other ids (D-ORG-19). `assertExists`, C2 and C3
   * keep their 404.
   * Delegates are those of the covering version, i.e. of the requested year
   * (R-ORG-010 AC.3, D-ORG-24); `[]` when `version` is null.
   *
   * @akili-spec institutional-performance/organizational-structure
   */
  async resolve(ids: number[], year?: number): Promise<OrgResolveRow[]> {
    const unique = this.normalizeIds(ids);
    const resolveYear = year ?? this.clock.currentYear();
    this.assertYearInRange(resolveYear);

    const units = await this.loadUnits(unique);
    const rows = await this.versionRepository.findCoveringByUnits(
      unique,
      resolveYear,
    );
    const delegates = await this.delegatesByVersion(
      rows.map((row) => Number(row.id)),
    );
    const coveringByUnit = new Map(
      rows.map((row) => [Number(row.org_unit_id), row]),
    );

    return unique.map((id) => {
      const unit = units.get(id);
      if (!unit) return { id, missing: true as const };
      const covering = coveringByUnit.get(id);
      return {
        id,
        code: unit.code,
        year: resolveYear,
        status: covering
          ? 'active'
          : this.statusWithoutVersion(unit, resolveYear),
        statusFromYear: unit.status_from_year ?? null,
        successorId: this.toNullableNumber(unit.successor_id),
        version: covering ? this.toResolvedVersion(covering) : null,
        delegates: covering ? (delegates.get(Number(covering.id)) ?? []) : [],
      };
    });
  }

  /**
   * C2: the chain from the entry (first) up to its L1 root (last), as the
   * structure stood in `year`. 404 for an unknown entry; 400 naming `year` when
   * the entry itself has no version covering it.
   */
  async ancestors(id: number, year?: number): Promise<OrgAncestorNode[]> {
    const ancestorYear = year ?? this.clock.currentYear();
    this.assertYearInRange(ancestorYear);
    await this.loadUnitsOrFail([id]);

    const chain: OrgAncestorNode[] = [];
    const seen = new Set<number>();
    let current: number | null = id;
    while (current !== null && !seen.has(current)) {
      seen.add(current);
      const [row] = await this.versionRepository.findCoveringByUnits(
        [current],
        ancestorYear,
      );
      if (!row) {
        if (chain.length === 0) {
          throw new BadRequestException({
            message: {
              description: `Organizational unit ${id} has no version covering year ${ancestorYear}`,
              field: 'year',
            },
          });
        }
        break;
      }
      chain.push({
        id: Number(row.org_unit_id),
        code: row.unit_code,
        name: row.name,
        acronym: row.acronym ?? null,
        levelId: Number(row.level_value_id),
        levelCode: this.toLevelCode(row.level_value_id),
        levelName: row.level_name ?? null,
        parentId: this.toNullableNumber(row.parent_id),
      });
      current = this.toNullableNumber(row.parent_id);
    }
    return chain;
  }

  /** C3: the successors of an entry in order (first successor first), not including the entry itself. 404 for an unknown entry. */
  async successors(id: number): Promise<OrgSuccessorNode[]> {
    const start = (await this.loadUnitsOrFail([id])).get(id);
    const chain: OrgSuccessorNode[] = [];
    const seen = new Set<number>([id]);
    let nextId = this.toNullableNumber(start.successor_id);
    while (nextId !== null && !seen.has(nextId)) {
      seen.add(nextId);
      const next = await this.unitRepository.findOne({ where: { id: nextId } });
      if (!next) break;
      chain.push({
        id: Number(next.id),
        code: next.code,
        status: next.status,
        statusFromYear: next.status_from_year ?? null,
        successorId: this.toNullableNumber(next.successor_id),
      });
      nextId = this.toNullableNumber(next.successor_id);
    }
    return chain;
  }

  /**
   * Existence check for consumers to run before storing an entry id
   * (design 5.8). Throws 404 naming every missing id; an empty list passes.
   */
  async assertExists(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.loadUnitsOrFail([...new Set(ids)]);
  }

  /**
   * B8: child count plus the registered consumers' record counts (consumers
   * reporting 0 are left out). 404 for an unknown entry.
   */
  async getLinkedData(id: number): Promise<OrgLinkedData> {
    await this.loadUnitsOrFail([id]);
    const [childCount, consumers] = await Promise.all([
      this.versionRepository.countChildEntries(id, this.clock.currentYear()),
      this.usageRegistry.getBreakdown(id),
    ]);
    return { childCount, consumers };
  }

  /** Ids must be 1 to 200 distinct positive integers (C1: more than 200 is a 400 naming `ids`). */
  private normalizeIds(ids: number[]): number[] {
    const unique = [...new Set(ids ?? [])];
    const invalid = (description: string) =>
      new BadRequestException({ message: { description, field: 'ids' } });
    if (unique.length === 0) throw invalid('ids must name at least one entry');
    if (unique.length > ORG_MAX_RESOLVE_IDS) {
      throw invalid(`ids accepts at most ${ORG_MAX_RESOLVE_IDS} entries`);
    }
    if (unique.some((id) => !Number.isInteger(id) || id < 1)) {
      throw invalid('ids must be positive integers');
    }
    return unique;
  }

  private async loadUnits(ids: number[]): Promise<Map<number, OrgUnit>> {
    const found = await this.unitRepository.find({ where: { id: In(ids) } });
    return new Map(found.map((unit) => [Number(unit.id), unit]));
  }

  private async loadUnitsOrFail(ids: number[]): Promise<Map<number, OrgUnit>> {
    const byId = await this.loadUnits(ids);
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        missing.length === 1
          ? `Organizational unit ${missing[0]} not found`
          : `Organizational units ${missing.join(', ')} not found`,
      );
    }
    return byId;
  }

  private statusWithoutVersion(unit: OrgUnit, year: number): OrgUnitStatus {
    const endedBy = unit.status_from_year;
    if (unit.status !== 'active' && endedBy != null && endedBy <= year) {
      return unit.status;
    }
    return 'inactive';
  }

  private toNullableNumber(
    value: number | string | null | undefined,
  ): number | null {
    return value === null || value === undefined ? null : Number(value);
  }

  private toResolvedVersion(row: VersionDetailRawRow): OrgResolvedVersion {
    // C1 carries the delegates on the row, not inside `version`.
    const {
      id: _versionId,
      delegates: _delegates,
      ...fields
    } = this.toVersionResponse(row);
    return fields;
  }

  /** Delegates grouped by VERSION id (D-ORG-24), each list in insertion order. */
  private async delegatesByVersion(
    versionIds: number[],
  ): Promise<Map<number, OrgStaffRef[]>> {
    const rows =
      await this.delegateRepository.findStaffByVersionIds(versionIds);
    const byVersion = new Map<number, OrgStaffRef[]>();
    for (const row of rows) {
      const versionId = Number(row.org_unit_version_id);
      const list = byVersion.get(versionId) ?? [];
      list.push(this.toStaffRef(row));
      byVersion.set(versionId, list);
    }
    return byVersion;
  }

  private toYearViewRow(
    row: YearViewRawRow,
    delegates: Map<number, OrgStaffRef[]>,
  ): YearViewRow {
    return {
      id: Number(row.id),
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
      delegates: delegates.get(Number(row.version_id)) ?? [],
      scheduledFromYear:
        row.scheduled_from_year === null ||
        row.scheduled_from_year === undefined
          ? null
          : Number(row.scheduled_from_year),
    };
  }

  private toVersionResponse(
    row: VersionDetailRawRow,
    delegates: Map<number, OrgStaffRef[]> = new Map(),
  ): OrgUnitVersionResponse {
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
      delegates: delegates.get(Number(row.id)) ?? [],
    };
  }

  private toLogRow(row: ChangeLogRawRow): OrgChangeLogRow {
    const changes =
      typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes;
    const name = [row.user_first_name, row.user_last_name]
      .filter((part) => !!part && part.trim().length > 0)
      .map((part) => part.trim())
      .join(' ');
    return {
      id: Number(row.id),
      unitId: Number(row.org_unit_id),
      action: row.action as OrgChangeAction,
      appliesFromYear: row.applies_from_year ?? null,
      backdated: Number(row.backdated) === 1 || row.backdated === true,
      changes: changes ?? {},
      createdAt: new Date(row.created_at).toISOString(),
      createdBy: {
        id: row.created_by === null ? null : Number(row.created_by),
        name: name.length > 0 ? name : null,
        email: row.user_email ?? null,
      },
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
