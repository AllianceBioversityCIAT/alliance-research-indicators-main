import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  RequestMethod,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { MACHINE_CREDENTIAL_FORBIDDEN_MESSAGE } from '../../shared/guards/human-credential.guard';
import { HumanCredentialGuard } from '../../shared/guards/human-credential.guard';
import { ROLES_KEY } from '../../shared/guards/roles.guard';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { OrganizationalStructureController } from '../organizational-structure/organizational-structure.controller';
import { OrgStructureReadService } from '../organizational-structure/org-structure-read.service';
import { OrgStructureService } from '../organizational-structure/organizational-structure.service';
import { FrameworkReadService } from './framework-read.service';
import { StrategyFrameworkController } from './strategy-framework.controller';
import { StrategyFrameworkService } from './strategy-framework.service';

/**
 * T-08. Allowed and denied are the HTTP status from the real RolesGuard and
 * HumanCredentialGuard, not decorator text alone. Metadata is still asserted
 * so a missing `@Roles(ODS_ADMIN, SYSTEM_ADMIN)` cannot hide behind the
 * SYSTEM_ADMIN bypass (P-4).
 *
 * What this cannot reach (KZ-017): `JwtMiddleware` (the user is planted on
 * the request), the `ResponseInterceptor` envelope, `RouterModule`'s
 * `strategy-framework` prefix (these URLs are `/api/<handler>`), and a real
 * database. The prefix and the module graph are the swagger spec and
 * `entities.module.spec.ts`. Org-structure `GET units` here proves the role
 * guard on that handler; it does not boot the organizational-structure route
 * node.
 */

interface RouteCase {
  id: string;
  method: 'get' | 'post' | 'patch' | 'delete';
  url: string;
  audience: 'admin' | 'consumer';
  write: boolean;
  body?: Record<string, unknown>;
  status: number;
  touch: () => jest.Mock;
}

