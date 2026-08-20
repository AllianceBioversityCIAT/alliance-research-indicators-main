/**
 * [SPEC bilateral/clarisa-fixture-stub] T-05.
 *
 * Exercises `clarisa-stub.router.ts` as a plain Express handler — a real `express()` app with
 * the router mounted, driven with `supertest`. No Nest bootstrap: the router must not depend
 * on the injector (design §2.2), so nothing here constructs one.
 *
 * Covers R-CFS-003 (raw wire shapes, no envelope), R-CFS-004 (default-deny gating across all
 * three flag states, on both routes), and the reversion-challenge items from design §5.3
 * (never throw; explicit JSON 500; no per-request logging).
 */
import express, { type Express } from 'express';
import request from 'supertest';
import * as fs from 'fs';
import { join } from 'path';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { createClarisaStubRouter, __testing } from './clarisa-stub.router';

// Mirrors the router's own `FIXTURE_PATH` (not exported) so the logging assertions below can
// check the path field genuinely appears, without duplicating the router's private constant.
const FIXTURE_PATH = join(
  __dirname,
  'fixtures',
  'clarisa-projects.fixture.json',
);

// The router imports `fs` with `import * as fs from 'fs'` specifically so this spec can
// intercept `readFileSync` (see the router's header comment — this import style IS the
// seam). The Node builtin's own property descriptors are non-configurable, so
// `jest.spyOn(fs, 'readFileSync')` cannot redefine it directly; mocking the whole module and
// wrapping the real implementation by default avoids that while keeping every other `fs`
// export (used transitively by `express`/`supertest`) untouched.
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return { ...actualFs, readFileSync: jest.fn(actualFs.readFileSync) };
});
const mockedReadFileSync = fs.readFileSync as jest.Mock;
const actualReadFileSync = jest.requireActual('fs').readFileSync;

const ENV_VAR = 'ARI_CLARISA_STUB_ENABLED';

/** Builds a fresh Express app with the stub router mounted, under the given flag value. */
function buildApp(flagValue: string | undefined): Express {
  if (flagValue === undefined) {
    delete process.env[ENV_VAR];
  } else {
    process.env[ENV_VAR] = flagValue;
  }
  const app = express();
  app.use(express.json());
  app.use(createClarisaStubRouter());
  return app;
}

const ENVELOPE_KEYS = ['status', 'description', 'errors', 'timestamp', 'path'];

