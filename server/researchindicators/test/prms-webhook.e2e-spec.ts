import 'dotenv/config';
import { INestApplication, Logger, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-04 /
// R-PWH-004 AC.1, AC.2, AC.3, AC.5, AC.6, AC.8 · carried gates 1 and 2.
// Boots AppModule with the middleware AppModule registers. This file
// must not replace that middleware.

process.env.ARI_LOCAL_AUTH_BYPASS = 'false';

const requireInherited = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `T-04 abort before app boot: ${name} is unset; refusing a CORE/Dev fallback`,
    );
  }
  return value;
};

// CORE points at the shared Dev database. Retarget it at the disposable
// TEST schema before AppModule evaluates getDataSource().
process.env.ARI_MYSQL_HOST = requireInherited('ARI_TEST_MYSQL_HOST');
process.env.ARI_MYSQL_USER_NAME = requireInherited('ARI_TEST_MYSQL_USER_NAME');
process.env.ARI_MYSQL_USER_PASS = requireInherited('ARI_TEST_MYSQL_USER_PASS');
process.env.ARI_MYSQL_NAME = requireInherited('ARI_TEST_MYSQL_NAME');
process.env.DB_PORT = requireInherited('ARI_TEST_MYSQL_PORT');

const CONFIGURED_SECRET = 'e2e-t04-configured-secret';
const WRONG_GUESS = 'e2e-t04-guess-7kQ';
const CREDENTIAL_HEADER = 'credential-shaped-e2e-t04';

const CREATE_DELIVERY_TABLE = `
CREATE TABLE IF NOT EXISTS \`prms_webhook_delivery\` (
  \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`created_by\` bigint NULL,
  \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`updated_by\` bigint NULL,
  \`is_active\` tinyint NOT NULL DEFAULT 1,
  \`deleted_at\` timestamp NULL,
  \`id\` bigint NOT NULL AUTO_INCREMENT,
  \`delivery_id\` varchar(191) NULL,
  \`received_at\` timestamp NOT NULL,
  \`environment\` varchar(20) NOT NULL,
  \`correlation_outcome\` varchar(40) NOT NULL,
  \`result_id\` bigint NULL,
  \`external_reference\` varchar(191) NULL,
  \`prms_result_id\` bigint NULL,
  \`prms_result_code\` bigint NULL,
  \`decision\` varchar(20) NULL,
  \`justification\` text NULL,
  \`decided_at\` timestamp NULL,
  \`raw_body\` json NULL,
  \`raw_headers\` json NULL,
  \`processing_state\` varchar(20) NOT NULL,
  \`processing_error\` text NULL,
  \`duplicate_of_id\` bigint NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_prms_webhook_delivery_delivery_id\` (\`delivery_id\`),
  INDEX \`idx_prms_webhook_delivery_result\` (\`result_id\`),
  INDEX \`idx_prms_webhook_delivery_received_at\` (\`received_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
`;

