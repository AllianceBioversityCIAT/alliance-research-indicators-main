# Detailed Design — Alliance Research Indicators (ARI) Backend

> Scope: the **server** package (`server/researchindicators`). The standalone `client/` app is out of scope and has its own detailed design.
>
> This document is the **technical implementation blueprint**. It locks in module layout, data model conventions, API surface conventions, workflows, integrations, security, observability, testing, and the constraints that all future module-level specs MUST inherit.

---

## 1. System Overview

ARI is a NestJS 10 + TypeScript service that exposes:

- A versioned REST API at `/api/v{n}/...` documented at `/swagger`.
- A Socket.IO gateway on the same HTTP application.
- A RabbitMQ microservice listener (queue `ARI_QUEUE`) for cross-system events.
- A Server-Side Rendered admin panel under `/admin` (React 19 + Vite).

It is the system of record for the **Results domain**. It pulls master data from CLARISA, contracts/staff from AGRESSO (MSSQL + SOAP), identity from ROAR Management, persists to MySQL via TypeORM, mirrors to OpenSearch via a custom `@OpenSearchProperty` decorator, and writes feedback to AWS DynamoDB.

### High-level topology
```
            ┌────────────────┐
            │   STAR (UI)    │  client/research-indicators (out of scope here)
            └───────┬────────┘
                    │ HTTPS + WS
            ┌───────▼────────┐         ┌──────────────────┐
            │ ARI Server     │◄────────┤  AI Pipeline     │
            │ (NestJS)       │   REST  └──────────────────┘
            │  /api/v{n}     │
            │  /swagger      │◄────────┤ PRMS / TIP / AICCRA (client_id/secret)
            │  /admin (SSR)  │
            │  Socket.IO     │────────►│ STAR (real-time)
            └──┬──┬──┬──┬──┬─┘
               │  │  │  │  │
   ┌───────────┘  │  │  │  └────────────┐
   ▼              ▼  ▼  ▼               ▼
 MySQL       OpenSearch  DynamoDB    RabbitMQ
 (TypeORM)   (Results,   (Feedback)  (Microservice
              PRMS,                   queue ARI_QUEUE)
              Alliance
              Staff)

 External: ROAR Management (auth), CLARISA (master data),
           AGRESSO (MSSQL + SOAP), TIP integration.
```

### Bootstrap
- `src/main.ts` boots two Nest applications:
  - HTTP app (`AppModule`) with helmet CSP, CORS enabled, 50 MB JSON/urlencoded body limit, global `/api` prefix, URI versioning, static assets for `/admin/public`, Swagger at `/swagger`.
  - RabbitMQ microservice (`AppMicroserviceModule`) on `amqps://${ARI_MQ_USER}:${ARI_MQ_PASSWORD}@${ARI_MQ_HOST}`, queue `ARI_QUEUE`, `durable: true`.
- Port comes from `ARI_PORT` env var.

---

## 2. Domain Modules & Responsibilities

### 2.1 Layout
```
src/
├── main.ts                       # HTTP + microservice bootstrap
├── app.module.ts                 # HTTP composition root
├── app-microservice.module.ts    # RMQ composition root
├── app.controller.ts             # health / root
├── app.service.ts
├── controllers/                  # cross-cutting controllers (Azure)
├── admin/                        # SSR admin panel (Nest + Vite/React)
│   ├── admin.module.ts
│   ├── controllers/admin.controller.ts
│   ├── services/{admin.service, react-renderer.service}.ts
│   └── client/                   # React 19 client (Vite)
├── db/
│   ├── config/mysql/             # TypeORM datasource for MySQL
│   ├── config/dynamo/            # DynamoDB module + service
│   └── migrations/               # 238+ TypeORM migrations
└── domain/
    ├── routes/main.routes.ts     # RouterModule registration
    ├── entities/                 # one folder per entity module
    ├── complementary-entities/   # secondary entities (e.g. user)
    ├── tools/                    # external integrations
    │   ├── agresso/
    │   ├── broker/               # RabbitMQ apps
    │   ├── clarisa/
    │   ├── cron-jobs/
    │   ├── dynamo-feedback/
    │   ├── open-search/{results, prms, alliance-staff, core, decorators}
    │   ├── roar-management/
    │   ├── socket/               # Socket.IO gateways
    │   └── tip-integration/
    └── shared/                   # cross-cutting (interceptors, guards, etc.)
```

