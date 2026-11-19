import { Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { DEFAULT_LEVELS } from './strategy-framework.constants';
import {
  badRequest,
  childrenWayOut,
  consumerWayOut,
  institutionalObjectivesWayOut,
} from './framework-errors';
import { FrameworkUsageRegistry } from './framework-usage.registry';
import { buildTree, descendantCounts } from './framework-tree.util';
import { FrameworkElement } from './entities/framework-element.entity';
import { FrameworkLevel } from './entities/framework-level.entity';
import { FrameworkElementRepository } from './repositories/framework-element.repository';
import { FrameworkElementResponsibleRepository } from './repositories/framework-element-responsible.repository';
import { FrameworkLevelRepository } from './repositories/framework-level.repository';
import { InstitutionalObjectiveElementRepository } from './repositories/institutional-objective-element.repository';
import { InstitutionalObjectiveRepository } from './repositories/institutional-objective.repository';
import {
  PortfolioLookupRepository,
  PortfolioLookupRow,
} from './repositories/portfolio-lookup.repository';

/** A2 rejects more than this many ids (design §4). */
export const RESOLVE_ID_LIMIT = 200;

export interface FrameworkResponsibleView {
  carnet: string;
  name: string;
  email: string | null;
  isActiveStaff: boolean;
}

export interface FrameworkLevelView {
  id?: number;
  depth: number;
  name: string;
  pluralName: string;
  shortLabel: string;
  isIndicatorLevel: boolean;
  /** Present only on the empty editor's stand-in levels (A1e). */
  virtual?: true;
}

export interface FrameworkElementView {
  id: number;
  levelId: number;
  depth: number;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  descendantCounts: Record<number, number>;
  /** Indicator-level elements only, in `position` order. */
  responsibles?: FrameworkResponsibleView[];
}

export interface FrameworkBlockerView {
  reason: string;
  count: number;
  wayOut: string;
}

export interface FrameworkEditorElementView extends FrameworkElementView {
  usage: Record<string, number>;
  deletable: boolean;
  blockers: FrameworkBlockerView[];
}

export interface UsageLabelView {
  consumerName: string;
  label: string;
}

export interface FrameworkView {
  portfolioId: number;
  configured: boolean;
  levels: FrameworkLevelView[];
  elements: FrameworkElementView[];
}

export interface FrameworkEditorView {
  portfolioId: number;
  configured: boolean;
  levels: FrameworkLevelView[];
  elements: FrameworkEditorElementView[];
  /**
   * Registry labels for the editor. One list for the view: a label does not
   * vary per element (design 5.6). Kept off A1 (D-STF-22).
   */
  usageLabels: UsageLabelView[];
}

export interface FrameworkContextPortfolio {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
  configured: boolean;
}

export interface FrameworkContext {
  currentYear: number;
  portfolios: FrameworkContextPortfolio[];
  /** Null when no portfolio is active. */
  defaultPortfolioId: number | null;
}

export interface ElementBlockersView {
  children: number;
  objectives: number;
  consumers: Array<{ consumerName: string; count: number }>;
  wayOut: string[];
}

export interface ObjectiveYearView {
  year: number;
  count: number;
}

export interface ObjectiveYearsView {
  years: ObjectiveYearView[];
  defaultYear: number;
}

export interface ObjectiveElementView {
  id: number;
  code: string;
  name: string;
}

export interface ObjectiveView {
  id: number;
  portfolioId: number;
  year: number;
  code: string;
  statement: string;
  elements: ObjectiveElementView[];
  deletable: boolean;
  blockers: FrameworkBlockerView[];
}

export type ResolveRow = FrameworkElementView | { id: number; missing: true };

interface StaffRow {
  element_id: number | string;
  staff_carnet: string;
  position: number | string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: number | boolean | string | null;
}

interface CountRow {
  [key: string]: number | string;
}

const compareCodes = (left: string, right: string): number =>
  left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  });

const num = (value: number | string): number => Number(value);

const numOrNull = (value: number | string | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(value);

const flag = (value: number | boolean | string | null | undefined): boolean =>
  value === true || Number(value) === 1;

const notFound = (description: string, field: string) =>
  new NotFoundException({ message: { description, field } });

const assertPositiveInt = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw badRequest(field, `${field} is required`);
  }
};

/**
 * Active for context (design 5.1). `findById` / `findAll` do not apply this
 * filter and do not read `deleted_at`.
 */
const isActivePortfolio = (row: PortfolioLookupRow): boolean =>
  flag(row.is_active);

