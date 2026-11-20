import 'reflect-metadata';
import 'dotenv/config';
import {
  Global,
  INestApplication,
  Module,
  VersioningType,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { StrategyFrameworkModule } from '../src/domain/entities/strategy-framework/strategy-framework.module';
import { FrameworkReadService } from '../src/domain/entities/strategy-framework/framework-read.service';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { route } from '../src/domain/routes/main.routes';
import { assertLocalTestDatabase } from './support/strategy-framework-fixtures';

/**
 * Real module, real route tree, live Swagger document
 * (design §10, T-08 forward pointer: tag "Strategy Framework", 16
 * method+path pairs, none under `/v1/`).
 *
 * Scope (KZ-017): `JwtMiddleware` is replaced. This boot does not prove
 * `EntitiesModule` imports the module. URI versioning is enabled as in
 * `main.ts` (no defaultVersion), so a `@Version('1')` handler mounts and
 * documents under `/v1/`. The route tree plus a 200 from the database
 * proves the module resolves and is mounted unversioned.
 */
@Global()
@Module({
  providers: [{ provide: CurrentUserUtil, useValue: { user_id: 1 } }],
  exports: [CurrentUserUtil],
})
class StfWiringGlobalModule {}

describe('Strategy framework — real module and Swagger (T-10)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    assertLocalTestDatabase('strategy-framework-module-wiring');
    const moduleRef = await Test.createTestingModule({
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
            extra: { connectionLimit: 4, charset: 'utf8mb4_0900_ai_ci' },
          }),
          dataSourceFactory: async (options) => {
            dataSource = await new DataSource(options).initialize();
            return dataSource;
          },
        }),
        StfWiringGlobalModule,
        StrategyFrameworkModule,
        RouterModule.register(route),
      ],
    })
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.use((req, _res, next) => {
      req.user = { sec_user_id: 1, roles: [SecRolesEnum.ODS_ADMIN] };
      next();
    });
    await app.init();

    const config = new DocumentBuilder()
      .setTitle('Research Indicators API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const pairs: string[] = [];
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    for (const [path, item] of Object.entries(document.paths)) {
      for (const method of methods) {
        const operation = item[method] as { tags?: string[] } | undefined;
        if (operation?.tags?.includes('Strategy Framework')) {
          pairs.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    pairs.sort();
    console.log(
      `[strategy-framework-module-wiring] Swagger tag "Strategy Framework" ${pairs.length} method+path pairs:\n  ${pairs.join('\n  ')}`,
    );
    expect(pairs).toHaveLength(16);
    expect(pairs.some((pair) => pair.includes('/v1/'))).toBe(false);
    expect(moduleRef.get(FrameworkReadService)).toBeInstanceOf(
      FrameworkReadService,
    );
  }, 120000);

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  it('GET /api/strategy-framework/framework answers Portfolio 2 from the database', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/strategy-framework/framework?portfolioId=2',
    );
    expect(res.status).toBe(200);
    expect(res.body.data.levels).toHaveLength(3);
    expect(res.body.data.elements).toHaveLength(48);
    expect(res.body.data.usageLabels).toBeUndefined();
  });

  it('is unversioned: /api/v1/strategy-framework/framework is 404', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/strategy-framework/framework?portfolioId=2',
    );
    expect(res.status).toBe(404);
  });
});
