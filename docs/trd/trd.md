# Technical Requirements Document (TRD) — Alliance Research Indicators (ARI)

> **Scope:** the **whole monorepo** — the NestJS 10.4 + TypeORM/MySQL **server** (`server/researchindicators`) *and* the Angular 19 + PrimeNG 19 **client** (`client/research-indicators`), plus the external systems both tiers share.
>
> This is the **technical implementation blueprint** for AKILI-SPECS. It locks in architecture decisions, quality-attribute scenarios, module layout, data model, API contracts, workflows, frontend state, integrations, security, observability, testing, and constraints that all module-level specs MUST inherit.
>
> **Companions:** [`../prd.md`](../prd.md) (product intent) · [`../ux-ui/design.md`](../ux-ui/design.md) (platform experience / UI-UX). When code disagrees with this document, fix one or the other — never let them drift.

---

## 1. System Overview

ARI is a **two-package monorepo** delivering the Alliance Research Indicators platform. Both packages are deployed independently and communicate only over versioned HTTP/WSS contracts.

| Package | Path | Stack | Ships as |
| --- | --- | --- | --- |
| **Server (API)** | `server/researchindicators` | NestJS 10.4 + TypeScript 5.7, TypeORM 0.3 / MySQL | HTTP API (`/api/v{n}`) + Swagger + RabbitMQ microservice + Socket.IO gateway + React 19 SSR admin panel (`/admin`) |
| **Client (SPA)** | `client/research-indicators` | Angular 19 + PrimeNG 19, Signals + RxJS, SCSS | Static bundle behind Nginx-Alpine, PWA service worker |

### 1.1 What each tier owns

- **Server** is the **system of record for the Results domain**. It pulls master data from CLARISA, contracts/staff from AGRESSO (MSSQL + SOAP), identity from ROAR Management, persists to MySQL via TypeORM, mirrors to OpenSearch via `@OpenSearchProperty`, and writes feedback to AWS DynamoDB.
- **Client (STAR app)** is the **primary human interface**. It consumes the Main API, a text-mining microservice, and a file-manager microservice; authenticates via AWS Cognito; and holds a WebSocket for presence/notifications. It enforces no authoritative policy — the backend rejects unauthorized writes regardless of client UI.

### 1.2 Monorepo topology

```
                         ┌──────────────────────────────┐
                         │  Client SPA (Angular 19)     │  client/research-indicators
                         │  PrimeNG · Signals · RxJS     │
                         │  Cognito JWT · WebSocket       │
                         └──┬───────────┬───────────┬────┘
                 HTTPS/REST │   HTTPS   │           │ WSS
        ┌───────────────────┘   /REST   │           │
        ▼                               ▼           ▼
┌───────────────┐            ┌───────────────┐ ┌───────────────┐
│  Main API     │            │ Text-Mining   │ │ File-Manager  │
│  ARI Server   │            │ microservice  │ │ microservice  │
│  (NestJS 10.4)  │            └───────────────┘ └───────────────┘
│  /api/v{n}    │◄──── PRMS / TIP / AICCRA (client_id/secret)
│  /swagger     │────► Socket.IO (real-time to STAR)
│  /admin (SSR) │
└─┬──┬──┬──┬──┬─┘
  │  │  │  │  └──────────────┐
  ▼  ▼  ▼  ▼                 ▼
MySQL OpenSearch DynamoDB  RabbitMQ (ARI_QUEUE)
(TypeORM)(indexes)(feedback)(microservice)

External shared systems: ROAR Management + AWS Cognito (identity),
CLARISA (controlled vocabularies), AGRESSO (MSSQL + SOAP), TIP integration,
lambda-toc (bilateral ToC catalog), analytics SDKs (Hotjar/Clarity/GA/BugHerd).
```

### 1.3 Bootstrap & delivery

| Tier | Bootstrap / build | Notes |
| --- | --- | --- |
| Server | `src/main.ts` boots **two Nest apps**: HTTP (`AppModule` — helmet CSP, CORS, 50 MB body limit, `/api` prefix, URI versioning, `/admin/public` static assets, Swagger at `/swagger`) + RabbitMQ microservice (`AppMicroserviceModule` on `amqps://…@${ARI_MQ_HOST}`, queue `ARI_QUEUE`, `durable: true`). Port from `ARI_PORT`. | Deploy: AWS Elastic Beanstalk + RDS (MySQL) + DynamoDB + OpenSearch + broker. |
| Client | `nest`-free Angular CLI build → `dist/research-indicators/browser`, served by Nginx-Alpine (SPA fallback). PWA service worker registers on production only. | CI: GitHub Actions (`unit-tests.yml`, `sonarcloud-analysis.yml`, `jenkins-trigger.yml`). Semver via `version:patch|minor|major`. |

---

## 2. Architecture Overview & Decisions

### 2.1 C4 — Context (level 1)

- **Actors:** research staff / MEL experts / center admins (via STAR client), partner platforms (PRMS, TIP, AICCRA — via machine tokens), and the AI pipeline (via REST + RabbitMQ).
- **System under design:** the ARI monorepo (Client SPA + Server API).
- **External systems:** ROAR Management + AWS Cognito (identity), CLARISA (vocabularies), AGRESSO (contracts/staff), TIP, lambda-toc, OpenSearch, DynamoDB, RabbitMQ, text-mining service, file-manager service, analytics SDKs.

### 2.2 C4 — Container (level 2)