const byLatestStartThenLowestId = (
  left: PortfolioLookupRow,
  right: PortfolioLookupRow,
): number =>
  num(right.start_year) - num(left.start_year) || num(left.id) - num(right.id);

/**
 * Design 5.1. Containing range wins; several → latest start, then lowest id
 * (the design names the start tie-break and is silent on equal starts).
 * None containing → latest start that is not after the year, else lowest id.
 * The set is active portfolios only. Empty → null.
 */
const chooseDefaultPortfolioId = (
  rows: readonly PortfolioLookupRow[],
  year: number,
): number | null => {
  const active = rows.filter(isActivePortfolio);
  if (active.length === 0) return null;
  const containing = active.filter(
    (row) => num(row.start_year) <= year && num(row.end_year) >= year,
  );
  if (containing.length > 0) {
    return num([...containing].sort(byLatestStartThenLowestId)[0].id);
  }
  const started = active.filter((row) => num(row.start_year) <= year);
  if (started.length > 0) {
    return num([...started].sort(byLatestStartThenLowestId)[0].id);
  }
  return num([...active].sort((a, b) => num(a.id) - num(b.id))[0].id);
};

const utcYear = (asOf: Date): number => asOf.getUTCFullYear();

const virtualLevels = (): FrameworkLevelView[] =>
  DEFAULT_LEVELS.map((level) => ({
    depth: level.depth,
    name: level.name,
    pluralName: level.plural_name,
    shortLabel: level.short_label,
    isIndicatorLevel: flag(level.is_indicator_level),
    virtual: true as const,
  }));

const toLevelView = (level: FrameworkLevel): FrameworkLevelView => ({
  id: num(level.id),
  depth: num(level.depth),
  name: level.name,
  pluralName: level.plural_name,
  shortLabel: level.short_label,
  isIndicatorLevel: flag(level.is_indicator_level),
});

