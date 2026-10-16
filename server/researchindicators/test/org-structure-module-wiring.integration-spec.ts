import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication, Global, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { OrganizationalStructureModule } from '../src/domain/entities/organizational-structure/organizational-structure.module';
import { ControlListsModule } from '../src/domain/entities/control-lists/control-lists.module';
import { OrgStructureWriteRepository } from '../src/domain/entities/organizational-structure/repositories/org-structure-write.repository';
import { OrgStructureReadService } from '../src/domain/entities/organizational-structure/org-structure-read.service';
import { OrgStructureClock } from '../src/domain/entities/organizational-structure/org-structure.clock';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { route } from '../src/domain/routes/main.routes';
import { assertLocalTestDatabase } from './support/org-structure-fixtures';

/**
 * Organizational Structure — the REAL module and the REAL route tree on a
 * booted app (docs/specs/institutional-performance/organizational-structure,
 * T-01; KZ-017).
 *
 * A route node in `main.routes.ts` and a unit spec on `entities.module.ts` can
 * both stay green while the endpoint 404s in production (the module missing
 * from the graph makes `RouterModule.register()` skip it silently). This suite
 * imports the real `OrganizationalStructureModule` and the real exported
 * `route` tree from `main.routes.ts`, applies the app's global `api` prefix,
 * and asks the booted app for `GET /api/organizational-structure/years`:
 *  - 200 proves the module is resolvable (no "Nest can't resolve
 *    dependencies"), its route is mounted at `organizational-structure`, and
 *    the real repositories answer from the database;
 *  - `/api/v1/organizational-structure/...` is NOT reachable (unversioned,
 *    root CLAUDE.md 4.1);
 *  - the module exports its singleton read service.
 * It cannot prove `EntitiesModule` imports the module (the heavy full boot is
 * not run here: `entities.module.spec.ts` pins that, and the `/swagger` check
 * of the task covers it on a reduced boot); and `JwtMiddleware` is replaced by
 * a middleware that sets `req.user`. It writes nothing.
 */
// T-02: the write service injects the request-scoped `CurrentUserUtil` (audit
// fields), which the real app provides globally and needs an HTTP request; a
// global stub stands in for it. Everything else is the real module.
@Global()
@Module({
  providers: [{ provide: CurrentUserUtil, useValue: { user_id: 1 } }],
  exports: [CurrentUserUtil],
})
class NoopGlobalModule {}

describe('Organizational Structure — real module + real route tree on a booted app (T-01)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    assertLocalTestDatabase('org-structure-module-wiring');

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: 'mysql' as const,
            host: process.env.ARI_TEST_MYSQL_HOST,
            port: parseInt(process.env.ARI_TEST_MYSQL_PORT, 10),
            username: process.env.ARI_TEST_MYSQL_USER_NAME,
            password: process.env.ARI_TEST_MYSQL_USER_PASS,
            database: process.env.ARI_TEST_MYSQL_NAME,
            entities: [
              `${__dirname}/../src/domain/entities/**/*.entity{.ts,.js}`,
              `${__dirname}/../src/domain/tools/clarisa/entities/**/*.entity{.ts,.js}`,
              `${__dirname}/../src/domain/shared/auxiliar/**/*.entity{.ts,.js}`,
              `${__dirname}/../src/domain/tools/open-search/prms/entities/*.entity{.ts,.js}`,
            ],
            synchronize: false,
            migrationsRun: false,
            logging: false,
            retryAttempts: 1,
            extra: { connectionLimit: 2 },
          }),
          dataSourceFactory: async (options) => {
            dataSource = await new DataSource(options).initialize();
            return dataSource;
          },
        }),
        NoopGlobalModule,
        OrganizationalStructureModule,
        // The REAL route tree: only nodes whose module is in the graph are
        // stamped; the rest are skipped by RouterModule itself.
        RouterModule.register(route),
      ],
    })
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req, _res, next) => {
      req.user = { sec_user_id: 1, roles: [SecRolesEnum.CENTER_ADMIN] };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  it('resolves the exported singleton read service and the injectable clock from the real module', () => {
    expect(
      moduleRef.get(OrgStructureReadService, { strict: false }),
    ).toBeInstanceOf(OrgStructureReadService);
    expect(
      moduleRef.get(OrgStructureClock, { strict: false }).currentYear(),
    ).toBe(new Date().getUTCFullYear());
    const exportsMeta: unknown[] = Reflect.getMetadata(
      'exports',
      OrganizationalStructureModule,
    );
    expect(exportsMeta).toContain(OrgStructureReadService);
  });

  it('T-02: the write service and its repository resolve from the real module (imports ControlListsModule)', () => {
    expect(
      moduleRef.get(OrgStructureWriteRepository, { strict: false }),
    ).toBeInstanceOf(OrgStructureWriteRepository);
    expect(
      Reflect.getMetadata('imports', OrganizationalStructureModule),
    ).toContain(ControlListsModule);
  });

  it('T-02: B3 and B4 are reachable on the real route tree (a bad B4 search is a 400 from the real pipe)', async () => {
    const proposal = await request(app.getHttpServer()).get(
      '/api/organizational-structure/units/code-proposal',
    );
    expect(proposal.status).toBe(200);
    expect(proposal.body.data.code).toMatch(/^ORG-\d{3,}$/);
    const staff = await request(app.getHttpServer()).get(
      '/api/organizational-structure/staff?search=a',
    );
    expect(staff.status).toBe(400);
  });

  it('GET /api/organizational-structure/years is reachable and answers from the database', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/organizational-structure/years',
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      min: expect.any(Number),
      max: expect.any(Number),
      current: new Date().getUTCFullYear(),
    });
  });

  it('GET /api/organizational-structure/units?year=<current> is reachable (B1)', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/organizational-structure/units?year=${new Date().getUTCFullYear()}`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/organizational-structure/units/<unknown> is reachable and answers 404 (B5)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/organizational-structure/units/999999999',
    );
    expect(res.status).toBe(404);
  });

  it('is unversioned: /api/v1/organizational-structure/years is 404', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/organizational-structure/years',
    );
    expect(res.status).toBe(404);
  });

  it('is not mounted at the bare path either: /api/years is 404', async () => {
    const res = await request(app.getHttpServer()).get('/api/years');
    expect(res.status).toBe(404);
  });
});
