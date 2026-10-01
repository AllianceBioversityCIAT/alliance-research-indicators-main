import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ControlListCategory } from './entities/control-list-category.entity';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
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

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCurrentUser.audit.mockReturnValue({ created_by: 1 });
    logSpy = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControlListsService,
        {
          provide: ControlListCategoryRepository,
          useValue: mockCategoryRepository,
        },
        { provide: PortfoliosService, useValue: mockPortfoliosService },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ControlListsService>(ControlListsService);
  });

  afterEach(() => {
    logSpy.mockRestore();
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

    it('returns categories for the portfolio with lists: [] (T-01 slice)', async () => {
      mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
      mockFind.mockResolvedValue([
        buildCategory({ id: 1, portfolio_id: 2, name: 'KPIs' }),
        buildCategory({ id: 2, portfolio_id: 2, name: 'Org structure' }),
      ]);

      const result = await service.getCategories(2);

      expect(mockFind).toHaveBeenCalledWith({
        where: { portfolio_id: 2, is_active: true },
        order: { display_order: 'ASC', id: 'ASC' },
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
  });
});
