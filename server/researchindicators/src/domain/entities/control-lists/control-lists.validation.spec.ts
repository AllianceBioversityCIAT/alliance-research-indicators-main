import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ControlListsController } from './control-lists.controller';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { ControlListValuePortfolioRepository } from './repositories/control-list-value-portfolio.repository';
import { ControlListUsageRegistry } from './control-list-usage.registry';
import { ControlListValuePortfolio } from './entities/control-list-value-portfolio.entity';
import { Portfolio } from '../portfolios/entities/portfolio.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { LoggerUtil } from '../../shared/utils/logger.util';

/**
 * R-CLG-001 / R-CLG-002 / R-CLG-003 / R-CLG-007 (docs/specs/changes/
 * control-lists-global-scope, T-01) over a REAL HTTP stack: the real
 * controller with its own `ValidationPipe({ whitelist, forbidNonWhitelisted,
 * transform })`, the real `ControlListsService`, and the real
 * `GlobalExceptions` filter. Only the repositories (so "no write happened" is
 * observable), the usage registry and the request-scoped user are doubles,
 * and `RolesGuard` is open (roles are pinned by `control-lists.controller.spec.ts`
 * metadata tests and by the integration suites against a real database).
 *
 * T-02 (R-CLG-009) adds the "Applies to" `portfolioIds` rules on A10 and A11
 * and the optional `portfolioId` filter on A13 — validated by the same real
 * pipe, so a value the DTO must reject (`null`, `[1,1]`, `["a"]`, `[0]`) is
 * seen to be answered `400` on BOTH writes with nothing stored.
 *
 * What this suite CANNOT reach (KZ-017): a real database (so the unique
 * indexes, the transaction's rollback and the A13 filter's SQL are NOT proven
 * here — they are proven in `test/control-lists-applies-to.integration-spec.ts`),
 * the `ResponseInterceptor` envelope wrapper and `JwtMiddleware`.
 */
