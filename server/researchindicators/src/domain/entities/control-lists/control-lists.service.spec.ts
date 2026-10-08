import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ControlListUsageRegistry } from './control-list-usage.registry';
import { ControlListCategory } from './entities/control-list-category.entity';
import { ControlList } from './entities/control-list.entity';
import { ControlListValue } from './entities/control-list-value.entity';
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

  const mockValueRepository = {
    find: mockValueFind,
    findOne: mockValueFindOne,
    count: mockValueCount,
    save: mockValueSave,
    update: mockValueUpdate,
    delete: mockValueDelete,
  };

  const mockPortfoliosFindOne = jest.fn();
  const mockPortfoliosFindAll = jest.fn();
  const mockPortfoliosService = {
    findOne: mockPortfoliosFindOne,
    findAll: mockPortfoliosFindAll,
  };

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
      portfolio_id: 2,
      name: 'Key Performance Indicators (KPIs)',
      description: null,
      display_order: 1,
      is_active: true,
      ...overrides,
    }) as ControlListCategory;

  const buildList = (overrides: Partial<ControlList> = {}): ControlList =>
    ({
      id: 1,
      portfolio_id: 2,
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
        { provide: PortfoliosService, useValue: mockPortfoliosService },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: ControlListUsageRegistry, useValue: mockUsageRegistry },
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
    it('throws NotFoundException when the portfolio does not exist', async () => {
      mockPortfoliosFindOne.mockResolvedValue(null);

      await expect(service.getCategories(99)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('returns categories for the portfolio with lists: [] when none exist', async () => {
      mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
      mockFind.mockResolvedValue([
        buildCategory({ id: 1, portfolio_id: 2, name: 'KPIs' }),
        buildCategory({ id: 2, portfolio_id: 2, name: 'Org structure' }),
      ]);
      mockListFind.mockResolvedValue([]);

      const result = await service.getCategories(2);

      expect(mockFind).toHaveBeenCalledWith({
        where: { portfolio_id: 2, is_active: true },
        order: { display_order: 'ASC', id: 'ASC' },
      });
      expect(mockListFind).toHaveBeenCalledWith({
        where: { portfolio_id: 2, is_active: true },
        order: { id: 'ASC' },
      });
      expect(result).toEqual([
        {
          id: 1,
          portfolioId: 2,
          name: 'KPIs',
          description: null,
          displayOrder: 1,
          lists: [],
        },
        {
          id: 2,
          portfolioId: 2,
          name: 'Org structure',
          description: null,
          displayOrder: 1,
          lists: [],
        },
      ]);
    });

    it('attaches each category its own lists as ListSummary[] (A1, T-02)', async () => {
      mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
      mockFind.mockResolvedValue([
        buildCategory({ id: 1, portfolio_id: 2, name: 'KPIs' }),
        buildCategory({ id: 2, portfolio_id: 2, name: 'Org structure' }),
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

      const result = await service.getCategories(2);

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
      mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
      mockFind.mockResolvedValue([buildCategory({ id: 2, portfolio_id: 2 })]);
      mockListFind.mockResolvedValue([
        buildList({ id: 6, category_id: 2, list_key: 'org.level' }),
      ]);
      mockGetConsumerNamesForKey.mockImplementation((key: string) =>
        key === 'org.level' ? ['Organizational Structure › Level'] : [],
      );

      const result = await service.getCategories(2);

      expect(mockGetConsumerNamesForKey).toHaveBeenCalledWith('org.level');
      expect(result[0].lists[0].usedBy).toEqual([
        'Organizational Structure › Level',
      ]);
    });
  });

  describe('getPortfoliosSummary', () => {
    it('returns a category count per active portfolio (A2 drives "not configured")', async () => {
      mockPortfoliosFindAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockCount.mockImplementation(async ({ where }: any) =>
        where.portfolio_id === 2 ? 2 : 0,
      );

      const result = await service.getPortfoliosSummary();

      expect(result).toEqual([
        { portfolioId: 1, categories: 0 },
        { portfolioId: 2, categories: 2 },
      ]);
    });
  });

  describe('createCategory', () => {
    const dto: CreateControlListCategoryDto = {
      portfolioId: 2,
      name: 'Key Performance Indicators (KPIs)',
      description: 'desc',
    };

    it('throws NotFoundException for an unknown portfolio', async () => {
      mockPortfoliosFindOne.mockResolvedValue(null);

      await expect(service.createCategory(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('throws a field-named ConflictException on a pre-checked duplicate name (any letter case)', async () => {
      mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
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

    it('maps a simulated errno 1062 on save to a 409 (DB backstop, D-CTL-11)', async () => {
      mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
      mockFindOne.mockResolvedValue(null); // pre-check passes
      mockSave.mockRejectedValue({ errno: 1062 });

      await expect(service.createCategory(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a category and maps the response, auditing created_by', async () => {
      mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(
        buildCategory({ id: 5, name: dto.name, description: dto.description }),
      );

      const result = await service.createCategory(dto);

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolio_id: 2,
          name: dto.name,
          description: dto.description,
          created_by: 1,
        }),
      );
      expect(result).toEqual({
        id: 5,
        portfolioId: 2,
        name: dto.name,
        description: dto.description,
        displayOrder: 1,
        lists: [],
      });
      // design.md §9: info-level log on create (entity, id, portfolio, user).
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.created entity=control_list_category id=5 portfolio_id=2 user_id=1',
        ),
      );
    });

    it('does NOT log when create fails on a pre-checked duplicate name', async () => {
      mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
      mockFindOne.mockResolvedValue(
        buildCategory({ name: 'key performance indicators (kpis)' }),
      );

      await expect(service.createCategory(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('allows the same name in two different portfolios', async () => {
      mockPortfoliosFindOne.mockResolvedValue({ id: 1 });
      // Pre-check is scoped by portfolio_id — a match in another portfolio
      // must not block this create (R-CTL-001 isolation).
      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(
        buildCategory({ id: 9, portfolio_id: 1, name: dto.name }),
      );

      await service.createCategory({ ...dto, portfolioId: 1 });

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { portfolio_id: 1, name: dto.name, is_active: true },
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
        mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
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

    it('maps a simulated errno 1062 on update to a 409', async () => {
      mockFindOne
        .mockResolvedValueOnce(buildCategory({ id: 1, name: 'Old name' }))
        .mockResolvedValueOnce(null); // no name-change pre-check collision
      mockUpdate.mockRejectedValue({ errno: 1062 });

      await expect(
        service.updateCategory(1, { name: 'Renamed' }),
      ).rejects.toThrow(ConflictException);
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
      // design.md §9: info-level log on update (entity, id, portfolio, user).
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.updated entity=control_list_category id=1 portfolio_id=2 user_id=1',
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
      // design.md §9: info-level log on delete (entity, id, portfolio, user).
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.deleted entity=control_list_category id=7 portfolio_id=2 user_id=1',
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

    it('copies portfolio_id from the category and creates a non-system list', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1, portfolio_id: 2 }));
      mockListFindOne.mockResolvedValue(null); // key pre-check passes
      mockListSave.mockResolvedValue(
        buildList({
          id: 7,
          portfolio_id: 2,
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
          portfolio_id: 2,
          category_id: 1,
          list_key: dto.listKey,
          name: dto.name,
          is_system: false,
          created_by: 1,
        }),
      );
      expect(result).toMatchObject({
        id: 7,
        portfolioId: 2,
        categoryId: 1,
        key: dto.listKey,
        name: dto.name,
        isSystem: false,
      });
    });

    it.each(['', '   '])(
      'treats codePrefix %j as absent and stores the derived prefix (A-1)',
      async (codePrefix) => {
        mockFindOne.mockResolvedValue(
          buildCategory({ id: 1, portfolio_id: 2 }),
        );
        mockListFindOne.mockResolvedValue(null);
        mockListSave.mockResolvedValue(buildList({ id: 8 }));

        await service.createList({ ...dto, codePrefix });

        expect(mockListSave).toHaveBeenCalledWith(
          expect.objectContaining({ code_prefix: 'KPICUSTOMS' }),
        );
      },
    );

    it('stores a given codePrefix trimmed (" DIR " -> "DIR")', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1, portfolio_id: 2 }));
      mockListFindOne.mockResolvedValue(null);
      mockListSave.mockResolvedValue(buildList({ id: 8 }));

      await service.createList({ ...dto, codePrefix: ' DIR ' });

      expect(mockListSave).toHaveBeenCalledWith(
        expect.objectContaining({ code_prefix: 'DIR' }),
      );
    });

    it('throws a field-named ConflictException (field: listKey) on a pre-checked duplicate key', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1, portfolio_id: 2 }));
      mockListFindOne.mockResolvedValue(buildList({ list_key: dto.listKey }));

      await expect(service.createList(dto)).rejects.toMatchObject({
        status: 409,
        response: { message: expect.objectContaining({ field: 'listKey' }) },
      });
      expect(mockListSave).not.toHaveBeenCalled();
    });

    it('maps a simulated errno 1062 on save to a 409 (DB backstop)', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1, portfolio_id: 2 }));
      mockListFindOne.mockResolvedValue(null);
      mockListSave.mockRejectedValue({ errno: 1062 });

      await expect(service.createList(dto)).rejects.toThrow(ConflictException);
    });

    // Disqualifier guard (tasks.md T-02): proves isolation with TWO
    // portfolios holding the SAME key — Portfolio 1 allows `org.level` even
    // though Portfolio 2 already has it (R-CTL-003 "Same key in two
    // portfolios").
    it('allows the same key in two different portfolios', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 3, portfolio_id: 1 }));
      mockListFindOne.mockResolvedValue(null);
      mockListSave.mockResolvedValue(
        buildList({
          id: 9,
          portfolio_id: 1,
          category_id: 3,
          list_key: 'org.level',
        }),
      );

      await service.createList({
        categoryId: 3,
        listKey: 'org.level',
        name: 'Organizational level',
      });

      expect(mockListFindOne).toHaveBeenCalledWith({
        where: { portfolio_id: 1, list_key: 'org.level', is_active: true },
      });
    });

    it('logs on successful create', async () => {
      mockFindOne.mockResolvedValue(buildCategory({ id: 1, portfolio_id: 2 }));
      mockListFindOne.mockResolvedValue(null);
      mockListSave.mockResolvedValue(buildList({ id: 7, portfolio_id: 2 }));

      await service.createList(dto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.created entity=control_list id=7 portfolio_id=2 user_id=1',
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
        mockFindOne.mockResolvedValue(
          buildCategory({ id: 1, portfolio_id: 2 }),
        );
        mockListFindOne.mockResolvedValue(null);
        mockListSave.mockResolvedValue(
          buildList({ id: 7, portfolio_id: 2, description: null }),
        );

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

    it('allows moving a list to another category of the SAME portfolio', async () => {
      mockListFindOne
        .mockResolvedValueOnce(
          buildList({ id: 1, portfolio_id: 2, category_id: 1 }),
        )
        .mockResolvedValueOnce(
          buildList({ id: 1, portfolio_id: 2, category_id: 4 }),
        );
      mockFindOne.mockResolvedValue(buildCategory({ id: 4, portfolio_id: 2 }));
      mockListUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.updateList(1, { categoryId: 4 });

      expect(mockListUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ category_id: 4 }),
      );
      expect(result.categoryId).toBe(4);
    });

    // Falsifier 3 (tasks.md T-02) / D-CTL-13 / judgment J-4: moving a list to
    // a category of ANOTHER portfolio is 400, never 409, and nothing moves.
    it('throws BadRequestException (400) when the new category belongs to a different portfolio', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({ id: 1, portfolio_id: 2, category_id: 1 }),
      );
      mockFindOne.mockResolvedValue(buildCategory({ id: 9, portfolio_id: 1 }));

      await expect(service.updateList(1, { categoryId: 9 })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockListUpdate).not.toHaveBeenCalled();
    });

    it('logs on successful update', async () => {
      mockListFindOne
        .mockResolvedValueOnce(buildList({ id: 1, portfolio_id: 2 }))
        .mockResolvedValueOnce(
          buildList({ id: 1, portfolio_id: 2, name: 'Renamed' }),
        );
      mockListUpdate.mockResolvedValue({ affected: 1 });

      await service.updateList(1, { name: 'Renamed' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.updated entity=control_list id=1 portfolio_id=2 user_id=1',
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
        .mockResolvedValueOnce(buildList({ id: 1, portfolio_id: 2 }))
        .mockResolvedValueOnce(
          buildList({ id: 1, portfolio_id: 2, description: null }),
        );
      mockListUpdate.mockResolvedValue({ affected: 1 });

      await service.updateList(1, { description: value });

      expect(mockListUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: null }),
      );
    });

    it('leaves a non-empty description untouched (no over-normalization)', async () => {
      mockListFindOne
        .mockResolvedValueOnce(buildList({ id: 1, portfolio_id: 2 }))
        .mockResolvedValueOnce(
          buildList({ id: 1, portfolio_id: 2, description: 'Kept' }),
        );
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
          portfolio_id: 2,
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
          'control_lists.deleted entity=control_list id=1 portfolio_id=2 user_id=1',
        ),
      );
    });

    // R-CTL-003 "List lifecycle" (no-values branch), custom list.
    it('deletes a custom (non-system) list with no values (200) and logs', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({ id: 8, is_system: false, portfolio_id: 2 }),
      );
      mockValueCount.mockResolvedValue(0);
      mockListDelete.mockResolvedValue({ affected: 1 });

      const result = await service.removeList(8);

      expect(mockValueCount).toHaveBeenCalledWith({ where: { list_id: 8 } });
      expect(mockListDelete).toHaveBeenCalledWith(8);
      expect(result).toEqual({ id: 8 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.deleted entity=control_list id=8 portfolio_id=2 user_id=1',
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
          portfolio_id: 2,
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
          portfolio_id: 2,
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
      mockListFindOne.mockResolvedValue(buildList({ id: 2, portfolio_id: 2 }));
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
          'control_lists.created entity=control_list_value id=11 portfolio_id=2 user_id=1',
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
      mockListFindOne.mockResolvedValue(buildList({ id: 2, portfolio_id: 2 }));

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
      mockListFindOne.mockResolvedValue(buildList({ id: 2, portfolio_id: 2 }));
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
          'control_lists.updated entity=control_list_value id=1 portfolio_id=2 user_id=1',
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
      mockListFindOne.mockResolvedValue(buildList({ id: 2, portfolio_id: 2 }));
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
      mockListFindOne.mockResolvedValue(buildList({ id: 2, portfolio_id: 2 }));
      mockValueUpdate.mockResolvedValue({ affected: 1 });

      await service.updateValue(1, { description: value });

      expect(mockValueUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: null }),
      );
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
      mockListFindOne.mockResolvedValue(buildList({ id: 2, portfolio_id: 2 }));
      mockValueDelete.mockResolvedValue({ affected: 1 });

      const result = await service.removeValue(9);

      expect(mockGetInUseCount).toHaveBeenCalledWith(9);
      expect(mockValueDelete).toHaveBeenCalledWith(9);
      expect(result).toEqual({ id: 9 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.deleted entity=control_list_value id=9 portfolio_id=2 user_id=1',
        ),
      );
    });

    // Falsifier 2 (tasks.md T-04): dropping the in-use check must fail THIS
    // on the ConflictException, and prove nothing was deleted.
    it('throws 409 naming the count and proposing deactivation when in-use > 0, deletes nothing, and warns (R-CTL-005)', async () => {
      mockValueFindOne.mockResolvedValue(
        buildValue({ id: 9, list_id: 2, value: 'Division' }),
      );
      mockListFindOne.mockResolvedValue(buildList({ id: 2, portfolio_id: 2 }));
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

  describe('getValuesByKey (A13, T-04)', () => {
    it('throws NotFoundException for an unknown key in the portfolio (R-CTL-006 "Ordered read")', async () => {
      mockListFindOne.mockResolvedValue(null);

      await expect(
        service.getValuesByKey(2, 'kpi.unknown', true),
      ).rejects.toThrow(NotFoundException);
      expect(mockListFindOne).toHaveBeenCalledWith({
        where: {
          portfolio_id: 2,
          list_key: 'kpi.unknown',
          is_active: true,
        },
      });
    });

    // R-CTL-006 "Ordered read" + the natural-sort tie-break (same family as
    // T-03's comparator fixture): equal display order, UOM-2 before UOM-10.
    it('orders by display order first, then natural code (UOM-2 before UOM-10 at equal order)', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({ id: 3, list_key: 'kpi.unit_of_measure' }),
      );
      mockValueFind.mockResolvedValue([
        buildValue({ id: 1, list_id: 3, code: 'UOM-10', display_order: 1 }),
        buildValue({ id: 2, list_id: 3, code: 'UOM-2', display_order: 1 }),
        buildValue({ id: 3, list_id: 3, code: 'UOM-1', display_order: 0 }),
      ]);

      const result = await service.getValuesByKey(
        2,
        'kpi.unit_of_measure',
        true,
      );

      expect(result.map((v) => v.code)).toEqual(['UOM-1', 'UOM-2', 'UOM-10']);
    });

    it('reads with is_active: true when activeOnly is true (default)', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));
      mockValueFind.mockResolvedValue([]);

      await service.getValuesByKey(2, 'kpi.direction', true);

      expect(mockValueFind).toHaveBeenCalledWith({
        where: { list_id: 3, is_active: true },
      });
    });

    // R-CTL-004 "Deactivate": the consumer read with activeOnly=true omits
    // inactive values; activeOnly=false includes them.
    it('reads without an is_active filter when activeOnly is false', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));
      mockValueFind.mockResolvedValue([]);

      await service.getValuesByKey(2, 'kpi.direction', false);

      expect(mockValueFind).toHaveBeenCalledWith({
        where: { list_id: 3 },
      });
    });

    it('attaches the summed in-use count per value, same as A9', async () => {
      mockListFindOne.mockResolvedValue(buildList({ id: 3 }));
      mockValueFind.mockResolvedValue([
        buildValue({ id: 1, list_id: 3, code: 'DIR-01', display_order: 0 }),
      ]);
      mockGetInUseCounts.mockResolvedValue(new Map([[1, 4]]));

      const result = await service.getValuesByKey(2, 'kpi.direction', true);

      expect(result[0].inUse).toBe(4);
    });
  });
});
