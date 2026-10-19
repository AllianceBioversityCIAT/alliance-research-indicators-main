import 'dotenv/config';
import {
  Global,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  VersioningType,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, QueryRunner } from 'typeorm';
import { CreatePiDelegates1787600000000 } from '../src/db/migrations/1787600000000-createPiDelegates';
import { CreateResultPrmsSyncLogTable1789479131116 } from '../src/db/migrations/1789479131116-createResultPrmsSyncLogTable';
import { ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000 } from '../src/db/migrations/1790023167000-replaceResultIdWithOfficialCodeInPrmsSyncLog';
import { CreatePrmsWebhookDeliveryTable1790086170692 } from '../src/db/migrations/1790086170692-createPrmsWebhookDeliveryTable';
import { PooledFundingMonitorModule } from '../src/domain/entities/pooled-funding-monitor/pooled-funding-monitor.module';
import { EntitiesModule } from '../src/domain/entities/entities.module';
import { route as mainRoute } from '../src/domain/routes/main.routes';
import { AppSecretsService } from '../src/domain/entities/app-secrets/app-secrets.service';
import { ImpersonationService } from '../src/domain/entities/impersonation/impersonation.service';
import { ResponseInterceptor } from '../src/domain/shared/Interceptors/response.interceptor';
import { GlobalExceptions } from '../src/domain/shared/error-management/global.exception';
import { JwtMiddleware } from '../src/domain/shared/middlewares/jwr.middleware';
import { ResultsUtil } from '../src/domain/shared/utils/results.util';
import { AlianceManagementApp } from '../src/domain/tools/broker/aliance-management.app';
import { RoarManagementService } from '../src/domain/tools/roar-management/roar-management.service';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor - T-05
//
// HTTP e2e of the Pooled Funding Monitor on REAL sockets, with the REAL
// JwtMiddleware, NotContributorOnlyGuard, ValidationPipe, controller, service,
// repository, ResponseInterceptor and GlobalExceptions, against a REAL MySQL.
//
// WHAT IS NOT REAL (stated, not hidden):
//   - The Nest host is a minimal testing module, NOT `AppModule`. Booting
//     AppModule needs RabbitMQ / OpenSearch / DynamoDB / CLARISA from `.env` (shared
//     Dev infra), which this suite refuses to touch. The route PATH comes from the
//     real `main.routes.ts` through `RouterModule.register`, so an unregistered
//     path 404s here. The `entities.module.ts` registration cannot be proven by
//     HTTP here; `pooled-funding-monitor.app-boot.e2e-spec.ts` boots the real
//     AppModule for that, and the last describe keeps a metadata check as a cheap twin.
//   - ROAR token validation (an external HTTP service) is a map: token -> user.
//     Everything the middleware does AROUND it (401 on a missing / malformed /
//     rejected token, `req.credential`) is the shipped code.
//
// SAFETY (same contract as pooled-funding-monitor.integration-spec.ts):
//   1. Refuses to run unless `results` is EMPTY (the disposable, schema-only scratch).
//   2. ONE pinned connection; all seed rows live in ONE transaction that is
//      ROLLED BACK in afterAll, which then proves `results` is empty again.
//   3. Missing tables are created as TEMPORARY tables by replaying the real
//      migration classes (they vanish with the connection).
//   Never reads ARI_MYSQL_* (shared Dev):
//   PFM_MYSQL_PASSWORD=<pass> npx jest --config test/jest-e2e.json test/pooled-funding-monitor

process.env.ARI_LOCAL_AUTH_BYPASS = 'false';

const config = () => {
  const password = process.env.PFM_MYSQL_PASSWORD;
  if (!password) {
    throw new Error(
      'PFM_MYSQL_PASSWORD is not set. This suite never falls back to ARI_MYSQL_* ' +
        '(shared DEV); point it at the disposable scratch schema.',
    );
  }
  return {
    host: process.env.PFM_MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.PFM_MYSQL_PORT || '3307', 10),
    username: process.env.PFM_MYSQL_USER || 'root',
    password,
    database: process.env.PFM_MYSQL_DATABASE || 'ari_scratch_test',
  };
};

const YEAR = new Date().getUTCFullYear();

