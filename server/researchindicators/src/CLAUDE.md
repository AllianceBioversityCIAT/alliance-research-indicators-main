# Claude Guide — `server/researchindicators/src`

> **Parent guide:** [`../../../CLAUDE.md`](../../../CLAUDE.md). Read it first.
> **Constitutional baseline:**
> - [`../../../docs/prd.md`](../../../docs/prd.md)
> - [`../../../docs/ux-ui/design.md`](../../../docs/ux-ui/design.md)
> - [`../../../docs/trd/trd.md`](../../../docs/trd/trd.md)
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
│   ├── baseline/                 # committed schema-only snapshot bootstrapping the disposable TEST scratch schema (baseline.sql + README.md)
│   ├── migrations/               # TypeORM migrations — APPEND-ONLY. Specs may NOT live here (see §3)
│   └── migration-specs/          # unit specs FOR migrations — sibling dir, deliberately outside the migrations glob (§3)
│
└── domain/
    ├── routes/main.routes.ts             # RouterModule path-prefix tree (NOT module instantiation — see §4)
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

1. **Owns an entity / table?** → `domain/entities/<module>/` with the full `controller + service + module + dto + entities + spec` set. Register the route node in `domain/routes/main.routes.ts` **and add the module to `domain/entities/entities.module.ts`'s `imports`** — both, never just the route node (see *Registering a module* below).
2. **Wraps an external system?** → `domain/tools/<integration>/` exposing one Nest service. No transport leakage to other modules.
3. **Reusable across modules (interceptor, guard, pipe, decorator, util, base DTO)?** → `domain/shared/<kind>/`. Only put it here if at least two modules will use it. Otherwise keep it module-local.
4. **Touches the admin panel?** → server pieces under `admin/{controllers,services}/`, React under `admin/client/`. Follow `admin/README-REACT.md` for new pages.
5. **A schema change?** → migration under `db/migrations/<timestamp>-<camelCaseAction>.ts` via `npm run migration:generate` (or `npm run migration:empty --name=<name>` when there is no entity to diff against). Never edit a merged migration.
   - ⚠️ **Its spec does NOT go beside it.** Put migration specs in **`db/migration-specs/`**. See the naming/placement trap in §9.
6. **Truly cross-cutting non-domain HTTP route (rare)?** → `src/controllers/`.

Naming:
- Files: kebab-case (`result-status.guard.ts`, `results.service.spec.ts`).
- Entities: `*.entity.ts` exporting a PascalCase class.
- DTOs: `*.dto.ts`.
- Enums: `*.enum.ts`.
- Specs: sibling `*.spec.ts` — **except migration specs**, which live in `db/migration-specs/`, never in `db/migrations/` (§9).

---

## 4. Adding an endpoint — the canonical recipe