### 2.2 Module categories
- **Entity modules** (`domain/entities/<name>/`): NestJS modules that wrap one TypeORM entity (or a small cluster) with a controller + service + DTOs + repository. Each must export its service for cross-module use and own its own route registration via `main.routes.ts`.
- **Tool modules** (`domain/tools/<integration>/`): integrations with external systems. Must encapsulate transport details and expose a Nest service to the rest of the app.
- **Shared modules** (`domain/shared/`): interceptors, filters, guards, pipes, decorators, utils, enums, global DTOs, middleware. No business logic.
- **Admin module** (`src/admin/`): SSR React panel. Routes excluded from JWT middleware; needs its own guard (see §8.4).
- **Cross-cutting controllers** (`src/controllers/`): non-domain controllers (currently Azure status/data) registered at the app level.

### 2.3 Naming conventions
- File names are kebab-case (`results.controller.ts`, `result-status.guard.ts`).
- Module folder == its primary entity name (singular or plural, follow the existing pattern of a given subdomain).
- TypeORM entities live under `<module>/entities/*.entity.ts`; DTOs under `<module>/dto/*.dto.ts`; enums under `<module>/enum/*.enum.ts`.

---

## 3. Data Model & Entities

### 3.1 Persistence
- Primary DB: **MySQL** (utf8mb4 / utf8mb4_unicode_520_ci).
- ORM: **TypeORM 0.3** with explicit migrations. `synchronize: false`, `migrationsRun: false`.
- Datasource defined in `src/db/config/mysql/orm.config.ts` with `CORE` and `TEST` targets driven by `ARI_*` env vars.
- Migrations table: `migrations`. Metadata table: `orm_metadata`.
- DynamoDB used only for the feedback store (`dynamo-feedback` tool); config under `src/db/config/dynamo/`.

### 3.2 Auditable base
All domain entities extend `AuditableEntity` (`domain/shared/global-dto/auditable.entity.ts`). At minimum it captures created/updated user ids + timestamps and `is_active` semantics where applicable. Every mutation MUST go through services that populate these fields from the current user (`request.user` set by `JwtMiddleware`).

### 3.3 Result aggregate (canonical example)
The `Result` entity (`domain/entities/results/entities/result.entity.ts`) is the hub of the domain. Key facts:

- PK: `result_id` (bigint, generated).
- Stable business key: `result_official_code` (bigint).
- Versioning: `version_id`, `is_snapshot`, `report_year_id`.
- Lifecycle: `result_status_id` defaults to `ResultStatusEnum.DRAFT`.
- Provenance: `is_ai`, `tip_id`, `platform_code`.
- Geo: `geo_scope_id` → `ClarisaGeoScope`; `comment_geo_scope`.
- ~30 `OneToMany` relations covering attachments (contracts, levers, regions, countries, languages, keywords, institutions, users, evidences, OICRs, knowledge products, IP rights, actors, institution types, SDGs, tags, initiatives, impact areas, capacity sharing, innovation dev, quantifications, notable references, AI shadow tables, etc.).
- Indexes:
  - `idx_results_snapshot_active_report_year` on (`is_snapshot`, `is_active`, `report_year_id`).
  - `idx_results_official_code_snapshot_report_year` on (`result_official_code`, `is_snapshot`, `report_year_id`).

> Rules for changes to `Result`:
> 1. Never mutate without going through `ResultsService` (audit + status guard + snapshot rules).
> 2. New columns get a migration AND a `@OpenSearchProperty(...)` if they should be searchable.
> 3. New relations follow the `OneToMany` + `result_*` table-name convention.

### 3.4 Status workflow
- `result_status` (states) + `result_status_transitions` (allowed transitions) + `result_status_workflow` (per-role/transition policy).
- Enforced at the API edge by `ResultStatusGuard` on mutating endpoints + by `RolesGuard` for role permissions.

