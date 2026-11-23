import 'reflect-metadata';
import 'dotenv/config';
import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ControlListsModule } from '../src/domain/entities/control-lists/control-lists.module';
import { ControlListsService } from '../src/domain/entities/control-lists/control-lists.service';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { ControlListValuePortfolioRepository } from '../src/domain/entities/control-lists/repositories/control-list-value-portfolio.repository';
import { PortfoliosModule } from '../src/domain/entities/portfolios/portfolios.module';
import { Portfolio } from '../src/domain/entities/portfolios/entities/portfolio.entity';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';

/**
 * Control Lists — the REAL `ControlListsModule` wiring against a real MySQL
 * connection (docs/specs/changes/control-lists-global-scope, T-02, D-CLG-13).
 *
 * The other control-lists integration suites hand-wire `ControlListsService`
 * with its repositories, so they cannot notice a provider that the REAL module
 * forgot to register: a mocked-provider unit spec and a hand-wired suite both
 * stay green while the application fails to boot with "Nest can't resolve
 * dependencies of the ControlListsService" (KZ-017). This suite imports the
 * actual module and resolves the service from it:
 *  - the link repository is a provider of the module;
 *  - the service gets its READ handle on portfolios from
 *    `TypeOrmModule.forFeature([Portfolio])` (D-CLG-13), and the module no
 *    longer imports `PortfoliosModule`;
 *  - a real read through that wiring (A13 with a portfolio) answers from the
 *    database.
 *
 * Only `CurrentUserUtil` is replaced (by a global stub), because the real one
 * needs an HTTP request; everything else is the real module. It writes
 * nothing, so it leaves nothing behind. Evidence DB: the requester's local
 * database `ari_local_mysql` (`ARI_TEST_MYSQL_*`, printed below), with the
 * control-list migrations `1790900000000-1790900000003` executed.
 */
@Global()
@Module({
  providers: [
    {
      provide: CurrentUserUtil,
      useValue: { user_id: 1, audit: () => ({ created_by: 1 }) },
    },
  ],
  exports: [CurrentUserUtil],
})
class TestCurrentUserModule {}

describe('Control Lists — real module wiring against real MySQL (T-02, D-CLG-13)', () => {
  let moduleRef: TestingModule;
  let service: ControlListsService;
  // Created by the module's own `dataSourceFactory` below, and kept here so
  // `afterAll` can close the pool even when `compile()` itself throws (a DI
  // failure is exactly what this suite exists to detect, and it must fail, not
  // hang on an open connection pool).
  let dataSource: DataSource;

  beforeAll(async () => {
    const host = process.env.ARI_TEST_MYSQL_HOST;
    const port = parseInt(process.env.ARI_TEST_MYSQL_PORT, 10);
    const database = process.env.ARI_TEST_MYSQL_NAME;
    console.log(
      `[control-lists-module-wiring.integration-spec] resolved DB target: ${host}:${port}/${database}`,
    );

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: 'mysql' as const,
            host,
            port,
            username: process.env.ARI_TEST_MYSQL_USER_NAME,
            password: process.env.ARI_TEST_MYSQL_USER_PASS,
            database,
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
        TestCurrentUserModule,
        ControlListsModule,
      ],
    })
      // The controller's `@UseInterceptors(SetUpInterceptor)` only primes
      // per-request context that the application's global utilities module
      // provides; it is not part of what this suite wires.
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    service = moduleRef.get(ControlListsService, { strict: false });
  });

  afterAll(async () => {
    try {
      if (moduleRef) await moduleRef.close();
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  it('resolves ControlListsService from the real module', () => {
    expect(service).toBeInstanceOf(ControlListsService);
  });

  it('registers the link repository as a provider of the module', () => {
    const providers: unknown[] = Reflect.getMetadata(
      'providers',
      ControlListsModule,
    );
    expect(providers).toContain(ControlListValuePortfolioRepository);
    expect(
      moduleRef.get(ControlListValuePortfolioRepository, { strict: false }),
    ).toBeInstanceOf(ControlListValuePortfolioRepository);
  });

  // D-CLG-13: the service needs only a portfolio READ handle, which the module
  // now takes from `TypeOrmModule.forFeature([Portfolio])`; the module no longer
  // imports `PortfoliosModule`. The handle's presence is proven by the module
  // compiling at all (the service injects it) and by the token resolving here;
  // a module that dropped the `forFeature` would fail in `beforeAll`.
  it('no longer imports PortfoliosModule and still resolves the Portfolio repository token', () => {
    const imports: unknown[] = Reflect.getMetadata(
      'imports',
      ControlListsModule,
    );
    expect(imports).not.toContain(PortfoliosModule);
    expect(
      moduleRef.get(getRepositoryToken(Portfolio), { strict: false }),
    ).toBeDefined();
  });

  // A real read through the real wiring: the seeded list answers for a real
  // portfolio (both seeded portfolios are active) and 404s for a missing one.
  it('reads kpi.direction for a real portfolio through the wired repositories', async () => {
    const [portfolio] = await dataSource.query(
      `SELECT id FROM portfolios WHERE is_active = 1 ORDER BY id LIMIT 1`,
    );
    expect(portfolio).toBeDefined();

    const values = await service.getValuesByKey(
      'kpi.direction',
      true,
      Number(portfolio.id),
    );

    expect(values.length).toBeGreaterThan(0);
    for (const value of values.filter((v) => Number(v.id) <= 23)) {
      expect(value).toMatchObject({ appliesTo: [], appliesToAll: true });
    }
    await expect(
      service.getValuesByKey('kpi.direction', true, 999999999),
    ).rejects.toMatchObject({ status: 404 });
  });
});