describe('clarisa-stub.router', () => {
  const originalEnvValue = process.env[ENV_VAR];

  beforeEach(() => {
    __testing.resetCache();
    mockedReadFileSync.mockImplementation(actualReadFileSync);
    mockedReadFileSync.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockedReadFileSync.mockImplementation(actualReadFileSync);
    if (originalEnvValue === undefined) {
      delete process.env[ENV_VAR];
    } else {
      process.env[ENV_VAR] = originalEnvValue;
    }
  });

  describe('raw wire shapes (R-CFS-003)', () => {
    let app: Express;

    beforeEach(() => {
      app = buildApp('true');
    });

    it('GET api/projects returns a bare array at the response root', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET api/projects root carries none of the ServerResponseDto envelope keys', async () => {
      const res = await request(app).get('/api/projects');
      for (const key of ENVELOPE_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(res.body, key)).toBe(false);
      }
    });

    it('POST auth/login returns a body whose root has exactly the key access_token, a non-empty string', async () => {
      const res = await request(app).post('/auth/login').send({});
      expect(res.status).toBe(200);
      expect(Object.keys(res.body)).toEqual(['access_token']);
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token.length).toBeGreaterThan(0);
    });

    it('POST auth/login ignores whatever credentials are sent — any body still succeeds', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ login: 'not-checked', password: 'not-checked-either' });
      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeTruthy();
    });
  });

  describe('default-deny flag gating, both routes, all three states (R-CFS-004)', () => {
    const cases: {
      label: string;
      flagValue: string | undefined;
      expectedStatus: number;
    }[] = [
      { label: 'unset', flagValue: undefined, expectedStatus: 404 },
      { label: 'blank', flagValue: '', expectedStatus: 404 },
      { label: 'truthy (true)', flagValue: 'true', expectedStatus: 200 },
      {
        label: 'unrecognised (maybe)',
        flagValue: 'maybe',
        expectedStatus: 404,
      },
    ];

    for (const { label, flagValue, expectedStatus } of cases) {
      it(`GET api/projects — flag ${label} -> exactly ${expectedStatus}`, async () => {
        const app = buildApp(flagValue);
        const res = await request(app).get('/api/projects');
        expect(res.status).toBe(expectedStatus);
      });

      it(`POST auth/login — flag ${label} -> exactly ${expectedStatus}`, async () => {
        const app = buildApp(flagValue);
        const res = await request(app).post('/auth/login').send({});
        expect(res.status).toBe(expectedStatus);
      });
    }

    it('a disabled route never returns 401, 403 or 500 — exactly 404', async () => {
      const app = buildApp(undefined);
      const projectsRes = await request(app).get('/api/projects');
      const loginRes = await request(app).post('/auth/login').send({});
      expect([401, 403, 500]).not.toContain(projectsRes.status);
      expect([401, 403, 500]).not.toContain(loginRes.status);
      expect(projectsRes.status).toBe(404);
      expect(loginRes.status).toBe(404);
    });
  });

  describe('fixture is read once, lazily, and never at all while disabled (hard constraint C)', () => {
    it('does not call fs.readFileSync when the flag is off', async () => {
      const app = buildApp(undefined);
      await request(app).get('/api/projects');
      expect(mockedReadFileSync).not.toHaveBeenCalled();
    });

    it('reads the fixture at most once across multiple enabled requests', async () => {
      const app = buildApp('true');
      await request(app).get('/api/projects');
      await request(app).get('/api/projects');
      await request(app).get('/api/projects');
      expect(mockedReadFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('the handler never throws — an unreadable fixture is an explicit JSON 500 (hard constraint D)', () => {
    it('returns a JSON 500 body, not an HTML page and not an unhandled throw', async () => {
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });
      const app = buildApp('true');

      const res = await request(app).get('/api/projects');

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(typeof res.body).toBe('object');
      expect(res.text).not.toMatch(/<html/i);
    });

    it('also returns a JSON 500 when the fixture parses to something other than an array', async () => {
      mockedReadFileSync.mockImplementation(() => '{"not":"an array"}');
      const app = buildApp('true');

      const res = await request(app).get('/api/projects');

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/json/);
    });
  });

  describe('logging (design §9) — warn at boot-if-enabled, debug on first load, error on failure', () => {
    it('logs a warn line when the router is constructed with the flag already on', () => {
      process.env[ENV_VAR] = 'true';
      const warnSpy = jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);

      createClarisaStubRouter();

      expect(warnSpy).toHaveBeenCalled();
    });

    it('warn line carries the mount prefix and the fixture path (design §9 Fields column)', () => {
      process.env[ENV_VAR] = 'true';
      const warnSpy = jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);

      createClarisaStubRouter();

      const [warnMessage] = warnSpy.mock.calls[0];
      expect(warnMessage).toEqual(expect.stringContaining('/api/clarisa-stub'));
      expect(warnMessage).toEqual(expect.stringContaining(FIXTURE_PATH));
    });

    it('does not log a warn line when the router is constructed with the flag off', () => {
      delete process.env[ENV_VAR];
      const warnSpy = jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);

      createClarisaStubRouter();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('logs debug on first fixture load and error on a failed load', async () => {
      const debugSpy = jest
        .spyOn(LoggerUtil.prototype, '_debug')
        .mockImplementation(() => undefined);
      const app = buildApp('true');
      await request(app).get('/api/projects');
      expect(debugSpy).toHaveBeenCalled();

      __testing.resetCache();
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('boom');
      });
      const errorSpy = jest
        .spyOn(LoggerUtil.prototype, '_error')
        .mockImplementation(() => undefined);
      await request(app).get('/api/projects');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('debug line carries project count, mapping count and fixture byte size (design §9 Fields column)', async () => {
      const debugSpy = jest
        .spyOn(LoggerUtil.prototype, '_debug')
        .mockImplementation(() => undefined);
      const app = buildApp('true');

      await request(app).get('/api/projects');

      const [debugMessage] = debugSpy.mock.calls[0];
      // Three distinct numeric fields — project count, mapping count, fixture byte size — each
      // followed by its own unit word, so the assertion fails if any one of the three is
      // dropped rather than only checking "some numbers appear somewhere".
      expect(debugMessage).toMatch(/\d+ projects/);
      expect(debugMessage).toMatch(/\d+ mappings/);
      expect(debugMessage).toMatch(/\d+ bytes/);
    });

    it('error line carries the fixture path even when the underlying error message does not (design §9 Fields column)', async () => {
      // A bare `new Error('boom')` message has no path in it at all — the case the reviewer
      // flagged as "least inferable" (unlike a real ENOENT, whose message happens to include
      // the path incidentally).
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('boom');
      });
      const app = buildApp('true');
      const errorSpy = jest
        .spyOn(LoggerUtil.prototype, '_error')
        .mockImplementation(() => undefined);

      await request(app).get('/api/projects');

      const [errorMessage] = errorSpy.mock.calls[0];
      expect(errorMessage).toEqual(expect.stringContaining(FIXTURE_PATH));
      expect(errorMessage).toEqual(expect.stringContaining('boom'));
    });
  });
});
