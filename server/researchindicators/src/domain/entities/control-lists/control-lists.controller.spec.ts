import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ControlListsController } from './control-lists.controller';
import { ControlListsService } from './control-lists.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RolesGuard, ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { UpdateControlListCategoryDto } from './dto/update-control-list-category.dto';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { CreateControlListDto } from './dto/create-control-list.dto';
import { UpdateControlListDto } from './dto/update-control-list.dto';
import { CreateControlListValueDto } from './dto/create-control-list-value.dto';
import { UpdateControlListValueDto } from './dto/update-control-list-value.dto';

jest.mock('../../shared/utils/response.utils');

describe('ControlListsController', () => {
  let controller: ControlListsController;

  const mockService = {
    getCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    removeCategory: jest.fn(),
    createList: jest.fn(),
    updateList: jest.fn(),
    removeList: jest.fn(),
    getValues: jest.fn(),
    createValue: jest.fn(),
    updateValue: jest.fn(),
    removeValue: jest.fn(),
    getValuesByKey: jest.fn(),
  };

  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ControlListsController],
      providers: [{ provide: ControlListsService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      // The controller's `@UseInterceptors(SetUpInterceptor)` only primes
      // per-request context this module never reads; replacing it keeps its
      // own dependencies out of the test module.
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    controller = module.get<ControlListsController>(ControlListsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // R-CLG-008 / D-CLG-8: every admin handler (A1, A3-A12) is exactly
  // [SYSTEM_ADMIN, TECHNICAL_SUPPORT]; the consumer read (A13) has no roles
  // at all. The handler list is DISCOVERED from the prototype, not typed, so
  // a handler added later without a decision on roles cannot slip through,
  // and a handler that keeps CENTER_ADMIN fails on its own name.
  describe('roles metadata (R-CLG-008, NFR-CTL-002)', () => {
    const proto = ControlListsController.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    const handlerNames = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor' && typeof proto[name] === 'function',
    );
    const adminHandlers = handlerNames.filter(
      (name) => name !== 'getValuesByKey',
    );

    it('discovers the 11 admin handlers plus the consumer read (A2 is gone)', () => {
      expect(adminHandlers).toHaveLength(11);
      expect(handlerNames).toHaveLength(12);
      expect(handlerNames).not.toContain('getPortfoliosSummary');
    });

    it.each(adminHandlers)(
      '%s declares exactly [SYSTEM_ADMIN, TECHNICAL_SUPPORT]',
      (handlerName) => {
        const roles = Reflect.getMetadata(ROLES_KEY, proto[handlerName]);
        expect(roles).toEqual([
          SecRolesEnum.SYSTEM_ADMIN,
          SecRolesEnum.TECHNICAL_SUPPORT,
        ]);
      },
    );

    it('never grants CENTER_ADMIN on any handler', () => {
      for (const handlerName of handlerNames) {
        const roles: SecRolesEnum[] | undefined = Reflect.getMetadata(
          ROLES_KEY,
          proto[handlerName],
        );
        expect(roles ?? []).not.toContain(SecRolesEnum.CENTER_ADMIN);
      }
    });
  });

  // R-CLG-007: the portfolio-summaries route (A2) is removed, so the
  // controller's route table is exactly these twelve handlers.
  describe('route inventory (R-CLG-007)', () => {
    const proto = ControlListsController.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    const routes = Object.getOwnPropertyNames(proto)
      .filter(
        (name) => name !== 'constructor' && typeof proto[name] === 'function',
      )
      .map((name) => {
        const method: RequestMethod = Reflect.getMetadata(
          METHOD_METADATA,
          proto[name],
        );
        const path: string = Reflect.getMetadata(PATH_METADATA, proto[name]);
        return `${RequestMethod[method]} ${path}`;
      })
      .sort();

    it('lists exactly the twelve remaining routes', () => {
      expect(routes).toEqual(
        [
          'GET categories',
          'POST categories',
          'PATCH categories/:id',
          'DELETE categories/:id',
          'POST lists',
          'PATCH lists/:id',
          'DELETE lists/:id',
          'GET lists/:id/values',
          'POST lists/:id/values',
          'PATCH values/:id',
          'DELETE values/:id',
          'GET by-key/:listKey/values',
        ].sort(),
      );
    });

    it('has no portfolios/summary route', () => {
      expect(routes.filter((route) => route.includes('portfolios'))).toEqual(
        [],
      );
    });
  });

  describe('getCategories (A1)', () => {
    it('reads without any scope argument and returns the formatted envelope', async () => {
      const query: GetCategoriesQueryDto = {};
      const data = [{ id: 1, name: 'KPIs', lists: [] }];
      mockService.getCategories.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.getCategories(query);

      expect(mockService.getCategories).toHaveBeenCalledWith();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Categories found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('createCategory (A3)', () => {
    it('creates a category and returns 201', async () => {
      const dto: CreateControlListCategoryDto = { name: 'KPIs' };
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

  describe('createList (A6)', () => {
    it('creates a list and returns 201', async () => {
      const dto: CreateControlListDto = {
        categoryId: 1,
        listKey: 'kpi.custom_source',
        name: 'Custom source',
      };
      const data = { id: 7, ...dto };
      mockService.createList.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.createList(dto);

      expect(mockService.createList).toHaveBeenCalledWith(dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'List created successfully',
        data,
        status: HttpStatus.CREATED,
      });
    });
  });

  describe('updateList (A7)', () => {
    it('updates a list and returns 200', async () => {
      const dto: UpdateControlListDto = { name: 'Renamed list' };
      const data = { id: 2, name: 'Renamed list' };
      mockService.updateList.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.updateList(2, dto);

      expect(mockService.updateList).toHaveBeenCalledWith(2, dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'List updated successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('removeList (A8)', () => {
    it('deletes a list and returns its id', async () => {
      const data = { id: 3 };
      mockService.removeList.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.removeList(3);

      expect(mockService.removeList).toHaveBeenCalledWith(3);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'List 3 was deleted successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('getValues (A9)', () => {
    it('reads the list id from the param and returns the formatted envelope', async () => {
      const data = [{ id: 1, listId: 2, code: 'DIR-01', value: 'Increase' }];
      mockService.getValues.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.getValues(2);

      expect(mockService.getValues).toHaveBeenCalledWith(2);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Values found',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('createValue (A10)', () => {
    it('creates a value and returns 201', async () => {
      const dto: CreateControlListValueDto = { value: 'Hold' };
      const data = { id: 7, listId: 2, code: 'DIR-03', ...dto };
      mockService.createValue.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.createValue(2, dto);

      expect(mockService.createValue).toHaveBeenCalledWith(2, dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Value created successfully',
        data,
        status: HttpStatus.CREATED,
      });
    });
  });

  describe('updateValue (A11)', () => {
    it('updates a value and returns 200', async () => {
      const dto: UpdateControlListValueDto = { value: 'Renamed value' };
      const data = { id: 5, value: 'Renamed value' };
      mockService.updateValue.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.updateValue(5, dto);

      expect(mockService.updateValue).toHaveBeenCalledWith(5, dto);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Value updated successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('removeValue (A12)', () => {
    it('deletes a value and returns its id', async () => {
      const data = { id: 6 };
      mockService.removeValue.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.removeValue(6);

      expect(mockService.removeValue).toHaveBeenCalledWith(6);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Value 6 was deleted successfully',
        data,
        status: HttpStatus.OK,
      });
    });
  });

  describe('getValuesByKey (A13, T-04)', () => {
    it('reads listKey from the param and activeOnly from the query, returning the envelope', async () => {
      const query = { activeOnly: true };
      const data = [{ id: 1, listId: 3, code: 'DIR-01', value: 'Increase' }];
      mockService.getValuesByKey.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: true });

      await controller.getValuesByKey('kpi.direction', query);

      expect(mockService.getValuesByKey).toHaveBeenCalledWith(
        'kpi.direction',
        true,
      );
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Values found',
        data,
        status: HttpStatus.OK,
      });
    });

    it('defaults activeOnly to true when the query omits it', async () => {
      const query = {} as any;
      mockService.getValuesByKey.mockResolvedValue([]);
      mockFormat.mockReturnValue({ ok: true });

      await controller.getValuesByKey('kpi.direction', query);

      expect(mockService.getValuesByKey).toHaveBeenCalledWith(
        'kpi.direction',
        true,
      );
    });

    // Falsifier 5 (tasks.md T-04): adding @Roles to A13 must fail this test
    // (R-CTL-007 "the consumer read is available to any authenticated
    // user").
    it('declares NO roles metadata — open to any authenticated user (design §8)', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        ControlListsController.prototype.getValuesByKey,
      );
      expect(roles).toBeUndefined();
    });
  });
});
