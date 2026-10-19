import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ControlListValueLookupService } from '../control-lists/control-list-value-lookup.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { OrgStructureReadService } from './org-structure-read.service';
import { OrgStructureClock } from './org-structure.clock';
import {
  ORG_CODE_PREFIX,
  ORG_LEVEL_BY_ID,
  ORG_LEVEL_LIST_KEY,
  ORG_MAX_YEARS_AHEAD,
  ORG_MIN_YEAR,
} from './org-structure.constants';
import {
  describeChildLevelConflicts,
  findActiveChildren,
  findChildLevelConflicts,
  findHierarchyViolation,
} from './org-hierarchy.util';
import {
  applyChange,
  ApplyChangeResult,
  assertTimeline,
  changedVersions,
  endTimeline,
  findCovering,
  gapsOf,
  reopenTimeline,
  TimelineVersion,
  VersionChanges,
} from './org-version-timeline.util';
import { OrgUnitUsageRegistry } from './org-unit-usage.registry';
import { OrgStructureWriteRepository } from './repositories/org-structure-write.repository';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { InactivateOrgUnitDto } from './dto/inactivate-org-unit.dto';
import { ReactivateOrgUnitDto } from './dto/reactivate-org-unit.dto';
import { DeleteOrgUnitQueryDto } from './dto/delete-org-unit-query.dto';
import {
  OrgChangeAction,
  OrgDeleteResult,
  OrgSaveOutcome,
  OrgUnitDetailResponse,
  OrgUnitSaveResponse,
} from './organizational-structure.types';

const MYSQL_DUPLICATE_ENTRY_ERRNO = 1062;
const MAX_DELEGATES = 20;
const STAFF_SEARCH_LIMIT = 20;

const badRequest = (field: string, description: string) =>
  new BadRequestException({ message: { description, field } });
const conflict = (description: string, field?: string) =>
  new ConflictException({
    message: field ? { description, field } : { description },
  });