const PI_A = 101; // leads P-A
const PI_B = 102; // leads P-B
const NO_PROJECTS = 105; // center admin who leads nothing
const CONTRIBUTOR_ONLY = 106;
const CONTRIBUTOR_AND_ADMIN = 107;
const MACHINE_RESPONSIBLE = 108; // machine token's responsible human (admin roles)

// token -> identity (ROAR is the only stubbed piece)
const USERS: Record<string, { sec_user_id: number; roles: number[] }> = {
  'tok-pi-a': { sec_user_id: PI_A, roles: [9] },
  'tok-pi-b': { sec_user_id: PI_B, roles: [9] },
  'tok-none': { sec_user_id: NO_PROJECTS, roles: [9] },
  'tok-contrib': { sec_user_id: CONTRIBUTOR_ONLY, roles: [3] },
  'tok-contrib-admin': { sec_user_id: CONTRIBUTOR_AND_ADMIN, roles: [3, 9] },
  'tok-sysadmin': { sec_user_id: PI_A, roles: [1] },
};
const MACHINE_TOKEN = Buffer.from(
  JSON.stringify({ client_id: 'c', client_secret: 's' }),
).toString('base64');

let ds: DataSource;

@Global()
@Module({
  providers: [{ provide: DataSource, useFactory: () => ds }],
  exports: [DataSource],
})
class ScratchDbModule {}

@Module({
  imports: [
    ScratchDbModule,
    PooledFundingMonitorModule,
    // The REAL route table: the path of the module comes from main.routes.ts.
    RouterModule.register(mainRoute),
  ],
  providers: [
    JwtMiddleware,
    { provide: AlianceManagementApp, useValue: {} },
    { provide: ResultsUtil, useValue: {} },
    { provide: ImpersonationService, useValue: { resolve: jest.fn() } },
    {
      provide: RoarManagementService,
      useValue: {
        validateToken: async (token: string) =>
          USERS[token]
            ? { isValid: true, user: USERS[token] }
            : { isValid: false },
      },
    },
    {
      provide: AppSecretsService,
      useValue: {
        validation: async () => ({
          isValid: true,
          user: { sec_user_id: MACHINE_RESPONSIBLE, roles: [1, 9] },
        }),
      },
    },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptions },
  ],
})
class PfmE2eHostModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

