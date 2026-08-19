import { INestApplication } from '@nestjs/common';
import { createClarisaStubRouter } from './clarisa-stub.router';
import { CLARISA_STUB_MOUNT_PREFIX } from './clarisa-stub.config';

/**
 * Mounts the CLARISA fixture stub ahead of the Nest pipeline (DD-1, DD-9, DD-11).
 *
 * [SPEC bilateral/clarisa-fixture-stub] T-06.
 *
 * Deliberately **unconditional** — no `if` wrapper around this call. `createClarisaStubRouter()`
 * always registers both routes; the flag decides per request (404 vs real response) inside the
 * router itself (T-05). A conditional mount is the failure mode DD-9 rules out: `JwtMiddleware`
 * is applied `.forRoutes({ path: '*' })` with no stub entry in `.exclude(...)`, so an unmounted
 * stub path would fall through to it and return 401 — which discloses that a handler exists
 * there (R-CFS-004) — instead of the required 404.
 *
 * Lives here, not in `main.ts` (DD-11): both symbols this function uses — `createClarisaStubRouter`
 * and `CLARISA_STUB_MOUNT_PREFIX` — come from this same stub folder, with zero dependency on
 * anything in `main.ts`. Keeping it in `main.ts` would have made that file importable-with-side-
 * effects (for `test/clarisa-stub.e2e-spec.ts` to reach the exact production function), which in
 * turn required guarding the bottom-of-file `bootstrap()` call behind a `require.main === module`
 * check — an unrecorded widening of the change on the highest-blast-radius file in the package,
 * whose failure mode is *the server silently starts nothing*, with no gate anywhere in this repo
 * to catch a future bundler or ESM migration flipping it. Moving the helper here removes that
 * risk class entirely: `main.ts` needs no guard because it is never imported for its side effects.
 *
 * Caller MUST place this call after `helmet`/`json`/`urlencoded`/`enableCors` and before
 * `listen()` (§2.1, §5.3) — mounting earlier would let the stub bypass those security headers.
 */
export function mountClarisaStub(app: INestApplication): void {
  app.use(CLARISA_STUB_MOUNT_PREFIX, createClarisaStubRouter());
}