const staffName = (first: string | null, last: string | null): string =>
  [first, last]
    .filter((part) => !!part && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ');

/**
 * Singleton read side (design 2.1, 4 A0/A1/A1e/A2/A8/A9, 5.1, 5.4, 5.6).
 * Repositories and the registry only — never `CurrentUserUtil` or
 * `PortfoliosService` (P-21, D-STF-11). A missing portfolio id is 404.
 * A row `findById` returns is readable, including `is_active` false: the
 * design's 404 is the missing id, and §5.1's "active" applies to the
 * context list and the default, not to A1.
 *
 * @akili-spec institutional-performance/strategy-framework
 */
@Injectable()
export class FrameworkReadService {
  constructor(
    private readonly portfolios: PortfolioLookupRepository,
    private readonly levels: FrameworkLevelRepository,
    private readonly elements: FrameworkElementRepository,
    private readonly responsibles: FrameworkElementResponsibleRepository,
    private readonly objectives: InstitutionalObjectiveRepository,
    private readonly links: InstitutionalObjectiveElementRepository,
    private readonly usage: FrameworkUsageRegistry,
  ) {}

  /** A0. `asOf` defaults to the server clock; the year is UTC (design 5.1). */
  async getContext(asOf: Date = new Date()): Promise<FrameworkContext> {
    const year = utcYear(asOf);
    const [rows, configured] = await Promise.all([
      this.portfolios.findAll(),
      this.configuredPortfolioIds(),
    ]);
    const active = rows.filter(isActivePortfolio);
    return {
      currentYear: year,
      portfolios: [...active]
        .sort((a, b) => num(a.id) - num(b.id))
        .map((row) => ({
          id: num(row.id),
          name: row.name,
          startYear: num(row.start_year),
          endYear: num(row.end_year),
          configured: configured.has(num(row.id)),
        })),
      defaultPortfolioId: chooseDefaultPortfolioId(rows, year),
    };
  }

  /** A1. No usage, deletable, blockers or usageLabels (D-STF-22). */
  async getFramework(portfolioId: number): Promise<FrameworkView> {
    const portfolio = await this.requirePortfolio(portfolioId);
    const portfolioKey = num(portfolio.id);
    const [levelRows, elementRows] = await Promise.all([
      this.levels.find({ where: { portfolio_id: portfolioKey } }),
      this.elements.find({ where: { portfolio_id: portfolioKey } }),
    ]);
    return {
      portfolioId: portfolioKey,
      configured: elementRows.length > 0,
      levels: levelRows.map(toLevelView).sort((a, b) => a.depth - b.depth),
      elements: await this.buildElementViews(levelRows, elementRows),
    };
  }

  /**
   * A1e. Stored levels when the portfolio has any; otherwise the virtual
   * defaults, with no ids, so the empty editor can offer + Add Performance
   * Area. Editor fields stay off A1.
   */
  async getEditor(portfolioId: number): Promise<FrameworkEditorView> {
    const view = await this.getFramework(portfolioId);
    const usageLabels = this.usage.elementLabels();
    if (view.levels.length === 0) {
      return {
        portfolioId: view.portfolioId,
        configured: view.configured,
        levels: virtualLevels(),
        elements: [],
        usageLabels,
      };
    }
    const elementCounts = await this.usage.countElements(
      view.elements.map((element) => element.id),
    );
    const indicatorIds = view.elements
      .filter((element) => element.responsibles !== undefined)
      .map((element) => element.id);
    const objectiveCounts = await this.objectiveCounts(indicatorIds);
    const childCounts = new Map<number, number>();
    for (const element of view.elements) {
      if (element.parentId === null) continue;
      childCounts.set(
        element.parentId,
        (childCounts.get(element.parentId) ?? 0) + 1,
      );
    }
    return {
      portfolioId: view.portfolioId,
      configured: view.configured,
      levels: view.levels,
      usageLabels,
      elements: view.elements.map((element) =>
        this.withEditorFields(
          element,
          view.levels,
          childCounts,
          objectiveCounts,
          elementCounts,
        ),
      ),
    };
  }

  /** A2. Request order. Unknown ids are `{ id, missing: true }`. */
  async resolve(ids: number[]): Promise<ResolveRow[]> {
    if (
      !Array.isArray(ids) ||
      ids.length > RESOLVE_ID_LIMIT ||
      ids.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      throw badRequest(
        'ids',
        `ids must be at most ${RESOLVE_ID_LIMIT} positive integers`,
      );
    }
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];
    const heads = await this.elements.find({ where: { id: In(unique) } });
    const portfolioIds = [
      ...new Set(heads.map((row) => num(row.portfolio_id))),
    ];
    const views = new Map<number, FrameworkElementView>();
    if (portfolioIds.length > 0) {
      const [levelRows, elementRows] = await Promise.all([
        this.levels.find({ where: { portfolio_id: In(portfolioIds) } }),
        this.elements.find({ where: { portfolio_id: In(portfolioIds) } }),
      ]);
      for (const portfolioId of portfolioIds) {
        const built = await this.buildElementViews(
          levelRows.filter((row) => num(row.portfolio_id) === portfolioId),
          elementRows.filter((row) => num(row.portfolio_id) === portfolioId),
        );
        for (const element of built) views.set(element.id, element);
      }
    }
    return ids.map((id) => views.get(id) ?? { id, missing: true });
  }

  /** A8. Same blocker rules as A1e, projected for one element. */
  async getElementBlockers(elementId: number): Promise<ElementBlockersView> {
    assertPositiveInt(elementId, 'id');
    const element = await this.elements.findOne({ where: { id: elementId } });
    if (!element) throw notFound('Element not found', 'id');
    const editor = await this.getEditor(num(element.portfolio_id));
    const row = editor.elements.find(
      (candidate) => candidate.id === num(element.id),
    );
    if (!row) throw notFound('Element not found', 'id');
    return projectBlockers(row.blockers);
  }

  /**
   * A9 years. `defaultYear` is the UTC year when it sits in the portfolio
   * range, otherwise the first year (R-STF-009). Every year is listed,
   * including those with zero objectives.
   */
  async getObjectiveYears(
    portfolioId: number,
    asOf: Date = new Date(),
  ): Promise<ObjectiveYearsView> {
    const portfolio = await this.requirePortfolio(portfolioId);
    const start = num(portfolio.start_year);
    const end = num(portfolio.end_year);
    const raw: CountRow[] = await this.objectives.query(
      `SELECT year, COUNT(*) AS n
         FROM institutional_objectives
        WHERE portfolio_id = ?
        GROUP BY year`,
      [num(portfolio.id)],
    );
    const counts = new Map<number, number>();
    for (const row of raw) counts.set(num(row.year), num(row.n));
    const years: ObjectiveYearView[] = [];
    for (let year = start; year <= end; year += 1) {
      years.push({ year, count: counts.get(year) ?? 0 });
    }
    const current = utcYear(asOf);
    return {
      years,
      defaultYear: current >= start && current <= end ? current : start,
    };
  }

  /** A9 list. A year outside the portfolio range is 400 `year`. */
  async listObjectives(
    portfolioId: number,
    year: number,
  ): Promise<ObjectiveView[]> {
    const portfolio = await this.requirePortfolio(portfolioId);
    const start = num(portfolio.start_year);
    const end = num(portfolio.end_year);
    if (!Number.isInteger(year) || year < start || year > end) {
      throw badRequest('year', `year must be between ${start} and ${end}`);
    }
    const rows = await this.objectives.find({
      where: { portfolio_id: num(portfolio.id), year },
    });
    const objectiveIds = rows.map((row) => num(row.id));
    const linked = await this.linkedElements(objectiveIds);
    const usage = await this.usage.countObjectives(objectiveIds);
    return [...rows]
      .sort((a, b) => compareCodes(a.code, b.code))
      .map((row) => {
        const id = num(row.id);
        const blockers = objectiveBlockers(id, usage);
        return {
          id,
          portfolioId: num(row.portfolio_id),
          year: num(row.year),
          code: row.code,
          statement: row.statement,
          elements: linked.get(id) ?? [],
          deletable: blockers.length === 0,
          blockers,
        };
      });
  }

  private async requirePortfolio(
    portfolioId: number,
  ): Promise<PortfolioLookupRow> {
    assertPositiveInt(portfolioId, 'portfolioId');
    const portfolio = await this.portfolios.findById(portfolioId);
    if (!portfolio) throw notFound('Portfolio not found', 'portfolioId');
    return portfolio;
  }

  private async configuredPortfolioIds(): Promise<Set<number>> {
    const raw: CountRow[] = await this.elements.query(
      `SELECT portfolio_id, COUNT(*) AS n
         FROM framework_elements
        GROUP BY portfolio_id`,
    );
    const ids = new Set<number>();
    for (const row of raw) {
      if (num(row.n) > 0) ids.add(num(row.portfolio_id));
    }
    return ids;
  }

  private async buildElementViews(
    levelRows: FrameworkLevel[],
    elementRows: FrameworkElement[],
  ): Promise<FrameworkElementView[]> {
    const levelById = new Map(levelRows.map((level) => [num(level.id), level]));
    const indicatorIds = elementRows
      .filter((row) =>
        flag(levelById.get(num(row.level_id))?.is_indicator_level),
      )
      .map((row) => num(row.id))
      .sort((a, b) => a - b);
    const responsibles = await this.responsiblesByElement(indicatorIds);
    const tree = buildTree(
      elementRows.map((row) => ({
        id: num(row.id),
        parentId: numOrNull(row.parent_id),
        depth: num(levelById.get(num(row.level_id))?.depth ?? 0),
        code: row.code,
      })),
    );
    return elementRows
      .map((row) => {
        const id = num(row.id);
        const level = levelById.get(num(row.level_id));
        const depth = num(level?.depth ?? 0);
        const view: FrameworkElementView = {
          id,
          levelId: num(row.level_id),
          depth,
          code: row.code,
          name: row.name,
          description: row.description ?? null,
          parentId: numOrNull(row.parent_id),
          descendantCounts: descendantCounts(tree, id),
        };
        if (flag(level?.is_indicator_level)) {
          view.responsibles = responsibles.get(id) ?? [];
        }
        return view;
      })
      .sort((a, b) => compareCodes(a.code, b.code));
  }

  private async responsiblesByElement(
    indicatorIds: number[],
  ): Promise<Map<number, FrameworkResponsibleView[]>> {
    const grouped = new Map<number, FrameworkResponsibleView[]>();
    if (indicatorIds.length === 0) return grouped;
    const placeholders = indicatorIds.map(() => '?').join(', ');
    const rows: StaffRow[] = await this.responsibles.query(
      `SELECT r.element_id AS element_id,
              r.staff_carnet AS staff_carnet,
              r.position AS position,
              s.first_name AS first_name,
              s.last_name AS last_name,
              s.email AS email,
              s.is_active AS is_active
         FROM framework_element_responsibles r
         INNER JOIN alliance_user_staff s ON s.carnet = r.staff_carnet
        WHERE r.element_id IN (${placeholders})`,
      indicatorIds,
    );
    const sorted = [...rows].sort(
      (a, b) =>
        num(a.element_id) - num(b.element_id) ||
        num(a.position) - num(b.position),
    );
    for (const row of sorted) {
      const elementId = num(row.element_id);
      const list = grouped.get(elementId) ?? [];
      list.push({
        carnet: row.staff_carnet,
        name: staffName(row.first_name, row.last_name),
        email: row.email ?? null,
        isActiveStaff: flag(row.is_active),
      });
      grouped.set(elementId, list);
    }
    return grouped;
  }

  private async objectiveCounts(
    indicatorIds: number[],
  ): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (indicatorIds.length === 0) return counts;
    const placeholders = indicatorIds.map(() => '?').join(', ');
    const rows: CountRow[] = await this.links.query(
      `SELECT element_id, COUNT(*) AS n
         FROM institutional_objective_elements
        WHERE element_id IN (${placeholders})
        GROUP BY element_id`,
      indicatorIds,
    );
    for (const row of rows) counts.set(num(row.element_id), num(row.n));
    return counts;
  }

  private withEditorFields(
    element: FrameworkElementView,
    levels: readonly FrameworkLevelView[],
    childCounts: ReadonlyMap<number, number>,
    objectiveCounts: ReadonlyMap<number, number>,
    elementCounts: ReadonlyArray<{
      consumerName: string;
      counts: Record<number, number>;
    }>,
  ): FrameworkEditorElementView {
    const usage: Record<string, number> = {};
    for (const row of elementCounts) {
      usage[row.consumerName] = Number(row.counts[element.id] ?? 0);
    }
    const blockers: FrameworkBlockerView[] = [];
    const childCount = childCounts.get(element.id) ?? 0;
    if (childCount > 0) {
      const childLevel = levels.find(
        (level) => level.depth === element.depth + 1,
      );
      blockers.push({
        reason: 'children',
        count: childCount,
        wayOut: childrenWayOut(
          childCount,
          childLevel?.name ?? 'element',
          childLevel?.pluralName ?? 'elements',
        ),
      });
    }
    if (element.responsibles !== undefined) {
      const objectiveCount = objectiveCounts.get(element.id) ?? 0;
      if (objectiveCount > 0) {
        blockers.push({
          reason: 'objectives',
          count: objectiveCount,
          wayOut: institutionalObjectivesWayOut(objectiveCount),
        });
      }
    }
    for (const row of elementCounts) {
      const count = Number(row.counts[element.id] ?? 0);
      if (count > 0) {
        blockers.push({
          reason: row.consumerName,
          count,
          wayOut: consumerWayOut(count, row.consumerName),
        });
      }
    }
    return {
      ...element,
      usage,
      deletable: blockers.length === 0,
      blockers,
    };
  }

  private async linkedElements(
    objectiveIds: number[],
  ): Promise<Map<number, ObjectiveElementView[]>> {
    const grouped = new Map<number, ObjectiveElementView[]>();
    if (objectiveIds.length === 0) return grouped;
    const placeholders = objectiveIds.map(() => '?').join(', ');
    const rows: Array<{
      institutional_objective_id: number | string;
      id: number | string;
      code: string;
      name: string;
    }> = await this.links.query(
      `SELECT l.institutional_objective_id AS institutional_objective_id,
              e.id AS id,
              e.code AS code,
              e.name AS name
         FROM institutional_objective_elements l
         INNER JOIN framework_elements e ON e.id = l.element_id
        WHERE l.institutional_objective_id IN (${placeholders})`,
      objectiveIds,
    );
    for (const row of rows) {
      const objectiveId = num(row.institutional_objective_id);
      const list = grouped.get(objectiveId) ?? [];
      list.push({ id: num(row.id), code: row.code, name: row.name });
      grouped.set(objectiveId, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => compareCodes(a.code, b.code));
    }
    return grouped;
  }
}

const objectiveBlockers = (
  objectiveId: number,
  usage: ReadonlyArray<{
    consumerName: string;
    counts: Record<number, number>;
  }>,
): FrameworkBlockerView[] => {
  const blockers: FrameworkBlockerView[] = [];
  for (const row of usage) {
    const count = Number(row.counts[objectiveId] ?? 0);
    if (count > 0) {
      blockers.push({
        reason: row.consumerName,
        count,
        wayOut: consumerWayOut(count, row.consumerName),
      });
    }
  }
  return blockers;
};

const projectBlockers = (
  blockers: readonly FrameworkBlockerView[],
): ElementBlockersView => {
  const children = blockers.find((blocker) => blocker.reason === 'children');
  const objectives = blockers.find(
    (blocker) => blocker.reason === 'objectives',
  );
  return {
    children: children?.count ?? 0,
    objectives: objectives?.count ?? 0,
    consumers: blockers
      .filter(
        (blocker) =>
          blocker.reason !== 'children' && blocker.reason !== 'objectives',
      )
      .map((blocker) => ({
        consumerName: blocker.reason,
        count: blocker.count,
      })),
    wayOut: blockers.map((blocker) => blocker.wayOut),
  };
};
