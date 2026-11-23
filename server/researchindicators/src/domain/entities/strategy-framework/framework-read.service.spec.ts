import 'reflect-metadata';
import { NotFoundException, Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FrameworkReadService } from './framework-read.service';
import { FrameworkUsageRegistry } from './framework-usage.registry';
import { FrameworkElementRepository } from './repositories/framework-element.repository';
import { FrameworkElementResponsibleRepository } from './repositories/framework-element-responsible.repository';
import { FrameworkLevelRepository } from './repositories/framework-level.repository';
import { InstitutionalObjectiveElementRepository } from './repositories/institutional-objective-element.repository';
import { InstitutionalObjectiveRepository } from './repositories/institutional-objective.repository';
import { PortfolioLookupRepository } from './repositories/portfolio-lookup.repository';
import { StrategyFrameworkModule } from './strategy-framework.module';

/**
 * T-07. Unit seams are the read service and the registry. Repositories are
 * mocked, so these tests cannot see the SQL TypeORM would emit for `find`,
 * nor what MySQL returns. Queries the service writes itself are asserted
 * as the SQL text passed to `query`.
 */

const EDITOR_KEYS = [
  'usage',
  'deletable',
  'blockers',
  'usageLabels',
  'virtual',
];

const unwrap = (value: unknown): number[] => {
  if (value && typeof value === 'object' && '_value' in value) {
    const inner = (value as { _value: unknown })._value;
    return Array.isArray(inner)
      ? inner.map((item) => Number(item))
      : [Number(inner)];
  }
  return [Number(value)];
};

const portfolioRow = (
  id: number,
  start: number,
  end: number,
  isActive: number | boolean = 1,
  name = `Portfolio ${id}`,
) => ({
  id,
  name,
  start_year: start,
  end_year: end,
  is_active: isActive,
});

