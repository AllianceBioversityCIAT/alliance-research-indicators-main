# Design — Institutional Performance / Strategy Framework

- **Module:** institutional-performance — server `domain/entities/strategy-framework/` + client *ODS Admin › Framework* and *ODS Admin › Institutional Objectives* pages
- **Spec id:** 2026-11-strategy-framework
- **Status:** r7, 2026-11-17 — Judgment Day lineage 2 **APPROVED** after round 2 (no severe finding left); warning-level follow-ups JA4-*, JB4-* applied in r7, *fixed, not re-judged* (`judgment.md`). Phase 2 gate approved by the dev lead 2026-11-17
- **Owner:** Hector F. Tobón (requester) · scope decisions by the dev lead
- **Linked requirements:** [`./requirements.md`](requirements.md) (rev 3.1)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md) — backend module layout, response envelope, auth
- **Parent spec:** [`../family.md`](../family.md) (F-2, F-4…F-9; F-1, F-3, F-8 with child-3 exceptions)
- **Builds on:** Organizational Structure (archived — [`design.md`](../../archive/2026-11-10-institutional-performance--organizational-structure/design.md), cited `D-ORG-n`) and Control Lists (`D-CTL-n`)
- **Visual reference:** (1) the dev lead's Framework mockup screenshot, 2026-11-17 (requirements C-11); (2) the *Institutional Indicators* canvas for the sidebar group; (3) artboard 4 for the Institutional Objectives page
- **Exploration:** one Explore scout (2026-11-13), direct reads on 2026-11-17, and two Judgment Day lineages (r3; r4–r6) whose source checks are folded into §13
- **Last updated:** 2026-11-17 — after merging `origin/staging` (`29b97978`): collation `utf8mb4_0900_ai_ci` (P-37); P-8 and P-25 line anchors refreshed

---

## 1. Goals & non-goals

**Goals**
1. One self-referencing `framework_elements` table plus a `framework_levels` table, so the strategy can grow in levels with no schema change (R-STF-002, 003).
2. Responsibles on indicator-level elements, IOBs and their links, codes, delete protection, portfolio scope (R-STF-001, 004…006, 009, 010).
3. A read service and a usage registry for children 4–5 and the mapping module (R-STF-012).
4. A new ODS Admin role, its guard, and a sidebar group with two items (R-STF-013…015).
5. The Framework page (outline editor per the mockup, details panel, table view, export) and the Institutional Objectives page (R-STF-007…010).
6. A seed from the Tracking Tool, the strategy workbook and the MMF (R-STF-011).

**Non-goals** — a screen to manage levels; anything about IO, SO or Enablers; copying a framework to another portfolio; a screen or API to assign roles; KPIs (child 4); the IO/SO delete guard (requirements §12).

---

## 2. Architecture

```mermaid
flowchart LR
  subgraph Client[STAR client]
    SB[alliance-sidebar\n+ group ODS Admin\nFramework · Institutional Objectives] --> RF[route ods-admin/framework]
    SB --> RO[route ods-admin/institutional-objectives]
    RF --> FP[FrameworkPage\nEditor | Table + Export]
    FP --> OE[outline editor\narea cards, inline rows]
    FP --> TV[table view\nDataTable per level]
    OE --> DP[details panel\ndescription, parent, responsibles]
    TV --> DP
    RO --> OP[ObjectivesPage\nyear, carry forward, table, form]
    FP --> API[ApiService]
    OP --> API
  end
  subgraph Server[NestJS]
    API -->|/api/strategy-framework/*| CT[StrategyFrameworkController\nRolesGuard]
    CT --> WS[StrategyFrameworkService\nrequest-scoped writes]
    CT --> RS[FrameworkReadService\nsingleton]
    WS --> RS
    RS --> UR[FrameworkUsageRegistry\nsingleton]
    FUT[child 4 KPIs / mapping] -. register .-> UR
    FUT -. inject .-> RS
  end
  WS --> DB[(framework_levels · framework_elements\nframework_element_responsibles\ninstitutional_objective*)]
  WS --> STF[(alliance_user_staff\nread only)]
```

**Why two services (parity D-ORG, `organizational-structure.module.ts:42`):** writes need the request-scoped `CurrentUserUtil`; the read service and the registry must be singletons so later modules can inject them without request scope. For the same reason the read service reads portfolios through its own repository, never `PortfoliosService` (request-scoped — P-21, D-STF-11).

### 2.1 Composition

**Server** — `server/researchindicators/src/domain/entities/strategy-framework/`

| Path | Responsibility |
| --- | --- |
| `strategy-framework.module.ts` | Declares controller, services, repositories, registry; **exports** `FrameworkReadService`, `FrameworkUsageRegistry` |
| `strategy-framework.controller.ts` | HTTP edge (§4); class-level `RolesGuard`, `SetUpInterceptor`, Swagger; every write also `@UseGuards(HumanCredentialGuard)` (parity org-structure writes, `human-credential.guard.ts:25`; D-STF-20) |
| `strategy-framework.service.ts` | Request-scoped writes: element CRUD and move, responsibles, IOB CRUD, carry forward, code proposal, staff search |
| `framework-read.service.ts` | Singleton: context, consumer framework view, editor view (blockers, usage), resolve, IOB list |
| `framework-usage.registry.ts` | Singleton; providers keyed by `consumerName` (dedup, D-ORG-10); each provider counts per element and/or per IOB (§5.6) |
| `framework-errors.ts` | `badRequest(field, description)`, `conflict(description, field?)`, `blocked(description, blockers)` building `{ message: { description, field \| blockers } }`, as `organizational-structure.service.ts:59-62`, so `GlobalExceptions` emits them as `errors` |
| `framework-tree.util.ts` | Pure: build the in-memory tree of a portfolio, descendant counts per level, ancestor chain, cycle check |
| `framework-code.util.ts` | Pure: next hierarchical code (§5.3) and next `IOB-<n>` |
| `strategy-framework.constants.ts` | `STAFF_SEARCH_LIMIT = 20`, code length 30, name length 255, `MAX_ELEMENTS_PER_PORTFOLIO = 500`, `DEFAULT_LEVELS` (Performance Area / AREA, Dimension / DIMENSION, Indicator / INDICATOR — indicator level 3) |
| `entities/framework-level.entity.ts`, `framework-element.entity.ts`, `framework-element-responsible.entity.ts`, `institutional-objective.entity.ts`, `institutional-objective-element.entity.ts` | Five entities (§3). `FrameworkLevel.indicator_portfolio_key` is mapped `@Column({ type: 'bigint', nullable: true, generatedType: 'STORED', asExpression: 'IF(is_indicator_level = 1, portfolio_id, NULL)', insert: false, update: false })`, so TypeORM never writes it and `migration:generate` does not diff it away; first generated column in this server (P-35) |
| `repositories/*.repository.ts` | One per aggregate, plus `portfolio-lookup.repository.ts` (read-only `id, name, start_year, end_year, is_active`; no `CurrentUserUtil`) |
| `dto/*.dto.ts` | Element create/update, responsibles, IOB create/update, carry forward, query DTOs |
| sibling `*.spec.ts` for every file above; `strategy-framework.global-exceptions.spec.ts` | Unit tests incl. the real `GlobalExceptions` wire contract (as D-ORG) |
| `test/strategy-framework-{schema,crud,levels,carry-forward,seed,role,module-wiring,performance}.integration-spec.ts` | Integration on the local development DB (`test:integration`) |
| `src/db/migrations/1795000000000-createOdsAdminRole.ts` | `sec_roles` row (§3.3) |
| `src/db/migrations/1795000000001-createFrameworkTables.ts` | Levels, elements, responsibles |
| `src/db/migrations/1795000000002-createInstitutionalObjectives.ts` | IOB + link table |
| `src/db/migrations/1795000000003-seedStrategyFramework.ts` | Imports the seed; exports only its class (D-ORG-14) |
| `src/db/seeds/strategy-framework.seed.ts` + `src/db/seeds/seed-data/strategy-framework.data.ts` | Seed data (generated once from the workbooks, §3.4) and idempotent insert functions |
| `src/db/migration-specs/1795000000000…003-*.spec.ts` | Migration unit specs (server guide §9) |
| `src/domain/shared/enum/sec_role.enum.ts` | `ODS_ADMIN = 11` |
| `src/domain/routes/main.routes.ts`, `src/domain/entities/entities.module.ts` | Register the module at `strategy-framework` — **both** (server guide §4, KZ-017) |

**Client** — `client/research-indicators/src/app/`

