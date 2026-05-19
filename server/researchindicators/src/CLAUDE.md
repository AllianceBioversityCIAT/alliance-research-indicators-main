# Claude Guide — `server/researchindicators/src`

> **Parent guide:** [`../../../CLAUDE.md`](../../../CLAUDE.md). Read it first.
> **Constitutional baseline:**
> - [`../../../docs/prd.md`](../../../docs/prd.md)
> - [`../../../docs/system-design/design.md`](../../../docs/system-design/design.md)
> - [`../../../docs/detailed-design/detailed-design.md`](../../../docs/detailed-design/detailed-design.md)
> - [`../../../docs/specs/general-setup/`](../../../docs/specs/general-setup/) (spec templates)
>
> This file is the **working manual for code-level changes inside `src/`**. It does not restate intent (PRD), platform feel (system design), or full conventions (detailed design) — it tells you *where things live* and *how to add or change them without breaking baseline rules*.

---

## 1. What this package is

NestJS 10 HTTP service + RabbitMQ microservice + Socket.IO gateway + Vite/React 19 SSR admin panel.

Two Nest applications bootstrap from `main.ts`:
- **HTTP** (`AppModule`) — REST API under `/api/v{n}` + Swagger at `/swagger` + admin SSR under `/admin`.
- **Microservice** (`AppMicroserviceModule`) — RabbitMQ consumer on queue `ARI_QUEUE`.

---

## 2. Source map

```
src/
├── main.ts                       # bootstraps HTTP + microservice apps
├── app.module.ts                 # HTTP composition root
├── app-microservice.module.ts    # microservice (RMQ) composition root
├── app.controller.ts / .service.ts (+ specs)
│
├── admin/                        # /admin SSR panel (Vite + React 19)
│   ├── admin.module.ts
│   ├── controllers/admin.controller.ts
│   ├── services/{admin.service, react-renderer.service}.ts
│   ├── client/                   # React 19 client (Vite-built)
│   └── README-REACT.md           # how to add a new admin page
│
├── controllers/                  # cross-cutting non-domain controllers
│   └── azure-{data,status}.controller.ts
│
├── db/
│   ├── config/mysql/             # TypeORM datasource (CORE / TEST targets)
│   ├── config/dynamo/            # DynamoDB module + service
│   └── migrations/               # TypeORM migrations — APPEND-ONLY
│
└── domain/
    ├── routes/main.routes.ts             # RouterModule registration tree
    ├── entities/<module>/                # one Nest module per entity cluster
    │   ├── <module>.controller.ts
    │   ├── <module>.service.ts
    │   ├── <module>.module.ts
    │   ├── dto/ entities/ enum/ repositories/ (+ siblings)
    │   └── *.spec.ts
    ├── complementary-entities/secondary/ # e.g. user
    ├── tools/                            # external integrations
    │   ├── agresso/ broker/ clarisa/ cron-jobs/
    │   ├── dynamo-feedback/ open-search/{core,decorators,results,prms,alliance-staff}
    │   ├── roar-management/ socket/ tip-integration/
    └── shared/                           # cross-cutting concerns
        ├── Interceptors/{logging,response,setup}.interceptor.ts
        ├── error-management/global.exception.ts
        ├── middlewares/jwr.middleware.ts
        ├── guards/{roles,result-status}.guard.ts
        ├── decorators/{roles,versioning,...}.decorator.ts
        ├── pipes/{query-parse-boolean,list-parse-array,...}.pipe.ts
        ├── enum/ const/ examples/ mappers/ auxiliar/
        ├── global-dto/{server-response,service-response,auditable.entity}.ts
        └── utils/{logger,env,results,response,...}.util.ts
```

---

## 3. Where to put a new file

Decision tree:

1. **Owns an entity / table?** → `domain/entities/<module>/` with the full `controller + service + module + dto + entities + spec` set. Register routes in `domain/routes/main.routes.ts`.
2. **Wraps an external system?** → `domain/tools/<integration>/` exposing one Nest service. No transport leakage to other modules.
3. **Reusable across modules (interceptor, guard, pipe, decorator, util, base DTO)?** → `domain/shared/<kind>/`. Only put it here if at least two modules will use it. Otherwise keep it module-local.
4. **Touches the admin panel?** → server pieces under `admin/{controllers,services}/`, React under `admin/client/`. Follow `admin/README-REACT.md` for new pages.
5. **A schema change?** → migration under `db/migrations/<timestamp>-<camelCaseAction>.ts` via `npm run migration:generate`. Never edit a merged migration.
6. **Truly cross-cutting non-domain HTTP route (rare)?** → `src/controllers/`.

