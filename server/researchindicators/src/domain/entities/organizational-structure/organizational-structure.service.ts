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
  findChildLevelConflicts,
  findHierarchyViolation,
} from './org-hierarchy.util';
import {
  applyChange,
  ApplyChangeResult,
  assertTimeline,
  changedVersions,
  TimelineVersion,
  VersionChanges,
} from './org-version-timeline.util';
import { OrgStructureWriteRepository } from './repositories/org-structure-write.repository';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import {
  OrgChangeAction,
  OrgSaveOutcome,
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
 * Write side of the module: the save engine (design 5.2, 5.3), code proposal
 * (5.6) and staff search (D-ORG-8). Request-scoped through `CurrentUserUtil`
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
    const unit = await this.store.lockUnit(manager, id);
    if (!unit) {
      throw new NotFoundException(`Organizational unit ${id} not found`);
    }
    if (unit.status === 'deleted') {
      throw conflict(
        `Organizational unit ${id} is deleted and cannot be changed`,
      );
    }

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
        assertTimeline(result.versions, { ended });
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
  // Validation helpers. Each 400 names its field (`level`, `parent`,
  // `director`, `delegates`, `appliesFromYear`, `backdate`, `code`).
  // -------------------------------------------------------------------------

  private assertAppliesFromYear(year: number): void {
    const max = this.clock.currentYear() + ORG_MAX_YEARS_AHEAD;
    if (!Number.isInteger(year) || year < ORG_MIN_YEAR || year > max) {
      throw badRequest(
        'appliesFromYear',
        `appliesFromYear must be between ${ORG_MIN_YEAR} and ${max}`,
      );
    }
  }

  /** R-ORG-005: a save that applies before the current year needs the explicit flag. */
  private assertBackdate(
    year: number,
    flag: boolean | undefined,
    current: number,
  ): void {
    if (year < current && flag !== true) {
      throw badRequest(
        'backdate',
        `appliesFromYear ${year} is earlier than the current year ${current}: send backdate=true to confirm a back-date`,
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
  private async guarded<T>(action: string, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() < 500) {
        this.logger._warn(
          `org_structure.blocked action=${action} status=${error.getStatus()} user_id=${this.currentUser.user_id}`,
        );
      }
      throw error;
    }
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