describe('Control Lists — real ValidationPipe over HTTP (R-CLG-001/002/003/007)', () => {
  let app: INestApplication;
  let errorSpy: jest.SpyInstance;

  const mockCategoryRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const mockListRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const mockQbWhere = jest.fn();
  const mockQbAndWhere = jest.fn();
  const mockQbGetMany = jest.fn();
  const queryBuilder = {
    where: mockQbWhere,
    andWhere: mockQbAndWhere,
    getMany: mockQbGetMany,
  };
  const mockValueRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  // R-CLG-009 (T-02): the link table, the portfolio lookups and the
  // transaction the value writes run in.
  const mockLinkRepository = { find: jest.fn() };
  const mockPortfolioRepository = { find: jest.fn(), findOne: jest.fn() };
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
  const mockUsageRegistry = {
    getConsumerNamesForKey: jest.fn().mockReturnValue([]),
    getInUseCounts: jest.fn().mockResolvedValue(new Map()),
    getInUseCount: jest.fn().mockResolvedValue(0),
  };

  const allRepositoryWrites = () => [
    mockCategoryRepository.save,
    mockCategoryRepository.update,
    mockCategoryRepository.delete,
    mockListRepository.save,
    mockListRepository.update,
    mockListRepository.delete,
    mockValueRepository.save,
    mockValueRepository.update,
    mockValueRepository.delete,
    mockTxLinkDelete,
    mockTxLinkInsert,
  ];

  const expectNoRepositoryWrite = () => {
    for (const write of allRepositoryWrites()) {
      expect(write).not.toHaveBeenCalled();
    }
    // No unit of work was opened either (A10/A11 write through one).
    expect(mockTransaction).not.toHaveBeenCalled();
  };

  beforeAll(async () => {
    // GlobalExceptions logs every catch through LoggerUtil._error.
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
    jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ControlListsController],
      providers: [
        ControlListsService,
        {
          provide: ControlListCategoryRepository,
          useValue: mockCategoryRepository,
        },
        { provide: ControlListRepository, useValue: mockListRepository },
        { provide: ControlListValueRepository, useValue: mockValueRepository },
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
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      // The controller's `@UseInterceptors(SetUpInterceptor)` only primes
      // per-request context this module never reads; replacing it keeps its
      // own dependencies out of the test module.
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new GlobalExceptions());
    await app.init();
  });

  afterAll(async () => {
    errorSpy.mockRestore();
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser.audit.mockReturnValue({ created_by: 1 });
    mockCategoryRepository.find.mockResolvedValue([]);
    mockListRepository.find.mockResolvedValue([]);
    mockValueRepository.find.mockResolvedValue([]);
    mockValueRepository.count.mockResolvedValue(0);
    mockUsageRegistry.getConsumerNamesForKey.mockReturnValue([]);
    mockUsageRegistry.getInUseCounts.mockResolvedValue(new Map());
    mockLinkRepository.find.mockResolvedValue([]);
    mockPortfolioRepository.find.mockResolvedValue([]);
    mockPortfolioRepository.findOne.mockResolvedValue(null);
    mockTxLinkDelete.mockResolvedValue({ affected: 0 });
    mockTxLinkInsert.mockResolvedValue({});
    mockTransaction.mockImplementation(
      async (callback: (manager: unknown) => unknown) =>
        callback(mockTxManager),
    );
    mockValueRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    mockQbWhere.mockReturnValue(queryBuilder);
    mockQbAndWhere.mockReturnValue(queryBuilder);
    mockQbGetMany.mockResolvedValue([]);
  });

  describe('A1 — GET /categories', () => {
    // R-CLG-001 "One set of lists for everyone": the empty query DTO must NOT
    // reject a request that carries no parameters (P-10: `forbidUnknownValues`
    // defaults to false in Nest's ValidationPipe).
    it('answers 200 with no parameters at all', async () => {
      mockCategoryRepository.find.mockResolvedValue([
        {
          id: 1,
          name: 'KPIs',
          description: null,
          display_order: 1,
          is_active: true,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      expect(response.body.data).toEqual([
        {
          id: 1,
          name: 'KPIs',
          description: null,
          displayOrder: 1,
          lists: [],
        },
      ]);
    });

    it('answers 400 naming portfolioId when a stale caller still sends it, and reads nothing', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .query({ portfolioId: 2 })
        .expect(400);

      expect(response.body.errors).toEqual([
        'property portfolioId should not exist',
      ]);
      expect(mockCategoryRepository.find).not.toHaveBeenCalled();
      expect(mockListRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('A3 — POST /categories', () => {
    it('answers 201 for a body without portfolioId', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);
      mockCategoryRepository.save.mockResolvedValue({
        id: 5,
        name: 'New category',
        description: null,
        display_order: 0,
      });

      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'New category' })
        .expect(201);

      expect(response.body.data).toMatchObject({ id: 5, name: 'New category' });
      expect(mockCategoryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('answers 400 for a body carrying portfolioId, with no repository write', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'New category', portfolioId: 2 })
        .expect(400);

      expect(response.body.errors).toEqual([
        'property portfolioId should not exist',
      ]);
      expect(mockCategoryRepository.findOne).not.toHaveBeenCalled();
      expectNoRepositoryWrite();
    });

    // R-CLG-002: duplicate name in another letter case. The pre-check lookup
    // is stubbed to return the existing row (the database collation makes the
    // real comparison case-insensitive; the unique index itself is proven in
    // the integration suite, not here).
    it('answers 409 naming name through the pre-check, writing nothing', async () => {
      mockCategoryRepository.findOne.mockResolvedValue({
        id: 1,
        name: 'key performance indicators (kpis)',
      });

      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Key Performance Indicators (KPIs)' })
        .expect(409);

      expect(response.body.errors).toEqual({
        description:
          'A category named "Key Performance Indicators (KPIs)" already exists',
        field: 'name',
      });
      expectNoRepositoryWrite();
    });

    // With the pre-check passing, the only guard left is the DB unique index:
    // a simulated errno 1062 on save must still be the field-named 409.
    it('answers 409 naming name when the pre-check passes and save fails with errno 1062', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);
      mockCategoryRepository.save.mockRejectedValue({ errno: 1062 });

      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Racing duplicate' })
        .expect(409);

      expect(response.body.errors).toEqual({
        description: 'A category named "Racing duplicate" already exists',
        field: 'name',
      });
    });
  });

  describe('A4 — PATCH /categories/:id', () => {
    it('answers 400 for a body carrying portfolioId, with no lookup and no write', async () => {
      const response = await request(app.getHttpServer())
        .patch('/categories/1')
        .send({ name: 'Renamed', portfolioId: 2 })
        .expect(400);

      expect(response.body.errors).toEqual([
        'property portfolioId should not exist',
      ]);
      expect(mockCategoryRepository.findOne).not.toHaveBeenCalled();
      expectNoRepositoryWrite();
    });
  });

  describe('A6 — POST /lists', () => {
    it('answers 400 for a body carrying portfolioId, with no repository write', async () => {
      const response = await request(app.getHttpServer())
        .post('/lists')
        .send({
          categoryId: 1,
          listKey: 'kpi.custom_source',
          name: 'Custom source',
          portfolioId: 2,
        })
        .expect(400);

      expect(response.body.errors).toEqual([
        'property portfolioId should not exist',
      ]);
      expect(mockCategoryRepository.findOne).not.toHaveBeenCalled();
      expectNoRepositoryWrite();
    });

    // R-CLG-003 *Duplicate key*: another letter case, stubbed pre-check.
    it('answers 409 naming listKey through the pre-check, writing nothing', async () => {
      mockCategoryRepository.findOne.mockResolvedValue({ id: 1 });
      mockListRepository.findOne.mockResolvedValue({
        id: 2,
        list_key: 'KPI.DIRECTION',
      });

      const response = await request(app.getHttpServer())
        .post('/lists')
        .send({ categoryId: 1, listKey: 'kpi.direction', name: 'Direction' })
        .expect(409);

      expect(response.body.errors).toEqual({
        description: 'A list with key "kpi.direction" already exists',
        field: 'listKey',
      });
      expectNoRepositoryWrite();
    });

    it('answers 409 naming listKey when the pre-check passes and save fails with errno 1062', async () => {
      mockCategoryRepository.findOne.mockResolvedValue({ id: 1 });
      mockListRepository.findOne.mockResolvedValue(null);
      mockListRepository.save.mockRejectedValue({ errno: 1062 });

      const response = await request(app.getHttpServer())
        .post('/lists')
        .send({ categoryId: 1, listKey: 'kpi.racing', name: 'Racing' })
        .expect(409);

      expect(response.body.errors).toEqual({
        description: 'A list with key "kpi.racing" already exists',
        field: 'listKey',
      });
    });
  });

  describe('A7 — PATCH /lists/:id', () => {
    it('answers 400 for a body carrying portfolioId, with no lookup and no write', async () => {
      const response = await request(app.getHttpServer())
        .patch('/lists/1')
        .send({ name: 'Renamed', portfolioId: 2 })
        .expect(400);

      expect(response.body.errors).toEqual([
        'property portfolioId should not exist',
      ]);
      expect(mockListRepository.findOne).not.toHaveBeenCalled();
      expectNoRepositoryWrite();
    });
  });

  // R-CLG-009 AC.4 on A10, through the REAL pipe and the REAL service.
  describe('A10 — POST /lists/:id/values · portfolioIds', () => {
    const arrange = () => {
      mockListRepository.findOne.mockResolvedValue({
        id: 2,
        list_key: 'kpi.direction',
        code_prefix: 'DIR',
        is_active: true,
      });
      mockValueRepository.findOne.mockResolvedValue(null);
      mockValueRepository.save.mockResolvedValue({
        id: 11,
        list_id: 2,
        code: 'DIR-09',
        value: 'Hold',
        description: null,
        display_order: 0,
        is_active: true,
      });
    };

    it.each([
      ['null', null],
      ['a repeated id', [1, 1]],
      ['a non-numeric id', ['a']],
      ['zero', [0]],
    ])(
      'answers 400 naming portfolioIds for %s, writing nothing',
      async (_label, portfolioIds) => {
        arrange();

        const response = await request(app.getHttpServer())
          .post('/lists/2/values')
          .send({ code: 'DIR-09', value: 'Hold', portfolioIds })
          .expect(400);

        expect(response.body.errors.length).toBeGreaterThan(0);
        for (const message of response.body.errors) {
          expect(message).toContain('portfolioIds');
          expect(message).not.toContain('should not exist');
        }
        expectNoRepositoryWrite();
      },
    );

    it.each([
      ['omitted', undefined],
      ['an empty array', []],
    ])(
      'accepts portfolioIds %s (the value applies to all portfolios)',
      async (_label, portfolioIds) => {
        arrange();

        const response = await request(app.getHttpServer())
          .post('/lists/2/values')
          .send({ code: 'DIR-09', value: 'Hold', portfolioIds })
          .expect(201);

        expect(response.body.data).toMatchObject({
          id: 11,
          appliesTo: [],
          appliesToAll: true,
        });
        expect(mockTxLinkInsert).not.toHaveBeenCalled();
      },
    );

    // The service's check (it needs the database), envelope through the real
    // GlobalExceptions filter: 400, never 404, naming portfolioIds.
    it('answers 400 (not 404) naming portfolioIds for an inactive or unknown id, writing nothing', async () => {
      arrange();
      mockPortfolioRepository.find.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post('/lists/2/values')
        .send({ code: 'DIR-09', value: 'Hold', portfolioIds: [99] })
        .expect(400);

      expect(response.body.errors).toMatchObject({ field: 'portfolioIds' });
      expectNoRepositoryWrite();
    });
  });

  // R-CLG-009 AC.4 on A11 — the R3-1 correction: `null` must also be a 400
  // here, which only the update DTO's own `@ValidateIf` guarantees.
  describe('A11 — PATCH /values/:id · portfolioIds', () => {
    const arrange = () => {
      mockValueRepository.findOne.mockResolvedValue({
        id: 1,
        list_id: 2,
        code: 'DIR-01',
        value: 'Increase',
        description: null,
        display_order: 1,
        is_active: true,
      });
      mockValueRepository.update.mockResolvedValue({ affected: 1 });
    };

    it.each([
      ['null', null],
      ['a repeated id', [1, 1]],
      ['a non-numeric id', ['a']],
      ['zero', [0]],
    ])(
      'answers 400 naming portfolioIds for %s, writing nothing',
      async (_label, portfolioIds) => {
        arrange();

        const response = await request(app.getHttpServer())
          .patch('/values/1')
          .send({ portfolioIds })
          .expect(400);

        expect(response.body.errors.length).toBeGreaterThan(0);
        for (const message of response.body.errors) {
          expect(message).toContain('portfolioIds');
          expect(message).not.toContain('should not exist');
        }
        expect(mockValueRepository.findOne).not.toHaveBeenCalled();
        expectNoRepositoryWrite();
      },
    );

    it('accepts a body that omits portfolioIds and leaves the links alone', async () => {
      arrange();

      await request(app.getHttpServer())
        .patch('/values/1')
        .send({ description: 'd' })
        .expect(200);

      expect(mockTxLinkDelete).not.toHaveBeenCalled();
      expect(mockTxLinkInsert).not.toHaveBeenCalled();
    });

    it('accepts portfolioIds: [] and clears the links', async () => {
      arrange();

      await request(app.getHttpServer())
        .patch('/values/1')
        .send({ portfolioIds: [] })
        .expect(200);

      expect(mockTxLinkDelete).toHaveBeenCalledWith({ value_id: 1 });
      expect(mockTxLinkInsert).not.toHaveBeenCalled();
    });

    it('answers 400 (not 404) naming portfolioIds for an inactive or unknown id, writing nothing', async () => {
      arrange();
      mockPortfolioRepository.find.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .patch('/values/1')
        .send({ portfolioIds: [99] })
        .expect(400);

      expect(response.body.errors).toMatchObject({ field: 'portfolioIds' });
      expectNoRepositoryWrite();
    });
  });

  describe('A13 — GET /by-key/:listKey/values', () => {
    // R-CLG-004 "Read by key" · AND IT MUST NOT need a portfolio.
    it('answers 200 with no query parameters', async () => {
      mockListRepository.findOne.mockResolvedValue({
        id: 6,
        list_key: 'org.level',
      });
      mockQbGetMany.mockResolvedValue([
        {
          id: 20,
          list_id: 6,
          code: 'L1',
          value: 'Division',
          description: null,
          display_order: 1,
          is_active: true,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/by-key/org.level/values')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        appliesTo: [],
        appliesToAll: true,
      });
      expect(mockPortfolioRepository.findOne).not.toHaveBeenCalled();
      expect(mockListRepository.findOne).toHaveBeenCalledWith({
        where: { list_key: 'org.level', is_active: true },
      });
    });

    it('answers 404 for an unknown key', async () => {
      mockListRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/by-key/does.not_exist/values')
        .expect(404);

      expect(response.body.errors).toBe('List "does.not_exist" not found');
    });

    // R-CLG-009: the optional `portfolioId` filter, through the real pipe.
    it('accepts ?portfolioId= for an active portfolio (the stale-caller 400 of T-01 is gone)', async () => {
      mockListRepository.findOne.mockResolvedValue({
        id: 6,
        list_key: 'org.level',
      });
      mockPortfolioRepository.findOne.mockResolvedValue({ id: 2 });

      await request(app.getHttpServer())
        .get('/by-key/org.level/values')
        .query({ portfolioId: 2, activeOnly: 'false' })
        .expect(200);

      expect(mockPortfolioRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2, is_active: true },
        select: { id: true },
      });
    });

    it('answers 404 for an unknown or inactive portfolio and reads no values', async () => {
      mockListRepository.findOne.mockResolvedValue({
        id: 6,
        list_key: 'org.level',
      });
      mockPortfolioRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/by-key/org.level/values')
        .query({ portfolioId: 99 })
        .expect(404);

      expect(response.body.errors).toBe('Portfolio 99 not found');
      expect(mockQbGetMany).not.toHaveBeenCalled();
    });

    it.each(['abc', '0', '-1', '1.5'])(
      'answers 400 naming portfolioId for the malformed value %s, and reads nothing',
      async (portfolioId) => {
        const response = await request(app.getHttpServer())
          .get('/by-key/org.level/values')
          .query({ portfolioId })
          .expect(400);

        for (const message of response.body.errors) {
          expect(message).toContain('portfolioId');
          expect(message).not.toContain('should not exist');
        }
        expect(mockListRepository.findOne).not.toHaveBeenCalled();
      },
    );
  });

  // R-CLG-007 AC.1: the removed endpoint answers 404 through the real router.
  describe('A2 — GET /portfolios/summary (removed)', () => {
    it('answers 404', async () => {
      await request(app.getHttpServer()).get('/portfolios/summary').expect(404);
    });
  });
});
