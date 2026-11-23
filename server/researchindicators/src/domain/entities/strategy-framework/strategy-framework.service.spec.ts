import 'reflect-metadata';
import { HttpException, NotFoundException, Scope } from '@nestjs/common';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { CarryForwardObjectivesDto } from './dto/carry-forward-objectives.dto';
import { CreateFrameworkElementDto } from './dto/create-framework-element.dto';
import { CreateInstitutionalObjectiveDto } from './dto/create-institutional-objective.dto';
import { UpdateFrameworkElementDto } from './dto/update-framework-element.dto';
import { UpdateInstitutionalObjectiveDto } from './dto/update-institutional-objective.dto';
import {
  ElementBlockersView,
  FrameworkReadService,
  ObjectiveView,
} from './framework-read.service';
import { FrameworkUsageRegistry } from './framework-usage.registry';
import { StrategyFrameworkService } from './strategy-framework.service';
import { StrategyFrameworkModule } from './strategy-framework.module';

/**
 * T-05. Repositories and the database are not used: the DataSource and its
 * transaction manager are fakes. A recorded SQL string is not a lock MySQL
 * took, and a thrown `{ errno }` is not a foreign-key error. Those behaviours
 * are T-10.
 */

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

interface ObjectiveRow {
  id: number;
  portfolio_id: number;
  year: number;
  code: string;
  statement: string;
}

interface ObjectiveLinkRow {
  institutional_objective_id: number;
  element_id: number;
}

interface World {
  missingPortfolio: boolean;
  portfolio: { start_year: number; end_year: number };
  levels: LevelRow[];
  elements: ElementRow[];
  staff: Array<{ carnet: string; is_active: number }>;
  responsibles: Array<{ element_id: number; staff_carnet: string }>;
  blockers: ElementBlockersView;
  objectives: ObjectiveRow[];
  links: ObjectiveLinkRow[];
  listed: ObjectiveView[];
  objectiveBlockers: Array<{ reason: string; count: number; wayOut: string }>;
  failInsert: Record<string, unknown>;
  deleteError: unknown;
  objectiveDeleteError: unknown;
}

const emptyBlockers = (): ElementBlockersView => ({
  children: 0,
  objectives: 0,
  consumers: [],
  wayOut: [],
});

const level = (
  id: number,
  portfolio: number,
  depth: number,
  name: string,
  plural: string,
  short: string,
  indicator: number,
): LevelRow => ({
  id,
  portfolio_id: portfolio,
  depth,
  name,
  plural_name: plural,
  short_label: short,
  is_indicator_level: indicator,
});

const element = (
  id: number,
  portfolio: number,
  levelId: number,
  parentId: number | null,
  code: string,
  name: string,
): ElementRow => ({
  id,
  portfolio_id: portfolio,
  level_id: levelId,
  parent_id: parentId,
  code,
  name,
  description: null,
});

const LEVELS: LevelRow[] = [
  level(1, 2, 1, 'Performance Area', 'Performance Areas', 'AREA', 0),
  level(2, 2, 2, 'Dimension', 'Dimensions', 'DIMENSION', 0),
  level(3, 2, 3, 'Indicator', 'Indicators', 'INDICATOR', 1),
];

const TREE: ElementRow[] = [
  element(10, 2, 1, null, '1', 'Area 1'),
  element(11, 2, 1, null, '2', 'Area 2'),
  element(13, 2, 2, 10, '1.3', 'Dimension 1.3'),
  element(22, 2, 3, 13, '1.2.2', 'Process'),
];

const flat = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

const sqlKind = (sql: string): string => {
  const compact = flat(sql).toLowerCase();
  if (compact.startsWith('delete from framework_element_responsibles')) {
    return 'delete-responsibles';
  }
  if (compact.startsWith('delete from framework_elements'))
    return 'delete-element';
  if (compact.startsWith('delete from institutional_objective_elements')) {
    return 'delete-links';
  }
  if (compact.startsWith('delete from institutional_objectives')) {
    return 'delete-objective';
  }
  if (compact.includes('from portfolios') && compact.includes('for update')) {
    return compact.includes('start_year')
      ? 'lock-portfolio-range'
      : 'lock-portfolio';
  }
  if (
    compact.includes('from institutional_objectives') &&
    compact.includes('for update')
  ) {
    return 'lock-objective';
  }
  if (compact.includes('from institutional_objectives')) return 'objectives';
  if (compact.includes('from institutional_objective_elements')) return 'links';
  if (compact.includes('from framework_levels')) return 'levels';
  if (
    compact.includes('from framework_elements') &&
    compact.includes('framework_levels')
  ) {
    return 'link-candidates';
  }
  if (
    compact.includes('from framework_elements') &&
    compact.includes('for update')
  ) {
    return 'lock-element';
  }
  if (compact.includes('where portfolio_id')) return 'elements';
  if (compact.includes('from framework_elements')) return 'element';
  if (compact.includes('from alliance_user_staff')) return 'staff';
  if (compact.includes('from framework_element_responsibles'))
    return 'responsibles';
  return compact;
};