/** `ORG-` + (highest numeric suffix + 1), zero-padded to 3, over every code of the form ORG-<digits> (design 5.6). */
export const proposeNextCode = (codes: string[]): string => {
  const max = codes.reduce((highest, code) => {
    const match = /^ORG-(\d+)$/i.exec(code);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${ORG_CODE_PREFIX}${String(max + 1).padStart(3, '0')}`;
};

type ChangeSet = Record<string, { old: unknown; new: unknown }>;

/**
 * Write side of the module: the save engine (design 5.2, 5.3), the lifecycle
 * (5.4, 5.5: inactivate, reactivate, delete), code proposal (5.6) and staff
 * search (D-ORG-8). Request-scoped through `CurrentUserUtil`
 * (audit fields); everything a consumer injects lives in the singleton read
 * service. One transaction per write, with `SELECT ... FOR UPDATE` on the entry
 * and the log row written inside it (I-5), so a failure leaves neither.
 */
@Injectable()
export class OrgStructureService {
  private readonly logger = new LoggerUtil({ name: OrgStructureService.name });

  constructor(
    private readonly store: OrgStructureWriteRepository,
    private readonly readService: OrgStructureReadService,
    private readonly lookup: ControlListValueLookupService,
    private readonly clock: OrgStructureClock,
    private readonly currentUser: CurrentUserUtil,
    private readonly usageRegistry: OrgUnitUsageRegistry,
  ) {}

  /** B3. */
  async proposeCode(): Promise<{ code: string }> {
    return { code: proposeNextCode(await this.store.findProposableCodes()) };
  }

  /** B4: active staff only (P-14), parenthesized search, at most 20 rows. */
  async searchStaff(
    search: string,
  ): Promise<Array<{ carnet: string; name: string; email: string | null }>> {
    const rows = await this.store.searchActiveStaff(search, STAFF_SEARCH_LIMIT);
    return rows.map((row) => ({
      carnet: row.carnet,
      name: [row.first_name, row.last_name]
        .filter((part) => !!part && part.trim().length > 0)
        .map((part) => part.trim())
        .join(' '),
      email: row.email ?? null,
    }));
  }

  /** B9. */
  async create(dto: CreateOrgUnitDto): Promise<OrgUnitSaveResponse> {
    const current = this.clock.currentYear();
    const year = dto.appliesFromYear;
    const id = await this.guarded('create', async () => {
      this.assertAppliesFromYear(year);
      this.assertBackdate(year, dto.backdate, current);
      return this.inTransaction(async (manager) => {
        await this.assertLevel(dto.levelId);
        const director = await this.resolveDirector(
          manager,
          dto.directorCarnet,
        );
        const parentId = dto.parentId ?? null;
        await this.assertParentExists(manager, parentId);
        const delegates = await this.resolveDelegates(
          manager,
          dto.delegateCarnets ?? [],
          [],
        );

        const version: TimelineVersion = {
          from: year,
          to: null,
          name: dto.name,
          acronym: this.blankToNull(dto.acronym),
          levelId: dto.levelId,
          parentId,
          directorCarnet: director,
        };
        this.assertNoDirectorOverlap([version], delegates, [], current);
        await this.assertHierarchy(manager, 0, [version], year);

        const code = dto.code ?? (await this.nextCode(manager));
        if (dto.code) await this.assertCodeFree(manager, code);

        const userId = this.currentUser.user_id;
        const unitId = await this.store.insertUnit(manager, code, userId);
        await this.store.insertVersion(manager, unitId, version, userId);
        await this.store.addDelegates(manager, unitId, delegates, userId);

        const changes: ChangeSet = { code: { old: null, new: code } };
        for (const [field, value] of Object.entries({
          name: version.name,
          acronym: version.acronym,
          levelId: version.levelId,
          parentId: version.parentId,
          directorCarnet: version.directorCarnet,
        })) {
          if (value !== null) changes[field] = { old: null, new: value };
        }
        if (delegates.length > 0) {
          changes.delegates = { old: [], new: delegates };
        }
        await this.store.insertLog(manager, {
          unitId,
          action: 'create',
          appliesFromYear: year,
          backdated: year < current,
          changes,
          userId,
        });
        return unitId;
      });
    });
    this.logWrite('create', id, year, year < current);
    return {
      ...(await this.readService.getUnitDetail(id)),
      outcome: {
        action: 'create',
        appliesFromYear: year,
        backdated: year < current,
      },
    };
  }

  /** B10. */
  async update(
    id: number,
    dto: UpdateOrgUnitDto,
  ): Promise<OrgUnitSaveResponse> {
    const current = this.clock.currentYear();
    const touchesVersion = [
      dto.name,
      dto.acronym,
      dto.levelId,
      dto.parentId,
      dto.directorCarnet,
    ].some((value) => value !== undefined);
    const year = dto.appliesFromYear;

    const outcome = await this.guarded('update', async () => {
      if (touchesVersion) {
        if (year === undefined || year === null) {
          throw badRequest(
            'appliesFromYear',
            'appliesFromYear is required when name, acronym, level, parent or director change',
          );
        }
        this.assertAppliesFromYear(year);
        this.assertBackdate(year, dto.backdate, current);
      }
      return this.inTransaction((manager) =>
        this.updateInTransaction(manager, id, dto, touchesVersion, current),
      );
    });
    if (outcome.action) {
      this.logWrite(outcome.action, id, outcome.year, outcome.backdated);
    }
    const saveOutcome: OrgSaveOutcome = {
      action: outcome.action as OrgSaveOutcome['action'],
      appliesFromYear: outcome.year,
      backdated: outcome.backdated,
    };
    return {
      ...(await this.readService.getUnitDetail(id)),
      outcome: saveOutcome,
    };
  }

  private async updateInTransaction(
    manager: EntityManager,
    id: number,
    dto: UpdateOrgUnitDto,
    touchesVersion: boolean,
    current: number,
  ): Promise<{
    action: OrgChangeAction | null;
    year: number | null;
    backdated: boolean;
  }> {
    const unit = await this.lockLiveUnit(manager, id);

    const changes: ChangeSet = {};
    if (dto.code !== undefined && dto.code !== unit.code) {
      await this.assertCodeFree(manager, dto.code, id);
      changes.code = { old: unit.code, new: dto.code };
    }

    const versions = await this.store.loadVersions(manager, id);
    const year = dto.appliesFromYear;
    let result: ApplyChangeResult = { versions, kind: 'none', diff: {} };

    if (touchesVersion) {
      const ended = unit.status !== 'active';
      if (year < versions[0].from) {
        throw badRequest(
          'appliesFromYear',
          `appliesFromYear ${year} is before the first year of the entry (${versions[0].from})`,
        );
      }
      if (
        ended &&
        unit.status_from_year != null &&
        year >= unit.status_from_year
      ) {
        throw badRequest(
          'appliesFromYear',
          `The entry ended in ${unit.status_from_year}; appliesFromYear must be earlier`,
        );
      }

      if (!findCovering(versions, year)) {
        throw badRequest(
          'appliesFromYear',
          `The entry has no version in ${year} (it was inactive then); choose a year the entry covers`,
        );
      }

      const wanted: VersionChanges = {};
      if (dto.name !== undefined) wanted.name = dto.name;
      if (dto.acronym !== undefined)
        wanted.acronym = this.blankToNull(dto.acronym);
      if (dto.levelId !== undefined) {
        await this.assertLevel(dto.levelId);
        wanted.levelId = dto.levelId;
      }
      if (dto.parentId !== undefined) {
        await this.assertParentExists(manager, dto.parentId);
        wanted.parentId = dto.parentId;
      }
      if (dto.directorCarnet !== undefined) {
        wanted.directorCarnet = await this.resolveDirector(
          manager,
          dto.directorCarnet,
        );
      }

      result = applyChange(versions, year, wanted);
      if (result.kind !== 'none') {
        // A save never creates, fills or moves a gap (D-ORG-17): the result
        // has exactly the gaps the stored timeline had.
        assertTimeline(result.versions, { ended, gaps: gapsOf(versions) });
        if (result.diff.parentId || result.diff.levelId) {
          await this.assertHierarchy(
            manager,
            id,
            result.versions,
            year,
            !!result.diff.levelId,
          );
        }
        for (const [field, change] of Object.entries(result.diff)) {
          changes[field] = change;
        }
      }
    }

    const storedDelegates = await this.store.loadDelegateCarnets(manager, id);
    let delegateChange: { added: string[]; removed: string[] } | null = null;
    if (dto.delegateCarnets !== undefined || result.diff.directorCarnet) {
      const wanted =
        dto.delegateCarnets === undefined
          ? storedDelegates
          : await this.resolveDelegates(
              manager,
              dto.delegateCarnets,
              storedDelegates,
            );
      this.assertNoDirectorOverlap(
        result.versions,
        wanted,
        storedDelegates,
        current,
      );
      if (dto.delegateCarnets !== undefined) {
        const lower = (list: string[]) => list.map((c) => c.toLowerCase());
        const added = wanted.filter(
          (c) => !lower(storedDelegates).includes(c.toLowerCase()),
        );
        const removed = storedDelegates.filter(
          (c) => !lower(wanted).includes(c.toLowerCase()),
        );
        if (added.length > 0 || removed.length > 0) {
          delegateChange = { added, removed };
          changes.delegates = { old: storedDelegates, new: wanted };
        }
      }
    }

    if (Object.keys(changes).length === 0) {
      return { action: null, year: null, backdated: false };
    }

    const userId = this.currentUser.user_id;
    if (changes.code) {
      await this.store.updateUnitCode(
        manager,
        id,
        changes.code.new as string,
        userId,
      );
    }
    const { inserts, updates } = changedVersions(versions, result.versions);
    for (const version of updates) {
      await this.store.updateVersion(manager, version, userId);
    }
    for (const version of inserts) {
      await this.store.insertVersion(manager, id, version, userId);
    }
    if (delegateChange) {
      await this.store.removeDelegates(manager, id, delegateChange.removed);
      await this.store.addDelegates(manager, id, delegateChange.added, userId);
    }

    const versioned = result.kind !== 'none';
    let action: OrgChangeAction = 'delegates_change';
    if (result.kind !== 'none') action = result.kind;
    else if (changes.code) action = 'code_change';
    const backdated = versioned && year < current;
    await this.store.insertLog(manager, {
      unitId: id,
      action,
      appliesFromYear: versioned ? year : null,
      backdated,
      changes,
      userId,
    });
    return { action, year: versioned ? year : null, backdated };
  }

  // -------------------------------------------------------------------------
  // Lifecycle (design 5.4, 5.5): inactivate, reactivate, delete.
  // @akili-spec institutional-performance/organizational-structure
  // Same transaction, row lock and in-transaction log writer as the save
  // engine (I-5): a blocked or failed action leaves no version, no status
  // change and no log row.
  // -------------------------------------------------------------------------

  /** B11: ends the entry from a year, with an optional successor (R-ORG-007). */
  async inactivate(
    id: number,
    dto: InactivateOrgUnitDto,
  ): Promise<OrgUnitDetailResponse> {
    const current = this.clock.currentYear();
    const year = dto.fromYear;
    await this.guarded(
      'inactivate',
      async () => {
        this.assertAppliesFromYear(year, 'fromYear');
        this.assertBackdate(year, dto.backdate, current, 'fromYear');
        await this.inTransaction(async (manager) => {
          const unit = await this.lockLiveUnit(manager, id);
          if (unit.status === 'inactive') {
            throw conflict(
              `Organizational unit ${unit.code} is already inactive from ${unit.status_from_year}`,
            );
          }
          const versions = await this.store.loadVersions(manager, id);
          const ended = endTimeline(versions, year);
          if ('violation' in ended) {
            throw badRequest(
              ended.violation.field,
              ended.violation.description,
            );
          }
          const successorId = dto.successorId ?? null;
          if (successorId !== null) {
            await this.assertSuccessor(
              manager,
              id,
              successorId,
              year,
              ended.versions[ended.versions.length - 1].levelId,
            );
          }
          await this.assertNoActiveChildren(manager, unit, year, 'inactivate');
          assertTimeline(ended.versions, {
            ended: true,
            gaps: gapsOf(versions),
          });

          const userId = this.currentUser.user_id;
          const last = ended.versions[ended.versions.length - 1];
          const lastBefore = versions.find((v) => v.id === last.id);
          const { updates } = changedVersions(versions, ended.versions);
          for (const version of updates) {
            await this.store.updateVersion(manager, version, userId);
          }
          await this.store.deleteVersions(
            manager,
            id,
            ended.dropped.map((v) => v.id),
          );
          await this.store.updateUnitStatus(
            manager,
            id,
            { status: 'inactive', statusFromYear: year, successorId },
            userId,
          );

          const changes: ChangeSet = {
            status: { old: 'active', new: 'inactive' },
            statusFromYear: { old: null, new: year },
            lastVersionEnd: { old: lastBefore?.to ?? null, new: year },
          };
          if (successorId !== null) {
            changes.successorId = { old: null, new: successorId };
          }
          if (ended.dropped.length > 0) {
            changes.droppedVersions = {
              old: ended.dropped.map((v) => this.versionSummary(v)),
              new: null,
            };
          }
          await this.store.insertLog(manager, {
            unitId: id,
            action: 'inactivate',
            appliesFromYear: year,
            backdated: year < current,
            changes,
            userId,
          });
        });
      },
      id,
    );
    this.logWrite('inactivate', id, year, year < current);
    return this.readService.getUnitDetail(id);
  }

  /** B12: brings an inactive entry back from a year (R-ORG-007 AC.2). A deleted entry stays deleted (409). */
  async reactivate(
    id: number,
    dto: ReactivateOrgUnitDto,
  ): Promise<OrgUnitDetailResponse> {
    const current = this.clock.currentYear();
    const year = dto.fromYear;
    await this.guarded(
      'reactivate',
      async () => {
        this.assertAppliesFromYear(year, 'fromYear');
        this.assertBackdate(year, dto.backdate, current, 'fromYear');
        await this.inTransaction(async (manager) => {
          const unit = await this.lockLiveUnit(manager, id);
          if (unit.status === 'active') {
            throw conflict(
              `Organizational unit ${unit.code} is already active`,
            );
          }
          const versions = await this.store.loadVersions(manager, id);
          const endedFrom =
            unit.status_from_year ?? versions[versions.length - 1].to;
          const reopened = reopenTimeline(versions, year, endedFrom);
          if ('violation' in reopened) {
            throw badRequest(
              reopened.violation.field,
              reopened.violation.description,
            );
          }
          // Only a reactivation adds a gap: the one between the end year and `year`.
          const lastTo = versions[versions.length - 1].to;
          assertTimeline(reopened.versions, {
            ended: false,
            gaps: [
              ...gapsOf(versions),
              ...(lastTo !== null && year > lastTo
                ? [{ from: lastTo, to: year }]
                : []),
            ],
          });
          // I-3 / I-4: the copied parent must still be active from `year` on.
          await this.assertHierarchy(manager, id, reopened.versions, year);
          // I-6: the copied director must not have become one of the delegates.
          const delegates = await this.store.loadDelegateCarnets(manager, id);
          this.assertNoDirectorOverlap(
            reopened.versions,
            delegates,
            delegates,
            current,
          );

          const userId = this.currentUser.user_id;
          await this.store.insertVersion(manager, id, reopened.added, userId);
          await this.store.updateUnitStatus(
            manager,
            id,
            { status: 'active', statusFromYear: null, successorId: null },
            userId,
          );
          const changes: ChangeSet = {
            status: { old: unit.status, new: 'active' },
            statusFromYear: { old: endedFrom, new: null },
            newVersion: { old: null, new: this.versionSummary(reopened.added) },
          };
          if (unit.successor_id != null) {
            changes.successorId = {
              old: Number(unit.successor_id),
              new: null,
            };
          }
          await this.store.insertLog(manager, {
            unitId: id,
            action: 'reactivate',
            appliesFromYear: year,
            backdated: year < current,
            changes,
            userId,
          });
        });
      },
      id,
    );
    this.logWrite('reactivate', id, year, year < current);
    return this.readService.getUnitDetail(id);
  }

  /**
   * B13 (R-ORG-008, D-ORG-13). PHYSICAL when the entry's FIRST version starts in
   * the current year or later (it was never in a past year view), decided from
   * the first version and the clock, never from `status_from_year`. Anything
   * else is LOGICAL: the entry ends from a year and is marked `deleted`.
   * Blockers (children from the end year, linked records) come first and leave
   * everything untouched.
   */
  async remove(
    id: number,
    query: DeleteOrgUnitQueryDto,
  ): Promise<OrgDeleteResult> {
    const current = this.clock.currentYear();
    const result = await this.guarded(
      'delete',
      () =>
        this.inTransaction(async (manager) => {
          const unit = await this.lockLiveUnit(manager, id);
          const versions = await this.store.loadVersions(manager, id);
          const physical = versions[0].from >= current;
          return physical
            ? this.deletePhysically(manager, unit, versions)
            : this.deleteLogically(manager, unit, versions, query, current);
        }),
      id,
    );
    this.logWrite(
      result.mode === 'physical' ? 'delete_physical' : 'delete_logical',
      id,
      result.year,
      result.backdated,
    );
    return { id, mode: result.mode, fromYear: result.year };
  }

  private async deletePhysically(
    manager: EntityManager,
    unit: { id: number; code: string },
    versions: TimelineVersion[],
  ): Promise<{ mode: 'physical'; year: null; backdated: boolean }> {
    const id = Number(unit.id);
    // Every version with this entry as parent lies at or after its first year
    // (I-3), so "from the first year" catches all of them and the RESTRICT FK
    // is never what answers.
    await this.assertNoActiveChildren(
      manager,
      unit,
      versions[0].from,
      'delete',
    );
    const referrers = await this.store.findSuccessorReferrers(manager, id);
    if (referrers.length > 0) {
      throw conflict(
        `Cannot delete ${unit.code}: it is the successor of ${referrers.map((r) => r.code).join(', ')}. Inactivate it instead, or change that successor first.`,
      );
    }
    await this.assertNoLinkedRecords(unit);

    const userId = this.currentUser.user_id;
    const last = versions[versions.length - 1];
    const changes: ChangeSet = { code: { old: unit.code, new: null } };
    for (const [field, value] of Object.entries({
      name: last.name,
      acronym: last.acronym,
      levelId: last.levelId,
      parentId: last.parentId,
      directorCarnet: last.directorCarnet,
    })) {
      if (value !== null) changes[field] = { old: value, new: null };
    }
    const delegates = await this.store.loadDelegateCarnets(manager, id);
    if (delegates.length > 0) changes.delegates = { old: delegates, new: [] };
    // The log row is written first and has no foreign key (D-ORG-5): it survives the delete.
    await this.store.insertLog(manager, {
      unitId: id,
      action: 'delete_physical',
      appliesFromYear: null,
      backdated: false,
      changes,
      userId,
    });
    await this.store.deleteUnit(manager, id);
    return { mode: 'physical', year: null, backdated: false };
  }

  private async deleteLogically(
    manager: EntityManager,
    unit: {
      id: number;
      code: string;
      status: string;
      status_from_year?: number | null;
    },
    versions: TimelineVersion[],
    query: DeleteOrgUnitQueryDto,
    current: number,
  ): Promise<{ mode: 'logical'; year: number; backdated: boolean }> {
    const id = Number(unit.id);
    const userId = this.currentUser.user_id;
    let year: number;
    let backdated = false;
    let ended: { versions: TimelineVersion[]; dropped: TimelineVersion[] } = {
      versions,
      dropped: [],
    };

    if (unit.status === 'inactive') {
      // Already ended: the end year stands; only the status changes.
      year = unit.status_from_year ?? versions[versions.length - 1].to;
    } else {
      year = query.fromYear ?? current;
      this.assertAppliesFromYear(year, 'fromYear');
      this.assertBackdate(year, query.backdate, current, 'fromYear');
      backdated = year < current;
      const result = endTimeline(versions, year);
      if ('violation' in result) {
        throw badRequest(result.violation.field, result.violation.description);
      }
      ended = result;
    }

    await this.assertNoActiveChildren(manager, unit, year, 'delete');
    await this.assertNoLinkedRecords(unit);
    assertTimeline(ended.versions, { ended: true, gaps: gapsOf(versions) });

    const { updates } = changedVersions(versions, ended.versions);
    for (const version of updates) {
      await this.store.updateVersion(manager, version, userId);
    }
    await this.store.deleteVersions(
      manager,
      id,
      ended.dropped.map((v) => v.id),
    );
    await this.store.updateUnitStatus(
      manager,
      id,
      { status: 'deleted', statusFromYear: year, successorId: null },
      userId,
    );
    const changes: ChangeSet = {
      status: { old: unit.status, new: 'deleted' },
      statusFromYear: { old: unit.status_from_year ?? null, new: year },
    };
    if (ended.dropped.length > 0) {
      changes.droppedVersions = {
        old: ended.dropped.map((v) => this.versionSummary(v)),
        new: null,
      };
    }
    await this.store.insertLog(manager, {
      unitId: id,
      action: 'delete_logical',
      appliesFromYear: year,
      backdated,
      changes,
      userId,
    });
    return { mode: 'logical', year, backdated };
  }

  /** Lock the entry; 404 when it does not exist, 409 when it is deleted (design 5.5, last bullet). */
  private async lockLiveUnit(manager: EntityManager, id: number) {
    const unit = await this.store.lockUnit(manager, id);
    if (!unit) {
      throw new NotFoundException(`Organizational unit ${id} not found`);
    }
    if (unit.status === 'deleted') {
      throw conflict(
        `Organizational unit ${id} is deleted and cannot be changed`,
      );
    }
    return unit;
  }

  /** 409 naming the children when any version under the entry covers a year >= `fromYear` (design 5.3). */
  private async assertNoActiveChildren(
    manager: EntityManager,
    unit: { id: number; code: string },
    fromYear: number,
    verb: 'inactivate' | 'delete',
  ): Promise<void> {
    const graph = await this.store.loadGraphVersions(manager);
    const childIds = findActiveChildren(graph, Number(unit.id), fromYear);
    if (childIds.length === 0) return;
    const codes: string[] = [];
    for (const childId of childIds) {
      codes.push(
        (await this.store.findUnit(manager, childId))?.code ?? `#${childId}`,
      );
    }
    throw conflict(
      `Cannot ${verb} ${unit.code}: it has entries active from ${fromYear}: ${codes.join(', ')}. Move or inactivate them first.`,
    );
  }

  /** 409 stating the count and proposing Inactivate when a registered consumer references the entry (R-ORG-008). */
  private async assertNoLinkedRecords(unit: {
    id: number;
    code: string;
  }): Promise<void> {
    const breakdown = await this.usageRegistry.getBreakdown(Number(unit.id));
    const total = breakdown.reduce((sum, row) => sum + row.count, 0);
    if (total === 0) return;
    const detail = breakdown.map((r) => `${r.consumer}: ${r.count}`).join('; ');
    throw conflict(
      `Cannot delete ${unit.code}: ${total} linked record${total === 1 ? '' : 's'} use it (${detail}). Inactivate it instead.`,
    );
  }

  /** R-ORG-007 AC.3: an existing entry of the SAME level, with a version covering `year`; else 400 naming `successor`. */
  private async assertSuccessor(
    manager: EntityManager,
    unitId: number,
    successorId: number,
    year: number,
    levelId: number,
  ): Promise<void> {
    if (successorId === unitId) {
      throw badRequest('successor', 'An entry cannot be its own successor');
    }
    const successor = await this.store.findUnit(manager, successorId);
    if (!successor) {
      throw badRequest('successor', `Successor entry ${successorId} not found`);
    }
    const covering = findCovering(
      await this.store.loadVersions(manager, successorId),
      year,
    );
    if (!covering) {
      throw badRequest(
        'successor',
        `Successor ${successor.code} is not active in ${year}`,
      );
    }
    if (covering.levelId !== levelId) {
      throw badRequest(
        'successor',
        `Successor ${successor.code} is not of the same level as the entry`,
      );
    }
  }

  private versionSummary(v: TimelineVersion) {
    return {
      from: v.from,
      to: v.to,
      name: v.name,
      acronym: v.acronym,
      levelId: v.levelId,
      parentId: v.parentId,
      directorCarnet: v.directorCarnet,
    };
  }

  // -------------------------------------------------------------------------
  // Validation helpers. Each 400 names its field (`level`, `parent`,
  // `director`, `delegates`, `appliesFromYear`, `backdate`, `code`).
  // -------------------------------------------------------------------------

  private assertAppliesFromYear(year: number, field = 'appliesFromYear'): void {
    const max = this.clock.currentYear() + ORG_MAX_YEARS_AHEAD;
    if (!Number.isInteger(year) || year < ORG_MIN_YEAR || year > max) {
      throw badRequest(
        field,
        `${field} must be between ${ORG_MIN_YEAR} and ${max}`,
      );
    }
  }

  /** R-ORG-005: a save that applies before the current year needs the explicit flag. */
  private assertBackdate(
    year: number,
    flag: boolean | undefined,
    current: number,
    field = 'appliesFromYear',
  ): void {
    if (year < current && flag !== true) {
      throw badRequest(
        'backdate',
        `${field} ${year} is earlier than the current year ${current}: send backdate=true to confirm a back-date`,
      );
    }
  }

  /** `assertValueInList` (control lists) AND one of the four seeded ids (D-ORG-4). */
  private async assertLevel(levelId: number): Promise<void> {
    try {
      await this.lookup.assertValueInList(levelId, ORG_LEVEL_LIST_KEY);
    } catch (error) {
      if (error instanceof HttpException) {
        throw badRequest(
          'level',
          `levelId ${levelId} is not a value of the ${ORG_LEVEL_LIST_KEY} list`,
        );
      }
      throw error;
    }
    if (!ORG_LEVEL_BY_ID[levelId]) {
      throw badRequest(
        'level',
        `levelId ${levelId} has no hierarchy rules; use one of 20, 21, 22, 23`,
      );
    }
  }

  /** The canonical stored carnet of an existing staff member, or null when none is sent. */
  private async resolveDirector(
    manager: EntityManager,
    carnet: string | null | undefined,
  ): Promise<string | null> {
    if (carnet === undefined || carnet === null) return null;
    const [row] = await this.store.findStaff(manager, [carnet]);
    if (!row) {
      throw badRequest('director', `Staff member ${carnet} does not exist`);
    }
    return row.carnet;
  }

  private async assertParentExists(
    manager: EntityManager,
    parentId: number | null,
  ): Promise<void> {
    if (parentId === null || parentId === undefined) return;
    if (!(await this.store.findUnit(manager, parentId))) {
      throw new NotFoundException({
        message: {
          description: `Parent entry ${parentId} not found`,
          field: 'parent',
        },
      });
    }
  }

  private async assertHierarchy(
    manager: EntityManager,
    unitId: number,
    versions: TimelineVersion[],
    fromYear: number,
    checkChildren = false,
  ): Promise<void> {
    const graph = {
      unitId,
      versions: versions.map((v) => ({
        unitId,
        from: v.from,
        to: v.to,
        parentId: v.parentId,
        levelId: v.levelId,
      })),
      others: await this.store.loadGraphVersions(manager),
      fromYear,
    };
    const violation = findHierarchyViolation(graph);
    if (violation) throw badRequest(violation.field, violation.description);

    // I-3 for children: a level change must keep every child version valid.
    if (!checkChildren) return;
    const conflicts = findChildLevelConflicts(graph);
    if (conflicts.length === 0) return;
    const codes = new Map<number, string>();
    for (const childId of new Set(conflicts.map((c) => c.childId))) {
      codes.set(
        childId,
        (await this.store.findUnit(manager, childId))?.code ?? `#${childId}`,
      );
    }
    const lastLevel = versions[versions.length - 1].levelId;
    throw badRequest(
      'level',
      describeChildLevelConflicts(conflicts, (id) => codes.get(id), lastLevel),
    );
  }

  /**
   * R-ORG-017 step 1: at most 20, no duplicates, every carnet exists, each
   * NEWLY added one is active staff (one already in the list stays even when
   * inactive). Returns the canonical carnets in the order given.
   */
  private async resolveDelegates(
    manager: EntityManager,
    requested: string[],
    stored: string[],
  ): Promise<string[]> {
    if (requested.length > MAX_DELEGATES) {
      throw badRequest(
        'delegates',
        `An entry can have at most ${MAX_DELEGATES} delegates`,
      );
    }
    const lower = requested.map((c) => c.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      throw badRequest('delegates', 'The delegate list has a duplicate');
    }
    const rows = await this.store.findStaff(manager, requested);
    const byLower = new Map(rows.map((row) => [row.carnet.toLowerCase(), row]));
    const storedLower = new Set(stored.map((c) => c.toLowerCase()));
    return requested.map((carnet) => {
      const row = byLower.get(carnet.toLowerCase());
      if (!row) {
        throw badRequest('delegates', `Staff member ${carnet} does not exist`);
      }
      if (!row.isActive && !storedLower.has(carnet.toLowerCase())) {
        throw badRequest(
          'delegates',
          `Staff member ${carnet} is inactive and cannot be newly added as a delegate`,
        );
      }
      return row.carnet;
    });
  }

  /**
   * I-6: no delegate is the director of the version covering the current year
   * or of any later version, computed over the timeline AFTER this save's own
   * director change. The side that introduces the overlap is named: a delegate
   * that was not already in the list is `delegates`; one already there means the
   * director change caused it (`director`).
   */
  private assertNoDirectorOverlap(
    versions: Array<Pick<TimelineVersion, 'to' | 'directorCarnet'>>,
    delegates: string[],
    storedDelegates: string[],
    current: number,
  ): void {
    const directors = new Set(
      versions
        .filter((v) => v.to === null || v.to > current)
        .map((v) => v.directorCarnet?.toLowerCase())
        .filter((c) => !!c),
    );
    const overlap = delegates.filter((c) => directors.has(c.toLowerCase()));
    if (overlap.length === 0) return;
    const stored = new Set(storedDelegates.map((c) => c.toLowerCase()));
    const introduced = overlap.find((c) => !stored.has(c.toLowerCase()));
    throw introduced
      ? badRequest(
          'delegates',
          `${introduced} is the director of this entry and cannot also be a delegate`,
        )
      : badRequest(
          'director',
          `${overlap[0]} is a delegate of this entry and cannot also be its director`,
        );
  }

  private async nextCode(manager: EntityManager): Promise<string> {
    return proposeNextCode(await this.store.findProposableCodes(manager));
  }

  private async assertCodeFree(
    manager: EntityManager,
    code: string,
    excludeId?: number,
  ): Promise<void> {
    if (await this.store.codeTaken(manager, code, excludeId)) {
      throw conflict(`An entry with code "${code}" already exists`, 'code');
    }
  }

  private blankToNull(value: string | null | undefined): string | null {
    return value === undefined || value === null || value.trim() === ''
      ? null
      : value.trim();
  }

  // -------------------------------------------------------------------------
  // Plumbing
  // -------------------------------------------------------------------------

  /** One transaction; a duplicate-key race on the code becomes the field-named 409 (D-CTL-11). */
  private async inTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.store.transaction(work);
    } catch (error) {
      const errno = (error as { errno?: number })?.errno;
      const message = String(
        (error as { sqlMessage?: string })?.sqlMessage ??
          (error as { message?: string })?.message ??
          '',
      );
      if (
        errno === MYSQL_DUPLICATE_ENTRY_ERRNO &&
        !message.includes('uq_org_unit_versions') &&
        !message.includes('uq_org_unit_delegates')
      ) {
        throw conflict('An entry with this code already exists', 'code');
      }
      throw error;
    }
  }

  /** Design 9: a warn log on every blocked (4xx) write. */
  private async guarded<T>(
    action: string,
    work: () => Promise<T>,
    id?: number,
  ): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() < 500) {
        this.logger._warn(
          `org_structure.blocked action=${action} status=${error.getStatus()} user_id=${this.currentUser.user_id}${id === undefined ? '' : ` id=${id}`} reason="${this.reasonOf(error)}"`,
        );
      }
      throw error;
    }
  }

  /** The human description of an HttpException, for the blocked-action warn log. */
  private reasonOf(error: HttpException): string {
    const body = error.getResponse() as { message?: unknown } | string;
    const message = typeof body === 'string' ? body : body?.message;
    if (typeof message === 'string') return message;
    const description = (message as { description?: unknown } | undefined)
      ?.description;
    return typeof description === 'string' ? description : error.message;
  }

  private logWrite(
    action: string,
    id: number,
    year: number | null,
    backdated: boolean,
  ): void {
    this.logger._log(
      `org_structure.${action} id=${id} applies_from=${year ?? '-'} backdated=${backdated} user_id=${this.currentUser.user_id}`,
    );
  }
}