describe('Pooled Funding Monitor (HTTP e2e, scratch MySQL)', () => {
  let app: INestApplication;
  const tableSource: Record<string, 'persistent' | 'temporary'> = {};

  const q = <T = Record<string, unknown>[]>(sql: string, params?: unknown[]) =>
    ds.query(sql, params) as Promise<T>;
  const insert = async (table: string, row: Record<string, unknown>) => {
    const cols = Object.keys(row);
    await q(
      `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
  };

  const replayAsTemporary = async (
    tableName: string,
    migrations: { up(qr: QueryRunner): Promise<void> }[],
  ) => {
    const [{ n }] = await q<{ n: string | number }[]>(
      `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName],
    );
    if (Number(n) > 0) {
      tableSource[tableName] = 'persistent';
      return;
    }
    const shim = {
      query: async (sql: string) => {
        if (/ADD CONSTRAINT|DROP FOREIGN KEY/i.test(sql)) return undefined;
        return q(sql.replace(/^\s*CREATE TABLE/i, 'CREATE TEMPORARY TABLE'));
      },
    } as unknown as QueryRunner;
    for (const migration of migrations) await migration.up(shim);
    tableSource[tableName] = 'temporary';
  };

  async function seed() {
    for (const [id, name] of [
      [1, 'Knowledge Product'],
      [2, 'Innovation Development'],
      [5, 'OICR'],
    ] as const) {
      await insert('indicators', {
        indicator_id: id,
        name,
        indicator_type_id: 1,
      });
    }
    for (const [id, name] of [
      [4, 'Draft'],
      [6, 'Approved'],
    ] as const) {
      await insert('result_status', { result_status_id: id, name });
    }
    for (const [id, lead, flag] of [
      ['P-A', 'C-A', 1],
      ['P-B', 'C-B', 1],
      ['P-C', 'C-C', 1], // contributing, nobody in this suite leads it
      ['P-N', 'C-A', 0], // NOT contributing, but PI A leads it
    ] as const) {
      await insert('agresso_contracts', {
        agreement_id: id,
        short_title: `${id} title`,
        description: `${id} description`,
        donor: `${id} donor`,
        project_lead_description: `Lead of ${id}`,
        projectLeadId: lead,
        is_pool_funding_contributor: flag,
      });
    }
    for (const [id, email] of [
      [PI_A, 'a@x.org'],
      [PI_B, 'b@x.org'],
      [NO_PROJECTS, 'n@x.org'],
    ] as const) {
      await insert('sec_users', { sec_user_id: id, email });
    }
    for (const [carnet, email] of [
      ['C-A', 'a@x.org'],
      ['C-B', 'b@x.org'],
    ] as const) {
      await insert('alliance_user_staff', {
        carnet,
        first_name: carnet,
        last_name: carnet,
        email,
      });
    }
    await insert('clarisa_science_programs', {
      official_code: 'SP01',
      name: 'Alpha program',
      category: 'Science programs',
      color: '#111111',
    });

    const result = async (
      id: number,
      code: number,
      contract: string,
      o: Partial<{ indicator: number; status: number; synced: number }> = {},
    ) => {
      await insert('results', {
        result_id: id,
        result_official_code: code,
        title: `Result ${code}`,
        indicator_id: o.indicator ?? 1,
        result_status_id: o.status ?? 4,
        report_year_id: YEAR,
        is_snapshot: 0,
        platform_code: 'STAR',
        is_active: 1,
        is_synced_to_prms: o.synced ?? 0,
        updated_at: '2026-10-01 10:20:30',
      });
      await insert('result_contracts', {
        result_id: id,
        contract_role_id: 1,
        contract_id: contract,
        is_primary: 1,
        is_active: 1,
      });
    };
    // P-A: 2 monitored results (one synced + accepted this year)
    await result(1, 1001, 'P-A', { status: 6, synced: 1 });
    await result(2, 1002, 'P-A');
    // P-B: 3 monitored results (distinct types so type filters discriminate)
    await result(3, 2001, 'P-B', { status: 6 });
    await result(4, 2002, 'P-B');
    await result(5, 2003, 'P-B', { indicator: 2 });
    // P-C: 1 result nobody here leads
    await result(6, 3001, 'P-C');
    // NOT monitored: OICR on P-A; result on the non-contributing P-N
    await result(7, 4001, 'P-A', { indicator: 5 });
    await result(8, 4002, 'P-N');

    await insert('result_prms_sync_log', {
      external_reference: '1001',
      result_year: YEAR,
      attempt_number: 1,
      environment: 'TEST',
      outcome: 'ACCEPTED',
      created_at: new Date(),
    });
  }

  /** Hand-written count, sharing no text with the repository. */
  const independentCount = async (projects: string[]) => {
    const [row] = await q<{ n: string | number }[]>(
      `SELECT COUNT(DISTINCT r.result_official_code) AS n
       FROM results r
       WHERE r.platform_code = 'STAR' AND r.is_snapshot = 0 AND r.is_active = 1
         AND r.indicator_id <> 5
         AND r.result_id IN (
           SELECT rc.result_id FROM result_contracts rc
           WHERE rc.is_primary = 1 AND rc.is_active = 1
             AND rc.contract_id IN (${projects.map(() => '?').join(', ')})
         )`,
      projects,
    );
    return Number(row.n);
  };

  const get = (path: string, token?: string) => {
    const r = request(app.getHttpServer()).get(path);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };
  const BASE = '/api/pooled-funding-monitor';

  beforeAll(async () => {
    const c = config();
    ds = new DataSource({
      type: 'mysql',
      ...c,
      entities: [],
      synchronize: false,
      migrationsRun: false,
      logging: false,
      bigNumberStrings: false,
      extra: {
        connectionLimit: 1, // one connection: app queries see the open transaction
        namedPlaceholders: true,
        charset: 'utf8mb4_unicode_520_ci',
      },
    });
    await ds.initialize();

    const [{ n }] = await q<{ n: string | number }[]>(
      `SELECT COUNT(*) AS n FROM results`,
    );
    if (Number(n) !== 0) {
      await ds.destroy();
      throw new Error(
        `Refusing to run: ${c.database}.results holds ${n} rows - not a disposable, schema-only database.`,
      );
    }
    await q(`SET time_zone = '+00:00'`);
    await q(`SET FOREIGN_KEY_CHECKS = 0`);
    await replayAsTemporary('pi_delegates', [
      new CreatePiDelegates1787600000000(),
    ]);
    await replayAsTemporary('result_prms_sync_log', [
      new CreateResultPrmsSyncLogTable1789479131116(),
      new ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000(),
    ]);
    await replayAsTemporary('result_prms_sync_history', [
      new CreatePrmsWebhookDeliveryTable1790086170692(),
    ]);
    console.info('PFM e2e table sources:', tableSource);
    await q(`START TRANSACTION`);
    await seed();

    const moduleRef = await Test.createTestingModule({
      imports: [PfmE2eHostModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api'); // as main.ts
    app.enableVersioning({ type: VersioningType.URI }); // as main.ts
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    if (!ds?.isInitialized) return;
    try {
      await q(`ROLLBACK`);
      const [{ n }] = await q<{ n: string | number }[]>(
        `SELECT COUNT(*) AS n FROM results`,
      );
      expect(Number(n)).toBe(0); // proof the suite left nothing behind
    } finally {
      await ds.destroy();
    }
  });

  describe('authentication and authorization (R-PFM-001, NFR-PFM-001)', () => {
    it('401 without a token, on all three endpoints', async () => {
      for (const path of [
        `${BASE}/summary`,
        `${BASE}/queue`,
        `${BASE}/queue/projects/P-A/results`,
      ]) {
        const res = await get(path);
        expect(res.status).toBe(401);
      }
    });

    it('401 for a token ROAR rejects', async () => {
      expect((await get(`${BASE}/summary`, 'tok-garbage')).status).toBe(401);
    });

    it('403 for a contributor-only user, from the SERVER, on all three endpoints', async () => {
      for (const path of [
        `${BASE}/summary`,
        `${BASE}/queue`,
        `${BASE}/queue/projects/P-A/results`,
      ]) {
        const res = await get(path, 'tok-contrib');
        expect(res.status).toBe(403);
        expect(res.body.data).toBeUndefined();
        expect(res.body.status).toBe(403);
        expect(res.body.path).toBe(path);
        expect(typeof res.body.timestamp).toBe('string');
      }
    });

    it('403 for a machine token even though its responsible human holds admin roles', async () => {
      const res = await get(`${BASE}/summary`, MACHINE_TOKEN);
      expect(res.status).toBe(403);
      expect(res.body.status).toBe(403);
      expect(res.body.path).toBe(`${BASE}/summary`);
    });

    it('200 for an allowed role, a contributor who also holds another role, and SYSTEM_ADMIN', async () => {
      for (const token of ['tok-pi-a', 'tok-contrib-admin', 'tok-sysadmin']) {
        const res = await get(`${BASE}/summary`, token);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET summary', () => {
    it('envelope + design §4 shape', async () => {
      const res = await get(`${BASE}/summary`, 'tok-pi-a');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: 200,
          path: `${BASE}/summary`,
        }),
      );
      expect(Object.keys(res.body.data).sort()).toEqual(
        [
          'scope',
          'is_pi_of_any',
          'kpis',
          'pipeline',
          'sp_coverage',
          'monthly',
          'synced_this_year',
        ].sort(),
      );
      expect(res.body.data.monthly).toHaveLength(6);
    });

    it('defaults to the PI scope and matches the independent count', async () => {
      const res = await get(`${BASE}/summary`, 'tok-pi-a');
      expect(res.body.data.scope).toBe('mine');
      expect(res.body.data.kpis.monitored).toBe(
        await independentCount(['P-A']),
      );
      expect(res.body.data.kpis.monitored).toBe(2);
      expect(res.body.data.kpis.projects).toBe(1);
      expect(res.body.data.synced_this_year).toBe(1);
    });

    it('PI isolation: PI A never sees PI B and vice versa', async () => {
      const a = (await get(`${BASE}/summary`, 'tok-pi-a')).body.data;
      const b = (await get(`${BASE}/summary`, 'tok-pi-b')).body.data;
      expect(a.kpis.monitored).toBe(2);
      expect(b.kpis.monitored).toBe(await independentCount(['P-B']));
      expect(b.kpis.monitored).toBe(3);
      expect(b.synced_this_year).toBe(0);
      const aq = (await get(`${BASE}/queue`, 'tok-pi-a')).body.data;
      const bq = (await get(`${BASE}/queue`, 'tok-pi-b')).body.data;
      expect(aq.groups.map((g: { code: string }) => g.code)).toEqual(['P-A']);
      expect(bq.groups.map((g: { code: string }) => g.code)).toEqual(['P-B']);
    });

    it('a forged user id in the query cannot change whose data is returned', async () => {
      const res = await get(
        `${BASE}/summary?scope=mine&userId=${PI_B}&sec_user_id=${PI_B}&user_id=${PI_B}`,
        'tok-pi-a',
      );
      expect(res.status).toBe(200);
      expect(res.body.data.kpis.monitored).toBe(2);
    });

    it('switching scope gives ONE consistent portfolio dataset (R-PFM-002)', async () => {
      const res = await get(`${BASE}/summary?scope=all`, 'tok-pi-a');
      const d = res.body.data;
      expect(d.scope).toBe('all');
      expect(d.kpis.monitored).toBe(
        await independentCount(['P-A', 'P-B', 'P-C']),
      );
      expect(d.kpis.monitored).toBe(6);
      expect(d.kpis.projects).toBe(3);
      expect(d.pipeline.total).toBe(d.kpis.monitored);
      expect(
        d.pipeline.stages.reduce(
          (a: number, s: { value: number }) => a + s.value,
          0,
        ),
      ).toBe(d.kpis.monitored);
      const q2 = (await get(`${BASE}/queue?scope=all`, 'tok-pi-a')).body.data;
      expect(q2.chip_counts.all).toBe(d.kpis.monitored);
      expect(q2.totals.monitored_total).toBe(d.kpis.monitored);
    });

    it('is_pi_of_any is about the user, whatever scope is shown', async () => {
      for (const scope of ['mine', 'all']) {
        const a = await get(`${BASE}/summary?scope=${scope}`, 'tok-pi-a');
        expect(a.body.data.is_pi_of_any).toBe(true);
        const n = await get(`${BASE}/summary?scope=${scope}`, 'tok-none');
        expect(n.body.data.is_pi_of_any).toBe(false);
      }
    });

    it('a viewer with no projects gets an EMPTY PI scope, never the portfolio', async () => {
      const res = await get(`${BASE}/summary`, 'tok-none');
      expect(res.body.data.scope).toBe('mine');
      expect(res.body.data.kpis.monitored).toBe(0);
      expect(res.body.data.kpis.projects_total).toBe(3);
    });
  });

  describe('GET queue', () => {
    it('returns filter_options, chip_counts, groups and totals', async () => {
      const res = await get(`${BASE}/queue?scope=all`, 'tok-pi-a');
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(Object.keys(d).sort()).toEqual(
        ['chip_counts', 'filter_options', 'groups', 'totals'].sort(),
      );
      expect(
        d.filter_options.projects.map((p: { code: string }) => p.code),
      ).toEqual(['P-A', 'P-B', 'P-C']);
      expect(d.filter_options.types.map((t: { id: number }) => t.id)).toEqual([
        1, 2,
      ]);
    });

    it('filters combine with AND', async () => {
      const both = await get(
        `${BASE}/queue?scope=all&project=P-B&type=2`,
        'tok-pi-a',
      );
      expect(both.body.data.totals.results).toBe(1);
      const onlyProject = await get(
        `${BASE}/queue?scope=all&project=P-B`,
        'tok-pi-a',
      );
      expect(onlyProject.body.data.totals.results).toBe(3);
      const none = await get(
        `${BASE}/queue?scope=all&project=P-A&type=2`,
        'tok-pi-a',
      );
      expect(none.body.data.totals.results).toBe(0);
    });

    it('400 for invalid enum / number query values', async () => {
      for (const qs of [
        'scope=everyone',
        'chip=nope',
        'status=nope',
        'type=abc',
      ]) {
        expect((await get(`${BASE}/queue?${qs}`, 'tok-pi-a')).status).toBe(400);
      }
      expect(
        (await get(`${BASE}/summary?scope=everyone`, 'tok-pi-a')).status,
      ).toBe(400);
    });
  });

  describe('GET queue/projects/:projectCode/results', () => {
    it('returns the ranked rows of an in-scope project with the design §4 fields', async () => {
      const res = await get(`${BASE}/queue/projects/P-A/results`, 'tok-pi-a');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(Object.keys(res.body.data[0]).sort()).toEqual(
        [
          'result_code',
          'platform_code',
          'official_code',
          'report_year',
          'snapshot_years',
          'title',
          'type',
          'star_label',
          'star_status_id',
          'pi_line',
          'mapping_state',
          'mapping_note',
          'sp_line',
          'primary_sp',
          'contributing',
          'prms_status',
          'prms_hint',
          'updated_at',
        ].sort(),
      );
      const codes = res.body.data.map(
        (r: { official_code: number }) => r.official_code,
      );
      expect(codes.sort()).toEqual([1001, 1002]);
    });

    it('404 for a project outside the PI scope, indistinguishable from one that does not exist', async () => {
      const foreign = await get(
        `${BASE}/queue/projects/P-B/results`,
        'tok-pi-a',
      );
      const missing = await get(
        `${BASE}/queue/projects/P-NOPE/results`,
        'tok-pi-a',
      );
      expect(foreign.status).toBe(404);
      expect(missing.status).toBe(404);
      const strip = (b: Record<string, unknown>) => {
        const { timestamp, path, ...rest } = b;
        void timestamp;
        void path;
        return rest;
      };
      expect(strip(foreign.body)).toEqual(strip(missing.body));
    });

    it('the same project IS reachable in the portfolio scope', async () => {
      const res = await get(
        `${BASE}/queue/projects/P-B/results?scope=all`,
        'tok-pi-a',
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('applies the same filters as the queue; an in-scope project with no matching row is 200 []', async () => {
      const typed = await get(
        `${BASE}/queue/projects/P-B/results?scope=all&type=2`,
        'tok-pi-a',
      );
      expect(
        typed.body.data.map((r: { official_code: number }) => r.official_code),
      ).toEqual([2003]);
      const none = await get(
        `${BASE}/queue/projects/P-A/results?type=2`,
        'tok-pi-a',
      );
      expect(none.status).toBe(200);
      expect(none.body.data).toEqual([]);
    });
  });

  describe('routing (R-PFM-014, unversioned routes)', () => {
    it('/api/v1/... is 404 (no @Version on these handlers)', async () => {
      const res = await get(
        '/api/v1/pooled-funding-monitor/summary',
        'tok-pi-a',
      );
      expect(res.status).toBe(404);
    });

    it('the module path comes from the route table: bare /api/summary is 404', async () => {
      expect((await get('/api/summary', 'tok-pi-a')).status).toBe(404);
    });

    it('only GET is exposed: POST / PUT / PATCH / DELETE are 404', async () => {
      const server = app.getHttpServer();
      for (const method of ['post', 'put', 'patch', 'delete'] as const) {
        for (const path of [`${BASE}/summary`, `${BASE}/queue`]) {
          const res = await request(server)
            [method](path)
            .set('Authorization', 'Bearer tok-pi-a');
          expect(res.status).toBe(404);
        }
      }
    });

    it('Swagger lists exactly the three endpoints', () => {
      const doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().addBearerAuth().build(),
      );
      const ours = Object.entries(doc.paths).filter(([p]) =>
        p.includes('pooled-funding-monitor'),
      );
      expect(ours.map(([p]) => p).sort()).toEqual(
        [
          `${BASE}/queue`,
          `${BASE}/queue/projects/{projectCode}/results`,
          `${BASE}/summary`,
        ].sort(),
      );
      for (const [, item] of ours) {
        expect(Object.keys(item)).toEqual(['get']);
        expect((item.get as { tags: string[] }).tags).toEqual([
          'Pooled Funding Monitor',
        ]);
        expect((item.get as { security: unknown[] }).security).toBeDefined();
      }
    });
  });

  describe('module registration (KZ-017)', () => {
    it('EntitiesModule imports PooledFundingMonitorModule (metadata; HTTP needs AppModule - real-AppModule proof is pooled-funding-monitor.app-boot.e2e-spec.ts)', () => {
      const imports: unknown[] = Reflect.getMetadata('imports', EntitiesModule);
      expect(imports).toContain(PooledFundingMonitorModule);
    });
  });
});
