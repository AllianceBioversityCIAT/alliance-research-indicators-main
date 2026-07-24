# Claude Guide — Alliance Research Indicators (ARI)

> **Scope of this guide:** the **ARI monorepo** — the NestJS **server** (`server/researchindicators`) *and* the Angular 19 + PrimeNG 19 **client** (`client/research-indicators`, "STAR"). The server is the system of record + integration hub; the client is the primary human UI. Both packages share this constitutional baseline.
>
> This guide is the working manual for any agent (Claude, automation, contributors) operating in this repo. It anchors all AKILI-SPECS (SDD) work to the constitutional baseline below.

---

## 1. AKILI-SPECS constitutional baseline

These documents form the project's constitutional baseline. Always consult them — in this order — before designing or changing anything:

| File | What it is | When to consult |
| --- | --- | --- |
| `docs/prd.md` | Product Requirements Document for the ARI monorepo (problem, personas, goals, scope, user stories, acceptance criteria, assumptions, open questions) — covers both server and client. | Every time scope, audience, or business intent is in question. |
| `docs/ux-ui/design.md` | UX/UI blueprint for both surfaces: the STAR client (primary UX) and the server surface (embedded `/admin` SSR panel + API consumer DX). Information architecture, user flows, screen inventory, design tokens, a11y, dark mode, decisions log, open gaps. | Whenever a change affects how humans or machines experience the platform. |
| `docs/trd/trd.md` | Technical Requirements Document (implementation blueprint): architecture + ADRs, NFR scenarios, module layout, data model, API contracts, backend/frontend architecture, integrations, security, observability, testing, constraints — both tiers. | Whenever a change touches code, schema, integrations, or infra-adjacent settings. |
| `docs/infrastructure.md` | Deployment & hosting blueprint (AWS target, cloud components, CI/CD, network & security, infra rules). Derives from the TRD robust-vs-lite tier decision. | Whenever a change touches deployment, hosting, secrets, or environment topology. |
| `docs/model-routing.md` | Canonical model-selection registry (tiers, phase→tier mapping, editable model table). Mirrored into the `## Model Routing` section below. | When choosing which model to run an AKILI phase or agent on. |
| `docs/specs/general-setup/{requirements,design,task}.md` | Methodology templates that every module-level spec MUST follow. | Whenever you create a new spec under `docs/specs/<module>/<feature>/`. |

If you have to choose between the PRD and a piece of source code, **the source code is the truth of today** and the PRD is the truth of intent. Reconcile by updating the doc that is wrong, not by silently changing behavior.

---

## Module Guides

Package-local child guides extend this baseline with code-level navigation and conventions. Inheritance is one-way: the root guide always applies; children only add or narrow. Read the parent (this file) plus the relevant child guide before touching code in that directory.

| File | Scope |
| --- | --- |
| [`server/researchindicators/src/CLAUDE.md`](server/researchindicators/src/CLAUDE.md) | Code-level manual for the NestJS server source tree — where files go, how to add endpoints, auth/roles/status wiring, integration rules, common commands. |
| [`client/research-indicators/src/CLAUDE.md`](client/research-indicators/src/CLAUDE.md) | Code-level manual for the Angular 19 + PrimeNG 19 client source tree — folder layout, path aliases, where new screens/services/guards go, standalone-component & signal conventions, token utilities, test commands. (Mirrored as `src/AGENTS.md`.) |

---

## Execution personas (`.agents/`)

The JCSPECS/AKILI multi-agent loops read their personas from [`.agents/`](.agents/):

- `leader.md` — orchestrator for `/akili-execute` (Leader → Implementer → Reviewer rework loop) and `/akili-test` (Leader → Tester(s) harness).
- `implementer.md` — coding contract (server conventions; defers to the relevant child guide for client work).
- `reviewer.md` — read-only spec-conformance audit, structured PASS/FAIL.
- `tester.md` — single-suite QA authoring/execution (`backend-unit`, `backend-e2e`, `frontend-unit`), structured PASS/FAIL/PRODUCT_BUG.

