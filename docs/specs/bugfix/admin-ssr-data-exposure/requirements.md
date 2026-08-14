# Requirements — Admin Panel / Contain the unauthenticated `/admin` data exposure

- **Module:** admin-panel (server)
- **Spec id:** 2026-08-admin-ssr-data-exposure
- **Depth:** Standard
- **Mode:** **Bug Mode** (confirmed root cause — see `./proposal.md` §Bug Diagnosis)
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked PRD section:** `docs/prd.md` §7 AC-Admin-Panel; §8.3 Constraints (hard rules)
- **Linked tickets:** none — sourced from `docs/specs/drift-report.md` 🔴 High finding; OI-4 in `docs/infrastructure.md`
- **Extends:** `docs/specs/bugfix/admin-ssr-data-exposure/proposal.md`
- **Chunk:** 1 of 2 (containment). Chunk 2 = `docs/specs/changes/admin-panel-auth/`
- **Last updated:** 2026-08-03

---

## 1. Context

`GET /admin/bilateral-project-mappings` returns the first 20 rows of **live** bilateral project-mapping data to unauthenticated callers on a production-reachable host. The root cause is confirmed: `/admin(.*)` is excluded from `JwtMiddleware` (`app.module.ts:86`), the `AdminGuard` that TRD §4.1 requires was never implemented, and the SSR handler calls `BilateralProjectMappingService.list()` **directly** — so the `RolesGuard` protecting the `/api` twin is never in the call path.

The data is real: `bilateral_project_mapping` drives pool-funding contributor computation at read time on results (shipped spec `archive/2026-07-02-bilateral-module--mapping-drives-pool-funding-tag`).

This spec **contains** the exposure with the smallest safe change. It does not build admin authentication — that is chunk 2, deliberately separated because a guard needs a credential to check and the admin surface currently has no authentication mechanism at all.

**Not changing:** `/api/bilateral-project-mappings` and its `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` guard; the placeholder admin pages' stub data; `JwtMiddleware`'s token-parsing logic; the STAR client; any migration or entity.

---

## 2. Requirement numbering

Requirements use `R-ADM-<NNN>`; non-functional use `NFR-ADM-<NNN>`. Numbered in dependency order.

---

## 3. Functional requirements

### R-ADM-001 — No `/admin` route returns domain data to an unauthenticated caller

- **As a** System Admin responsible for the platform's data boundary
- **I want** the admin SSR routes to stop embedding real domain data in anonymous responses
- **So that** live pool-funding mapping data is not readable by anyone who can reach the host

**Details:**
- Inputs: an HTTP GET to any `/admin` SSR page route, with no `Authorization` header and no session of any kind.
- Behavior: the SSR handler MUST NOT invoke domain services to pre-populate its render payload. The admin React shell renders without server-supplied domain data; it obtains data (when chunk 2 lands) through the already-guarded `/api` endpoints.
- Outputs: HTML shell only. This route is SSR HTML, **not** a `ServerResponseDto` envelope — the envelope convention (D-1) applies to `/api` routes and is explicitly not in scope here.
- Errors: unchanged.
- Permissions: none added by this requirement — see R-ADM-002 for reachability.

**Acceptance criteria** (testable, observable):
- [ ] AC.1 — An unauthenticated `GET /admin/bilateral-project-mappings` response body contains **no** bilateral mapping records (no `agreement_id`, no mapped CLARISA project identifiers, no row data from `bilateral_project_mapping`).
- [ ] AC.2 — The same request returns a renderable HTML shell (the route does not 500).
- [ ] AC.3 — `GET /api/bilateral-project-mappings` behavior is byte-for-byte unchanged: still `401` without a token, still `403` for a valid token lacking `CENTER_ADMIN`/`SYSTEM_ADMIN`, still `200` with a permitted role.
- [ ] AC.4 — No other admin route invokes a domain service: `dashboard`, `users`, and `settings` continue to return only their hardcoded stub payloads.

**Out of scope (for this requirement):**
- Making the admin panel functional or authenticated (chunk 2).
- Changing what the React page does after hydration.

---

### R-ADM-002 — `/admin*` is unreachable in deployed environments

- **As a** System Admin
- **I want** the entire admin surface disabled wherever the app is deployed, until it has real authentication
- **So that** an unauthenticated operator console is not exposed while chunk 2 is built

**Details:**
- Inputs: any request to a path under `/admin`, including `/admin/public/*` static assets.
- Behavior: when the admin surface is disabled, the server MUST NOT serve the admin shell, its static assets, or any admin route. The disable state MUST be driven by explicit configuration that is **off by default in local development and on by default everywhere else** — a deployment must not have to remember to set a flag in order to be safe.
- Outputs: a single non-informative status for every `/admin*` path (see Open Question Q-1 for `404` vs `403`).
- Errors: no stack trace, no hint that an admin surface exists.
- Permissions: n/a — this is a reachability gate, not an authorization check.