| Path | Responsibility |
| --- | --- |
| `pages/platform/pages/administration/ods-admin/framework/framework.component.{ts,html,scss,spec.ts}` | Page shell: header, portfolio selector, Editor/Table toggle, export, summary line, banner, state handling |
| `…/framework/components/outline-editor/*` | Area cards and recursive rows (§6.3) |
| `…/framework/components/outline-row/*` | One row: level label, code badge, inline name field state machine, counts, add-child, details, delete. **Standalone, `OnPush`, recursive** (renders its children with its own selector) and holding its field state in signals — a new pattern in this client (P-29) |
| `…/framework/components/framework-tables/*` | Level chips + one `app-data-table` per level |
| `…/framework/components/element-panel/*` | Details panel on PrimeNG `p-drawer` (modal, Escape closes). The drawer has **no** focus trap or focus return in PrimeNG 19.0.6 (P-33), so the content carries the `pFocusTrap` directive (`primeng/focustrap`) and the page stores the opener and refocuses it on hide. Fields: code, name, description, parent, responsibles; Save · Cancel · Delete |
| `…/framework/components/staff-picker/*` | Multi-select staff picker on `p-autoComplete` (parity `org-unit-form.component.html`), with a visible `<label for>` and `aria-describedby` for the 2-character hint, so it is a labelled combobox |
| `…/framework/utils/framework-view.util.ts` (+spec) | Flat read → nested view model, counts, flattened table rows, export sheets |
| `…/framework/url/framework-url.codec.ts` (+spec) | Pure codec for `?view=&level=` with frozen slug vocabularies (client guide, URL-addressable state) |
| `pages/platform/pages/administration/ods-admin/institutional-objectives/institutional-objectives.component.{ts,html,scss,spec.ts}` + `components/objective-panel/*` | Year selector, carry forward, IOB table, IOB form |
| `shared/interfaces/strategy-framework.interface.ts` + `…/framework/utils/framework-error.util.ts` (+spec) | Client types, including `FrameworkErrorPayload = { description: string; field?: string; blockers?: Blocker[] }`, and a module-local `frameworkErrorOf(errorDetail)` that accepts the object payload, a plain string and Nest's string array (DTO validation), returning one display message. The envelope's error lives at `MainResponse.errorDetail` (`ErrorResponse.errors: string`, `responses.interface.ts:1-9,16-17`). Framework errors are **not** routed through `ActionsService.handleBadRequest` (`actions.service.ts:60-79`): its conflict branch would match the framework payload and render the result-title alert (`:139-176`); that shared service is not changed (P-36) |
| `shared/interceptors/http-error.interceptor.ts` | **Exemption:** every `4xx` except `401` from URLs containing `/strategy-framework` skips the global error toast — a URL-scoped rule like the existing `isPrmsSyncError` (`:114`); `401`, `5xx` and refresh-token handling are unchanged. The pages show these errors inline or in their dialogs through `frameworkErrorOf` (P-34) |
| `src/styles/colors.scss` + styles README + `docs/ux-ui/design.md` §7 | Four new tokens `--ac-framework-accent-1…4` with light **and** dark values (D-STF-25), following the existing feature-token precedent (`--ac-pfm-*`, `--ac-pool-funding-*`); the client guide's new-token rule also requires the UX/UI document update |
| `shared/services/api.service.ts` | Methods for §4 |
| `shared/services/cache/roles.service.ts` | `odsAdminRoleId = 11`; `canAccessOdsAdmin` = role 1 or 11 |
| `shared/guards/ods-admin.guard.ts` (+spec) | `CanMatchFn`, same shape as `center-admin.guard.ts` |
| `shared/components/alliance-sidebar/alliance-sidebar.component.{ts,html,spec.ts}` | New group `ods-admin`; the Administration gate at `.html:73` (expanded and collapsed branches) gains `\|\| rolesService.canAccessOdsAdmin()` (P-7); **both** `RolesService` mocks in the spec (`:39-44` and `:612-618`) and every cast of them gain `canAccessOdsAdmin` (P-25) |
| `shared/utils/xlsx-export.util.ts` | **Additive** `exportSheetsToXlsx` (several sheets); `exportRowsToXlsx`, whose only caller is `DataTable` (P-14), unchanged |
| `app.routes.ts` | Lazy routes `administration/ods-admin/framework` and `administration/ods-admin/institutional-objectives`, `canMatch: [odsAdminGuard]` |

### 2.2 Reuse

Server: `AuditableEntity`, `ResponseUtils.format`, `RolesGuard` + `@Roles`, `SetUpInterceptor`, `CurrentUserUtil.audit`, `GlobalExceptions`, `readStaffCarnetColumnClause` (`src/db/helpers/staff-carnet-column.ts`), the `AllianceUserStaff` entity (read only).
Client: `DataTable` + `natural-compare` + `xlsx-export`, `ApiService` + `MainResponse<T>`, `ActionsService.showToast` / `showGlobalAlert`, token utilities. The portfolio selector reads A0, not `GET_Portfolios`.

**Not reused, on purpose:** `PortfoliosService` (request-scoped, P-21; its `validatePortfolio` throws `400`, not the `404` A1 documents). `OrgStructureService.searchStaff` (request-scoped, unexported, Center/System Admin only — P-9); this module runs its own **parenthesized, active-only** staff query with the same shape (parity `organizational-structure.service.ts:103-116`; D-ORG-8).

---

## 3. Data model

All new tables: InnoDB, `utf8mb4`, collation **`utf8mb4_0900_ai_ci`** declared explicitly — the connection collation since 2026-10-22 (`orm.config.ts:60` `extra.charset`; server guide §7, updated on `staging`), which `staging` also moved the PRMS sync tables to (`1792681023849-convertPrmsSyncTablesCollation.ts`). It is case- and accent-insensitive, so unique codes still compare case-insensitively, and expressions compared with these columns raise no MySQL 1267 (P-37). The siblings' `utf8mb4_unicode_ci` is not repeated. The staff FK column keeps the staff table's own charset and collation (`readStaffCarnetColumnClause`). Every table extends `AuditableEntity`. **Delete is physical** (D-STF-3); the audit trail of a deleted element is the `LoggerUtil` line of §5.4 (accepted: nothing referenced it).

### 3.1 Tables

| Table | Columns (beyond `AuditableEntity`) | Indexes / constraints |
| --- | --- | --- |
| `framework_levels` | `id` bigint PK · `portfolio_id` bigint FK → `portfolios.id` (RESTRICT) · `depth` smallint (1 = top) · `name` varchar(60) · `plural_name` varchar(60) · `short_label` varchar(20) (the row label, e.g. `AREA`) · `is_indicator_level` tinyint default 0 · `indicator_portfolio_key` bigint **generated** `IF(is_indicator_level = 1, portfolio_id, NULL)` STORED | `uq_framework_levels_portfolio_depth (portfolio_id, depth)` · `uq_framework_levels_indicator (indicator_portfolio_key)` |
| `framework_elements` | `id` bigint PK · `portfolio_id` FK → `portfolios.id` (RESTRICT) · `level_id` FK → `framework_levels.id` (RESTRICT) · `parent_id` bigint null FK → `framework_elements.id` (**RESTRICT**) · `code` varchar(30) · `name` varchar(255) · `description` text null | `uq_framework_elements_portfolio_code (portfolio_id, code)` · `idx_framework_elements_parent` · `idx_framework_elements_level` |
| `framework_element_responsibles` | `id` · `element_id` FK → `framework_elements.id` (**CASCADE** — removed with the element, R-STF-006) · `staff_carnet` varchar FK → `alliance_user_staff.carnet` (RESTRICT; charset clause from `readStaffCarnetColumnClause`, D-ORG-16) · `position` smallint | `uq_framework_element_resp (element_id, staff_carnet)` · `idx_framework_element_resp_staff` |
| `institutional_objectives` | `id` · `portfolio_id` FK (RESTRICT) · `year` smallint · `code` varchar(30) · `statement` text | `uq_iob_portfolio_year_code (portfolio_id, year, code)` · `idx_iob_portfolio_year` |
| `institutional_objective_elements` | `id` · `institutional_objective_id` FK → IOB (**CASCADE**) · `element_id` FK → `framework_elements.id` (**RESTRICT** — DB backstop of "an Indicator linked by an IOB cannot be deleted") | `uq_iob_element (institutional_objective_id, element_id)` · `idx_iob_element_element` |

- **One table, any depth (D-STF-15).** The level is a foreign key to `framework_levels`, never a column per level. A fourth level is one `framework_levels` row; no migration, entity or endpoint changes.
- **`portfolio_id` on the element** is stored on every row (D-STF-4): it lets the DB enforce code uniqueness per portfolio and lets reads filter without walking the tree. The service writes it from the parent and rejects a parent of another portfolio (R-STF-001).
- **"At most one indicator level per portfolio"** is a DB constraint: the unique index on the generated column `indicator_portfolio_key` (NULL for other levels, and MySQL unique indexes allow many NULLs). "At least one" holds because levels are only ever created as the full `DEFAULT_LEVELS` set (§5.2 step 2) or by the seed. **The flag never moves in this spec**: there is no level screen or level API — the only level write is the lazy insert of the full `DEFAULT_LEVELS` set (§5.2 step 2) — and a fourth level may only be added **above or below without moving the flag** (test fixtures add it below the indicator level). Moving the flag is part of the deferred level screen, which must then re-home or reject existing responsibles and links.
- **Codes** are trimmed and compared case-insensitively by the collation (so a typed `a.1` equals `A.1`). Pre-check → `409` naming `code`; MySQL 1062 on a race → the same `409` (D-CTL-11).
- **Responsibles** store only the staff ID; name, email and active flag are joined from `alliance_user_staff` on read. `position` keeps the chosen order.
- **IOB year** is checked to be inside the portfolio's `[start_year, end_year]`.

### 3.2 Invariants (kept by the service, one transaction per write)

| # | Invariant | Enforced by |
| --- | --- | --- |
| I-1 | A parent, a linked element and an element's level belong to the element's / IOB's portfolio | service check before write (R-STF-001) |
| I-2 | depth(element) = 1 ⇔ no parent; otherwise depth(parent) = depth(element) − 1 | service check on create and move (R-STF-003) |
| I-3 | No cycles | `framework-tree.util` ancestor check on move (§5.2) |
| I-4 | Element code unique per portfolio; IOB code unique per (portfolio, year) | unique indexes + service pre-check |
| I-5 | No delete while children, IOB links or registered dependants exist | service blocker check (§5.4) + RESTRICT FKs as backstop |
| I-6 | Exactly one indicator level per portfolio that has levels; responsibles and IOB links only on elements at that level | generated-column unique index (at most one) + levels created only as a full set (at least one); service check for responsibles/links |
| I-7 | Responsible staff IDs exist; newly added ones are active; no duplicates | service check + FK + unique index |
| I-8 | At most 500 elements per portfolio (R-STF-003, P-27) | service check on create under the portfolio-row lock of §5.2 step 6 → `400` *"a portfolio holds at most 500 elements"* |