describe('FrameworkReadService', () => {
  const create = () => {
    const lookup = {
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
    };
    const levels = { find: jest.fn().mockResolvedValue([]) };
    const elements = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
    };
    const responsibles = { query: jest.fn().mockResolvedValue([]) };
    const objectives = {
      find: jest.fn().mockResolvedValue([]),
      query: jest.fn().mockResolvedValue([]),
    };
    const links = { query: jest.fn().mockResolvedValue([]) };
    const registry = new FrameworkUsageRegistry();
    const service = new FrameworkReadService(
      lookup as never,
      levels as never,
      elements as never,
      responsibles as never,
      objectives as never,
      links as never,
      registry,
    );
    return {
      lookup,
      levels,
      elements,
      responsibles,
      objectives,
      links,
      registry,
      service,
    };
  };

  describe('module scope', () => {
    it('is the default scope, not request scope', () => {
      expect(
        Reflect.getMetadata('scope:options', FrameworkReadService)?.scope ??
          Scope.DEFAULT,
      ).toBe(Scope.DEFAULT);
    });

    it('reads portfolios through PortfolioLookupRepository, not PortfoliosService', () => {
      const names = (
        (Reflect.getMetadata('design:paramtypes', FrameworkReadService) ??
          []) as Array<{ name?: string }>
      ).map((type) => type?.name);
      expect(names).toEqual([
        'PortfolioLookupRepository',
        'FrameworkLevelRepository',
        'FrameworkElementRepository',
        'FrameworkElementResponsibleRepository',
        'InstitutionalObjectiveRepository',
        'InstitutionalObjectiveElementRepository',
        'FrameworkUsageRegistry',
      ]);
      expect(names).not.toContain('PortfoliosService');
      expect(names).not.toContain('CurrentUserUtil');
    });

    it('instantiates outside a request and resolves the same singleton twice', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          FrameworkReadService,
          FrameworkUsageRegistry,
          { provide: PortfolioLookupRepository, useValue: {} },
          { provide: FrameworkLevelRepository, useValue: {} },
          { provide: FrameworkElementRepository, useValue: {} },
          { provide: FrameworkElementResponsibleRepository, useValue: {} },
          { provide: InstitutionalObjectiveRepository, useValue: {} },
          { provide: InstitutionalObjectiveElementRepository, useValue: {} },
        ],
      }).compile();

      const first = moduleRef.get(FrameworkReadService);
      const second = moduleRef.get(FrameworkReadService);
      expect(first).toBeInstanceOf(FrameworkReadService);
      expect(second).toBe(first);
      await moduleRef.close();
    });

    it('exports the read service and the registry from the module', () => {
      expect(Reflect.getMetadata('providers', StrategyFrameworkModule)).toEqual(
        expect.arrayContaining([FrameworkReadService, FrameworkUsageRegistry]),
      );
      expect(Reflect.getMetadata('exports', StrategyFrameworkModule)).toEqual(
        expect.arrayContaining([FrameworkReadService, FrameworkUsageRegistry]),
      );
    });
  });

  describe('A0 context (design 5.1, R-STF-015 AC.2)', () => {
    const rows = [
      portfolioRow(1, 2018, 2022),
      portfolioRow(2, 2026, 2030, 1, 'Portfolio 2'),
      portfolioRow(3, 2028, 2032, 1, 'Portfolio 3'),
      portfolioRow(4, 2035, 2040),
      portfolioRow(5, 2028, 2032, 1, 'Portfolio 5'),
      portfolioRow(8, 2030, 2034, false, 'Inactive boolean'),
      portfolioRow(9, 2029, 2034, 0, 'Inactive overlap'),
    ];

    const context = async (year: number) => {
      const { lookup, elements, service } = create();
      lookup.findAll.mockResolvedValue(rows);
      elements.query.mockResolvedValue([{ portfolio_id: '2', n: '7' }]);
      return service.getContext(new Date(Date.UTC(year, 6, 1)));
    };

    it.each([
      [2026, 2],
      [2027, 2],
      [2029, 3],
      [2030, 3],
      [2033, 3],
      [2010, 1],
      [2036, 4],
    ])(
      'year %s selects portfolio %s (overlap, tie, gap, none)',
      async (year, expected) => {
        const view = await context(year);
        expect(view.defaultPortfolioId).toBe(expected);
        expect(view.currentYear).toBe(year);
      },
    );

    it('lists active portfolios only and marks configured from element counts', async () => {
      const view = await context(2027);
      expect(view.portfolios.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
      expect(view.portfolios.find((row) => row.id === 2)).toEqual({
        id: 2,
        name: 'Portfolio 2',
        startYear: 2026,
        endYear: 2030,
        configured: true,
      });
      expect(view.portfolios.find((row) => row.id === 1)?.configured).toBe(
        false,
      );
    });

    it('uses the UTC year, so a January instant that is still the previous local year stays in the UTC year', async () => {
      const { lookup, elements, service } = create();
      lookup.findAll.mockResolvedValue(rows);
      elements.query.mockResolvedValue([]);
      const view = await service.getContext(new Date('2028-01-01T03:00:00Z'));
      expect(view.currentYear).toBe(2028);
      expect(view.defaultPortfolioId).toBe(3);
    });

    it('returns a null default when every portfolio is inactive', async () => {
      const { lookup, service } = create();
      lookup.findAll.mockResolvedValue([portfolioRow(9, 2026, 2030, 0)]);
      const view = await service.getContext(new Date(Date.UTC(2027, 6, 1)));
      expect(view.portfolios).toEqual([]);
      expect(view.defaultPortfolioId).toBeNull();
    });
  });

  describe('A1 and A1e', () => {
    const levelRows = [
      {
        id: 104,
        portfolio_id: 2,
        depth: 4,
        name: 'Workstream',
        plural_name: 'Workstreams',
        short_label: 'WORKSTREAM',
        is_indicator_level: 0,
      },
      {
        id: 103,
        portfolio_id: 2,
        depth: 3,
        name: 'Indicator',
        plural_name: 'Indicators',
        short_label: 'INDICATOR',
        is_indicator_level: 1,
      },
      {
        id: 102,
        portfolio_id: 2,
        depth: 2,
        name: 'Dimension',
        plural_name: 'Dimensions',
        short_label: 'DIMENSION',
        is_indicator_level: 0,
      },
      {
        id: 101,
        portfolio_id: 2,
        depth: 1,
        name: 'Performance Area',
        plural_name: 'Performance Areas',
        short_label: 'AREA',
        is_indicator_level: 0,
      },
    ];

    const elementRows = [
      {
        id: 7,
        portfolio_id: 2,
        level_id: 103,
        parent_id: 3,
        code: '1.2.2',
        name: 'Indicator Two',
        description: null,
      },
      {
        id: 6,
        portfolio_id: 2,
        level_id: '104',
        parent_id: 5,
        code: '1.2.1.1',
        name: 'Workstream One',
        description: null,
      },
      {
        id: 4,
        portfolio_id: 2,
        level_id: 102,
        parent_id: 1,
        code: '1.10',
        name: 'Dimension Ten',
        description: null,
      },
      {
        id: 2,
        portfolio_id: 2,
        level_id: 101,
        parent_id: null,
        code: '10',
        name: 'Area Ten',
        description: null,
      },
      {
        id: 5,
        portfolio_id: 2,
        level_id: 103,
        parent_id: '3',
        code: '1.2.1',
        name: 'Indicator One',
        description: 'Owned',
      },
      {
        id: 3,
        portfolio_id: 2,
        level_id: 102,
        parent_id: '1',
        code: '1.2',
        name: 'Dimension Two',
        description: null,
      },
      {
        id: 1,
        portfolio_id: 2,
        level_id: 101,
        parent_id: null,
        code: '1',
        name: 'Area One',
        description: 'The area',
      },
    ];

    const install = (
      deps: ReturnType<typeof create>,
      counts: Record<number, number> = { 5: 2, 6: 1 },
    ) => {
      deps.lookup.findById.mockResolvedValue(portfolioRow(2, 2026, 2030));
      deps.levels.find.mockImplementation(
        async (options?: { where?: Record<string, unknown> }) => {
          const where = options?.where ?? {};
          if (where.portfolio_id !== undefined) {
            const ids = new Set(unwrap(where.portfolio_id));
            return levelRows.filter((row) => ids.has(Number(row.portfolio_id)));
          }
          if (where.id !== undefined) {
            const ids = new Set(unwrap(where.id));
            return levelRows.filter((row) => ids.has(Number(row.id)));
          }
          return levelRows;
        },
      );
      deps.elements.find.mockImplementation(
        async (options?: { where?: Record<string, unknown> }) => {
          const where = options?.where ?? {};
          if (where.id !== undefined) {
            const ids = new Set(unwrap(where.id));
            return elementRows.filter((row) => ids.has(Number(row.id)));
          }
          if (where.portfolio_id !== undefined) {
            const ids = new Set(unwrap(where.portfolio_id));
            return elementRows.filter((row) =>
              ids.has(Number(row.portfolio_id)),
            );
          }
          return elementRows;
        },
      );
      deps.elements.findOne.mockImplementation(
        async (options?: { where?: { id?: number } }) => {
          return (
            elementRows.find((row) => Number(row.id) === options?.where?.id) ??
            null
          );
        },
      );
      deps.responsibles.query.mockResolvedValue([
        {
          element_id: 5,
          staff_carnet: 'B1',
          position: 2,
          first_name: 'Bea',
          last_name: 'Stone',
          email: 'bea@alliance.org',
          is_active: 0,
        },
        {
          element_id: 5,
          staff_carnet: 'A1',
          position: 1,
          first_name: ' Ana ',
          last_name: 'Diaz',
          email: 'ana@alliance.org',
          is_active: 1,
        },
      ]);
      deps.links.query.mockImplementation(async (sql: string) => {
        if (String(sql).includes('GROUP BY element_id')) {
          return [{ element_id: '5', n: '1' }];
        }
        return [];
      });
      const countByElementIds = jest.fn(async (_ids: number[]) => counts);
      deps.registry.register({
        consumerName: 'kpi.records',
        label: 'KPIs',
        countByElementIds,
      });
      deps.registry.register({
        consumerName: 'dashboards',
        label: 'Dashboards',
        countByObjectiveIds: jest.fn(async () => ({})),
      });
      return countByElementIds;
    };

    const byCode = <T extends { code: string }>(rows: T[], code: string): T => {
      const found = rows.find((row) => row.code === code);
      if (!found) throw new Error(`missing ${code}`);
      return found;
    };

    it('A1 derives a fourth level from the rows and sorts codes naturally', async () => {
      const deps = create();
      const countByElementIds = install(deps);
      const view = await deps.service.getFramework(2);

      expect(view.portfolioId).toBe(2);
      expect(view.configured).toBe(true);
      expect(view.levels.map((level) => level.name)).toEqual([
        'Performance Area',
        'Dimension',
        'Indicator',
        'Workstream',
      ]);
      expect(view.levels.map((level) => level.isIndicatorLevel)).toEqual([
        false,
        false,
        true,
        false,
      ]);
      expect(view.elements.map((element) => element.code)).toEqual([
        '1',
        '1.2',
        '1.2.1',
        '1.2.1.1',
        '1.2.2',
        '1.10',
        '10',
      ]);
      expect(byCode(view.elements, '1').descendantCounts).toEqual({
        2: 2,
        3: 2,
        4: 1,
      });
      expect(byCode(view.elements, '1.2').descendantCounts).toEqual({
        3: 2,
        4: 1,
      });
      expect(byCode(view.elements, '1.2.1')).toMatchObject({
        parentId: 3,
        depth: 3,
        levelId: 103,
        description: 'Owned',
        responsibles: [
          {
            carnet: 'A1',
            name: 'Ana Diaz',
            email: 'ana@alliance.org',
            isActiveStaff: true,
          },
          {
            carnet: 'B1',
            name: 'Bea Stone',
            email: 'bea@alliance.org',
            isActiveStaff: false,
          },
        ],
      });
      expect(byCode(view.elements, '1.2.1.1')).toMatchObject({
        id: 6,
        depth: 4,
        levelId: 104,
        parentId: 5,
      });
      expect(byCode(view.elements, '1.2')).not.toHaveProperty('responsibles');
      expect(byCode(view.elements, '1.2.2').responsibles).toEqual([]);
      expect(countByElementIds).not.toHaveBeenCalled();
      expect(deps.links.query).not.toHaveBeenCalled();
      expect(deps.responsibles.query).toHaveBeenCalledTimes(1);
      expect(deps.responsibles.query.mock.calls[0][1]).toEqual([5, 7]);
      expect(String(deps.responsibles.query.mock.calls[0][0])).toContain(
        'alliance_user_staff',
      );
    });

    it('A1 has no editor fields', async () => {
      const deps = create();
      install(deps);
      const view = await deps.service.getFramework(2);

      expect(view).not.toHaveProperty('usageLabels');
      for (const element of view.elements) {
        expect(element).not.toHaveProperty('usage');
        expect(element).not.toHaveProperty('deletable');
        expect(element).not.toHaveProperty('blockers');
      }
      for (const level of view.levels) {
        expect(level).not.toHaveProperty('virtual');
      }
      const walk = (value: unknown): void => {
        if (Array.isArray(value)) {
          value.forEach(walk);
          return;
        }
        if (value !== null && typeof value === 'object') {
          for (const key of Object.keys(value as object)) {
            expect(EDITOR_KEYS).not.toContain(key);
            walk((value as Record<string, unknown>)[key]);
          }
        }
      };
      walk(view);
    });

    it('A1 of a level-less portfolio returns empty lists', async () => {
      const deps = create();
      deps.lookup.findById.mockResolvedValue(portfolioRow(4, 2035, 2040));
      const view = await deps.service.getFramework(4);
      expect(view).toEqual({
        portfolioId: 4,
        configured: false,
        levels: [],
        elements: [],
      });
    });

    it('A1 of a portfolio with levels and no elements returns the stored levels', async () => {
      const deps = create();
      deps.lookup.findById.mockResolvedValue(portfolioRow(4, 2035, 2040));
      deps.levels.find.mockResolvedValue([
        {
          id: 9,
          portfolio_id: 4,
          depth: 1,
          name: 'Theme',
          plural_name: 'Themes',
          short_label: 'THEME',
          is_indicator_level: 0,
        },
      ]);
      const view = await deps.service.getFramework(4);
      expect(view.configured).toBe(false);
      expect(view.elements).toEqual([]);
      expect(view.levels).toEqual([
        {
          id: 9,
          depth: 1,
          name: 'Theme',
          pluralName: 'Themes',
          shortLabel: 'THEME',
          isIndicatorLevel: false,
        },
      ]);
    });

    it('A1e uses virtual default levels when the portfolio has none', async () => {
      const deps = create();
      deps.lookup.findById.mockResolvedValue(portfolioRow(4, 2035, 2040));
      const view = await deps.service.getEditor(4);
      expect(view.elements).toEqual([]);
      expect(view.levels.map((level) => level.name)).toEqual([
        'Performance Area',
        'Dimension',
        'Indicator',
      ]);
      expect(view.levels.every((level) => level.virtual === true)).toBe(true);
      expect(view.levels.every((level) => !('id' in level))).toBe(true);
      expect(view.levels[0]).toMatchObject({
        name: 'Performance Area',
        pluralName: 'Performance Areas',
        shortLabel: 'AREA',
        isIndicatorLevel: false,
      });
      expect(view.levels[2].isIndicatorLevel).toBe(true);
    });

    it('A1e keeps stored levels when the portfolio has levels and no elements', async () => {
      const deps = create();
      deps.lookup.findById.mockResolvedValue(portfolioRow(4, 2035, 2040));
      deps.levels.find.mockResolvedValue([
        {
          id: 9,
          portfolio_id: 4,
          depth: 1,
          name: 'Theme',
          plural_name: 'Themes',
          short_label: 'THEME',
          is_indicator_level: 0,
        },
      ]);
      const view = await deps.service.getEditor(4);
      expect(view.elements).toEqual([]);
      expect(view.levels).toEqual([
        {
          id: 9,
          depth: 1,
          name: 'Theme',
          pluralName: 'Themes',
          shortLabel: 'THEME',
          isIndicatorLevel: false,
        },
      ]);
    });

    it("a provider's count shows on A1e and blocks, with singular way-outs at N = 1", async () => {
      const deps = create();
      const countByElementIds = install(deps);
      const view = await deps.service.getEditor(2);

      expect(countByElementIds).toHaveBeenCalledTimes(1);
      expect(
        countByElementIds.mock.calls[0][0].slice().sort((a, b) => a - b),
      ).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(view.usageLabels).toEqual([
        { consumerName: 'kpi.records', label: 'KPIs' },
      ]);

      const area = byCode(view.elements, '1');
      expect(area.usage).toEqual({ 'kpi.records': 0 });
      expect(area.deletable).toBe(false);
      expect(area.blockers).toEqual([
        {
          reason: 'children',
          count: 2,
          wayOut: 'Delete or move its 2 Dimensions first.',
        },
      ]);

      const dimension = byCode(view.elements, '1.2');
      expect(dimension.blockers).toEqual([
        {
          reason: 'children',
          count: 2,
          wayOut: 'Delete or move its 2 Indicators first.',
        },
      ]);

      const indicator = byCode(view.elements, '1.2.1');
      expect(indicator.deletable).toBe(false);
      expect(indicator.usage).toEqual({ 'kpi.records': 2 });
      expect(indicator.blockers).toEqual([
        {
          reason: 'children',
          count: 1,
          wayOut: 'Delete or move its 1 Workstream first.',
        },
        {
          reason: 'objectives',
          count: 1,
          wayOut: 'Unlink it from that institutional objective first.',
        },
        {
          reason: 'kpi.records',
          count: 2,
          wayOut: 'Remove its 2 records in kpi.records first.',
        },
      ]);

      const workstream = byCode(view.elements, '1.2.1.1');
      expect(workstream.blockers).toEqual([
        {
          reason: 'kpi.records',
          count: 1,
          wayOut: 'Remove its 1 record in kpi.records first.',
        },
      ]);

      const free = byCode(view.elements, '1.10');
      expect(free.deletable).toBe(true);
      expect(free.blockers).toEqual([]);
      expect(free.usage).toEqual({ 'kpi.records': 0 });
      expect(free).not.toHaveProperty('usageLabels');
    });

    it('A8 projects the same blockers, and a free element has empty counts', async () => {
      const deps = create();
      install(deps);
      await expect(deps.service.getElementBlockers(5)).resolves.toEqual({
        children: 1,
        objectives: 1,
        consumers: [{ consumerName: 'kpi.records', count: 2 }],
        wayOut: [
          'Delete or move its 1 Workstream first.',
          'Unlink it from that institutional objective first.',
          'Remove its 2 records in kpi.records first.',
        ],
      });
      await expect(deps.service.getElementBlockers(4)).resolves.toEqual({
        children: 0,
        objectives: 0,
        consumers: [],
        wayOut: [],
      });
    });

    it('404s a missing portfolio and a missing element, and still reads an inactive portfolio', async () => {
      const deps = create();
      deps.lookup.findById.mockResolvedValue(null);
      await expect(deps.service.getFramework(8)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(deps.service.getFramework(8)).rejects.toMatchObject({
        response: {
          message: { description: 'Portfolio not found', field: 'portfolioId' },
        },
      });
      expect(deps.elements.find).not.toHaveBeenCalled();

      deps.lookup.findById.mockResolvedValue(portfolioRow(7, 2010, 2012, 0));
      await expect(deps.service.getFramework(7)).resolves.toEqual({
        portfolioId: 7,
        configured: false,
        levels: [],
        elements: [],
      });

      deps.elements.findOne.mockResolvedValue(null);
      await expect(deps.service.getElementBlockers(99)).rejects.toMatchObject({
        response: {
          message: { description: 'Element not found', field: 'id' },
        },
      });
    });
  });

  describe('A2 resolve', () => {
    it('returns A1 rows in request order and marks missing ids', async () => {
      const deps = create();
      const levelRows = [
        {
          id: 101,
          portfolio_id: 2,
          depth: 1,
          name: 'Performance Area',
          plural_name: 'Performance Areas',
          short_label: 'AREA',
          is_indicator_level: 0,
        },
        {
          id: 102,
          portfolio_id: 2,
          depth: 2,
          name: 'Dimension',
          plural_name: 'Dimensions',
          short_label: 'DIMENSION',
          is_indicator_level: 0,
        },
      ];
      const elementRows = [
        {
          id: 1,
          portfolio_id: 2,
          level_id: 101,
          parent_id: null,
          code: '1',
          name: 'Area',
          description: null,
        },
        {
          id: 3,
          portfolio_id: 2,
          level_id: 102,
          parent_id: 1,
          code: '1.2',
          name: 'Dimension',
          description: null,
        },
      ];
      deps.levels.find.mockImplementation(async () => levelRows);
      deps.elements.find.mockImplementation(
        async (options?: { where?: Record<string, unknown> }) => {
          const where = options?.where ?? {};
          if (where.id !== undefined) {
            const ids = new Set(unwrap(where.id));
            return elementRows.filter((row) => ids.has(Number(row.id)));
          }
          return elementRows;
        },
      );

      const rows = await deps.service.resolve([1, 99, 1]);
      expect(
        rows.map((row) => ('missing' in row ? 'missing' : row.code)),
      ).toEqual(['1', 'missing', '1']);
      expect(rows[0]).toMatchObject({
        id: 1,
        descendantCounts: { 2: 1 },
      });
      expect(rows[0]).not.toHaveProperty('usage');
      expect(rows[1]).toEqual({ id: 99, missing: true });
      expect(deps.responsibles.query).not.toHaveBeenCalled();
    });

    it('rejects more than 200 ids and does not query', async () => {
      const deps = create();
      const ids = Array.from({ length: 201 }, (_, index) => index + 1);
      await expect(deps.service.resolve(ids)).rejects.toMatchObject({
        response: { message: { field: 'ids' } },
      });
      expect(deps.elements.find).not.toHaveBeenCalled();
    });

    it('returns an empty list for no ids', async () => {
      const deps = create();
      await expect(deps.service.resolve([])).resolves.toEqual([]);
      expect(deps.elements.find).not.toHaveBeenCalled();
    });
  });

  describe('A9 default year (R-STF-009)', () => {
    const install = () => {
      const deps = create();
      deps.lookup.findById.mockResolvedValue(portfolioRow(2, 2026, 2030));
      deps.objectives.query.mockResolvedValue([{ year: '2026', n: '28' }]);
      return deps;
    };

    it.each([
      [2028, 2028],
      [2024, 2026],
      [2033, 2026],
    ])('as-of %s → defaultYear %s', async (year, expected) => {
      const deps = install();
      const view = await deps.service.getObjectiveYears(
        2,
        new Date(Date.UTC(year, 6, 1)),
      );
      expect(view.defaultYear).toBe(expected);
      expect(view.years).toHaveLength(5);
      expect(view.years[0]).toEqual({ year: 2026, count: 28 });
      expect(view.years[1]).toEqual({ year: 2027, count: 0 });
      expect(view.years[4]).toEqual({ year: 2030, count: 0 });
      expect(deps.objectives.query).toHaveBeenCalledTimes(1);
    });

    it('400s a year outside the portfolio and lists objectives inside it', async () => {
      const deps = install();
      await expect(deps.service.listObjectives(2, 2025)).rejects.toMatchObject({
        response: {
          message: {
            field: 'year',
            description: 'year must be between 2026 and 2030',
          },
        },
      });
      expect(deps.objectives.find).not.toHaveBeenCalled();

      deps.objectives.find.mockResolvedValue([
        {
          id: 12,
          portfolio_id: 2,
          year: 2026,
          code: 'IOB-10',
          statement: 'Later',
        },
        {
          id: 11,
          portfolio_id: 2,
          year: 2026,
          code: 'IOB-2',
          statement: 'Earlier',
        },
      ]);
      deps.links.query.mockResolvedValue([
        {
          institutional_objective_id: 11,
          id: 4,
          code: '1.10',
          name: 'Ten',
        },
        {
          institutional_objective_id: 11,
          id: 3,
          code: '1.2',
          name: 'Two',
        },
      ]);
      deps.registry.register({
        consumerName: 'dashboards',
        label: 'Dashboards',
        countByObjectiveIds: async () => ({ 12: 1 }),
      });

      const rows = await deps.service.listObjectives(2, 2026);
      expect(rows.map((row) => row.code)).toEqual(['IOB-2', 'IOB-10']);
      expect(rows[0].elements.map((element) => element.code)).toEqual([
        '1.2',
        '1.10',
      ]);
      expect(rows[0].deletable).toBe(true);
      expect(rows[0].blockers).toEqual([]);
      expect(rows[0]).not.toHaveProperty('owner');
      expect(rows[0]).not.toHaveProperty('responsible');
      expect(rows[1].deletable).toBe(false);
      expect(rows[1].blockers).toEqual([
        {
          reason: 'dashboards',
          count: 1,
          wayOut: 'Remove its 1 record in dashboards first.',
        },
      ]);
    });
  });
});
