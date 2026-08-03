# Proposal — Authenticate the `/admin` SSR panel via STAR's Cognito flow

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `changes/admin-panel-auth` |
| **Slug** | `admin-panel-auth` — derived from the free-text argument; the full text is proposal context, not a directory name |
| **Type** | **Change** (feature — closes a documented security requirement) |
| **Approval Mode** | `gated` (default) |
| **Depends on** | [`bugfix/admin-ssr-data-exposure`](../../bugfix/admin-ssr-data-exposure/proposal.md) — containment must land first |
| **Parallel-safe** | **no** — same files (`src/admin/`, `app.module.ts`), and this chunk lifts the gate chunk 1 installs |
| **Chunk** | 2 of 2 — the real fix |
| **Source** | `docs/specs/drift-report.md` 🔴 High finding · TRD §4.1/§10 · OI-4 in `docs/infrastructure.md` |
| **Date** | 2026-08-03 |

## Intent

Give the `/admin` SSR panel a real authentication mechanism so it can be exposed safely and actually function — closing the `AdminGuard` requirement the TRD has specified since the baseline.

## Problem / Current Behavior

**The admin surface has no authentication mechanism at all**, which is why chunk 1 could only contain the symptom rather than fix it. A guard needs a credential to check, and today none reaches the server:

| Path | Today | Why |
| --- | --- | --- |
| Top-level navigation to `/admin` | Unauthenticated | Excluded from `JwtMiddleware`; a browser cannot attach a Bearer header to a document request |
| React client → `/api/*` | **Always `401`** | Client sends `credentials: 'include'` (cookies); server reads only `Authorization: Bearer`. `cookie-parser` is not installed and nothing sets a cookie |

The consequence is an inverted architecture: the only working data path was the insecure SSR pre-fetch (removed in chunk 1), while every correctly-guarded path fails. Concretely, on the Bilateral Project Mappings page the list refresh, the AGRESSO/CLARISA pickers, create, update, and deactivate are all non-functional.

`AdminGuard` — named in TRD §4.1 as required — does not exist in the codebase.

## Proposed Outcome

