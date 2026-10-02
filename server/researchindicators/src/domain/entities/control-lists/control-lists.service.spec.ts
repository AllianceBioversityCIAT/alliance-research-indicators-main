import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ControlListCategory } from './entities/control-list-category.entity';
import { ControlList } from './entities/control-list.entity';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { CreateControlListDto } from './dto/create-control-list.dto';
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

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCurrentUser.audit.mockReturnValue({ created_by: 1 });
    // Default: no lists, so existing category-only assertions below keep
    // their original shape unless a test overrides mockListFind itself.
    mockListFind.mockResolvedValue([]);
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
        { provide: PortfoliosService, useValue: mockPortfoliosService },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
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
          valueCount: 0,
          isSystem: true,
          usedBy: [],
        },
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

    // R-CTL-003 "System list cannot be deleted".
    it('throws ConflictException (409) for a system list and logs a warning, deleting nothing', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({
          id: 1,
          is_system: true,
          name: 'Direction',
          list_key: 'kpi.direction',
        }),
      );

      await expect(service.removeList(1)).rejects.toThrow(ConflictException);
      expect(mockListDelete).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.blocked_delete entity=control_list id=1 reason=is_system',
        ),
      );
    });

    // R-CTL-003 "Custom list lifecycle" (no-values branch; the "has values"
    // 409 is T-03's — control_list_values does not exist in this slice).
    it('deletes a custom (non-system) list with no values (200) and logs', async () => {
      mockListFindOne.mockResolvedValue(
        buildList({ id: 8, is_system: false, portfolio_id: 2 }),
      );
      mockListDelete.mockResolvedValue({ affected: 1 });

      const result = await service.removeList(8);

      expect(mockListDelete).toHaveBeenCalledWith(8);
      expect(result).toEqual({ id: 8 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'control_lists.deleted entity=control_list id=8 portfolio_id=2 user_id=1',
        ),
      );
    });
  });
});
