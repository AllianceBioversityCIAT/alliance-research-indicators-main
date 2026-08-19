/**
 * [SPEC bilateral/clarisa-fixture-stub] T-06.
 *
 * Proves the ONE property no unit test can see: that a bootstrap-registered mount beats
 * `JwtMiddleware` in ordering, that a sibling path sharing the mount prefix does not over-match
 * into the stub, and that every other route is unaffected (R-CFS-006, NFR-CFS-002, NFR-CFS-004).
 *
 * `test/app.e2e-spec.ts`'s pattern — `Test.createTestingModule({ imports: [AppModule] })` +
 * `createNestApplication()` + `app.init()` — never executes `src/main.ts`'s `bootstrap()`
 * function, so a copy of the mount call written directly in this file would test its own
 * duplicate rather than falsify the real one (KZ-001). Instead this spec imports and calls the
 * exact same `mountClarisaStub` helper `main.ts` calls (now living in `clarisa-stub.mount.ts`,
 * DD-11), on this test's own Nest application, before `app.init()` — the same production code,
 * not a re-implementation.
 *
 * LIMITATION (state honestly, per the task brief): this proves the MECHANISM — a mount placed
 * after `helmet` carries helmet's headers, `JwtMiddleware` never runs for a path a
 * bootstrap-registered mount answers, a sibling substring does not match. It does NOT prove
 * that `src/main.ts`'s `httpservice()` actually calls `mountClarisaStub` at the right point
 * relative to its own `helmet`/`json`/`urlencoded`/`enableCors` calls — this suite builds its
 * own `TestingModule` via `Test.createTestingModule({ imports: [AppModule] }).compile()`, which
 * never runs `httpservice()` itself. That ordering remains a code-reading check (see
 * `src/main.ts`, `mountClarisaStub`'s doc comment in `clarisa-stub.mount.ts`, and the design's
 * DD-9 / reversion-challenge #3 entries).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import request from 'supertest';
import helmet from 'helmet';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';
import { mountClarisaStub } from '../src/domain/tools/clarisa/stub/clarisa-stub.mount';
import { CLARISA_STUB_MOUNT_PREFIX } from '../src/domain/tools/clarisa/stub/clarisa-stub.config';
import { __testing as stubTesting } from '../src/domain/tools/clarisa/stub/clarisa-stub.router';
import { ClientGateway } from '../src/domain/tools/socket/client.gateway';

// Same wrap-the-real-implementation pattern as `clarisa-stub.router.spec.ts` (T-05): Node's own
// `fs` property descriptors are non-configurable, so a plain `jest.spyOn(fs, 'readFileSync')`
// cannot intercept it. Wrapping — rather than replacing — keeps every real read this heavy e2e
// boot needs (dotenv, TypeORM, static assets, …) working exactly as before; it only lets the
// "flag unset -> no fixture read" case below observe whether the fixture path specifically was
// ever opened.
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return { ...actualFs, readFileSync: jest.fn(actualFs.readFileSync) };
});
const mockedReadFileSync = fs.readFileSync as jest.Mock;

// Mirrors the router's own private `FIXTURE_PATH` — computed from ITS `__dirname` under `src/`,
// not this spec's `test/` directory — so the "no read" assertion below checks the right file.
const FIXTURE_PATH = join(
  __dirname,
  '..',
  'src',
  'domain',
  'tools',
  'clarisa',
  'stub',
  'fixtures',
  'clarisa-projects.fixture.json',
);

const ENVELOPE_KEYS = ['status', 'description', 'errors', 'timestamp', 'path'];

// Boot connects to the real (remote, shared) Dev MySQL — can be slow (Leader-verified: safe,
// `synchronize: false` / `migrationsRun: false`, read-only for this suite's purposes).
jest.setTimeout(120000);

describe('CLARISA stub bootstrap mount (e2e) [SPEC bilateral/clarisa-fixture-stub T-06]', () => {
  let app: INestApplication;
  const originalStubFlag = process.env.ARI_CLARISA_STUB_ENABLED;
  const originalAuthBypass = process.env.ARI_LOCAL_AUTH_BYPASS;

  beforeAll(async () => {
    process.env.ARI_CLARISA_STUB_ENABLED = 'true';
    // This checkout's .env sets ARI_LOCAL_AUTH_BYPASS=true for local dev convenience. Left on,
    // JwtMiddleware injects a mock SYSTEM_ADMIN user for EVERY unauthenticated request, and the
    // 401 checks below — which exist specifically to prove JwtMiddleware still runs normally
    // for routes the stub mount does not touch — would pass for the wrong reason (or not at
    // all). Forced off for the lifetime of this suite only, restored in afterAll.
    process.env.ARI_LOCAL_AUTH_BYPASS = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    // Reproduces main.ts's bootstrap order for the one property this suite can observe
    // end-to-end: helmet applied, THEN the real `mountClarisaStub` helper called — the same
    // function `main.ts` calls, not a re-implementation of its body.
    app.use(helmet());
    mountClarisaStub(app);
    await app.init();
  });

  afterAll(async () => {
    if (originalStubFlag === undefined) {
      delete process.env.ARI_CLARISA_STUB_ENABLED;
    } else {
      process.env.ARI_CLARISA_STUB_ENABLED = originalStubFlag;
    }
    if (originalAuthBypass === undefined) {
      delete process.env.ARI_LOCAL_AUTH_BYPASS;
    } else {
      process.env.ARI_LOCAL_AUTH_BYPASS = originalAuthBypass;
    }

    // `ClientGateway.onModuleInit()` (src/domain/tools/socket/client.gateway.ts, pre-existing,
    // outside this task's scope) opens a `socket.io-client` connection to `ROAR_MANAGEMENT_HOST`
    // and implements no `OnModuleDestroy`/`OnApplicationShutdown` hook, so `app.close()` below
    // never tells it to disconnect. Against this checkout's `.env`
    // (`ARI_ROAR_MANAGEMENT_HOST=http://localhost:3002`, nothing listening), the client's
    // reconnection timers keep Node's event loop alive indefinitely — confirmed with
    // `--detectOpenHandles`: without this, a plain `test:e2e` run for this suite never exits on
    // its own (killed at 18m40s in a prior run). Reached only via the module's public DI token —
    // no production file changes — and disconnected before `app.close()` so it cannot still be
    // reconnecting while other providers tear down.
    app.get(ClientGateway)['socket']?.disconnect();

    await app.close();
  });

  it('flag enabled: GET .../api/projects with no Authorization header returns 200 and a bare 198-length array (R-CFS-006 AC.4, R-CFS-003 AC.1-2)', async () => {
    const res = await request(app.getHttpServer()).get(
      `${CLARISA_STUB_MOUNT_PREFIX}/api/projects`,
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(198);
    for (const key of ENVELOPE_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(res.body, key)).toBe(false);
    }
  });

  it('positive control: the previous request actually went through the fixture read (proves the fs mock below is intercepting, not silently missing)', () => {
    // Exists because a negative assertion alone is not evidence (K-004): the flag-off test
    // below asserts `fixtureReads` has length 0. If `jest.mock('fs', ...)` above ever failed
    // to intercept the router's `fs.readFileSync` — e.g. a refactor changes the import style
    // away from the `import * as fs` seam this mock depends on — that assertion would still
    // pass, for the wrong reason: an empty call list either way. This control proves the mock
    // is live by checking the read DID happen for the enabled-flag request just above, which
    // triggered the router's lazy `loadProjectsOnce()` load.
    const fixtureReads = mockedReadFileSync.mock.calls.filter(
      ([path]) => path === FIXTURE_PATH,
    );
    expect(fixtureReads.length).toBeGreaterThan(0);
  });

  it('a sibling path sharing the prefix substring does not reach the stub and is handled by the normal pipeline (R-CFS-006 AC.3, scenario "does not over-match")', async () => {
    const res = await request(app.getHttpServer()).get(
      `${CLARISA_STUB_MOUNT_PREFIX}x/api/projects`,
    );

    expect(res.status).toBe(401);
    expect(Array.isArray(res.body)).toBe(false);
  });

  it('an unrelated protected route still returns 401 without a JWT (R-CFS-006 AC.2)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/definitely-not-a-clarisa-stub-route',
    );

    expect(res.status).toBe(401);
  });

  it('an unrelated route still returns the full ServerResponseDto envelope (R-CFS-003 AC.4)', async () => {
    const res = await request(app.getHttpServer()).get('/');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(res.body.data.message).toBe('Welcome to the Aliance API');
  });

  it('the stub response carries the helmet security headers, proving the mount sits after helmet (falsifying input #2 target)', async () => {
    const res = await request(app.getHttpServer()).get(
      `${CLARISA_STUB_MOUNT_PREFIX}/api/projects`,
    );

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('flag unset: both stub routes 404, and no fixture read occurs (NFR-CFS-004, R-CFS-004 AC.1/AC.4)', async () => {
    stubTesting.resetCache();
    mockedReadFileSync.mockClear();
    delete process.env.ARI_CLARISA_STUB_ENABLED;

    const projectsRes = await request(app.getHttpServer()).get(
      `${CLARISA_STUB_MOUNT_PREFIX}/api/projects`,
    );
    const loginRes = await request(app.getHttpServer()).post(
      `${CLARISA_STUB_MOUNT_PREFIX}/auth/login`,
    );

    expect(projectsRes.status).toBe(404);
    expect(loginRes.status).toBe(404);
    const fixtureReads = mockedReadFileSync.mock.calls.filter(
      ([path]) => path === FIXTURE_PATH,
    );
    expect(fixtureReads).toHaveLength(0);

    process.env.ARI_CLARISA_STUB_ENABLED = 'true';
  });
});