### 3.3 Migrations

Block `1795000000000…003` — above the newest migration on any remote branch (`origin/dev` `1794920220124` on 2026-11-19, P-11; renumbered from `1793500000000…003` by T-01). Each exports only its class.

- **`…000-createOdsAdminRole`:** `up` reads `sec_roles` where `sec_role_id = 11`. Absent → insert (`name 'ODS Admin'`, `focus_id` = `RolesFocusEnum.APPLICATION`, a description, `is_internal 0`). Present **with name 'ODS Admin'** → no-op. Present with any other name → **throw** naming it (P-17); such a throw would block the Dev deploy, so §11 adds a pre-merge check. `down` finds every FK referencing `sec_roles.sec_role_id` via `information_schema.KEY_COLUMN_USAGE` (filtered on `REFERENCED_TABLE_SCHEMA = DATABASE()`, `REFERENCED_TABLE_NAME = 'sec_roles'`, `REFERENCED_COLUMN_NAME = 'sec_role_id'`; five on the baseline — P-22), counts **all** rows with that column = 11 (an inactive row still blocks the FK); any → throw naming each table and count; none → delete the row. Assignments live in `sec_user_roles`, never `user_roles`.
- **`…001`:** `framework_levels` (with the generated column and its unique index — MySQL 8 supports stored generated columns in unique indexes, P-30), then `framework_elements` (self FK), then `framework_element_responsibles` (staff FK clause from `readStaffCarnetColumnClause`). **`…002`:** `institutional_objectives`, `institutional_objective_elements`. `down` drops in reverse order.
- **`…003-seedStrategyFramework`:** calls the seed (§3.4). `down` first counts **non-seed** rows that depend on seeded ones (an element under a seeded parent, a link to a seeded element from a non-seeded IOB); any → throw naming each count. Otherwise it deletes the seeded rows by fixed ID with **one `DELETE` per depth, deepest first** (InnoDB checks a self-referencing RESTRICT FK row by row, so one multi-row `DELETE` mixing parents and children can fail on order). A full backout that also discards user edits is `…002`/`…001` `down`.
- **SQL text rule (all four):** every value is a bound parameter (array form); identifiers read from `information_schema` are checked against `^[a-z0-9_]+$` and backticked, as `staff-carnet-column.ts` does; no `?` or `:word` in SQL comments or unquoted text (`orm.config.ts:59` `namedPlaceholders`, server guide §7). Gate: a real run on the local development DB, up, down, up (K-006), plus a by-hand read of each migration for `?` / `:word` outside bound placeholders. *(Amended 2026-11-19 by T-01: `npm run migration:scan` was listed here, but `package.json:41` points at `scripts/scan-migration-placeholders.js`, which has never existed in git; the static scanner was withdrawn per server guide §7 / K-006.)*

### 3.4 Seed (R-STF-011)

