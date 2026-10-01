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