### 3.5 OpenSearch mapping
- The `@OpenSearchProperty(...)` decorator on entity fields drives the OpenSearch mapping (see `domain/tools/open-search/decorators/opensearch-property.decorator.ts`).
- `nestedType` references other entities to expose nested objects/arrays. Reindex tooling should reflect the decorators.

### 3.6 Migrations
- 238+ migrations exist as of 2026-05.
- Convention: `npm run migration:generate -- ./src/db/migrations/<name>` — generates a timestamped file.
- Pre-deploy: `npm run migration:execute` (against `dist/...`).
- Never edit a migration once it has been merged to `main`.

---

## 4. API Surface & Contracts

### 4.1 Conventions
- Global prefix: `/api`.
- Versioning: URI (`VersioningType.URI`). Default is v1; explicit `@Version('2')` for v2 handlers.
- HTTP verbs follow REST: GET (list/detail), POST (create), PATCH (partial update), DELETE (remove).
- Query params are kebab-case; arrays parsed by `ListParseToArrayPipe`; booleans by `QueryParseBool`.
- Response envelope: `ServerResponseDto` via `ResponseInterceptor` — `{ data, status, description, errors, timestamp, path }`.
- Errors envelope: same shape via `GlobalExceptions` filter.
- Documentation: every controller MUST declare `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, and per-endpoint `@ApiQuery`/`@ApiBody`.

### 4.2 Route registration
- All module routes are composed in `domain/routes/main.routes.ts` and registered via `RouterModule.register(mainRoute)`.
- Nested children are used for sub-resources (`/results/:code/evidences`, `/results/:code/status/transitions`).
- Per-result routes use the `RESULT_CODE` token + `@GetResultVersion()` decorator, which populates `_resultsUtil.resultId` / `_resultsUtil.resultCode` / `_resultsUtil.platformCode` from the URL.

### 4.3 Pagination & sorting
- `page`, `limit` query params (integer).
- `sort-order` (`ASC`|`DESC`), `sort-field` (entity-specific enum, e.g. `ResultSortEnum`).
- Default sort order should be `DESC` on `code` unless the spec for a module says otherwise.
- Module specs SHOULD declare their max `limit` to bound query cost.

### 4.4 AI ingestion endpoints
- `POST /api/v1/results/ai/formalize` — single result, public to all authenticated users.
- `POST /api/v1/results/ai/formalize/bulk` — bulk; restricted via `@Roles(TECHNICAL_SUPPORT, CENTER_ADMIN, MEL_REGIONAL_EXPERT)`; uses `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Responses surface per-row `error` + `message_error` for partial failures (HTTP 400 with envelope) so the AI pipeline can retry per item.

### 4.5 Microservice (RabbitMQ) contract
- Transport: `Transport.RMQ`, queue `ARI_QUEUE`, durable.
- Message handlers live in `domain/tools/broker/` (`AlianceManagementApp`, `AiRoarMiningApp`, `SelfApp`, `MessageMicroservice`).
- Message envelope conventions MUST be documented per pattern in the broker module spec (see open work in `docs/system-design/design.md` §13).

### 4.6 Socket.IO
- Server gateway: `domain/tools/socket/server.gateway.ts` (uses default `@WebSocketGateway()`).
- Client gateway exists for outgoing emit patterns.
- Event names and payload shapes are not yet documented — module spec required (see Open Gaps).

---

## 5. Backend Workflows & Business Rules

### 5.1 Result lifecycle
1. `POST /results` creates a DRAFT result, allocates `result_official_code` + initial `version_id`.
2. `PATCH /results/:code/general-information|alignments|geo-location|...` updates per-section data. Each update:
   - Passes `ResultStatusGuard` (forbids edits in terminal states unless the user has controlled-editing rights).
   - Passes `RolesGuard` for any role-restricted handler.
   - Captures the editing user via `JwtMiddleware` → `request.user.sec_user_id` and writes audit fields.
