import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { LoggerUtil } from '../../shared/utils/logger.util';

/**
 * T-01 rework, Risk Reviewer issue 1 (verbatim): "the duplicate-name 409
 * never reaches the user as the server wrote it" — the service throws
 * `ConflictException({ message: { description, field } })`, and what the
 * CLIENT actually receives depends on what `GlobalExceptions` does with
 * that shape, not on what the service intended. This suite throws REAL
 * exceptions from the REAL `ControlListsService` (only the repository/
 * portfolio dependencies are mocked) through the REAL `GlobalExceptions`
 * filter and pins the exact JSON body on the wire.
 *
 * Leader decision: KEEP the server payload as-is (`errors: { description,
 * field }` for the 409). This file is the contract test the Risk Reviewer
 * asked for "so the contract is tested where it is produced (KZ-017)".
 *
 * T-02 extends this with the list contract (forward pointer from T-01,
 * Leader contract note mid-T-02): duplicate list key is the same
 * {description, field} object shape (field: 'listKey'); a system-list
 * delete and a category-with-lists delete are NON-field conflicts, so the
 * service throws `ConflictException({ message: { description } })` — the
 * SAME envelope as the field-named conflicts, minus the `field` key.
 * `GlobalExceptions` therefore puts the OBJECT `{description}` on the wire
 * as `errors` for these two as well, never a bare string, so the client can
 * read `errors.description` uniformly for every 409 this module throws. The
 * cross-portfolio list move (400) is the one exception: it is a plain
 * string, like the 404 test below.
 *
 * T-03 extends this with the values contract: duplicate code/value are the
 * SAME {description, field} object shape (field: 'code' | 'value'); a
 * list-has-values delete is a non-field conflict, the same envelope as the
 * T-02 non-field conflicts above, minus the `field` key.
 */
