/**
 * Stub router — two plain Express handlers that impersonate CLARISA's raw wire shapes.
 *
 * [SPEC bilateral/clarisa-fixture-stub] T-05.
 *
 * Deliberately NOT Nest: no `@Controller`, no `@Injectable`, no DI. `Clarisa.get()` and
 * `Clarisa.getToken()` are reached through `ARI_CLARISA_HOST`, an ordinary HTTP call — this
 * router only needs to answer that call in CLARISA's own shape, and it must be mountable
 * with `app.use(...)` in `main.ts` **before** the Nest pipeline exists (DD-1). Bringing in
 * Nest DI here would reintroduce the exact dependency this design removes.
 *
 * Why raw shapes matter: every Nest response passes through the global `ResponseInterceptor`,
 * which rewrites anything it doesn't recognise into `{"data":[],"status":200,…}` — measured
 * against both a raw array and a raw `{ access_token }` object (M-16). Served ahead of the
 * Nest pipeline, this router never reaches that interceptor, so both routes below return
 * CLARISA's bare wire shapes instead.
 *
 * No `@ApiTags` / Swagger here — deliberate (DD-8). This stub impersonates CLARISA; it is not
 * ARI API surface, and documenting it would invite a real consumer to depend on it.
 *
 * Removal condition (verbatim — grepped in three places; do not paraphrase or wrap it):
 * when CLARISA publishes external_code and phase-2026 data, unset the flag and delete the stub, fixture, dictionary, reference capture and converter; do not maintain them
 */
import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import { join } from 'path';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import {
  CLARISA_STUB_MOUNT_PREFIX,
  isClarisaStubEnabled,
} from './clarisa-stub.config';

const logger = new LoggerUtil({ name: 'clarisa-stub' });

const FIXTURE_PATH = join(
  __dirname,
  'fixtures',
  'clarisa-projects.fixture.json',
);

// The token value itself carries no meaning — `POST auth/login` ignores credentials
// entirely (not validated, not compared, not logged), so any non-empty string satisfies
// R-CFS-003 AC.3.
const STUB_ACCESS_TOKEN = 'clarisa-stub-token';

/**
 * Module-scope cache (task hard constraint C). Populated at most once, on the first
 * successful `GET api/projects` request, and never touched at all while the flag is off —
 * `handleProjects` returns before this function is ever called in that case.
 */
let cachedProjects: unknown[] | null = null;

/**
 * Reads and parses the fixture exactly once. Uses `fs.readFileSync` (via the `import * as fs`
 * form, not a destructured named import) so the router spec can `jest.spyOn(fs, 'readFileSync')`
 * to prove both the no-read-when-disabled property (R-CFS-004 AC.4) and the unreadable-fixture
 * path (hard constraint D) without any test-only branch in production code — this import
 * style *is* the seam.
 *
 * Never called from a context that lets it throw uncaught: both callers below wrap it in
 * try/catch, because `GlobalExceptions` is not in this request path (design §5.3) and an
 * uncaught throw here would fall through to Express's default HTML error page.
 */
function loadProjectsOnce(): unknown[] {
  if (cachedProjects !== null) {
    return cachedProjects;
  }

  const raw = fs.readFileSync(FIXTURE_PATH, 'utf-8');
  const byteSize = Buffer.byteLength(raw, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Fixture at ${FIXTURE_PATH} did not parse as an array (got ${typeof parsed}).`,
    );
  }

  const mappingCount = parsed.reduce((total: number, project) => {
    const mappings =
      project !== null && typeof project === 'object'
        ? (project as { project_mappings_array?: unknown })
            .project_mappings_array
        : undefined;
    return total + (Array.isArray(mappings) ? mappings.length : 0);
  }, 0);

  cachedProjects = parsed;
  logger._debug(
    `Fixture loaded: ${parsed.length} projects, ${mappingCount} mappings, ${byteSize} bytes (first load).`,
  );
  return cachedProjects;
}

/**
 * `GET api/projects` — bare JSON array at the response root, never `{ data: [...] }` or any
 * other envelope shape (R-CFS-003 AC.1–2). No per-request logging on the success path —
 * this is a hot path and every other route already gets a request log line from
 * `LoggingInterceptor`; that interceptor is not reached here, and deliberately not replaced
 * (design §9, reversion challenge #2).
 */
function handleProjects(_req: Request, res: Response): void {
  if (!isClarisaStubEnabled()) {
    // Exactly 404, never 401/403/500 — those would disclose that a handler exists here
    // (R-CFS-004 scenario "Production is unaffected by the merged code").
    res.status(404).end();
    return;
  }

  try {
    const projects = loadProjectsOnce();
    res.status(200).json(projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger._error(
      `Failed to load/parse the fixture at ${FIXTURE_PATH}: ${message}`,
    );
    // Explicit JSON 500 — GlobalExceptions is not in this path (design §5.3), so an
    // uncaught throw here would otherwise return Express's default HTML error page, which
    // `Clarisa.get()` would then wrap in a BadRequestException whose message is HTML.
    res.status(500).json({ error: 'clarisa_stub_fixture_unavailable' });
  }
}

/**
 * `POST auth/login` — bare `{ access_token }` at the response root (R-CFS-003 AC.3).
 * Credentials are ignored entirely: not read off the body, not validated, not compared,
 * not logged.
 */
function handleLogin(_req: Request, res: Response): void {
  if (!isClarisaStubEnabled()) {
    res.status(404).end();
    return;
  }
  res.status(200).json({ access_token: STUB_ACCESS_TOKEN });
}

/**
 * Builds a fresh Express `Router` exposing the two stub routes, relative to whatever prefix
 * the caller mounts it under (T-06 mounts it at `CLARISA_STUB_MOUNT_PREFIX`, ahead of the
 * Nest pipeline). Both routes are always registered — routing table shape does not depend on
 * the flag (NFR-CFS-004); the flag only decides whether each handler answers or 404s.
 *
 * Logs a single `warn` line here, at router-construction time, if the flag happens to be on
 * — deliberately louder than the `debug` used for fixture loading, so a dev environment left
 * switched on is visible in the log without waiting for the first request (design §9).
 */
export function createClarisaStubRouter(): Router {
  if (isClarisaStubEnabled()) {
    logger._warn(
      `CLARISA stub is ENABLED and mounted at ${CLARISA_STUB_MOUNT_PREFIX} (fixture: ${FIXTURE_PATH}) — unauthenticated by construction (R-CFS-004/R-CFS-006). Do not leave this on outside local development.`,
    );
  }

  const router = Router();
  router.post('/auth/login', handleLogin);
  router.get('/api/projects', handleProjects);
  return router;
}

/**
 * Test-only escape hatch to reset the module-scope cache between spec cases. Not imported by
 * any production code path.
 */
export const __testing = {
  resetCache(): void {
    cachedProjects = null;
  },
};
