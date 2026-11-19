import {
  HttpException,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { CreateFrameworkElementDto } from './dto/create-framework-element.dto';
import { UpdateFrameworkElementDto } from './dto/update-framework-element.dto';
import { FrameworkElement } from './entities/framework-element.entity';
import { FrameworkElementResponsible } from './entities/framework-element-responsible.entity';
import { FrameworkLevel } from './entities/framework-level.entity';
import { proposeElementCode } from './framework-code.util';
import {
  FrameworkBlocker,
  badRequest,
  blocked,
  childrenWayOut,
  conflict,
  consumerWayOut,
  institutionalObjectivesWayOut,
} from './framework-errors';
import { createDepthViolation, moveViolation } from './framework-tree.util';
import {
  ElementBlockersView,
  FrameworkElementView,
  FrameworkReadService,
} from './framework-read.service';
import {
  CODE_MAX_LENGTH,
  DEFAULT_LEVELS,
  MAX_ELEMENTS_PER_PORTFOLIO,
  STAFF_SEARCH_LIMIT,
} from './strategy-framework.constants';

/**
 * Element half of the request-scoped write service (design 2.1, 5.2, 5.4).
 * IOB writes are added later to this class. Machine tokens are rejected by
 * the guard (R-STF-014, T-08), not here. One transaction per write.
 *
 * @akili-spec institutional-performance/strategy-framework
 */

const MYSQL_DUPLICATE = 1062;
const MYSQL_ROW_IS_REFERENCED = 1451;
const MYSQL_NO_REFERENCED_ROW = 1452;

interface LevelRow {
  id: number;
  portfolio_id: number;
  depth: number;
  name: string;
  plural_name: string;
  short_label: string;
  is_indicator_level: number;
}

interface ElementRow {
  id: number;
  portfolio_id: number;
  level_id: number;
  parent_id: number | null;
  code: string;
  name: string;
  description: string | null;
}

interface StaffHit {
  carnet: string;
  isActive: boolean;
}

const notFound = (description: string, field: string) =>
  new NotFoundException({ message: { description, field } });

const assertPositiveInt = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw badRequest(field, `${field} is required`);
  }
};

const asNumber = (value: unknown): number => Number(value);

const isActiveFlag = (value: unknown): boolean =>
  value === true || Number(value) === 1;

const errnoOf = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const row = error as {
    errno?: unknown;
    driverError?: { errno?: unknown };
  };
  const raw = row.errno ?? row.driverError?.errno;
  if (raw === undefined || raw === null) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const messageOf = (error: unknown): string => {
  if (!error || typeof error !== 'object') return '';
  const row = error as {
    sqlMessage?: unknown;
    message?: unknown;
    driverError?: { sqlMessage?: unknown; message?: unknown };
  };
  return String(
    row.sqlMessage ??
      row.driverError?.sqlMessage ??
      row.driverError?.message ??
      row.message ??
      '',
  );
};