- Reaching `/admin` unauthenticated redirects into the existing Cognito login and returns to the requested page.
- Only users holding an appropriate role (`SYSTEM_ADMIN`, and `CENTER_ADMIN` where the page's data warrants it) can load the panel.
- The panel's client-side `/api/*` calls authenticate successfully — the Bilateral Mappings page becomes fully functional for the first time.
- `/admin` can be exposed in production, closing OI-4.

## Scope

| In | Out |
| --- | --- |
| `AdminGuard` — validates identity + role for `/admin*` routes | Rebuilding the placeholder pages (`dashboard`, `users`, `settings`) with real data |
| Cognito redirect flow for top-level `/admin` navigation | Changing STAR client auth or `jWtInterceptor` |
| Token hand-off from the SSR shell to the React client for its `/api` Bearer calls | Any change to `/api/bilateral-project-mappings` authorization rules |
| Lift the deployed-environment gate installed by chunk 1 | Introducing cookie-session auth (explicitly rejected — see Approach Options) |
| Denied / unauthorized state in the admin UI | New admin features or pages |
| Tests: guard allow+deny per role, redirect flow, authenticated client-side call | The staging `IS_PRODUCTION` bypass nuance (separate ticket) |

## Non-Goals

- **Not** a second authentication system. The whole point of the chosen direction is to reuse the organization's existing Cognito/ROAR identity rather than add a parallel mechanism.
- Not making the admin panel a general operator console — the placeholder pages stay placeholders until separately specified.
- Not changing how STAR (the Angular client) authenticates.

## Affected Users, Systems, And Specs

| Affected | Detail |
| --- | --- |
| **Users** | Center Admins / System Admins gain a working Bilateral Mappings admin page. Unauthenticated visitors get a login redirect instead of a blocked route |
| **Systems** | AWS Cognito (existing app-client / callback config may need an `/admin` redirect URI — an ops dependency) |
| **Code** | `src/admin/` (controllers, services, React client), `src/app.module.ts`, `src/domain/shared/guards/` (new `AdminGuard`), possibly `jwr.middleware.ts` |
| **Specs** | TRD §4.1/§10 (AdminGuard becomes implemented), `docs/ux-ui/design.md` §5.3 admin navigation + §13.2 open gaps, `docs/infrastructure.md` OI-4 (closes) |

## Visual Reference

- **Source:** None yet — **recommend generating one during `/akili-specify`**
- **Location:** proposed `docs/specs/changes/admin-panel-auth/mockup/`
- **Notes:** Two small states need a visual decision before implementation: the **unauthorized/denied** state (a user authenticated but lacking the role) and the **login-redirect interstitial**. The rest of the panel's chrome already exists (`Layout.tsx`, `Header.tsx`, `Sidebar.tsx`). Per §7.2 of the UX/UI design, the admin baseline tokens must align to STAR where the surfaces meet. A lightweight mockup is worth generating; a full Figma cycle is not warranted for two states.

## Requirement Delta Preview

### ADDED Requirements

- An unauthenticated request to `/admin*` redirects to Cognito login and, on success, returns the user to the originally requested admin path.
- `AdminGuard` authorizes `/admin*` by role; unauthorized-but-authenticated users see an explicit denied state, not a redirect loop.
- The SSR shell makes an access token available to the React client so its `/api/*` calls carry `Authorization: Bearer`.
- Admin session expiry is handled explicitly (re-auth rather than silent `401`s).

### MODIFIED Requirements

- `app.module.ts` `/admin(.*)` exclusion — narrowed or removed now that `/admin` has its own authentication path; `/admin/public*` (static assets) must remain anonymous.
- The deployed-environment gate from chunk 1 is lifted once the guard is proven.
- `BilateralProjectMappings.tsx` — `credentials: 'include'` replaced by Bearer headers (the cookie approach it assumes is not, and will not be, implemented).
- TRD §4.1's "needs its own `AdminGuard`" moves from requirement to implemented fact.

### REMOVED Requirements

- The blanket anonymous allowance for `/admin*` in the auth boundary described in `docs/infrastructure.md` §Network & Security.

## Approach Options

| # | Option | Pros | Cons |
| --- | --- | --- | --- |
| **A** | **Reuse STAR's Cognito flow** *(selected)* | One identity provider, one credential type (Bearer) — no second auth system; reuses the already-guarded `/api` path unchanged; **no CSRF surface**, since mutations stay header-authenticated; operators use the account they already have | Token must reach the React client from an SSR document without leaking; redirect flow needs a callback URI registered for `/admin` |
| **B** | httpOnly cookie session | Matches what the React code already assumes (`credentials: 'include'`); simplest client change | Introduces a **second** auth mechanism alongside Bearer; every state-changing `/api` call becomes CSRF-exposed and needs tokens; `cookie-parser` + session lifecycle to own |
| **C** | Infra-level gate only (VPN / IP allowlist / ALB auth) | Zero app code; fast | Leaves the panel's client-side CRUD broken forever; auth untestable in-repo and invisible to the Reviewer; OI-4 stays open; does not satisfy TRD §4.1 |

## Recommended Approach

**Option A — reuse STAR's Cognito flow.** This matches the direction chosen by the product owner and is the right call on the merits: it keeps a single identity source and a single credential type, which means the existing `RolesGuard` on `/api/bilateral-project-mappings` works unchanged, and — the decisive point — it avoids the CSRF surface that Option B would introduce on every admin mutation. Option B looks cheaper only because the React code already sends `credentials: 'include'`; that is an artifact of a mechanism that was never built, not evidence that cookies are the right design.

The main engineering care goes into the **token hand-off**: getting an access token from an SSR-rendered document into the React client without embedding a long-lived credential in the HTML. This is the part to design deliberately in `/akili-specify` — prefer a short-lived token, and keep it out of any server-rendered markup that could be cached.

## Risks, Dependencies, And Open Questions

| # | Item | Notes |
| --- | --- | --- |
| R-1 | **Token exposure in SSR HTML** | The central design risk. A token embedded in server-rendered markup can be cached by proxies or leak via the DOM. Prefer a short-lived token fetched after hydration over one inlined into the document |
| R-2 | **Cognito callback configuration is an ops dependency** | An `/admin` redirect URI likely must be registered on the Cognito app client. Blocked on the same ownership gap as OI-1/OI-2 |
| R-3 | **Redirect loop for authenticated-but-unauthorized users** | A user with a valid token but the wrong role must get an explicit denied state; redirecting them back to login loops forever |
| R-4 | **`/admin/public*` must stay anonymous** | Static SSR assets are fetched without credentials; narrowing the exclusion carelessly will break the panel's own CSS/JS |
| R-5 | **Test fidelity — KZ-001** | Guard tests must exercise the real middleware/guard chain. A mocked guard that returns `true` produces a green suite over an unprotected route — precisely the active Kaizen lesson |
| R-6 | **Blast radius — KZ-002 / KZ-003** | Changing the `/admin` exclusion in `app.module.ts` touches global middleware wiring. Enumerate by *what the middleware chain renders*, not by the admin folder, and run the full server suite rather than targeted specs |
| Q-1 | Which roles may access `/admin`? | `SYSTEM_ADMIN` only, or also `CENTER_ADMIN`? The `/api` counterpart allows both (`@Roles(CENTER_ADMIN, SYSTEM_ADMIN)`). Aligning avoids a user who can call the API but not load the page that calls it |
| Q-2 | Should the placeholder pages ship at all? | `dashboard`, `users`, `settings` return hardcoded data. Authenticating access to fake data may be worth deferring — consider hiding them until real |
| Q-3 | Is a machine-token path needed for `/admin`? | Assumed no — `/admin` is a human surface. Confirm |

## Success Criteria

1. An unauthenticated `GET /admin/bilateral-project-mappings` redirects to Cognito login; after successful login the user lands back on that page.
2. An authenticated user **without** the required role receives an explicit denied state — no redirect loop, no data.
3. An authenticated user **with** the role loads the page **and** its client-side calls succeed: list refresh, pickers, create, update, and deactivate all work end to end (first time this has been true).
4. `/admin/public*` static assets still load anonymously.
5. Guard tests cover allow **and** deny per role, exercising the real middleware chain (KZ-001), with the full server suite green (KZ-003).
6. The chunk-1 deployed-environment gate is lifted, and OI-4 in `docs/infrastructure.md` is closed with a pointer to this spec.
7. TRD §4.1/§10 updated: `AdminGuard` documented as implemented.

## Next Step

Land [`bugfix/admin-ssr-data-exposure`](../../bugfix/admin-ssr-data-exposure/proposal.md) first, then:

```text
/akili-specify changes/admin-panel-auth
```

Consider generating the denied-state and redirect-interstitial mockup during specify (see Visual Reference).

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
