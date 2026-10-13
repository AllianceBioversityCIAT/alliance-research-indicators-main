import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ControlListsController } from './control-lists.controller';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { ControlListUsageRegistry } from './control-list-usage.registry';
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
 * What this suite CANNOT reach (KZ-017): a real database (so the unique
 * indexes are NOT proven here — only the service's mapping of errno 1062), the
 * `ResponseInterceptor` envelope wrapper and `JwtMiddleware`.
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
  const mockValueRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
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
  ];

  const expectNoRepositoryWrite = () => {
    for (const write of allRepositoryWrites()) {
      expect(write).not.toHaveBeenCalled();
    }
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

  describe('A13 — GET /by-key/:listKey/values', () => {
    // R-CLG-004 "Read by key" · AND IT MUST NOT need a portfolio.
    it('answers 200 with no query parameters', async () => {
      mockListRepository.findOne.mockResolvedValue({
        id: 6,
        list_key: 'org.level',
      });
      mockValueRepository.find.mockResolvedValue([
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
  });

  // R-CLG-007 AC.1: the removed endpoint answers 404 through the real router.
  describe('A2 — GET /portfolios/summary (removed)', () => {
    it('answers 404', async () => {
      await request(app.getHttpServer()).get('/portfolios/summary').expect(404);
    });
  });
});
