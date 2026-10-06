# Execution Log — Institutional Performance / Control Lists

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/institutional-performance/control-lists` |
| Branch | `institutional-kpis` |
| Approval Mode | `gated` |
| Leader | Claude (Opus 5.5) · Implementer wrapper `akili-implementer` · Reviewer wrapper `akili-reviewer` |
| Jira | epic AC-1773 — mark each sub-task / story Done when it closes (AC workflow has no direct Open → Done) |
| Status | **re-planned (Run 4)** — 5 vertical slices; judgment round 2 APPROVED; T-01 waits on the user's decision on suspects J-9…J-11 |

## Task Execution History

### 2026-09-27 — Run 1: environment pre-check, paused

- **Next eligible tasks:** T-01 (document order), T-02 (no dependencies).
- **Pre-check (design §11, `docs/infrastructure.md` §6.5):** T-01's verification must run on the disposable TEST scratch schema.
  - `docker info` → daemon not running (`DOCKER_DOWN`).
  - `ls -a server/researchindicators | grep -i env` → only `.env.example`; no `.env`, so `ARI_TEST_MYSQL_*` are unset.
- **Decision (user, 2026-09-27):** pause execution; no task started, no code changed, no attempt consumed.
- **To resume:**
  1. start Docker Desktop;
  2. create `server/researchindicators/.env` from `.env.example`, with `ARI_TEST_MYSQL_HOST=127.0.0.1`, `ARI_TEST_MYSQL_PORT=3307`, `ARI_TEST_MYSQL_USER_NAME=root`, `ARI_TEST_MYSQL_USER_PASS=scratch_root_pw`, `ARI_TEST_MYSQL_NAME=ari_scratch_test` (values from `docker-compose.test.yml`), plus the Dev `ARI_MYSQL_*` values from a teammate;
  3. verify the **resolved host/port** is the local container, not the shared Dev database (infrastructure §6.5, finding F-01);
  4. `npm run compose:test:up`;
  5. then run `/akili-execute institutional-performance/control-lists`.

### 2026-09-29 — Run 2: local tooling installed; scratch schema blocked by a pre-existing migration

- **Tooling installed (user machine, macOS arm64):** Colima + Docker CLI 29.5 + Docker Compose 5.5 (instead of Docker Desktop, which needs a paid licence in large organizations), `fnm` with Node **22.23.3** (the server targets `node:22.12.0` in its Dockerfile and Node 22 in CI; the machine's global Node is 26). `npm ci` done in `server/researchindicators`.
- **`.env`:** created from `.env.example` (gitignored — `server/researchindicators/.gitignore:43`), with `ARI_TEST_MYSQL_*` = `127.0.0.1:3307`, `root`, `ari_scratch_test`. The user fills the remaining values; Dev is reached through the VPN.
- **Scratch container:** `npm run compose:test:up` → `research_indicators_server_test_mysql`, MySQL 8.0.46, bound to `127.0.0.1:3307` (verified with `docker ps`, not by the variable name — infrastructure §6.5, F-01).
- **Blocker — `npm run migration:test:bootstrap` fails on an existing migration, before any of this spec's code:**
  - The failing migration is `1787600000000-createPiDelegates.ts`, with `ER_FK_INCOMPATIBLE_COLUMNS` (errno 3780) on `FK_pi_delegates_project_id`.
  - Measured on the scratch schema: `agresso_contracts.agreement_id` is `utf8mb3 / utf8mb3_general_ci`, and `pi_delegates.project_id` is `utf8mb4 / utf8mb4_0900_ai_ci`.
  - The migration pins its table to `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci` (`:37`), while its own header comment (`:14-19`) still says it must be utf8mb3 to match `agresso_contracts`. `git log -1` on the file shows `027bc60f` (2026-09-25), "fix(migrations): update character set and collation for pi_delegates table".
  - The baseline snapshot `src/db/baseline/baseline.sql` was taken from Dev on 2026-08-14.
  - **Hypothesis (not verified against Dev):** Dev's `agresso_contracts.agreement_id` changed to utf8mb4 after the snapshot, and the merged migration was edited to follow it. That would make the baseline stale for this migration. It would also mean a merged migration was edited, against root `CLAUDE.md` §4.1 ("never edit a merged migration").
  - **Tried and refuted:** setting the scratch database default to `utf8mb3` changes nothing, because the migration pins its own charset.
- **Decision (user, 2026-09-29):** review with the dev team before choosing a fix. The options offered were:
  - one read-only query to Dev plus a local-only scratch adjustment;
  - a baseline refresh as a separate change;
  - team review.
- **Nothing in this spec's scope was changed; no attempt consumed; no Jira transition.** The scratch container is still running under Colima (`colima stop` to free resources).
- **Questions for the dev team:**
  1. What charset/collation does Dev's `agresso_contracts.agreement_id` have today?
  2. Was `1787600000000-createPiDelegates.ts` edited after it had been applied anywhere?
  3. Should `baseline.sql` be refreshed?

### 2026-09-29 — Run 3: scratch schema loaded from a current database dump; blocker cleared

- **Source (user-provided):** `~/Downloads/stardb-20260928_23_40_01.sql`, 52 MB. `mysqldump` 8.0.42 against server 8.4.8; host header `roardb…us-east-1.rds.amazonaws.com`, database `stardb`.
- **Contains real data:** 214 `INSERT` statements, including `sec_users`, `results` and `agresso_contracts`, with 16 `@cgiar.org` addresses. For that reason:
  - it is loaded **only into the local disposable scratch container** (`127.0.0.1:3307`);
  - `src/db/baseline/baseline.sql` (schema-only by rule) is **not** replaced;
  - the dump is never committed or copied into the repo.
- **Load:** the container was recreated, and the dump was piped with `DEFINER=` clauses stripped (the same mechanical fix as the baseline README), in 8.4 s with no errors. Result: 219 tables and views, 365 `migrations` rows, 14,601 `results`.
- **Confirms the Run 2 hypothesis:** in this dump, `agresso_contracts` and `pi_delegates` are both `utf8mb4 / utf8mb4_0900_ai_ci`, so the committed baseline was stale.
- **Pending migrations:** `npm run migration:test:execute` → `No migrations are pending`.
- **Still for the dev team:**
  - `1787600000000-createPiDelegates.ts` was edited after merge (`027bc60f`), against root `CLAUDE.md` §4.1;
  - the committed `baseline.sql` (2026-08-14) is stale and should be refreshed as a separate change.
  Neither is in this spec's scope.
- **MySQL version note:** the scratch image is `mysql:8.0` (8.0.46); the source server is 8.4.8. The load succeeded on 8.0. The image is left unchanged (`docker-compose.test.yml` is a shared file).

### 2026-10-01 — Run 4: new developer machine; tasks re-cut into vertical slices

- **Machine:** the user's Windows 11 machine (Docker Desktop). Runs 1–3 ran on another machine (macOS), so the scratch container from Run 3 does not exist here.
- **Persistent local development database (not the TEST scratch schema):**
  - container `ari_local_mysql`, `mysql:8.4` (8.4.11), `127.0.0.1:3306`, named volume `ari_local_mysql_data`, `--restart unless-stopped`, `--skip-log-bin`;
  - restored from the user-provided `stardb-20260930_23_40_01.sql` with `DEFINER=` stripped: 219 tables and views, 24 routines, 365 `migrations` rows, 14,602 `results`;
  - `server/researchindicators/.env` (gitignored) `ARI_MYSQL_*` → `127.0.0.1:3306 / stardb` (`DB_PORT=3306`). The resolved target was verified with dotenv, not by the variable name;
  - `migration:show` against it: 344 applied, 0 pending (the database also carries rows from other branches).

  This database holds real data, and **it is not the evidence target for any task**. Migration checks still run on the disposable `ARI_TEST_MYSQL_*` schema (`127.0.0.1:3307`, `ari_scratch_test`), which still has to be created on this machine (`npm run compose:test:up` + load).
- **Re-plan (requester, 2026-10-01):**
  1. Kept the generic model (D-CTL-1) after the requester reviewed the trade-off against one table per list.
  2. Each value's own PK `id` is visible and read-only, with explicit seed ids (D-CTL-14, R-CTL-004 AC.3).
  3. No composite FK. List membership is checked in the consumer service through `assertValueInList` (D-CTL-15, R-CTL-006 AC.2).
  4. Tasks re-cut from 10 horizontal tasks into 5: four vertical slices (DB + server + screen) and the HITL check (D-CTL-16). One migration and one PR per slice.
- **Open before T-01:** RB-3 — `judgment.md` predates D-CTL-14…16 (re-run `/akili-judge` or accept explicitly here). RB-4 — Jira sub-tasks need re-mapping.
- No code changed; no attempt consumed; no Jira transition.
- **Later the same day (requester):**
  - **No disposable schema.** Every DB check runs on the local development database `ari_local_mysql` (`127.0.0.1:3306/stardb`). `ARI_TEST_MYSQL_*` in `.env` now point to it, and the resolved target was checked with dotenv: CORE and TEST both resolve to `127.0.0.1:3306/stardb`.
    - `migration:test:bootstrap` / `baseline:test:load` must never run here. The guard in `load-baseline.js:64` should refuse, but running it to observe the refusal was blocked by the session's permission classifier, so the refusal is **not** verified red (K-004).
  - **Jira re-mapped** (user said yes): AC-1780…AC-1784 rewritten as T-01…T-05 and re-parented to AC-1779 / AC-1775 / AC-1778 / AC-1776 / AC-1774. AC-1785…AC-1789 retitled `[OBSOLETE]` and left Open for the PO to close. No status transitions.
  - **Judgment Day round 2:** two blind `sonnet` judges → APPROVED. 0 confirmed severe; 3 suspects (J-9 route-guard test, J-10 roles falsifiers in T-02/T-03, J-11 "no lists" empty state); 6 info. Ledger in `judgment.md`.

### 2026-10-01 — Run 5: T-01 (Slice 1: Categories)

- **Leader:** Claude Opus 5.5. Implementers: `akili-implementer` (sonnet) ×2 in parallel — one server, one client (slice rule, D-CTL-16). Reviewers: `akili-reviewer` (opus) ×2 in parallel lens mode (T-01 touches a migration and authorization) — **risk** (server) and **reliability + readability** (client + contract). Effort: high. Skills — server: `nestjs-expert`, `api-design-principles`, `error-handling-patterns`; client: `angular-developer`, `ui-ux-pro-max`.
- **Environment pre-check:** `ari_local_mysql` up; dotenv resolved CORE = TEST = `127.0.0.1:3306/stardb`.
- **Diff handling (deviation):** the diff (33 files, ~2,770 lines) went to the Reviewers as a validated scratchpad file (non-empty, key symbols present — K-011) instead of inline, to save output tokens. The Reviewers read it with `Read`.

#### Attempt 1 — FAIL (both lenses)

- **Files (server):**
  - `src/db/migrations/1790900000000-createControlListCategories.ts`;
  - `src/domain/entities/control-lists/{entities/control-list-category.entity.ts, repositories/control-list-category.repository(.spec).ts, dto/*.dto.ts, control-lists.types.ts, control-lists.service(.spec).ts, control-lists.controller(.spec).ts, control-lists.module.ts}`;
  - `main.routes(.spec).ts`, `entities.module(.spec).ts`;
  - `test/control-lists-categories.integration-spec.ts`.
- **Files (client):**
  - `shared/interfaces/{control-lists,administration-nav}.interface.ts`;
  - `alliance-sidebar.component.{ts,html,scss,spec.ts}`;
  - `app.routes(.spec).ts`, `api.service.ts`, `modal.types.ts`, `all-modals.service.ts`;
  - `center-admin/control-lists/control-lists.component.{ts,html,scss,spec.ts}`.
- **Implementer evidence (server):**
  - migration on the local dev DB: P2 2 rows (ids 1, 2), P1 0; seed re-run adds 0; `SHOW CREATE TABLE` matches §3 (`AUTO_INCREMENT=3`);
  - falsifiers 1–4 observed red (1 and 2 run as hand-written copies of the seed statement on scratch ids — accepted by the risk Reviewer for the statement shape);
  - `test:integration -- control-lists` 4/4; `npm run build` OK;
  - booted route table + `/swagger-json` show the 5 routes.
- **Implementer evidence (client):**
  - 339 suites / 7,821 tests green; lint clean; `ng build` OK. The pre-existing sidebar scss soft-budget warning grew from 6.51 to 6.87 kB;
  - hex grep on the new component files → 0;
  - falsifiers 5 and 7 observed red. Falsifier 6 was run as a different mutation (see FAIL C2).
- **Leader re-measurement (serial, workers idle):**
  - server: 3,684/3,687 — the 3 failures, in `capdev-bulk-summary.template.spec.ts` and `result-innovation-use/entity-metadata.spec.ts`, **reproduce at base 18ef3255 with the work stashed (3 failed / 17 passed)**, so they are pre-existing;
  - client: 7,821/7,821.

- **⚠️ Process incident (not a diff defect):**
  - What happened: a `migration:test:revert` that timed out at 120 s was moved to the background; the worker then issued a second one. Both ran. The second reverted the unrelated, shipped `CreatePiDelegateHistory1787601000000` and dropped `pi_delegate_history` on the local dev DB.
  - Worker recovery: re-ran `migration:test:execute`, which restored the schema empty.
  - **Leader recovery:** confirmed the column list was identical to the user's backup `stardb-20260930_23_40_01.sql`, then inserted that backup's single `INSERT` for the table (FK checks on): 10 rows, now 10. `migrations` = 366 rows (365 + 1 new).
  - **Rule for every later task:** never background or retry a migration command; check the top `migrations` row before and after every revert; one migration command at a time.

- **Reviewer (risk lens) — STATUS: FAIL:**
  1. A duplicate-name 409 reaches the user as the literal string "ConflictException".
     - The server throws `ConflictException({message:{description, field:'name'}})`. `GlobalExceptions` (`global.exception.ts:22-29`) therefore sends `description: 'ConflictException'` and `errors: {description, field}` (an object), and `ToPromiseService` copies that body into `errorDetail`.
     - `extractErrorMessage` skips `errors` because it is not a string, and falls back to `description`.
     - The client `fail()` fixture invents a shape the server never sends.
     - Violated: T-01 Client unit "server 409 shown as-is"; design §6.2 Modal/Confirm rows. Remediation: pin one wire shape on both sides, use the literal `GlobalExceptions` output in the fixtures, and add a server test of the envelope.
  2. A4/A5 have no `@ApiParam`. Violated: design §4 header, NFR-CTL-005, root `CLAUDE.md` §4.1. Remediation: add `@ApiParam` for `id`.
  3. There is no `LoggerUtil` info log on category create, update or delete. Violated: design §9. Remediation: log `{entity, id, portfolioId, userId}` and assert one call per write.
- **Reviewer (reliability lens) — STATUS: FAIL:**
  1. Same as risk 1, plus field errors must render **inline** (`errors.field === 'name'`), not as a toast. Violated: T-01 Client unit, design §6.2, R-CTL-002 *Duplicate name*.
  2. Falsifier 6 was not run as written. The named mutation (`optionDisabled`) cannot redden the current test, which reads the `portfolioOptions()` signal and calls `selectPortfolio` directly, bypassing the rendered `p-select`. Violated: T-01 Falsifier 6 + Red run; K-004, KZ-001. Remediation: assert on the rendered select (option not disabled; click it → A1 called with 1 → empty state), then run the `optionDisabled` mutation.
  3. The "(not configured)" label goes stale: the A2 summaries are not re-fetched after a create or delete. Violated: R-CTL-001 Details, design §6.2 Header, D-CTL-10. Remediation: re-fetch A2 after a successful create/delete; add a page test.
  4. New hex literals in the sidebar flyout nested row (`hover:bg-[#F4F7F9]`, `text-[#112F5C]` ×2). Violated: root `CLAUDE.md` §4.2, design §6.4. Remediation: `var(--ac-grey-100)`, `atc-primary-blue-600` / `var(--ac-primary-blue-600)`.
  5. Same as risk 2 (`@ApiParam`); consider `ParseIntPipe`.
- **ADVISORY (recorded, not gating):**
  - a category description cannot be cleared on edit (sent as `undefined`);
  - `selectPortfolio` has a race between out-of-order responses;
  - the `successfulRequest === false` load branches are untested;
  - grandchildren skip the `hide` filter (not reachable today);
  - unused `trackByPortfolioId` / `CommonModule`; `bg-white` is not a token;
  - the integration suite cannot reach the real `JwtMiddleware` or machine tokens, the `GlobalExceptions` envelope, `ValidationPipe` 400s, or a real MySQL 1062, and its 403 case has not been observed red;
  - `+id` without `ParseIntPipe` → a likely 500 on `abc`;
  - whitespace-only names are accepted through the API;
  - double toast on non-409 errors (interceptor + component);
  - **P-10 ahead:** `ControlListsService` injects request-scoped `CurrentUserUtil`, so T-04's `assertValueInList` and the registry must live in a provider without it;
  - the integration cleanup uses `LIKE` with `_` wildcards.
- **Leader adjudication:**
  - every FAIL item is in scope for T-01;
  - contract decision: **keep the server payload** (`errors: {description, field}`); the client reads `errors.description` / `errors.field`, and a server test pins the envelope;
  - `ParseIntPipe` is folded into the `@ApiParam` fix, as both Reviewers' remediation suggests;
  - the P-10 advisory is carried forward to the T-04 brief.

#### Attempt 2 — PASS (both lenses)

- **Effort:** xhigh, one level up after the FAIL. Two fresh Implementers ran in parallel.
- **DB rule for this attempt:** no migration command was allowed, and none was run.
- **Relay:** mid-run, the Leader relayed the server worker's 404 finding to the client worker.
- **Server changes:**
  - `@ApiParam` + `ParseIntPipe` on A4/A5.
  - `LoggerUtil` info log after a successful create, update or delete: `control_lists.<action> entity=control_list_category id= portfolio_id= user_id=`. Nothing is logged on error paths.
  - New `control-lists.global-exceptions.spec.ts`: a real service exception goes through the real `GlobalExceptions` and the exact body is asserted. It pins this contract:
    - **409** → `{description:'ConflictException', status:409, errors:{description, field:'name'}, timestamp, path}`
    - **404** → `{description:'NotFoundException', status:404, errors:'Portfolio <id> not found', …}` (`errors` is a string)
  - Integration: `PATCH`/`DELETE /categories/abc` → 400.
- **Client changes:**
  - `extractFieldError` reads only `errorDetail.errors` (string | `{description, field}` | array) and never `description`.
  - `field: 'name'` → inline error (`role="alert"`); any other error → toast.
  - Fixtures equal the pinned bodies.
  - Rendered `p-select` overlay test for falsifier 6.
  - `refreshPortfolioSummaries()` after a successful save or delete.
  - Sidebar nested flyout uses tokens (`hover:bg-[var(--ac-grey-100)]`, `atc-primary-blue-600`).
- **Reds observed, then reverted:**
  - 409 `field` `'name'`→`'title'` → envelope spec red.
  - 404 message wrapped in an object → envelope spec red.
  - Create log removed → `Expected number of calls: 1, Received: 0`.
  - A5 back to `+id` → real integration `DELETE /categories/abc` returned **500** (`QueryFailedError: Unknown column 'NaN'`).
  - Falsifier 6 exactly as written (`disabled: !configured` + `optionDisabled`) → `classList.contains('p-disabled')` Received `true`.
  - Old `extractErrorMessage` restored → `nameFieldError()` Received `null`.
  - Falsifiers 5 and 7 re-confirmed red.
- **Worker results:**
  - server: control-lists jest 4 suites / 32 tests; `test:integration -- control-lists` 6/6; `npm run build` OK;
  - client: 339 / 7,827; lint clean; `ng build` OK; hex grep on the new files and on the added sidebar lines → 0.
- **Leader re-measurement (serial, workers idle):**
  - server `npm test -- --silent`: 406 suites / 3,692 tests, 3 failed — the same 2 pre-existing suites that reproduce at base;
  - client: 339 / 7,827 passed.
- **Lint gate (Leader):** `npx eslint src/domain/entities/control-lists <migration> <integration spec>` → 255 errors, **all `Delete ␍` (0 of any other kind)**. Cause: the new files have CRLF in this Windows working tree (`core.autocrlf=true`); git stores LF. The gate is therefore measured on the **committed blobs** after commit (see below).
- **Reviewer (risk lens) — STATUS: PASS.** Risk 1–3 and reliability 5 resolved. Roles, the 1062 → 409 mapping, the migration and the registration are unchanged and still hold.
- **Reviewer (reliability lens) — STATUS: PASS.** Reliability 1–4 resolved, no regressions. The attempt-1 sidebar, route, J-9 and contract checks are untouched and still hold.
- **ADVISORY (recorded, not gating):**
  - double toast on non-409 save errors (interceptor + component) — reachable via a portfolio deleted after page load, then a POST;
  - the inline name error persists while the user retypes;
  - the staleness tests assert `displayLabel`, not the rendered option text;
  - the A2 refresh also runs after an edit (harmless; the comment is inaccurate);
  - `user_id=undefined` would be logged for a machine-token caller (not reachable through role-gated handlers);
  - the integration suite still cannot reach the real `JwtMiddleware` or a real MySQL 1062;
  - carried from attempt 1: a description cannot be cleared on edit; out-of-order `selectPortfolio` responses; whitespace-only names through the API; the `LIKE '_'` cleanup.
- **`SHOW CREATE TABLE control_list_categories`** (attempt 1, local dev DB; this table is unchanged since):
  `id bigint AUTO_INCREMENT PK · portfolio_id bigint NOT NULL · name varchar(150) utf8mb4_unicode_ci NOT NULL · description varchar(500) NULL · display_order int NOT NULL DEFAULT 0 · audit columns (created_at/by, updated_at/by, is_active, deleted_at) · UNIQUE uq_control_list_categories_portfolio_name (portfolio_id,name) · KEY idx_control_list_categories_portfolio (portfolio_id) · FK FK_control_list_categories_portfolio_id → portfolios(id) ON DELETE RESTRICT · ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
- **Swagger (attempt 1, unchanged handlers + `@ApiParam` added):** the booted route table and `/swagger-json` list `GET /api/control-lists/categories`, `GET /api/control-lists/portfolios/summary`, `POST /api/control-lists/categories`, `PATCH /api/control-lists/categories/{id}`, `DELETE /api/control-lists/categories/{id}`, with tag "Control Lists" and bearer security.
- **Requirements covered:** R-CTL-001 (category isolation, default portfolio, *not configured* selectable and refreshed), R-CTL-002 *Duplicate name*, R-CTL-007 (A1–A5 roles; menu + route guard — J-9), R-CTL-008 (menu placement, header, navigator, states), R-CTL-010 (2 categories), NFR-CTL-002/003/005.
- **Forward pointers (copy into later briefs):**
  - **T-02:** category delete blocked when it has lists (409 + warn log, design §9); the 409 `errors.field` contract must be reused for the list duplicate-key error; the blocked-delete message flows through `extractFieldError`.
  - **T-04:** `ControlListsService` is request-scoped (it injects `CurrentUserUtil`), so the registry and `assertValueInList` must live in a provider without it (P-10).
  - **All later slices:** never background or retry a migration command; check the top `migrations` row before and after every revert.
- **Final status: PASS on attempt 2.**

## Constitution Impact: T-01

- **New server module:** `src/domain/entities/control-lists/`, registered at path `control-lists` in `main.routes.ts` and `entities.module.ts`. **New client page:** `center-admin/control-lists`. **Shared shell:** `AdministrationNavChild` gained optional `children` (one nested level).
- **Child guides:** no new child `CLAUDE.md` is needed yet (a standard entity module). At archive, the client child guide should mention the nested-nav `children` field and the error-contract pattern (`errorDetail.errors`, never `description`).
- **CodeGraph:** re-index pending.
- **Lint gate on committed blobs (Leader, after `847cda8d`):** `git show HEAD:<file> | npx eslint --stdin --stdin-filename <file>` over all 19 server `.ts` files in the commit → **19 linted, 0 failing**. Falsifier (K-004): the same file with CRLF line endings → **13 errors**, so the gate does redden. Server lint criterion PASS. The client gate (`npm run lint -- --quiet`) was green in the workers' runs.
- **Human check (user, 2026-10-01, local):** the user ran T-01 locally (server on `:3001`, client `ng serve` on `:4200`, DB `ari_local_mysql`) and reported "Todo funcionó bien". This informal check does **not** discharge any T-05 step (KZ-002: it does not say which behaviors were observed).
- **Session paused (2026-10-01):** all local services stopped (`ari_local_mysql` stopped; dev servers on 3001/4200 stopped). **Next eligible task: T-02 (Slice 2: Lists).** Pending user decision: transition Jira AC-1780 to Done.
- **To resume:** `docker start ari_local_mysql`, then `/akili-execute institutional-performance/control-lists` (or `/akili-resume`).

### 2026-10-02 — Run 6: T-02 (Slice 2: Lists)

- **Leader:** Claude Opus 5.5.
- **Base commit:** `1f16b32f`, after the `staging` merge. Before T-02, migration `CreatePrmsWebhookDeliveryTable1790086170692` from `staging` was applied to the local DB at the user's request (367 rows, 0 pending).
- **Implementers:** 2 × `akili-implementer` (sonnet) in parallel, one server and one client, effort high.
- **Reviewers:** 2 × `akili-reviewer` (opus), parallel lenses (migration + immutable key): risk (server) and reliability (client + contract).
- **Leader relay mid-run:** A1 `ListSummary` must include `description` (the list header needs it). The server added it.

#### Attempt 1 — FAIL (reliability lens) / PASS (risk lens)

- **Files (server):**
  - `src/db/migrations/1790900000001-createControlLists.ts`;
  - `entities/control-list.entity.ts`, `repositories/control-list.repository(.spec).ts`, `dto/{create,update}-control-list.dto.ts`;
  - modified `control-lists.{service,controller,module,types}.ts` and their specs, plus `control-lists.global-exceptions.spec.ts`;
  - `test/control-lists-lists.integration-spec.ts`;
  - `test/control-lists-categories.integration-spec.ts` (needed the new repository provider).
- **Files (client):** `control-lists.component.{ts,html,scss,spec.ts}`, `control-lists.interface.ts`, `api.service.ts`.
- **DB evidence (server worker):**
  - top `migrations` row before = `CreatePrmsWebhookDeliveryTable1790086170692` (id 369);
  - execute → 6 rows for P2, ids 1–6; seed statements re-run → 0 ×6;
  - top row before revert = `CreateControlLists1790900000001` (id 370); the revert dropped only `control_lists`; top row after = id 369; categories intact; re-applied (id 371);
  - `SHOW CREATE`: `uq_control_lists_portfolio_key`, `idx_control_lists_category`, FKs to `portfolios` and `control_list_categories` both RESTRICT, `utf8mb4_unicode_ci`, `AUTO_INCREMENT=7`.
  - The DB rule held (foreground only, top row checked around the revert).
- **Pinned bodies:**
  - list-key duplicate: 409 `errors:{description, field:'listKey'}`;
  - system-list delete: 409 `errors:{description}`;
  - category has lists: 409 `errors:{description}`;
  - cross-portfolio move: 400 `errors:'<string>'`.
- **Reds observed (server):**
  - falsifier 1 (`listKey` in the update DTO → 200);
  - falsifier 2 (`forbidNonWhitelisted` off → 200);
  - falsifier 3 (Conflict instead of BadRequest);
  - falsifier 6 (roles `+[7]`);
  - category-has-lists check disabled → nothing thrown;
  - warn call removed → 0 calls.
- **Reds observed (client):**
  - falsifier 4 (`PAlliance 2026-2030 · kpi.direction`);
  - falsifier 5 (delete button present on a system list);
  - falsifier 7 (empty state null).
- **Worker results:**
  - server: control-lists 5 suites / 59 tests; integration 2 suites / 8 tests; build OK; Swagger A1–A8 via `createDocument` (no port bound);
  - client: 31/31 in the component spec; full suite 342 / 7,889; lint and build OK; hex grep → 0.
- **Leader re-measurement (serial):**
  - no stray servers;
  - DB: `migrations` 368, `control_lists` 6, categories 3 (one created by the user), `pi_delegate_history` 10;
  - server 4,033 tests, 3 pre-existing failures; client 7,889 passed.
- **Implementer judgment calls (accepted by the risk Reviewer):**
  - seeded list names: "Unit of measure", "Direction", "Measurement frequency", "KPI level", "Type", "Organizational level";
  - `code_prefix` NOT NULL, with a `deriveDefaultCodePrefix()` fallback.
- **Reviewer (risk lens) — STATUS: PASS.** Every T-02 server clause holds; both judgment calls are consistent with the spec. ADVISORY:
  1. `PATCH {"categoryId": null}` silently moves the list to the first active category with a 200: `IsOptional` passes `null`, and TypeORM drops null keys in `where` (`SelectQueryBuilder.js:2468`).
  2. `PATCH {"name": null}` → 500 (NOT NULL, errno 1048); the T-01 category DTO likely has the same hole.
  3. The client `ControlList` type does not match `ControlListResponse`.
  4. The category-delete pre-check ignores inactive lists while the FK counts them → 500 (only reachable through direct DB edits).
  5. Create/delete races → 1451/1452 → 500.
  6. An empty `codePrefix` can be stored through the API.
  7. The seed may insert fewer than 6 lists on Dev if a seeded category was deleted first — add a post-deploy count check to T-05.
  8. The description cannot be cleared from the UI.
- **Reviewer (reliability lens) — STATUS: FAIL:**
  1. **Discovered Issue:** the client `ControlList` declares `listKey` and `codePrefix: string | null`, while the server `ControlListResponse` is `{id, portfolioId, categoryId, key, name, description, codePrefix: string, isSystem}`. `response.data.listKey` is always `undefined`, and the spec fixture uses the wrong shape too. **Violated Rule:** the brief's contract check ("any mismatch = FAIL"), design §4 A6/A7, root `CLAUDE.md` §4.2. **Remediation:** rename to `key`, make `codePrefix: string`, and make the fixture the literal server shape.
  - ADVISORY:
    - the description cannot be cleared (also T-01 categories); suggested fix: send the trimmed `''` on PATCH;
    - an invalid key pattern leaves Save disabled with no message;
    - array 400s go to a toast;
    - `categoryId ?? 0`;
    - a stale ASSUMPTION comment;
    - the navigator is not collapsible (not in T-02's scope);
    - the Leader should re-run client lint/build serially.
- **Leader adjudication:**
  - Reliability issue 1 is in scope and goes to rework.
  - Risk advisories **1 and 2** and the description-clearing advisory (risk 8 / reliability 1) are folded into the rework as **Leader-adjudicated defects**. Each is a reachable state, in code this spec owns, that changes data on a 200 or answers 500 (KZ-008; design §5 rules 1–2, P-14). The same holes in the T-01 category DTO/form are included, because they are the same rule in the same module.
  - All other advisories stay recorded only. Advisory 7 is carried to T-05 as a post-deploy check: `control_lists WHERE is_system=1` = 6 on Dev.

#### Attempt 2 — PASS (both lenses)

- **Effort:** xhigh. No migration command was run.
- **Server:**
  - `@ValidateIf(dto => dto.X !== undefined)` on `UpdateControlListDto.categoryId` / `.name` and on `UpdateControlListCategoryDto.name`. It replaces the inherited `IsOptional` (same `CONDITIONAL_VALIDATION` kind, class-own metadata wins); the inherited `IsInt` / `IsString` / `IsNotEmpty` checks stay.
  - `normalizeDescription()` in `updateCategory` / `updateList`: `''`, whitespace or `null` → stored NULL.
  - New tests: DTO pipe specs with the real `ValidationPipe`, and 5 integration cases against real MySQL.
- **Reds observed against attempt-1 code** (the actual failure modes are recorded in place of the hypothesized 500):
  - `categoryId: null` → **200** (silent move);
  - list `name: null` → **200**, with the list renamed to `''` (the local `sql_mode` is non-strict);
  - category `name: null` → bogus **409** (the duplicate pre-check matched a random category through TypeORM's null-key drop);
  - `description: ''` → stored `''`.
- **Client:**
  - `ControlList` mirrors `ControlListResponse` (`key`, `codePrefix: string`), and `ControlListCategory` gains `displayOrder`;
  - fixtures are the literal server shapes;
  - PATCH sends the trimmed `''` to clear a description (lists and categories); POST omits it. Two clears-description tests observed red, then green.
  - Falsifiers 4, 5 and 7 re-confirmed red.
- **Worker results:** server control-lists 7 suites / 78 tests, integration 13/13, build OK, eslint clean on changed files; client 33/33 in the component spec, 342 / 7,891 full, lint and build OK.
- **Leader re-measurement (serial):** no stray servers; server 426 suites / 4,052 tests, 3 pre-existing failures; client 342 / 7,891 passed; client `npm run lint -- --quiet` clean; `npm run build` complete.
- **Reviewer (risk lens) — STATUS: PASS.** All 3 adjudicated defects resolved and proven at pipe and integration level, with no regressions. The contract is aligned field by field.
- **Reviewer (reliability lens) — STATUS: PASS.** Attempt-1 issue 1 resolved, description clearing fixed, no regressions.
- **ADVISORY (recorded only):**
  - POST create (A3/A6) still stores a literal `''` description — reachable only through the API, not from the STAR UI;
  - the integration 400 tests assert only that an error is present, not the exact body;
  - comments cite review history instead of the contract rule.
  - Carried from attempt 1: risk advisories 4–7. Advisory 7 is owed to T-05 as a check that `control_lists WHERE is_system=1` = 6 on Dev.
- **Requirements covered:**
  - R-CTL-001 (cross-portfolio move 400);
  - R-CTL-002 *Delete a non-empty category* (409 + warn log);
  - R-CTL-003, all scenarios except *Used by*: immutable key, same key in two portfolios, system list cannot be deleted, custom list lifecycle;
  - R-CTL-008 *Empty list* (no lists);
  - R-CTL-010 (6 lists);
  - NFR-CTL-002/003/005.
- **Forward pointers:**
  - **T-03:** A1 `valueCount` stays 0 until values exist; a list with values must block its delete (409, non-field `{description}` shape); apply `normalizeDescription` to value descriptions too; seeded list names are editable.
  - **T-04:** `usedBy` is still `[]`. P-10 still applies: `ControlListsService` is request-scoped.
- **Final status: PASS on attempt 2.**
- **Lint gate on committed blobs (Leader, after `a77f94d5`):** 18 server `.ts` files linted via stdin → 0 failing. The gate was proven able to redden in Run 5 (CRLF falsifier).

### 2026-10-02 — Run 7: T-03 (Slice 3: Values)

- **Base commit:** `f94fd95c`.
- **Implementers:** 2 × sonnet in parallel, server and client, effort high.
- **Reviewers:** 2 × opus, parallel lenses: risk (server) and reliability (client + DataTable + contract).
- **Leader relay:** the client's assumed Value shape was relayed to the server mid-run. The field names already matched; the server adds `inUse: 0`, which the client carries as optional.

#### Attempt 1 — FAIL (both lenses)

- **Files (server):**
  - `src/db/migrations/1790900000002-createControlListValues.ts`;
  - `entities/control-list-value.entity.ts`, `repositories/control-list-value.repository(.spec).ts`, `dto/{create,update}-control-list-value.dto.ts` (+ update DTO spec);
  - modified service, controller, module and types, and their specs;
  - `test/control-lists-values.integration-spec.ts`; the two earlier integration specs needed the new provider.
- **Files (client):**
  - `shared/utils/{natural-compare,xlsx-export}.util(.spec).ts`;
  - `shared/components/data-table/*`;
  - `control-lists.interface.ts`, `api.service.ts`, `control-lists.component.*`;
  - `angular.json` (`allowedCommonJsDependencies: ["exceljs"]`, added after the CommonJS warning was observed).
- **DB evidence (server worker):**
  - top row before: id 371, `CreateControlLists`;
  - execute → 23 values, ids 1–23; seed re-run → 0;
  - without `NOT EXISTS` → `ER_DUP_ENTRY` on PRIMARY;
  - `dir-01` into `kpi.direction` → `ER_DUP_ENTRY '2-dir-01' for key uq_control_list_values_list_code`;
  - top row before revert: id 372 (own); the revert dropped only `control_list_values`; top row after: 371; re-applied;
  - `SHOW CREATE`: FK `list_id` → `control_lists` RESTRICT, uq `(list_id, code)`, uq `(list_id, value)`, idx `(list_id, display_order)`, `utf8mb4_unicode_ci`, `AUTO_INCREMENT=24`.
- **Reds observed:**
  - server: `id` whitelisted → DTO spec resolves; TECHNICAL_SUPPORT on A12 → `+ 7`; list-has-values check disabled → nothing thrown; `ValidateIf` removed → null code/value resolve;
  - client: falsifier 3 (ID bound to `<input>`), 4 (no numeric → 3 assertions), 5 (export sliced → 10 ≠ 11), 6 (sort reset → `code` ≠ `value`).
  - `ng build` caught an AOT error that Jest missed (`T extends Record<string, unknown>`), fixed with `T extends object`.
- **Leader re-measurement (serial):**
  - no stray servers;
  - DB: `migrations` 369, values 23, lists 7 (the 7th is "Otra", id 15, `created_by` 39 — the same user as category "indicador", i.e. the user's manual testing, not a test leak), categories 3, `pi_delegate_history` 10;
  - server 4,091 tests, 3 pre-existing failures; client 345 / 7,925; lint clean; build complete; initial bundle 1.35 MB; `exceljs-min` in a lazy chunk.
- **Reviewer (risk lens) — STATUS: FAIL:**
  1. **Discovered Issue:** a value can be saved with an empty code, and a null code is not rejected:
     - POST `{code: ""}` → 201 with `code = ''`;
     - PATCH `{code: ""}` blanks the stored code;
     - POST `{code: null}` → probably 1048 → 500, or a false 409.
     - Same family: `{displayOrder: null}` / `{isActive: null}` on A11 → NOT NULL.
     **Violated Rule:** R-CTL-004 (code required, 1–30); design §5 rule 4 (an empty code gets the proposal); §4 A10. **Remediation:** treat `''`, whitespace and `null` as omitted on A10; add `IsNotEmpty` / `MinLength(1)`; null → 400 on A11; DTO-spec cases observed red.
  2. **Discovered Issue:** the client pre-fill (`deriveNextProposedCode`) ignores the list's `code_prefix`. `X-50` in `kpi.direction` pre-fills `X-51` instead of `DIR-04`. **Violated Rule:** design §5 rule 4; T-03 Scope — screen. **Remediation:** give the client `codePrefix` and mirror `proposeNextCode`, or let the server expose the proposal.
  - ADVISORY:
    - A10 does not apply `normalizeDescription` (also true of category and list create);
    - the `L<n>` format is chosen by prefix, not by key;
    - A1 counts values N+1;
    - the 1062 fallback reports `code`;
    - the integration DataSource returns bigint ids as strings, so a case-only self-rename is uncovered.
- **Reviewer (reliability lens) — STATUS: FAIL:**
  1. **Discovered Issue:** the client code proposal diverges from the server: (a) a mixed-prefix code wins; (b) an empty list pre-fills nothing, so a new list's first value never shows a proposed code. **Violated Rule:** T-03 Scope — screen ("proposed code pre-filled"); R-CTL-004; design §5 rule 4. **Remediation:** add `codePrefix` to A1 `ListSummary` (record a D-CTL decision) and mirror the server rule, including `<prefix>-01` on an empty list; tests for the mixed prefix and the empty list.
  2. **Discovered Issue:** `displayOrder` can reach the server as `null` (`p-inputNumber` emits `null` when cleared), and the A11 DTO lets `null` through into a NOT NULL column. **Violated Rule:** design §4 A11 vs §3 — contract mismatch. **Remediation:** normalize on the client; `@ValidateIf` on `displayOrder` / `isActive` → 400; tests.
  3. **Discovered Issue:** a `data-table.component.ts` comment asserts an unobserved red — that removing `customSort` / `sortFunction` would fail the click test. The test cannot tell natural from lexical order (`toContain('Alpha value 1')`). **Violated Rule:** root `CLAUDE.md` §4.3 K-004 / KZ-014; KZ-001. **Remediation:** assert the exact natural first page, ascending and descending; observe red for each mutation separately; reword the comment.
  - ADVISORY:
    - stale response in `selectList` → `loadValues` (A's late response can overwrite B, and the next "Add value" POSTs a code from A's values to B);
    - search with no matches shows the false "No values yet" state and unmounts the table;
    - no catch on an `exceljs` chunk-load failure;
    - `displayRows` coerces nulls to `''` (nulls sort first) and sorts numbers as strings;
    - `computed()` over plain `@Input`s; unused `implements OnInit`; `trackByIndex` misnamed;
    - stale ASSUMPTION comments; `inUse` optional;
    - sheet name hard-coded to `Values`; booleans exported raw;
    - `bg-white` is not a token;
    - `resetPageOnSort` may jump to page 1 after a reload — check in T-05;
    - the resize disclaimer is in the component, not the spec.
- **Leader adjudication:**
  - Every FAIL item is in scope.
  - Contract decision **D-CTL-17**, recorded in `design.md` §12, with the A1 row updated: A1 `ListSummary` gains `codePrefix` (and documents the `description` added in T-02). The client mirrors the server's `proposeNextCode`, including `<prefix>-01` on an empty list.
  - Folded in as **Leader-adjudicated defects** (reachable, in code this spec owns — KZ-008):
    - the stale-response race in `loadValues`, which can write a wrong code into another list;
    - the false empty state on a search with no matches (R-CTL-008 UI states);
    - `normalizeDescription` on create for values, categories and lists (the forward pointer was only half met);
    - the resize disclaimer moved or copied into the spec file (the T-03 disqualifier's wording).
  - All other advisories are recorded only.

#### Attempt 2 — PASS (both lenses)

- **Effort:** xhigh. No migration command was run.
- **Server:**
  - A10: code trimmed; `''`, whitespace or `null` → proposed code (rule 4);
  - A11: `''` / whitespace / `null` code → 400; `''` / `null` value → 400; `null` displayOrder / isActive → 400;
  - `normalizeDescription` on create for A3, A6 and A10;
  - D-CTL-17: `ListSummary.codePrefix`.
  - `proposeNextCode`: pattern `^L(\d+)$` (prefix `L`) or `^<escaped>-(\d+)$`; next number = max + 1; `L<n>` unpadded, otherwise `<prefix>-<nn>`; an empty list gives `<prefix>-01`.
- **Client:**
  - `deriveNextProposedCode` mirrors `proposeNextCode` line by line, using `codePrefix`, and always pre-fills;
  - `displayOrder` sends 0 on POST and is omitted on PATCH when cleared;
  - the `loadValues` stale-response guard covers every branch;
  - DataTable separates `hasNoRows` from no-matches, with `emptymessage` keeping the table mounted;
  - the click-sort test asserts exact natural arrays in both directions;
  - the resize disclaimer is now in the spec; stale ASSUMPTION comments replaced.
- **Reds observed:**
  - client, from its first report:
    - mixed prefix → `Received "X-51"`; empty list → `Received ""`;
    - displayOrder null on POST and on PATCH;
    - stale guard → A's rows overwrote B's; no-matches → table unmounted;
    - removing `[customSort]` → 3 tests red; removing `(sortFunction)` → 2 tests red. The comment was reworded to what was observed.
    - Falsifiers 3–6 re-confirmed.
  - **server, only after the Leader required it** (the first report had "no red lines to paste" — a K-004/KZ-014 gap, corrected within the attempt):
    - gate back to `=== undefined` → unit `Number of calls: 0` ×2; integration `Expected "SCR-01" Received ""` and `expected 201, got 409`;
    - `@IsNotEmpty` removed → resolves;
    - `ValidateIf` removed → `null` resolves;
    - `normalizeDescription` removed → raw value stored;
    - `codePrefix` removed → TS2741;
    - leak check after the red that inserted a row: 0 rows with `code=''`.
- **Worker results:** server control-lists 10 suites / 142 tests, integration 3 suites / 24 tests, build OK, eslint clean; client 345 / 7,930, lint and build OK, hex grep → 0.
- **Leader re-measurement (serial):**
  - no stray servers;
  - DB: `migrations` 369, values 23, 0 rows with id > 23 or `code = ''`, lists 7, categories 3, `pi_delegate_history` 10;
  - server 429 suites / 4,116 tests, 3 pre-existing failures; client 345 / 7,930; lint clean; build complete; initial bundle 1.35 MB; `exceljs-min` in a lazy chunk.
- **Reviewer (risk lens) — STATUS: PASS.** Both FAIL issues resolved; the client and server algorithms are identical; `normalizeDescription` is on create; D-CTL-17 is on both sides; no regressions; every red is a real red of its gate.
- **Reviewer (reliability lens) — STATUS: PASS.** FAIL issues 1–3 and all four adjudicated defects resolved, with no regressions.
- **ADVISORY (recorded only):**
  - the proposal regex is case-sensitive while the unique index is not, so an API-saved `dir-04` makes the next proposal 409 (fix: the `i` flag on both sides);
  - a whitespace-only `value` passes A10/A11;
  - the `org.level` fixture expects `codePrefix: 'DIR'` (misleading);
  - a spec comment says "row 11 of 12";
  - `hasNoMatches` is unused;
  - `valuesLoading` can stick after a portfolio switch (no visible effect found);
  - no catch on an `exceljs` chunk-load failure;
  - `bg-white` on the export button is not a token.
- **Requirements covered:**
  - R-CTL-003 *Custom list lifecycle* (a list with values → 409);
  - R-CTL-004, all of it, incl. AC.3 (read-only permanent ID);
  - R-CTL-009 (natural sort, export of filtered + sorted rows, page size keeps sort and search; resize persistence → T-05);
  - R-CTL-008 table states;
  - R-CTL-010 (23 values; totals 2 / 6 / 23 seeded);
  - NFR-CTL-003, NFR-CTL-004 (`aria-sort`).
- **Forward pointers:**
  - **T-04:** A9 `inUse` is 0 until the registry exists; the client's `ControlListValue.inUse?` is optional; A12 must gain the in-use block (409, non-field `{description}`, "deactivate instead"); A13 reads by key with natural code order (reuse the same comparator semantics); `ControlListsService` is request-scoped (P-10).
  - **T-05:** resize persistence in a real browser; check whether the table jumps to page 1 after a reload (`resetPageOnSort`); post-deploy check that `control_lists WHERE is_system=1` = 6 and values = 23 on Dev.
- **Final status: PASS on attempt 2.**
- **Lint gate on committed blobs (Leader, after `f7955d46`):** 18 server `.ts` files linted via stdin → 0 failing.

### 2026-10-05 — Change request CR-1 (user): Code prefix shown read-only on list edit; flaky export test fixed

- **Request (user):** the list modal shows every field on create but not on edit (for example, Code prefix). Review which other fields are missing, and at least add the prefix to the edit modal as non-editable.
- **Leader field audit (create vs edit):**
  - **List:** create shows Name, System key, Description and Code prefix. Edit showed Name, System key (disabled) and Description, while Code prefix was hidden and seeded `''`.
  - **Category:** create and edit match (Name, Description).
  - **Value:** create and edit match (Code, Value, Description, Order, Active); edit also shows the read-only ID.
  - **Not shown in either list mode** (reported to the user, not built):
    - the **category** — on create it is assigned silently from context; A7 accepts a same-portfolio `categoryId` move, but no UI exists for it;
    - the **system / custom** type.
  - The prefix stays non-editable after create, because the A7 update DTO does not whitelist it.
- **Implementer:** sonnet, medium.
  - Code prefix is rendered in edit mode as a disabled input, pre-filled from `list.codePrefix` (D-CTL-17); create is unchanged; the PATCH body is still exactly `{name, description}`.
  - 3 DOM-level tests. The two render tests were observed red before the fix (`Received: null`, spec :805 and :819). The PATCH-keys test was proven by a mutation adding `codePrefix` (array diff `+ "codePrefix"`).
- **Defect found by the Leader during re-measurement:** `xlsx-export.util.spec.ts` (from T-03) failed in **2 of 3** full client runs and always passed alone.
  - **Root cause:** fake timers were enabled before the real `exceljs` / JSZip `writeBuffer`, which schedules its own timers, so `runAllTimersAsync` raced the library → 5 s timeout.
  - **Fix (test only; the util is unchanged):** real timers; a `setTimeout` spy that captures only the util's 100 ms cleanup callback and forwards every other call; explicit invocation and assertions; a 30 s timeout; `restoreAllMocks`.
  - **Red:** with `revokeObjectURL` removed from the util → `Expected: "blob:xlsx-export" Number of calls: 0`.
  - **Results:** the worker ran the full suite twice, 7,933 green both times. Leader re-measurement: 345 / 7,933 passed; lint clean.
- **Reviewer (opus) — STATUS: PASS.** ADVISORY: the spy matches any 100 ms timer, not only the util's (no such exceljs timer found; harden only if it ever flakes).
- **Files:** `control-lists.component.{html,ts,spec.ts}`, `shared/utils/xlsx-export.util.spec.ts`.

### 2026-10-06 — Run 8: T-04 (Slice 4: Usage and consumer access)

- **Base commit:** `6da269ff`.
- **Implementers:** server (sonnet, high) and client (sonnet, medium) in parallel. **Reviewers:** opus, two parallel lenses.
- **Environment:** the **user's own dev servers** were running (`nest start --watch` on 3001 from `dist/`, `ng serve` on 4200), and they were left alone. The workers were told not to run the server's `npm run build`, which would delete `dist/` under the watch server; `npx tsc -p tsconfig.build.json --noEmit` was the compile gate. No migration commands were run (no schema change in this slice).

#### Attempt 1 — PASS (both lenses)

- **Server, new files:**
  - `control-list-usage.registry.ts` — singleton with 0 constructor params;
  - `control-list-value-lookup.service.ts` — holds `assertValueInList`; its constructor takes only the two repositories;
  - `control-list-natural-compare.util.ts`;
  - `dto/get-list-values-by-key-query.dto.ts`;
  - `test/control-lists-usage.integration-spec.ts`.
- **Server, modified:**
  - A9 / A13 return real `inUse` (summed across providers);
  - A12 blocks a value in use: 409 `errors:{description:'Value "<v>" is referenced by <n> record(s) and cannot be deleted; deactivate it instead'}`, plus a warn log;
  - A1 `usedBy` comes from the registry;
  - **A13** `GET /api/control-lists/by-key/:listKey/values?portfolioId=&activeOnly=true` — no `@Roles` (still authenticated through `JwtMiddleware`); ordered by display order, then natural code; unknown key → 404;
  - the module exports the registry and the lookup service.
- **`assertValueInList`:**
  - cross-list → 400 `Value <id> belongs to list "<a>", not "<e>"` (checked first);
  - cross-portfolio → 400 `… portfolio <a>, not portfolio <e>`;
  - unknown id → 404;
  - `is_active` is not checked.
- **Design deviation, accepted by the risk Reviewer and amended in `design.md` §5 rule 10:** `assertValueInList` lives on `ControlListValueLookupService`, not on `ControlListsService` (P-10). The `tasks.md` registry-test wording was amended to match R-CTL-005, where counts are summed over every provider.
- **Client:**
  - `ControlListValue.inUse` is now required;
  - an **In use** column (number), between Order and Active;
  - the list header shows "Used by: <names joined ', '>", or "Not linked to a form yet" when there are none;
  - the in-use 409 is shown as-is through the existing flow.
- **Reds observed (server):**
  - registry returning only the first provider → `Expected 5 Received 2`;
  - A12 block disabled → nothing thrown;
  - cross-list and cross-portfolio checks disabled → the promise resolved;
  - `@Roles` added to A13 → `Received [9, 1]`;
  - a `CurrentUserUtil` param added to the registry / lookup → `TestingModule.compile()` DI error.
  - The temporary consumer table plus a raw `DELETE` proved the FK RESTRICT backstop.
- **Reds observed (client):**
  - column removed → index −1;
  - fallback removed → `Received ""`;
  - generic message → detail mismatch.
- **Worker results:**
  - server: control-lists 14 suites / 182 tests (stable 3×); integration 4 suites / 32 tests; full 4,156 with 3 pre-existing failures; tsc and eslint clean;
  - Swagger via `createDocument`: all 13 endpoints (`/categories`, `/categories/{id}`, `/portfolios/summary`, `/lists`, `/lists/{id}`, `/lists/{id}/values`, `/values/{id}`, `/by-key/{listKey}/values`), tag "Control Lists", bearer;
  - client: 345 / 7,937, lint and build OK, hex grep → 0.
- **Leader re-measurement (serial):**
  - DB: no `*itest*` tables; `migrations` 369; values 23; `pi_delegate_history` 10;
  - server tsc clean; 433 suites / 4,156 tests, 3 pre-existing failures;
  - client 345 / 7,937; lint clean.
  - **Server `npm run build` not run** (the user's watch server is running) — open done criterion.
- **⚠️ Data observation:** the user-created list **"Otra" (id 15)** no longer exists. It was present at the close of T-03 (Run 7: 7 lists).
  - Leader audit plus the risk Reviewer's audit of every DELETE / DROP in the four integration suites: all target ids from the suite's own inserts (`control_lists` `AUTO_INCREMENT` is now 34) or `LIKE '__t0X_itest__%'` patterns that cannot match "Otra"; no deletes by category or list of seeded or user rows; no TRUNCATE.
  - **The tests are cleared.** The user's own dev servers can write the same DB. The cause is undetermined (no binlog or general log), and the user has been asked. A UI delete would have printed `control_lists.deleted entity=control_list id=15` on the user's server console.
- **ADVISORY (recorded):**
  1. In the T-04 integration `afterAll`, `DROP TABLE IF EXISTS` is not in `finally`; a `beforeAll` failure before CREATE TABLE skips the rest of the cleanup (scratch rows leak; no user data at risk).
  2. A12 does not map FK errno 1451 → 409, so a consumer with the FK but no provider (or a race) gets a 500 (P-14). **Carry to child 2 `organizational-structure`.**
  3. The `assertValueInList` portfolio comparison is strict on a bigint (safe in production because `bigNumberStrings: false`; unsafe under a raw DataSource) — suggest `Number()` on both sides.
  4. `register()` does not deduplicate — consumers must register once, from a singleton `onModuleInit`. **Carry to child 2.**
  5. A13 returns 404 for an inactive list; `activeOnly` values `0` / `no` / empty resolve to true (fails safe); A13 exposes `inUse` and runs every provider's count on each read.
  6. Client: the 409 fixture text is a placeholder, not the server's literal string; a stale comment at `component.ts:839`.
  7. A10/A11 responses return `inUse: 0`; the client always reloads through A9, so this is harmless.
- **Requirements covered:**
  - R-CTL-005, all of it (including AC.3, the test consumer);
  - R-CTL-003 *Used by*;
  - R-CTL-006, AC.1–2 (ordered read, unknown key, *Value from another list*);
  - R-CTL-004 *Deactivate* (A13 omits inactive values);
  - R-CTL-007 (A13 open to any authenticated user);
  - R-CTL-001 end to end.
- **Forward pointers:**
  - **child 2 (`organizational-structure`):** register the consumer once, from a singleton (`onModuleInit`); add the FK `ON DELETE RESTRICT` to `control_list_values.id`; call `ControlListValueLookupService.assertValueInList` before every write that stores a value id; map errno 1451 → 409 in A12 (advisory 2).
  - **T-05:** confirm the user's servers are stopped, then run the server `npm run build`; then the HITL checklist.
- **Final status: PASS on attempt 1.** Done criteria 1–2 met; criterion 3 waits on the server build.