- **Data file, generated once and committed:** `seed-data/strategy-framework.data.ts` holds plain constants (levels, elements with parent codes, IOBs, links by codes, responsible candidates). It is produced in the seed task by a throw-away script over the three workbooks (`2026_Strategic-Objectives-Tracking-Tool.xlsx`, `Alliance-Strategy-2026-2030_20260902.xlsx`, `Master-Monitoring-Framework_…_v2.xlsx`); their file dates are recorded in the data file header. No workbook is read at migration time.
- **Levels:** `DEFAULT_LEVELS` — 1 *Performance Area* (`AREA`), 2 *Dimension* (`DIMENSION`), 3 *Indicator* (`INDICATOR`, `is_indicator_level` = 1).
- **Elements and codes** from the Tracking Tool numbering: `1`…`4`, `n.n`, `n.n.n` (the leading number of each Tracking Tool label, the rest as the name; *4.6 Powering Impact…* omitted). Descriptions from the strategy workbook where the normalized name matches (22 indicators, 7 dimensions, the area-1 definition).
- **IOBs:** `IOB-1…28`, year 2026, statements from the Tracking Tool *Control Lists* with the leading `"<n>. "` stripped. **Links:** 36, with the two pre-merge names mapped to `4.1.1`. The generator **fails** unless: 3 levels; 4 / 13 / 31 elements; 36 distinct pairs; every IOB linked; only `1.3.2` unlinked; `4.6` absent. The same assertions run in the seed test against the committed data file.
- **Responsibles:** candidates parsed from MMF sheet 03 (split on `;` and `,`, strip `<email>` and parentheses); a missing email is filled from the *Institutional Indicators* canvas file `project/kpi-framework.json` (field `resp`; https://claude.ai/artifact/8tak5qfvNbBhfaH8DvWDpg, read 2026-11-17 — declared as a seed source in R-STF-011 and F-8; P-16). MMF indicator names map to codes like the links (*Innovation development* and *Uptake of innovations for system change* → `4.1.1`). At migration time each candidate resolves against **active** `alliance_user_staff` by email (case-insensitive, trimmed), else by exact `TRIM(first_name) + ' ' + TRIM(last_name)`; exactly one hit → stored, otherwise skipped and logged via `LoggerUtil` with the reason. Non-person tokens are filtered by the generator.
- **Atomicity on the deploy batch (P-26, High):** `migration:execute` runs pending migrations in TypeORM's default `all` mode (`MigrationExecutor.js:28`); the `CREATE TABLE`s of `…001`/`…002` commit implicitly, after which a nested `queryRunner.startTransaction()` only issues a `SAVEPOINT` (`MysqlQueryRunner.js:90-99`) and gives no atomicity, and `transaction = true` on `…003` is forbidden in `all` mode (`MigrationExecutor.js:169-180`). **Mechanism:** `…003` runs the seed on a **dedicated query runner** — `queryRunner.connection.createQueryRunner()` — with its own `startTransaction` / `commitTransaction` / `rollbackTransaction` and `release` in `finally`, so the seed is one real transaction on its own connection whatever state the migration connection is in (the tables exist: DDL already committed). T-08 proves it by running all four pending migrations together on a fresh local schema with an injected seed failure: zero seed rows; observed failing first with the seed on the shared runner (K-004).
- **Fixed IDs** for levels, elements, IOBs and links; **no `ALTER TABLE … AUTO_INCREMENT`** (DDL commits; `1791000000004-seedOrgStructure.ts:19-23`; InnoDB moves the counter above explicit IDs). Every insert is `INSERT … SELECT … WHERE NOT EXISTS` on the fixed ID; responsibles are guarded on `(element_id, staff_carnet)`. Elements are inserted parents first.
- **Re-run:** 0 rows while the staff table is unchanged (R-STF-011 AC.3); a person who became matchable is added.

---

## 4. API surface

Base `/api/strategy-framework` (unversioned — root `CLAUDE.md` §4.1). Class-level `@UseGuards(RolesGuard)`, `@UseInterceptors(SetUpInterceptor)`, `@ApiTags('Strategy Framework')`, `@ApiBearerAuth()`; every handler has `@ApiOperation` and per-param docs. Writes use `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, so `id`, `portfolioId` or `levelId` on an update, any staff name/email field, or any owner/responsible field on an IOB → `400`. **Literal routes before `:id` routes.**

Admin = `@Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)` (System Admin also bypasses — `roles.guard.ts:29`); **writes** additionally `HumanCredentialGuard` (machine token → `403`, D-STF-20). Consumer = any authenticated user.

| # | Method + path | Roles | Input | Response `data` | Errors |
| --- | --- | --- | --- | --- | --- |
| A0 | `GET /context` | Admin | — | `{ currentYear, portfolios: {id, name, startYear, endYear, configured}[], defaultPortfolioId }` — server clock (§5.1) | — |
| A1 | `GET /framework?portfolioId=` | Consumer | `portfolioId` required | `{ portfolioId, configured, levels: {id, depth, name, pluralName, shortLabel, isIndicatorLevel}[], elements: FrameworkElementView[] }`. Each element: `id, levelId, depth, code, name, description, parentId, descendantCounts {[depth]: n}`, and on indicator-level elements `responsibles {carnet, name, email, isActiveStaff}[]` in `position` order. Sorted by code (natural). One query per table plus one staff join (no N+1 — NFR-STF-001). A portfolio with no levels returns `levels: []` and `elements: []` (R-STF-012 AC.1) | 400 · 404 portfolio |
| A1e | `GET /framework/editor?portfolioId=` | Admin | as A1 | A1 plus, per element, `usage {[consumerName]: n}`, `deletable`, `blockers[]`; on the view, once, `usageLabels: {consumerName, label}[]` (D-STF-28) — editor-only data kept off the consumer read. For a portfolio with no levels, `levels` = `DEFAULT_LEVELS` marked `virtual: true` (no ids), so the empty editor can offer **+ Add Performance Area**. One call per registered provider | as A1 |
| A2 | `GET /resolve?ids=` | Consumer | ≤ 200 ids | element rows as A1, or `{ id, missing: true }` | 400 |
| A3 | `GET /code-proposal?portfolioId=&parentId=` · `?portfolioId=&year=&kind=IOB` | Admin | `parentId` absent = root; used for the details panel's code default | `{ code }` (§5.3) | 400 · 404 parent |
| A4 | `GET /staff?search=` | Admin | ≥ 2 chars | `{carnet, name, email}[]`, active only, max 20 | 400 |
| A5 | `POST /elements` | Admin | `{ portfolioId, parentId?, code?, name, description?, responsibleCarnets?: string[] }` — the level is derived: depth 1 when no parent, else parent depth + 1. The first create in a portfolio with no levels creates `DEFAULT_LEVELS` in the same transaction (§5.2) | element as A1 (201) | 400 depth beyond the last level / responsibles on a non-indicator level / staff / 500-element cap / parent of another portfolio (`parentId`) / no code given and the parent's code too long to extend (`code`) · 404 parent · 409 code |
| A6 | `PATCH /elements/:id` | Admin | `{ code?, name?, description?, parentId?, responsibleCarnets?: string[] }` — `parentId` **omitted** = no move; a number = move (same depth, same portfolio); **`null`** = `400` `parentId` (an element never changes depth); `parentId` on a depth-1 element = `400` `parentId`. `responsibleCarnets` **replaces** the set (omitted = unchanged, `[]` = clear) | element as A1 | 400 `parentId` (null, wrong depth, other portfolio, depth-1 element) / staff · 404 parent or element · 409 code |
| A7 | `DELETE /elements/:id` | Admin | — | `{ id }` | 404 · 409 blockers |
| A8 | `GET /elements/:id/blockers` | Admin | — | `{ children, objectives, consumers: {consumerName, count}[], wayOut[] }` | 404 |
| A9 | `GET /objectives?portfolioId=&year=` · `GET /objectives/years?portfolioId=` | Admin | — | IOB rows with linked elements `{id, code, name}[]` and `deletable`, `blockers[]` · `{ years: {year, count}[], defaultYear }` — every year of the portfolio's range is listed, zero counts included; `defaultYear` = server current year when inside the range, else its first year | 400 year out of range |
| A10 | `POST /objectives` · `PATCH /objectives/:id` · `DELETE /objectives/:id` | Admin | `{ portfolioId, year, code?, statement, elementIds?: number[] }` (`portfolioId` on create only; on PATCH → `400`) | IOB | 400 year · 400 element of another portfolio or not at the indicator level, with `errors.field = 'elementIds'` and the offending codes in the description · 404 · 409 code · 409 `blockers` from IOB providers (§5.6) |
| A11 | `POST /objectives/carry-forward` | Admin | `{ portfolioId, fromYear }` | `{ fromYear, toYear, copied }` | 400 last year / empty year · 409 target year has objectives |

Missing `code` on create → the service applies the A3 proposal. Domain `400`/`409` are built by `framework-errors.ts` as `{ message: { description, field } }` / `{ message: { description, blockers } }` (parity `organizational-structure.service.ts:59-62`), which `GlobalExceptions` emits as `errors` (`global.exception.ts:30-47`); the client narrows them with `FrameworkErrorPayload`. DTO validation errors keep Nest's message array.

---

## 5. Workflows & business rules

### 5.1 Portfolio and "today"
- **One clock: the server's** UTC year, delivered by A0. `defaultPortfolioId` = the active portfolio whose `[start_year, end_year]` contains the current year; if several, the latest `start_year`; if none, the active portfolio with the latest `start_year` not after the current year, else the lowest id.
- "Configured" = the portfolio has at least one element.

### 5.2 Element writes
1. Validate DTO. Load the portfolio's levels and elements once (≤ 500 rows) and build the tree (`framework-tree.util`).
2. **Create:** if the portfolio has no levels, insert `DEFAULT_LEVELS` first in the same transaction (so the empty state's **+ Add Performance Area** works on any portfolio — F-8). Parent absent → depth 1; present → it must exist (`404` `parentId`) and be in the portfolio (`400` `parentId`, R-STF-001), and depth = parent depth + 1 must exist as a level (else `400` *"no level below <name>"*). Element count < 500 (I-8).
3. **Move** (`parentId` on PATCH, A6 semantics): new parent in the same portfolio and at the same depth as the old parent (I-2). The subtree moves with it; codes unchanged. A same-depth parent can never be the element or one of its descendants, so **cycles are structurally excluded by the depth rule**; `framework-tree.util` keeps a defensive cycle check that is tested at the unit level only (R-STF-003 AC.2's cycle case is a util test, not an API test).
4. Trim the code or propose one (§5.3); pre-check uniqueness (I-4).
5. **Responsibles** only when the element's level is the indicator level (I-6): repeated carnet → `400`; every carnet must exist; a carnet not already on the element must be active (I-7). Written as delete + insert for that element, `position` = list order.
6. Save with audit fields, in one transaction. **Every create** first takes `SELECT … FOR UPDATE` on the **portfolio row** — it serializes, among creates, the lazy `DEFAULT_LEVELS` insert, the 500-element count and server-assigned codes, so two first creates on an empty portfolio cannot both insert levels (a PATCH that types a code takes only the element row; a collision there is the 1062 → `409` `code` of step 7); then on the parent row (or the element for an update) — parity `lockUnit`, `org-structure-write.repository.ts:32-38`. A 1062 on `uq_framework_levels_*` can then only come from a concurrent level change outside this module and maps to `409` *"the framework changed, reload"* (no field).
7. **Race mapping**, per constraint: 1062 → `409` naming the unique field; 1452 on `parent_id` → `404` naming the parent; 1452 on the staff FK → `400` `responsibleCarnets`; 1452 on a link's `element_id` → `400` `elementIds`; 1451 → the §5.4 `409`. Never a `500` for these.
8. **IOB create and update** take the same `SELECT … FOR UPDATE` on the portfolio row as carry forward (§5.5).

### 5.3 Code proposal — `framework-code.util`
- **Root:** `<max n + 1>` over **every** code in the portfolio matching `^(\d+)$`, whatever its depth (a Dimension hand-coded `5` still blocks `5`).
- **Child of a parent coded `P`:** `P.<max m + 1>` over codes matching `^<escaped P>\.(\d+)$` **portfolio-wide** — not only the parent's current children, because a moved element keeps its code (R-STF-003): if `1.7` was moved under Area `2`, Area `1` still proposes `1.8`. `P` is regex-escaped, so a non-numeric parent code works too.
- **IOB:** `IOB-<max + 1>` within (portfolio, year).
- A proposal longer than 30 characters is not offered: A3 returns `400` *"parent code too long to extend; type a code"* and the UI opens the details panel for a typed code.
- Case-insensitive; gaps are not filled (`1.1`, `1.3` → `1.4`).

### 5.4 Delete
1. Blockers: children count; IOB link count (indicator level); every registered provider's count for the element (`FrameworkUsageRegistry`).
2. Any non-zero → `409` with `errors = { blockers: [{ reason, count, wayOut }] }` and a description naming each, e.g. *"Cannot delete Indicator 1.2.2: linked by 1 institutional objective. Unlink it from that institutional objective first."* Way-out texts: children → *"Delete or move its N <plural level name> first."* · IOB → *"Unlink it from those N institutional objectives first."* · consumer → *"Remove its N records in <consumerName> first."* **When N = 1 (D-STF-27, 2026-11-19):** singular wording — children → *"Delete or move its 1 <level name> first."* · IOB → *"Unlink it from that institutional objective first."* · consumer → *"Remove its 1 record in <consumerName> first."*
3. Otherwise physical delete in one transaction (responsibles and links cascade). 1451 on a race → the same `409`.
4. `LoggerUtil.log` one line: level, id, code, portfolio, user.
5. A1e (admin only) carries `deletable` and `blockers` per element so the editor can colour the delete icon without a call per row; the `DELETE` always re-checks.
6. **IOB delete:** blocked only by providers that count IOBs (§5.6); `409` with `blockers` as above. With no such provider registered today, every IOB is deletable.

### 5.5 Carry forward
1. `toYear = fromYear + 1`; `400` if `toYear > end_year` or `fromYear` has no IOB.
2. `409` if `toYear` has any IOB.
3. One transaction, after `SELECT … FOR UPDATE` on the portfolio row: re-check step 2, copy each IOB (code, statement) to `toYear`, then its links. Return `copied`. 1062 → the same `409`.

### 5.6 Usage registry
`register({ consumerName, label, countByElementIds?(ids), countByObjectiveIds?(ids) })` — at least one counter; `label` is what the editor shows (e.g. *KPIs*); deduplicated by `consumerName`. Element deletes consult `countByElementIds`, IOB deletes `countByObjectiveIds` (R-STF-006). No provider is registered in this spec; child 4 registers *KPIs*, which is when the mockup's KPI counts and "items that hold KPIs cannot be deleted" become live. This module does not register with `OrgUnitUsageRegistry` (no org unit is linked).

### 5.7 Side effects
None: no socket event, no OpenSearch, no queue message.

---

## 6. Frontend — STAR client

### 6.1 Navigation and access (R-STF-014, 015)
- `RolesService.canAccessOdsAdmin` = role 1 or 11. `canAccessCenterAdmin` is not touched (P-7). The Administration block of the sidebar template is wrapped in `@if (canAccessCenterAdmin() || canAccessAppConfiguration())` (`alliance-sidebar.component.html:73`, expanded and collapsed branches): the wrapper gains `|| canAccessOdsAdmin()`. The server stays the authority on access.
- Sidebar group `{ id: 'ods-admin', label: 'ODS Admin', icon: 'pi-shield', children: [ { label: 'Framework', link: '/administration/ods-admin/framework', icon: 'pi-sitemap', iconSize: '13px' }, { label: 'Institutional Objectives', link: '/administration/ods-admin/institutional-objectives', icon: 'pi-flag', iconSize: '13px' } ] }`, after Center admin and before System admin. PrimeIcons, as the sidebar uses.
- `odsAdminGuard` returns `true` or a `UrlTree` to `/home` (as `center-admin.guard.ts`). Each link equals its route path (KZ-017 comment convention).

### 6.2 Framework page layout (mockup, C-11)
- **Page mode:** Operate (admin data maintenance). **Environment class:** STAR authenticated admin page, light + dark via PrimeNG Aura; token utilities only.
- Header: eyebrow chip *ADMIN · ODS*; title **`Strategy <startYear>–<endYear> – Monitoring framework`** built from the selected portfolio's years (*Strategy 2026–2030 – Monitoring framework* for Portfolio 2, whose stored name is `'Portfolio 2'` — P-28; no portfolio is renamed); subtitle *"Define the performance areas, dimensions and indicators of the framework."*; portfolio `p-select` from A0 labelled `<name> · <startYear>–<endYear>` (*"(not configured)"* suffix when `configured` is false).
- Toolbar: **Editor | Table** toggle (state in the URL codec), **Export .xlsx**.
- Summary card: one line from the levels and counts (*"4 performance areas · 13 dimensions · 31 indicators"*) and an info banner with a check icon: *"Changes apply to every module that uses the framework. Items in use cannot be deleted."* (Q-3).
- **Both views read A1e** (the admin read), never A1. States: skeleton (`app-custom-progress-bar`) · empty (*"This portfolio has no framework yet"* + **+ Add <level-1 name>**, the name from A1e's `levels`, virtual defaults when the portfolio has none) · load error with **Retry**.

### 6.3 Outline editor (R-STF-007)
- One **card** per depth-1 element with a 4 px left border in `--ac-framework-accent-1…4`, rotating (D-STF-25). Existing tokens were ruled out: in dark mode `--ac-green-500` (`#14251a`), `--ac-light-blue-400` (`#23466b`) and `--ac-primary-blue-400` (`#1c2938`) sit on the `#191919` background, and there is no lime (P-29). The four new tokens follow the mockup's lime, orange, blue, green with values distinct from each other and at least 3:1 against the card background in both themes, checked at HITL. The level label and code badge also mark the level, so colour is never the only cue (NFR-STF-004).
- **Row** (`outline-row`, recursive): the level's `shortLabel` (*AREA*, *DIMENSION*); rows of the **indicator level** (`isIndicatorLevel`) show an indent arrow instead of a label, as in the mockup · code badge · inline name `input` (`aria-label` = "<level name> <code> name") · counts text from `descendantCounts` and `usage` (*"6 dimensions · 18 indicators"*, plus *"· 46 KPIs"* once a provider exists) · **+ <next level name>** outlined button (hidden on the deepest level) · details icon button (`pi-pencil`, `aria-label` = "Edit details of <level name> <code>") · delete icon button (`aria-label` = "Delete <level name> <code>"; red when `deletable`, muted with a tooltip and `aria-disabled` otherwise).
- Depth 2 rows sit in a nested bordered block inside the card; depth ≥ 3 rows are indented under their parent. Rows are ordered by code (natural).
- **Inline name field — state machine** (one per row, in signals): `idle` → (typing) `dirty` → (Enter or blur) `saving` → `idle` with the server value, or `error` with the typed value kept and the message under the field. **In `saving` the input is read-only** (no typing, no Escape), so a response can never overwrite newer keystrokes. Escape in `dirty` or `error` restores the last saved value. An empty value never leaves the client (inline *"Name is required"*). Enter blurs the field, and the blur handler ignores a field already in `saving`, so one edit sends one request. The row's delete and details buttons are disabled while it is `saving`.
- **Add child:** **+ <level>** appends a draft row under the parent, badge *New*, focus in the name. The first save sends **no code** — A5 assigns the next free one server-side under the portfolio lock, so two drafts never collide — and the badge then shows the stored code. The inline draft flow calls neither A3 nor `reserve`; A3 serves the details panel's code default only. Escape on a draft (touched or not, unless `saving`) removes it; a draft whose save failed stays in `error` until saved or removed. **+ Add <level-1 name>** at the end adds a root draft.
- **Refresh rule:** after any save, delete or panel save the editor re-reads A1e and **merges by element id**: rows in `dirty`, `saving` or `error`, and drafts, keep their local state; only `idle` rows take server values.
- **Delete:** icon → A8 → blocked: `showGlobalAlert` listing each blocker, count and way-out, **Close** only; free: confirm *"Delete <level> <code> · <name>?"* with **Delete** / **Cancel** → A7 → the row disappears and the summary updates.
- Keyboard: Tab moves through rows' controls in visual order; the name field is a normal text input with `maxlength` 255 (code fields 30). The shared alert has no focus handling (`global-alert.component.html:2`, a plain overlay), so the page stores the delete button before opening it and, when it closes, refocuses that button — or, after a delete, the first **enabled** control of the previous row, else the **+ <level>** button of the parent, else **+ Add <level-1 name>**.

