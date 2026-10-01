import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { ControlListsController } from './control-lists.controller';
import { ControlListsService } from './control-lists.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';
import { RolesGuard, ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { UpdateControlListCategoryDto } from './dto/update-control-list-category.dto';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';

jest.mock('../../shared/utils/response.utils');

describe('ControlListsController', () => {
  let controller: ControlListsController;

  const mockService = {
    getCategories: jest.fn(),
    getPortfoliosSummary: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    removeCategory: jest.fn(),
  };

  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ControlListsController],
      providers: [
        { provide: ControlListsService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
        mockPortfolioUtilProvider,
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ControlListsController>(ControlListsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Falsifier 4 (tasks.md T-01): adding TECHNICAL_SUPPORT to any of A1–A5
  // must fail this test. D-CTL-7: unlike portfolios.controller, this module
  // grants only CENTER_ADMIN + SYSTEM_ADMIN.
  describe('roles metadata (NFR-CTL-002, D-CTL-7)', () => {
    const handlers: Array<keyof ControlListsController> = [
      'getCategories',
      'getPortfoliosSummary',
      'createCategory',
      'updateCategory',
      'removeCategory',
    ];

    it.each(handlers)(
      '%s declares exactly [CENTER_ADMIN, SYSTEM_ADMIN]',
      (handlerName) => {
        const roles = Reflect.getMetadata(
          ROLES_KEY,
          ControlListsController.prototype[handlerName],
        );
        expect(roles).toEqual([
          SecRolesEnum.CENTER_ADMIN,
          SecRolesEnum.SYSTEM_ADMIN,
        ]);
      },
    );
  });

  describe('getCategories (A1)', () => {
    it('reads portfolioId from the query and returns the formatted envelope', async () => {
      const query: GetCategoriesQueryDto = { portfolioId: 2 };
      const data = [{ id: 1, portfolioId: 2, name: 'KPIs', lists: [] }];
      mockService.getCategories.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.getCategories(query);

      expect(mockService.getCategories).toHaveBeenCalledWith(2);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Categories found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('getPortfoliosSummary (A2)', () => {
    it('returns the formatted envelope', async () => {
      const data = [{ portfolioId: 1, categories: 0 }];
      mockService.getPortfoliosSummary.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.getPortfoliosSummary();

      expect(mockService.getPortfoliosSummary).toHaveBeenCalled();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Portfolio category summary found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('createCategory (A3)', () => {
    it('creates a category and returns 201', async () => {
      const dto: CreateControlListCategoryDto = {
        portfolioId: 2,
        name: 'KPIs',
      };
      const data = { id: 1, ...dto };
      mockService.createCategory.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.createCategory(dto);

      expect(mockService.createCategory).toHaveBeenCalledWith(dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Category created successfully',
        data,
        status: HttpStatus.CREATED,
      });
    });
  });

  describe('updateCategory (A4)', () => {
    it('updates a category and returns 200', async () => {
      const dto: UpdateControlListCategoryDto = { name: 'Renamed' };
      const data = { id: 4, name: 'Renamed' };
      mockService.updateCategory.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.updateCategory(4, dto);

      expect(mockService.updateCategory).toHaveBeenCalledWith(4, dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Category updated successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('removeCategory (A5)', () => {
    it('deletes a category and returns its id', async () => {
      const data = { id: 9 };
      mockService.removeCategory.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.removeCategory(9);

      expect(mockService.removeCategory).toHaveBeenCalledWith(9);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Category 9 was deleted successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });
});