Naming:
- Files: kebab-case (`result-status.guard.ts`, `results.service.spec.ts`).
- Entities: `*.entity.ts` exporting a PascalCase class.
- DTOs: `*.dto.ts`.
- Enums: `*.enum.ts`.
- Specs: sibling `*.spec.ts`.

---

## 4. Adding an endpoint — the canonical recipe

1. **DTO** in `dto/<feature>.dto.ts` with `class-validator` + `@ApiProperty`.
2. **Service** method in `<module>.service.ts` — populate audit fields, respect status workflow, throw Nest HTTP exceptions for failures.
3. **Controller** handler in `<module>.controller.ts`:
   - Decorate with `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, and per-param `@ApiQuery` / `@ApiBody`.
   - Use `@Roles(...)` + ensure `RolesGuard` is on the controller (or the handler).
   - For result mutations, add `@UseGuards(ResultStatusGuard)` and use the `RESULT_CODE` path token + `@GetResultVersion()`.
   - Return the service promise wrapped in `ResponseUtils.format({ description, status, data })`.
4. **Route registration** — if it is a new sub-resource path, add a node under `domain/routes/main.routes.ts`. If it is a new endpoint on an existing controller, no route change needed.
5. **Tests** — extend `<module>.controller.spec.ts` + `<module>.service.spec.ts`. Add an e2e case under `test/` if it is a new public route.
6. **OpenSearch** — if a new field is searchable, decorate the entity column with `@OpenSearchProperty({...})` and follow the reindex path in `tools/open-search/`.
7. **Swagger sanity check** — confirm the endpoint shows up at `/swagger` with the right tag, params, and bearer-auth lock.

---

## 5. Auth, roles, and status — what's already wired

- `JwtMiddleware` (in `domain/shared/middlewares/jwr.middleware.ts`) runs globally except for the `exclude` list in `app.module.ts`: `/admin*`, `/admin/public*`, `/.well-known*`, `GET /`, `GET /favicon.ico`, `GET /api/configuration/:key`.
- Accepts **ROAR JWT** OR **machine token** (base64 of `{client_id, client_secret}`) validated by `AppSecretsService.validation(client_id, client_secret, originOrIp)` against `app_secrets` + `app_secret_host_list`.
- Sets `request.user` with `sec_user_id`, `roles`, etc.
- `RolesGuard` (`domain/shared/guards/roles.guard.ts`) reads `@Roles(...)` metadata. `SecRolesEnum.SYSTEM_ADMIN` bypasses role checks.
- `ResultStatusGuard` (`domain/shared/guards/result-status.guard.ts`) gates mutations on the result lifecycle.

Do NOT invent a new auth path. If a new partner type needs access, extend `app_secrets` / `app_secret_host_list` and document it in the relevant module spec.

---

## 6. Response, error, and logging envelope

- `ResponseInterceptor` wraps every successful response in `ServerResponseDto` and logs based on status.
- `GlobalExceptions` filter serializes all thrown errors into the same envelope shape.
- `LoggingInterceptor` records the request boundary; `SetUpInterceptor` populates per-request context (e.g. `ResultsUtil`).
- Always use `LoggerUtil` (`domain/shared/utils/logger.util.ts`) — not `console.*`, not `Logger` directly.

Throw Nest HTTP exceptions (`UnauthorizedException`, `BadRequestException`, `ConflictException`, `NotFoundException`) — never raw `Error`s on the HTTP path.

---

## 7. Persistence rules

- **MySQL** via TypeORM 0.3, utf8mb4 / `utf8mb4_unicode_520_ci`.
- Datasource targets in `db/config/mysql/orm.config.ts`: `CORE` (driven by `ARI_MYSQL_*`) and `TEST` (driven by `ARI_TEST_MYSQL_*`).
- Migrations are **append-only**. Generate with `npm run migration:generate -- ./src/db/migrations/<name>`. Revert one with `npm run migration:revert`.
- All domain entities extend `AuditableEntity` (`domain/shared/global-dto/auditable.entity.ts`). Services must populate audit fields from `request.user`.
- Indexes follow the `idx_<table>_<purpose>` convention (see `Result` entity for examples).
- DynamoDB usage is confined to `tools/dynamo-feedback/`; do not spread it elsewhere.

---

## 8. Integrations (one folder, one service)

Every integration in `domain/tools/<integration>/` MUST:
- Encapsulate transport (HTTP / SOAP / MSSQL / AWS SDK / WS) in a single Nest service.
- Read all secrets/hosts from `ARI_*` env vars.
- Log failures via `LoggerUtil` and (when scheduled) write to `sync_process_log`.
- Be cron-scheduled inside `tools/cron-jobs/<integration>.cron.ts` rather than from arbitrary services.

Existing integrations: `agresso/`, `broker/` (RabbitMQ apps), `clarisa/`, `cron-jobs/`, `dynamo-feedback/`, `open-search/`, `roar-management/`, `socket/`, `tip-integration/`.

Socket.IO event names + payload shapes are **not yet documented**; capture any new ones in a `docs/specs/socket/` module spec — do not invent them inline.

---

## 8.1 Bilateral Feature Flags

Bilateral rollout toggles live in `domain/shared/utils/env.utils.ts` and default to `false` unless the env string is exactly `true`:

- `ARI_BILATERAL_MODULE_ENABLED`
- `ARI_BILATERAL_PUSH_ENABLED`
- `ARI_BILATERAL_W3_SYNC_ENABLED`
- `ARI_BILATERAL_SP_TOC_SYNC_ENABLED`

---

## 9. Tests

- Framework: Jest 29 + ts-jest. Sibling `*.spec.ts` per controller / service / guard / interceptor / middleware.
- Run from `server/researchindicators/`: `npm test`, `npm run test:watch`, `npm run test:cov`, `npm run test:e2e`.
- Global coverage threshold: 60% (branches / functions / lines / statements). Coverage excludes `*.entity.ts`, `db/migrations/**`, `*.enum.ts`, `*.spec.ts`.
- Mock TypeORM repositories with `jest.fn()` factories. Do NOT spin up MySQL in unit tests; use the `TEST` datasource for integration coverage when needed.
- For each new role-restricted or status-guarded handler, include both an "allowed" and "denied" test case.

---

## 10. Things to NEVER do here

- Don't edit a migration after it's merged — generate a new one.
- Don't add a new `console.log` — use `LoggerUtil`.
- Don't return a raw object from a controller — always wrap via `ResponseUtils.format(...)` (the `ResponseInterceptor` will still envelope it, but explicit is better).
- Don't call a transport client (axios, mssql, AWS SDK, soap, OpenSearch HTTP) outside its `tools/` service.
- Don't add a new endpoint without Swagger annotations.
- Don't widen the JWT `exclude` list in `app.module.ts` without a spec + security review.
- Don't import admin React code from server code, or vice versa.
- Don't touch `client/` from any change made under `src/`.

---

## 11. Common commands (run from `server/researchindicators/`)

```bash
npm run dev                         # NestJS + Vite (admin) together
npm run start:dev                   # NestJS only (watch)
npm run dev:admin                   # Vite only (admin) on :5173
npm run build                       # build NestJS + admin
npm run lint                        # eslint --fix
npm test                            # jest unit
npm run test:cov                    # jest coverage
npm run test:e2e                    # jest e2e (test/jest-e2e.json)
npm run migration:generate -- ./src/db/migrations/<name>
npm run migration:execute           # apply against dist
npm run migration:dev:execute       # apply against src (ts-node)
npm run migration:revert
```

---

## 12. Where to look next

- Add or change a feature → write a spec under `docs/specs/<module>/<feature>/` using the templates in `docs/specs/general-setup/`.
- Question about intent → `docs/prd.md`.
- Question about API/admin/socket surface → `docs/system-design/design.md`.
- Question about implementation conventions in detail → `docs/detailed-design/detailed-design.md`.
- Question about the admin SSR panel itself → `src/admin/README-REACT.md`.