describe('Control Lists — real GlobalExceptions contract (T-01/T-02)', () => {
  let service: ControlListsService;
  let filter: GlobalExceptions;
  let errorSpy: jest.SpyInstance;

  const mockFindOne = jest.fn();
  const mockSave = jest.fn();
  const mockCategoryRepository = {
    find: jest.fn(),
    findOne: mockFindOne,
    count: jest.fn(),
    save: mockSave,
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockListFindOne = jest.fn();
  const mockListFind = jest.fn();
  const mockListSave = jest.fn();
  const mockListDelete = jest.fn();
  const mockListRepository = {
    find: mockListFind,
    findOne: mockListFindOne,
    save: mockListSave,
    update: jest.fn(),
    delete: mockListDelete,
  };

  const mockValueFindOne = jest.fn();
  const mockValueFind = jest.fn();
  const mockValueCount = jest.fn();
  const mockValueSave = jest.fn();
  const mockValueDelete = jest.fn();
  const mockValueRepository = {
    find: mockValueFind,
    findOne: mockValueFindOne,
    count: mockValueCount,
    save: mockValueSave,
    update: jest.fn(),
    delete: mockValueDelete,
  };

  const mockPortfoliosFindOne = jest.fn();
  const mockPortfoliosService = {
    findOne: mockPortfoliosFindOne,
    findAll: jest.fn(),
  };

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ created_by: 1 }),
    user_id: 1,
  };

  function makeHost(request: any) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };
    return { host, status, json };
  }

  beforeAll(() => {
    // GlobalExceptions logs via LoggerUtil._error on every catch; silence it
    // the same way global.exception.spec.ts does, so this suite stays about
    // the JSON body, not console noise.
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCurrentUser.audit.mockReturnValue({ created_by: 1 });
    jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
    jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    mockValueCount.mockResolvedValue(0);

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
      ],
    }).compile();

    service = module.get<ControlListsService>(ControlListsService);
    filter = new GlobalExceptions();
  });

  it('409 duplicate name: errors is the OBJECT {description, field: "name"}, description is the exception name', async () => {
    mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
    mockFindOne.mockResolvedValue({
      id: 9,
      portfolio_id: 2,
      name: 'KPIs',
      is_active: true,
    });

    let thrown: unknown;
    try {
      await service.createCategory({ portfolioId: 2, name: 'KPIs' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/categories', method: 'POST' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description: 'A category named "KPIs" already exists in this portfolio',
        field: 'name',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/categories',
    });
  });

  it('404 unknown portfolio: errors is the PLAIN STRING message (asymmetric with the 409 object shape)', async () => {
    mockPortfoliosFindOne.mockResolvedValue(null);

    let thrown: unknown;
    try {
      await service.createCategory({ portfolioId: 999, name: 'KPIs' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/categories', method: 'POST' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      description: 'NotFoundException',
      status: HttpStatus.NOT_FOUND,
      errors: 'Portfolio 999 not found',
      timestamp: expect.any(String),
      path: '/api/control-lists/categories',
    });
  });

  it('409 duplicate list key: errors is the OBJECT {description, field: "listKey"} (T-02)', async () => {
    mockFindOne.mockResolvedValue({
      id: 1,
      portfolio_id: 2,
      is_active: true,
    });
    mockListFindOne.mockResolvedValue({
      id: 9,
      portfolio_id: 2,
      list_key: 'kpi.direction',
      is_active: true,
    });

    let thrown: unknown;
    try {
      await service.createList({
        categoryId: 1,
        listKey: 'kpi.direction',
        name: 'Direction',
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/lists', method: 'POST' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description:
          'A list with key "kpi.direction" already exists in this portfolio',
        field: 'listKey',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/lists',
    });
  });

  it('409 system-list delete: errors is the OBJECT {description} with NO field (non-field conflict, T-02)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 6,
      portfolio_id: 2,
      list_key: 'org.level',
      name: 'Organizational level',
      is_system: true,
      is_active: true,
    });

    let thrown: unknown;
    try {
      await service.removeList(6);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/lists/6', method: 'DELETE' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description:
          'List "Organizational level" (key org.level) is a system list and cannot be deleted',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/lists/6',
    });
  });

  it('409 category-has-lists delete: errors is the OBJECT {description} with NO field, naming the blocking lists (T-02)', async () => {
    mockFindOne.mockResolvedValue({
      id: 2,
      name: 'Organizational structure',
      portfolio_id: 2,
      is_active: true,
    });
    mockListFind.mockResolvedValue([
      { id: 6, name: 'Organizational level', category_id: 2, is_active: true },
    ]);

    let thrown: unknown;
    try {
      await service.removeCategory(2);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = {
      url: '/api/control-lists/categories/2',
      method: 'DELETE',
    };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description:
          'Category "Organizational structure" cannot be deleted while it has lists: Organizational level',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/categories/2',
    });
  });

  it('400 cross-portfolio list move: errors is a PLAIN STRING (D-CTL-13, judgment J-4, T-02)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 1,
      portfolio_id: 2,
      category_id: 1,
      is_active: true,
    });
    mockFindOne.mockResolvedValue({
      id: 9,
      portfolio_id: 1,
      is_active: true,
    });

    let thrown: unknown;
    try {
      await service.updateList(1, { categoryId: 9 });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/lists/1', method: 'PATCH' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      description: 'BadRequestException',
      status: HttpStatus.BAD_REQUEST,
      errors: 'Category 9 belongs to a different portfolio than list 1',
      timestamp: expect.any(String),
      path: '/api/control-lists/lists/1',
    });
  });

  // T-03 forward pointer (T-02 execution.md): "a list with values cannot be
  // deleted → 409, non-field body errors: { description } (same shape as
  // system-list delete)".
  it('409 list-has-values delete: errors is the OBJECT {description} with NO field (non-field conflict, T-03)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 7,
      portfolio_id: 2,
      list_key: 'kpi.custom_source',
      name: 'Custom source',
      is_system: false,
      is_active: true,
    });
    mockValueCount.mockResolvedValue(2);

    let thrown: unknown;
    try {
      await service.removeList(7);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/lists/7', method: 'DELETE' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description:
          'List "Custom source" (key kpi.custom_source) cannot be deleted while it has values',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/lists/7',
    });
  });

  // Pinned 409 contract (T-03 brief): duplicate code → {description, field:
  // 'code'}.
  it('409 duplicate value code: errors is the OBJECT {description, field: "code"} (T-03)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 2,
      portfolio_id: 2,
      is_active: true,
    });
    mockValueFindOne.mockResolvedValue({
      id: 9,
      list_id: 2,
      code: 'DIR-01',
    });

    let thrown: unknown;
    try {
      await service.createValue(2, { code: 'DIR-01', value: 'Increase' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = {
      url: '/api/control-lists/lists/2/values',
      method: 'POST',
    };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description: 'A value with code "DIR-01" already exists in this list',
        field: 'code',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/lists/2/values',
    });
  });

  // Pinned 409 contract (T-03 brief): duplicate value → {description, field:
  // 'value'}.
  it('409 duplicate value name: errors is the OBJECT {description, field: "value"} (T-03)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 2,
      portfolio_id: 2,
      is_active: true,
    });
    mockValueFindOne
      .mockResolvedValueOnce(null) // code pre-check passes
      .mockResolvedValueOnce({ id: 9, list_id: 2, value: 'Increase' });

    let thrown: unknown;
    try {
      await service.createValue(2, { code: 'DIR-09', value: 'Increase' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = {
      url: '/api/control-lists/lists/2/values',
      method: 'POST',
    };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description:
          'A value with value "Increase" already exists in this list',
        field: 'value',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/lists/2/values',
    });
  });
});