const harness = (setup?: (world: World) => void, readOverride?: object) => {
  const world: World = {
    missingPortfolio: false,
    portfolio: { start_year: 2026, end_year: 2030 },
    levels: LEVELS.map((row) => ({ ...row })),
    elements: TREE.map((row) => ({ ...row })),
    staff: [],
    responsibles: [],
    blockers: emptyBlockers(),
    objectives: [],
    links: [],
    listed: [],
    objectiveBlockers: [],
    failInsert: {},
    deleteError: undefined,
    objectiveDeleteError: undefined,
  };
  setup?.(world);
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const inserts: Array<{ entity: string; values: unknown }> = [];
  const updates: Array<{ entity: string; criteria: unknown; values: unknown }> =
    [];
  const manager = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      const kind = sqlKind(sql);
      if (kind === 'lock-portfolio') {
        return world.missingPortfolio ? [] : [{ id: params[0] }];
      }
      if (kind === 'lock-portfolio-range') {
        return world.missingPortfolio
          ? []
          : [
              {
                id: params[0],
                start_year: world.portfolio.start_year,
                end_year: world.portfolio.end_year,
              },
            ];
      }
      if (kind === 'objectives') {
        const portfolioId = Number(params[0]);
        const year = Number(params[1]);
        return world.objectives
          .filter(
            (row) => row.portfolio_id === portfolioId && row.year === year,
          )
          .sort((left, right) => left.id - right.id);
      }
      if (kind === 'lock-objective') {
        const row = world.objectives.find(
          (item) => item.id === Number(params[0]),
        );
        return row ? [row] : [];
      }
      if (kind === 'links') {
        const ids = params.map((value) => Number(value));
        return world.links.filter((row) =>
          ids.includes(row.institutional_objective_id),
        );
      }
      if (kind === 'link-candidates') {
        return params
          .map((value) =>
            world.elements.find((item) => item.id === Number(value)),
          )
          .filter((item): item is ElementRow => !!item)
          .map((item) => ({
            id: item.id,
            portfolio_id: item.portfolio_id,
            code: item.code,
            is_indicator_level:
              world.levels.find((level) => level.id === item.level_id)
                ?.is_indicator_level ?? 0,
          }));
      }
      if (kind === 'levels') return world.levels;
      if (kind === 'elements') return world.elements;
      if (kind === 'element' || kind === 'lock-element') {
        const row = world.elements.find(
          (item) => item.id === Number(params[0]),
        );
        return row ? [row] : [];
      }
      if (kind === 'staff') {
        const wanted = params.map((value) => String(value).toLowerCase());
        return world.staff.filter((row) =>
          wanted.includes(row.carnet.toLowerCase()),
        );
      }
      if (kind === 'responsibles') {
        return world.responsibles.filter(
          (row) => row.element_id === Number(params[0]),
        );
      }
      if (kind === 'delete-responsibles') return [];
      if (kind === 'delete-element') {
        if (world.deleteError) throw world.deleteError;
        return [];
      }
      if (kind === 'delete-links') return [];
      if (kind === 'delete-objective') {
        if (world.objectiveDeleteError) throw world.objectiveDeleteError;
        return [];
      }
      throw new Error(`unexpected sql: ${flat(sql)}`);
    }),
    insert: jest.fn(async (entity: { name: string }, values: unknown) => {
      const name = entity.name;
      inserts.push({ entity: name, values });
      if (world.failInsert[name]) throw world.failInsert[name];
      const list = Array.isArray(values) ? values : [values];
      if (name === 'InstitutionalObjective') {
        const id = 500 + ofEntity(inserts, name).length - 1;
        return { identifiers: [{ id }] };
      }
      if (name === 'InstitutionalObjectiveElement') {
        return { identifiers: list.map((_, index) => ({ id: index + 1 })) };
      }
      if (name === 'FrameworkLevel') {
        world.levels = list.map((row, index) => ({
          id: index + 1,
          ...(row as object),
        })) as LevelRow[];
        return { identifiers: world.levels.map((row) => ({ id: row.id })) };
      }
      if (name === 'FrameworkElement') return { identifiers: [{ id: 77 }] };
      if (name === 'FrameworkElementResponsible') {
        return { identifiers: list.map((_, index) => ({ id: index + 1 })) };
      }
      throw new Error(`unexpected insert ${name}`);
    }),
    update: jest.fn(
      async (entity: { name: string }, criteria: unknown, values: unknown) => {
        updates.push({ entity: entity.name, criteria, values });
      },
    ),
  };
  const dataSource = {
    transaction: jest.fn(
      async (work: (inner: typeof manager) => Promise<unknown>) =>
        work(manager),
    ),
    query: jest.fn(
      async (_sql: string, _params: unknown[] = []) => [] as unknown[],
    ),
  };
  const read = (readOverride ?? {
    getFramework: jest.fn(async (portfolioId: number) => ({
      portfolioId,
      configured: true,
      levels: [],
      elements: [
        { id: 77, source: 'read' },
        ...world.elements.map((row) => ({
          id: row.id,
          code: row.code,
          source: 'read',
        })),
      ],
    })),
    getElementBlockers: jest.fn(async () => world.blockers),
    listObjectives: jest.fn(async () => world.listed),
    getObjectiveBlockers: jest.fn(async () => world.objectiveBlockers),
  }) as {
    getFramework: jest.Mock;
    getElementBlockers: jest.Mock;
    listObjectives: jest.Mock;
    getObjectiveBlockers: jest.Mock;
  };
  const service = new StrategyFrameworkService(
    dataSource as never,
    read as never,
    { user_id: 42 } as never,
  );
  return { world, service, queries, inserts, updates, read, dataSource };
};

const ofEntity = (
  inserts: Array<{ entity: string; values: unknown }>,
  name: string,
) => inserts.filter((row) => row.entity === name);

async function asHttp(work: Promise<unknown>): Promise<HttpException> {
  try {
    const value = await work;
    throw new Error(
      `expected a rejection, but the call resolved to ${JSON.stringify(value)}`,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('expected a rejection')
    ) {
      throw error;
    }
    if (error instanceof HttpException) return error;
    throw error;
  }
}

const payload = (error: HttpException) =>
  (
    error.getResponse() as {
      message: {
        description?: string;
        field?: string;
        blockers?: Array<{ reason: string; count: number; wayOut: string }>;
      };
    }
  ).message;

const deleted = (queries: Array<{ sql: string }>) =>
  queries.some((query) =>
    flat(query.sql).toLowerCase().startsWith('delete from framework_elements'),
  );