3. Submission, approval, rejection, archiving happen via `result-status/transitions` — validated against `result_status_workflow`.
4. Snapshots: when a status transition or report-year boundary fires, services MAY clone the current `Result` graph into an `is_snapshot=true` row tied to the previous `report_year_id`.
5. Versioning: `version_id` increments on snapshots. `GET /results/:code/versions/:resultCode` returns the chain.

### 5.2 Controlled editing
- Per the role enum and `RolesGuard`, MEL/center/system admin roles can edit results in restricted states.
- Module specs (e.g. `docs/specs/results/`) MUST enumerate, per endpoint, who can edit what status and which sections.

### 5.3 AI formalization
- AI payloads are validated against `ResultRawAi` / `RootAi` DTOs.
- Resolution rules (single):
  1. Resolve indicator/contract/lever/region from supplied codes (CLARISA / AGRESSO lookups).
  2. Resolve or create institutions/users via the AI shadow tables (`result_institutions_ai`, `result_users_ai`).
  3. Persist as DRAFT with `is_ai=true`; emit a Socket.IO `result-created` event for STAR.
  4. Surface partial-failure rows in the bulk response.

### 5.4 Cron jobs
- `agresso.cron.ts` — pulls contracts/staff/contract-countries from AGRESSO; writes `sync_process_log`.
- `clarisa.cron.ts` — refreshes CLARISA master data; triggers OpenSearch reindex where mapped.
- `tip.cron.ts` — pulls TIP integration data.
- `sync-process-log.cron.ts` — retention/cleanup.
- All cron jobs MUST write start/end + status to `sync_process_log` and log via `LoggerUtil`.

---

## 6. Frontend Architecture & State Boundaries

The only frontend owned by **this** package is the **embedded Admin SSR panel** under `src/admin/`. The STAR client app lives in `client/` and is out of scope here.

### 6.1 Admin panel
- Stack: React 19, react-router-dom 7, Vite 7 (build), Nest `ReactRendererService` for SSR.
- Entry points: `entry-server.tsx` (SSR), `entry-client.tsx` (hydration).
- Data flow per page:
  1. `AdminController` route handler fetches `initialData` from services.
  2. `ReactRendererService.render(url, initialData)` returns a complete HTML string.
  3. Client hydrates; optional client-side `fetch('/api/...')` for refresh.
- State boundaries:
  - SSR initial render owns first paint state.
  - Client-side state lives in component `useState` for now (no shared store).
  - For shared state, the README recommends Zustand; React Query if data-heavy.
- Build:
  - Dev: `npm run dev` runs `start:dev` + `dev:admin` (Vite on `:5173`).
  - Prod: `npm run build` runs `nest build && vite build`; admin assets land in `dist/admin/public`.

### 6.2 Hard boundaries
- Admin client code MUST live under `src/admin/client/` only. No Admin React component may be imported from server code.
- Admin client MUST call `/api/...` endpoints — never private services directly.
- Any state shared with STAR must round-trip through ARI APIs.

---

## 7. Integration Points

| Integration | Location | Transport | Direction | Notes |
| --- | --- | --- | --- | --- |
| **ROAR Management** | `domain/tools/roar-management/` | HTTP (axios) | ARI → ROAR | Validates JWT, returns user with roles. |
| **CLARISA** | `domain/tools/clarisa/` | HTTP (`ClarisaConnection`) | ARI ↔ CLARISA | Pulls master data; module exposes routes via `clarisa.routes.ts`. |
| **AGRESSO** | `domain/tools/agresso/` | MSSQL (`mssql`) + SOAP (`soap`) | ARI → AGRESSO | Contracts, staff, contract countries. Cron-driven. |
| **TIP integration** | `domain/tools/tip-integration/` | HTTP | ARI ↔ TIP | Pull + reconcile TIP data. |
| **OpenSearch** | `domain/tools/open-search/` | HTTP | ARI → OpenSearch | Results, PRMS, Alliance Staff indexes; mapping via `@OpenSearchProperty`. |
| **DynamoDB feedback** | `domain/tools/dynamo-feedback/` | AWS SDK v3 | ARI ↔ DynamoDB | External feedback store. |
| **RabbitMQ broker** | `domain/tools/broker/` | AMQPS | ARI ↔ broker | Microservice queue `ARI_QUEUE` + outbound message apps. |
| **Socket.IO** | `domain/tools/socket/` | WS | ARI → clients | Real-time result events for STAR. |
| **Azure** | `src/controllers/azure-*.controller.ts` | HTTP | inbound | Azure data/status hooks. |

