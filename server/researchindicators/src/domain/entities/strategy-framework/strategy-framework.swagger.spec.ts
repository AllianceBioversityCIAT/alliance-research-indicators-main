import { INestApplication, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { FrameworkReadService } from './framework-read.service';
import { StrategyFrameworkController } from './strategy-framework.controller';
import { StrategyFrameworkService } from './strategy-framework.service';

/**
 * NFR-STF-005. The OpenAPI document is built with
 * `SwaggerModule.createDocument` over a testing app. No HTTP server is
 * listened on, and `ARI_MYSQL_*` is not read.
 *
 * What this cannot reach (KZ-017): the rendered `/swagger` HTML, and whether
 * a booted production app (global pipes, the real module graph) serves that
 * document. Route registration reachability is the module-graph spec plus
 * T-10, not this document.
 */
describe('Strategy Framework OpenAPI document (T-08, NFR-STF-005)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    @Module({
      controllers: [StrategyFrameworkController],
      providers: [
        { provide: FrameworkReadService, useValue: {} },
        { provide: StrategyFrameworkService, useValue: {} },
      ],
    })
    class StrategyFrameworkSwaggerHostModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        StrategyFrameworkSwaggerHostModule,
        RouterModule.register([
          {
            path: 'strategy-framework',
            module: StrategyFrameworkSwaggerHostModule,
          },
        ]),
      ],
    })
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('tags every design §4 operation Strategy Framework and places usageLabels on the editor view', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Research Indicators API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );

    const operations: Array<{
      method: string;
      path: string;
      description: string;
    }> = [];
    for (const [path, item] of Object.entries(document.paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const operation = item?.[method];
        if (!operation) continue;
        expect(operation.tags).toEqual(['Strategy Framework']);
        operations.push({
          method: method.toUpperCase(),
          path,
          description: operation.description ?? '',
        });
      }
    }

    const keys = operations.map(
      (operation) => `${operation.method} ${operation.path}`,
    );
    // OpenAPI object-key order is not Nest route order (carry-forward is
    // emitted after POST /objectives). Declaration order, literal before
    // `:id`, is pinned by the controller spec.
    const expected = [
      'GET /api/strategy-framework/context',
      'GET /api/strategy-framework/framework/editor',
      'GET /api/strategy-framework/framework',
      'GET /api/strategy-framework/resolve',
      'GET /api/strategy-framework/code-proposal',
      'GET /api/strategy-framework/staff',
      'POST /api/strategy-framework/elements',
      'GET /api/strategy-framework/elements/{id}/blockers',
      'PATCH /api/strategy-framework/elements/{id}',
      'DELETE /api/strategy-framework/elements/{id}',
      'GET /api/strategy-framework/objectives/years',
      'GET /api/strategy-framework/objectives',
      'POST /api/strategy-framework/objectives/carry-forward',
      'POST /api/strategy-framework/objectives',
      'PATCH /api/strategy-framework/objectives/{id}',
      'DELETE /api/strategy-framework/objectives/{id}',
    ];
    expect(keys).toHaveLength(16);
    expect(new Set(keys)).toEqual(new Set(expected));
    expect(keys.some((key) => key.includes('/v1/'))).toBe(false);

    const editor = operations.find((operation) =>
      operation.path.endsWith('/framework/editor'),
    );
    expect(editor?.description).toContain(
      'On the view, once, usageLabels is {consumerName, label}[] (D-STF-28).',
    );

    const schemas = document.components?.schemas ?? {};
    const view = schemas.FrameworkEditorViewDto as {
      properties: Record<string, unknown>;
    };
    const element = schemas.FrameworkEditorElementDto as {
      properties: Record<string, unknown>;
    };
    const consumer = schemas.FrameworkElementDto as {
      properties: Record<string, unknown>;
    };
    expect(view.properties).toHaveProperty('usageLabels');
    expect(
      (view.properties.usageLabels as { description?: string }).description,
    ).toContain('On the view, once: {consumerName, label}[] (D-STF-28).');
    expect(view.properties).toHaveProperty('elements');
    expect(element.properties).toHaveProperty('usage');
    expect(element.properties).toHaveProperty('deletable');
    expect(element.properties).toHaveProperty('blockers');
    expect(element.properties).not.toHaveProperty('usageLabels');
    expect(consumer.properties).not.toHaveProperty('usageLabels');
    expect(consumer.properties).not.toHaveProperty('usage');
    expect(consumer.properties).not.toHaveProperty('deletable');
    expect(consumer.properties).not.toHaveProperty('blockers');
  });
});
