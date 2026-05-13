# Claude Guide — Alliance Research Indicators (ARI)

> **Scope of this guide:** the **server** package (`server/researchindicators`). The standalone STAR client app under `client/` is out of scope here and follows its own conventions.
>
> This guide is the working manual for any agent (Claude, automation, contributors) operating in this repo. It anchors all SDD work to the constitutional baseline below.

---

## 1. SDD constitutional baseline

These four documents form the project's constitutional baseline. Always consult them — in this order — before designing or changing anything:

| File | What it is | When to consult |
| --- | --- | --- |
| `docs/prd.md` | Product Requirements Document for the ARI backend (problem, personas, goals, scope, user stories, acceptance criteria, assumptions, open questions). | Every time scope, audience, or business intent is in question. |
| `docs/system-design/design.md` | System / UX-of-the-platform blueprint: information architecture, API consumer flows, response/error envelope, admin SSR panel, design tokens, a11y, decisions log, open gaps. | Whenever a change affects how humans or machines experience the platform (API surface, admin screens, real-time channel). |
| `docs/detailed-design/detailed-design.md` | Technical implementation blueprint: module layout, data model conventions, API rules, workflows, integrations, security, observability, testing, constraints. | Whenever a change touches code, schema, integrations, or infra-adjacent settings. |
| `docs/specs/general-setup/{requirements,design,task}.md` | Methodology templates that every module-level spec MUST follow. | Whenever you create a new spec under `docs/specs/<module>/<feature>/`. |

### Child guides

Package-local guides extend this baseline with code-level navigation and conventions for working inside a specific directory:

| File | Scope |
| --- | --- |
| [`server/researchindicators/src/CLAUDE.md`](server/researchindicators/src/CLAUDE.md) | Working manual for code-level changes inside the NestJS server source tree — where files go, how to add endpoints, auth/roles/status wiring, integration rules, and common commands. |

Always read the parent (this file) plus the relevant child guide before touching code in that directory.

If you have to choose between the PRD and a piece of source code, **the source code is the truth of today** and the PRD is the truth of intent. Reconcile by updating the doc that is wrong, not by silently changing behavior.

---

## 2. Module-level specs taxonomy

Module-level SDD specs live under `docs/specs/`, organized **by domain module**, matching the structure of `src/domain/entities/` and `src/domain/tools/`:

```
docs/specs/
├── general-setup/        # methodology templates (do NOT treat as a feature spec)
├── results/              # everything tied to the Results aggregate
├── indicators/
├── agresso/
├── clarisa/
├── opensearch/
├── reports/
└── admin-panel/          # the /admin SSR panel
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
server/researchindicators/
├── src/
│   ├── main.ts                  # HTTP + RabbitMQ microservice bootstrap
│   ├── app.module.ts            # HTTP composition root
│   ├── app-microservice.module.ts
│   ├── admin/                   # Vite + React 19 SSR admin panel under /admin
│   ├── controllers/             # cross-cutting controllers (Azure)
│   ├── db/
│   │   ├── config/mysql/        # TypeORM datasource + targets
│   │   ├── config/dynamo/       # DynamoDB module + service
│   │   └── migrations/          # 238+ migrations — append-only
│   └── domain/
│       ├── routes/main.routes.ts        # RouterModule registration
│       ├── entities/<module>/           # one module per entity cluster
│       ├── complementary-entities/      # secondary entities
│       ├── tools/                       # external integrations
│       │   ├── agresso/ broker/ clarisa/ cron-jobs/
│       │   ├── dynamo-feedback/ open-search/ roar-management/
│       │   ├── socket/ tip-integration/
│       └── shared/                      # interceptors, guards, pipes, filters, utils
└── test/                       # Jest e2e (jest-e2e.json)
```

> **Do not touch `client/`** from this guide. It is a sibling app with its own tooling and ownership.

---

## 4. Working conventions (non-negotiable)

These are inherited from the detailed design. Repeating them here so they are top-of-mind for every agent:

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
- **Tests:** sibling `*.spec.ts` for every controller / service / guard / interceptor touched. Global Jest coverage threshold 60%. Use `npm test` / `npm run test:e2e` / `npm run test:cov`.
- **Lint/format:** `npm run lint` (eslint + prettier). Don't bypass `husky` hooks.
- **Commits / PRs:** match existing style — `<type>(<module>): <subject>` (e.g. `fix(results.service): ...`). Never `--no-verify` without an explicit human approval.

---

## 5. When in doubt

- For **business intent / scope**: re-read `docs/prd.md`.
- For **how the platform feels to a consumer (API, admin, sockets)**: re-read `docs/system-design/design.md`.
- For **how to implement it / where files go / which conventions apply**: re-read `docs/detailed-design/detailed-design.md`.
- For **how to write a spec**: copy `docs/specs/general-setup/{requirements,design,task}.md` into the new module folder and fill them in.

If a constitutional document contradicts current code, prefer fixing the document and recording a decision (`docs/system-design/design.md` §12 or the relevant detailed-design section). Do NOT silently let docs and code drift.

---

## 6. Out of scope for this guide

- `client/research-indicators` (STAR app) — sibling repo with its own CLAUDE.md when it lands.
- CI/CD pipelines, infrastructure-as-code, and deployment specifics — covered in ops docs.
- Donor-facing or public marketing properties — not part of ARI.