describe('PRMS webhook callback edge (T-04)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const logged: string[] = [];
  const previousSecret = process.env.ARI_PRMS_WEBHOOK_SECRET;

  const callbackPath = (secret: string): string =>
    `/api/prms-callback/${encodeURIComponent(secret)}`;

  const rowsFor = async (
    deliveryId: string,
  ): Promise<Array<{ raw_headers: unknown; raw_body: unknown }>> =>
    dataSource.query(
      'SELECT raw_headers, raw_body FROM prms_webhook_delivery WHERE delivery_id = ?',
      [deliveryId],
    );

  beforeAll(async () => {
    process.env.ARI_PRMS_WEBHOOK_SECRET = CONFIGURED_SECRET;
    process.env.ARI_LOCAL_AUTH_BYPASS = 'false';

    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
    dataSource = moduleFixture.get(DataSource);

    await dataSource.query(CREATE_DELIVERY_TABLE);
    await dataSource.query(
      `INSERT INTO migrations (\`timestamp\`, \`name\`)
       SELECT ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE \`timestamp\` = ?)`,
      [
        1790086170692,
        'CreatePrmsWebhookDeliveryTable1790086170692',
        1790086170692,
      ],
    );

    const methods = [
      'log',
      'warn',
      'error',
      'debug',
      'verbose',
      'fatal',
    ] as const;
    for (const method of methods) {
      if (typeof Logger.prototype[method] !== 'function') {
        continue;
      }
      const original = Logger.prototype[method] as (
        this: Logger,
        ...args: unknown[]
      ) => void;
      jest.spyOn(Logger.prototype, method).mockImplementation(function (
        this: Logger,
        ...args: unknown[]
      ) {
        logged.push(
          args
            .map((part) => {
              if (typeof part === 'string') {
                return part;
              }
              try {
                return JSON.stringify(part);
              } catch {
                return String(part);
              }
            })
            .join(' '),
        );
        return original.apply(this, args);
      });
    }
  }, 120_000);

  beforeEach(() => {
    logged.length = 0;
    process.env.ARI_PRMS_WEBHOOK_SECRET = CONFIGURED_SECRET;
    process.env.ARI_LOCAL_AUTH_BYPASS = 'false';
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM prms_webhook_delivery WHERE delivery_id LIKE 'e2e-t04-%'`,
      );
    }
    await app?.close();
    if (previousSecret === undefined) {
      delete process.env.ARI_PRMS_WEBHOOK_SECRET;
    } else {
      process.env.ARI_PRMS_WEBHOOK_SECRET = previousSecret;
    }
  });

  it('AC.2 correct secret with no Authorization header is accepted', async () => {
    const deliveryId = `e2e-t04-accept-${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post(callbackPath(CONFIGURED_SECRET))
      .set('x-prms-delivery-id', deliveryId)
      .send({ ping: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ received: true });
    expect(response.body.path).toBe('/api/prms-callback');
    expect(JSON.stringify(response.body)).not.toContain(CONFIGURED_SECRET);
    expect(await rowsFor(deliveryId)).toHaveLength(1);
  });

  it('AC.3 registration endpoints return 401 without a token', async () => {
    const post = await request(app.getHttpServer()).post('/api/prms-webhook');
    const get = await request(app.getHttpServer()).get('/api/prms-webhook');

    expect(post.status).toBe(401);
    expect(get.status).toBe(401);
  });

  it('AC.1 wrong secret is 404, writes no delivery row, and logs none of the guess', async () => {
    const deliveryId = `e2e-t04-wrong-${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post(callbackPath(WRONG_GUESS))
      .set('x-prms-delivery-id', deliveryId)
      .send({ ping: true });

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(WRONG_GUESS);
    expect(response.body.path).toBe('/api/prms-callback');
    expect(logged.join('\n')).not.toContain(WRONG_GUESS);
    expect(await rowsFor(deliveryId)).toHaveLength(0);
  });

  it('AC.5 a different-length secret is 404, not a 500 from timingSafeEqual', async () => {
    const response = await request(app.getHttpServer())
      .post(callbackPath('nope'))
      .send({ ping: true });

    expect(response.status).toBe(404);
  });

  it('AC.6 an unset secret refuses every request', async () => {
    delete process.env.ARI_PRMS_WEBHOOK_SECRET;
    try {
      const deliveryId = `e2e-t04-unset-${Date.now()}`;
      const anyPath = await request(app.getHttpServer())
        .post(callbackPath('anything-at-all'))
        .set('x-prms-delivery-id', deliveryId)
        .send({ ping: true });
      const emptyConfigured = await request(app.getHttpServer())
        .post(callbackPath(CONFIGURED_SECRET))
        .send({ ping: true });

      expect(anyPath.status).toBe(404);
      expect(emptyConfigured.status).toBe(404);
      expect(await rowsFor(deliveryId)).toHaveLength(0);
    } finally {
      process.env.ARI_PRMS_WEBHOOK_SECRET = CONFIGURED_SECRET;
    }
  });

  it('carried gate 1: an unparseable JSON body is not a 400', async () => {
    const deliveryId = `e2e-t04-unparsed-${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post(callbackPath(CONFIGURED_SECRET))
      .set('Content-Type', 'application/json')
      .set('x-prms-delivery-id', deliveryId)
      .send('{');

    expect(response.status).not.toBe(400);
    expect(response.status).toBe(200);
    const rows = await rowsFor(deliveryId);
    expect(rows).toHaveLength(1);
    const rawBody =
      typeof rows[0].raw_body === 'string'
        ? JSON.parse(rows[0].raw_body)
        : rows[0].raw_body;
    expect(rawBody).toEqual({ raw: '{' });
  });

  it('carried gate 2: a credential-shaped header is absent from the stored row', async () => {
    const deliveryId = `e2e-t04-headers-${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post(callbackPath(CONFIGURED_SECRET))
      .set('x-prms-delivery-id', deliveryId)
      .set('x-api-key', CREDENTIAL_HEADER)
      .set('Authorization', `Bearer ${CREDENTIAL_HEADER}`)
      .set('cookie', `session=${CREDENTIAL_HEADER}`)
      .send({ ping: true });

    expect(response.status).toBe(200);
    const rows = await rowsFor(deliveryId);
    expect(rows).toHaveLength(1);
    const stored = JSON.stringify(rows[0].raw_headers);
    expect(stored).toContain(deliveryId);
    expect(stored).not.toContain(CREDENTIAL_HEADER);
    expect(stored).not.toContain('authorization');
    expect(stored).not.toContain('x-api-key');
  });
});