### 7.1 Integration rules
- Every integration MUST expose a Nest service; controllers MUST NOT call transport clients directly.
- Every integration MUST log failures via `LoggerUtil` and record them in `sync_process_log` when scheduled.
- Every integration MUST be configurable via env vars (no hardcoded hosts or creds).

---

## 8. Security & Authorization Model

### 8.1 Transport
- Helmet with a strict CSP (allowing Vite dev origin only in non-prod).
- CORS enabled (`app.enableCors()`).
- HTTPS terminated at Elastic Beanstalk / load balancer.

### 8.2 Authentication
- **JWT middleware** (`JwtMiddleware`) runs on all routes except the configured `exclude` list:
  - `GET /api/configuration/:key`
  - `GET /`
  - `ALL /admin(.*)`
  - `ALL /admin/public(.*)`
  - `ALL /.well-known(.*)`
  - `GET /favicon.ico`
- Two token shapes accepted:
  1. **ROAR JWT** — validated against ROAR Management; populates `request.user` with `sec_user_id`, roles, etc.
  2. **Machine token** — base64(`{client_id, client_secret}`) validated by `AppSecretsService.validation(client_id, client_secret, originOrIp)` against `app_secrets` + `app_secret_host_list`. Caller's `origin` header is used when present, else the resolved IP from `x-forwarded-for` / `req.socket.remoteAddress`.
- Token errors map to `UnauthorizedException` with explicit reasons: `Token not found`, `Invalid format token`, `Token expired`, `Invalid token`, `Unknown token error`.

### 8.3 Authorization
- Role enum: `SecRolesEnum` — `SYSTEM_ADMIN(1)`, `CONTRIBUTOR(3)`, `TECHNICAL_SUPPORT(7)`, `CENTER_ADMIN(9)`, `MEL_REGIONAL_EXPERT(10)` + deprecated values to retire.
- `RolesGuard` reads `@Roles(...)` metadata; `SYSTEM_ADMIN` bypasses all role checks.
- `ResultStatusGuard` enforces lifecycle constraints; used on mutating Results endpoints.

### 8.4 Admin panel
- Currently `/admin` is excluded from `JwtMiddleware`. Before production exposure, the admin module MUST add an `AdminGuard` (sketched in `src/admin/README-REACT.md`) bound to roles like `SYSTEM_ADMIN`/`TECHNICAL_SUPPORT`.

### 8.5 Secrets
- All credentials in env vars (`ARI_*`). `.env` is gitignored.
- `app_secrets` rows + `app_secret_host_list` allowlist govern machine tokens.
- Secret rotation policy is an open question (PRD §9, OQ-1).

### 8.6 Rate limiting
- `express-rate-limit` is installed. Global config is not documented in this baseline; module specs SHOULD set sensible defaults at the controller level for high-traffic public endpoints.

---

## 9. Error Handling & Observability

### 9.1 Error handling
- All thrown errors flow through `GlobalExceptions` (`@Catch()`), which serializes:
  ```
  {
    description: exception.name,
    status: exception.status ?? 500,
    errors: exception.response?.message ?? exception.message,
    timestamp: new Date().toISOString(),
    path: request.url
  }
  ```
- Validation errors come from `ValidationPipe` and surface as 400 with the same envelope.
- Domain errors should be thrown as Nest HTTP exceptions (`UnauthorizedException`, `BadRequestException`, `ConflictException`, `NotFoundException`) — never `throw new Error(...)` for HTTP paths.

### 9.2 Logging
- All logging goes through `LoggerUtil` (`domain/shared/utils/logger.util.ts`). It accepts context (controller, stack, request method/url/userId).
- `LoggingInterceptor` logs request/response at the HTTP boundary.
- `ResponseInterceptor` logs based on status:
  - ≥ 500 → `error`
  - 300–499 → `warn`
  - 200–299 → `verbose` (only when `!IS_PRODUCTION && SEE_ALL_LOGS`).