const staffDisplayName = (
  firstName: string | null,
  lastName: string | null,
): string =>
  [firstName, lastName]
    .filter((part) => !!part && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ');

const cleanText = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

@Injectable({ scope: Scope.REQUEST })
export class StrategyFrameworkService {
  private readonly logger = new LoggerUtil({
    name: StrategyFrameworkService.name,
  });

  constructor(
    private readonly dataSource: DataSource,
    private readonly read: FrameworkReadService,
    private readonly currentUser: CurrentUserUtil,
  ) {}

  /**
   * A4. Active staff only, parenthesized name/email match, at most 20 rows
   * (R-STF-004, design 2.2, parity organizational-structure search).
   */
  async searchStaff(
    search: string,
  ): Promise<Array<{ carnet: string; name: string; email: string | null }>> {
    const like = `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const rows: Array<{
      carnet: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }> = await this.dataSource.query(
      `SELECT carnet, first_name, last_name, email
         FROM alliance_user_staff
        WHERE is_active = 1
          AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
               OR CONCAT_WS(' ', first_name, last_name) LIKE ?)
        ORDER BY first_name, last_name
        LIMIT ${Number(STAFF_SEARCH_LIMIT)}`,
      [like, like, like, like],
    );
    return rows.map((row) => ({
      carnet: row.carnet,
      name: staffDisplayName(row.first_name, row.last_name),
      email: row.email ?? null,
    }));
  }

  /** A5. */
  async createElement(
    dto: CreateFrameworkElementDto,
  ): Promise<FrameworkElementView> {
    assertPositiveInt(dto.portfolioId, 'portfolioId');
    const parentId =
      dto.parentId === undefined || dto.parentId === null ? null : dto.parentId;
    if (parentId !== null) assertPositiveInt(parentId, 'parentId');
    const name = dto.name?.trim() ?? '';
    if (!name) throw badRequest('name', 'name is required');
    const requested = cleanText(dto.code) ?? undefined;
    if (requested && requested.length > CODE_MAX_LENGTH) {
      throw badRequest('code', 'code is too long');
    }
    const hint: { code?: string } = { code: requested };
    const created = await this.inTransaction(async (manager) => {
      await this.lockPortfolio(manager, dto.portfolioId);
      const levels = await this.ensureLevels(manager, dto.portfolioId);
      const elements = await this.loadPortfolioElements(
        manager,
        dto.portfolioId,
      );
      const placement = await this.resolveCreatePlacement(
        manager,
        dto.portfolioId,
        parentId,
        levels,
      );
      if (elements.length >= MAX_ELEMENTS_PER_PORTFOLIO) {
        throw badRequest(
          'portfolioId',
          `a portfolio holds at most ${MAX_ELEMENTS_PER_PORTFOLIO} elements`,
        );
      }
      const code =
        requested ?? this.proposeCode(elements, levels, placement.parentId);
      hint.code = code;
      this.assertCodeFree(elements, code);
      const carnets = await this.carnetsForWrite(
        manager,
        placement.level,
        dto.responsibleCarnets,
        null,
      );
      const userId = this.currentUser.user_id;
      const inserted = await manager.insert(FrameworkElement, {
        portfolio_id: dto.portfolioId,
        level_id: placement.level.id,
        parent_id: placement.parentId,
        code,
        name,
        description: cleanText(dto.description),
        created_by: userId,
        is_active: true,
      });
      const id = asNumber(inserted.identifiers[0]?.id);
      if (carnets !== null && carnets.length > 0) {
        await this.writeResponsibles(manager, id, carnets, userId);
      }
      return id;
    }, hint);
    return this.elementView(dto.portfolioId, created);
  }

  /** A6. */
  async updateElement(
    id: number,
    dto: UpdateFrameworkElementDto,
  ): Promise<FrameworkElementView> {
    assertPositiveInt(id, 'id');
    const hint: { code?: string } = {};
    const portfolioId = await this.inTransaction(async (manager) => {
      const element = await this.lockElement(manager, id);
      if (!element) throw notFound('Element not found', 'id');
      const levels = await this.loadLevels(manager, element.portfolio_id);
      const level = this.levelOf(levels, element);
      const elements = await this.loadPortfolioElements(
        manager,
        element.portfolio_id,
      );
      const patch: {
        updated_by: number;
        code?: string;
        name?: string;
        description?: string | null;
        parent_id?: number;
      } = { updated_by: this.currentUser.user_id };
      if (dto.parentId !== undefined) {
        patch.parent_id = await this.resolveMove(
          manager,
          element,
          level,
          levels,
          dto.parentId,
        );
      }
      if (dto.code !== undefined) {
        const code = dto.code.trim();
        if (!code) throw badRequest('code', 'code is required');
        this.assertCodeFree(elements, code, element.id);
        hint.code = code;
        patch.code = code;
      }
      if (dto.name !== undefined) {
        const name = dto.name.trim();
        if (!name) throw badRequest('name', 'name is required');
        patch.name = name;
      }
      if (dto.description !== undefined) {
        patch.description = cleanText(dto.description);
      }
      const carnets = await this.carnetsForWrite(
        manager,
        level,
        dto.responsibleCarnets,
        element.id,
      );
      const columns =
        patch.code !== undefined ||
        patch.name !== undefined ||
        patch.description !== undefined ||
        patch.parent_id !== undefined ||
        carnets !== null;
      if (columns) {
        await manager.update(FrameworkElement, { id: element.id }, patch);
      }
      if (carnets !== null) {
        await this.writeResponsibles(
          manager,
          element.id,
          carnets,
          this.currentUser.user_id,
        );
      }
      return element.portfolio_id;
    }, hint);
    return this.elementView(portfolioId, id);
  }

  /** A7. Blockers come from the read service (design 5.4). Physical delete. */
  async deleteElement(id: number): Promise<{ id: number }> {
    assertPositiveInt(id, 'id');
    const held: { element?: ElementRow; levels?: LevelRow[] } = {};
    try {
      const element = await this.dataSource.transaction(async (manager) => {
        const locked = await this.lockElement(manager, id);
        if (!locked) throw notFound('Element not found', 'id');
        const levels = await this.loadLevels(manager, locked.portfolio_id);
        held.element = locked;
        held.levels = levels;
        const refusal = await this.buildRefusal(locked, levels);
        if (refusal) throw refusal;
        await manager.query(`DELETE FROM framework_elements WHERE id = ?`, [
          locked.id,
        ]);
        return locked;
      });
      this.logDelete(element, held.levels ?? []);
      return { id: element.id };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        errnoOf(error) === MYSQL_ROW_IS_REFERENCED &&
        held.element &&
        held.levels
      ) {
        throw await this.refusalAfterRace(held.element, held.levels);
      }
      throw error;
    }
  }

  private async inTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
    hint: { code?: string },
  ): Promise<T> {
    try {
      return await this.dataSource.transaction(work);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.mapWriteError(error, hint);
    }
  }

  /** Design 5.2 step 7. Constraint name decides the status; a bare 1452 does not. */
  private mapWriteError(error: unknown, hint: { code?: string }): never {
    const errno = errnoOf(error);
    const message = messageOf(error);
    if (errno === MYSQL_DUPLICATE && /uq_framework_levels/i.test(message)) {
      throw conflict('the framework changed, reload');
    }
    if (
      errno === MYSQL_DUPLICATE &&
      /uq_framework_element_resp/i.test(message)
    ) {
      throw conflict(
        'a responsible is already on this element',
        'responsibleCarnets',
      );
    }
    if (errno === MYSQL_DUPLICATE) {
      throw conflict(
        hint.code
          ? `Code ${hint.code} is already used`
          : 'Code is already used',
        'code',
      );
    }
    if (
      errno === MYSQL_NO_REFERENCED_ROW &&
      /fk_framework_element_resp_staff_carnet/i.test(message)
    ) {
      throw badRequest('responsibleCarnets', 'unknown staff id');
    }
    if (
      errno === MYSQL_NO_REFERENCED_ROW &&
      /fk_framework_elements_parent_id/i.test(message)
    ) {
      throw notFound('Parent not found', 'parentId');
    }
    if (
      errno === MYSQL_NO_REFERENCED_ROW &&
      /fk_iob_elements_element_id/i.test(message)
    ) {
      throw badRequest('elementIds', 'an element does not exist');
    }
    throw error;
  }

  /** First statement of every create (design 5.2 step 6). */
  private async lockPortfolio(
    manager: EntityManager,
    portfolioId: number,
  ): Promise<void> {
    const rows: Array<{ id: number | string }> = await manager.query(
      `SELECT id
         FROM portfolios
        WHERE id = ?
        FOR UPDATE`,
      [portfolioId],
    );
    if (!rows[0]) throw notFound('Portfolio not found', 'portfolioId');
  }

  private async lockElement(
    manager: EntityManager,
    id: number,
  ): Promise<ElementRow | null> {
    const rows: RawElement[] = await manager.query(
      `SELECT id, portfolio_id, level_id, parent_id, code, name, description
         FROM framework_elements
        WHERE id = ?
        FOR UPDATE`,
      [id],
    );
    return rows[0] ? asElement(rows[0]) : null;
  }

  private async loadElement(
    manager: EntityManager,
    id: number,
  ): Promise<ElementRow | null> {
    const rows: RawElement[] = await manager.query(
      `SELECT id, portfolio_id, level_id, parent_id, code, name, description
         FROM framework_elements
        WHERE id = ?`,
      [id],
    );
    return rows[0] ? asElement(rows[0]) : null;
  }

  private async loadLevels(
    manager: EntityManager,
    portfolioId: number,
  ): Promise<LevelRow[]> {
    const rows: RawLevel[] = await manager.query(
      `SELECT id, portfolio_id, depth, name, plural_name, short_label, is_indicator_level
         FROM framework_levels
        WHERE portfolio_id = ?`,
      [portfolioId],
    );
    return rows.map(asLevel);
  }

  private async loadPortfolioElements(
    manager: EntityManager,
    portfolioId: number,
  ): Promise<ElementRow[]> {
    const rows: RawElement[] = await manager.query(
      `SELECT id, portfolio_id, level_id, parent_id, code, name, description
         FROM framework_elements
        WHERE portfolio_id = ?`,
      [portfolioId],
    );
    return rows
      .map(asElement)
      .filter((row) => row.portfolio_id === portfolioId);
  }

  /**
   * Lazy DEFAULT_LEVELS (design 5.2 step 2, D-STF-21). A row whose
   * portfolio does not match is not "no levels" — I-1 rejects it.
   */
  private async ensureLevels(
    manager: EntityManager,
    portfolioId: number,
  ): Promise<LevelRow[]> {
    const levels = await this.loadLevels(manager, portfolioId);
    const own = levels.filter((level) => level.portfolio_id === portfolioId);
    if (own.length > 0) return levels;
    if (levels.length > 0) {
      throw badRequest('levelId', 'the level belongs to another portfolio');
    }
    const userId = this.currentUser.user_id;
    await manager.insert(
      FrameworkLevel,
      DEFAULT_LEVELS.map((level) => ({
        portfolio_id: portfolioId,
        depth: level.depth,
        name: level.name,
        plural_name: level.plural_name,
        short_label: level.short_label,
        is_indicator_level: level.is_indicator_level,
        created_by: userId,
        is_active: true,
      })),
    );
    return this.loadLevels(manager, portfolioId);
  }

  private async resolveCreatePlacement(
    manager: EntityManager,
    portfolioId: number,
    parentId: number | null,
    levels: readonly LevelRow[],
  ): Promise<{ level: LevelRow; parentId: number | null }> {
    if (parentId === null) {
      return {
        level: this.ownLevel(levels, portfolioId, 1, null),
        parentId: null,
      };
    }
    const parent = await this.loadElement(manager, parentId);
    if (!parent) throw notFound('Parent not found', 'parentId');
    const parentLevel = levels.find((level) => level.id === parent.level_id);
    const violation = createDepthViolation({
      parentId,
      parentDepth: parentLevel?.depth ?? null,
      parentLevelName: parentLevel?.name ?? null,
      levelDepths: levels
        .filter((level) => level.portfolio_id === portfolioId)
        .map((level) => level.depth),
      samePortfolio: parent.portfolio_id === portfolioId,
    });
    if (violation) throw badRequest(violation.field, violation.description);
    if (!parentLevel || parentLevel.portfolio_id !== portfolioId) {
      throw badRequest('parentId', 'no level below the parent');
    }
    const level = this.ownLevel(
      levels,
      portfolioId,
      parentLevel.depth + 1,
      parentLevel.name,
    );
    const locked = await manager.query(
      `SELECT id FROM framework_elements WHERE id = ? FOR UPDATE`,
      [parentId],
    );
    if (!locked[0]) throw notFound('Parent not found', 'parentId');
    return { level, parentId };
  }

  /**
   * A6 parent semantics. Portfolio is checked here: `moveViolation` does
   * not (T-04). Null and a depth-1 element are 400 without a lookup.
   */
  private async resolveMove(
    manager: EntityManager,
    element: ElementRow,
    level: LevelRow,
    levels: readonly LevelRow[],
    parentId: number | null,
  ): Promise<number> {
    if (parentId === null || level.depth === 1) {
      const violation = moveViolation({
        elementDepth: level.depth,
        newParentId: parentId,
        newParentDepth: null,
      });
      throw badRequest(
        violation?.field ?? 'parentId',
        violation?.description ?? 'an element never changes depth',
      );
    }
    const parent = await this.loadElement(manager, parentId);
    if (!parent) throw notFound('Parent not found', 'parentId');
    if (parent.portfolio_id !== element.portfolio_id) {
      throw badRequest('parentId', 'the parent belongs to another portfolio');
    }
    const parentLevel = levels.find((row) => row.id === parent.level_id);
    const violation = moveViolation({
      elementDepth: level.depth,
      newParentId: parentId,
      newParentDepth: parentLevel?.depth ?? null,
    });
    if (violation) throw badRequest(violation.field, violation.description);
    return parentId;
  }

  /**
   * I-1. A level row returned for this portfolio whose `portfolio_id` does
   * not match is rejected, not used as the element's level.
   */
  private ownLevel(
    levels: readonly LevelRow[],
    portfolioId: number,
    depth: number,
    parentLevelName: string | null,
  ): LevelRow {
    const atDepth = levels.filter((level) => level.depth === depth);
    const own = atDepth.find((level) => level.portfolio_id === portfolioId);
    if (own) return own;
    if (atDepth.length > 0) {
      throw badRequest('levelId', 'the level belongs to another portfolio');
    }
    throw badRequest(
      'parentId',
      `no level below ${parentLevelName ?? 'the parent'}`,
    );
  }

  private levelOf(levels: readonly LevelRow[], element: ElementRow): LevelRow {
    const level = levels.find(
      (row) =>
        row.id === element.level_id &&
        row.portfolio_id === element.portfolio_id,
    );
    if (!level) {
      throw badRequest('levelId', 'the level belongs to another portfolio');
    }
    return level;
  }

  private proposeCode(
    elements: readonly ElementRow[],
    levels: readonly LevelRow[],
    parentId: number | null,
  ): string {
    const depthOf = new Map(levels.map((level) => [level.id, level.depth]));
    const proposal = proposeElementCode(
      elements.map((element) => ({
        id: element.id,
        parentId: element.parent_id,
        depth: depthOf.get(element.level_id) ?? 0,
        code: element.code,
      })),
      parentId,
    );
    if ('field' in proposal) {
      throw badRequest(proposal.field, proposal.description);
    }
    return proposal.code;
  }

  private assertCodeFree(
    elements: readonly ElementRow[],
    code: string,
    excludeId?: number,
  ): void {
    const needle = code.trim().toLowerCase();
    const taken = elements.some(
      (element) =>
        element.id !== excludeId &&
        element.code.trim().toLowerCase() === needle,
    );
    if (taken) throw conflict(`Code ${code} is already used`, 'code');
  }

  /**
   * `undefined` means the caller omitted the list (create: none, update:
   * leave them). An array is the new set. Non-indicator levels reject a
   * non-empty list (I-6).
   */
  private async carnetsForWrite(
    manager: EntityManager,
    level: LevelRow,
    requested: string[] | undefined,
    elementId: number | null,
  ): Promise<string[] | null> {
    if (requested === undefined) return null;
    const indicator = Number(level.is_indicator_level) === 1;
    if (!indicator) {
      if (requested.length > 0) {
        throw badRequest(
          'responsibleCarnets',
          'responsibles belong only on the indicator level',
        );
      }
      return null;
    }
    if (requested.length === 0) return [];
    return this.assertResponsibles(manager, requested, elementId);
  }

  private async assertResponsibles(
    manager: EntityManager,
    carnets: readonly string[],
    elementId: number | null,
  ): Promise<string[]> {
    const normalized = carnets.map((carnet) => carnet.trim());
    const lowered = normalized.map((carnet) => carnet.toLowerCase());
    if (new Set(lowered).size !== lowered.length) {
      throw badRequest(
        'responsibleCarnets',
        'a responsible is listed more than once',
      );
    }
    const staff = await this.loadStaff(manager, normalized);
    const byLower = new Map(
      staff.map((row) => [row.carnet.toLowerCase(), row]),
    );
    const current =
      elementId === null
        ? new Set<string>()
        : new Set(
            (await this.loadResponsibleCarnets(manager, elementId)).map(
              (carnet) => carnet.toLowerCase(),
            ),
          );
    const stored: string[] = [];
    for (const carnet of normalized) {
      const hit = byLower.get(carnet.toLowerCase());
      if (!hit) {
        throw badRequest('responsibleCarnets', `unknown staff id ${carnet}`);
      }
      const already = current.has(carnet.toLowerCase());
      if (!already && !hit.isActive) {
        throw badRequest('responsibleCarnets', `${carnet} is inactive`);
      }
      stored.push(hit.carnet);
    }
    return stored;
  }

  private async loadStaff(
    manager: EntityManager,
    carnets: readonly string[],
  ): Promise<StaffHit[]> {
    if (carnets.length === 0) return [];
    const placeholders = carnets.map(() => '?').join(', ');
    const rows: Array<{ carnet: string; is_active: unknown }> =
      await manager.query(
        `SELECT carnet, is_active
           FROM alliance_user_staff
          WHERE carnet IN (${placeholders})`,
        [...carnets],
      );
    return rows.map((row) => ({
      carnet: row.carnet,
      isActive: isActiveFlag(row.is_active),
    }));
  }

  private async loadResponsibleCarnets(
    manager: EntityManager,
    elementId: number,
  ): Promise<string[]> {
    const rows: Array<{ staff_carnet: string }> = await manager.query(
      `SELECT staff_carnet
         FROM framework_element_responsibles
        WHERE element_id = ?`,
      [elementId],
    );
    return rows.map((row) => row.staff_carnet);
  }

  /** Delete + insert. `position` is the list index (design 5.2 step 5). */
  private async writeResponsibles(
    manager: EntityManager,
    elementId: number,
    carnets: readonly string[],
    userId: number,
  ): Promise<void> {
    await manager.query(
      `DELETE FROM framework_element_responsibles WHERE element_id = ?`,
      [elementId],
    );
    if (carnets.length === 0) return;
    await manager.insert(
      FrameworkElementResponsible,
      carnets.map((carnet, index) => ({
        element_id: elementId,
        staff_carnet: carnet,
        position: index,
        created_by: userId,
        is_active: true,
      })),
    );
  }

  private async buildRefusal(
    element: ElementRow,
    levels: readonly LevelRow[],
  ): Promise<ReturnType<typeof blocked> | null> {
    const summary = await this.read.getElementBlockers(element.id);
    const built = this.toBlockers(element, levels, summary);
    if (built.blockers.length === 0) return null;
    return blocked(
      this.deleteDescription(element, levels, built),
      built.blockers,
    );
  }

  private async refusalAfterRace(
    element: ElementRow,
    levels: readonly LevelRow[],
  ): Promise<HttpException> {
    const again = await this.buildRefusal(element, levels);
    if (again) return again;
    const levelName =
      levels.find((level) => level.id === element.level_id)?.name ?? 'Element';
    return blocked(
      `Cannot delete ${levelName} ${element.code}: it is still referenced.`,
      [
        {
          reason: 'referenced',
          count: 1,
          wayOut: 'Remove the records that reference it first.',
        },
      ],
    );
  }

  private toBlockers(
    element: ElementRow,
    levels: readonly LevelRow[],
    summary: ElementBlockersView,
  ): { blockers: FrameworkBlocker[]; clauses: string[] } {
    const blockers: FrameworkBlocker[] = [];
    const clauses: string[] = [];
    const own = levels.find(
      (level) =>
        level.id === element.level_id &&
        level.portfolio_id === element.portfolio_id,
    );
    if (summary.children > 0) {
      const child = levels.find(
        (level) =>
          level.portfolio_id === element.portfolio_id &&
          level.depth === (own?.depth ?? 0) + 1,
      );
      const count = summary.children;
      blockers.push({
        reason: 'children',
        count,
        wayOut: childrenWayOut(
          count,
          child?.name ?? 'element',
          child?.plural_name ?? 'elements',
        ),
      });
      const noun =
        count === 1
          ? (child?.name ?? 'element')
          : (child?.plural_name ?? 'elements');
      clauses.push(`has ${count} ${noun}`);
    }
    if (summary.objectives > 0) {
      const count = summary.objectives;
      blockers.push({
        reason: 'objectives',
        count,
        wayOut: institutionalObjectivesWayOut(count),
      });
      clauses.push(
        count === 1
          ? 'linked by 1 institutional objective'
          : `linked by ${count} institutional objectives`,
      );
    }
    for (const consumer of summary.consumers) {
      if (consumer.count <= 0) continue;
      blockers.push({
        reason: consumer.consumerName,
        count: consumer.count,
        wayOut: consumerWayOut(consumer.count, consumer.consumerName),
      });
      clauses.push(
        consumer.count === 1
          ? `used by 1 record in ${consumer.consumerName}`
          : `used by ${consumer.count} records in ${consumer.consumerName}`,
      );
    }
    return { blockers, clauses };
  }

  private deleteDescription(
    element: ElementRow,
    levels: readonly LevelRow[],
    built: { blockers: FrameworkBlocker[]; clauses: string[] },
  ): string {
    const levelName =
      levels.find((level) => level.id === element.level_id)?.name ?? 'Element';
    return `Cannot delete ${levelName} ${element.code}: ${built.clauses.join('; ')}. ${built.blockers.map((blocker) => blocker.wayOut).join(' ')}`;
  }

  private logDelete(element: ElementRow, levels: readonly LevelRow[]): void {
    const levelName =
      levels.find((level) => level.id === element.level_id)?.name ?? 'Element';
    this.logger._log(
      `strategy_framework.delete level=${levelName} id=${element.id} code=${element.code} portfolio=${element.portfolio_id} user=${this.currentUser.user_id}`,
    );
  }

  private async elementView(
    portfolioId: number,
    id: number,
  ): Promise<FrameworkElementView> {
    const view = await this.read.getFramework(portfolioId);
    const element = view.elements.find((row) => row.id === id);
    if (!element) throw notFound('Element not found', 'id');
    return element;
  }
}

interface RawLevel {
  id: number | string;
  portfolio_id: number | string;
  depth: number | string;
  name: string;
  plural_name: string;
  short_label: string;
  is_indicator_level: number | string | boolean;
}

interface RawElement {
  id: number | string;
  portfolio_id: number | string;
  level_id: number | string;
  parent_id: number | string | null;
  code: string;
  name: string;
  description: string | null;
}

const asLevel = (row: RawLevel): LevelRow => ({
  id: asNumber(row.id),
  portfolio_id: asNumber(row.portfolio_id),
  depth: asNumber(row.depth),
  name: row.name,
  plural_name: row.plural_name,
  short_label: row.short_label,
  is_indicator_level: isActiveFlag(row.is_indicator_level) ? 1 : 0,
});

const asElement = (row: RawElement): ElementRow => ({
  id: asNumber(row.id),
  portfolio_id: asNumber(row.portfolio_id),
  level_id: asNumber(row.level_id),
  parent_id:
    row.parent_id === null || row.parent_id === undefined
      ? null
      : asNumber(row.parent_id),
  code: row.code,
  name: row.name,
  description: row.description ?? null,
});