| Container | Responsibility | Talks to |
| --- | --- | --- |
| **Client SPA** | Render UI, hold session/token, mirror role checks, WebSocket presence | Main API, text-mining, file-manager, Cognito, WebSocket, analytics |
| **Server HTTP app** | REST API, request envelope, auth, RBAC, Results lifecycle, Swagger | MySQL, OpenSearch, DynamoDB, CLARISA, AGRESSO, ROAR, TIP, lambda-toc |
| **Server microservice** | Consume `ARI_QUEUE` events; emit outbound messages | RabbitMQ broker |
| **Admin SSR panel** | Internal ops panel under `/admin` (React 19 + Vite SSR) | Main API (`/api/…`) only |
| **MySQL / OpenSearch / DynamoDB** | Durable store / search mirror / feedback store | Server only |

### 2.3 Robust-vs-lite tier sizing

The platform is deliberately **robust-tier** (multi-integration, multi-store, real-time, RBAC, audit) — **not** a lite CRUD app. Implications every spec must respect:

- Cross-cutting concerns (envelope, auth, RBAC, audit, logging, search mirroring) are **centralized** and non-negotiable — features plug into them, never reinvent them.
- New external systems get a dedicated **tool module** (server) or **domain service** (client); no transport leakage into controllers/components.
- The **admin panel** is a *lite* embedded surface inside the robust server — SSR React with no shared store yet, guarded separately.

### 2.4 Key architectural decisions (ADR-style)

| # | Decision | Rationale / consequence |
| --- | --- | --- |
| ADR-1 | **Monorepo, two independently deployable packages** | Shared contracts, separate release cadence; neither package imports the other's code. |
| ADR-2 | **Single HTTP envelope** — `ServerResponseDto` (server) == `MainResponse<T>` (client) | One wire contract, two names by perspective (see §6). |
| ADR-3 | **URI API versioning** (`/api/v1`, `/api/v2`) under global `/api` prefix | Explicit, cache-friendly, no header negotiation. |
| ADR-4 | **RBAC via `@Roles` + `RolesGuard`; Results add `ResultStatusGuard`** | Declarative authorization; `SYSTEM_ADMIN` bypass; lifecycle enforced at the API edge. |
| ADR-5 | **Append-only TypeORM migrations** | Merged migrations are immutable; forward-only schema evolution. |
| ADR-6 | **OpenSearch mapping generated from `@OpenSearchProperty` decorators** | Search schema co-located with the entity; no drift. |
| ADR-7 | **Client: standalone components + lazy `loadComponent`, no NgModules** | Smaller bundles, simpler DI, aligns with Angular 19 direction. |
| ADR-8 | **Client state: service-per-domain + Angular Signals, no NgRx** | Fine-grained reactivity without a global store; RxJS only for streams (HTTP/WS). |
| ADR-9 | **Two IdPs, one intent** — server trusts ROAR JWT + machine tokens; client authenticates via Cognito JWT | Human sessions via Cognito/ROAR; partner platforms via `client_id/secret` (see §10). |
| ADR-10 | **Real-time over Socket.IO** (server gateway ↔ `ngx-socket-io` client) | Presence, notifications, per-result change events; REST fallback when disconnected. |

---

## 3. Quality Attribute Scenarios (Non-Functional Requirements)

Each NFR is a testable scenario: *stimulus → measurable response*.

### 3.1 Security

| ID | Scenario | Measurable response |
| --- | --- | --- |
| SEC-1 | An unauthenticated request hits any `/api/v{n}` route not in the exclude list | Server returns `401` with the standard envelope; no domain data leaks. |
| SEC-2 | A machine token presents an unknown `client_id`/`client_secret` or a non-allowlisted origin/IP | `AppSecretsService.validation` rejects; `401` with an explicit reason. |
| SEC-3 | A `CONTRIBUTOR` calls a `@Roles(CENTER_ADMIN)` handler | `RolesGuard` denies with `403`; no state change; audit unaffected. |
| SEC-4 | Client access token is within refresh skew before an outbound call | `jWtInterceptor` refreshes proactively; after a second `401`, the user is logged out. |
| SEC-5 | Tokens or PII flow toward logs/analytics | Never emitted — tokens are excluded from logging and analytics SDK payloads. |

### 3.2 Performance

| ID | Scenario | Measurable response |
| --- | --- | --- |
| PERF-1 | Client initial production bundle is built | Initial ≤ **2 MB warning / 3 MB error**; component styles ≤ **4 kB warning / 8 kB error** (`angular.json` budgets). |
| PERF-2 | A user navigates to a feature route for the first time | Route JS is lazy-loaded on demand (`loadComponent`), not in the initial chunk. |
| PERF-3 | The bilateral ToC catalog is requested repeatedly within 5 min | Server serves from a 5-min backend cache (lambda-toc reads are not per-request); client fetches once per section load. |
| PERF-4 | A list endpoint is queried | Bounded by `page`/`limit`; module specs SHOULD declare a max `limit` to cap query cost. |

### 3.3 Scalability

| ID | Scenario | Measurable response |
| --- | --- | --- |
| SCAL-1 | Cross-system event volume spikes | Absorbed by RabbitMQ `ARI_QUEUE` (`durable: true`); consumers process asynchronously without blocking HTTP. |
| SCAL-2 | Search/read load grows | Served from OpenSearch mirror rather than MySQL primary; reindex driven by decorators. |
| SCAL-3 | Client static traffic grows | Stateless Nginx-Alpine containers scale horizontally; no server affinity. |

### 3.4 Availability