1. **DTO** in `dto/<feature>.dto.ts` with `class-validator` + `@ApiProperty`.
2. **Service** method in `<module>.service.ts` — populate audit fields, respect status workflow, throw Nest HTTP exceptions for failures.
3. **Controller** handler in `<module>.controller.ts`:
   - Decorate with `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, and per-param `@ApiQuery` / `@ApiBody`.
   - `@Roles(...)` + `RolesGuard` **only where the endpoint genuinely has a role rule.** ⚠️ **Result *section* controllers do NOT use `@Roles`** — section access is JWT + `ResultStatusGuard`, and adding roles makes your section the only one with an access rule the STAR client does not mirror (an AC-Role-Correctness hazard, not hardening). Verified by grep 2026-08-20: of the 15 controllers carrying `RESULT_CODE`, **zero** declare `@Roles`; the only `@Roles` under `entities/results/` are on `results.controller.ts`, the aggregate controller, not on a section. Precedent: `docs/specs/archive/2026-08-20-innovation-use--details-api/` **DD-5**.
   - For result mutations, add `@UseGuards(ResultStatusGuard)` and use the `RESULT_CODE` path token + `@GetResultVersion()`.
   - Return the service promise wrapped in `ResponseUtils.format({ description, status, data })`.
4. **Route registration — two steps, and the second is the one people miss.** If it is a new sub-resource path, add a node under `domain/routes/main.routes.ts` **and** register the module in the module-graph file that instantiates it. If it is a new endpoint on an existing controller, no route change is needed.

   > **A route node is NOT a registration.** `RouterModule.register()` stamps a `MODULE_PATH` prefix onto a module constructor, looks the module up in `modulesContainer`, and **returns silently when it is not there**. There is no boot error and no warning — every handler on the module just returns **`404`**. The module-graph file is `domain/entities/entities.module.ts` for entity modules and `domain/tools/clarisa/clarisa.module.ts` for CLARISA control lists; a tool module goes in its own tool module.
   >
   > **Mocked-provider unit specs cannot catch this, and neither can a spec asserting the shape of the `route` array.** The falsifiable assertion is over the module graph: `expect(Reflect.getMetadata('imports', EntitiesModule)).toContain(YourModule)`. See `domain/tools/clarisa/clarisa.module.spec.ts` and `domain/entities/entities.module.spec.ts` for the two shapes — plain membership when the module has a single incoming edge, a transitive reachability walk when it has several.
   >
   > This shipped twice in one spec (2026-08-19, `docs/specs/innovation-use/details-api` — DD-15), each time with a full green suite over four `404` endpoints.
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
- **⚠ In a migration that passes NO parameters, never let a `?` or `:word` appear in the SQL — including inside a SQL comment.** `orm.config.ts:59` sets `extra.namedPlaceholders: true`, so mysql2 rewrites every query through `named-placeholders` first. Its pattern (`named-placeholders/index.js:6`) is `/(?:\?)|(?::(\d+|[a-zA-Z][a-zA-Z0-9_]*))/` — a bare **`?`** counts, not just `:name`. It skips quoted strings (which is why `'…text-align:justify;…'` in the 2024 indicator migrations is fine) but has **no notion of SQL comments**, so a `?` or `:word` in a `--` or block comment is consumed as a bind parameter. With no params argument the call throws `Named query contains placeholders, but parameters object is undefined` *before MySQL parses it*. A query that legitimately uses `?` and passes an array (see `1781879906673-AddNewEnvCl.ts`) is unaffected — the parameters are there. Inside comments, drop the colon (`[SPEC bilateral/…]`) and end questions with a period. TSDoc blocks are never sent to the driver and keep the normal form.
- **The only sound gate for the rule above is running the migrations** (`npm run migration:dev:execute` against a scratch schema). Migration `1784500000000` shipped **unrunnable from the day it was written** and passed every static gate the repo has — valid TypeScript, lint-clean, type-clean, reviewed — because the one property that matters, *does it run*, was measured by nothing. A static scanner was attempted and withdrawn: reconstructing the SQL that reaches the driver requires the driver's own tokenizer **and** the call-site parameter analysis, and two versions of it disagreed with reality in opposite directions (Kaizen K-006).
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

## 9. Tests

- Framework: Jest 29 + ts-jest. Sibling `*.spec.ts` per controller / service / guard / interceptor / middleware.
- Run from `server/researchindicators/`: `npm test`, `npm run test:watch`, `npm run test:cov`, `npm run test:e2e`.
- Global coverage threshold: 60% (branches / functions / lines / statements). Coverage excludes `*.entity.ts`, `db/migrations/**`, `*.enum.ts`, `*.spec.ts`.
- Mock TypeORM repositories with `jest.fn()` factories. Do NOT spin up MySQL in unit tests; use the `TEST` datasource for integration coverage when needed.
- For each new role-restricted or status-guarded handler, include both an "allowed" and "denied" test case.
- **Migration specs live in `db/migration-specs/`, NOT beside their migration (added 2026-08-18, `docs/specs/innovation-use/data-model-and-catalog` T-04).** `orm.config.ts:55` sets its migrations glob to ``${__dirname}/../../migrations/**/*{.ts,.js}`` (resolving to `src/db/migrations/**`), and the TypeORM CLI **`require()`s every match** expecting a `MigrationInterface` export. A `*.spec.ts` inside `db/migrations/` therefore runs its top-level `describe(...)` outside the Jest runtime and crashes the migration runner with `ReferenceError: describe is not defined` — so `migration:test:execute` / `migration:execute` break, not just the tests. `db/migration-specs/` is collected by `npm test` (`rootDir: "src"`), is outside the migrations glob, and is kept out of `dist/` by `tsconfig.build.json`'s `"**/*spec.ts"`. **Do not "fix" this by narrowing the glob** — TypeORM's importer takes positive globs only, and the same datasource file drives **CORE production** migration runs.
- **Fixture suite (added 2026-08-18, `docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id` T-01b):** regression fixtures that need a real, disposable MySQL run under a **third** Jest config, `npm run test:fixtures` (`test/jest-fixtures.json`) — see §11 for the TEST-datasource harness commands that must bring the schema up first. **Naming trap:** that config's `testRegex` collects **only** `*.fixture-spec.ts`. Name a fixture plain `*.spec.ts` and it is collected by **neither** `npm test` nor `npm run test:fixtures` — a silent zero-tests-collected pass, not a failure you'd notice.
- **FP-45 — the `result_official_code` band registry (added 2026-08-19, `docs/specs/innovation-use/data-model-and-catalog` T-14).** Fixture files under `test/fixtures/innovation-use/` and its sibling `test/fixtures/sp-versioning-objective-blocks.fixture-spec.ts` share the `results` table, so each reserves its own `result_official_code` band to avoid colliding on a concurrent run. **There is no written registry — read the fixture files' own header comments, don't copy a list on trust.** As read 2026-08-19, the bands in use are: `900_000` (`sp-versioning-objective-blocks.fixture-spec.ts`), `900_100` (`innovation-use-validation.fixture-spec.ts`), `900_200` (`innovation-use-lifecycle-routines.fixture-spec.ts`), `900_300` (`innovation-use-detail-round-trip.fixture-spec.ts`), `900_400` (`green-check-ip-rights.fixture-spec.ts`), `900_500` (`innovation-dev-lifecycle-routines-unchanged.fixture-spec.ts` — added after this file collided with `900_300` on rework attempt 1; its own header records the collision and the reassignment), `900_600` (`innovation-dev-validation-behavioral.fixture-spec.ts`, reserved to avoid repeating the same collision). **That is seven bands, not five** — two were added after a real collision, and the registry each new fixture must read is the union of every sibling file's header comment, not a fixed list from an earlier spec. The **private band `9161`–`9166`** (fabricated CLARISA-style foreign ids: innovation nature/type/readiness/anticipated-users/actor-type/institution) is also still in use, in `innovation-dev-validation-behavioral.fixture-spec.ts`. Before adding a new fixture that inserts into `results`, grep every `*.fixture-spec.ts` header for its declared band and take the next unused one.
- **FP-48 — two seeding disciplines are opposed and both correct (added 2026-08-19, same spec).** A *routine copy-path* fixture (e.g. the F16-style lifecycle-routine gates) wants **maximally distinct** sentinel values on every column, so a positional transposition in a copy block becomes visible when compared row-for-row. A *validation-function* fixture wants **literal domain values**, because several predicates compare a column with `= TRUE` — i.e. equality against `1` — so a sentinel of `2`–`6` silently takes the `FALSE` branch and the fixture passes for the wrong reason. Recording only one of these as "the fixture pattern" produces a silent failure the next time the other kind is written — check which discipline a new fixture needs before choosing its seed values.
- **FP-49 — `migration:test:bootstrap` is NOT idempotent (added 2026-08-19, same spec).** It runs `baseline:test:load` then `migration:test:execute` unconditionally. Re-running it against an already-migrated container raises `ER_TABLE_EXISTS_ERROR` and strands the schema mid-migration. Run it **exactly once per fresh container**; recover only via `compose:test:down` → `compose:test:up` → `migration:test:bootstrap`. Harmless to trust — it fails loudly — but expensive to diagnose if you don't already know the cause.
- **FP-46 — `global-setup.ts`'s `INSERT IGNORE` is a known harness limitation, not a defect to fix (added 2026-08-19, same spec).** The fixture suite's Jest `globalSetup` seeds foundational cross-file rows (`reporting_platforms`, `result_status`, `actor_roles`, `institution_type_roles`) via `INSERT IGNORE`, which downgrades FK/`NOT NULL`/truncation failures to silent warnings. Today every seeded row is a root catalog value with no outgoing FK, so it cannot misfire. If a future migration adds a constraint on one of these rows, the seed becomes a silent no-op that resurfaces as a confusing MySQL 1452 somewhere else entirely — a known, accepted risk, not something to "fix" by changing `INSERT IGNORE` here.
- **FP-51 — NO DDL against the shared scratch schema while `test:fixtures` runs (added 2026-08-27, `docs/specs/changes/measure-number-signed-decimal` T-08, measured).** `test/jest-fixtures.json` sets no `maxWorkers` and no `runInBand`, so fixture files run **in parallel against one MySQL container**. A fixture that issues DDL on a shared table — `ALTER`, `DROP`, `TRUNCATE` — bumps the table definition version and any sibling that has already opened that table inside a transaction dies with **`1412 ER_TABLE_DEF_CHANGED`**, *in the sibling*, not in the file that caused it. **Measured, not reasoned:** a draft T-08 fixture that `ALTER`ed `result_quantifications` to reach a `bigint` branch failed **4 of 5** `test:fixtures` runs, always in `innovation-use-level-boundary.fixture-spec.ts`; replacing the `ALTER` with a session-scoped `CREATE TEMPORARY TABLE` gave **8 consecutive clean runs** (5 by the implementer, 3 re-measured by the Leader).
  - **The safe substitute:** a `CREATE TEMPORARY TABLE` is session-scoped and invisible to every other connection, so it can carry a different column type for as long as you need it. Prove the expression against *that*, and pin the expression's provenance separately.
  - **The hazard is broader than fixtures.** It is *any* DDL against the shared scratch schema while `test:fixtures` is running — including from another command. `test/support/t13-schema.ts:74-80` already contains a committed `DROP TABLE … results`, reachable by running `npm run test:integration` and `npm run test:fixtures` concurrently against the same container.
  - **A one-off `ALTER` outside the runner is still fine** — `1412` needs a *concurrent* session holding an open definition. Two migration tasks in the same spec did exactly that via `docker exec` with nothing in flight and were unaffected. The rule is about **committed, parallel-collected test code**, not about the statement.
  - ⚠️ **Do not "fix" this by setting `maxWorkers: 1`** on `jest-fixtures.json`: that taxes all 17 suites to guard a hazard none of them currently trips, and the committed fixtures are clean (verified by grep at the time of writing). Keep the fixtures DDL-free instead.