describe('StrategyFrameworkController (T-08)', () => {
  const read = {
    getContext: jest.fn(),
    getFramework: jest.fn(),
    getEditor: jest.fn(),
    resolve: jest.fn(),
    getElementBlockers: jest.fn(),
    getObjectiveYears: jest.fn(),
    listObjectives: jest.fn(),
  };
  const service = {
    searchStaff: jest.fn(),
    createElement: jest.fn(),
    updateElement: jest.fn(),
    deleteElement: jest.fn(),
    createObjective: jest.fn(),
    updateObjective: jest.fn(),
    deleteObjective: jest.fn(),
    carryForward: jest.fn(),
  };
  const actor: { roles: number[]; credential: string } = {
    roles: [SecRolesEnum.ODS_ADMIN],
    credential: 'jwt',
  };

  const routes: RouteCase[] = [
    {
      id: 'A0',
      method: 'get',
      url: '/api/context',
      audience: 'admin',
      write: false,
      status: 200,
      touch: () => read.getContext,
    },
    {
      id: 'A1e',
      method: 'get',
      url: '/api/framework/editor?portfolioId=2',
      audience: 'admin',
      write: false,
      status: 200,
      touch: () => read.getEditor,
    },
    {
      id: 'A1',
      method: 'get',
      url: '/api/framework?portfolioId=2',
      audience: 'consumer',
      write: false,
      status: 200,
      touch: () => read.getFramework,
    },
    {
      id: 'A2',
      method: 'get',
      url: '/api/resolve?ids=1',
      audience: 'consumer',
      write: false,
      status: 200,
      touch: () => read.resolve,
    },
    {
      id: 'A3',
      method: 'get',
      url: '/api/code-proposal?portfolioId=2',
      audience: 'admin',
      write: false,
      status: 200,
      touch: () => read.getFramework,
    },
    {
      id: 'A4',
      method: 'get',
      url: '/api/staff?search=jo',
      audience: 'admin',
      write: false,
      status: 200,
      touch: () => service.searchStaff,
    },
    {
      id: 'A5',
      method: 'post',
      url: '/api/elements',
      audience: 'admin',
      write: true,
      body: { portfolioId: 2, name: 'Crops' },
      status: 201,
      touch: () => service.createElement,
    },
    {
      id: 'A8',
      method: 'get',
      url: '/api/elements/5/blockers',
      audience: 'admin',
      write: false,
      status: 200,
      touch: () => read.getElementBlockers,
    },
    {
      id: 'A6',
      method: 'patch',
      url: '/api/elements/5',
      audience: 'admin',
      write: true,
      body: { name: 'Crops' },
      status: 200,
      touch: () => service.updateElement,
    },
    {
      id: 'A7',
      method: 'delete',
      url: '/api/elements/5',
      audience: 'admin',
      write: true,
      status: 200,
      touch: () => service.deleteElement,
    },
    {
      id: 'A9-years',
      method: 'get',
      url: '/api/objectives/years?portfolioId=2',
      audience: 'admin',
      write: false,
      status: 200,
      touch: () => read.getObjectiveYears,
    },
    {
      id: 'A9',
      method: 'get',
      url: '/api/objectives?portfolioId=2&year=2026',
      audience: 'admin',
      write: false,
      status: 200,
      touch: () => read.listObjectives,
    },
    {
      id: 'A11',
      method: 'post',
      url: '/api/objectives/carry-forward',
      audience: 'admin',
      write: true,
      body: { portfolioId: 2, fromYear: 2026 },
      status: 200,
      touch: () => service.carryForward,
    },
    {
      id: 'A10-create',
      method: 'post',
      url: '/api/objectives',
      audience: 'admin',
      write: true,
      body: { portfolioId: 2, year: 2026, statement: 'Improve' },
      status: 201,
      touch: () => service.createObjective,
    },
    {
      id: 'A10-update',
      method: 'patch',
      url: '/api/objectives/5',
      audience: 'admin',
      write: true,
      body: { statement: 'Improve' },
      status: 200,
      touch: () => service.updateObjective,
    },
    {
      id: 'A10-delete',
      method: 'delete',
      url: '/api/objectives/5',
      audience: 'admin',
      write: true,
      status: 200,
      touch: () => service.deleteObjective,
    },
  ];

  const roleCases = routes.flatMap((route) =>
    (
      [
        [SecRolesEnum.ODS_ADMIN, '11'],
        [SecRolesEnum.SYSTEM_ADMIN, '1'],
        [SecRolesEnum.CENTER_ADMIN, '9'],
        [SecRolesEnum.CONTRIBUTOR, '3'],
      ] as const
    ).map(([role, label]) => ({
      route,
      role,
      label,
      allowed: route.audience === 'consumer' || role === 11 || role === 1,
    })),
  );

  let app: INestApplication;
  let errorSpy: jest.SpyInstance;
  const controller = new StrategyFrameworkController(
    read as unknown as FrameworkReadService,
    service as unknown as StrategyFrameworkService,
  );

  const proto = StrategyFrameworkController.prototype as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >;
  const handlerNames = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor' && typeof proto[name] === 'function',
  );
  const consumerHandlerNames = ['getFramework', 'resolve'];
  const httpMethod = (name: string): RequestMethod =>
    Reflect.getMetadata(METHOD_METADATA, proto[name]);
  const writeHandlerNames = handlerNames.filter(
    (name) =>
      httpMethod(name) !== undefined && httpMethod(name) !== RequestMethod.GET,
  );

  beforeAll(async () => {
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [StrategyFrameworkController],
      providers: [
        { provide: FrameworkReadService, useValue: read },
        { provide: StrategyFrameworkService, useValue: service },
      ],
    })
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    app = moduleRef.createNestApplication();
    app.use((req, _res, next) => {
      req.user = { roles: actor.roles, sec_user_id: 7 };
      req.credential = actor.credential;
      next();
    });
    app.useGlobalFilters(new GlobalExceptions());
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    errorSpy.mockRestore();
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    actor.roles = [SecRolesEnum.ODS_ADMIN];
    actor.credential = 'jwt';
    read.getContext.mockResolvedValue({
      currentYear: 2026,
      portfolios: [],
      defaultPortfolioId: null,
    });
    read.getFramework.mockResolvedValue({
      portfolioId: 2,
      configured: false,
      levels: [],
      elements: [],
    });
    read.getEditor.mockResolvedValue({
      portfolioId: 2,
      configured: false,
      levels: [],
      elements: [],
      usageLabels: [{ consumerName: 'kpis', label: 'KPIs' }],
    });
    read.resolve.mockResolvedValue([]);
    read.getElementBlockers.mockResolvedValue({
      children: 0,
      objectives: 0,
      consumers: [],
      wayOut: [],
    });
    read.getObjectiveYears.mockResolvedValue({ years: [], defaultYear: 2026 });
    read.listObjectives.mockResolvedValue([]);
    service.searchStaff.mockResolvedValue([]);
    service.createElement.mockResolvedValue({ id: 1 });
    service.updateElement.mockResolvedValue({ id: 1 });
    service.deleteElement.mockResolvedValue({ id: 1 });
    service.createObjective.mockResolvedValue({ id: 1 });
    service.updateObjective.mockResolvedValue({ id: 1 });
    service.deleteObjective.mockResolvedValue({ id: 1 });
    service.carryForward.mockResolvedValue({
      fromYear: 2026,
      toYear: 2027,
      copied: 0,
    });
  });

  describe('roles over HTTP (R-STF-014 AC.1, NFR-STF-003)', () => {
    it.each(roleCases)(
      '$route.id roles [$label] $allowed',
      async ({ route, role, allowed }) => {
        actor.roles = [role];
        const call = request(app.getHttpServer())[route.method](route.url);
        const res = route.body ? await call.send(route.body) : await call;
        if (allowed) {
          expect(res.status).toBe(route.status);
          expect(route.touch()).toHaveBeenCalled();
        } else {
          expect(res.status).toBe(403);
          expect(route.touch()).not.toHaveBeenCalled();
        }
        if (allowed && route.id === 'A3') {
          expect(res.body.data).toEqual({ code: '1' });
        }
        if (allowed && route.id === 'A1e') {
          expect(res.body.data.usageLabels).toEqual([
            { consumerName: 'kpis', label: 'KPIs' },
          ]);
          expect(res.body.data.elements).toEqual([]);
        }
      },
    );
  });

  describe('machine credentials on every write (D-STF-20)', () => {
    const writes = routes.filter((route) => route.write);

    it.each(writes)(
      '$id with roles [11] and a machine credential is 403',
      async (route) => {
        actor.roles = [SecRolesEnum.ODS_ADMIN];
        actor.credential = 'machine';
        const call = request(app.getHttpServer())[route.method](route.url);
        const res = route.body ? await call.send(route.body) : await call;
        expect(res.status).toBe(403);
        expect(res.body.errors).toBe(MACHINE_CREDENTIAL_FORBIDDEN_MESSAGE);
        expect(route.touch()).not.toHaveBeenCalled();
      },
    );

    it('a consumer read stays open to a machine credential', async () => {
      actor.roles = [SecRolesEnum.CONTRIBUTOR];
      actor.credential = 'machine';
      const res = await request(app.getHttpServer()).get(
        '/api/framework?portfolioId=2',
      );
      expect(res.status).toBe(200);
      expect(read.getFramework).toHaveBeenCalled();
    });
  });

  describe('code proposal (A3) through the public read and the pure util', () => {
    it('proposes IOB-3 from IOB-1 and IOB-2', async () => {
      read.listObjectives.mockResolvedValue([
        { code: 'IOB-1' },
        { code: 'IOB-2' },
      ]);
      const res = await controller.getCodeProposal({
        portfolioId: 2,
        kind: 'IOB',
        year: 2026,
      });
      expect(res.data).toEqual({ code: 'IOB-3' });
      expect(read.listObjectives).toHaveBeenCalledWith(2, 2026);
    });

    it('404 when the parent is not in the portfolio', async () => {
      await expect(
        controller.getCodeProposal({ portfolioId: 2, parentId: 99 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('400 when the parent code is too long to extend', async () => {
      read.getFramework.mockResolvedValue({
        portfolioId: 2,
        configured: true,
        levels: [],
        elements: [
          {
            id: 7,
            levelId: 1,
            depth: 1,
            code: '123456789012345678901234567890',
            name: 'Area',
            description: null,
            parentId: null,
            descendantCounts: {},
          },
        ],
      });
      await expect(
        controller.getCodeProposal({ portfolioId: 2, parentId: 7 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('a write body that sends portfolioId on update is 400 and does not call the service', async () => {
    actor.roles = [SecRolesEnum.ODS_ADMIN];
    const res = await request(app.getHttpServer())
      .patch('/api/elements/5')
      .send({ portfolioId: 2, name: 'Crops' });
    expect(res.status).toBe(400);
    expect(service.updateElement).not.toHaveBeenCalled();
  });

  describe('decorator inventory', () => {
    it('discovers the design handlers, literal paths before :id', () => {
      const published = handlerNames.filter(
        (name) => httpMethod(name) !== undefined,
      );
      expect(published).toEqual([
        'getContext',
        'getEditor',
        'getFramework',
        'resolve',
        'getCodeProposal',
        'searchStaff',
        'createElement',
        'getElementBlockers',
        'updateElement',
        'deleteElement',
        'getObjectiveYears',
        'listObjectives',
        'carryForward',
        'createObjective',
        'updateObjective',
        'deleteObjective',
      ]);
      expect(
        published.map(
          (name) =>
            `${httpMethod(name)} ${Reflect.getMetadata(PATH_METADATA, proto[name])}`,
        ),
      ).toEqual([
        `${RequestMethod.GET} context`,
        `${RequestMethod.GET} framework/editor`,
        `${RequestMethod.GET} framework`,
        `${RequestMethod.GET} resolve`,
        `${RequestMethod.GET} code-proposal`,
        `${RequestMethod.GET} staff`,
        `${RequestMethod.POST} elements`,
        `${RequestMethod.GET} elements/:id/blockers`,
        `${RequestMethod.PATCH} elements/:id`,
        `${RequestMethod.DELETE} elements/:id`,
        `${RequestMethod.GET} objectives/years`,
        `${RequestMethod.GET} objectives`,
        `${RequestMethod.POST} objectives/carry-forward`,
        `${RequestMethod.POST} objectives`,
        `${RequestMethod.PATCH} objectives/:id`,
        `${RequestMethod.DELETE} objectives/:id`,
      ]);
    });

    it.each(
      handlerNames.filter(
        (name) =>
          !consumerHandlerNames.includes(name) &&
          httpMethod(name) !== undefined,
      ),
    )('%s declares exactly [ODS_ADMIN, SYSTEM_ADMIN]', (handlerName) => {
      expect(Reflect.getMetadata(ROLES_KEY, proto[handlerName])).toEqual([
        SecRolesEnum.ODS_ADMIN,
        SecRolesEnum.SYSTEM_ADMIN,
      ]);
    });

    it.each(consumerHandlerNames)(
      '%s declares no roles on the handler or the class',
      (handlerName) => {
        expect(
          Reflect.getMetadata(ROLES_KEY, proto[handlerName]),
        ).toBeUndefined();
        expect(
          Reflect.getMetadata(ROLES_KEY, StrategyFrameworkController),
        ).toBeUndefined();
      },
    );

    it.each(writeHandlerNames)(
      '%s declares HumanCredentialGuard',
      (handlerName) => {
        const guards: unknown[] =
          Reflect.getMetadata(GUARDS_METADATA, proto[handlerName]) ?? [];
        expect(guards).toContain(HumanCredentialGuard);
      },
    );

    it('does not put HumanCredentialGuard on the class or on a read', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, StrategyFrameworkController) ?? [],
      ).not.toContain(HumanCredentialGuard);
      for (const name of handlerNames) {
        if (httpMethod(name) !== RequestMethod.GET) continue;
        const guards: unknown[] =
          Reflect.getMetadata(GUARDS_METADATA, proto[name]) ?? [];
        expect(guards).not.toContain(HumanCredentialGuard);
      }
    });
  });
});

describe('Organizational structure GET units denies ODS Admin (R-STF-013 AC.2)', () => {
  let app: INestApplication;
  const actor = { roles: [SecRolesEnum.ODS_ADMIN] };
  const read = { getYearView: jest.fn().mockResolvedValue([]) };

  beforeAll(async () => {
    jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationalStructureController],
      providers: [
        { provide: OrgStructureReadService, useValue: read },
        { provide: OrgStructureService, useValue: {} },
      ],
    })
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();
    app = moduleRef.createNestApplication();
    app.use((req, _res, next) => {
      req.user = { roles: actor.roles, sec_user_id: 7 };
      next();
    });
    app.useGlobalFilters(new GlobalExceptions());
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('roles [11] receive 403 and the handler does not run', async () => {
    actor.roles = [SecRolesEnum.ODS_ADMIN];
    const res = await request(app.getHttpServer()).get('/api/units');
    expect(res.status).toBe(403);
    expect(read.getYearView).not.toHaveBeenCalled();
  });

  it('roles [9] are not denied by this guard', async () => {
    actor.roles = [SecRolesEnum.CENTER_ADMIN];
    const res = await request(app.getHttpServer()).get('/api/units');
    expect(res.status).toBe(200);
    expect(read.getYearView).toHaveBeenCalled();
  });
});