### 6.4 Table view (R-STF-008)
- Level chips from A1e `levels` with counts. One `app-data-table` per level. `DataTable` renders text cells only (P-23), so rows carry **flattened string fields**: `parentCode`, one `<depth>Code` column per higher level, `responsiblesText` on the indicator level (names joined with `; `, inactive ones suffixed ` (inactive)`). Each table has `#rowActions` (edit → details panel; delete → the §6.3 flow) and a **+ <level>** button that opens an empty details panel whose parent field is required.
- **Export .xlsx** (toolbar, both views): `exportSheetsToXlsx` with one sheet per level, sorted by code with `naturalCompare`.

### 6.5 Details panel (R-STF-004, 007)
- PrimeNG `p-drawer` on the right, modal, Escape closes; focus is trapped by `pFocusTrap` on the content and returned to the opener by the page (P-33) — ~420 px, full width under 1024 px. Header: level chip + code.
- Fields: Code*, Name*, Description (textarea), Parent (`p-select` of elements one level up, labelled `code · name`; absent at depth 1), and on indicator-level elements **Responsibles** (`staff-picker`: `p-autoComplete` multiple, min 2 chars, debounce 300 ms, A4; chips with name and email; reorder by up/down buttons with `aria-label`s; inactive ones tagged *inactive*).
- Buttons **Save**, **Cancel**, **Delete** (F-4). Save → toast *"<code> saved"*; the editor and table refresh from the response.

### 6.6 Institutional Objectives page (R-STF-009, 010)
- Header: eyebrow *ADMIN · ODS*, title *Institutional Objectives*, portfolio `p-select` from A0.
- Year `p-select` from A9-years (*"2026 · 28 objectives"*), selected on load = `defaultYear`; **Carry forward to <Y+1>** (disabled in the last year or when the year is empty; confirm dialog; toast *"28 objectives copied to 2027; 2026 is unchanged"*); **+ Add objective**; export via the table.
- `app-data-table`: Code · Statement · Linked indicators (`linkedIndicatorsText`: `<code> <name>` joined with `; `) · `#rowActions`; search over code and statement.
- Side form in a `p-drawer` like §6.5 (`pFocusTrap`, focus returned to the opener; full width under 1024 px): Code*, Year*, Statement* (textarea), Linked indicators (`p-multiSelect` with filter and a visible label; options = indicator-level elements as `code · name`, grouped by their depth-1 ancestor). No owner field. Row delete follows the IOB `deletable` flag from A9.

### 6.7 Design tokens
Existing utilities (`.abc-*`, `.atc-*`, `.rs-*`, `.fs-*`, `var(--ac-*)`) plus the four new `--ac-framework-accent-*` tokens (D-STF-25), added to `colors.scss` for light and dark and to the styles README per the client guide. Component styles stay under the 4 kB warning budget (root `CLAUDE.md` §4.2) — the outline editor's styles are split across `outline-editor` and `outline-row`.

### 6.8 Design review
The Framework page introduces a new pattern (outline editor) taken directly from the dev lead's mockup; no further direction is set here. The validate phase runs the `impeccable-bridge` design gate on both built pages, and the HITL pause compares them with the mockup.

---

## 7. Integration impact
Agresso staff: read only, through `alliance_user_staff`, filled by the existing sync; no change. ROAR: issues `req.user.roles`; whether it carries role 11 is the P-3 Dev check. No env var, cron, event or message.

## 8. Security & authorization
- Writes and admin reads: ODS Admin + System Admin; Center Admin → `403`. **Writes reject machine tokens** (`HumanCredentialGuard`, parity NFR-ORG-004; D-STF-20). Consumer reads A1, A2: any authenticated user, including machine tokens; they carry structure and responsible names/emails (already visible elsewhere in STAR) but **no** editor data — blockers, usage counts and `deletable` live only in the admin read A1e.
- The role is enforced by `@Roles` + `RolesGuard` only; `sec_role_endpoint_permissions` is not read by any code (P-6).
- Role assignment stays out of band (C-3, P-5).

## 9. Observability
`LoggerUtil`: one line per delete (§5.4), per carry forward (`fromYear`, `toYear`, `copied`), and per seed run (counts + unmatched responsibles with reason).

## 10. Testing strategy