| ID | Scenario | Measurable response |
| --- | --- | --- |
| AVAIL-1 | The Socket.IO connection drops | Client UI keeps functioning via REST; it must **never** block on `connected`. |
| AVAIL-2 | An upstream integration (AGRESSO/CLARISA/TIP) fails during a scheduled sync | Failure is logged via `LoggerUtil` + recorded in `sync_process_log`; the API stays up. |
| AVAIL-3 | lambda-toc upstream is unavailable | Server serves warm-stale from cache; on cold cache → `503`; client keeps the prior value and offers retry. |
| AVAIL-4 | A new client build is deployed while a user has the app open | `VersionWatcherService` surfaces an app-update banner; no forced hard failure. |

---

## 4. Domain Modules & Responsibilities

### 4.1 Server modules

```
server/researchindicators/src/
├── main.ts / app.module.ts / app-microservice.module.ts   # HTTP + RMQ bootstrap
├── controllers/                    # cross-cutting non-domain (Azure)
├── admin/                          # SSR admin panel (Nest + Vite/React 19)
├── db/{config/mysql, config/dynamo, migrations}           # 238+ append-only migrations
└── domain/
    ├── routes/main.routes.ts       # RouterModule registration tree
    ├── entities/<module>/          # one Nest module per entity cluster
    ├── complementary-entities/     # secondary entities (e.g. user)
    ├── tools/                      # external integrations (one folder, one service)
    │   ├── agresso/ broker/ clarisa/ cron-jobs/ dynamo-feedback/
    │   ├── open-search/{results,prms,alliance-staff,core,decorators}
    │   └── roar-management/ socket/ tip-integration/
    └── shared/                     # interceptors, guards, pipes, filters, utils, DTOs
```

| Category | Path | Rule |
| --- | --- | --- |
| **Entity module** | `domain/entities/<name>/` | Wraps one entity/cluster with controller + service + DTOs + repository; exports its service; registers routes in `main.routes.ts`. |
| **Tool module** | `domain/tools/<integration>/` | Encapsulates transport; exposes one Nest service; reads `ARI_*` env vars. |
| **Shared module** | `domain/shared/` | Interceptors, guards, pipes, decorators, utils, enums, global DTOs, middleware. No business logic. |
| **Admin module** | `src/admin/` | SSR React panel; excluded from JWT middleware; needs its own `AdminGuard` (see §10). |
| **Cross-cutting controllers** | `src/controllers/` | Rare non-domain HTTP routes (currently Azure). |

Naming: files kebab-case; module folder == primary entity name; entities under `<module>/entities/*.entity.ts`, DTOs under `dto/*.dto.ts`, enums under `enum/*.enum.ts`.

### 4.2 Client modules

Organized by **page domain** under `src/app/pages/`, cross-cutting code under `src/app/shared/`.

| Module | Path | Responsibility |
| --- | --- | --- |
| **Platform shell** | `pages/platform/` | Authenticated shell — navbar, sidebar, child outlet |
| **Home** | `pages/platform/pages/home/` | Logged-in dashboard / entry actions |
| **Indicator** | `pages/platform/pages/indicator/`, `about-indicators/` | Indicator catalog & detail |
| **Results** | `pages/platform/pages/result/`, `results-center/`, `search-a-result/`, `load-result/` | Result lifecycle: create, edit (11 tabs + conditional Pool Funding alignment tab), search, hub |
| **Projects** | `pages/platform/pages/my-projects/`, `project-detail/` | Project portfolio & detail |
| **Dashboard** | `pages/platform/pages/dashboard/` | Aggregate analytics, Chart.js views |
| **Notifications** | `pages/platform/pages/notifications/` | Real-time feed |
| **Profile / About** | `pages/platform/pages/profile/`, `about/` | User settings, theme, app info |
| **Administration / Center Admin** | `pages/platform/pages/administration/center-admin/` | Bulk upload, SDG management, portfolio management, AGRESSO Pool Funding tag override, Bilateral Mapping (AGRESSO↔CLARISA project mapping CRUD) |
| **Auth / Landing** | `pages/login/`, `pages/auth/`, `pages/landing/` | Cognito entry & callback; public surface |
| **Real-time / OICR / Dynamic Fields** | `pages/room/`, `pages/oicr-download/`, `pages/dynamic-fields/` | WebSocket collaboration; public template download; form-field config utility |
| **Shared / Theme / Testing** | `src/app/shared/`, `theme/`, `testing/` | Components, services, pipes, interfaces; PrimeNG Aura preset (`roartheme.ts`); test harness/mocks |

Client spec work follows the same domain split; module folders map to `docs/specs/<module>/<feature>/`.

---

## 5. Data Model & Entities

### 5.1 Server persistence

- **Primary DB:** MySQL (utf8mb4 / `utf8mb4_unicode_520_ci`).
- **ORM:** TypeORM 0.3 with explicit migrations. `synchronize: false`, `migrationsRun: false`.
- **Datasource:** `src/db/config/mysql/orm.config.ts` with `CORE` (driven by `ARI_MYSQL_*`) and `TEST` (`ARI_TEST_MYSQL_*`) targets. Migrations table `migrations`, metadata `orm_metadata`.
- **DynamoDB:** feedback store only (`tools/dynamo-feedback/`, config under `db/config/dynamo/`).

**Auditable base** — all domain entities extend `AuditableEntity` (`domain/shared/global-dto/auditable.entity.ts`): created/updated user ids + timestamps, `is_active` semantics. Every mutation MUST populate these from `request.user` (set by `JwtMiddleware`).

### 5.2 Result aggregate (canonical example)

The `Result` entity (`domain/entities/results/entities/result.entity.ts`) is the domain hub:

- PK `result_id` (bigint, generated); stable business key `result_official_code`.
- Versioning: `version_id`, `is_snapshot`, `report_year_id`. Lifecycle: `result_status_id` (default `ResultStatusEnum.DRAFT`).
- Provenance: `is_ai`, `tip_id`, `platform_code`. Geo: `geo_scope_id → ClarisaGeoScope`, `comment_geo_scope`.
- ~30 `OneToMany` relations (contracts, levers, regions, countries, languages, keywords, institutions, users, evidences, OICRs, knowledge products, IP rights, actors, SDGs, tags, initiatives, impact areas, capacity sharing, innovation dev, quantifications, notable references, AI shadow tables, …).
- Indexes: `idx_results_snapshot_active_report_year` (`is_snapshot`,`is_active`,`report_year_id`); `idx_results_official_code_snapshot_report_year` (`result_official_code`,`is_snapshot`,`report_year_id`).

**Rules for `Result` changes:** (1) never mutate outside `ResultsService` (audit + status guard + snapshot rules); (2) new columns get a migration AND a `@OpenSearchProperty(...)` when searchable; (3) new relations follow `OneToMany` + `result_*` table-name convention.

**Status workflow** — `result_status` (states) + `result_status_transitions` (allowed transitions) + `result_status_workflow` (per-role/transition policy). Enforced at the edge by `ResultStatusGuard` + `RolesGuard`.

**OpenSearch mapping** — `@OpenSearchProperty(...)` on entity fields drives the mapping (`tools/open-search/decorators/`); `nestedType` exposes nested objects/arrays; reindex tooling reflects the decorators.

**Migrations** — 238+ as of 2026-05. Generate with `npm run migration:generate -- ./src/db/migrations/<name>`; apply with `npm run migration:execute`; **never edit a migration merged to `main`**.

### 5.3 Client-side view shapes

Authoritative source is the backend; the client mirrors TypeScript shapes under `src/app/shared/interfaces/`.

| Concept | Interface | Notes |
| --- | --- | --- |
| **Result** | `result.interface.ts` | Central record; fields span all 11 tabs (identity, lifecycle, general info, sub-entities). |
| **Result sub-entities** | one file each | `general-information`, `links-to-result`, `alliance-alignment`, `partners`, `evidence`, `oicr-details`, `ip-rights`, `capacity-sharing`, `policy-change`, `innovation-details`, `geographic-scope`. |
| **Project / Indicator / User** | `*.interface.ts` | Project metadata; five indicator types (1–5); current-user (`user_id`, `role_id`, `sec_role_id`, `focus_id`, center, platform). |
| **Cache state** | `cache.interface.ts` | Client UI state: current result/metadata, theme, modals, role flags. |
| **Controlled lists** | interfaces | institutions, countries, regions, subnational, SDGs, levers, sdg-targets, impact-areas, delivery-modality, languages, session-types/purposes, actor-types. |
| **Envelope** | `responses.interface.ts` | `MainResponse<T>` (see §6). |
| **Errors** | `http-error-response.interface.ts` | `HttpErrorResponse` + `ErrorDetailLike`. |

**Versioning (client view)** — results are versioned server-side; the client receives `version` and supports `?version=N` on `/result/:id`. `VersionWatcherService` observes transitions and surfaces stale-data prompts.

**Federation identity** — cross-platform identity is the pair (`platform_code`, `official_code`). Duplicate creation returns **HTTP 409** with the existing record reference; the client surfaces a link-to-existing flow.

---

## 6. API Surface & Contracts

### 6.1 The shared envelope — one contract, two names

The server's **`ServerResponseDto`** and the client's **`MainResponse<T>`** describe the **same HTTP wire envelope**, seen from producer vs consumer:

| Perspective | Type | Shape |
| --- | --- | --- |
| **Server (producer)** | `ServerResponseDto` (wrapped by `ResponseInterceptor`; errors by `GlobalExceptions`) | `{ data, status, description, errors, timestamp, path }` |
| **Client (consumer)** | `MainResponse<T>` (unwrapped by interceptors) | `{ successfulRequest, status, data, errorDetail? }` |

They are **not two contracts** — they are the two ends of one channel. The server always emits the enveloped body; the client always reads through `MainResponse<T>` and never parses a raw `T`. A breaking change to this envelope is a coordinated cross-team change (ADR-2).

```ts
// client-side consumer view
interface MainResponse<T> {
  successfulRequest: boolean;
  status: number;
  data: T;
  errorDetail?: {
    status: number; title: string; description?: string;
    errors?: Array<{ field: string; message: string }>;
  };
}
```

### 6.2 Server conventions (producer)