describe('StrategyFrameworkService element writes (T-05)', () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
  });

  it('is request-scoped, provided, and not exported', () => {
    expect(
      Reflect.getMetadata('scope:options', StrategyFrameworkService)?.scope,
    ).toBe(Scope.REQUEST);
    const names = (
      (Reflect.getMetadata('design:paramtypes', StrategyFrameworkService) ??
        []) as Array<{ name?: string }>
    ).map((type) => type?.name);
    expect(names).toEqual([
      'DataSource',
      'FrameworkReadService',
      'CurrentUserUtil',
    ]);
    expect(names).not.toContain('PortfoliosService');
    expect(Reflect.getMetadata('providers', StrategyFrameworkModule)).toContain(
      StrategyFrameworkService,
    );
    expect(
      Reflect.getMetadata('exports', StrategyFrameworkModule) ?? [],
    ).not.toContain(StrategyFrameworkService);
  });

  describe('create placement, cap, codes, lazy levels', () => {
    it('locks the portfolio row before any other statement', async () => {
      const { service, queries } = harness();
      await service.createElement({
        portfolioId: 2,
        name: 'Crops',
      } as CreateFrameworkElementDto);
      expect(flat(queries[0].sql)).toBe(
        'SELECT id FROM portfolios WHERE id = ? FOR UPDATE',
      );
      expect(queries[0].params).toEqual([2]);
    });

    it('creates a depth-1 element when parentId is null and proposes the root code', async () => {
      const { service, inserts, queries } = harness((world) => {
        world.elements = [];
      });
      const view = await service.createElement({
        portfolioId: 2,
        parentId: null,
        name: 'Crops',
      } as CreateFrameworkElementDto);
      expect(view).toMatchObject({ id: 77, source: 'read' });
      const element = ofEntity(inserts, 'FrameworkElement')[0].values as {
        parent_id: number | null;
        level_id: number;
        code: string;
        created_by: number;
      };
      expect(element).toMatchObject({
        parent_id: null,
        level_id: 1,
        code: '1',
        created_by: 42,
      });
      expect(
        queries.some(
          (query) =>
            /for update/i.test(query.sql) &&
            /framework_elements/i.test(query.sql),
        ),
      ).toBe(false);
    });

    it('proposes 1.7 under Area 1 when 1.1 through 1.6 are taken', async () => {
      const { service, inserts } = harness((world) => {
        world.elements = [
          element(10, 2, 1, null, '1', 'Area 1'),
          ...[1, 2, 3, 4, 5, 6].map((suffix) =>
            element(100 + suffix, 2, 2, 10, `1.${suffix}`, `Dim ${suffix}`),
          ),
        ];
      });
      await service.createElement({
        portfolioId: 2,
        parentId: 10,
        name: 'Next',
      } as CreateFrameworkElementDto);
      expect(ofEntity(inserts, 'FrameworkElement')[0].values).toMatchObject({
        code: '1.7',
        parent_id: 10,
        level_id: 2,
      });
    });

    it('rejects code 1.3 with 409 naming code and stores nothing', async () => {
      const { service, inserts } = harness();
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          parentId: 10,
          name: 'Again',
          code: '1.3',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(409);
      expect(payload(error)).toEqual({
        description: 'Code 1.3 is already used',
        field: 'code',
      });
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(0);
    });

    it('rejects the same code in another case', async () => {
      const { service } = harness((world) => {
        world.elements.push(element(40, 2, 1, null, 'Ab', 'Mixed'));
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          name: 'Lower',
          code: 'ab',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(409);
      expect(payload(error).field).toBe('code');
    });

    it('accepts a code that exists only in another portfolio', async () => {
      const { service, inserts } = harness((world) => {
        world.elements = [element(40, 9, 1, null, '1.3', 'Elsewhere')];
      });
      await service.createElement({
        portfolioId: 2,
        name: 'Local',
        code: '1.3',
      } as CreateFrameworkElementDto);
      expect(ofEntity(inserts, 'FrameworkElement')[0].values).toMatchObject({
        code: '1.3',
        portfolio_id: 2,
      });
    });

    it('rejects a parent of another portfolio with 400 parentId and stores nothing', async () => {
      const { service, inserts } = harness((world) => {
        world.elements.push(element(90, 9, 1, null, '9', 'Other area'));
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          parentId: 90,
          name: 'Cross',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'the parent belongs to another portfolio',
        field: 'parentId',
      });
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(0);
    });

    it('rejects a missing parent with 404 parentId', async () => {
      const { service } = harness();
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          parentId: 999,
          name: 'Ghost',
        } as CreateFrameworkElementDto),
      );
      expect(error).toBeInstanceOf(NotFoundException);
      expect(payload(error)).toEqual({
        description: 'Parent not found',
        field: 'parentId',
      });
    });

    it('rejects a parent below the last level with 400 naming that level', async () => {
      const { service, inserts } = harness();
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          parentId: 22,
          name: 'Too deep',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'no level below Indicator',
        field: 'parentId',
      });
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(0);
    });

    it('uses a fourth level added as data, and still refuses responsibles there', async () => {
      const { service, inserts } = harness((world) => {
        world.levels.push(level(4, 2, 4, 'Slice', 'Slices', 'SLICE', 0));
      });
      await service.createElement({
        portfolioId: 2,
        parentId: 22,
        name: 'Under indicator',
      } as CreateFrameworkElementDto);
      expect(ofEntity(inserts, 'FrameworkElement')[0].values).toMatchObject({
        level_id: 4,
        parent_id: 22,
      });
      inserts.length = 0;
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          parentId: 22,
          name: 'Owned',
          responsibleCarnets: ['IJ'],
        } as CreateFrameworkElementDto),
      );
      expect(payload(error)).toEqual({
        description: 'responsibles belong only on the indicator level',
        field: 'responsibleCarnets',
      });
    });

    it('rejects a level row whose portfolio_id is not the element portfolio', async () => {
      const { service, inserts } = harness((world) => {
        world.levels = [
          level(9, 9, 1, 'Foreign', 'Foreigns', 'FOR', 0),
          level(1, 2, 1, 'Performance Area', 'Performance Areas', 'AREA', 0),
        ];
      });
      await service.createElement({
        portfolioId: 2,
        name: 'Own',
      } as CreateFrameworkElementDto);
      expect(ofEntity(inserts, 'FrameworkElement')[0].values).toMatchObject({
        level_id: 1,
      });

      const onlyForeign = harness((world) => {
        world.levels = [level(9, 9, 1, 'Foreign', 'Foreigns', 'FOR', 0)];
      });
      const error = await asHttp(
        onlyForeign.service.createElement({
          portfolioId: 2,
          name: 'Stolen',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'the level belongs to another portfolio',
        field: 'levelId',
      });
      expect(ofEntity(onlyForeign.inserts, 'FrameworkElement')).toHaveLength(0);
      expect(ofEntity(onlyForeign.inserts, 'FrameworkLevel')).toHaveLength(0);
    });

    it('inserts DEFAULT_LEVELS once on the first element of an empty portfolio', async () => {
      const { service, inserts, queries } = harness((world) => {
        world.levels = [];
        world.elements = [];
      });
      await service.createElement({
        portfolioId: 2,
        name: 'First',
      } as CreateFrameworkElementDto);
      const levelInserts = ofEntity(inserts, 'FrameworkLevel');
      expect(levelInserts).toHaveLength(1);
      expect(levelInserts[0].values).toMatchObject([
        {
          name: 'Performance Area',
          plural_name: 'Performance Areas',
          is_indicator_level: 0,
        },
        { name: 'Dimension', plural_name: 'Dimensions', is_indicator_level: 0 },
        { name: 'Indicator', plural_name: 'Indicators', is_indicator_level: 1 },
      ]);
      expect(flat(queries[0].sql)).toMatch(
        /FROM portfolios WHERE id = \? FOR UPDATE/,
      );
      expect(ofEntity(inserts, 'FrameworkElement')[0].values).toMatchObject({
        level_id: 1,
        code: '1',
      });
    });

    it('does not insert levels when the portfolio already has them', async () => {
      const { service, inserts } = harness();
      await service.createElement({
        portfolioId: 2,
        name: 'Another area',
        code: '8',
      } as CreateFrameworkElementDto);
      expect(ofEntity(inserts, 'FrameworkLevel')).toHaveLength(0);
    });

    it('rejects the 501st element', async () => {
      const { service, inserts } = harness((world) => {
        world.elements = Array.from({ length: 500 }, (_, index) =>
          element(index + 1, 2, 1, null, `c${index}`, 'Row'),
        );
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          name: 'One too many',
          code: 'overflow',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'a portfolio holds at most 500 elements',
        field: 'portfolioId',
      });
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(0);
    });

    it('accepts the 500th element', async () => {
      const { service, inserts } = harness((world) => {
        world.elements = Array.from({ length: 499 }, (_, index) =>
          element(index + 1, 2, 1, null, `c${index}`, 'Row'),
        );
      });
      await service.createElement({
        portfolioId: 2,
        name: 'Last',
        code: 'last',
      } as CreateFrameworkElementDto);
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(1);
    });

    it('rejects a parent code that is too long to extend', async () => {
      const { service, inserts } = harness((world) => {
        world.elements = [
          element(10, 2, 1, null, '123456789012345678901234567890', 'Long'),
        ];
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          parentId: 10,
          name: 'Child',
        } as CreateFrameworkElementDto),
      );
      expect(payload(error)).toEqual({
        description: 'parent code too long to extend; type a code',
        field: 'code',
      });
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(0);
    });

    it('answers 404 when the portfolio row is missing', async () => {
      const { service, inserts } = harness((world) => {
        world.missingPortfolio = true;
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          name: 'Nowhere',
        } as CreateFrameworkElementDto),
      );
      expect(error).toBeInstanceOf(NotFoundException);
      expect(payload(error).field).toBe('portfolioId');
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(0);
    });

    it('locks the parent row after the portfolio lock', async () => {
      const { service, queries } = harness();
      await service.createElement({
        portfolioId: 2,
        parentId: 10,
        name: 'Child',
        code: '1.9',
      } as CreateFrameworkElementDto);
      const locks = queries.filter(
        (query) =>
          /for update/i.test(query.sql) &&
          /framework_elements/i.test(query.sql),
      );
      expect(locks.map((query) => query.params)).toEqual([[10]]);
      expect(flat(queries[0].sql)).toMatch(/FROM portfolios/);
    });
  });

  describe('update parent semantics', () => {
    it('moves within the same depth and portfolio and does not change the code', async () => {
      const { service, updates } = harness();
      const view = await service.updateElement(13, {
        parentId: 11,
      } as UpdateFrameworkElementDto);
      expect(view).toMatchObject({ id: 13, source: 'read' });
      expect(updates).toHaveLength(1);
      expect(updates[0].values).toMatchObject({
        parent_id: 11,
        updated_by: 42,
      });
      expect(updates[0].values).not.toHaveProperty('code');
    });

    it('does not take the portfolio lock', async () => {
      const { service, queries } = harness();
      await service.updateElement(13, {
        name: 'Renamed',
      } as UpdateFrameworkElementDto);
      expect(queries.some((query) => /from portfolios/i.test(query.sql))).toBe(
        false,
      );
      expect(flat(queries[0].sql)).toMatch(/FROM framework_elements/);
      expect(flat(queries[0].sql)).toMatch(/FOR UPDATE/);
      expect(queries[0].params).toEqual([13]);
    });

    it.each([
      ['null', null, 'an element never changes depth'],
      ['a depth-1 element', 11, 'a depth-1 element cannot have a parent'],
    ])('rejects parentId %s', async (_label, parentId, description) => {
      const { service, updates } = harness();
      const id = parentId === null ? 13 : 10;
      const error = await asHttp(
        service.updateElement(id, { parentId } as UpdateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({ description, field: 'parentId' });
      expect(updates).toHaveLength(0);
    });

    it('rejects a parent at the wrong depth', async () => {
      const { service, updates } = harness();
      const error = await asHttp(
        service.updateElement(13, {
          parentId: 22,
        } as UpdateFrameworkElementDto),
      );
      expect(payload(error)).toEqual({
        description:
          'the new parent must be at the same depth as the current one',
        field: 'parentId',
      });
      expect(updates).toHaveLength(0);
    });

    it('rejects a parent of another portfolio on a move', async () => {
      const { service, updates } = harness((world) => {
        world.elements.push(element(90, 9, 1, null, '9', 'Other area'));
      });
      const error = await asHttp(
        service.updateElement(13, {
          parentId: 90,
        } as UpdateFrameworkElementDto),
      );
      expect(payload(error)).toEqual({
        description: 'the parent belongs to another portfolio',
        field: 'parentId',
      });
      expect(updates).toHaveLength(0);
    });

    it('rejects a missing move parent with 404', async () => {
      const { service } = harness();
      const error = await asHttp(
        service.updateElement(13, {
          parentId: 999,
        } as UpdateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(404);
      expect(payload(error).field).toBe('parentId');
    });

    it('rejects a duplicate code on update', async () => {
      const { service, updates } = harness();
      const error = await asHttp(
        service.updateElement(13, { code: '1' } as UpdateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(409);
      expect(payload(error).field).toBe('code');
      expect(updates).toHaveLength(0);
    });
  });

  describe('responsibles', () => {
    it('rejects a duplicate carnet', async () => {
      const { service, inserts, queries } = harness();
      const error = await asHttp(
        service.updateElement(22, {
          responsibleCarnets: ['AA', 'aa'],
        } as UpdateFrameworkElementDto),
      );
      expect(payload(error)).toEqual({
        description: 'a responsible is listed more than once',
        field: 'responsibleCarnets',
      });
      expect(ofEntity(inserts, 'FrameworkElementResponsible')).toHaveLength(0);
      expect(
        queries.some((query) => sqlKind(query.sql) === 'delete-responsibles'),
      ).toBe(false);
    });

    it('rejects an unknown staff id', async () => {
      const { service } = harness();
      const error = await asHttp(
        service.updateElement(22, {
          responsibleCarnets: ['ZZ'],
        } as UpdateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'unknown staff id ZZ',
        field: 'responsibleCarnets',
      });
    });

    it('rejects a newly added inactive staff id', async () => {
      const { service, inserts } = harness((world) => {
        world.staff = [{ carnet: 'INACT', is_active: 0 }];
      });
      const error = await asHttp(
        service.updateElement(22, {
          responsibleCarnets: ['INACT'],
        } as UpdateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error).field).toBe('responsibleCarnets');
      expect(ofEntity(inserts, 'FrameworkElementResponsible')).toHaveLength(0);
    });

    it('keeps a responsible who is already on the element and now inactive', async () => {
      const { service, inserts } = harness((world) => {
        world.staff = [{ carnet: 'INACT', is_active: 0 }];
        world.responsibles = [{ element_id: 22, staff_carnet: 'INACT' }];
      });
      await service.updateElement(22, {
        responsibleCarnets: ['inact'],
      } as UpdateFrameworkElementDto);
      expect(
        ofEntity(inserts, 'FrameworkElementResponsible')[0].values,
      ).toMatchObject([{ staff_carnet: 'INACT', position: 0, created_by: 42 }]);
    });

    it('stores two responsibles in the chosen order', async () => {
      const { service, inserts } = harness((world) => {
        world.staff = [
          { carnet: 'IJ', is_active: 1 },
          { carnet: 'PA', is_active: 1 },
        ];
      });
      await service.updateElement(22, {
        responsibleCarnets: ['IJ', 'PA'],
      } as UpdateFrameworkElementDto);
      expect(
        ofEntity(inserts, 'FrameworkElementResponsible')[0].values,
      ).toMatchObject([
        { staff_carnet: 'IJ', position: 0 },
        { staff_carnet: 'PA', position: 1 },
      ]);
    });

    it('clears responsibles when the list is empty and leaves them when it is omitted', async () => {
      const cleared = harness((world) => {
        world.responsibles = [{ element_id: 22, staff_carnet: 'IJ' }];
      });
      await cleared.service.updateElement(22, {
        responsibleCarnets: [],
      } as UpdateFrameworkElementDto);
      expect(
        cleared.queries.some(
          (query) => sqlKind(query.sql) === 'delete-responsibles',
        ),
      ).toBe(true);
      expect(
        ofEntity(cleared.inserts, 'FrameworkElementResponsible'),
      ).toHaveLength(0);

      const kept = harness();
      await kept.service.updateElement(22, {
        name: 'Renamed',
      } as UpdateFrameworkElementDto);
      expect(
        kept.queries.some(
          (query) => sqlKind(query.sql) === 'delete-responsibles',
        ),
      ).toBe(false);
    });

    it('rejects responsibles on a non-indicator level', async () => {
      const { service, queries } = harness((world) => {
        world.staff = [{ carnet: 'IJ', is_active: 1 }];
      });
      const error = await asHttp(
        service.updateElement(13, {
          responsibleCarnets: ['IJ'],
        } as UpdateFrameworkElementDto),
      );
      expect(payload(error)).toEqual({
        description: 'responsibles belong only on the indicator level',
        field: 'responsibleCarnets',
      });
      expect(
        queries.some((query) => sqlKind(query.sql) === 'delete-responsibles'),
      ).toBe(false);
    });
  });

  describe('delete', () => {
    it('blocks on one child and uses the singular level name', async () => {
      const { service, queries } = harness((world) => {
        world.blockers = { ...emptyBlockers(), children: 1 };
      });
      const error = await asHttp(service.deleteElement(10));
      expect(error.getStatus()).toBe(409);
      expect(payload(error).blockers?.[0]).toEqual({
        reason: 'children',
        count: 1,
        wayOut: 'Delete or move its 1 Dimension first.',
      });
      expect(payload(error).description).toContain(
        'Delete or move its 1 Dimension first.',
      );
      expect(deleted(queries)).toBe(false);
      expect(log).not.toHaveBeenCalled();
    });

    it('blocks an indicator linked by one institutional objective and does not delete it', async () => {
      const { service, queries } = harness((world) => {
        world.blockers = { ...emptyBlockers(), objectives: 1 };
      });
      const error = await asHttp(service.deleteElement(22));
      expect(error.getStatus()).toBe(409);
      expect(payload(error).description).toBe(
        'Cannot delete Indicator 1.2.2: linked by 1 institutional objective. Unlink it from that institutional objective first.',
      );
      expect(payload(error).blockers?.[0].wayOut).toBe(
        'Unlink it from that institutional objective first.',
      );
      expect(deleted(queries)).toBe(false);
    });

    it('blocks on a registered provider and names that provider', async () => {
      const { service, queries } = harness((world) => {
        world.blockers = {
          ...emptyBlockers(),
          consumers: [{ consumerName: 'KPIs', count: 2 }],
        };
      });
      const error = await asHttp(service.deleteElement(22));
      expect(payload(error).blockers?.[0]).toEqual({
        reason: 'KPIs',
        count: 2,
        wayOut: 'Remove its 2 records in KPIs first.',
      });
      expect(deleted(queries)).toBe(false);
    });

    it('deletes a free element and logs level, id, code, portfolio and user', async () => {
      const { service, queries } = harness((world) => {
        world.responsibles = [{ element_id: 22, staff_carnet: 'IJ' }];
      });
      await expect(service.deleteElement(22)).resolves.toEqual({ id: 22 });
      expect(deleted(queries)).toBe(true);
      expect(log).toHaveBeenCalledWith(
        'strategy_framework.delete level=Indicator id=22 code=1.2.2 portfolio=2 user=42',
      );
    });

    it('maps a 1451 during delete to the blocker 409', async () => {
      const { service, read } = harness((world) => {
        world.deleteError = {
          errno: 1451,
          sqlMessage: 'CONSTRAINT `FK_framework_elements_parent_id`',
        };
      });
      read.getElementBlockers
        .mockResolvedValueOnce(emptyBlockers())
        .mockResolvedValueOnce({ ...emptyBlockers(), children: 2 });
      const error = await asHttp(service.deleteElement(10));
      expect(error.getStatus()).toBe(409);
      expect(payload(error).blockers?.[0]).toMatchObject({
        reason: 'children',
        count: 2,
        wayOut: 'Delete or move its 2 Dimensions first.',
      });
    });

    it('answers 404 for a missing element', async () => {
      const { service } = harness();
      const error = await asHttp(service.deleteElement(404));
      expect(error.getStatus()).toBe(404);
      expect(payload(error).field).toBe('id');
    });
  });

  describe('constraint races', () => {
    it('maps a code 1062 to 409 naming code', async () => {
      const { service, inserts } = harness((world) => {
        world.failInsert.FrameworkElement = {
          errno: 1062,
          sqlMessage:
            "Duplicate entry '2-9.9' for key 'uq_framework_elements_portfolio_code'",
        };
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          name: 'Race',
          code: '9.9',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(409);
      expect(payload(error)).toEqual({
        description: 'Code 9.9 is already used',
        field: 'code',
      });
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(1);
    });

    it('maps a level 1062 to 409 with no field', async () => {
      const { service } = harness((world) => {
        world.levels = [];
        world.elements = [];
        world.failInsert.FrameworkLevel = {
          errno: 1062,
          sqlMessage:
            "Duplicate entry for key 'uq_framework_levels_portfolio_depth'",
        };
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          name: 'First',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(409);
      expect(error.getResponse()).toEqual({
        message: { description: 'the framework changed, reload' },
      });
    });

    it('maps a parent-foreign-key 1452 to 404 parentId', async () => {
      const { service, inserts } = harness((world) => {
        world.failInsert.FrameworkElement = {
          errno: 1452,
          sqlMessage:
            'CONSTRAINT `FK_framework_elements_parent_id` FOREIGN KEY (`parent_id`)',
        };
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          parentId: 10,
          name: 'Child',
          code: '1.9',
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(404);
      expect(payload(error).field).toBe('parentId');
      expect(ofEntity(inserts, 'FrameworkElement')).toHaveLength(1);
    });

    it('maps a staff-foreign-key 1452 to 400 responsibleCarnets', async () => {
      const { service, inserts } = harness((world) => {
        world.staff = [{ carnet: 'IJ', is_active: 1 }];
        world.failInsert.FrameworkElementResponsible = {
          errno: 1452,
          driverError: {
            errno: 1452,
            sqlMessage:
              'CONSTRAINT `FK_framework_element_resp_staff_carnet` FOREIGN KEY (`staff_carnet`)',
          },
        };
      });
      const error = await asHttp(
        service.createElement({
          portfolioId: 2,
          parentId: 13,
          name: 'Owned',
          code: '1.3.9',
          responsibleCarnets: ['IJ'],
        } as CreateFrameworkElementDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error).field).toBe('responsibleCarnets');
      expect(ofEntity(inserts, 'FrameworkElementResponsible')).toHaveLength(1);
    });
  });

  describe('staff search', () => {
    it('asks for active staff only, with the ORs parenthesized, at most 20', async () => {
      const { service, dataSource } = harness();
      dataSource.query.mockResolvedValueOnce([
        {
          carnet: 'A1',
          first_name: 'Ana',
          last_name: ' Pérez ',
          email: 'a@x.org',
        },
        { carnet: 'B2', first_name: null, last_name: 'Solo', email: null },
      ]);
      await expect(service.searchStaff('pe')).resolves.toEqual([
        { carnet: 'A1', name: 'Ana Pérez', email: 'a@x.org' },
        { carnet: 'B2', name: 'Solo', email: null },
      ]);
      const sql = String(dataSource.query.mock.calls[0][0]);
      const compact = flat(sql);
      const activeAt = compact.toLowerCase().indexOf('is_active = 1');
      const openAt = compact.indexOf('(');
      const orAt = compact.indexOf(' OR ');
      expect(activeAt).toBeGreaterThan(-1);
      expect(openAt).toBeGreaterThan(activeAt);
      expect(orAt).toBeGreaterThan(openAt);
      expect(compact).toMatch(/LIMIT 20$/);
      expect(dataSource.query.mock.calls[0][1]).toEqual([
        '%pe%',
        '%pe%',
        '%pe%',
        '%pe%',
      ]);
    });

    it('escapes LIKE wildcards in the term', async () => {
      const { service, dataSource } = harness();
      await service.searchStaff('100%_');
      expect(dataSource.query.mock.calls[0][1][0]).toBe('%100\\%\\_%');
    });
  });
});

const objectiveView = (
  id: number,
  code: string,
  statement: string,
  year = 2026,
): ObjectiveView => ({
  id,
  portfolioId: 2,
  year,
  code,
  statement,
  elements: [],
  deletable: true,
  blockers: [],
});

const sourceWrite = (
  id: number,
  updates: Array<{ criteria: unknown }>,
  queries: Array<{ sql: string; params: unknown[] }>,
): boolean =>
  updates.some((row) => Number((row.criteria as { id?: unknown }).id) === id) ||
  queries.some(
    (query) =>
      /^(delete|update)\b/i.test(flat(query.sql)) &&
      query.params.some((param) => Number(param) === id),
  );

describe('StrategyFrameworkService institutional objectives (T-06)', () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
  });

  describe('create and update (A10)', () => {
    it('locks the portfolio, proposes IOB-4, and ignores another year', async () => {
      const { service, inserts, queries } = harness((world) => {
        world.objectives = [
          {
            id: 1,
            portfolio_id: 2,
            year: 2026,
            code: 'IOB-1',
            statement: 'A',
          },
          {
            id: 2,
            portfolio_id: 2,
            year: 2026,
            code: 'IOB-3',
            statement: 'C',
          },
          {
            id: 3,
            portfolio_id: 2,
            year: 2027,
            code: 'IOB-9',
            statement: 'Next year',
          },
        ];
        world.listed = [objectiveView(500, 'IOB-4', 'Grow')];
      });
      const view = await service.createObjective({
        portfolioId: 2,
        year: 2026,
        statement: 'Grow',
      } as CreateInstitutionalObjectiveDto);
      expect(view).toMatchObject({ id: 500, code: 'IOB-4' });
      expect(flat(queries[0].sql)).toBe(
        'SELECT id, start_year, end_year FROM portfolios WHERE id = ? FOR UPDATE',
      );
      expect(queries[0].params).toEqual([2]);
      expect(
        ofEntity(inserts, 'InstitutionalObjective')[0].values,
      ).toMatchObject({
        portfolio_id: 2,
        year: 2026,
        code: 'IOB-4',
        statement: 'Grow',
        created_by: 42,
      });
      expect(ofEntity(inserts, 'InstitutionalObjectiveElement')).toHaveLength(
        0,
      );
    });

    it('stores a link to an indicator of the same portfolio', async () => {
      const { service, inserts } = harness((world) => {
        world.listed = [objectiveView(500, 'IOB-1', 'Linked')];
      });
      await service.createObjective({
        portfolioId: 2,
        year: 2026,
        statement: 'Linked',
        elementIds: [22],
      } as CreateInstitutionalObjectiveDto);
      expect(
        ofEntity(inserts, 'InstitutionalObjective')[0].values,
      ).toMatchObject({ code: 'IOB-1' });
      expect(
        ofEntity(inserts, 'InstitutionalObjectiveElement')[0].values,
      ).toMatchObject({
        institutional_objective_id: 500,
        element_id: 22,
        created_by: 42,
      });
    });

    it('rejects a duplicate code in the same year and stores nothing', async () => {
      const { service, inserts } = harness((world) => {
        world.objectives = [
          {
            id: 1,
            portfolio_id: 2,
            year: 2026,
            code: 'IOB-1',
            statement: 'A',
          },
        ];
      });
      const error = await asHttp(
        service.createObjective({
          portfolioId: 2,
          year: 2026,
          statement: 'Again',
          code: 'iob-1',
        } as CreateInstitutionalObjectiveDto),
      );
      expect(error.getStatus()).toBe(409);
      expect(payload(error)).toEqual({
        description: 'Code iob-1 is already used',
        field: 'code',
      });
      expect(ofEntity(inserts, 'InstitutionalObjective')).toHaveLength(0);
    });

    it('accepts a code that exists only in another year', async () => {
      const { service, inserts } = harness((world) => {
        world.objectives = [
          {
            id: 1,
            portfolio_id: 2,
            year: 2027,
            code: 'IOB-1',
            statement: 'Next',
          },
          {
            id: 9,
            portfolio_id: 9,
            year: 2026,
            code: 'IOB-1',
            statement: 'Elsewhere',
          },
        ];
        world.listed = [objectiveView(500, 'IOB-1', 'Local')];
      });
      await service.createObjective({
        portfolioId: 2,
        year: 2026,
        statement: 'Local',
        code: 'IOB-1',
      } as CreateInstitutionalObjectiveDto);
      expect(
        ofEntity(inserts, 'InstitutionalObjective')[0].values,
      ).toMatchObject({ code: 'IOB-1', year: 2026, portfolio_id: 2 });
    });

    it('rejects a year outside the portfolio and stores nothing', async () => {
      const { service, inserts } = harness();
      const error = await asHttp(
        service.createObjective({
          portfolioId: 2,
          year: 2025,
          statement: 'Early',
        } as CreateInstitutionalObjectiveDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'year must be between 2026 and 2030',
        field: 'year',
      });
      expect(ofEntity(inserts, 'InstitutionalObjective')).toHaveLength(0);
    });

    it('rejects a link to a non-indicator element with its code and stores nothing', async () => {
      const { service, inserts } = harness();
      let thrown: unknown;
      try {
        await service.createObjective({
          portfolioId: 2,
          year: 2026,
          statement: 'Dimension',
          elementIds: [13],
        } as CreateInstitutionalObjectiveDto);
      } catch (error) {
        thrown = error;
      }
      expect(ofEntity(inserts, 'InstitutionalObjective')).toHaveLength(0);
      expect(ofEntity(inserts, 'InstitutionalObjectiveElement')).toHaveLength(
        0,
      );
      expect(thrown).toBeInstanceOf(HttpException);
      const error = thrown as HttpException;
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'linked indicators are not at the indicator level: 1.3',
        field: 'elementIds',
      });
    });

    it('rejects a link to another portfolio and names the indicator', async () => {
      const { service, inserts } = harness((world) => {
        world.elements.push(
          element(91, 2, 3, 13, '1.1.1', 'Process efficiency'),
        );
      });
      let thrown: unknown;
      try {
        await service.createObjective({
          portfolioId: 9,
          year: 2026,
          statement: 'Cross',
          elementIds: [91],
        } as CreateInstitutionalObjectiveDto);
      } catch (error) {
        thrown = error;
      }
      expect(ofEntity(inserts, 'InstitutionalObjective')).toHaveLength(0);
      expect(ofEntity(inserts, 'InstitutionalObjectiveElement')).toHaveLength(
        0,
      );
      expect(thrown).toBeInstanceOf(HttpException);
      const error = thrown as HttpException;
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'linked indicators belong to another portfolio: 1.1.1',
        field: 'elementIds',
      });
    });

    it('maps a link element_id 1452 on the link insert to 400 elementIds', async () => {
      const { service, inserts } = harness((world) => {
        world.failInsert.InstitutionalObjectiveElement = {
          errno: 1452,
          sqlMessage:
            'CONSTRAINT `FK_iob_elements_element_id` FOREIGN KEY (`element_id`)',
        };
      });
      const error = await asHttp(
        service.createObjective({
          portfolioId: 2,
          year: 2026,
          statement: 'Race',
          code: 'IOB-8',
          elementIds: [22],
        } as CreateInstitutionalObjectiveDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'an element does not exist',
        field: 'elementIds',
      });
      expect(ofEntity(inserts, 'InstitutionalObjectiveElement')).toHaveLength(
        1,
      );
    });

    it('updates the statement and leaves links when elementIds is omitted', async () => {
      const { service, queries, updates } = harness((world) => {
        world.objectives = [
          {
            id: 4,
            portfolio_id: 2,
            year: 2026,
            code: 'IOB-2',
            statement: 'Old',
          },
        ];
        world.links = [{ institutional_objective_id: 4, element_id: 22 }];
        world.listed = [objectiveView(4, 'IOB-2', 'New')];
      });
      await service.updateObjective(4, {
        statement: 'New',
      } as UpdateInstitutionalObjectiveDto);
      expect(
        queries.some(
          (query) =>
            flat(query.sql).includes('start_year') &&
            flat(query.sql).includes('FOR UPDATE'),
        ),
      ).toBe(true);
      expect(updates[0]).toMatchObject({
        entity: 'InstitutionalObjective',
        criteria: { id: 4 },
      });
      expect(updates[0].values).toMatchObject({
        statement: 'New',
        updated_by: 42,
      });
      expect(
        queries.some((query) =>
          flat(query.sql)
            .toLowerCase()
            .startsWith('delete from institutional_objective_elements'),
        ),
      ).toBe(false);
    });

    it('answers 404 when the objective is missing', async () => {
      const { service, updates } = harness();
      const error = await asHttp(
        service.updateObjective(404, {
          statement: 'Missing',
        } as UpdateInstitutionalObjectiveDto),
      );
      expect(error.getStatus()).toBe(404);
      expect(payload(error).field).toBe('id');
      expect(updates).toEqual([]);
    });
  });

  describe('delete (R-STF-006)', () => {
    it('deletes a free objective and logs code, portfolio, year and user', async () => {
      const { service, queries } = harness((world) => {
        world.objectives = [
          {
            id: 6,
            portfolio_id: 2,
            year: 2026,
            code: 'IOB-6',
            statement: 'Gone',
          },
        ];
      });
      await expect(service.deleteObjective(6)).resolves.toEqual({ id: 6 });
      expect(
        queries.some((query) =>
          flat(query.sql)
            .toLowerCase()
            .startsWith('delete from institutional_objectives'),
        ),
      ).toBe(true);
      expect(log).toHaveBeenCalledWith(
        'strategy_framework.delete objective id=6 code=IOB-6 portfolio=2 year=2026 user=42',
      );
    });

    it('blocks an IOB delete when a provider counts the objective and issues no delete', async () => {
      const registry = new FrameworkUsageRegistry();
      const countByObjectiveIds = jest.fn(async (ids: number[]) =>
        Object.fromEntries(ids.map((id) => [id, 1])),
      );
      const countByElementIds = jest.fn(async () => ({ 6: 4 }));
      registry.register({
        consumerName: 'notes',
        label: 'Notes',
        countByElementIds,
      });
      registry.register({
        consumerName: 'KPIs',
        label: 'KPIs',
        countByObjectiveIds,
      });
      const read = new FrameworkReadService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        registry,
      );
      const { service, queries } = harness((world) => {
        world.objectives = [
          {
            id: 6,
            portfolio_id: 2,
            year: 2026,
            code: 'IOB-6',
            statement: 'Held',
          },
        ];
      }, read);
      const error = await asHttp(service.deleteObjective(6));
      expect(error.getStatus()).toBe(409);
      expect(payload(error)).toEqual({
        description:
          'Cannot delete IOB-6: used by 1 record in KPIs. Remove its 1 record in KPIs first.',
        blockers: [
          {
            reason: 'KPIs',
            count: 1,
            wayOut: 'Remove its 1 record in KPIs first.',
          },
        ],
      });
      expect(countByObjectiveIds).toHaveBeenCalledWith([6]);
      expect(countByElementIds).not.toHaveBeenCalled();
      expect(
        queries.some((query) =>
          flat(query.sql)
            .toLowerCase()
            .startsWith('delete from institutional_objectives'),
        ),
      ).toBe(false);
    });
  });

  describe('carry forward (A11, R-STF-010)', () => {
    const source = (
      id: number,
      code: string,
      statement: string,
      year = 2026,
    ): ObjectiveRow => ({
      id,
      portfolio_id: 2,
      year,
      code,
      statement,
    });

    it('rejects the last year with 400 and writes nothing', async () => {
      const { service, inserts, updates } = harness((world) => {
        world.objectives = [source(1, 'IOB-1', 'Last', 2030)];
      });
      const error = await asHttp(
        service.carryForward({
          portfolioId: 2,
          fromYear: 2030,
        } as CarryForwardObjectivesDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'the next year is outside the portfolio',
        field: 'fromYear',
      });
      expect(inserts).toHaveLength(0);
      expect(updates).toEqual([]);
    });

    it('rejects an empty year with 400 and writes nothing', async () => {
      const { service, inserts, updates } = harness();
      const error = await asHttp(
        service.carryForward({
          portfolioId: 2,
          fromYear: 2026,
        } as CarryForwardObjectivesDto),
      );
      expect(error.getStatus()).toBe(400);
      expect(payload(error)).toEqual({
        description: 'the year has no institutional objectives',
        field: 'fromYear',
      });
      expect(inserts).toHaveLength(0);
      expect(updates).toEqual([]);
    });

    it('rejects a target year that already has objectives and writes nothing', async () => {
      const { service, inserts, updates, queries } = harness((world) => {
        world.objectives = [
          source(1, 'IOB-1', 'One'),
          source(8, 'IOB-1', 'Already', 2027),
        ];
      });
      let thrown: unknown;
      try {
        await service.carryForward({
          portfolioId: 2,
          fromYear: 2026,
        } as CarryForwardObjectivesDto);
      } catch (error) {
        thrown = error;
      }
      expect(inserts).toHaveLength(0);
      expect(updates).toEqual([]);
      expect(
        queries.some((query) => /^(delete|update)\b/i.test(flat(query.sql))),
      ).toBe(false);
      expect(thrown).toBeInstanceOf(HttpException);
      const error = thrown as HttpException;
      expect(error.getStatus()).toBe(409);
      expect(payload(error)).toEqual({
        description: 'the target year already has institutional objectives',
      });
    });

    it('copies codes and links and does not update or delete the source rows', async () => {
      const { service, inserts, updates, queries } = harness((world) => {
        world.objectives = [
          source(1, 'IOB-1', 'One'),
          source(2, 'IOB-6', 'Six'),
        ];
        world.links = [
          { institutional_objective_id: 1, element_id: 22 },
          { institutional_objective_id: 2, element_id: 22 },
        ];
      });
      await expect(
        service.carryForward({
          portfolioId: 2,
          fromYear: 2026,
        } as CarryForwardObjectivesDto),
      ).resolves.toEqual({ fromYear: 2026, toYear: 2027, copied: 2 });
      expect(
        ofEntity(inserts, 'InstitutionalObjective').map((row) => row.values),
      ).toEqual([
        expect.objectContaining({
          portfolio_id: 2,
          year: 2027,
          code: 'IOB-1',
          statement: 'One',
          created_by: 42,
        }),
        expect.objectContaining({
          portfolio_id: 2,
          year: 2027,
          code: 'IOB-6',
          statement: 'Six',
          created_by: 42,
        }),
      ]);
      expect(
        ofEntity(inserts, 'InstitutionalObjectiveElement').map(
          (row) => row.values,
        ),
      ).toEqual([
        expect.objectContaining({
          institutional_objective_id: 500,
          element_id: 22,
          created_by: 42,
        }),
        expect.objectContaining({
          institutional_objective_id: 501,
          element_id: 22,
          created_by: 42,
        }),
      ]);
      expect(sourceWrite(1, updates, queries)).toBe(false);
      expect(sourceWrite(2, updates, queries)).toBe(false);
      expect(log).toHaveBeenCalledWith(
        'strategy_framework.carry_forward fromYear=2026 toYear=2027 copied=2 portfolio=2 user=42',
      );
    });

    it('maps a 1062 during the copy to the same 409 and does not log', async () => {
      const { service } = harness((world) => {
        world.objectives = [source(1, 'IOB-1', 'One')];
        world.failInsert.InstitutionalObjective = {
          errno: 1062,
          sqlMessage:
            "Duplicate entry '2-2027-IOB-1' for key 'uq_iob_portfolio_year_code'",
        };
      });
      const error = await asHttp(
        service.carryForward({
          portfolioId: 2,
          fromYear: 2026,
        } as CarryForwardObjectivesDto),
      );
      expect(error.getStatus()).toBe(409);
      expect(payload(error)).toEqual({
        description: 'the target year already has institutional objectives',
      });
      expect(log).not.toHaveBeenCalled();
    });
  });
});