Enforced model bindings live in [`.claude/agents/akili-*.md`](.claude/agents/) (see `## Model Routing`). Don't invent execution personas inline — extend these.

---

## 2. Module-level specs taxonomy

Module-level SDD specs live under `docs/specs/`, organized **by domain module**. Server modules mirror `server/.../src/domain/entities/` and `src/domain/tools/`; client feature specs mirror `client/.../src/app/pages/` and `shared/`:

```
docs/specs/
├── general-setup/        # methodology templates (do NOT treat as a feature spec)
├── results/              # everything tied to the Results aggregate
├── indicators/
├── agresso/
├── clarisa/
├── opensearch/
├── reports/
├── admin-panel/          # the /admin SSR panel (server)
└── <client-feature>/     # STAR client features (e.g. results-center, dashboard, capacity-bulk-upload)
```

Inside a module folder, each feature gets its own subfolder containing exactly three files:

```
docs/specs/<module>/<feature-slug>/
├── requirements.md       # follows docs/specs/general-setup/requirements.md
├── design.md             # follows docs/specs/general-setup/design.md
└── task.md               # follows docs/specs/general-setup/task.md
```

Add a new top-level module folder only when the work cuts across multiple existing modules with no natural home.

---

## 3. Repo layout, at a glance

```
alliance-research-indicators-main/            # monorepo root (husky-management)
├── server/researchindicators/
│   ├── src/
│   │   ├── main.ts                  # HTTP + RabbitMQ microservice bootstrap
│   │   ├── app.module.ts            # HTTP composition root
│   │   ├── app-microservice.module.ts
│   │   ├── admin/                   # Vite + React 19 SSR admin panel under /admin
│   │   ├── controllers/             # cross-cutting controllers (Azure)
│   │   ├── db/
│   │   │   ├── config/mysql/        # TypeORM datasource + targets
│   │   │   ├── config/dynamo/       # DynamoDB module + service
│   │   │   └── migrations/          # 238+ migrations — append-only
│   │   └── domain/
│   │       ├── routes/main.routes.ts        # RouterModule registration
│   │       ├── entities/<module>/           # one module per entity cluster
│   │       ├── complementary-entities/      # secondary entities
│   │       ├── tools/                       # external integrations
│   │       │   ├── agresso/ broker/ clarisa/ cron-jobs/
│   │       │   ├── dynamo-feedback/ open-search/ roar-management/
│   │       │   ├── socket/ tip-integration/
│   │       └── shared/                      # interceptors, guards, pipes, filters, utils
│   └── test/                       # Jest e2e (jest-e2e.json)
└── client/research-indicators/     # Angular 19 + PrimeNG 19 SPA (STAR)
    ├── src/app/
    │   ├── app.config.ts           # providers, router, HTTP, interceptors, socket
    │   ├── app.routes.ts           # lazy standalone routes + guards/resolvers
    │   ├── pages/                  # feature pages (landing, login, auth, platform/…)
    │   ├── shared/                 # components, services, interceptors, guards, sockets
    │   └── theme/                  # PrimeNG Aura preset (roartheme.ts)
    └── src/styles/                 # global SCSS + token utilities
```

Both packages are independent deployables. See the child guides for per-package detail.

---

## 4. Working conventions (non-negotiable)

### 4.1 Server (`server/researchindicators`)
Inherited from the TRD. Top-of-mind for every agent touching the server:

- **HTTP envelope:** every response is `ServerResponseDto` (`{ data, status, description, errors, timestamp, path }`). Wrapping happens in `ResponseInterceptor`. Errors go through `GlobalExceptions` and use the same shape.
- **Routing:** global `/api` prefix; URI versioning (`/api/v1`, `/api/v2`).
- **Auth:** `JwtMiddleware` accepts ROAR JWT or base64(`{client_id, client_secret}`) machine tokens. `/admin*`, `/admin/public*`, `/.well-known*`, `GET /api/configuration/:key`, `GET /`, `/favicon.ico` are excluded.
- **Authorization:** `@Roles(...)` + `RolesGuard`. `SYSTEM_ADMIN` bypasses role checks. Results mutations also pass through `ResultStatusGuard`.
- **Audit:** every domain entity extends `AuditableEntity`; mutations populate audit fields from `request.user`.
- **Persistence:** TypeORM + MySQL (utf8mb4). Migrations are append-only; never edit a merged migration. Generate with `npm run migration:generate -- ./src/db/migrations/<name>`.
- **Search:** OpenSearch mapping is generated from entity decorators (`@OpenSearchProperty`). If a column should be searchable, decorate it.
- **Real-time:** Socket.IO server gateway in `domain/tools/socket/`. Event names + payload shapes belong in a module spec — do not invent them ad hoc.
- **Logging:** use `LoggerUtil`. Status-based log levels are wired in `ResponseInterceptor`.
- **Swagger:** every new endpoint MUST declare `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, and per-param `@ApiQuery`/`@ApiBody`.
- **Tests:** sibling `*.spec.ts` for every controller / service / guard / interceptor touched. Global Jest coverage threshold 60%. Use `npm test` / `npm run test:e2e` / `npm run test:cov` from `server/researchindicators/`.

### 4.2 Client (`client/research-indicators`)
Inherited from the client child guide + PRD constraints. Top-of-mind for every agent touching the client:

- **Standalone components only** — no NgModules; lazy-load via `loadComponent` in `app.routes.ts`.
- **HTTP through `ApiService`** — never call `HttpClient` from a component; always handle the `MainResponse<T>` envelope (the same wire contract as the server's `ServerResponseDto`, seen from the consumer side).
- **Auth:** AWS Cognito + JWT with proactive refresh; never bypass `jWtInterceptor`; `rolesGuard`/`centerAdminGuard` mirror backend authorization; never log tokens.
- **Controlled vocabularies come from CLARISA** — no parallel taxonomies; no free-text where a CLARISA list applies.
- **State:** signals for cross-cutting client state; RxJS for streams/HTTP/socket. No NgRx.
- **Design tokens:** token utility classes (`.abc-*`, `.atc-*`, `.rs-*`, `.fs-*`) or `var(--ac-*)` — no hex literals in components. Light + dark via PrimeNG Aura.
- **Tests:** co-located `*.spec.ts`; `npm test` from `client/research-indicators/`. Coverage floors: statements 40 / branches 20 / lines 45 / functions 30.
- **Budgets:** respect `angular.json` (initial ≤ 3 MB error / 2 MB warning; component styles ≤ 8 kB / 4 kB).

### 4.3 Shared
- **Lint/format:** `npm run lint` in each package (eslint + prettier). Don't bypass `husky` hooks.
- **Commits / PRs:** match existing style — `<type>(<module>): <subject>` (e.g. `fix(results.service): ...`). Never `--no-verify` without an explicit human approval.
- **CodeGraph:** `.codegraph/` is initialized (machine-local, gitignored). Prefer `codegraph_*` tools for symbol lookup, callers/callees, and impact analysis before broad file scanning.

---

## Model Routing

> Guidance mirror of [`docs/model-routing.md`](docs/model-routing.md). Enforced bindings live in `.claude/agents/akili-*.md`. **Criteria-first:** match the model to the dominant demand of the phase. ARCHITECT = BUILDER; **author ≠ auditor** (Reviewer/Tester must differ from the Implementer model); reserve deep reasoning for propose/design/verify; fast & cheap for orchestration/archive.

**Capability tiers:** T1 Architect (hard design/synthesis) · T2 Coder (implementation, test authoring) · T3 Auditor (independent review) · T4 Context-Ingest (large-context ingestion) · T5 Fast-Cheap (orchestration/bookkeeping) · T6 Multimodal (screenshots/diagrams).

**Phase → tier:** constitution-ingest T4 · constitution-synthesis/propose/specify T1 · execute-Leader T5 · execute-Implementer T2 · execute-Reviewer T3 (**≠ Implementer**) · test-Leader T5 · test-Tester(s) T2 (**prefer ≠ Implementer**) · validate/audit T3 · quick/archive T5.

**Model registry** (alias-first; edit here + `docs/model-routing.md` to change). **Updated: 2026-07**

| Tier | Claude Code | OpenCode | Fallback |
| --- | --- | --- | --- |
| T1 Architect | `opus` | `<CONFIRM SLUG>` | `sonnet` |
| T2 Coder | `sonnet` | `opencode-go/glm-5.1` `<CONFIRM>` | `sonnet` |
| T3 Auditor | `opus` | `opencode-go/deepseek-v4-pro` `<CONFIRM>` | `opus` |
| T4 Context-Ingest | `sonnet` | `<CONFIRM SLUG>` | `haiku` |
| T5 Fast-Cheap | `haiku` | `opencode-go/deepseek-v4-flash` `<CONFIRM>` | `haiku` |
| T6 Multimodal | `opus` | `<CONFIRM SLUG>` | `sonnet` |

Enforced wrappers: `akili-leader`→`haiku` · `akili-implementer`→`sonnet` · `akili-reviewer`→`opus` (≠ implementer) · `akili-tester`→`sonnet`. To change models edit only the registry (never pin a dated name where an alias exists); never add `model:` to command frontmatter.

---

## Skill Map

Stack skills are **not** hard-referenced by commands — this map is how they reach the agents. During `/akili-specify`, derive each task's required skills from this map. During `/akili-execute` and `/akili-test`, the Leader assigns these skills and the Implementer/Tester must load them before writing code or tests.

| Skill | Applies To | When to load |
| --- | --- | --- |
| `nestjs-expert` | server | Nest modules/DI/guards/interceptors, TypeORM integration, Jest/Supertest. |
| `api-design-principles` | server | Designing/reviewing REST endpoints & contracts. |
| `error-handling-patterns` | both | Error propagation, envelope/exception design. |
| `angular-developer` | client | Angular 19 signals/resource, standalone components, forms, DI, routing, a11y, testing. |
| `react-doctor` | server (admin SSR) | React 19 admin-panel changes review. |
| `ui-ux-pro-max` | client | UI/UX build/review, tokens, accessibility, component patterns. |
| `systematic-debugging` | both | Any bug, test failure, or unexpected behavior. |

---

## 5. When in doubt

- For **business intent / scope**: re-read `docs/prd.md`.
- For **how the platform feels (STAR UI, API, admin, sockets)**: re-read `docs/ux-ui/design.md`.
- For **how to implement it / where files go / which conventions apply**: re-read `docs/trd/trd.md` + the relevant child guide.
- For **deployment / hosting / secrets**: re-read `docs/infrastructure.md`.
- For **which model to run a phase on**: re-read `docs/model-routing.md` / the `## Model Routing` section.
- For **how to write a spec**: copy `docs/specs/general-setup/{requirements,design,task}.md` into the new module folder and fill them in.

If a constitutional document contradicts current code, prefer fixing the document and recording a decision (`docs/ux-ui/design.md` decisions log or the relevant TRD section). Do NOT silently let docs and code drift.

---

## 6. Out of scope for this guide

- CI/CD pipelines and infrastructure-as-code internals — summarized in `docs/infrastructure.md`; deep ops runbooks live in ops docs.
- Donor-facing or public marketing properties — not part of ARI.

> **Legacy path note:** the UX/UI blueprint moved from `docs/system-design/design.md` → `docs/ux-ui/design.md`, and the TRD from `docs/detailed-design/detailed-design.md` → `docs/trd/trd.md`. Archived specs under `docs/specs/archive/` still reference the old paths as point-in-time records and are intentionally left unchanged.