**Acceptance criteria:**
- [ ] AC.1 — With the admin surface disabled, `GET /admin`, `GET /admin/dashboard`, `GET /admin/users`, `GET /admin/settings`, and `GET /admin/bilateral-project-mappings` all return the chosen non-informative status and no HTML shell.
- [ ] AC.2 — With the admin surface disabled, `GET /admin/public/<any-asset>` is also not served.
- [ ] AC.3 — With the admin surface enabled (local development default), every admin route renders exactly as it does today, minus the R-ADM-001 data pre-fetch.
- [ ] AC.4 — **Fail-safe default:** with **no** admin-related environment variable set at all, the surface is **disabled**. Enabling requires an explicit opt-in.
- [ ] AC.5 — No non-`/admin` route changes behavior: `/api/*`, `GET /`, `/favicon.ico`, `/.well-known/*`, `/swagger`, and `GET /api/configuration/:key` are unaffected.

**Out of scope (for this requirement):**
- Load-balancer or network-level restriction (recommended operationally in the proposal, but not code).
- Lifting this gate — that is chunk 2's closing step.

---

### R-ADM-003 — The defect is proven fixed by a regression test

- **As an** engineer maintaining this boundary
- **I want** an automated test that reproduces the exposure
- **So that** the fix is evidenced now and the hole cannot silently reopen

**Details:**
- Behavior: a test MUST assert the corrected behavior of R-ADM-001 AC.1 by exercising the **real** application stack — the actual Nest route through the actual middleware chain — not a mocked controller, mocked guard, or mocked middleware.
- **Fidelity constraint (KZ-001):** a test double that does not evaluate what it stands in for produces a green suite over broken behavior. A test that stubs the admin controller, or that asserts against a hand-built response object, does **not** satisfy this requirement even if it passes.

**Acceptance criteria:**
- [ ] AC.1 — The test **fails on the current `main`** (it observes mapping data in the response) and **passes after the fix**. Red-before-green is recorded evidence, not a formality.
- [ ] AC.2 — The test issues a real HTTP request against a bootstrapped Nest application (Supertest e2e, per TRD §12), with no `Authorization` header.
- [ ] AC.3 — The test asserts on the **response body content**, not on whether a service method was called — the observable outcome is what matters.
- [ ] AC.4 — A companion test covers R-ADM-002: with the surface disabled, `/admin` returns the non-informative status.
- [ ] AC.5 — The existing `/api/bilateral-project-mappings` allowed/denied role tests still pass unchanged.

**Out of scope:**
- Testing chunk 2's authentication flow.

---

## 4. Non-functional requirements

### NFR-ADM-001 — Security: anonymous surface carries no domain data

- **Category:** security
- **Target:** zero domain records reachable on any anonymous route. The `JwtMiddleware` anonymous allowlist (`docs/infrastructure.md` §Network & Security) is `/admin*`, `/.well-known*`, `GET /api/configuration/:key`, `GET /`, `/favicon.ico` — after this spec, no entry on that list returns domain data.
- **How verified:** e2e test (R-ADM-003) + Reviewer audit of the allowlist.

### NFR-ADM-002 — DX: local development is unaffected

- **Category:** dx
- **Target:** a developer running `npm run dev` sees the admin panel exactly as before (minus the pre-fetched data), with no new required environment variable.
- **How verified:** manual local check recorded in the task's done criteria.

### NFR-ADM-003 — Blast radius: global middleware wiring stays intact

- **Category:** reliability
- **Target:** no route outside `/admin*` changes status code, auth behavior, or response shape.
- **How verified:** full server unit suite + e2e suite green (**KZ-003** — a targeted suite confirms the brief was followed, not that the blast radius is clean).

---

## 5. Data requirements

None. No entity, column, index, OpenSearch mapping, or migration is added or changed. The `bilateral_project_mapping` table is read-only to this spec and its access path via `/api` is untouched.

---

## 6. API surface delta

| Route | Change |
| --- | --- |
| `GET /admin/bilateral-project-mappings` | SSR pre-fetch removed; renders shell only |
| `GET /admin*` (all) | Gated off in deployed environments (R-ADM-002) |
| `GET /api/bilateral-project-mappings` | **No change** — retains `@UseGuards(RolesGuard)` + `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` |

No new endpoint, no version bump, no Swagger change (`AdminController` is `@ApiExcludeController()`).

---

## 7. Cross-system impact

- **STAR client:** none. This spec does not touch `client/`.
- **Integrations:** none.
- **Socket.IO:** none.
- **Downstream spec:** `changes/admin-panel-auth` (chunk 2) depends on this landing first and will lift the R-ADM-002 gate as its closing step.