- **FP-50 — cite by anchor, not by line number, whenever the cited file could move (added 2026-08-19; ~~"a cross-file line citation is fine"~~ **AMENDED 2026-08-20**, `docs/specs/innovation-use/details-api`).** This is a measurement, not a style preference: six of the originating spec's seven inaccurate citations were same-file line numbers invalidated by the very edit that introduced them (an eighth was averted only by switching to an anchor). An anchor — a heading, a table's `#` column, a symbol name, a distinctive quoted phrase — survives.

  **The rule as first written was too narrow, and the narrowing was caused by its own evidence.** It blessed cross-file line citations, because in the spec that produced the measurement *six of seven* failures happened to be same-file — a spec that did not edit the files it cited. **The real hazard is not the file boundary; it is the citing and cited files sharing an edit window.** `docs/specs/innovation-use/details-api` then broke exactly that way: `innovation-use-section-round-trip.fixture-spec.ts:498` cites `result-actors.service.ts:244` for `SetAuditEnum.NEW`, which now lives at 138/265; `:709` cites `result-institution-types.service.ts:240`, which is now inside a doc comment. Both were correct when written and were killed by that spec's own edits to the cited files. *A rule derived from one failure distribution inherits that distribution's blind spots.*

  **The rule now:** a line citation is acceptable only when the cited file is **outside the spec's change surface** and is not expected to change in the same rework loop; otherwise cite by anchor. **Two corollaries, both learned the hard way:**
  - *Outside the change surface is necessary but not sufficient.* A `node_modules` citation (e.g. `UpdateQueryBuilder.js:401-403`) needs no repo edit at all to rot — a dependency bump does it. Cite library internals by symbol plus a quoted fragment.
  - *An anchor is only an anchor if it resolves.* One rework round was spent on a comment citing a "FAIL-B block above" that did not exist, and attributing `removeDuplicates`/`uniqueData` to a service having neither — a parenthetical lifted from a sibling file with the direction word hand-flipped. **Grep every reference you write before you report it**; a same-file anchor pointing at nothing fails this rule more completely than the line number it replaced.

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
npm run lint                        # eslint --fix  ⚠ MUTATES — see below
npx eslint <path>                   # verification gate (read-only, no --fix)
npm test                            # jest unit
npm run test:cov                    # jest coverage
npm run test:e2e                    # jest e2e (test/jest-e2e.json)
npm run migration:generate -- ./src/db/migrations/<name>
npm run migration:execute           # apply against dist
npm run migration:dev:execute       # apply against src (ts-node)
npm run migration:revert

