import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Brackets, DataSource, FindOperator } from 'typeorm';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { ControlListValuePortfolioRepository } from './repositories/control-list-value-portfolio.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ControlListUsageRegistry } from './control-list-usage.registry';
import { ControlListCategory } from './entities/control-list-category.entity';
import { ControlList } from './entities/control-list.entity';
import { ControlListValue } from './entities/control-list-value.entity';
import { ControlListValuePortfolio } from './entities/control-list-value-portfolio.entity';
import { Portfolio } from '../portfolios/entities/portfolio.entity';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { CreateControlListDto } from './dto/create-control-list.dto';
import { CreateControlListValueDto } from './dto/create-control-list-value.dto';
import { LoggerUtil } from '../../shared/utils/logger.util';

describe('ControlListsService', () => {
  let service: ControlListsService;

  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockCount = jest.fn();
  const mockSave = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();

  const mockCategoryRepository = {
    find: mockFind,
    findOne: mockFindOne,
    count: mockCount,
    save: mockSave,
    update: mockUpdate,
    delete: mockDelete,
  };

  const mockListFind = jest.fn();
  const mockListFindOne = jest.fn();
  const mockListSave = jest.fn();
  const mockListUpdate = jest.fn();
  const mockListDelete = jest.fn();

  const mockListRepository = {
    find: mockListFind,
    findOne: mockListFindOne,
    save: mockListSave,
    update: mockListUpdate,
    delete: mockListDelete,
  };

  const mockValueFind = jest.fn();
  const mockValueFindOne = jest.fn();
  const mockValueCount = jest.fn();
  const mockValueSave = jest.fn();
  const mockValueUpdate = jest.fn();
  const mockValueDelete = jest.fn();

  const mockValueCreateQueryBuilder = jest.fn();

  const mockValueRepository = {
    find: mockValueFind,
    findOne: mockValueFindOne,
    count: mockValueCount,
    save: mockValueSave,
    update: mockValueUpdate,
    delete: mockValueDelete,
    createQueryBuilder: mockValueCreateQueryBuilder,
  };

  // R-CLG-009 (T-02): A13's single query. This chainable double records the
  // calls and returns canned rows; it can show PLUMBING (which clauses are
  // added, in which situations) but NEVER the operator precedence of the
  // generated SQL — that is proven on a real MySQL in
  // `test/control-lists-applies-to.integration-spec.ts` (KZ-001, KZ-017).
  const mockQbWhere = jest.fn();
  const mockQbAndWhere = jest.fn();
  const mockQbGetMany = jest.fn();
  const queryBuilder = {
    where: mockQbWhere,
    andWhere: mockQbAndWhere,
    getMany: mockQbGetMany,
  };

  // The link table, read through its own repository (A9/A10/A11/A13 batch).
  const mockLinkFind = jest.fn();
  const mockLinkRepository = { find: mockLinkFind };

  // Portfolios are read directly (D-CLG-13): `find` for the batch lookups,
  // `findOne` for the A13 filter.
  const mockPortfolioFind = jest.fn();
  const mockPortfolioFindOne = jest.fn();
  const mockPortfolioRepository = {
    find: mockPortfolioFind,
    findOne: mockPortfolioFindOne,
  };

  // design §5 rule 4: value + links are written through the TRANSACTION's
  // manager. The double runs the callback against a manager whose
  // `getRepository(ControlListValue)` is the value-repository double (so the
  // existing save/update assertions keep reading the same jest.fn()s) and whose
  // `getRepository(ControlListValuePortfolio)` is its own pair of fns, so a
  // test can tell a write made INSIDE the transaction from one that was not.
  const mockTxLinkDelete = jest.fn();
  const mockTxLinkInsert = jest.fn();
  const mockTxManager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === ControlListValuePortfolio
        ? { delete: mockTxLinkDelete, insert: mockTxLinkInsert }
        : mockValueRepository,
    ),
  };
  const mockTransaction = jest.fn();
  const mockDataSource = { transaction: mockTransaction };

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ created_by: 1 }),
    user_id: 1,
  };

  // T-04 (consumer per the brief's forward pointer): ControlListsService now
  // depends on ControlListUsageRegistry. Defaults keep every pre-T-04 test
  // in this file unchanged (usedBy: [], inUse: 0 everywhere, no block).
  const mockGetConsumerNamesForKey = jest.fn();
  const mockGetInUseCounts = jest.fn();
  const mockGetInUseCount = jest.fn();
  const mockUsageRegistry = {
    getConsumerNamesForKey: mockGetConsumerNamesForKey,
    getInUseCounts: mockGetInUseCounts,
    getInUseCount: mockGetInUseCount,
  };

  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  const buildCategory = (
    overrides: Partial<ControlListCategory> = {},
  ): ControlListCategory =>
    ({
      id: 1,
      name: 'Key Performance Indicators (KPIs)',
      description: null,
      display_order: 1,
      is_active: true,
      ...overrides,
    }) as ControlListCategory;

  const buildList = (overrides: Partial<ControlList> = {}): ControlList =>
    ({
      id: 1,
      category_id: 1,
      list_key: 'kpi.direction',
      name: 'Direction',
      description: null,
      code_prefix: 'DIR',
      is_system: true,
      is_active: true,
      ...overrides,
    }) as ControlList;

  const buildValue = (
    overrides: Partial<ControlListValue> = {},
  ): ControlListValue =>
    ({
      id: 1,
      list_id: 2,
      code: 'DIR-01',
      value: 'Increase',
      description: null,
      display_order: 1,
      is_active: true,
      ...overrides,
    }) as ControlListValue;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCurrentUser.audit.mockReturnValue({ created_by: 1 });
    // Default: no lists, so existing category-only assertions below keep
    // their original shape unless a test overrides mockListFind itself.
    mockListFind.mockResolvedValue([]);
    // Default: no values, so A1's new valueCount query (and the T-03
    // list-has-values delete check) stay 0 unless a test overrides them.
    mockValueFind.mockResolvedValue([]);
    mockValueCount.mockResolvedValue(0);
    mockGetConsumerNamesForKey.mockReturnValue([]);
    mockGetInUseCounts.mockResolvedValue(new Map());
    mockGetInUseCount.mockResolvedValue(0);
    // R-CLG-009 defaults: no link rows (every value applies to all), no
    // portfolio found unless a test says so, and a transaction that simply
    // runs its callback on the manager double.
    mockLinkFind.mockResolvedValue([]);
    mockPortfolioFind.mockResolvedValue([]);
    mockPortfolioFindOne.mockResolvedValue(null);
    mockTxLinkDelete.mockResolvedValue({ affected: 0 });
    mockTxLinkInsert.mockResolvedValue({});
    mockTransaction.mockImplementation(
      async (callback: (manager: unknown) => unknown) =>
        callback(mockTxManager),
    );
    mockValueCreateQueryBuilder.mockReturnValue(queryBuilder);
    mockQbWhere.mockReturnValue(queryBuilder);
    mockQbAndWhere.mockReturnValue(queryBuilder);
    mockQbGetMany.mockResolvedValue([]);
    logSpy = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControlListsService,
        {
          provide: ControlListCategoryRepository,
          useValue: mockCategoryRepository,
        },
        {
          provide: ControlListRepository,
          useValue: mockListRepository,
        },
        {
          provide: ControlListValueRepository,
          useValue: mockValueRepository,
        },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: ControlListUsageRegistry, useValue: mockUsageRegistry },
        {
          provide: ControlListValuePortfolioRepository,
          useValue: mockLinkRepository,
        },
        {
          provide: getRepositoryToken(Portfolio),
          useValue: mockPortfolioRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ControlListsService>(ControlListsService);
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCategories', () => {
    it('reads every active category with lists: [] when none exist, with no scope filter (R-CLG-001)', async () => {
      mockFind.mockResolvedValue([
        buildCategory({ id: 1, name: 'KPIs' }),
        buildCategory({ id: 2, name: 'Org structure' }),
      ]);
      mockListFind.mockResolvedValue([]);

      const result = await service.getCategories();

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { display_order: 'ASC', id: 'ASC' },
      });
      expect(mockListFind).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { id: 'ASC' },
      });
      expect(result).toEqual([
        {
          id: 1,
          name: 'KPIs',
          description: null,
          displayOrder: 1,
          lists: [],
        },
        {
          id: 2,
          name: 'Org structure',
          description: null,
          displayOrder: 1,
          lists: [],
        },
      ]);
    });

    it('attaches each category its own lists as ListSummary[] (A1, T-02)', async () => {
      mockFind.mockResolvedValue([
        buildCategory({ id: 1, name: 'KPIs' }),
        buildCategory({ id: 2, name: 'Org structure' }),
      ]);
      mockListFind.mockResolvedValue([
        buildList({
          id: 2,
          category_id: 1,
          list_key: 'kpi.direction',
          name: 'Direction',
          description: 'Whether the KPI should increase, decrease or hold',
          is_system: true,
        }),
        buildList({
          id: 6,
          category_id: 2,
          list_key: 'org.level',
          name: 'Organizational level',
          is_system: true,
        }),
      ]);

      const result = await service.getCategories();

      expect(result[0].lists).toEqual([
        {
          id: 2,
          key: 'kpi.direction',
          name: 'Direction',
          description: 'Whether the KPI should increase, decrease or hold',
          // D-CTL-17 (T-03 rework attempt 2): ListSummary also carries
          // codePrefix, so the client can mirror proposeNextCode.
          codePrefix: 'DIR',
          valueCount: 0,
          isSystem: true,
          usedBy: [],
        },
      ]);
      expect(result[1].lists).toEqual([
        {
          id: 6,
          key: 'org.level',
          name: 'Organizational level',
          description: null,
          codePrefix: 'DIR',
          valueCount: 0,
          isSystem: true,
          usedBy: [],
        },
      ]);
    });

    // T-04 (design §5 rule 5, D-CTL-12): usedBy is derived from the
    // registry's consumer names for each list's OWN key — a different key
    // registered elsewhere contributes nothing.
    it("derives each list's usedBy from the registry's consumer names for its own key (A1, T-04)", async () => {
      mockFind.mockResolvedValue([buildCategory({ id: 2 })]);
      mockListFind.mockResolvedValue([
        buildList({ id: 6, category_id: 2, list_key: 'org.level' }),
      ]);
      mockGetConsumerNamesForKey.mockImplementation((key: string) =>
        key === 'org.level' ? ['Organizational Structure › Level'] : [],
      );

      const result = await service.getCategories();

      expect(mockGetConsumerNamesForKey).toHaveBeenCalledWith('org.level');
      expect(result[0].lists[0].usedBy).toEqual([
        'Organizational Structure › Level',
      ]);
    });
  });

  // R-CLG-007: the portfolio-summaries read (A2) is gone from the service.
  it('no longer exposes the portfolio-summaries read (R-CLG-007)', () => {
    expect(
      (service as unknown as Record<string, unknown>).getPortfoliosSummary,
    ).toBeUndefined();
  });

  describe('createCategory', () => {
    const dto: CreateControlListCategoryDto = {
      name: 'Key Performance Indicators (KPIs)',
      description: 'desc',
    };

    it('throws a field-named ConflictException on a pre-checked duplicate name (any letter case)', async () => {
      mockFindOne.mockResolvedValue(
        buildCategory({ name: 'key performance indicators (kpis)' }),
      );

      await expect(service.createCategory(dto)).rejects.toMatchObject({
        status: 409,
        response: {
          message: expect.objectContaining({ field: 'name' }),
        },
      });
      expect(mockSave).not.toHaveBeenCalled();
    });

    // With the pre-check stubbed to pass, the DB unique index
    // (uq_control_list_categories_name) is the only guard left: errno 1062
    // must still surface as the field-named 409 (R-CLG-002 AC.1, D-CTL-11).
    it('maps a simulated errno 1062 on save to a 409 naming `name` (DB backstop, D-CTL-11)', async () => {
      mockFindOne.mockResolvedValue(null); // pre-check passes
      mockSave.mockRejectedValue({ errno: 1062 });

      await expect(service.createCategory(dto)).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'name' }) },
      });
    });

    it('creates a category and maps the response, auditing created_by', async () => {
      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(
        buildCategory({ id: 5, name: dto.name, description: dto.description }),
      );

      const result = await service.createCategory(dto);

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          description: dto.description,
          created_by: 1,
        }),
      );
      expect(result).toEqual({
        id: 5,
        name: dto.name,
        description: dto.description,
        displayOrder: 1,
        lists: [],
      });
      // design.md §9: info-level log on create (entity, id, user).
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.created entity=control_list_category id=5 user_id=1',
        ),
      );
    });

    it('does NOT log when create fails on a pre-checked duplicate name', async () => {
      mockFindOne.mockResolvedValue(
        buildCategory({ name: 'key performance indicators (kpis)' }),
      );

      await expect(service.createCategory(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    // R-CLG-002: the name is unique across the whole module, so the
    // pre-check carries no scope key at all.
    it('pre-checks the name module-wide (no scope key in the lookup)', async () => {
      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(buildCategory({ id: 9, name: dto.name }));

      await service.createCategory(dto);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { name: dto.name, is_active: true },
      });
    });

    // Leader-adjudicated forward pointer (T-03 rework attempt 2):
    // normalizeDescription() also runs on CREATE (categories, lists,
    // values), not only on PATCH.
    it.each([
      ['an empty string', ''],
      ['an all-whitespace string', '   '],
      ['a literal null', null],
    ])(
      'normalizes description: %s to a stored NULL on create',
      async (_label, description) => {
        mockFindOne.mockResolvedValue(null);
        mockSave.mockResolvedValue(
          buildCategory({ id: 5, name: dto.name, description: null }),
        );

        await service.createCategory({
          ...dto,
          description: description as unknown as string,
        });

        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({ description: null }),
        );
      },
    );
  });

  describe('updateCategory', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        service.updateCategory(1, { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws a field-named ConflictException when renaming to an existing name', async () => {
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(buildCategory({ id: 2, name: 'Taken name' }));

      await expect(
        service.updateCategory(1, { name: 'Taken name' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'name' }) },
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('maps a simulated errno 1062 on update to a 409 naming `name`', async () => {
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(null); // no name-change pre-check collision
      mockUpdate.mockRejectedValue({ errno: 1062 });

      await expect(
        service.updateCategory(1, { name: 'Renamed' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'name' }) },
      });
    });

    it('pre-checks a rename module-wide (no scope key in the lookup)', async () => {
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Renamed' }));
      mockUpdate.mockResolvedValue({ affected: 1 });

      await service.updateCategory(1, { name: 'Renamed' });

      expect(mockFindOne).toHaveBeenNthCalledWith(2, {
        where: { name: 'Renamed', is_active: true },
      });
    });

    it('updates name and description and re-reads the row, auditing updated_by', async () => {
      mockCurrentUser.audit.mockReturnValue({ updated_by: 2 });
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(null) // duplicate pre-check
        .mockResolvedValueOnce(
          buildCategory({ id: 1, name: 'New name', description: 'd' }),
        );
      mockUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.updateCategory(1, {
        name: 'New name',
        description: 'd',
      });

      expect(mockUpdate).toHaveBeenCalledWith(1, {
        name: 'New name',
        description: 'd',
        updated_by: 2,
      });
      expect(result.name).toBe('New name');
      // design.md §9: info-level log on update (entity, id, user).
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.updated entity=control_list_category id=1 user_id=1',
        ),
      );
    });

    // R-CTL-002 output: A4 returns the category's REAL list summaries (same
    // shape as A1's entry), not the `lists: []` mapCategory default.
    it('returns the category real list summaries (not []) after a PATCH', async () => {
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'New name' }));
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockListFind.mockResolvedValue([
        buildList({ id: 5, category_id: 1, list_key: 'kpi.direction' }),
      ]);
      mockValueCount.mockResolvedValue(3);

      const result = await service.updateCategory(1, { name: 'New name' });

      expect(mockListFind).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category_id: 1, is_active: true },
        }),
      );
      expect(result.lists).toHaveLength(1);
      expect(result.lists[0]).toMatchObject({
        id: 5,
        key: 'kpi.direction',
        valueCount: 3,
      });
    });

    it('does NOT log when update fails on an unknown category', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        service.updateCategory(1, { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
      expect(logSpy).not.toHaveBeenCalled();
    });

    // Risk Reviewer defect 3 (T-02 rework attempt 2): description: '' must
    // be STORED as NULL, never as a literal ''.
    it('normalizes description: "" to a stored NULL', async () => {
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(
          buildCategory({ id: 1, name: 'Old name', description: null }),
        );
      mockUpdate.mockResolvedValue({ affected: 1 });

      await service.updateCategory(1, { description: '' });

      expect(mockUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: null }),
      );
    });

    // Same normalization for an all-whitespace description, and for a
    // literal `null` sent directly (accepted the same as '').
    it.each([
      ['an all-whitespace string', '   '],
      ['a literal null', null],
    ])('normalizes description: %s to a stored NULL', async (_label, value) => {
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(
          buildCategory({ id: 1, name: 'Old name', description: null }),
        );
      mockUpdate.mockResolvedValue({ affected: 1 });

      await service.updateCategory(1, { description: value });

      expect(mockUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: null }),
      );
    });

    it('leaves a non-empty description untouched (no over-normalization)', async () => {
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(
          buildCategory({ id: 1, name: 'Old name', description: 'Kept' }),
        );
      mockUpdate.mockResolvedValue({ affected: 1 });

      await service.updateCategory(1, { description: 'Kept' });

      expect(mockUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: 'Kept' }),
      );
    });
  });

  describe('removeCategory', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.removeCategory(1)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('physically deletes the category and returns its id (D-CTL-5)', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 7 }));
      mockDelete.mockResolvedValue({ affected: 1 });

      const result = await service.removeCategory(7);

      expect(mockDelete).toHaveBeenCalledWith(7);
      expect(result).toEqual({ id: 7 });
      // design.md §9: info-level log on delete (entity, id, user).
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.deleted entity=control_list_category id=7 user_id=1',
        ),
      );
    });

    it('does NOT log when delete fails on an unknown category', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.removeCategory(1)).rejects.toThrow(
        NotFoundException,
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    // T-02 forward pointer (T-01 execution.md): a category with lists must
    // be blocked, 409, with a warn-level log naming entity/id/reason, and
    // nothing deleted.
    it('throws 409 naming the blocking lists when the category still has lists, and logs a warning (design §9)', async () => {
      mockFindOne.mockResolvedValue(
        buildCategory({ id: 2, name: 'Org structure' }),
      );
      mockListFind.mockResolvedValue([
        buildList({ id: 6, category_id: 2, name: 'Organizational level' }),
      ]);

      let thrown: unknown;
      try {
        await service.removeCategory(2);
      } catch (error) {
        thrown = error;
      }

      // Non-field conflict (Leader contract note, T-02): `response.message`
      // is the OBJECT `{description}`, with no `field` key — GlobalExceptions
      // then puts that object on the wire as `errors` (never a bare string).
      expect(thrown).toMatchObject({
        status: 409,
        response: {
          message: {
            description: expect.stringContaining('Organizational level'),
          },
        },
      });
      expect(mockDelete).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.blocked_delete entity=control_list_category id=2 reason=has_lists count=1',
        ),
      );
    });
  });

  describe('createList', () => {
    const dto: CreateControlListDto = {
      categoryId: 1,
      listKey: 'kpi.custom_source',
      name: 'Custom source',
    };

    it('throws NotFoundException for an unknown category', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.createList(dto)).rejects.toThrow(NotFoundException);
      expect(mockListSave).not.toHaveBeenCalled();
    });

    it('creates a non-system list under the given category', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1 }));
      mockListFindOne.mockResolvedValue(null); // key pre-check passes
      mockListSave.mockResolvedValue(
        buildList({
          id: 7,
          category_id: 1,
          list_key: dto.listKey,
          name: dto.name,
          code_prefix: 'KPICUSTOM',
          is_system: false,
        }),
      );

      const result = await service.createList(dto);

      expect(mockListSave).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: 1,
          list_key: dto.listKey,
          name: dto.name,
          is_system: false,
          created_by: 1,
        }),
      );
      expect(result).toMatchObject({
        id: 7,
        categoryId: 1,
        key: dto.listKey,
        name: dto.name,
        isSystem: false,
      });
    });

    it.each(['', '   '])(
      'treats codePrefix %j as absent and stores the derived prefix (A-1)',
      async (codePrefix) => {
        mockFindOne.mockResolvedValue(buildCategory({ id: 1 }));
        mockListFindOne.mockResolvedValue(null);
        mockListSave.mockResolvedValue(buildList({ id: 8 }));

        await service.createList({ ...dto, codePrefix });

        expect(mockListSave).toHaveBeenCalledWith(
          expect.objectContaining({ code_prefix: 'KPICUSTOMS' }),
        );
      },
    );

    it('stores a given codePrefix trimmed (" DIR " -> "DIR")', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1 }));
      mockListFindOne.mockResolvedValue(null);
      mockListSave.mockResolvedValue(buildList({ id: 8 }));

      await service.createList({ ...dto, codePrefix: ' DIR ' });

      expect(mockListSave).toHaveBeenCalledWith(
        expect.objectContaining({ code_prefix: 'DIR' }),
      );
    });

    it('throws a field-named ConflictException (field: listKey) on a pre-checked duplicate key', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1 }));
      mockListFindOne.mockResolvedValue(buildList({ list_key: dto.listKey }));

      await expect(service.createList(dto)).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'listKey' }) },
      });
      expect(mockListSave).not.toHaveBeenCalled();
    });

    // With the pre-check stubbed to pass, the DB unique index
    // (uq_control_lists_key) is the only guard left: errno 1062 must still
    // surface as the field-named 409 (R-CLG-003 AC.1).
    it('maps a simulated errno 1062 on save to a 409 naming `listKey` (DB backstop)', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1 }));
      mockListFindOne.mockResolvedValue(null);
      mockListSave.mockRejectedValue({ errno: 1062 });

      await expect(service.createList(dto)).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'listKey' }) },
      });
    });

    // R-CLG-003: the key is unique across the whole module, so the
    // pre-check carries no scope key at all.
    it('pre-checks the key module-wide (no scope key in the lookup)', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 3 }));
      mockListFindOne.mockResolvedValue(null);
      mockListSave.mockResolvedValue(
        buildList({ id: 9, category_id: 3, list_key: 'org.level' }),
      );

      await service.createList({
        categoryId: 3,
        listKey: 'org.level',
        name: 'Organizational level',
      });

      expect(mockListFindOne).toHaveBeenCalledWith({
        where: { list_key: 'org.level', is_active: true },
      });
    });

    it('logs on successful create', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1 }));
      mockListFindOne.mockResolvedValue(null);
      mockListSave.mockResolvedValue(buildList({ id: 7 }));

      await service.createList(dto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.created entity=control_list id=7 user_id=1',
        ),
      );
    });

    // Leader-adjudicated forward pointer (T-03 rework attempt 2): same
    // create-time normalization as categories.
    it.each([
      ['an empty string', ''],
      ['an all-whitespace string', '   '],
      ['a literal null', null],
    ])(
      'normalizes description: %s to a stored NULL on create',
      async (_label, description) => {
        mockFindOne.mockResolvedValue(buildCategory({ id: 1 }));
        mockListFindOne.mockResolvedValue(null);
        mockListSave.mockResolvedValue(buildList({ id: 7, description: null }));

        await service.createList({
          ...dto,
          description: description as unknown as string,
        });

        expect(mockListSave).toHaveBeenCalledWith(
          expect.objectContaining({ description: null }),
        );
      },
    );
  });

  describe('updateList', () => {
    it('throws NotFoundException when the list does not exist', async () => {
      mockListFindOne.mockResolvedValue(null);

      await expect(service.updateList(1, { name: 'Renamed' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockListUpdate).not.toHaveBeenCalled();
    });

    it('ignores listKey entirely — it is not part of the DTO type (R-CTL-003 "System key is fixed")', async () => {
      mockListFindOne
        .mockResolvedValueOnce(buildList({ id: 1, list_key: 'org.level' }))
        .mockResolvedValueOnce(buildList({ id: 1, list_key: 'org.level' }));
      mockListUpdate.mockResolvedValue({ affected: 1 });

      await service.updateList(1, { name: 'Renamed' });

      expect(mockListUpdate).toHaveBeenCalledWith(
        1,
        expect.not.objectContaining({ list_key: expect.anything() }),
      );
    });

    // R-CLG-003 "Move to any category": categories no longer belong to a
    // scope, so any active category is a valid target.
    it('allows moving a list to any active category', async () => {
      mockListFindOne
        .mockResolvedValueOnce(buildList({ id: 1, category_id: 1 }))
        .mockResolvedValueOnce(buildList({ id: 1, category_id: 4 }));
      mockFindOne.mockResolvedValue(buildCategory({ id: 4 }));
      mockListUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.updateList(1, { categoryId: 4 });

      expect(mockListUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ category_id: 4 }),
      );
      expect(result.categoryId).toBe(4);
    });

    it('throws NotFoundException (404) when the target category does not exist, and moves nothing', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 1, category_id: 1 }));
      mockFindOne.mockResolvedValue(null);

      await expect(service.updateList(1, { categoryId: 9 })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockListUpdate).not.toHaveBeenCalled();
    });

    it('logs on successful update', async () => {
      mockListFindOne
        .mockResolvedValueOnce(buildList({ id: 1 }))
        .mockResolvedValueOnce(buildList({ id: 1, name: 'Renamed' }));
      mockListUpdate.mockResolvedValue({ affected: 1 });

      await service.updateList(1, { name: 'Renamed' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.updated entity=control_list id=1 user_id=1',
        ),
      );
    });

    // Risk Reviewer defect 3 (T-02 rework attempt 2), list side: same
    // normalization as categories — description: '' / null / whitespace
    // all store a NULL, a non-empty value is untouched.
    it.each([
      ['an empty string', ''],
      ['an all-whitespace string', '   '],
      ['a literal null', null],
    ])('normalizes description: %s to a stored NULL', async (_label, value) => {
      mockListFindOne
        .mockResolvedValueOnce(buildList({ id: 1 }))
        .mockResolvedValueOnce(buildList({ id: 1, description: null }));
      mockListUpdate.mockResolvedValue({ affected: 1 });

      await service.updateList(1, { description: value });

      expect(mockListUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: null }),
      );
    });

    it('leaves a non-empty description untouched (no over-normalization)', async () => {
      mockListFindOne
        .mockResolvedValueOnce(buildList({ id: 1 }))
        .mockResolvedValueOnce(buildList({ id: 1, description: 'Kept' }));
      mockListUpdate.mockResolvedValue({ affected: 1 });

      await service.updateList(1, { description: 'Kept' });

      expect(mockListUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: 'Kept' }),
      );
    });
  });

  describe('removeList', () => {
    it('throws NotFoundException when the list does not exist', async () => {
      mockListFindOne.mockResolvedValue(null);

      await expect(service.removeList(1)).rejects.toThrow(NotFoundException);
      expect(mockListDelete).not.toHaveBeenCalled();
    });

    // R-CTL-003 "List lifecycle (any list, seeded or created)" (CR-2,
    // D-CTL-18): `is_system` has no behavioral effect on delete. An empty
    // seeded-style list (is_system = 1, no values) deletes like any other.
    it('deletes an empty seeded-style list (is_system = 1) with no values (200) and logs — CR-2', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({
          id: 1,
          is_system: true,
          name: 'Direction',
          list_key: 'kpi.direction',
        }),
      );
      mockValueCount.mockResolvedValue(0);
      mockListDelete.mockResolvedValue({ affected: 1 });

      const result = await service.removeList(1);

      expect(mockValueCount).toHaveBeenCalledWith({ where: { list_id: 1 } });
      expect(mockListDelete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.deleted entity=control_list id=1 user_id=1',
        ),
      );
    });

    // R-CTL-003 "List lifecycle" (no-values branch), custom list.
    it('deletes a custom (non-system) list with no values (200) and logs', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 8, is_system: false }));
      mockValueCount.mockResolvedValue(0);
      mockListDelete.mockResolvedValue({ affected: 1 });

      const result = await service.removeList(8);

      expect(mockValueCount).toHaveBeenCalledWith({ where: { list_id: 8 } });
      expect(mockListDelete).toHaveBeenCalledWith(8);
      expect(result).toEqual({ id: 8 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.deleted entity=control_list id=8 user_id=1',
        ),
      );
    });

    // T-03 forward pointer (T-02 execution.md), CR-2 generalization: a list
    // with values cannot be deleted — 409, non-field {description} shape,
    // warn log — regardless of `is_system`, custom or seeded.
    it('throws ConflictException (409) for a custom list with values and logs a warning, deleting nothing', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({
          id: 8,
          is_system: false,
          name: 'Custom source',
          list_key: 'kpi.custom_source',
        }),
      );
      mockValueCount.mockResolvedValue(3);

      let thrown: unknown;
      try {
        await service.removeList(8);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toMatchObject({
        status: 409,
        response: {
          message: {
            description: expect.stringContaining('Custom source'),
          },
        },
      });
      expect(mockListDelete).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.blocked_delete entity=control_list id=8 reason=has_values count=3',
        ),
      );
    });

    // CR-2: a seeded-style list (is_system = 1) WITH values is blocked the
    // same way — `is_system` grants no exemption from the values rule.
    it('throws ConflictException (409) for a seeded-style list (is_system = 1) with values and logs a warning, deleting nothing', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({
          id: 6,
          is_system: true,
          name: 'Organizational level',
          list_key: 'org.level',
        }),
      );
      mockValueCount.mockResolvedValue(4);

      let thrown: unknown;
      try {
        await service.removeList(6);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toMatchObject({
        status: 409,
        response: {
          message: {
            description: expect.stringContaining('Organizational level'),
          },
        },
      });
      expect(mockListDelete).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.blocked_delete entity=control_list id=6 reason=has_values count=4',
        ),
      );
    });
  });

  describe('getValues (A9)', () => {
    it('throws NotFoundException when the list does not exist', async () => {
      mockListFindOne.mockResolvedValue(null);

      await expect(service.getValues(99)).rejects.toThrow(NotFoundException);
      expect(mockValueFind).not.toHaveBeenCalled();
    });

    it('returns values ordered by display_order then id, including inactive ones', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFind.mockResolvedValue([
        buildValue({ id: 9, list_id: 2, code: 'DIR-02', is_active: false }),
        buildValue({ id: 8, list_id: 2, code: 'DIR-01' }),
      ]);

      const result = await service.getValues(2);

      expect(mockValueFind).toHaveBeenCalledWith({
        where: { list_id: 2 },
        order: { display_order: 'ASC', id: 'ASC' },
      });
      expect(result).toEqual([
        {
          id: 9,
          listId: 2,
          code: 'DIR-02',
          value: 'Increase',
          description: null,
          displayOrder: 1,
          isActive: false,
          inUse: 0,
          appliesTo: [],
          appliesToAll: true,
        },
        {
          id: 8,
          listId: 2,
          code: 'DIR-01',
          value: 'Increase',
          description: null,
          displayOrder: 1,
          isActive: true,
          inUse: 0,
          appliesTo: [],
          appliesToAll: true,
        },
      ]);
    });

    // T-04 (design §5 rule 5): inUse is the SUMMED count from the registry
    // per value id, 0 when none is registered.
    it('attaches the summed in-use count per value from the registry', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFind.mockResolvedValue([
        buildValue({ id: 9, list_id: 2, code: 'L1' }),
        buildValue({ id: 10, list_id: 2, code: 'L2' }),
      ]);
      mockGetInUseCounts.mockResolvedValue(
        new Map([
          [9, 5],
          [10, 0],
        ]),
      );

      const result = await service.getValues(2);

      expect(mockGetInUseCounts).toHaveBeenCalledWith([9, 10]);
      expect(result.find((v) => v.id === 9)?.inUse).toBe(5);
      expect(result.find((v) => v.id === 10)?.inUse).toBe(0);
    });

    // R-CLG-009 AC.3: no link rows = applies to all. Neither the link table
    // nor the portfolios are asked about a value with no links beyond the one
    // batch link read.
    it('marks a value with no link rows as appliesToAll with an empty appliesTo', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFind.mockResolvedValue([buildValue({ id: 8, list_id: 2 })]);
      mockLinkFind.mockResolvedValue([]);

      const [value] = await service.getValues(2);

      expect(value.appliesToAll).toBe(true);
      expect(value.appliesTo).toEqual([]);
      expect(mockPortfolioFind).not.toHaveBeenCalled();
    });

    // R-CLG-009 *No filter* / D-CLG-14: only ACTIVE portfolios are listed;
    // `appliesToAll` is "no link rows at all", so a value linked ONLY to an
    // inactive portfolio is { appliesTo: [], appliesToAll: false }.
    it('lists only ACTIVE linked portfolios and never reads a value linked to an inactive one as "all" (D-CLG-14)', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFind.mockResolvedValue([
        buildValue({ id: 8, list_id: 2, code: 'DIR-01' }),
        buildValue({ id: 9, list_id: 2, code: 'DIR-02' }),
        buildValue({ id: 10, list_id: 2, code: 'DIR-03' }),
      ]);
      mockLinkFind.mockResolvedValue([
        // value 9: P2 (active) and P1 (active), unsorted on purpose
        { value_id: 9, portfolio_id: 2 },
        { value_id: 9, portfolio_id: 1 },
        // value 10: only P3, which is inactive
        { value_id: 10, portfolio_id: 3 },
      ]);
      mockPortfolioFind.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await service.getValues(2);

      expect(result.map((v) => [v.id, v.appliesTo, v.appliesToAll])).toEqual([
        [8, [], true],
        [9, [1, 2], false],
        [10, [], false],
      ]);
    });

    it("loads every value's links in ONE query and the linked portfolios in ONE query (no per-value reads)", async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFind.mockResolvedValue([
        buildValue({ id: 8, list_id: 2, code: 'DIR-01' }),
        buildValue({ id: 9, list_id: 2, code: 'DIR-02' }),
        buildValue({ id: 10, list_id: 2, code: 'DIR-03' }),
      ]);
      mockLinkFind.mockResolvedValue([
        { value_id: 8, portfolio_id: 1 },
        { value_id: 9, portfolio_id: 1 },
        { value_id: 10, portfolio_id: 2 },
      ]);
      mockPortfolioFind.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await service.getValues(2);

      expect(mockLinkFind).toHaveBeenCalledTimes(1);
      const linkWhere = mockLinkFind.mock.calls[0][0].where;
      expect(linkWhere.value_id).toBeInstanceOf(FindOperator);
      expect(linkWhere.value_id.value).toEqual([8, 9, 10]);
      expect(mockPortfolioFind).toHaveBeenCalledTimes(1);
      const portfolioWhere = mockPortfolioFind.mock.calls[0][0].where;
      expect(portfolioWhere.is_active).toBe(true);
      expect(portfolioWhere.id.value).toEqual([1, 2]);
    });

    // design §4: MySQL BIGINT can arrive as a string; the ids leave the
    // service as numbers.
    it('coerces link ids that arrive as strings (BIGINT) to numbers', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFind.mockResolvedValue([buildValue({ id: 9, list_id: 2 })]);
      mockLinkFind.mockResolvedValue([
        { value_id: '9', portfolio_id: '2' },
        { value_id: '9', portfolio_id: '1' },
      ]);
      mockPortfolioFind.mockResolvedValue([{ id: '1' }, { id: '2' }]);

      const [value] = await service.getValues(2);

      expect(value.appliesTo).toEqual([1, 2]);
      expect(value.appliesTo.every((id) => typeof id === 'number')).toBe(true);
      expect(value.appliesToAll).toBe(false);
    });
  });

  describe('createValue (A10)', () => {
    const dto: CreateControlListValueDto = { value: 'Decrease' };

    it('throws NotFoundException for an unknown list', async () => {
      mockListFindOne.mockResolvedValue(null);

      await expect(service.createValue(99, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockValueSave).not.toHaveBeenCalled();
    });

    it('proposes the next zero-padded code from the list prefix when code is omitted', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({ id: 2, code_prefix: 'DIR' }),
      );
      mockValueFind.mockResolvedValue([
        buildValue({ code: 'DIR-01' }),
        buildValue({ code: 'DIR-02' }),
      ]);
      mockValueFindOne.mockResolvedValue(null);
      mockValueSave.mockResolvedValue(
        buildValue({ id: 10, list_id: 2, code: 'DIR-03', value: dto.value }),
      );

      const result = await service.createValue(2, dto);

      expect(mockValueSave).toHaveBeenCalledWith(
        expect.objectContaining({
          list_id: 2,
          code: 'DIR-03',
          value: 'Decrease',
        }),
      );
      expect(result.code).toBe('DIR-03');
    });

    // design §5 rule 4: org.level's prefix L has no dash.
    it('proposes "L5" (no dash, no zero-pad) after L1..L4 for the org.level prefix', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({ id: 6, code_prefix: 'L', list_key: 'org.level' }),
      );
      mockValueFind.mockResolvedValue([
        buildValue({ code: 'L1' }),
        buildValue({ code: 'L2' }),
        buildValue({ code: 'L3' }),
        buildValue({ code: 'L4' }),
      ]);
      mockValueFindOne.mockResolvedValue(null);
      mockValueSave.mockResolvedValue(
        buildValue({ id: 24, list_id: 6, code: 'L5', value: 'Section' }),
      );

      const result = await service.createValue(6, { value: 'Section' });

      expect(mockValueSave).toHaveBeenCalledWith(
        expect.objectContaining({ list_id: 6, code: 'L5' }),
      );
      expect(result.code).toBe('L5');
    });

    // A-2: the unique index is case-insensitive, so the suffix scan must be
    // too — a lowercase `dir-04` must still count and yield DIR-05, not a
    // colliding DIR-04.
    it('proposes DIR-05 when an existing code is lowercase dir-04 (case-insensitive scan)', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({ id: 2, code_prefix: 'DIR' }),
      );
      mockValueFind.mockResolvedValue([
        buildValue({ code: 'DIR-01' }),
        buildValue({ code: 'dir-04' }),
      ]);
      mockValueFindOne.mockResolvedValue(null);
      mockValueSave.mockResolvedValue(
        buildValue({ id: 12, list_id: 2, code: 'DIR-05', value: dto.value }),
      );

      await service.createValue(2, dto);

      expect(mockValueSave).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'DIR-05' }),
      );
    });

    it('uses an admin-supplied code as-is (no proposal)', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFindOne.mockResolvedValue(null);
      mockValueSave.mockResolvedValue(
        buildValue({ id: 11, list_id: 2, code: 'CUSTOM-1', value: 'Hold' }),
      );

      await service.createValue(2, { code: 'CUSTOM-1', value: 'Hold' });

      expect(mockValueSave).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CUSTOM-1' }),
      );
      // The proposal lookup is skipped entirely when a code is supplied.
      expect(mockValueFind).not.toHaveBeenCalled();
    });

    it('throws a field-named ConflictException (field: code) on a pre-checked duplicate code (any letter case)', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFindOne.mockResolvedValue(buildValue({ id: 5, code: 'dir-01' }));

      await expect(
        service.createValue(2, { code: 'DIR-01', value: 'Increase' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'code' }) },
      });
      expect(mockValueSave).not.toHaveBeenCalled();
    });

    it('throws a field-named ConflictException (field: value) on a pre-checked duplicate value', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFindOne
        .mockResolvedValueOnce(null) // code pre-check passes
        .mockResolvedValueOnce(buildValue({ id: 5, value: 'increase' })); // value pre-check collides

      await expect(
        service.createValue(2, { code: 'DIR-09', value: 'Increase' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'value' }) },
      });
      expect(mockValueSave).not.toHaveBeenCalled();
    });

    it('maps a simulated errno 1062 on save to a 409 naming the duplicated field from sqlMessage (DB backstop)', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFindOne.mockResolvedValue(null);
      mockValueSave.mockRejectedValue({
        errno: 1062,
        sqlMessage:
          "Duplicate entry '2-Increase' for key 'uq_control_list_values_list_value'",
      });

      await expect(
        service.createValue(2, { code: 'DIR-09', value: 'Increase' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'value' }) },
      });
    });

    it('creates a value, defaulting displayOrder to 0 and isActive to true, and logs', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFindOne.mockResolvedValue(null);
      mockValueSave.mockResolvedValue(
        buildValue({ id: 11, list_id: 2, code: 'DIR-09', value: 'Hold' }),
      );

      await service.createValue(2, { code: 'DIR-09', value: 'Hold' });

      expect(mockValueSave).toHaveBeenCalledWith(
        expect.objectContaining({
          display_order: 0,
          is_active: true,
          created_by: 1,
        }),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.created entity=control_list_value id=11 user_id=1',
        ),
      );
    });

    // Rework attempt 2 (Reviewer risk-lens FAIL, Leader decision A10):
    // attempt 1 only proposed when `dto.code === undefined` — `''` and a
    // literal `null` (which the DTO lets through unchanged; see
    // CreateControlListValueDto.code) both skipped the proposal and
    // reached the NOT NULL `code` column as-is. The DTO's own `@Transform`
    // already collapses a whitespace-only string to `''` before this ever
    // runs, so this only needs to prove `''` and `null`, not `'   '` again
    // (that is covered at the DTO layer, `create-control-list-value.dto.spec.ts`).
    it.each([
      ['an empty string', ''],
      ['a literal null', null],
    ])(
      'proposes a code when dto.code is %s, not just when omitted',
      async (_label, code) => {
        mockListFindOne.mockResolvedValue(
          buildList({ id: 2, code_prefix: 'DIR' }),
        );
        mockValueFind.mockResolvedValue([buildValue({ code: 'DIR-01' })]);
        mockValueFindOne.mockResolvedValue(null);
        mockValueSave.mockResolvedValue(
          buildValue({ id: 12, list_id: 2, code: 'DIR-02', value: 'Decrease' }),
        );

        const result = await service.createValue(2, {
          code: code as unknown as string,
          value: 'Decrease',
        });

        expect(mockValueFind).toHaveBeenCalledWith({ where: { list_id: 2 } });
        expect(mockValueSave).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'DIR-02' }),
        );
        expect(result.code).toBe('DIR-02');
      },
    );

    // Leader-adjudicated forward pointer (T-03 rework attempt 2):
    // normalizeDescription() also runs on CREATE for values.
    it.each([
      ['an empty string', ''],
      ['an all-whitespace string', '   '],
      ['a literal null', null],
    ])(
      'normalizes description: %s to a stored NULL on create',
      async (_label, description) => {
        mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
        mockValueFindOne.mockResolvedValue(null);
        mockValueSave.mockResolvedValue(
          buildValue({ id: 13, list_id: 2, code: 'DIR-09', description: null }),
        );

        await service.createValue(2, {
          code: 'DIR-09',
          value: 'Hold',
          description: description as unknown as string,
        });

        expect(mockValueSave).toHaveBeenCalledWith(
          expect.objectContaining({ description: null }),
        );
      },
    );
  });

  // R-CLG-009 "Applies to" on A10 (design §5 rule 4, D-CLG-12/13/14).
  describe('createValue (A10) — Applies to (R-CLG-009)', () => {
    const arrange = (portfolioIdsActive: number[] = []) => {
      mockListFindOne.mockResolvedValue(buildList({ id: 2 }));
      mockValueFindOne.mockResolvedValue(null);
      mockValueSave.mockResolvedValue(
        buildValue({ id: 11, list_id: 2, code: 'DIR-09', value: 'Hold' }),
      );
      mockPortfolioFind.mockResolvedValue(
        portfolioIdsActive.map((id) => ({ id })),
      );
    };

    it('writes no links and asks no portfolio question when portfolioIds is omitted (applies to all)', async () => {
      arrange();

      const result = await service.createValue(2, {
        code: 'DIR-09',
        value: 'Hold',
      });

      expect(mockPortfolioFind).not.toHaveBeenCalled();
      expect(mockTxLinkInsert).not.toHaveBeenCalled();
      expect(mockTxLinkDelete).not.toHaveBeenCalled();
      expect(result.appliesToAll).toBe(true);
      expect(result.appliesTo).toEqual([]);
    });

    it('writes no links for portfolioIds: [] (applies to all)', async () => {
      arrange();

      const result = await service.createValue(2, {
        code: 'DIR-09',
        value: 'Hold',
        portfolioIds: [],
      });

      expect(mockPortfolioFind).not.toHaveBeenCalled();
      expect(mockTxLinkInsert).not.toHaveBeenCalled();
      expect(result.appliesToAll).toBe(true);
    });

    it('validates the whole set with ONE active-portfolio lookup, then saves the value and inserts its links INSIDE one transaction', async () => {
      arrange([1, 2]);
      mockLinkFind.mockResolvedValue([
        { value_id: 11, portfolio_id: 1 },
        { value_id: 11, portfolio_id: 2 },
      ]);

      const result = await service.createValue(2, {
        code: 'DIR-09',
        value: 'Hold',
        portfolioIds: [1, 2],
      });

      expect(mockPortfolioFind).toHaveBeenCalledWith({
        where: { id: expect.any(FindOperator), is_active: true },
        select: { id: true },
      });
      expect(mockPortfolioFind.mock.calls[0][0].where.id.value).toEqual([1, 2]);
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockTxManager.getRepository).toHaveBeenCalledWith(
        ControlListValue,
      );
      expect(mockTxManager.getRepository).toHaveBeenCalledWith(
        ControlListValuePortfolio,
      );
      expect(mockTxLinkInsert).toHaveBeenCalledWith([
        { value_id: 11, portfolio_id: 1 },
        { value_id: 11, portfolio_id: 2 },
      ]);
      expect(result.appliesTo).toEqual([1, 2]);
      expect(result.appliesToAll).toBe(false);
    });

    // R-CLG-009 AC.4 / D-CLG-13: an unknown or inactive id is a 400 naming
    // `portfolioIds` - NOT a 404 - and nothing is written.
    it('answers 400 naming portfolioIds (not 404) when an id is unknown or inactive, and opens no transaction', async () => {
      arrange([1]); // portfolio 99 is not among the active ones

      let thrown: unknown;
      try {
        await service.createValue(2, {
          code: 'DIR-09',
          value: 'Hold',
          portfolioIds: [1, 99],
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      expect(thrown).toMatchObject({
        status: 400,
        response: {
          message: {
            field: 'portfolioIds',
            description: expect.stringContaining('99'),
          },
        },
      });
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockValueSave).not.toHaveBeenCalled();
    });

    // design §5 rule 4: a failure while storing the links is NOT swallowed or
    // re-mapped (a link FK failure is errno 1452, not 1062) - it propagates
    // out of the transaction call, which is what makes the real rollback happen
    // (proved on MySQL in the integration suite; this double cannot roll back).
    it('lets a link-insert failure propagate unchanged out of the transaction (no conflict mapping)', async () => {
      arrange([1]);
      const fkFailure = {
        errno: 1452,
        message: 'a foreign key constraint fails',
      };
      mockTxLinkInsert.mockRejectedValue(fkFailure);

      await expect(
        service.createValue(2, {
          code: 'DIR-09',
          value: 'Hold',
          portfolioIds: [1],
        }),
      ).rejects.toBe(fkFailure);
    });

    // design §5 rule 4: the errno-1062 mapping wraps the WHOLE transaction
    // call. Here the pre-check passes and the failure comes out of
    // `dataSource.transaction` itself.
    it('maps errno 1062 raised by the transaction call to the field-named 409', async () => {
      arrange();
      mockTransaction.mockRejectedValue({
        errno: 1062,
        sqlMessage:
          "Duplicate entry '2-DIR-09' for key 'uq_control_list_values_list_code'",
      });

      await expect(
        service.createValue(2, { code: 'DIR-09', value: 'Hold' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'code' }) },
      });
    });

    it('logs the Applies to set that was written (design §9)', async () => {
      arrange([1, 2]);

      await service.createValue(2, {
        code: 'DIR-09',
        value: 'Hold',
        portfolioIds: [1, 2],
      });

      expect(logSpy).toHaveBeenCalledWith(
        'control_lists.created entity=control_list_value id=11 user_id=1 portfolioIds=[1,2]',
      );
    });
  });

  describe('updateValue (A11)', () => {
    it('throws NotFoundException when the value does not exist', async () => {
      mockValueFindOne.mockResolvedValue(null);

      await expect(
        service.updateValue(1, { value: 'Renamed' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockValueUpdate).not.toHaveBeenCalled();
    });

    it('throws a field-named ConflictException (field: code) when changing to an existing code', async () => {
      mockValueFindOne
        .mockResolvedValueOnce(
          buildValue({ id: 1, list_id: 2, code: 'DIR-01' }),
        )
        .mockResolvedValueOnce(buildValue({ id: 5, code: 'DIR-02' }));

      await expect(
        service.updateValue(1, { code: 'DIR-02' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'code' }) },
      });
      expect(mockValueUpdate).not.toHaveBeenCalled();
    });

    it('updates code, value, description and audits updated_by, re-reading the row', async () => {
      mockCurrentUser.audit.mockReturnValue({ updated_by: 2 });
      mockValueFindOne
        .mockResolvedValueOnce(
          buildValue({ id: 1, list_id: 2, code: 'DIR-01', value: 'Increase' }),
        )
        .mockResolvedValueOnce(null) // code availability check
        .mockResolvedValueOnce(null) // value availability check
        .mockResolvedValueOnce(
          buildValue({ id: 1, list_id: 2, code: 'DIR-01b', value: 'Up' }),
        );
      mockValueUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.updateValue(1, {
        code: 'DIR-01b',
        value: 'Up',
        description: 'd',
      });

      expect(mockValueUpdate).toHaveBeenCalledWith(1, {
        code: 'DIR-01b',
        value: 'Up',
        description: 'd',
        updated_by: 2,
      });
      expect(result.code).toBe('DIR-01b');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.updated entity=control_list_value id=1 user_id=1',
        ),
      );
    });

    it('deactivates a value through isActive, keeping it readable (R-CTL-004 "Deactivate")', async () => {
      mockValueFindOne
        .mockResolvedValueOnce(
          buildValue({ id: 1, list_id: 2, is_active: true }),
        )
        .mockResolvedValueOnce(
          buildValue({ id: 1, list_id: 2, is_active: false }),
        );
      mockValueUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.updateValue(1, { isActive: false });

      expect(mockValueUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ is_active: false }),
      );
      expect(result.isActive).toBe(false);
    });

    it.each([
      ['an empty string', ''],
      ['an all-whitespace string', '   '],
      ['a literal null', null],
    ])('normalizes description: %s to a stored NULL', async (_label, value) => {
      mockValueFindOne
        .mockResolvedValueOnce(buildValue({ id: 1, list_id: 2 }))
        .mockResolvedValueOnce(
          buildValue({ id: 1, list_id: 2, description: null }),
        );
      mockValueUpdate.mockResolvedValue({ affected: 1 });

      await service.updateValue(1, { description: value });

      expect(mockValueUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: null }),
      );
    });
  });

  // R-CLG-009 "Applies to" on A11: omitted keeps the set, `[]` clears it, a
  // list replaces it; the value row is always saved so its audit fields move
  // (D-CLG-12); everything commits together.
  describe('updateValue (A11) — Applies to (R-CLG-009)', () => {
    const arrange = (portfolioIdsActive: number[] = []) => {
      mockCurrentUser.audit.mockReturnValue({ updated_by: 2 });
      mockValueFindOne.mockResolvedValue(buildValue({ id: 1, list_id: 2 }));
      mockValueUpdate.mockResolvedValue({ affected: 1 });
      mockPortfolioFind.mockResolvedValue(
        portfolioIdsActive.map((id) => ({ id })),
      );
    };

    it('keeps the current set when portfolioIds is omitted: no link delete or insert, no portfolio lookup', async () => {
      arrange();

      await service.updateValue(1, { description: 'd' });

      expect(mockTxLinkDelete).not.toHaveBeenCalled();
      expect(mockTxLinkInsert).not.toHaveBeenCalled();
      expect(mockPortfolioFind).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        'control_lists.updated entity=control_list_value id=1 user_id=1 portfolioIds=unchanged',
      );
    });

    it('clears the set for portfolioIds: [] - deletes the links, inserts none, asks no portfolio question', async () => {
      arrange();

      await service.updateValue(1, { portfolioIds: [] });

      expect(mockTxLinkDelete).toHaveBeenCalledWith({ value_id: 1 });
      expect(mockTxLinkInsert).not.toHaveBeenCalled();
      expect(mockPortfolioFind).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        'control_lists.updated entity=control_list_value id=1 user_id=1 portfolioIds=[]',
      );
    });

    it('replaces the set for a list: validates it, then deletes the old links BEFORE inserting the new ones', async () => {
      arrange([2]);
      mockLinkFind.mockResolvedValue([{ value_id: 1, portfolio_id: 2 }]);

      const result = await service.updateValue(1, { portfolioIds: [2] });

      expect(mockTxLinkDelete).toHaveBeenCalledWith({ value_id: 1 });
      expect(mockTxLinkInsert).toHaveBeenCalledWith([
        { value_id: 1, portfolio_id: 2 },
      ]);
      expect(mockTxLinkDelete.mock.invocationCallOrder[0]).toBeLessThan(
        mockTxLinkInsert.mock.invocationCallOrder[0],
      );
      expect(result.appliesTo).toEqual([2]);
      expect(result.appliesToAll).toBe(false);
    });

    // D-CLG-12: the link table has no audit columns, so a PATCH that changes
    // ONLY the set must still save the value row - `update` then carries just
    // the audit stamp. Skipping the value update would leave nobody on record
    // as having changed it.
    it("stamps the value's audit fields on a links-only PATCH (D-CLG-12)", async () => {
      arrange([1]);

      await service.updateValue(1, { portfolioIds: [1] });

      expect(mockValueUpdate).toHaveBeenCalledTimes(1);
      expect(mockValueUpdate).toHaveBeenCalledWith(1, { updated_by: 2 });
    });

    it('answers 400 naming portfolioIds (not 404) for an unknown or inactive id, writing and opening nothing', async () => {
      arrange([]); // none of the requested ids is an active portfolio

      await expect(
        service.updateValue(1, { portfolioIds: [99] }),
      ).rejects.toMatchObject({
        status: 400,
        response: {
          message: expect.objectContaining({ field: 'portfolioIds' }),
        },
      });
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockValueUpdate).not.toHaveBeenCalled();
    });

    // design §5 rule 4: the value write and the link replacement are the SAME
    // transaction. A call-sequence double cannot prove a rollback; this proves
    // neither write happens outside the unit of work (the real rollback is the
    // integration suite's atomicity test).
    it('performs the value update and the link replacement only INSIDE the transaction', async () => {
      arrange([1]);
      let depth = 0;
      const insideTransaction: Record<string, boolean> = {};
      mockTransaction.mockImplementation(
        async (callback: (manager: unknown) => unknown) => {
          depth += 1;
          try {
            return await callback(mockTxManager);
          } finally {
            depth -= 1;
          }
        },
      );
      mockValueUpdate.mockImplementation(async () => {
        insideTransaction.valueUpdate = depth > 0;
        return { affected: 1 };
      });
      mockTxLinkDelete.mockImplementation(async () => {
        insideTransaction.linkDelete = depth > 0;
        return { affected: 1 };
      });
      mockTxLinkInsert.mockImplementation(async () => {
        insideTransaction.linkInsert = depth > 0;
        return {};
      });

      await service.updateValue(1, { portfolioIds: [1] });

      expect(insideTransaction).toEqual({
        valueUpdate: true,
        linkDelete: true,
        linkInsert: true,
      });
    });

    it('maps errno 1062 raised by the transaction call to the field-named 409', async () => {
      arrange();
      mockTransaction.mockRejectedValue({
        errno: 1062,
        sqlMessage:
          "Duplicate entry '2-Hold' for key 'uq_control_list_values_list_value'",
      });

      await expect(
        service.updateValue(1, { description: 'd' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'value' }) },
      });
    });
  });

  describe('removeValue (A12)', () => {
    it('throws NotFoundException when the value does not exist', async () => {
      mockValueFindOne.mockResolvedValue(null);

      await expect(service.removeValue(1)).rejects.toThrow(NotFoundException);
      expect(mockValueDelete).not.toHaveBeenCalled();
    });

    // Falsifier 2 guard (tasks.md T-04): with in-use at 0 (the default
    // registry mock), the value still deletes physically (D-CTL-5) — the
    // list-has-values rule lives on A8, not here.
    it('physically deletes the value and returns its id, logging the write', async () => {
      mockValueFindOne.mockResolvedValue(buildValue({ id: 9, list_id: 2 }));
      mockValueDelete.mockResolvedValue({ affected: 1 });

      const result = await service.removeValue(9);

      expect(mockGetInUseCount).toHaveBeenCalledWith(9);
      expect(mockValueDelete).toHaveBeenCalledWith(9);
      expect(result).toEqual({ id: 9 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.deleted entity=control_list_value id=9 user_id=1',
        ),
      );
    });

    // Falsifier 2 (tasks.md T-04): dropping the in-use check must fail THIS
    // on the ConflictException, and prove nothing was deleted.
    it('throws 409 naming the count and proposing deactivation when in-use > 0, deletes nothing, and warns (R-CTL-005)', async () => {
      mockValueFindOne.mockResolvedValue(
        buildValue({ id: 9, list_id: 2, value: 'Division' }),
      );
      mockGetInUseCount.mockResolvedValue(3);

      let thrown: unknown;
      try {
        await service.removeValue(9);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toMatchObject({
        status: 409,
        response: {
          message: {
            description: expect.stringMatching(/\b3\b.*deactivat/i),
          },
        },
      });
      expect(mockValueDelete).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.blocked_delete entity=control_list_value id=9 reason=in_use count=3',
        ),
      );
    });
  });

  // @akili-spec institutional-performance/organizational-structure (T-04, R-ORG-011 AC.2):
  // the registry check is a pre-check; a consumer that never registered, or a
  // race, reaches the database FK (errno 1451) and must read as 409, not 500.
  describe('removeValue FK backstop (errno 1451, org-structure T-04)', () => {
    it('maps a simulated errno 1451 to a 409 proposing deactivation when the registry reports 0', async () => {
      mockValueFindOne.mockResolvedValue(
        buildValue({ id: 23, list_id: 2, value: 'L4 Unit' }),
      );
      mockGetInUseCount.mockResolvedValue(0);
      mockValueDelete.mockRejectedValue({ errno: 1451 });

      await expect(service.removeValue(23)).rejects.toMatchObject({
        status: 409,
        response: {
          message: { description: expect.stringMatching(/deactivate/i) },
        },
      });
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('rethrows any other delete error unchanged', async () => {
      const failure = { errno: 1205, message: 'lock wait timeout' };
      mockValueFindOne.mockResolvedValue(buildValue({ id: 9, list_id: 2 }));
      mockGetInUseCount.mockResolvedValue(0);
      mockValueDelete.mockRejectedValue(failure);

      await expect(service.removeValue(9)).rejects.toBe(failure);
    });
  });

  describe('getValuesByKey (A13, T-04, R-CLG-009)', () => {
    // R-CLG-004: the key alone selects the list - no scope key in the lookup.
    it('throws NotFoundException for an unknown key (R-CLG-004 AC.1) without building a query', async () => {
      mockListFindOne.mockResolvedValue(null);

      await expect(service.getValuesByKey('kpi.unknown', true)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockListFindOne).toHaveBeenCalledWith({
        where: { list_key: 'kpi.unknown', is_active: true },
      });
      expect(mockValueCreateQueryBuilder).not.toHaveBeenCalled();
    });

    // R-CTL-006 "Ordered read" + the natural-sort tie-break (same family as
    // T-03's comparator fixture): equal display order, UOM-2 before UOM-10.
    it('orders by display order first, then natural code (UOM-2 before UOM-10 at equal order)', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({ id: 3, list_key: 'kpi.unit_of_measure' }),
      );
      mockQbGetMany.mockResolvedValue([
        buildValue({ id: 1, list_id: 3, code: 'UOM-10', display_order: 1 }),
        buildValue({ id: 2, list_id: 3, code: 'UOM-2', display_order: 1 }),
        buildValue({ id: 3, list_id: 3, code: 'UOM-1', display_order: 0 }),
      ]);

      const result = await service.getValuesByKey('kpi.unit_of_measure', true);

      expect(result.map((v) => v.code)).toEqual(['UOM-1', 'UOM-2', 'UOM-10']);
    });

    // KZ-017: the next four tests pin PLUMBING on a chainable double - which
    // clauses are added in which situation. They do NOT, and cannot, show the
    // operator precedence of the generated SQL: that property (the `OR` of the
    // portfolio condition never widening the surrounding `AND`s) is asserted on
    // a real MySQL in `test/control-lists-applies-to.integration-spec.ts`.
    it('restricts to the list and, when activeOnly is true (default), to active values', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));

      await service.getValuesByKey('kpi.direction', true);

      expect(mockQbWhere).toHaveBeenCalledWith('cv.list_id = :listId', {
        listId: 3,
      });
      expect(mockQbAndWhere).toHaveBeenCalledWith('cv.is_active = :isActive', {
        isActive: true,
      });
    });

    // R-CTL-004 "Deactivate": activeOnly=false includes inactive values.
    it('adds no active clause when activeOnly is false', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));

      await service.getValuesByKey('kpi.direction', false);

      expect(mockQbWhere).toHaveBeenCalledWith('cv.list_id = :listId', {
        listId: 3,
      });
      expect(mockQbAndWhere).not.toHaveBeenCalled();
    });

    // R-CLG-009 *No filter*: without portfolioId every value is returned, and
    // no portfolio is even looked up.
    it('adds no portfolio condition and asks no portfolio question without portfolioId', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));

      await service.getValuesByKey('kpi.direction', true);

      expect(mockPortfolioFindOne).not.toHaveBeenCalled();
      const conditions = mockQbAndWhere.mock.calls.map((call) => call[0]);
      expect(conditions.some((c) => c instanceof Brackets)).toBe(false);
    });

    it('adds the portfolio condition as ONE Brackets group when portfolioId names an active portfolio', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));
      mockPortfolioFindOne.mockResolvedValue({ id: 2 });

      await service.getValuesByKey('kpi.direction', true, 2);

      expect(mockPortfolioFindOne).toHaveBeenCalledWith({
        where: { id: 2, is_active: true },
        select: { id: true },
      });
      const brackets = mockQbAndWhere.mock.calls
        .map((call) => call[0])
        .filter((c) => c instanceof Brackets);
      expect(brackets).toHaveLength(1);
    });

    // R-CLG-009 *Unknown portfolio*: 404 on the read; the lookup asks for an
    // ACTIVE portfolio, so an inactive one is the same 404.
    it('answers 404 for an unknown or inactive portfolioId and reads no values', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));
      mockPortfolioFindOne.mockResolvedValue(null);

      await expect(
        service.getValuesByKey('kpi.direction', true, 99),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Portfolio 99 not found',
      });
      expect(mockPortfolioFindOne.mock.calls[0][0].where.is_active).toBe(true);
      expect(mockValueCreateQueryBuilder).not.toHaveBeenCalled();
      expect(mockQbGetMany).not.toHaveBeenCalled();
    });

    it('attaches the summed in-use count per value, same as A9', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));
      mockQbGetMany.mockResolvedValue([
        buildValue({ id: 1, list_id: 3, code: 'DIR-01', display_order: 0 }),
      ]);
      mockGetInUseCounts.mockResolvedValue(new Map([[1, 4]]));

      const result = await service.getValuesByKey('kpi.direction', true);

      expect(result[0].inUse).toBe(4);
    });

    // R-CLG-009 *No filter*: each value carries its Applies to set.
    it('attaches appliesTo / appliesToAll to every value', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));
      mockQbGetMany.mockResolvedValue([
        buildValue({ id: 1, list_id: 3, code: 'DIR-01', display_order: 0 }),
        buildValue({ id: 3, list_id: 3, code: 'DIR-03', display_order: 2 }),
      ]);
      mockLinkFind.mockResolvedValue([{ value_id: '3', portfolio_id: '2' }]);
      mockPortfolioFind.mockResolvedValue([{ id: 2 }]);

      const result = await service.getValuesByKey('kpi.direction', true);

      expect(result.map((v) => [v.id, v.appliesTo, v.appliesToAll])).toEqual([
        [1, [], true],
        [3, [2], false],
      ]);
    });
  });
});