| Layer | What |
| --- | --- |
| Server unit | Controller: allowed/denied per handler for ODS Admin, System Admin, Center Admin, other; machine token → `403` on every write; one denial on a `@Roles`-guarded admin area for roles `[11]` (org-structure `GET units`, R-STF-013 AC.2). First create in a level-less portfolio creates `DEFAULT_LEVELS`, and two concurrent first creates produce one level set (integration); A1 of a level-less portfolio returns empty lists, A1e virtual levels; 501st element → `400`; IOB delete blocked by an IOB provider; `parentId: null` and depth-1 `parentId` → `400`; root proposal skips a hand-typed `5` on a Dimension; A1 has no editor fields, A1e has them. Tree util: depth rules, cycle check, move, descendant counts, **four-level fixture**. Code util: root, child, gap, moved element, non-numeric parent. Service: each blocker kind blocked and free; cross-portfolio; responsibles both ways and on a non-indicator level; carry forward rules; race mapping per constraint. Registry dedup and label. `GlobalExceptions` wire shape of a `409` with blockers |
| Module wiring | `Reflect.getMetadata('imports', EntitiesModule)` contains `StrategyFrameworkModule` |
| Migration specs | `db/migration-specs/`: role idempotency and `down` guard, seed SQL shape; the generated-column DDL text for `indicator_portfolio_key` (its `information_schema.COLUMNS.EXTRA = 'STORED GENERATED'` is asserted in the Integration schema suite — a unit spec cannot reach MySQL; amended 2026-11-19) |
| Integration (`test:integration`, local DB, never `migration:test:bootstrap`) | schema + FKs, incl. `EXTRA = 'STORED GENERATED'` for `indicator_portfolio_key`; CRUD and move round-trip; a fourth level inserted by the test appears in A1 with no code change (R-STF-002 AC.1); RESTRICT backstop on an element linked by an IOB; carry forward with an injected failure (zero rows) and two concurrent calls (one `409`, no `500`); seed twice (3 levels, 4/13/31, 28 IOBs, 36 links, every IOB linked, only `1.3.2` unlinked, both pre-merge names on `4.1.1`, `4.6` absent, then 0) and with an injected failure (zero rows); all four migrations pending together with an injected seed failure (P-26); role migration up/down/up and `down` refusing while an inactive `sec_user_roles` row holds 11; **NFR-STF-001**: A1, A1e and A4, p95 over 3 runs of 20 calls (local proxy), inconclusive if runs differ by more than 30 % |
| Client unit | `canAccessOdsAdmin`; `odsAdminGuard`; sidebar **rendered DOM** per role in expanded and collapsed states, with **both** mocks extended; row icon `aria-label`s; drawer focus trap (`pFocusTrap`) and focus return to the opener; focus return after the shared alert; interceptor exemption (a `400` from `/strategy-framework` raises no global toast, a `500` still does); draft badge *New* until stored; two drafts saved → two distinct stored codes; `frameworkErrorOf` on object, string and string-array payloads; a DTO `400` (e.g. 256-character name blocked by `maxlength`, or forced) shows its message inline; a `404` from `/strategy-framework` raises no global toast, a `500` does; the result-title conflict alert in `ActionsService` is unchanged; staff picker label; read-only input while `saving`; refresh merge keeps dirty rows and drafts; title from portfolio years; URL codec; view util (nesting, counts, flattened rows, export sheets, four-level fixture); `outline-row` **name state machine** (Enter saves once; blur after Enter does not resend; Escape restores; error keeps the value; empty rejected); add-child draft and Escape; delete icon colour from `deletable`; details panel Save/Delete; staff picker (no free text); objectives `defaultYear`, carry-forward enable/disable |
| Gates observed failing once (K-004) | `npm run build` (server), `ng build` (client), client `tsc -p tsconfig.spec.json` on the touched files' normalized error set |
| Dev, first deploy (HITL) | A user given role 11 out of band: `req.user.roles` includes 11 through ROAR, a write returns `200`, the menu shows *ODS Admin* with both items (P-3). NFR-STF-001 re-timed on Dev |
| HITL | Outline geometry, indentation, accents (light and dark), focus order and resize in a real browser; side-by-side with the Framework mockup and artboard 4; requester review of the seeded content and the unmatched-responsibles list |

## 11. Rollout
- **Before merge to `dev`:** a human runs, read-only on Dev, `SELECT sec_role_id, name FROM sec_roles WHERE sec_role_id = 11` (P-17; a row with another name means renumbering before merge) and `SELECT id, name, start_year, end_year, is_active FROM portfolios` (P-31; another active portfolio overlapping 2026–2030 changes the default).
- Order: migrations `…000`→`…003` run on the Dev deploy (the Dev pipeline runs `migration:execute`); code deploys with them. Prod parity not re-measured.
- No feature flag: the pages are invisible to everyone except System Admins until someone is given the role.
- Backout: `…003` `down` (refuses if users built on the seed), or `…002`/`…001` `down` to drop the tables; `…000` refuses while any user holds role 11.
- Comms: the dev lead tells the requester which users need the role.

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-STF-1 | 2026-11-17 | One module `strategy-framework`; request-scoped write service; singleton read service + registry | Parity with the org structure; consumers inject without request scope |
| D-STF-2 | 2026-11-17 | Tables prefixed `framework_` | No confusion with the result-type `indicators` table (C-1) |
| D-STF-3 | 2026-11-17 | **Physical delete** | Allowed only when nothing references the row; frees the code (Q-1) with plain unique indexes. Rejected: soft delete (a generated column to free codes) |
| D-STF-4 | 2026-11-17 | `portfolio_id` on every element | DB-enforced code uniqueness per portfolio; filters without walking the tree (I-1) |
| D-STF-5 | 2026-11-17 | Role id **11**, *ODS Admin*, guarded migration | Next free id (P-2); guard against a hand-made Dev row (P-17) |
| D-STF-6 | 2026-11-17 | Responsibles as a child table keyed by staff ID, replaced as a set | Same model as org-structure delegates; name/email never stored |
| D-STF-7 | 2026-11-17 | Seed data generated once into a committed TS file | The pipeline cannot reach OneDrive; reviewable and reproducible |
| D-STF-8 | 2026-11-17 | Responsible matching at migration time against active staff, email first | Staff differs per environment; only verified IDs are stored |
| D-STF-9 | 2026-11-17 | Additive `exportSheetsToXlsx` | `exportRowsToXlsx`'s only caller is `DataTable`; untouched means no regression (P-14) |
| D-STF-10 | 2026-11-17 | Blockers endpoint (A8) plus `deletable`/`blockers` in the admin read A1e | The editor colours delete icons without one call per row; the dialog names blockers; `DELETE` re-checks |
| D-STF-11 | 2026-11-17 | Own read-only `PortfolioLookupRepository` | `PortfoliosService` is request-scoped (P-21) |
| D-STF-12 | 2026-11-17 | Flattened string fields in tables | `DataTable` renders text only (P-23); no change to the shared component |
| D-STF-13 | 2026-11-17 | Server clock via A0 | One clock; more than two portfolios; gap years |
| D-STF-14 | 2026-11-17 | Raw PrimeNG `p-select` / `p-multiSelect` / `p-autoComplete` / `p-drawer`, and a raw `<input>` for the inline name | `p-select` and `p-autoComplete` as the sibling page; `p-multiSelect` precedent `impact-areas.component.html`; the inline field has no wrapper equivalent. Deliberate deviation from the client guide's *Forms* convention |
| D-STF-15 | 2026-11-17 | **One self-referencing `framework_elements` table + `framework_levels`** (adjacency list) | Dev lead: the strategy may grow in levels (A-7). A level is a row, not a table or column. Rejected: a table per level (rev ≤ r3 — a new level needs migrations, entities and endpoints); closure table / nested sets (cheaper subtree reads, but ≤ 500 rows per portfolio load in one query and are walked in memory, so the extra write complexity buys nothing) |
| D-STF-16 | 2026-11-17 | Hierarchical numeric codes `1`, `1.1`, `1.1.1` | The mockup and the Tracking Tool use them; one uniqueness scope for all levels |
| D-STF-17 | 2026-11-17 | Inline name edit commits on Enter/blur, Escape reverts | The mockup edits names in place. Recorded as a child-3 exception to F-4 in `family.md`; the details panel keeps Save, Cancel, Delete |
| D-STF-18 | 2026-11-17 | Institutional Objectives as their own page and route | A-8 |
| D-STF-19 | 2026-11-17 | KPI counts and "holds KPIs" blocking come from the usage registry, shown only when a provider is registered | The mockup shows them; KPIs belong to child 4 (R-STF-012) |
| D-STF-20 | 2026-11-17 | `HumanCredentialGuard` on every write | Parity with org-structure writes (NFR-ORG-004): a machine token with an admin user must not change the framework |
| D-STF-21 | 2026-11-17 | Levels created lazily as `DEFAULT_LEVELS` on a portfolio's first element; generated-column unique index for the indicator level; the flag never moves in this spec | Every portfolio usable when empty (F-8) without a level screen; "one indicator level" enforced by the DB |
| D-STF-22 | 2026-11-17 | Editor data (`usage`, `deletable`, `blockers`) in an admin-only read A1e, not in the consumer read A1 | Keeps registry labels and IOB counts off the read that machine tokens can call |
| D-STF-23 | 2026-11-17 | Title from the portfolio's years, not its name | The stored name is `'Portfolio 2'` (P-28); renaming portfolios is out of scope |
| D-STF-24 | 2026-11-17 | Seed on a dedicated query runner with its own transaction | The only mechanism that stays atomic in TypeORM `all` mode after DDL implicit commits (P-26) |
| D-STF-25 | 2026-11-17 | Four new `--ac-framework-accent-1…4` tokens (light + dark) | No existing token set gives four distinct, visible accents in dark mode (P-29); feature tokens have precedent (`--ac-pfm-*`, `--ac-pool-funding-*`) |
| D-STF-26 | 2026-11-17 | Interceptor exemption for every `4xx` except `401` on `/strategy-framework` (wording aligned 2026-11-19 with §2.1 and T-11; it read "`400`/`409`" — the pages render every such error inline through `frameworkErrorOf`, incl. `403`/`404`); `pFocusTrap` on drawers; page-managed focus return | PrimeNG drawer and the shared alert do not manage focus (P-33); the global toast would duplicate every inline error (P-34) |
| D-STF-27 | 2026-11-19 | Way-out texts use the singular when N = 1 (level `name`, "that institutional objective", "1 record") | The §5.4 plural templates contradicted the section's own N = 1 example and would reach the UI tooltip as "those 1 … objectives" (T-04 Reviewer advisory 1); owner decision 2026-11-19 |
| D-STF-28 | 2026-11-19 | A1e carries `usageLabels` once on the view, not on each element | Labels come from the registry (§5.6) and do not vary per element; repeating them on up to 500 elements adds nothing. T-07 implemented it this way; T-08 Reviewer B found §4 said "per element"; owner decision 2026-11-19 |

