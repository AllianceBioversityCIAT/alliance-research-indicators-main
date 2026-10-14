import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { ControlListValuePortfolioRepository } from './repositories/control-list-value-portfolio.repository';
import { Portfolio } from '../portfolios/entities/portfolio.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ControlListUsageRegistry } from './control-list-usage.registry';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { CreateControlListValueDto } from './dto/create-control-list-value.dto';

/**
 * T-01 rework, Risk Reviewer issue 1 (verbatim): "the duplicate-name 409
 * never reaches the user as the server wrote it" — the service throws
 * `ConflictException({ message: { description, field } })`, and what the
 * CLIENT actually receives depends on what `GlobalExceptions` does with
 * that shape, not on what the service intended. This suite throws REAL
 * exceptions from the REAL `ControlListsService` (only the repository/
 * usage-registry dependencies are mocked) through the REAL
 * `GlobalExceptions` filter and pins the exact JSON body on the wire.
 *
 * Leader decision: KEEP the server payload as-is (`errors: { description,
 * field }` for the 409). This file is the contract test the Risk Reviewer
 * asked for "so the contract is tested where it is produced (KZ-017)".
 *
 * T-02 extends this with the list contract (forward pointer from T-01,
 * Leader contract note mid-T-02): duplicate list key is the same
 * {description, field} object shape (field: 'listKey'); a category-with-
 * lists delete is a NON-field conflict, so the service throws
 * `ConflictException({ message: { description } })` — the SAME envelope as
 * the field-named conflicts, minus the `field` key. `GlobalExceptions`
 * therefore puts the OBJECT `{description}` on the wire as `errors` for
 * this case too, never a bare string, so the client can read
 * `errors.description` uniformly for every 409 this module throws.
 *
 * T-03 extends this with the values contract: duplicate code/value are the
 * SAME {description, field} object shape (field: 'code' | 'value'); a
 * list-has-values delete is a non-field conflict, the same envelope as the
 * T-02 non-field conflicts above, minus the `field` key.
 *
 * Global-scope change (docs/specs/changes/control-lists-global-scope, T-01):
 * the duplicate messages no longer say "in this portfolio" (name and key are
 * unique module-wide), the cross-portfolio list move (400) is gone, and the
 * new 400 is the stale-caller rejection a REAL `ValidationPipe` produces for
 * `portfolioId` (its `errors` is the pipe's message ARRAY, unlike the plain
 * string of a service-thrown 404).
 *
 * CR-2 (2026-10-07) removes the "system list cannot be deleted" rule
 * entirely: `is_system` has no behavioral effect on A8 `removeList`. An
 * empty seeded-style list (`is_system = 1`, no values) deletes (200, no
 * exception); a seeded-style list WITH values is blocked by the SAME
 * list-has-values non-field conflict as a custom list — see the test
 * below, which replaces the former pinned system-list-delete 409 body.
 *
 * T-02 (R-CLG-009) extends this with the "Applies to" contract: an unknown or
 * inactive `portfolioIds` entry is a SERVICE-thrown 400 whose `errors` is the
 * OBJECT `{description, field: 'portfolioIds'}` (the same shape as the 409s, so
 * the client binds it to the field), while a malformed `portfolioIds` (`null`,
 * repeated, non-numeric) is a PIPE-thrown 400 whose `errors` is the message
 * ARRAY; an unknown or inactive A13 `portfolioId` is a 404 with the plain
 * string.
 *
 * T-04 extends this with the in-use contract (design §5 rule 5, R-CTL-005):
 * a value delete blocked by the registry is ALSO a non-field conflict, the
 * SAME envelope as the T-02/T-03 non-field conflicts, stating the count and
 * proposing deactivation.
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

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ created_by: 1 }),
    user_id: 1,
  };

  // R-CLG-009 (T-02): portfolio lookups, the link table and the transaction.
  // Only the validation branches are reached here, so none of them writes.
  const mockPortfolioFind = jest.fn();
  const mockPortfolioFindOne = jest.fn();
  const mockPortfolioRepository = {
    find: mockPortfolioFind,
    findOne: mockPortfolioFindOne,
  };
  const mockLinkRepository = { find: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };

  const mockGetInUseCount = jest.fn();
  const mockUsageRegistry = {
    getConsumerNamesForKey: jest.fn().mockReturnValue([]),
    getInUseCounts: jest.fn().mockResolvedValue(new Map()),
    getInUseCount: mockGetInUseCount,
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
    mockGetInUseCount.mockResolvedValue(0);

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
    filter = new GlobalExceptions();
  });

  it('409 duplicate name: errors is the OBJECT {description, field: "name"}, description is the exception name', async () => {
    mockFindOne.mockResolvedValue({
      id: 9,
      name: 'KPIs',
      is_active: true,
    });

    let thrown: unknown;
    try {
      await service.createCategory({ name: 'KPIs' });
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
        description: 'A category named "KPIs" already exists',
        field: 'name',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/categories',
    });
  });

  it('404 unknown list key on the by-key read: errors is the PLAIN STRING message (asymmetric with the 409 object shape)', async () => {
    mockListFindOne.mockResolvedValue(null);

    let thrown: unknown;
    try {
      await service.getValuesByKey('kpi.unknown', true);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = {
      url: '/api/control-lists/by-key/kpi.unknown/values',
      method: 'GET',
    };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      description: 'NotFoundException',
      status: HttpStatus.NOT_FOUND,
      errors: 'List "kpi.unknown" not found',
      timestamp: expect.any(String),
      path: '/api/control-lists/by-key/kpi.unknown/values',
    });
  });

  it('409 duplicate list key: errors is the OBJECT {description, field: "listKey"} (T-02)', async () => {
    mockFindOne.mockResolvedValue({
      id: 1,
      is_active: true,
    });
    mockListFindOne.mockResolvedValue({
      id: 9,
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
        description: 'A list with key "kpi.direction" already exists',
        field: 'listKey',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/lists',
    });
  });

  // CR-2 / D-CTL-18 (2026-10-07): "system list cannot be deleted" is
  // removed — a seeded-style list (`is_system = 1`) with no values deletes
  // like any other (200, no exception, nothing for this filter-contract
  // spec to pin). The seeded-style list WITH values case below replaces
  // this test: `is_system` grants no exemption from the values rule, and
  // the 409 body is the SAME non-field {description} shape as a custom
  // list with values.
  it('409 seeded-style list (is_system = 1) with values, delete: errors is the OBJECT {description} with NO field (non-field conflict, CR-2)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 6,
      list_key: 'org.level',
      name: 'Organizational level',
      is_system: true,
      is_active: true,
    });
    mockValueCount.mockResolvedValue(4);

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
          'List "Organizational level" (key org.level) cannot be deleted while it has values',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/lists/6',
    });
  });

  it('409 category-has-lists delete: errors is the OBJECT {description} with NO field, naming the blocking lists (T-02)', async () => {
    mockFindOne.mockResolvedValue({
      id: 2,
      name: 'Organizational structure',
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

  // R-CLG-001 "Stale caller": the 400 comes from the REAL pipe, so its
  // `errors` is the pipe's message ARRAY (one entry per rejected property).
  // The real exception is produced by the real `ValidationPipe` with the
  // controller's own options, then serialized by the real filter.
  it.each([
    [
      'POST /categories body',
      '/api/control-lists/categories',
      'POST',
      () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }).transform(
          { name: 'KPIs', portfolioId: 2 },
          { type: 'body', metatype: CreateControlListCategoryDto },
        ),
    ],
    [
      'GET /categories query',
      '/api/control-lists/categories',
      'GET',
      () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }).transform(
          { portfolioId: '2' },
          { type: 'query', metatype: GetCategoriesQueryDto },
        ),
    ],
  ])(
    '400 stale portfolioId on %s: errors is the pipe message ARRAY naming the property',
    async (_label, url, method, run) => {
      let thrown: unknown;
      try {
        await run();
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeDefined();

      const { host, status, json } = makeHost({ url, method });

      filter.catch(thrown, host as any);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(json).toHaveBeenCalledWith({
        description: 'BadRequestException',
        status: HttpStatus.BAD_REQUEST,
        errors: ['property portfolioId should not exist'],
        timestamp: expect.any(String),
        path: url,
      });
    },
  );

  // R-CLG-009: a service-thrown 400 for an unknown/inactive "Applies to" id
  // keeps the field-named OBJECT shape (same as the 409s above), NOT a plain
  // string and NOT the pipe's array, so the client reads `errors.field`.
  it('400 unknown or inactive portfolioIds on create: errors is the OBJECT {description, field: "portfolioIds"} (R-CLG-009)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 2,
      list_key: 'kpi.direction',
      is_active: true,
    });
    mockPortfolioFind.mockResolvedValue([]);

    let thrown: unknown;
    try {
      await service.createValue(2, {
        value: 'Hold',
        portfolioIds: [99],
      });
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

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      description: 'BadRequestException',
      status: HttpStatus.BAD_REQUEST,
      errors: {
        description: 'portfolioIds contains unknown or inactive portfolios: 99',
        field: 'portfolioIds',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/lists/2/values',
    });
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });

  it('400 malformed portfolioIds (null): errors is the pipe message ARRAY naming portfolioIds (R-CLG-009)', async () => {
    let thrown: unknown;
    try {
      await new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }).transform(
        { value: 'Hold', portfolioIds: null },
        { type: 'body', metatype: CreateControlListValueDto },
      );
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

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      description: 'BadRequestException',
      status: HttpStatus.BAD_REQUEST,
      errors: expect.arrayContaining(['portfolioIds must be an array']),
      timestamp: expect.any(String),
      path: '/api/control-lists/lists/2/values',
    });
  });

  it('404 unknown or inactive portfolioId on the by-key read: errors is the PLAIN STRING message (R-CLG-009)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 3,
      list_key: 'kpi.direction',
      is_active: true,
    });
    mockPortfolioFindOne.mockResolvedValue(null);

    let thrown: unknown;
    try {
      await service.getValuesByKey('kpi.direction', true, 99);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = {
      url: '/api/control-lists/by-key/kpi.direction/values',
      method: 'GET',
    };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      description: 'NotFoundException',
      status: HttpStatus.NOT_FOUND,
      errors: 'Portfolio 99 not found',
      timestamp: expect.any(String),
      path: '/api/control-lists/by-key/kpi.direction/values',
    });
  });

  // T-03 forward pointer (T-02 execution.md): "a list with values cannot be
  // deleted → 409, non-field body errors: { description } (same shape as
  // system-list delete — that 409 was removed by CR-2)".
  it('409 list-has-values delete: errors is the OBJECT {description} with NO field (non-field conflict, T-03)', async () => {
    mockListFindOne.mockResolvedValue({
      id: 7,
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

  // Pinned 409 contract (T-04, design §5 rule 5 / R-CTL-005): errors is the
  // OBJECT {description} with NO field (non-field conflict, same envelope
  // family as the T-02/T-03 non-field conflicts above), naming the count and
  // proposing deactivation.
  it('409 value in use: errors is the OBJECT {description} with NO field, naming the count and proposing deactivation (T-04)', async () => {
    mockValueFindOne.mockResolvedValue({
      id: 9,
      list_id: 2,
      value: 'Division',
    });
    mockListFindOne.mockResolvedValue({
      id: 2,
      is_active: true,
    });
    mockGetInUseCount.mockResolvedValue(3);

    let thrown: unknown;
    try {
      await service.removeValue(9);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/values/9', method: 'DELETE' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description:
          'Value "Division" is referenced by 3 record(s) and cannot be deleted; deactivate it instead',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/values/9',
    });
  });
});
