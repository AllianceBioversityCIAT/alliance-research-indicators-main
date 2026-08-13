# Proposal — Contain the unauthenticated `/admin` data exposure

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/admin-ssr-data-exposure` |
| **Slug** | `admin-ssr-data-exposure` — derived from the free-text argument; the full text is proposal context, not a directory name |
| **Type** | **Bug** (security defect) |
| **Approval Mode** | `gated` (default — no explicit end-to-end mandate given) |
| **Depends on** | none |
| **Parallel-safe** | **no** — shares `src/admin/` with `changes/admin-panel-auth`, which must land after this |
| **Chunk** | 1 of 2 — containment. Chunk 2 is [`changes/admin-panel-auth`](../../changes/admin-panel-auth/proposal.md) |
| **Source** | `docs/specs/drift-report.md` 🔴 High finding · OI-4 in `docs/infrastructure.md` |
| **Date** | 2026-08-03 |

## Intent

Stop `/admin` from serving live production data to unauthenticated callers, using the smallest change that cannot regress a working feature.

## Problem / Current Behavior

`GET /admin/bilateral-project-mappings` returns the first 20 rows of live pool-funding mapping data to anyone who can reach the host. It is **reachable in production** (confirmed by the product owner).

The route is unauthenticated by construction, not by accident:

| Layer | State |
| --- | --- |
| `app.module.ts:86` | `/admin(.*)` excluded from `JwtMiddleware` |
| `AdminController` | no `@UseGuards`, no `@Roles` |
| `AdminService.listBilateralProjectMappings` | calls `BilateralProjectMappingService.list()` **directly** — never traverses the guarded `/api` layer |
| `AdminGuard` (required by TRD §4.1) | **does not exist anywhere in `src/`** |

**The data is real.** The `bilateral_project_mapping` table drives pool-funding contributor computation at read time on results — per the shipped spec `archive/2026-07-02-bilateral-module--mapping-drives-pool-funding-tag` — and is read by `pool-funding.util.ts`, `result.repository.ts`, `bilateral.service.ts`, and `clarisa-projects.controller.ts`. This route is the exception to the panel's otherwise-placeholder nature: `dashboard`, `users`, and `settings` return hardcoded example data (`John Doe`, `// Example data - replace with real database queries`) and expose nothing.

**The code comment is wrong.** `admin.controller.ts:74-76` asserts *"Auth + role gating is enforced server-side by RolesGuard on `/api/bilateral-project-mappings`; this SSR route is only the shell."* That is false for the first paint — the SSR path bypasses the API layer entirely, so `RolesGuard` never runs.

## Proposed Outcome

- No `/admin` route returns real data to an unauthenticated caller.
- `/admin` is unreachable in deployed environments until chunk 2 delivers real authentication.
- A regression test fails on today's code and passes after the fix.
- The false comment is corrected.

## Scope

| In | Out |
| --- | --- |
| Remove the SSR data pre-fetch from `AdminController.bilateralProjectMappings` | Building the admin authentication mechanism (chunk 2) |
| Gate `/admin*` routes off in deployed environments behind an env flag | Fixing the panel's broken client-side `/api` calls (chunk 2) |
| Regression test: unauthenticated `/admin/bilateral-project-mappings` returns no mapping data | Any change to `/api/bilateral-project-mappings` (already correctly guarded) |
| Correct the misleading comment at `admin.controller.ts:74-76` | Touching the placeholder routes' stub data |
| Update OI-4 in `docs/infrastructure.md` to reflect containment | The `IS_PRODUCTION`/staging bypass nuance (separate, see Risks) |

## Non-Goals

- Making the admin panel functional. It is not functional today (see Bug Diagnosis) and this chunk does not change that.
- Introducing cookies, sessions, or `cookie-parser`. That is chunk 2's design decision.
- Removing the `/admin` exclusion from `JwtMiddleware` — a top-level browser navigation cannot send a Bearer header, so removing the exclusion without chunk 2's login flow would simply 401 the shell.