- `SetUpInterceptor` populates per-request context (e.g. `ResultsUtil` state).

### 9.3 Audit
- Every mutation writes to `AuditableEntity` columns.
- Cron jobs write to `sync_process_log`.
- Result status changes leave entries in `result_status_transitions` + `result_status_workflow`.

### 9.4 Operational hooks
- Swagger UI at `/swagger`.
- Admin SSR at `/admin` (status panel pending).
- AWS CloudWatch is the recommended log sink (PRD §5).

---

## 10. Testing Strategy

### 10.1 Unit tests
- Framework: Jest 29 + ts-jest.
- Layout: every controller, service, guard, interceptor, middleware ships a sibling `*.spec.ts`.
- Coverage thresholds (global): branches 60% / functions 60% / lines 60% / statements 60% (enforced via `package.json` Jest config).
- Run: `npm test` (in `server/researchindicators`). Watch: `npm run test:watch`. Coverage: `npm run test:cov`.

### 10.2 E2E / API tests
- Supertest 7 via `npm run test:e2e` (`test/jest-e2e.json`).
- Target: top-level routes with the `ResponseInterceptor` envelope, including auth-failure paths.

### 10.3 Test patterns
- Mock TypeORM repositories with `jest.fn()` factories; do NOT spin up MySQL in unit tests.
- For integration coverage of complex queries, prefer the `TEST` datasource target (env-isolated `ARI_TEST_*` MySQL).
- For RabbitMQ/Socket.IO/cron: use module-level mocks; do not test the transports themselves.

### 10.4 Coverage exclusions
- `*.entity.ts`, `db/migrations/**`, `*.enum.ts`, `*.spec.ts` are excluded from coverage collection.

---

## 11. Technical Constraints & Assumptions

### Constraints
- **Node** ≥ 20.11.1.
- **TypeScript** 5.7.
- **NestJS** 10.4.
- **TypeORM** 0.3 + MySQL (utf8mb4, `utf8mb4_unicode_520_ci`).
- **Body limits**: 50 MB JSON / urlencoded.
- **Static admin assets**: served from `dist/admin/public` via `useStaticAssets`.
- **CSP**: dev allows Vite origin (`http://localhost:5173`) + cdn.jsdelivr.net + cdnjs.cloudflare.com; tighten for prod (see Open Gaps).
- **Migrations are append-only** once merged; rollback uses `npm run migration:revert`.

### Assumptions
- ROAR remains the canonical IDP for human users.
- CLARISA + AGRESSO + TIP remain authoritative upstream systems.
- AWS Elastic Beanstalk + RDS + DynamoDB + OpenSearch + (broker) is the deployment target.
- Partner platforms either consume `/api` REST or OpenSearch — not direct DB access.

### Open / risky areas
- Deprecated roles in `SecRolesEnum` — migration plan needed.
- `/admin` excluded from JWT — needs `AdminGuard` before prod exposure.
- Socket.IO event taxonomy + RabbitMQ message contracts are under-documented.
- Pagination defaults vary per controller — standardize.
- Rate-limit policy is not centrally enforced.

---

## 12. References

- `src/main.ts`, `src/app.module.ts`, `src/app-microservice.module.ts`
- `src/domain/routes/main.routes.ts`
- `src/domain/entities/results/` (canonical domain module)
- `src/domain/shared/Interceptors/response.interceptor.ts`, `logging.interceptor.ts`, `setup.interceptor.ts`
- `src/domain/shared/middlewares/jwr.middleware.ts`
- `src/domain/shared/guards/{roles,result-status}.guard.ts`
- `src/domain/shared/enum/sec_role.enum.ts`
- `src/domain/shared/error-management/global.exception.ts`
- `src/domain/tools/{clarisa, agresso, broker, cron-jobs, dynamo-feedback, open-search, roar-management, socket, tip-integration}/`
- `src/db/config/mysql/orm.config.ts`, `src/db/migrations/*.ts`
- `src/admin/README-REACT.md` (admin SSR panel)
- Root `README.md` (cross-functional requirements)