---

## 8. Defect classes and their gates

Per the methodology's "name the defect classes, then choose the gate against them" rule. **A gate blind to this spec's dominant defect class is not a gate.**

| # | Defect class this spec can produce | Catching gate | Automated? |
| --- | --- | --- | --- |
| D-1 | Containment incomplete — an admin route still emits domain data | R-ADM-003 e2e test asserting on response body | ✅ Yes |
| D-2 | Gate too tight — local development broken | NFR-ADM-002 manual local check + unit test on flag resolution | ⚠️ Partial |
| D-3 | Gate logic inverted — surface stays enabled where it should be off | Unit test over env permutations, **plus AC-2.4's fail-safe default** so the wrong answer is "disabled" | ✅ Yes (logic) / ❌ No (real deployment) |
| D-4 | `/api` authorization regressed | Existing controller + guard specs; R-ADM-003 AC.5 | ✅ Yes |
| D-5 | Middleware wiring breakage affecting unrelated routes | Full server unit + e2e suites (KZ-003) | ✅ Yes |
| D-6 | **Test fidelity failure (KZ-001)** — regression test mocks the chain and goes green over a still-open hole | ❌ **No command catches this** | ❌ **No** |

### Blind spots — substituted or accepted

- **D-6 (test fidelity) — substituted by human review.** No automated check can distinguish a test that exercises the real middleware chain from one that mocks it and passes anyway; both exit `0`. **Substitute:** R-ADM-003 AC.2/AC.3 make the fidelity requirement explicit and testable-by-inspection, and the Reviewer MUST verify the regression test issues a real HTTP request against a bootstrapped app rather than asserting against a stub. This is the recurrence-4 lesson KZ-001 and is this spec's highest-risk defect class.
- **D-3 (real deployment behavior) — substituted by a post-deploy human check.** Whether the gate actually engages depends on environment variables set outside this repo, which no in-repo test can observe. **Substitute:** a post-deploy verification step (curl `/admin` on the deployed host, expect the non-informative status) recorded as a done criterion, plus AC-2.4's fail-safe default so a misconfiguration errs toward disabled.
- **Accepted risk:** none unsubstituted.

---

## 9. Assumptions, dependencies, risks

| # | Item | Note / mitigation |
| --- | --- | --- |
| A-1 | Nobody depends on the SSR first paint as a read-only report | **Must be confirmed before implementation** (Q-2). If someone does, the need is legitimate and moves to chunk 2 as an authenticated view — it is not preserved as an anonymous one |
| A-2 | `/admin/public/*` assets are consumed only by the admin panel | Gating them alongside the panel is therefore safe |
| D-1 | Chunk 2 (`changes/admin-panel-auth`) depends on this spec | Sequential; **not** parallel-safe (same files) |
| R-1 | Touching `app.module.ts` risks unrelated middleware regressions | Mitigated by NFR-ADM-003 full-suite gate; KZ-002 applies — enumerate by what the middleware chain covers, not by the admin folder |
| R-2 | Containment ships before real protection exists at the network edge | Proposal recommends a load-balancer block as an immediate stopgap; that is operational and outside this spec |

---

## 10. Open questions

| # | Question | Owner | Target |
| --- | --- | --- | --- |
| Q-1 | Should a gated `/admin*` return `404` or `403`? `404` avoids advertising the surface; `403` is more honest to operators. **Recommendation: `404`** | David Casañas | before design approval |
| Q-2 | Does anyone currently rely on the SSR first paint as a read-only view of the mappings? (A-1) | David Casañas | before implementation |
| Q-3 | Should the enable-flag be a dedicated variable or derive from the existing `ARI_IS_PRODUCTION`? A dedicated flag is safer — staging is not production but must still be gated | David Casañas | resolved in design.md |

---

## 11. Requirement ID index

| ID | Title | Type |
| --- | --- | --- |
| R-ADM-001 | No `/admin` route returns domain data to an unauthenticated caller | Functional |
| R-ADM-002 | `/admin*` is unreachable in deployed environments | Functional |
| R-ADM-003 | The defect is proven fixed by a regression test | Functional |
| NFR-ADM-001 | Security: anonymous surface carries no domain data | Non-functional |
| NFR-ADM-002 | DX: local development is unaffected | Non-functional |
| NFR-ADM-003 | Blast radius: global middleware wiring stays intact | Non-functional |

---

## 12. Sign-off

- [ ] Engineering lead — David Felipe Casañas Hernández
- [ ] MEL / product owner — <pending>
- [ ] **Security review** — **mandatory** for this spec (auth surface touched), not optional
- [ ] DevOps (deployment gate + stopgap block) — <pending, blocked on OI-1/OI-2 ownership>