## Affected Users, Systems, And Specs

| Affected | Detail |
| --- | --- |
| **Users** | None negatively — the panel's interactive features are already broken. Any operator relying on the SSR first paint as a read-only view loses it. |
| **Code** | `src/admin/controllers/admin.controller.ts`, `src/admin/services/admin.service.ts`, `src/app.module.ts`, `src/domain/shared/utils/env.utils.ts` (new flag) |
| **Specs** | `docs/trd/trd.md` §4.1/§10 (AdminGuard), `docs/infrastructure.md` OI-4, `docs/specs/drift-report.md` |
| **Not affected** | `/api/bilateral-project-mappings` — correctly guarded with `@UseGuards(RolesGuard)` + `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` |

## Visual Reference

- **Source:** None
- **Location:** n/a
- **Notes:** Backend-only containment. The only user-visible change is that `/admin` stops responding in deployed environments; no new screen is designed here. Chunk 2 owns any login/denied UI.

## Bug Diagnosis

### Observed Symptom

An unauthenticated HTTP GET to `/admin/bilateral-project-mappings` on a production host returns HTML containing the first 20 live bilateral project mappings, serialized into the SSR initial-data payload.

### Reproduction Steps

1. From any network position that can reach the server host, with **no** `Authorization` header and no session of any kind:
2. `GET /admin/bilateral-project-mappings`
3. **Expected:** `401`/`403`, or a shell containing no domain data.
4. **Actual:** `200` with mapping rows embedded in the returned HTML.

### Root Cause (confirmed)

Traced end to end through four layers:

1. `app.module.ts:86` excludes `/admin(.*)` from `JwtMiddleware` — deliberate, because a browser cannot attach a Bearer token to a top-level navigation.
2. The exclusion was never compensated by the `AdminGuard` that TRD §4.1 specifies. **No such class exists in the codebase.**
3. `AdminController.bilateralProjectMappings` (added in `9b539a7d`, T-15.15) calls `AdminService.listBilateralProjectMappings` → `BilateralProjectMappingService.list(query)` — the real domain service, reaching the real table.
4. Because the SSR route calls the service directly rather than the HTTP endpoint, the `RolesGuard` protecting `/api/bilateral-project-mappings` is never in the call path.

**The deeper cause, which is why chunk 2 exists:** the admin surface has *no authentication mechanism at all*. The React client issues `fetch(..., { credentials: 'include' })` — cookie-based — but the server has no cookie auth: `JwtMiddleware` reads only `req.headers.authorization` with a `Bearer` prefix, `cookie-parser` is not a dependency, and nothing anywhere sets a cookie. So the panel's client-side calls return `401` unconditionally.

The result is an inverted architecture: **the only working data path is the insecure one, and every correctly-guarded path is broken.**

### Impact & Scope

| Dimension | Assessment |
| --- | --- |
| **Confidentiality** | Live pool-funding mapping data (AGRESSO contract ↔ CLARISA project) readable unauthenticated in production |
| **Integrity** | **None.** All mutations go through `/api`, which is guarded. The SSR route is read-only |
| **Blast radius** | One route. The other three admin routes return hardcoded placeholders |
| **Regression risk of fixing** | **Very low** — the panel's interactive features already fail with `401`, so removing the SSR pre-fetch cannot break working behavior |

### Fix Strategy

Route: **`/akili-specify` (Bug Mode)** — this carries logic and a security behavior change, so it is not `/akili-quick` material, and Bug Mode mandates the regression test.

Smallest safe correction, in order:
1. Delete the `listBilateralProjectMappings` call from the SSR route; render the shell only. This alone closes the leak and makes the code match its own comment.
2. Add an env-gated block on `/admin*` in deployed environments so the shell is not publicly reachable while chunk 2 is built.
3. Regression test asserting an unauthenticated request yields no mapping data.
4. Correct the comment; update OI-4.

## Approach Options