- Global prefix `/api`; **URI versioning** (`VersioningType.URI`), default v1, `@Version('2')` for v2 handlers.
- REST verbs: GET (list/detail), POST (create), PATCH (partial update), DELETE (remove). Query params kebab-case; arrays via `ListParseToArrayPipe`, booleans via `QueryParseBool`.
- Every controller MUST declare `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, and per-param `@ApiQuery`/`@ApiBody`.
- Routes composed in `domain/routes/main.routes.ts` via `RouterModule.register(mainRoute)`; nested children for sub-resources (`/results/:code/evidences`). Per-result routes use the `RESULT_CODE` token + `@GetResultVersion()` (populates `_resultsUtil.resultId/resultCode/platformCode`).
- Pagination/sorting: `page`, `limit`, `sort-order` (`ASC`/`DESC`), `sort-field` (entity enum). Default `DESC` on `code` unless a spec says otherwise.
- **AI ingestion:** `POST /api/v1/results/ai/formalize` (any authenticated user); `POST /api/v1/results/ai/formalize/bulk` (`@Roles(TECHNICAL_SUPPORT, CENTER_ADMIN, MEL_REGIONAL_EXPERT)`, strict `ValidationPipe`). Bulk surfaces per-row `error` + `message_error` for partial failures so the pipeline can retry per item.
- **RabbitMQ:** `Transport.RMQ`, queue `ARI_QUEUE`, durable. Handlers in `domain/tools/broker/` (`AlianceManagementApp`, `AiRoarMiningApp`, `SelfApp`, `MessageMicroservice`). Message envelopes documented per pattern in the broker module spec.
- **Socket.IO:** server gateway `domain/tools/socket/server.gateway.ts`; event taxonomy captured in a `docs/specs/socket/` module spec — never invented inline.

### 6.3 Client consumption (consumer)

Three backend services, URLs from `src/environments/environment*.ts`:

| Env var | Purpose | Owner |
| --- | --- | --- |
| `environment.mainApiUrl` | Primary REST backend (the ARI server) | Main API team |
| `environment.textMiningUrl` | AI/NLP auto-fill & extraction | Text-mining team |
| `environment.fileManagerUrl` | Evidence file upload/serve | File-manager team |

**Representative endpoints (via `ApiService`):** `POST /authorization/login`, `POST /authorization/refresh-token`; `GET /indicator-types`, `/indicators`, `/maturity-levels`; `GET /tools/clarisa/*` (institutions, sdgs, levers, sdg-targets, impact-areas, countries, languages, delivery-modality, session-types); `GET|POST /results`, `GET /results/search`, `GET|PATCH /results/:id`, `PATCH /results/:id/submit`, `DELETE /results/:id/:field`; `GET /results-center`, `/dashboards`, `/projects`, `/contracts`, `/metadata`; `PATCH /agresso/contracts/:code/pool-funding-tag`; `GET|PATCH /results/:resultCode/pool-funding-alignment` (PATCH → `409` once synced to PRMS); `GET /results/:resultCode/pool-funding-alignment/hlos-indicators` (level-based ToC catalog, sourced from lambda-toc through a 5-min backend cache).

**Client contract rules:**

- **Always** wrap HTTP behind `ApiService` (or a domain service that delegates to it) — no raw `HttpClient` in components.
- **Never** swallow `successfulRequest === false`; pass to `ActionsService` for a toast/alert.
- **409:** surface a structured "link to existing" / stale-version prompt; do not retry blindly.
- **401:** `jWtInterceptor` → refresh → retry once; a second `401` logs out.
- **Validation:** render `errorDetail.errors[]` inline next to the offending field.

---

## 7. Backend Workflows & Business Rules

### 7.1 Result lifecycle (server-authoritative)

1. `POST /results` creates a DRAFT, allocates `result_official_code` + initial `version_id`.
2. `PATCH /results/:code/{general-information|alignments|geo-location|…}` updates per-section; each pass: `ResultStatusGuard` (forbids edits in terminal states unless controlled-editing rights) → `RolesGuard` → audit capture via `request.user.sec_user_id`.
3. Submission/approval/rejection/archiving via `result-status/transitions`, validated against `result_status_workflow`.
4. **Snapshots:** on a status transition or report-year boundary, services MAY clone the `Result` graph into an `is_snapshot=true` row tied to the previous `report_year_id`.
5. **Versioning:** `version_id` increments on snapshots; `GET /results/:code/versions/:resultCode` returns the chain.

### 7.2 Controlled editing

MEL/center/system-admin roles may edit results in restricted states (per `SecRolesEnum` + `RolesGuard`). Module specs MUST enumerate, per endpoint, who can edit which status and which sections.

### 7.3 AI formalization

Payloads validated against `ResultRawAi` / `RootAi` DTOs. Single-result resolution: (1) resolve indicator/contract/lever/region from supplied codes (CLARISA/AGRESSO lookups); (2) resolve or create institutions/users via AI shadow tables (`result_institutions_ai`, `result_users_ai`); (3) persist as DRAFT with `is_ai=true`, emit a Socket.IO `result-created` event; (4) surface partial-failure rows in the bulk response.

### 7.4 Cron jobs

`agresso.cron.ts` (contracts/staff/contract-countries), `clarisa.cron.ts` (master data + reindex), `tip.cron.ts` (TIP pull), `sync-process-log.cron.ts` (retention). All cron jobs MUST write start/end + status to `sync_process_log` and log via `LoggerUtil`.

### 7.5 Client reflection of backend rules

The client mirrors these so users don't hit surprises mid-flow (backend still wins):

1. Result creation validates uniqueness of (`platform_code`, `official_code`) → `409` if duplicate.
2. Tab completion is independent — saving one tab doesn't require others.
3. Submission requires cross-tab required-field validation; client pre-checks before `PATCH /results/:id/submit`.
4. MEL-review transitions are server-driven; client reads `status_id` and renders permitted actions.
5. Center-admin actions need `role_id === 9` + matching `focus_id`/`sec_role_id` (mirrored by `RolesService`/`centerAdminGuard`).
6. Editing a stale version returns 409/410-style errors; client prompts reload.
7. Evidence files upload to the file-manager service first; the returned URL attaches to the result — never embed raw bytes in a result POST.

---

## 8. Frontend Architecture & State Boundaries

### 8.1 Component / routing style

- **Standalone components only** — no NgModules in new code. Lazy load via `loadComponent: () => import(...)` (`src/app/app.routes.ts`).
- **View transitions** enabled at the router (`withViewTransitions()`).
- **Path aliases** in `tsconfig.json` (mirrored in `jest.config.ts`): `@platform`, `@landing`, `@pages`, `@shared`, `@services`, `@guards`, `@envs`, `@interfaces`, … Selector prefix `app`.

### 8.2 State boundaries

| Layer | Primary tool | Where it lives |
| --- | --- | --- |
| Server cache | `ApiService` + per-domain services + `MainResponse<T>` | `shared/services/` |
| Client cross-cutting state | **Angular Signals** (`signal`, `computed`, `WritableSignal<T>`) | `shared/services/cache.service.ts` |
| Reactive streams (HTTP/WS) | **RxJS** | services + interceptors |
| Local component state | Signals (preferred) or component fields | inside components |
| Persisted state | `localStorage` (tokens, theme) via cache services | `cache.service.ts`, `dark-mode.service.ts` |
| URL state | Angular Router (params, query params) | `app.routes.ts` |

**No NgRx** — service-per-domain + signals is the established pattern. **No two-way binding** for cross-cutting state; use signals + setters.

### 8.3 Interceptors (order matters)

1. `jWtInterceptor` — attaches JWT, proactively refreshes near expiry, retries once on `401`.
2. `httpErrorInterceptor` — central error logging + toast/alert dispatch via `ActionsService`. URL-scoped toast exceptions for `refresh-token`, AI-formalize `502`, `400` on `/pool-funding-tag`, `400` on `/pool-funding-alignment` (inline-error path owns the message).
3. `resultInterceptor` — result-domain transformations (e.g. version handling).

### 8.4 Real-time (WebSocket)

- `WebsocketService` connects on app init via `ngx-socket-io`; emits `config-user` (name, userId, platform).
- Listens to `all-connected-users-<platform>`, `notifications`, `alert-<platform>`, `result.pool-funding-alignment.changed` (per-result subscription; dirty-state guard via info toast).
- Exposes signals (`userList`, `currentRoom`). **Degradation:** on disconnect the UI keeps working via REST; it must never block on `connected`.

### 8.5 Forms

Reactive forms via `@angular/forms`; each result tab is its own form (`shared-result-form` host pattern). Custom fields + PrimeNG inputs wrapped via `custom-fields.scss` / `custom-prime-force-styles.scss`. Client validation mirrors server; server wins on conflict.

### 8.6 Admin SSR panel (server-embedded frontend)

The server package also ships an SSR frontend under `src/admin/` (React 19 + react-router-dom 7 + Vite 7, rendered by `ReactRendererService`):

- Data flow: `AdminController` fetches `initialData` → `ReactRendererService.render(url, initialData)` returns HTML → client hydrates → optional `fetch('/api/...')` refresh.
- Boundaries: admin client code lives under `src/admin/client/` only; it calls `/api/...` (never private services); any state shared with STAR round-trips through ARI APIs. No admin React import from server code or vice versa.
- Build: dev `npm run dev` (Nest + Vite `:5173`); prod `nest build && vite build` → `dist/admin/public`.

---

## 9. Integration Points

### 9.1 Server integrations (`domain/tools/<integration>/`)

| Integration | Transport | Direction | Notes |
| --- | --- | --- | --- |
| **ROAR Management** | HTTP (axios) | ARI → ROAR | Validates JWT, returns user with roles. |
| **CLARISA** | HTTP (`ClarisaConnection`) | ARI ↔ CLARISA | Master data; routes via `clarisa.routes.ts`. |
| **AGRESSO** | MSSQL (`mssql`) + SOAP (`soap`) | ARI → AGRESSO | Contracts, staff, contract countries; cron-driven. |
| **TIP** | HTTP | ARI ↔ TIP | Pull + reconcile. |
| **OpenSearch** | HTTP | ARI → OpenSearch | Results, PRMS, Alliance Staff indexes; mapping via `@OpenSearchProperty`. |
| **DynamoDB feedback** | AWS SDK v3 | ARI ↔ DynamoDB | Feedback store. |
| **RabbitMQ broker** | AMQPS | ARI ↔ broker | Queue `ARI_QUEUE` + outbound message apps. |
| **Socket.IO** | WS | ARI → clients | Real-time result events for STAR. |
| **lambda-toc** | HTTP (`ARI_TOC_INTEGRATION_HOST`) | ARI → lambda-toc | Bilateral ToC catalog; 5-min server cache, not persisted. |
| **Azure** | HTTP | inbound | `src/controllers/azure-*.controller.ts`. |

**Rules:** every integration exposes a Nest service (controllers never call transport clients directly); logs failures via `LoggerUtil` + `sync_process_log` when scheduled; all hosts/creds via `ARI_*` env vars.

### 9.2 Client integrations

| Integration | Mechanism | Service / file |
| --- | --- | --- |
| **AWS Cognito** | OAuth-style redirect → `/auth` callback → token exchange | `cognito.service.ts`, `login.component`, `auth.component` |
| **Main API** | REST over HTTPS, `MainResponse<T>` envelope | `api.service.ts`, `to-promise.service.ts` |
| **Text-mining** | REST | `text-mining.service.ts` |
| **File-manager** | REST multipart upload → persistent URL | `file-manager.service.ts` |
| **WebSocket gateway** | Socket.IO via `ngx-socket-io` | `sockets/websocket.service.ts` |
| **CLARISA** | Indirect via main API (`/tools/clarisa/*`) | `get-clarisa-institutions-*.service.ts`, `get-subnational-by-iso-alpha.service.ts` |
| **Analytics** | Browser SDKs | Hotjar (`hotjar.service.ts`), Clarity (`clarity.service.ts`), GA (`google-analytics.service.ts`), BugHerd (`bug-herd.service.ts`) |
| **Service worker** | Angular ngsw (production only) | `ngsw-config.json`, `app.config.ts` |

Federation with STAR / TIP / PRMS / AICCRA is **read/link-only** from the client — it follows deep-link URLs supplied by the main API.

---

## 10. Security & Authorization Model

### 10.1 Server (producer of trust decisions)

**Transport:** Helmet strict CSP (Vite dev origin only in non-prod), CORS enabled, HTTPS terminated at Elastic Beanstalk / load balancer.

**Authentication** — `JwtMiddleware` runs on all routes except the exclude list: `GET /api/configuration/:key`, `GET /`, `ALL /admin(.*)`, `ALL /admin/public(.*)`, `ALL /.well-known(.*)`, `GET /favicon.ico`. Two token shapes:

1. **ROAR JWT** — validated against ROAR Management; populates `request.user` (`sec_user_id`, roles, …).
2. **Machine token** — base64(`{client_id, client_secret}`) validated by `AppSecretsService.validation(client_id, client_secret, originOrIp)` against `app_secrets` + `app_secret_host_list` (origin header, else resolved IP). Errors map to `UnauthorizedException` with explicit reasons (`Token not found`, `Invalid format token`, `Token expired`, `Invalid token`, `Unknown token error`).

**Authorization** — `SecRolesEnum`: `SYSTEM_ADMIN(1)`, `CONTRIBUTOR(3)`, `TECHNICAL_SUPPORT(7)`, `CENTER_ADMIN(9)`, `MEL_REGIONAL_EXPERT(10)` (+ deprecated values to retire). `RolesGuard` reads `@Roles(...)`; `SYSTEM_ADMIN` bypasses all role checks. `ResultStatusGuard` enforces lifecycle constraints on mutating Results endpoints.

**Admin panel** — `/admin` is currently JWT-excluded; before production exposure it MUST add an `AdminGuard` bound to roles like `SYSTEM_ADMIN`/`TECHNICAL_SUPPORT`.

**Secrets & limits** — all credentials in `ARI_*` env vars (`.env` gitignored); `app_secrets` + `app_secret_host_list` govern machine tokens; rotation policy is an open question. `express-rate-limit` installed; module specs SHOULD set controller-level defaults for high-traffic public endpoints.

### 10.2 Client (mirror of trust decisions)

- **AWS Cognito + JWT** (no alternative IdPs). Tokens (`access_token`, `refresh_token`, `exp`) in `localStorage`, mirrored in cache signals.
- `jWtInterceptor` performs proactive expiration checks before each request and refreshes within skew; refresh failure → clear tokens + redirect to `/login`.
- **Guards mirror the backend:** `rolesGuard` (authenticated/unauthenticated routing) and `centerAdminGuard` (composite: `role_id === 1` OR (`role_id === 9` AND focus/sec-role match)). `RolesService` exposes computed signals for role membership / feature visibility.
- **Never** trust the client for destructive policy — the backend rejects unauthorized writes regardless of UI.
- **Sensitive data:** no PII beyond account fields client-side; tokens never logged or sent to analytics; evidence uploads route through file-manager (never inlined); service workers do not cache authenticated API responses by default.

---

## 11. Error Handling & Observability

### 11.1 Server

- All thrown errors flow through `GlobalExceptions` (`@Catch()`), serialized into the shared envelope: `{ description: exception.name, status: exception.status ?? 500, errors: exception.response?.message ?? exception.message, timestamp, path }`. `ValidationPipe` errors surface as `400` in the same shape.
- Throw Nest HTTP exceptions (`UnauthorizedException`, `BadRequestException`, `ConflictException`, `NotFoundException`) — never raw `Error` on the HTTP path.
- **Logging** via `LoggerUtil` only. `LoggingInterceptor` logs the request boundary; `SetUpInterceptor` populates per-request context; `ResponseInterceptor` logs by status (≥500 `error`, 300–499 `warn`, 200–299 `verbose` only when `!IS_PRODUCTION && SEE_ALL_LOGS`).
- **Audit trail:** `AuditableEntity` columns per mutation; `sync_process_log` for cron; `result_status_transitions` + `result_status_workflow` for status changes.
- **Ops hooks:** Swagger at `/swagger`, admin SSR at `/admin`, AWS CloudWatch as the recommended log sink.

### 11.2 Client

- **Layered model:** `httpErrorInterceptor` (central trap) → `ActionsService` (toasts `global-toast`, alerts `global-alert`/`alert-tag`, structured form-field errors) → components subscribe to `ActionsService` signals.
- **Rule:** every error reaches the user as a human-readable toast/alert — never `console.log` and walk away in production. Validation errors render inline from `errorDetail.errors[]`. `409`/conflicts route to dedicated flows (duplicate-result link; stale-version reload).
- **Observability:** Hotjar + Microsoft Clarity (session replay/heatmaps), Google Analytics (page/event), BugHerd (in-product feedback), SonarCloud (static analysis), `VersionWatcherService` (app-update banners).
- **Open gaps:** no browser-side error-reporting service (Sentry-like); no structured RUM for Web Vitals beyond GA.

---

## 12. Testing Strategy

| Aspect | Server (`server/researchindicators`) | Client (`client/research-indicators`) |
| --- | --- | --- |
| Runner | Jest 29 + ts-jest | Jest via `jest-preset-angular` (`jest.config.ts`), `jsdom` |
| Layout | Sibling `*.spec.ts` per controller/service/guard/interceptor/middleware | Co-located `.spec.ts`; shared mocks in `src/app/testing/` |
| **Coverage floor** | **branches / functions / lines / statements = 60%** | **statements 40 / branches 20 / lines 45 / functions 30** |
| Exclusions | `*.entity.ts`, `db/migrations/**`, `*.enum.ts`, `*.spec.ts` | `app.config.ts`, `app.routes.ts`, `websocket.service.ts`, `alert.component.ts` |
| E2E | Supertest 7 via `npm run test:e2e` (`test/jest-e2e.json`) — top-level routes + auth-failure paths | None today; manual smoke over golden paths in [`../ux-ui/design.md`](../ux-ui/design.md) |
| Commands | `npm test`, `npm run test:watch`, `npm run test:cov`, `npm run test:e2e` | `npm test` (Jest) |

**Server patterns:** mock TypeORM repos with `jest.fn()` factories (no MySQL in unit tests); use the `TEST` datasource for integration coverage; mock RabbitMQ/Socket.IO/cron at module level; for each role-restricted or status-guarded handler, include both an "allowed" and a "denied" case.

**Client patterns:** test services (HTTP wiring via `HttpTestingController`, interceptors, role logic, cache mutations), components (rendering, role-conditional visibility, form validity, signal-driven transitions, error surfaces), guards/resolvers (pass/fail per role+token), and pipes/utilities (high pure-function coverage). Path aliases in `jest.config.ts` must stay in sync with `tsconfig.json`. Snapshot tests sparingly (they decay on a PrimeNG-heavy UI).

---

## 13. Technical Constraints & Assumptions

### 13.1 Server constraints

- Node ≥ 20.11.1; TypeScript 5.7; **NestJS 10.4**; TypeORM 0.3 + MySQL (utf8mb4, `utf8mb4_unicode_520_ci`).
- Body limits 50 MB JSON/urlencoded; admin static assets from `dist/admin/public` via `useStaticAssets`.
- CSP: dev allows Vite origin + `cdn.jsdelivr.net` + `cdnjs.cloudflare.com` — tighten for prod.
- **Migrations append-only** once merged; rollback via `npm run migration:revert`.

### 13.2 Client constraints (from `../prd.md`)

- **C-1** Angular 19 + PrimeNG 19 — no framework migration.
- **C-2** AWS Cognito + JWT — no alternative IdPs.
- **C-3** CLARISA is the controlled-vocabulary source.
- **C-4** WCAG 2.1 AA accessibility minimum.
- **C-5** Production bundle budgets: initial ≤ 3 MB error / 2 MB warning; component styles ≤ 8 kB error / 4 kB warning.
- **C-6** Standalone components + lazy `loadComponent` routes only.
- **Ops:** multi-stage `Dockerfile`, Nginx-Alpine serving `dist/research-indicators/browser` on port 80 with SPA fallback; service worker registers `registerWhenStable:30000`, production only.

### 13.3 Shared assumptions

- ROAR remains the canonical IDP for human users at the server edge; Cognito supplies human sessions to the client (region/userpool via `environment*.ts`).
- CLARISA + AGRESSO + TIP remain authoritative upstream systems; CLARISA endpoints stay stable enough for client-side caching.
- The `ServerResponseDto`/`MainResponse<T>` envelope is a stable cross-team contract; breaking it is a coordinated change.
- Deployment target: AWS (Elastic Beanstalk + RDS + DynamoDB + OpenSearch + broker) for the server; containerized Nginx for the client.
- Partner platforms consume `/api` REST or OpenSearch — never direct DB access.
- WebSocket gateway is same-domain (or CORS-permitted), compatible with `ngx-socket-io` 4.x.
- Bilateral ToC catalog: the reshaped `hlos-indicators` endpoint performs lambda-toc reads server-side with a 5-min cache (warm-stale on failure; cold → `503`); the client fetches once per section load and keeps prior value on error.

### 13.4 Open / risky areas

| Tier | Item |
| --- | --- |
| Server | Deprecated `SecRolesEnum` values need a migration plan; `/admin` needs `AdminGuard` before prod; Socket.IO event taxonomy + RabbitMQ message contracts under-documented; pagination defaults vary per controller; rate-limit not centrally enforced; secret-rotation policy undefined. |
| Client | Coverage thresholds intentionally low (raise gradually); some `custom-prime-force-styles.scss` rules ignore dark mode; no first-class error reporting (Sentry-like); no e2e suite (consider Playwright); `ngsw-config.json` has no asset/data groups (SW effectively a no-op offline). |

---

## 14. References

**Server:** `src/main.ts`, `src/app.module.ts`, `src/app-microservice.module.ts`; `src/domain/routes/main.routes.ts`; `src/domain/entities/results/`; `src/domain/shared/Interceptors/{response,logging,setup}.interceptor.ts`; `src/domain/shared/middlewares/jwr.middleware.ts`; `src/domain/shared/guards/{roles,result-status}.guard.ts`; `src/domain/shared/enum/sec_role.enum.ts`; `src/domain/shared/error-management/global.exception.ts`; `src/domain/tools/{clarisa,agresso,broker,cron-jobs,dynamo-feedback,open-search,roar-management,socket,tip-integration}/`; `src/db/config/mysql/orm.config.ts`, `src/db/migrations/*.ts`; `src/admin/README-REACT.md`.

**Client:** `src/app/app.routes.ts`, `src/app/app.config.ts`; `src/app/shared/services/{api,cache,to-promise}.service.ts`; `src/app/shared/interfaces/{result,responses,http-error-response}.interface.ts`; `src/app/shared/interceptors/{jwt,http-error,result}.interceptor.ts`; `src/app/shared/guards/{roles,center-admin}.guard.ts`; `src/app/shared/sockets/websocket.service.ts`; `src/environments/environment*.ts`; `jest.config.ts`, `angular.json`, `ngsw-config.json`, `nginx.conf`.

**Constitutional companions:** [`../prd.md`](../prd.md) · [`../ux-ui/design.md`](../ux-ui/design.md) · module specs under `../specs/<module>/<feature>/`.