# TEST-datasource harness (docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id, T-01b)
# — disposable scratch MySQL. NEVER point any of these at ARI_MYSQL_*.
npm run compose:test:up             # bring up the scratch container (docker-compose.test.yml)
npm run baseline:test:load          # load the committed snapshot (src/db/baseline/baseline.sql)
npm run migration:test:execute      # apply migrations against the TEST datasource
npm run migration:test:bootstrap    # = baseline:test:load THEN migration:test:execute — load must precede apply
npm run migration:test:revert       # revert last migration on the TEST datasource
npm run compose:test:down           # tear the scratch container down
npm run test:fixtures                # jest --config test/jest-fixtures.json — collects ONLY *.fixture-spec.ts files
```

---

> **⚠ `npm run lint` cannot verify anything (Kaizen K-001).** It is `eslint --fix`: it rewrites the
> working tree and exits `0`, so it makes the thing it checks true as a side effect of checking it.
> A spec once reported "lint clean" across ~10 tasks while the **committed branch failed Prettier** —
> the green runs only passed because the auto-fix was already sitting in the working tree, uncommitted.
> **For verification use `npx eslint <path>` (no `--fix`).** To check what is actually committed:
> `git show HEAD:<path> | npx eslint --stdin --stdin-filename <path>`.

## 12. Where to look next

- Add or change a feature → write a spec under `docs/specs/<module>/<feature>/` using the templates in `docs/specs/general-setup/`.
- Question about intent → `docs/prd.md`.
- Question about API/admin/socket surface → `docs/ux-ui/design.md`.
- Question about implementation conventions in detail → `docs/trd/trd.md`.
- Question about the admin SSR panel itself → `src/admin/README-REACT.md`.