| # | Option | Pros | Cons |
| --- | --- | --- | --- |
| **A** | **Remove the SSR pre-fetch + env-gate `/admin` in deployed envs** | Closes the leak at its exact source; testable in-repo; no new auth surface; cannot regress working behavior | Panel stays non-functional until chunk 2; the shell is still unauthenticated wherever the gate is off |
| **B** | Infra-level block only (ALB / VPN / IP allowlist) | Fastest protection; zero code risk; no deploy of app code | Auth lives outside the repo, so it is untestable here and invisible to the Reviewer; OI-4's in-app requirement stays open; depends on unresolved OI-1/OI-2 ownership |
| **C** | Jump straight to full auth (chunk 2 only) | One coherent end state; no throwaway work | Leak stays open for the entire build of a security feature (Cognito redirect, token handling, denied-state UX) — unacceptable given production reachability |

## Recommended Approach

**Option A, with Option B as an immediate operational stopgap today.**

A is recommended because the leak is one function call, and the usual argument against ripping out a data path — "it might break something" — does not apply here: the interactive panel is already broken by the missing cookie auth, so there is no working behavior to regress. That makes this an unusually safe security fix.

B is recommended *alongside* it, not instead of it, because A requires a deploy and the exposure is live now. Blocking `/admin` at the load balancer costs nothing and buys the time to ship A properly through the spec cycle. B is explicitly **not** a substitute: it leaves OI-4 open and puts the control somewhere the Reviewer and the test suite cannot see it.

C is rejected on exposure duration alone.

## Risks, Dependencies, And Open Questions

| # | Item | Notes |
| --- | --- | --- |
| R-1 | **Someone may rely on the SSR first paint as a read-only report** | Confirm before removing. If so, the need is legitimate and belongs in chunk 2 as an authenticated view — not preserved as an unauthenticated one |
| R-2 | **Env-gating `/admin` must not break local development** | The gate must be off by default locally, mirroring `LOCAL_AUTH_BYPASS`'s shape (opt-in, never on in production) |
| R-3 | **Regression test fidelity — KZ-001** | The active Kaizen lesson applies directly: a test double that does not exercise the real middleware/route path will go green over a still-broken behavior. The test must hit the actual Nest route through the real middleware chain (e2e via Supertest), not a mocked controller |
| R-4 | **Staging auth-bypass nuance (secondary finding)** | `ENV.LOCAL_AUTH_BYPASS` requires `ARI_LOCAL_AUTH_BYPASS=true && !IS_PRODUCTION`. Since `IS_PRODUCTION` is a single flag, a **staging** host with `ARI_IS_PRODUCTION=false` would honor the bypass and grant `SYSTEM_ADMIN` to every request. The code comment claims the guard covers "dev/staging/prod" — it covers prod only. Out of scope here; worth its own ticket |
| Q-1 | Should `/admin` return `404` or `403` when gated? | `404` avoids advertising the surface; `403` is more honest to operators. Decide in specify |
| Q-2 | Who owns the load-balancer change for the stopgap? | Blocked on OI-1/OI-2 (hosting + IaC ownership still unassigned) |

## Success Criteria

1. An unauthenticated `GET /admin/bilateral-project-mappings` returns **no** mapping data — verified by an e2e test that exercises the real route through the real middleware chain (KZ-001).
2. That test **fails on the current `main`** and passes after the fix. Red-before-green is mandatory evidence, not a formality.
3. `/admin*` is unreachable in deployed environments; local development is unaffected.
4. No change to `/api/bilateral-project-mappings` behavior — its existing guard tests still pass.
5. `admin.controller.ts:74-76` no longer makes a false claim about `RolesGuard` coverage.
6. OI-4 in `docs/infrastructure.md` reflects the containment and points at chunk 2 for closure.

## Next Step

```text
/akili-specify bugfix/admin-ssr-data-exposure
```

Run in **Bug Mode** — the confirmed root cause above converts into a fix plan plus the mandatory regression test.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
