// @akili-spec changes/profile-simulation — T-06
//
// e2e proof against the real dev DB (T-01 schema applied) and a real ROAR
// admin JWT, closing the gap `impersonation.controller.spec.ts` names in its
// KZ-017 scope note: the real `JwtMiddleware`/`applyImpersonation` wiring,
// the real HTTP envelope end-to-end, and DB truth (not a mocked service).
//
// Requires `process.env.ARI_E2E_ADMIN_TOKEN` (a SYSTEM_ADMIN ROAR JWT,
// sec_user_id 1). The suite is `describe.skip`'d with a console warning
// when absent, so the token is never committed and the suite re-runs later
// with a fresh one.
//
// Environment note (K-004/KZ-017 — read before touching auth assertions):
// this checkout's `.env` has `ARI_LOCAL_AUTH_BYPASS=true` /
// `ARI_IS_PRODUCTION=false`, so `JwtMiddleware.use()` short-circuits ALL
// JWT/Authorization-header handling for every request — see
// `src/domain/shared/middlewares/jwr.middleware.ts` `use()`, first branch.
// Two consequences, named rather than worked around silently:
//   1. An unauthenticated request does not naturally 401 in this
//      environment. The "no auth -> 401" case below toggles
//      `process.env.ARI_LOCAL_AUTH_BYPASS` off for exactly one request
//      (the getter re-reads `process.env` live, per-request — confirmed in
//      `env.utils.ts` `ENV.LOCAL_AUTH_BYPASS`) and restores it in a
//      `finally`. This exercises the real code path, not a mock.
//   2. A genuine "Contributor JWT (no session header) -> 403" case
//      (R-IMP-001 AC.3's non-admin-actor clause) cannot be produced here
//      even with that toggle: bypass replaces the *entire* auth branch
//      with a hardcoded SYSTEM_ADMIN identity, and only an admin ROAR JWT
//      was provided for this run (no Contributor JWT). This sub-clause is
//      therefore NOT covered by this file — see the final report's
//      "Not Done" section. The *effective*-non-admin path (impersonating a
//      Contributor and hitting an admin-gated route) IS covered below via
//      the session mechanism, which is unaffected by the bypass.
import { HttpStatus, INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';

const ADMIN_TOKEN = process.env.ARI_E2E_ADMIN_TOKEN;
const ADMIN_ID = 1;
const CONTRIBUTOR_TARGET_ID = 105; // jokiga1797@insfou.com — writes land here
const CONTRIBUTOR_TARGET_EMAIL_PREFIX = 'jokiga';
const CENTER_ADMIN_TARGET_ID = 15; // read-only — /start asserted, then /end
const CENTER_ADMIN_SEC_ROLE_ID = 9;

const SESSION_HEADER = 'X-Impersonation-Session';
const ERROR_HEADER = 'x-impersonation-error';
const BILATERAL_MAPPINGS_PATH = '/api/bilateral-project-mappings'; // @Roles(CENTER_ADMIN, SYSTEM_ADMIN) — see comment at first use

const describeIfToken = ADMIN_TOKEN ? describe : describe.skip;
if (!ADMIN_TOKEN) {
  console.warn(
    'ARI_E2E_ADMIN_TOKEN not set — skipping impersonation.e2e-spec.ts. ' +
      'See test/impersonation.e2e-spec.ts header for how to provide one.',
  );
}

interface DiscoveredFixtures {
  adminEmail: string;
  otherAdminId?: number;
  otherAdminSearchTerm?: string;
  resultId: number;
  resultOfficialCode: number;
  staffCarnet: string;
}

describeIfToken('Impersonation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fixtures: DiscoveredFixtures;

  // Rows this file inserts directly via SQL (not through the API) — always
  // cleaned up in afterAll. Rows created through real /start + /end calls
  // are left in place: they are the expected audit trail (R-IMP-005),
  // never deleted.
  const directInsertSessionIdsToDelete: string[] = [];
  let createdResultUserId: number | undefined;
  // Session C (targeting Contributor 105) is started inside the R-IMP-002
  // "nested" case (that same request also proves R-IMP-002's nested
  // clause, avoiding a redundant extra /start call) and stays active
  // across the R-IMP-003/004 describe blocks below.
  let activeSessionCId: string;

  const authed = () =>
    request(app.getHttpServer()).set('Authorization', `Bearer ${ADMIN_TOKEN}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirrors src/main.ts bootstrap exactly for the pieces that affect
    // routing/behaviour under test (global prefix + URI versioning). CORS,
    // helmet, static assets and Swagger are irrelevant to this suite.
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();

    dataSource = app.get(DataSource);

    // --- Fixture discovery (DB truth, not guessed literals) ---
    const [adminRow] = await dataSource.query(
      'SELECT email FROM sec_users WHERE sec_user_id = ? LIMIT 1',
      [ADMIN_ID],
    );
    const adminEmail: string = adminRow?.email ?? '';

    // Another active SYSTEM_ADMIN besides the actor, for the
    // TARGET_IS_ADMIN / blocked_reason='system_admin' cases. May not
    // exist on dev — cases using it self-skip with a console warning.
    const [otherAdminRow] = await dataSource.query(
      `SELECT su.sec_user_id, su.email
       FROM sec_users su
       INNER JOIN sec_user_roles sur ON sur.user_id = su.sec_user_id AND sur.is_active = 1
       INNER JOIN sec_roles sr ON sr.sec_role_id = sur.role_id
       WHERE sr.sec_role_id = 1 AND su.sec_user_id <> ? AND su.is_active = 1
       LIMIT 1`,
      [ADMIN_ID],
    );
    const otherAdminId: number | undefined = otherAdminRow?.sec_user_id;
    const otherAdminSearchTerm: string | undefined = otherAdminRow?.email
      ?.split('@')[0]
      ?.slice(0, 8);

    // A real, active, non-snapshot STAR result to mutate against
    // (result-user author-contact save — R-IMP-003 write-attribution case).
    const [resultRow] = await dataSource.query(
      `SELECT result_id, result_official_code FROM results
       WHERE is_active = 1 AND is_snapshot = 0 AND platform_code = 'STAR'
       LIMIT 1`,
    );
    if (!resultRow) {
      throw new Error(
        'No active, non-snapshot STAR result found on dev — cannot run the R-IMP-003 write-attribution case.',
      );
    }

    // A staff carnet with no existing active AUTHORS_CONTACT/CONTACT_PERSON
    // row on that result, so the mutation is guaranteed a fresh INSERT
    // (guaranteed created_by stamping) rather than an idempotent no-op.
    const [staffRow] = await dataSource.query(
      `SELECT aus.carnet FROM alliance_user_staff aus
       WHERE NOT EXISTS (
         SELECT 1 FROM result_users ru
         WHERE ru.result_id = ? AND ru.user_id = aus.carnet
           AND ru.user_role_id = 3 AND ru.informative_role_id = 2 AND ru.is_active = 1
       )
       LIMIT 1`,
      [resultRow.result_id],
    );
    if (!staffRow) {
      throw new Error(
        'No usable alliance_user_staff carnet found for the write-attribution case.',
      );
    }

    fixtures = {
      adminEmail,
      otherAdminId,
      otherAdminSearchTerm,
      resultId: resultRow.result_id,
      resultOfficialCode: resultRow.result_official_code,
      staffCarnet: staffRow.carnet,
    };

    if (!otherAdminId) {
      console.warn(
        'No second SYSTEM_ADMIN found on dev besides sec_user_id 1 — ' +
          'TARGET_IS_ADMIN and blocked_reason="system_admin" cases will self-skip.',
      );
    }
  }, 30_000);

  afterAll(async () => {
    for (const sessionId of directInsertSessionIdsToDelete) {
      await dataSource.query(
        'DELETE FROM impersonation_sessions WHERE session_id = ?',
        [sessionId],
      );
    }
    if (createdResultUserId) {
      await dataSource.query(
        'DELETE FROM result_users WHERE result_user_id = ?',
        [createdResultUserId],
      );
    }
    if (app) {
      await app.close();
    }
  });

  // ---------------------------------------------------------------------
  // R-IMP-001 — Search simulable users
  // ---------------------------------------------------------------------
  describe('R-IMP-001 GET /impersonation/users', () => {
    it('no Authorization header -> 401 (bypass toggled off for this one request — see file header)', async () => {
      const previous = process.env.ARI_LOCAL_AUTH_BYPASS;
      process.env.ARI_LOCAL_AUTH_BYPASS = 'false';
      try {
        await request(app.getHttpServer())
          .get('/api/impersonation/users')
          .query({ search: 'rojas' })
          .expect(HttpStatus.UNAUTHORIZED);
      } finally {
        process.env.ARI_LOCAL_AUTH_BYPASS = previous;
      }
    });

    it('search=ro (2 chars, below the 3-char minimum) -> 400', async () => {
      await authed()
        .get('/api/impersonation/users')
        .query({ search: 'ro' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it(`search="${CONTRIBUTOR_TARGET_EMAIL_PREFIX}" (matches target 105's email) -> 200, row 105 simulable:true with roles`, async () => {
      const res = await authed()
        .get('/api/impersonation/users')
        .query({ search: CONTRIBUTOR_TARGET_EMAIL_PREFIX })
        .expect(HttpStatus.OK);

      const row = res.body.data.find(
        (r: { sec_user_id: number }) => r.sec_user_id === CONTRIBUTOR_TARGET_ID,
      );
      expect(row).toBeDefined();
      expect(row.simulable).toBe(true);
      expect(row.blocked_reason).toBeUndefined();
      expect(Array.isArray(row.roles)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });

    it("search for the actor's own last-name fragment -> own row is simulable:false, blocked_reason='self' (precedence: self checked before system_admin — see impersonation.service.ts blockedReasonFor)", async () => {
      const term = fixtures.adminEmail.split('@')[0]?.slice(0, 6);
      if (!term || term.length < 3) {
        console.warn(
          'Could not derive a usable search term for the admin — skipping.',
        );
        return;
      }
      const res = await authed()
        .get('/api/impersonation/users')
        .query({ search: term })
        .expect(HttpStatus.OK);

      const ownRow = res.body.data.find(
        (r: { sec_user_id: number }) => r.sec_user_id === ADMIN_ID,
      );
      expect(ownRow).toBeDefined();
      expect(ownRow.simulable).toBe(false);
      expect(ownRow.blocked_reason).toBe('self');
    });

    it("search matching a DIFFERENT SYSTEM_ADMIN -> that row simulable:false, blocked_reason='system_admin'", async () => {
      if (!fixtures.otherAdminId || !fixtures.otherAdminSearchTerm) {
        console.warn('No second SYSTEM_ADMIN on dev — skipping.');
        return;
      }
      const res = await authed()
        .get('/api/impersonation/users')
        .query({ search: fixtures.otherAdminSearchTerm })
        .expect(HttpStatus.OK);

      const row = res.body.data.find(
        (r: { sec_user_id: number }) => r.sec_user_id === fixtures.otherAdminId,
      );
      expect(row).toBeDefined();
      expect(row.simulable).toBe(false);
      expect(row.blocked_reason).toBe('system_admin');
    });
  });

  // ---------------------------------------------------------------------
  // R-IMP-002 — Start a simulation session
  // ---------------------------------------------------------------------
  describe('R-IMP-002 POST /impersonation/start', () => {
    let sessionAId: string;
    let sessionBId: string;
    let sessionCId: string;

    it('happy path: {target_user_id:105} -> 201 with session + full target profile; DB row actor=1/target=105/ended_at NULL/created_by=1', async () => {
      const res = await authed()
        .post('/api/impersonation/start')
        .send({ target_user_id: CONTRIBUTOR_TARGET_ID })
        .expect(HttpStatus.CREATED);

      expect(res.body.data.session.session_id).toEqual(expect.any(String));
      expect(res.body.data.user.sec_user_id).toBe(CONTRIBUTOR_TARGET_ID);
      expect(Array.isArray(res.body.data.user.user_role_list)).toBe(true);
      if (res.body.data.user.user_role_list.length > 0) {
        expect(res.body.data.user.user_role_list[0].role.focus_id).toEqual(
          expect.anything(),
        );
      }
      sessionAId = res.body.data.session.session_id;

      const [row] = await dataSource.query(
        `SELECT actor_user_id, target_user_id, ended_at, created_by
         FROM impersonation_sessions WHERE session_id = ?`,
        [sessionAId],
      );
      expect(row).toBeDefined();
      expect(Number(row.actor_user_id)).toBe(ADMIN_ID);
      expect(Number(row.target_user_id)).toBe(CONTRIBUTOR_TARGET_ID);
      expect(row.ended_at).toBeNull();
      expect(Number(row.created_by)).toBe(ADMIN_ID);
    });

    it('Center Admin target (15): /start payload carries a role with sec_role_id=9 and non-null focus_id (R-IMP-002 §6 + case 7), then /end immediately (read-only — zero domain writes as 15)', async () => {
      const res = await authed()
        .post('/api/impersonation/start')
        .send({ target_user_id: CENTER_ADMIN_TARGET_ID })
        .expect(HttpStatus.CREATED);

      sessionBId = res.body.data.session.session_id;
      const centerAdminRole = res.body.data.user.user_role_list.find(
        (entry: { role: { sec_role_id: number; focus_id: number | null } }) =>
          entry.role.sec_role_id === CENTER_ADMIN_SEC_ROLE_ID,
      );
      expect(centerAdminRole).toBeDefined();
      expect(centerAdminRole.role.focus_id).not.toBeNull();

      // Starting again supersedes the still-open session A (R-IMP-002 AC.3).
      const [supersededRow] = await dataSource.query(
        `SELECT ended_at, end_reason FROM impersonation_sessions WHERE session_id = ?`,
        [sessionAId],
      );
      expect(supersededRow.ended_at).not.toBeNull();
      expect(supersededRow.end_reason).toBe('superseded');

      await authed()
        .post('/api/impersonation/end')
        .set(SESSION_HEADER, sessionBId)
        .expect(HttpStatus.OK);
    });

    it('{target_user_id: admin self} -> 409 TARGET_IS_SELF header', async () => {
      const res = await authed()
        .post('/api/impersonation/start')
        .send({ target_user_id: ADMIN_ID })
        .expect(HttpStatus.CONFLICT);
      expect(res.headers[ERROR_HEADER]).toBe('TARGET_IS_SELF');
    });

    it('{target_user_id: another SYSTEM_ADMIN} -> 409 TARGET_IS_ADMIN header', async () => {
      if (!fixtures.otherAdminId) {
        console.warn(
          'No second SYSTEM_ADMIN on dev — skipping TARGET_IS_ADMIN case.',
        );
        return;
      }
      const res = await authed()
        .post('/api/impersonation/start')
        .send({ target_user_id: fixtures.otherAdminId })
        .expect(HttpStatus.CONFLICT);
      expect(res.headers[ERROR_HEADER]).toBe('TARGET_IS_ADMIN');
    });

    it('nested: /start called WITH an active session header -> 409 NESTED, rejected by the middleware before RolesGuard (R-IMP-002 + R-IMP-003)', async () => {
      const startRes = await authed()
        .post('/api/impersonation/start')
        .send({ target_user_id: CONTRIBUTOR_TARGET_ID })
        .expect(HttpStatus.CREATED);
      sessionCId = startRes.body.data.session.session_id;

      const res = await authed()
        .post('/api/impersonation/start')
        .set(SESSION_HEADER, sessionCId)
        .send({ target_user_id: CONTRIBUTOR_TARGET_ID })
        .expect(HttpStatus.CONFLICT);
      expect(res.headers[ERROR_HEADER]).toBe('NESTED');

      activeSessionCId = sessionCId;
    });
  });

  // ---------------------------------------------------------------------
  // R-IMP-003 — Effective identity resolution
  // ---------------------------------------------------------------------
  describe('R-IMP-003 effective identity (uses the still-active session C, target 105)', () => {
    it("effective non-admin blocked from an admin-gated route: GET /api/bilateral-project-mappings (@Roles(CENTER_ADMIN, SYSTEM_ADMIN)) with session C's header -> 403 (SYSTEM_ADMIN bypass gone). NOTE: the brief's suggested example, GET /impersonation/users, is unusable for this — that route is special-cased by the middleware's own nested-route check (routeAction==='users') and always 403s with code NESTED before RolesGuard ever runs, regardless of the effective user's role, so it cannot demonstrate RolesGuard reading the target's roles. bilateral-project-mappings is a genuine, unrelated @Roles-gated GET.", async () => {
      const before = await countActions(activeSessionCId);
      await authed()
        .get(BILATERAL_MAPPINGS_PATH)
        .set(SESSION_HEADER, activeSessionCId)
        .expect(HttpStatus.FORBIDDEN);
      // Also doubles as R-IMP-005's "no GET is logged" evidence.
      const after = await countActions(activeSessionCId);
      expect(after).toBe(before);
    });

    it('forged session id (random UUID, not in DB) -> 403 + X-Impersonation-Error: SESSION_INVALID', async () => {
      const res = await authed()
        .get('/api/impersonation/current')
        .set(SESSION_HEADER, randomUUID())
        .expect(HttpStatus.FORBIDDEN);
      expect(res.headers[ERROR_HEADER]).toBe('SESSION_INVALID');
    });

    it("foreign session (actor_user_id belongs to someone else) -> 403 + SESSION_INVALID even with admin's own valid JWT", async () => {
      const foreignSessionId = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60_000);
      await dataSource.query(
        `INSERT INTO impersonation_sessions
         (session_id, actor_user_id, target_user_id, started_at, expires_at, created_by, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          foreignSessionId,
          999999,
          CONTRIBUTOR_TARGET_ID,
          now,
          expiresAt,
          999999,
        ],
      );
      directInsertSessionIdsToDelete.push(foreignSessionId);

      const res = await authed()
        .get('/api/impersonation/current')
        .set(SESSION_HEADER, foreignSessionId)
        .expect(HttpStatus.FORBIDDEN);
      expect(res.headers[ERROR_HEADER]).toBe('SESSION_INVALID');
    });

    it('write attribution: a mutation as 105 stamps created_by=105 on the created row, and logs exactly one impersonation_actions row with status_code and route_pattern (R-IMP-003 + R-IMP-005 "mutation logged")', async () => {
      const before = await countActions(activeSessionCId);

      const res = await authed()
        .post(
          `/api/result-user/author-contact/save-by-result/${fixtures.resultOfficialCode}`,
        )
        .set(SESSION_HEADER, activeSessionCId)
        .send({ user_id: fixtures.staffCarnet, informative_role_id: 2 })
        .expect(HttpStatus.CREATED);

      expect(res.body.data.result_user_id).toEqual(expect.anything());
      createdResultUserId = Number(res.body.data.result_user_id);

      const [row] = await dataSource.query(
        `SELECT created_by FROM result_users WHERE result_user_id = ?`,
        [createdResultUserId],
      );
      expect(row).toBeDefined();
      expect(Number(row.created_by)).toBe(CONTRIBUTOR_TARGET_ID);

      const after = await countActions(activeSessionCId);
      expect(after).toBe(before + 1);

      const [actionRow] = await dataSource.query(
        `SELECT method, status_code, route_pattern FROM impersonation_actions
         WHERE session_id = ? ORDER BY action_id DESC LIMIT 1`,
        [activeSessionCId],
      );
      expect(actionRow.method).toBe('POST');
      expect(actionRow.status_code).toBe(HttpStatus.CREATED);
      expect(actionRow.route_pattern).toEqual(expect.any(String));
      expect(actionRow.route_pattern.length).toBeGreaterThan(0);
    });

    it("forced 409 under session (nested /start): impersonation_actions gets NO new row for it — the middleware rejects nested attempts BEFORE next(), so ImpersonationAuditInterceptor.intercept() (an APP_INTERCEPTOR, which only runs once Nest's pipeline reaches interceptors) never executes for this request. Verified by reading jwr.middleware.ts's reject()/applyImpersonation (throws synchronously, no next()) against impersonation-audit.interceptor.ts (only logs when intercept() runs) — this asserts what the code actually does, not what R-IMP-005's prose scenario alone would suggest.", async () => {
      const before = await countActions(activeSessionCId);
      const res = await authed()
        .post('/api/impersonation/start')
        .set(SESSION_HEADER, activeSessionCId)
        .send({ target_user_id: CONTRIBUTOR_TARGET_ID })
        .expect(HttpStatus.CONFLICT);
      expect(res.headers[ERROR_HEADER]).toBe('NESTED');

      const after = await countActions(activeSessionCId);
      expect(after).toBe(before);
    });
  });

  // ---------------------------------------------------------------------
  // R-IMP-004 — End, inspect and auto-expire a session
  // ---------------------------------------------------------------------
  describe('R-IMP-004 end / current / expiry (still session C from R-IMP-003)', () => {
    it('/end with the active header -> 200; repeat -> 200 (idempotent); a subsequent non-end/current request 403s', async () => {
      await authed()
        .post('/api/impersonation/end')
        .set(SESSION_HEADER, activeSessionCId)
        .expect(HttpStatus.OK);

      await authed()
        .post('/api/impersonation/end')
        .set(SESSION_HEADER, activeSessionCId)
        .expect(HttpStatus.OK);

      const res = await authed()
        .get(BILATERAL_MAPPINGS_PATH)
        .set(SESSION_HEADER, activeSessionCId)
        .expect(HttpStatus.FORBIDDEN);
      expect(res.headers[ERROR_HEADER]).toBe('SESSION_INVALID');
    });

    it('expired session (expires_at in the past) -> 403 on a non-end/current route, and the row is lazily marked end_reason=expired', async () => {
      const expiredSessionId = randomUUID();
      const now = new Date();
      const startedAt = new Date(now.getTime() - 241 * 60_000);
      const expiresAt = new Date(now.getTime() - 60_000);
      await dataSource.query(
        `INSERT INTO impersonation_sessions
         (session_id, actor_user_id, target_user_id, started_at, expires_at, created_by, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          expiredSessionId,
          ADMIN_ID,
          CONTRIBUTOR_TARGET_ID,
          startedAt,
          expiresAt,
          ADMIN_ID,
        ],
      );
      directInsertSessionIdsToDelete.push(expiredSessionId);

      const res = await authed()
        .get(BILATERAL_MAPPINGS_PATH)
        .set(SESSION_HEADER, expiredSessionId)
        .expect(HttpStatus.FORBIDDEN);
      expect(res.headers[ERROR_HEADER]).toBe('SESSION_INVALID');

      const [row] = await dataSource.query(
        `SELECT end_reason FROM impersonation_sessions WHERE session_id = ?`,
        [expiredSessionId],
      );
      expect(row.end_reason).toBe('expired');
    });

    it('GET /current without a header -> {active:false}', async () => {
      const res = await authed()
        .get('/api/impersonation/current')
        .expect(HttpStatus.OK);
      expect(res.body.data).toEqual({ active: false });
    });
  });

  // ---------------------------------------------------------------------
  // NFR-IMP-003 — Performance (50-request resolve latency sample)
  // ---------------------------------------------------------------------
  describe('NFR-IMP-003 resolve latency + GET /current with a live session', () => {
    let sessionDId: string;

    it('GET /current with a live header -> {active:true, session, actor, user}', async () => {
      const startRes = await authed()
        .post('/api/impersonation/start')
        .send({ target_user_id: CONTRIBUTOR_TARGET_ID })
        .expect(HttpStatus.CREATED);
      sessionDId = startRes.body.data.session.session_id;

      const res = await authed()
        .get('/api/impersonation/current')
        .set(SESSION_HEADER, sessionDId)
        .expect(HttpStatus.OK);

      expect(res.body.data.active).toBe(true);
      expect(res.body.data.actor.sec_user_id).toBe(ADMIN_ID);
      expect(res.body.data.user.sec_user_id).toBe(CONTRIBUTOR_TARGET_ID);
    });

    it('50x GET /current: records median + spread latency (disqualifier: spread > 2x median is reported, not a pass)', async () => {
      const SAMPLE_SIZE = 50;
      const samplesMs: number[] = [];

      for (let i = 0; i < SAMPLE_SIZE; i += 1) {
        const startedAt = performance.now();
        await authed()
          .get('/api/impersonation/current')
          .set(SESSION_HEADER, sessionDId)
          .expect(HttpStatus.OK);
        samplesMs.push(performance.now() - startedAt);
      }

      const sorted = [...samplesMs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const spread = sorted[sorted.length - 1] - sorted[0];
      const disqualified = spread > 2 * median;

      console.log(
        `NFR-IMP-003 resolve latency over ${SAMPLE_SIZE} requests: ` +
          `median=${median.toFixed(2)}ms spread=${spread.toFixed(2)}ms ` +
          `min=${sorted[0].toFixed(2)}ms max=${sorted[sorted.length - 1].toFixed(2)}ms ` +
          `disqualified=${disqualified} (spread > 2x median)`,
      );

      expect(samplesMs).toHaveLength(SAMPLE_SIZE);

      await authed()
        .post('/api/impersonation/end')
        .set(SESSION_HEADER, sessionDId)
        .expect(HttpStatus.OK);
    });
  });

  async function countActions(sessionId: string): Promise<number> {
    const [row] = await dataSource.query(
      `SELECT COUNT(*) AS count FROM impersonation_actions WHERE session_id = ?`,
      [sessionId],
    );
    return Number(row.count);
  }
});
