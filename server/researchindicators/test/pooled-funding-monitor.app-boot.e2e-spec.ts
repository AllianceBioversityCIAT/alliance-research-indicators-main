import 'dotenv/config';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor - T-05 (KZ-017)
//
// The ONE case that proves the module is mounted by the REAL application:
// boots `AppModule` (entities.module.ts + main.routes.ts + the real
// JwtMiddleware chain) and hits the real URL. The sibling
// `pooled-funding-monitor.e2e-spec.ts` imports the module directly and therefore
// cannot see a missing `entities.module.ts` import; this one can.
//
// ISOLATION (pattern of prms-webhook.e2e-spec.ts, plus extra outbound blackholing):
//   - CORE `ARI_MYSQL_*` is retargeted to `ARI_TEST_MYSQL_*` BEFORE AppModule is
//     evaluated, and the suite refuses to boot unless that target is a loopback
//     host whose schema name contains "scratch" and whose `results` table is empty.
//   - Every other outbound endpoint read from `.env` (RabbitMQ, ROAR socket,
//     OpenSearch x3, CLARISA, AGRESSO, TIP, file-manager / AI microservices) is
//     pointed at the discard port 127.0.0.1:9 before boot, so nothing in the boot
//     path can reach shared Dev infra. (The precedents do NOT do this.)
//   - Auth is `ARI_LOCAL_AUTH_BYPASS=true` (honoured only while IS_PRODUCTION is
//     false), set for this process only: the request is authenticated as the bypass
//     SYSTEM_ADMIN, so a 200 can only come from the mounted controller + guard.
//   - Writes: DDL only, on the scratch schema - the two PRMS tables the base query
//     reads are created from the REAL migration classes if absent (same as the
//     webhook precedent). No rows are inserted.

const requireInherited = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `abort before boot: ${name} is unset; no CORE/Dev fallback`,
    );
  }
  return value;
};

const host = requireInherited('ARI_TEST_MYSQL_HOST');
const name = requireInherited('ARI_TEST_MYSQL_NAME');
if (!['127.0.0.1', 'localhost'].includes(host) || !/scratch/i.test(name)) {
  throw new Error(
    `abort before boot: ${host}/${name} is not the local disposable scratch schema`,
  );
}
process.env.ARI_MYSQL_HOST = host;
process.env.ARI_MYSQL_USER_NAME = requireInherited('ARI_TEST_MYSQL_USER_NAME');
process.env.ARI_MYSQL_USER_PASS = requireInherited('ARI_TEST_MYSQL_USER_PASS');
process.env.ARI_MYSQL_NAME = name;
process.env.DB_PORT = requireInherited('ARI_TEST_MYSQL_PORT');

const SINK = 'http://127.0.0.1:9';
for (const key of [
  'ARI_ROAR_MANAGEMENT_HOST',
  'ARI_OPENSEARCH_URL',
  'ARI_OPEN_SEARCH_PRMS_HOST',
  'ARI_SEARCH_PRMS_URL',
  'ARI_CLARISA_HOST',
  'ARI_AGRESSO_URL',
  'ARI_TIP_API_URL',
  'STAR_MS_FILE_MANAGER_URL',
  'STAR_MS_AI_URL',
]) {
  process.env[key] = SINK;
}
process.env.ARI_MQ_HOST = '127.0.0.1:9';
process.env.ARI_IS_PRODUCTION = 'false';
process.env.ARI_LOCAL_AUTH_BYPASS = 'true';

describe('Pooled Funding Monitor mounted by the real AppModule (KZ-017)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();

    const ds = moduleFixture.get(DataSource);
    const opts = ds.options as { host?: string; database?: string };
    if (opts.host !== host || opts.database !== name) {
      throw new Error('AppModule DataSource is not the scratch target');
    }
    const [{ n }] = await ds.query(`SELECT COUNT(*) AS n FROM results`);
    if (Number(n) !== 0) {
      throw new Error(`refusing: ${name}.results holds ${n} rows`);
    }
    // DDL on the disposable scratch only: the PRMS tables the base query reads.
    const qr = ds.createQueryRunner();
    try {
      const present = async (t: string) =>
        (
          await qr.query(
            `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
            [t],
          )
        )[0].n > 0;
      if (!(await present('result_prms_sync_log'))) {
        const { CreateResultPrmsSyncLogTable1789479131116: A } = await import(
          '../src/db/migrations/1789479131116-createResultPrmsSyncLogTable'
        );
        const { ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000: B } =
          await import(
            '../src/db/migrations/1790023167000-replaceResultIdWithOfficialCodeInPrmsSyncLog'
          );
        await new A().up(qr);
        await new B().up(qr);
      }
      if (!(await present('result_prms_sync_history'))) {
        const { CreatePrmsWebhookDeliveryTable1790086170692: C } = await import(
          '../src/db/migrations/1790086170692-createPrmsWebhookDeliveryTable'
        );
        await new C().up(qr);
      }
    } finally {
      await qr.release();
    }
  }, 180_000);

  afterAll(async () => {
    await app?.close();
  });

  it('summary is mounted: 200 with the data envelope (not a route miss)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/pooled-funding-monitor/summary?scope=all',
    );
    expect(res.status).toBe(200);
    expect(res.body.path).toBe('/api/pooled-funding-monitor/summary?scope=all');
    expect(res.body.data.scope).toBe('all');
    expect(res.body.data.kpis.monitored).toBe(0); // empty scratch
  });

  it('queue is mounted', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/pooled-funding-monitor/queue?scope=all',
    );
    expect(res.status).toBe(200);
    expect(res.body.data.totals.monitored_total).toBe(0);
  });

  it('project-results is mounted: the 404 is the SERVICE rule, not a route miss', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/pooled-funding-monitor/queue/projects/P-NOPE/results',
    );
    expect(res.status).toBe(404);
    expect(res.body.errors).toBe('Project not found');
  });
});