**Reversion challenge (Step 2.3):** no decision removes, disables or inverts shipped behavior. D-STF-15 replaces an **unshipped** r3 design (separate tables), not delivered code. Challenge not triggered.

---

## 13. Premise Ledger

**Count:** 37 rows — 27 verified at a commit, 3 verified outside the repository or by decision (P-15 workbooks, P-18 decision, P-27 design bound), 7 `UNVERIFIED` (High: 4 — P-3, P-17, P-26, P-31 · Low: 3 — P-16, P-30, P-32).
**Blast-radius triggers:** `live-path` (menu click → page, ROAR roles; P-3, P-7, P-18) · `shared-state` (the shared sidebar and `RolesService`; the global HTTP error interceptor; the global `colors.scss` tokens; P-7, P-8, P-29, P-34) · `consumer` (`DataTable`, the xlsx util, the sidebar spec, `ActionsService.handleBadRequest` left untouched; P-14, P-23, P-25, P-36).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | No table or code exists for framework levels, elements, areas, dimensions, framework indicators or IOBs | existence | grep -i `framework_indicator\|institutional_objective\|institutional-objective\|InstitutionalObjective\|PerformanceArea\|performance_area\|enabler` over `{server,client}/**/src/**` → 0 hits (scout; both judges re-ran it, round 1). and `framework_element\|framework_level\|FrameworkElement\|FrameworkLevel` → 0 files (both judges, lineage 2) | `64a39c26` | High — integrate instead of create | — |
| P-2 | `SecRolesEnum` ends at 10; `sec_roles` has `AUTO_INCREMENT=11` in the committed baseline; columns `sec_role_id, name, focus_id, description, is_internal` | data-env | `sec_role.enum.ts:1-12`; `baseline.sql:4339-4356` | `64a39c26` | Low — another id in T-01 | — |
| P-3 | For a normal ROAR JWT, `req.user` (including `roles`) is whatever ROAR Management returns from `validate-token`; whether it includes role 11 once assigned in `sec_user_roles` is decided outside this repo. The client's `user_role_list` (`roles.service.ts:25`) comes from the same login payload (written in-repo only by impersonation, `impersonation-user.repository.ts:104`) and is not filtered on `is_active` | live-path | `jwr.middleware.ts:112-118` (`req.user = responseService.user`); `roar-management.service.ts:14-22`; impersonation branch `:260-265` | — | **High** — ODS Admins get `403` everywhere; ROAR-side work becomes a dependency | `UNVERIFIED — confirm at source before relying on it` · Dev check in §10 (owner: T-01, with the dev lead assigning the role) |
| P-4 | `RolesGuard` lets `SYSTEM_ADMIN` through any `@Roles` | location | `roles.guard.ts:29` | `64a39c26` | Low | — |
| P-5 | No route assigns roles | existence | grep `@Get\|@Post\|@Patch\|@Put\|@Delete` in `user-roles.controller.ts` → 0 | `64a39c26` | Low | — |
| P-6 | `sec_role_endpoint_permissions` is not read by application code | existence | grep -rl `endpoint_permissions\|EndpointPermission` over `server/researchindicators/src` excluding migrations/baseline → 0 files | `64a39c26` | High — permission rows needed | — |
| P-7 | `canAccessCenterAdmin` is true only for role 1 or a properly focused 9; the template gate `@if (canAccessCenterAdmin() \|\| canAccessAppConfiguration())` hides the Administration block from any other user | shared-state | `roles.service.ts:42,59-71`; readers of `canAccessCenterAdmin` (non-spec): `alliance-sidebar.component.ts:69`, `.html:73`, `center-admin.guard.ts:8`, `bilateral.service.ts:102`, `project-detail.component.ts:63` | `64a39c26` | High — ODS-only users would not see the group (§6.1) | — |
| P-8 | The sidebar builds groups in `administrationGroups()`; nested children render under a link | shared-state / consumer | `alliance-sidebar.component.ts:83-154` (re-anchored after the `staging` merge, `29b97978`); `.html:79, 109, 135, 174`; readers: template and `alliance-sidebar.component.spec.ts` | `64a39c26` | Low | sidebar task re-greps readers |
| P-9 | Org-structure staff search is request-scoped, unexported, Center/System Admin only | location | `organizational-structure.service.ts:103-116`; `organizational-structure.module.ts:42` | `64a39c26` | Low | — |
| P-10 | A helper returns the staff-carnet charset/collation clause for string FKs | existence | `src/db/helpers/staff-carnet-column.ts:17` | `64a39c26` | Low | — |
| P-11 | Newest migration on any remote branch is `1793389030636` (`origin/dev`) | data-env | `git ls-tree --name-only origin/dev server/researchindicators/src/db/migrations/ \| sort \| tail -2` (also `origin/staging`, `origin/main` → `1792764939185`), 2026-11-17 after `git fetch` | `64a39c26` | Low — renumber | T-01 re-runs before writing |
| P-12 | Every exported function under `migrations/**` is loaded as a migration; seeds live in `src/db/seeds/` | other | `orm.config.ts:55`; `1791000000004-seedOrgStructure.ts` header (D-ORG-14) | `64a39c26` | Low | — |
| P-13 | `GET /api/portfolios` has no `@Roles` | location | `portfolios.controller.ts:58-60` | `64a39c26` | Low — not load-bearing since the selector reads A0 | — |
| P-14 | `exportRowsToXlsx` writes one sheet `Values`; its only production caller is `DataTable` | consumer | `xlsx-export.util.ts:46-52`; Grep `exportRowsToXlsx` over `client/research-indicators/src` → `data-table.component.ts:6,181` plus specs | `64a39c26` | Low | — |
| P-15 | Seed sources and counts: Tracking Tool 4 areas / 13 seeded dimensions / 31 indicators / 28 IOBs / 36 links after the two alias mappings; 22 indicator and 7 dimension descriptions match the strategy workbook | data-env | `openpyxl` read of the three workbooks, 2026-11-17 (Tracking Tool file time 2026-11-17 07:44) | — (files outside the repo) | High — seed counts and AC.1 change | seed task re-reads and records file dates |
| P-16 | Most responsibles in MMF sheet 03 resolve to exactly one active staff row by email or full name | data-env | `UNVERIFIED — confirm at source before relying on it` | — | Low — more names in the unmatched list | seed task, against the local DB staff table |
| P-17 | Dev has no `sec_roles` row 11 created outside migrations | data-env | `UNVERIFIED — confirm at source before relying on it` | — | **High** — the guarded migration throws in the Dev deploy and blocks it | read-only `SELECT` on Dev before merge (§11); owner: dev lead |
| P-18 | The menu and role are named **ODS Admin** | other | Decision by the dev lead at the Phase 2 gate, 2026-11-17; canvas `Institutional Indicators.dc.html` `aria-label="ODS Admin"`; Framework mockup chip *ODS · Admin* | — | High — label, role name, route segment | — |
| P-19 | Portfolio 2 is id 2, years 2026–2030 | data-env | `portfolio-id.enum.ts:6`; migration `1782328490591:14` | `64a39c26` | Low | — |
| P-20 | Staff rows are upserted and never deleted by the Agresso sync | other | `base-control-list-save.ts:39-41`; `agresso-staff-tools.service.ts:34-46` (judge A re-read, round 1) | `64a39c26` | Low — RESTRICT FK is the backstop | — |
| P-21 | `PortfoliosService` is request-scoped through `CurrentUserUtil`; `validatePortfolio` throws `400` | location | `portfolios.service.ts:20-28`; `current-user.util.ts:7`; `portfolios.service.ts:96-101` | `64a39c26` | High — the read service would become request-scoped | — |
| P-22 | Role assignments live in `sec_user_roles(user_id, role_id, is_active)`; five tables reference `sec_roles` by FK; `user_roles` has no `role_id` | data-env | `baseline.sql:4442-4456`; FKs to `sec_roles` at `:4276, 4327, 4405, 4431, 4455`; `user_roles` at `:4863-4872` | `64a39c26` | High — the role `down` would fail | — |
| P-23 | `DataTable` cells are text-only (`text\|code\|badge\|number`); its slots are `#rowActions` and `#emptyState` | consumer | `data-table.component.ts:12`; `data-table.component.html:24,51,82` | `64a39c26` | Low — D-STF-12 | — |
| P-24 | The Agresso staff sync never writes `alliance_user_staff.is_active` (default 1) | data-env | Grep `is_active` over `server/researchindicators/src/domain/tools/agresso` (non-spec) → 0 hits, 2026-11-17 | `64a39c26` | Low — inactive is tested with a fixture row | — |
| P-25 | The sidebar spec has **two** `RolesService` mocks without `canAccessOdsAdmin` (`:39-44`, `:690` after the `staging` merge) and several casts of them | consumer | `alliance-sidebar.component.spec.ts:39-44, 690` (re-anchored at `29b97978`) (judge B, lineage 2) | `64a39c26` | Low — sidebar tests would throw until every mock gains it | sidebar task greps `canAccessAppConfiguration` in the spec |
| P-26 | When `…001`–`…003` are pending together, TypeORM's default `all` mode plus the implicit commit of `CREATE TABLE` leaves the migration connection outside any transaction, and a nested `startTransaction` is only a `SAVEPOINT` | other | `MigrationExecutor.js:28` (default `all`), `:169-180` (override forbidden); `MysqlQueryRunner.js:90-99` (nested → SAVEPOINT) — judge A, lineage 2; the implicit commit itself not run. `UNVERIFIED — confirm at source before relying on it` | — | **High** — without D-STF-24 the seed is not atomic in the Dev deploy | T-08, the batch run with an injected failure (observed red on the shared runner first) |
| P-27 | A portfolio's framework stays small enough (≤ 500 elements) to load in one query and walk in memory for every write and read | data-env | Seed: 48 elements for Portfolio 2 (P-15); NFR-STF-001 bounds the read at ≤ 500 | — (design bound) | Low — switch the tree util to recursive CTEs (MySQL 8) without changing the schema | performance test (§10) |
| P-28 | Portfolio 2's stored name is `'Portfolio 2'`; no migration renames it | data-env | `1782328490591-CreatePlatformsTable.ts:14`; Grep `UPDATE.{0,3}portfolios` (-i) over `server/researchindicators/src` → only `1783024745006` (years of id 1) — judge A, lineage 2 | `64a39c26` | Low — the title uses years (D-STF-23) | — |
| P-29 | The client has no inline-edit field (`(blur)=`) and no recursive component; `outline-row` is a new pattern. Accent tokens that exist: `--ac-green-*`, `--ac-orange-1/2`, `--ac-light-blue-*`, `--ac-primary-blue-*`; **no lime**; in dark mode green, light-blue and primary-blue steps are dark surfaces (e.g. `--ac-green-500: #14251a` on `--ac-background: #191919`) | existence | Grep `\(blur\)=` over `client/research-indicators/src/app` → 0 files (judge A); `org-tree.component.ts:14` uses `TreeTableModule`; `grep -o "--ac-[a-z-]*[0-9]*" client/research-indicators/src/styles/colors.scss \| sort -u` and the light (`:6-51`) / dark (`:143-178`) values, 2026-11-17 | `64a39c26` | Low — pattern and palette as §6.3 | — |
| P-30 | MySQL on every target supports a unique index over a STORED generated column (MySQL 8) | data-env | Dev snapshot header `Server version 8.0.45` (`baseline.sql:5`, both judges, lineage 2). Local and Prod versions: `UNVERIFIED — confirm at source before relying on it` | — | Low — fall back to a service check under the portfolio lock | T-02 runs the migration locally; Prod version read by a human before the Prod release |
| P-31 | No other active portfolio overlaps 2026–2030 with a later `start_year` (the baseline shows `portfolios` `AUTO_INCREMENT=4`, so a third row may exist) | data-env | `UNVERIFIED — confirm at source before relying on it` (`baseline.sql:2340`) | — | **High** — R-STF-015 AC.2 default portfolio changes | read-only `SELECT` on Dev before merge (§11); owner: dev lead |
| P-32 | InnoDB checks a self-referencing RESTRICT FK row by row, so a multi-row `DELETE` mixing parents and children can fail on order | other | `UNVERIFIED — confirm at source before relying on it` (judge B, lineage 2; reasoned from InnoDB FK semantics) | — | Low — `down` already deletes one depth at a time | T-08 `down` run |
| P-33 | PrimeNG 19.0.6 `p-drawer` has no focus trap or focus return; `primeng/focustrap` exists; the drawer is not yet used in the client; the shared global alert has no focus handling | existence | `client/research-indicators/node_modules/primeng/package.json:3` (`19.0.6`); `grep -ci "focustrap\|focus" node_modules/primeng/fesm2022/primeng-drawer.mjs` → 0, 2026-11-17; `node_modules/primeng/focustrap` present; Grep `p-drawer\|DrawerModule` over `src/app` → 0 (judge A); `global-alert.component.html:2` | `64a39c26` | Low — focus handled by `pFocusTrap` and the page (D-STF-26) | — |
| P-34 | The global HTTP error interceptor toasts every error except listed URL exemptions, using `errors` or else `description` (the exception name), and already exempts `400` from `/pool-funding-tag` and `/pool-funding-alignment` | location | `client/research-indicators/src/app/shared/interceptors/http-error.interceptor.ts:15-23` (`errorDetailMessage`), `:101-119` (exemptions incl. `/pool-funding-tag` `:103`, `/pool-funding-alignment` `:105`, URL-only `isPrmsSyncError` `:114`), `:121-131` (toast gate; `409` already excluded at `:123`), 2026-11-17 | `64a39c26` | Low — exemption added (D-STF-26) | — |
| P-35 | No server entity maps a generated column today (`generatedType` / `GENERATED ALWAYS` absent from entities) | existence | Grep `generatedType\|GENERATED ALWAYS` over `server/researchindicators/src` entity files → 0 (judge B, lineage 2) | `64a39c26` | Low — mapping in §2.1 is new; covered by the `EXTRA` check in the Integration schema suite (T-10), observed in T-02's scratch run (amended 2026-11-19). **Premise added 2026-11-19 (T-03):** the mapping keeps `migration:generate` clean only when TypeORM's `orm_metadata` holds the expression; Dev has no `orm_metadata` (nor a row for `1786636994078`'s `active_primary_alignment`), so generate fails on any Dev copy, and with an empty table it emits `ALTER … CHANGE indicator_portfolio_key …` — prune that statement from any generated migration | — |
| P-36 | `ActionsService.handleBadRequest` matches any `errorDetail` with a string `description` and a string-or-object `errors` and then renders the result-title conflict alert from `errors.result_official_code` | consumer | `actions.service.ts:70-79` (shape check), `:139-176` (`showConflictShapeAlert`), judge B lineage 2 round 2 | `64a39c26` | Low — framework errors bypass it (`frameworkErrorOf`); the shared service is unchanged | — |
| P-37 | The server connection collation is `utf8mb4_0900_ai_ci` and new or converted tables use it; mixing collations in a comparison raises MySQL 1267 | data-env | `server/researchindicators/src/db/config/mysql/orm.config.ts:60` (`charset: 'utf8mb4_0900_ai_ci'`); `1792681023849-convertPrmsSyncTablesCollation.ts:16,19`; server guide §7 (as merged from `staging`, 2026-11-17) | `29b97978` | Low — tables declared `utf8mb4_0900_ai_ci` (§3) | — |

---

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
| --- | --- |
| Tasks | **17** — the `tasks.md` decomposition (T-01…T-17): the write service split into elements (T-05) and objectives (T-06), plus the Dev/HITL pass (T-17) |
| LOC | **≈ 9,000** (server ≈ 4,800 incl. tests, migration specs and the data file; client ≈ 4,200 incl. tests). Re-based on the sibling, whose first slice measured 4,427 LOC against a 2,500 tripwire (org design §14). **Intermediate tripwire:** after T-05 (element writes), compare server actuals to 2,000 LOC and re-estimate before continuing |
| LOC — re-based 2026-11-19 | **≈ 12,000** (server ≈ 7,000, client ≈ 5,000). At T-04 the server measured 2,199 LOC (`git diff --numstat e75276055 HEAD -- server`; 1,069 production / 1,130 tests), above the 2,000 intermediate tripwire one task early. Owner decision: accept and re-base; review-round cap unchanged. Next check: after T-08, server vs 5,000 |
| LOC — re-based again 2026-11-19 (after T-05) | **≈ 18,000** (server ≈ 12,000, client ≈ 6,000). After T-05 the server measured 6,549 (`git diff --numstat e75276055 -- server`; 3,049 production / 3,500 tests). Owner decision: accept the real size; review-round cap unchanged. Next check: after T-10 (server close) |
| LOC — re-based a third time 2026-11-20 (after T-10) | **≈ 18,000 kept** (server **13,581 accepted** — server side complete, T-01…T-10; client ≈ 4,400 left inside the whole). Measured: `git diff --numstat e75276055 HEAD -- server` 11,784 + T-10 1,797 = 13,581 (+13 % over ≈ 12,000). Owner decision: *re-basar y seguir*; review-round cap raised to **≈ 32**. Next check: after T-16 (client close), client vs ≈ 4,400 |
| LOC — re-based a fourth time 2026-11-20 (after T-16) | **≈ 21,500** (server 13,581; client ≈ 7,900). At T-16 the client measured 5,916 (tracked diff + untracked files) against its ≈ 4,419 share (+1,497); T-15 and T-17 remain. Owner decision: *re-basar y seguir*; review-round cap raised to **≈ 36**. Next check: at T-17 (spec close) |
| Review rounds | **≈ 26** (one per task plus margin for the seed, the role migration, the sidebar and the outline editor) |

Depth stays **Full**: the estimate matches it.

## 15. Open questions
- None blocking. Q-3 (generic banner text) is a default the dev lead may change. P-17 and P-31 need a read-only look at Dev before merge.

## 16. References
- Requirements [`requirements.md`](requirements.md) rev 3; proposal rev 6; family F-2, F-4…F-9 and the child-3 exceptions to F-1, F-3, F-8.
- [`judgment.md`](judgment.md) — lineage 1 on r3 (approved); lineage 2 on r4, corrected in r5 and r6.
- Archived org-structure design (D-ORG-6, 8, 10, 14, 16) and control-lists design (D-CTL-11, 14).
- Jira PARI-258.
