# Execution — Changes / Control Lists: global lists read by key, values applicable per portfolio

## Document Control

- **Spec path:** `docs/specs/changes/control-lists-global-scope/`
- **Spec id:** 2026-10-control-lists-global-scope
- **Branch:** `institutional-kpis`
- **Approval Mode:** `gated` (requirements.md Document Control)
- **Leader:** Claude Code session (Opus 5.5 — at or above the registry's T1 `opus`)
- **Started:** 2026-10-13

---

## Task Execution History

### T-00 — HITL: prepare the local database

- **Final status:** PASS (HITL — requester-approved; the task declares `Review: none`, so there is no Reviewer verdict)
- **Date:** 2026-10-13
- **Executed by:** Leader, inline, under the requester's explicit instruction ("You run it, no export") — a human step, not production code.
- **Requirements covered:** R-CLG-006 *Old local schema* (revert half); requirements §11 "export first" rule.

**Step 1 — hosts (host/name only):**
```
ARI_MYSQL_HOST=127.0.0.1
ARI_MYSQL_NAME=stardb
ARI_TEST_MYSQL_HOST=127.0.0.1
ARI_TEST_MYSQL_PORT=3306
ARI_TEST_MYSQL_NAME=stardb
```
The first `migration:show` failed with `connect ECONNREFUSED 127.0.0.1:3306` (container `ari_local_mysql`, mysql:8.4, `Exited (137)`); the requester restarted it. That failed run was **not** read as a count (K-014).

**Step 2 — export:** requester: no hand-made rows to keep ("no export").

**Pre-revert state** (`migration:show`, ANSI stripped, exit 0; the one `error` match was the migration name `AddedErrorMessageAiReport1781106535639`):
```
[X] 364 CreatePiDelegates1787600000000
[X] 367 CreatePiDelegateHistory1787601000000
[X] 369 CreatePrmsWebhookDeliveryTable1790086170692
[X] 368 CreateControlListCategories1790900000000
[X] 371 CreateControlLists1790900000001
[X] 373 CreateControlListValues1790900000002
```

**Deviation from the plan (disqualifier anticipated, not hit blind).** T-00 step 3 expected three reverts `…002`, `…001`, `…000`. TypeORM 0.3.20 reverts the **highest id** (`MigrationExecutor.js:286` → `getLatestExecutedMigration`, which takes `sortedMigrations[0]` of `ORDER BY id DESC`, `:403`, `:447`). On this DB `CreatePrmsWebhookDeliveryTable` (id 369) ran after `…000` (id 368), so the third revert would have dropped `result_prms_sync_history`. Leader stopped after two reverts and asked. Checked: `result_prms_sync_history` held **0 rows**. **Requester decision:** "Revert both" — revert PrmsWebhook too; T-01's `migration:test:execute` re-applies it.

**Step 3 — reverts (host checked = `127.0.0.1`/`stardb` before each; all exit 0):**
```
== revert 1
query: DROP TABLE `control_list_values`
Migration CreateControlListValues1790900000002 has been  reverted successfully.
== revert 2
query: DROP TABLE `control_lists`
Migration CreateControlLists1790900000001 has been  reverted successfully.
== revert 3
query: DROP TABLE `result_prms_sync_history`
Migration CreatePrmsWebhookDeliveryTable1790086170692 has been  reverted successfully.
== revert 4
query: DROP TABLE `control_list_categories`
Migration CreateControlListCategories1790900000000 has been  reverted successfully.
```

**Step 4 — checks:**
- `SHOW TABLES LIKE 'control_list%'` → empty set. `SHOW TABLES LIKE 'result_prms_sync_history'` → empty set.
- `SELECT id,name FROM migrations ORDER BY id DESC LIMIT 2` → `367 CreatePiDelegateHistory1787601000000`, `364 CreatePiDelegates1787600000000`.
- `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` (exit 0, ANSI stripped; error lines excluding migration names: 0) → `applied: 344`, `pending: 4`:
```
[ ] CreatePrmsWebhookDeliveryTable1790086170692
[ ] CreateControlListCategories1790900000000
[ ] CreateControlLists1790900000001
[ ] CreateControlListValues1790900000002
```

**Decisions:** D-EX-1 — revert by id order through `CreatePrmsWebhookDeliveryTable` (empty table) instead of hand-editing the `migrations` table (requester, 2026-10-13).

**Issues:** the T-00 plan's assumption "three reverts, `…000` third" was false on this DB (an unrelated migration with an older timestamp ran later). It does not change requirements or design. §3.1's "revert by name" rule held; only the expected count was wrong.

**Forward pointers → T-01 (carry in the brief):**
1. Expect **4** pending before `migration:test:execute` (PrmsWebhook included), and quote all four applied afterwards. The `migration:show` loader check must list the control-list migrations **and** PrmsWebhook with no loader error.
2. Do **not** run `migration:test:bootstrap` or `baseline:test:load` (tasks.md *Evidence database*).

---

### T-01 — Slice 1: global lists, reads by key, System admin menu and roles

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-13
- **Requirements covered:** R-CLG-001…008 (the clauses listed in tasks.md T-01), NFR-CLG-001…003.
- **Dispatch:** two Implementers in parallel (`akili-implementer`/sonnet). **Server + DB:** effort `xhigh` (migrations + authorization; the tier was not escalated to `max` so that author ≠ auditor holds against the opus Reviewers). **Client:** effort `high`. Skills as tasks.md lists (server: nestjs-expert, api-design-principles, error-handling-patterns; client: angular-developer, ui-ux-pro-max; systematic-debugging on failure), no deviation. Exemplars: `app-config.controller.ts:156` (role pair), `configuration/prompt-manager/` (System admin page + route).
- **Review mode:** parallel lens reviewers (`akili-reviewer`/opus, ≠ Implementer model). A = server/DB (conformance + reliability + risk); B = client (conformance + readability + resilience).
- **Leader deviation, diff delivery:** the combined diff is 7,560 lines / 343 KB, so it was given to the Reviewers as a validated **file** in the session scratchpad (`git diff --cached -M`, split into `t01-server.diff` 6,003 lines and `t01-client.diff` 1,557 lines; K-011: non-empty, contains `uq_control_lists_key` ×7 and `appConfigurationGuard` ×12), not pasted inline. Both Reviewers report reading it in full.

#### Attempt 1 — files changed (42; staged `git diff --cached --stat`: +2,759 / −2,085)
- **DB:** `src/db/migrations/1790900000000…002` rewritten; **new** `src/db/seeds/control-lists.seed.ts`.
- **Server:** entities ×2, DTOs ×6 (+1 spec), `control-lists.types.ts`, `control-lists.service.ts`, `control-list-value-lookup.service.ts`, `control-lists.controller.ts`, `control-lists.module.ts`; specs: service, controller, global-exceptions, lookup, **new** `control-lists.validation.spec.ts`; `package.json` (`!**/db/seeds/**`); `test/control-lists-{categories,lists,values,usage}.integration-spec.ts` rewritten; **new** `test/control-lists-seed.integration-spec.ts`; **deleted** `test/control-lists-isolation.integration-spec.ts`; `docs/specs/kaizen/institutional-performance--control-lists.md` :106, :136.
- **Client:** page folder `git mv` `center-admin/control-lists` → `configuration/control-lists` (ts, html, scss, spec), `control-lists.interface.ts`, `api.service.ts` (+spec), `alliance-sidebar.component.ts` (+spec), `app.routes.ts` (+spec), `app-configuration.guard.spec.ts`.

#### Database evidence (host `127.0.0.1`/`stardb` checked before every command — server Implementer)
```
4 migrations are new migrations must be executed.
Migration CreatePrmsWebhookDeliveryTable1790086170692 has been  executed successfully.
Migration CreateControlListCategories1790900000000 has been  executed successfully.
Migration CreateControlLists1790900000001 has been  executed successfully.
Migration CreateControlListValues1790900000002 has been  executed successfully.
SHOW COLUMNS FROM control_list_categories LIKE 'portfolio_id' -> (empty)
SHOW COLUMNS FROM control_lists LIKE 'portfolio_id'           -> (empty)
control_list_categories | Non_unique 0 | uq_control_list_categories_name | name
control_lists           | Non_unique 0 | uq_control_lists_key            | list_key   (+ idx_control_lists_category Non_unique 1)
seeded ranges: categories id<=2 =2, lists id<=6 =6, values id<=23 =23
```
Final `migration:show` (ANSI stripped): exit 0, pending 0, applied 348, no error line. Migration ids moved (PrmsWebhook 374, …000 375, …001 380, …002 381) because falsifier 3 reverted and re-applied `…001`/`…002` by name.

#### Verification
| Check | Who | Result |
| --- | --- | --- |
| `npx jest src/domain/entities/control-lists --silent` (+ entities.module, main.routes specs) | server Implementer | 17 suites / 213 tests passed |
| `npm run test:integration -- control-lists` | server Implementer | 5 suites / 70 tests passed; afterwards 2/6/23 rows, 0 above seeded ids |
| `npx eslint src/domain/entities/control-lists src/db/seeds src/db/migrations/17909000000*.ts test/control-lists-*.ts` | server Implementer | exit 0 (gate probed red once with a misformatted file — K-004) |
| `npm run build` (server) | server Implementer, after all production edits | exit 0 (tsc probed red once with a deliberate type error) |
| Targeted client jest (9 suites) | client Implementer | 418 passed |
| `npm run lint -- --quiet` (client) | client Implementer | All files pass linting |
| `npx ng build` | client Implementer | complete; only pre-existing budget/CommonJS warnings |
| **Server `npm test -- --silent` (full)** | **Leader, serial, after both workers reported** | `Test Suites: 2 failed, 432 passed, 434 total` · `Tests: 3 failed, 4174 passed, 4177 total` — the 3 failures are the archive baseline (`capdev-bulk-summary.template.spec.ts` byte-equality; `result-innovation-use/entity-metadata.spec.ts` ×2 glob registration), unchanged |
| **Client `npm test -- --silent` (full)** | **Leader, after the server run** | `Test Suites: 345 passed, 345 total` · `Tests: 7953 passed, 7953 total` |

#### Falsifiers (each observed red on its own assertion, then reverted; restored files byte-identical)
1. Exported function in a migration → `migration:show` exit 1 `TypeORMError: seedControlListCategories migration name is wrong. Migration class name should have a JavaScript timestamp appended.` (arrow/async export → `TypeError: someClass is not a constructor`; seed-suite loader test also red). Closes RB-2.
2. `WHERE NOT EXISTS` removed from `seedControlLists` → `Rejected to value: [QueryFailedError: Duplicate entry '1' for key 'control_lists.PRIMARY']` on `expect(seedControlLists(runner)).resolves.toBe(0)`. **Differs from the predicted "affected rows > 0"**: the explicit PK ids make the guard-less seed reject instead. Reviewer A accepted it (red on the falsifier's own assertion line).
3. `uq_control_lists_key` dropped, `…001`/`…002` re-run by name → `SHOW INDEX` empty; lists suite 4 red incl. `rejects a raw INSERT … with errno 1062: Expected: 1062 / Received: undefined`. Restored, re-run, final `SHOW INDEX` above.
4. A1 without the empty query DTO → `expected 400 "Bad Request", got 200 "OK"`.
5. `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` on `removeValue` → `removeValue declares exactly [SYSTEM_ADMIN, TECHNICAL_SUPPORT]` (`+ 9, - 7`) and `never grants CENTER_ADMIN … Received array: [9, 1]`.
6. Old route re-added → `× no longer declares the old administration/center-admin/control-lists route … toBeUndefined()` and `× does not serve the old center-admin path to anyone`.
7. Item in both groups → 4 red incl. exact-array `Expected - 0 / Received + 6`.
- Extra (guard discriminates): `canAccessAppConfiguration` admitting role 9 → `denies a user whose role list is [9] with focus 1 … Expected: not true`, and route test `Expected: "/home" Received: "/administration/configuration/control-lists"`.
- Not red-tested (stated, not asserted — KZ-014): the client checks "no selector / no `P<n> ·`" and "A2 never called".

#### Sweeps
- Server `grep -rniE portfolio`: migrations `…000/…001/…002` 0 · seed 0 · `test/control-lists-values` 0 · module non-spec code 2 (comments explaining the stale-caller 400: `get-categories-query.dto.ts:8`, `update-control-list-category.dto.ts:8`) · module specs 33 and `test/` categories 12 / lists 10 / seed 4 / usage 2. Every spec/test hit is a stale-caller 400 test, a `SHOW COLUMNS … 'portfolio_id'` absence check, an A2 absence test or a comment.
- Client `grep -rniE portfolio`: page folder non-spec 0 · page spec 7 (negative assertions/comments) · `control-lists.interface.ts` 0 · control-list methods of `api.service.ts` 0.
- `grep -rn "center-admin/control-lists" client/research-indicators/src` → **5, not 0**: all old-route-absent assertions in specs (`app.routes.spec.ts:95,96,146,147`, `alliance-sidebar.component.spec.ts:412`); non-spec files 0. **Deviation accepted:** tasks.md T-01 requires an "old path absent" test, which has to name the path, so the literal 0 contradicts it. The sweep's purpose (no live reference) is met. Reviewer B: acceptable.

#### Swagger (NFR-CLG-003)
**Reduced boot**, not `node dist/main`: `main.ts` `bootstrap()` starts `microservice()` first, which would attach a consumer to the shared AWS RabbitMQ `ARI_QUEUE`. The server Implementer booted the real `ControlListsController` under `main.ts`'s prefix, versioning and Swagger config with a fake DataSource, then fetched `/swagger-json`: A1 `params=[]`; A2 path absent; A1, A3–A12 `[SYSTEM_ADMIN, TECHNICAL_SUPPORT]` (from `@Roles` metadata); A13 `path:listKey*, query:activeOnly`, no roles; "portfolio" 0× in the control-lists paths. Port 3000 confirmed free afterwards. Reviewer A: accepted as a recorded gap. The full-app Swagger view is left to the T-03 local run.

#### Reviewer A (server/DB) — `STATUS: PASS`
> The server and database half matches T-01: global schema with DB-enforced unique indexes, seed moved out of the migrations glob and shown idempotent on the real database, A2 removed, roles changed to SYSTEM_ADMIN/TECHNICAL_SUPPORT with A13 still open, and stale `portfolioId` rejected with 400 and no write. Falsifiers 1–5 were each seen red and then reverted.

Rulings on Implementer notes: A13 `?portfolioId=` → 400 until T-02 — acceptable; `findListForValue` removed — acceptable (FK RESTRICT makes its 404 unreachable); pre-checks keep `is_active: true` — acceptable (inactive duplicate → unique index → same named 409, unit-tested); `overrideInterceptor(SetUpInterceptor)` — acceptable; seed functions return `affectedRows` — in scope; kaizen P8 untouched — not a violation (see ADVISORY A1).

**ADVISORY (A, not gating):**
1. RISK — `docs/specs/kaizen/institutional-performance--control-lists.md:125-126` (pending P8) would document Control Lists under *Portfolio Management* at `/administration/center-admin/control-lists`, the placement this spec removes. **Surfaced to the requester. Not added to this spec** (advisories never become tasks).
2. RELIABILITY — the seed helper `affectedRows(result)` has never been seen to return a count above 0 (falsifier 2 rejected on the PK instead); `?? 0` would read an unexpected result shape as 0. Idempotency is still backed by the PKs and the seeded-id assertions.
3. READABILITY — `control-lists-categories.integration-spec.ts` "returns 409 naming name through the real API" asserts only status 409, not `errors.field`.
4. READABILITY — the comment on the seed suite's loader test names only "migration name is wrong"; arrow/async exports fail with `someClass is not a constructor`.
5. RISK (T-02) — while only PR 1 is deployed, A13 answers 400 to `?portfolioId=`. Harmless (no consumer), but PR 1 should not ship alone if a consumer is about to land.

#### Reviewer B (client) — `STATUS: PASS`
> The client half matches tasks.md T-01 (screen, client tests, falsifiers 6–7) and design §2.1, §6, §8 and §10. The deviations (a), (b), (d) and the 5-hit sweep are all in scope or justified by the spec's own requirements. Routing, guard and sidebar tests use real role data and exact arrays, and both falsifiers were observed red.

Rulings: (a) the portfolios load and `portfolios` signal removed entirely, although design §2.1 says "keep `portfolios`": acceptable, because T-01 places the *Applies to* load in T-02 and keeping it would be dead code; (b) **Retry** button: required by R-CLG-005 Details ("error (inline, retry)"); (d) header description: acceptable, mockup drift belongs to T-03; 5-hit sweep: acceptable deviation; sidebar-spec tsc errors at lines 282 and 491–531: pre-existing by diff position (inference, not measured).

**ADVISORY (B, not gating):**
1. READABILITY — page spec `expect(api).not.toHaveProperty('GET_ControlListPortfolioSummaries' | 'GET_Portfolios')` checks the test's own mock and cannot fail; the real guard is type-level (`ng build` + `api.service.spec`).
2. RESILIENCE (→ T-02) — the page test asserting `textContent` does not match `/portfolio/i` will go red by design when T-02 adds *Applies to* / *Show values for: All portfolios*. **T-02 must narrow it to the header and list header, not delete it.**
3. READABILITY — the old-path navigation test asserts `not.toBe(oldPath)`. It is weak, but the `findRouteByPath(...)` `toBeUndefined` test beside it carries the claim.
4. RELIABILITY — Retry keeps a stale `selectedListId`/`values`; no reachable failure found.
5. The 7 sidebar-spec tsc errors were judged pre-existing from diff position only.

#### Decisions
- D-EX-2 — the client removes the portfolios load in T-01 and T-02 re-adds it (Reviewer B ruling).
- D-EX-3 — the 5 spec-only hits of the `center-admin/control-lists` sweep are accepted (negative assertions required by R-CLG-008 AC.3).
- D-EX-4 — the Swagger check was a reduced boot (shared RabbitMQ consumer risk); the full-app view moves to T-03.

#### Forward pointers → T-02 (carry in the brief)
1. Narrow the page spec's `/portfolio/i` text assertion to the header and list header (B-ADV-2).
2. Re-add the active-portfolios load (`GET_Portfolios`) in parallel with A1, failure disabling the field (design §6, S-4).
3. A13's `portfolioId` becomes optional; the T-01 tests that pin "A13 has only `activeOnly`" must be updated, not deleted.
4. The local DB has PrmsWebhook + `…000–…002` applied; T-02 adds `…003` only. `migration:show` currently reports pending 0.

---

### T-02 — Slice 2: values applicable per portfolio

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-13 → 2026-10-14
- **Requirements covered:** R-CLG-009 (all scenarios, AC.1–AC.5), R-CLG-004 AC.1 (optional filter), R-CLG-005 AC.2, R-CLG-006 AC.2 (link table).
- **Dispatch:** two Implementers in parallel (`akili-implementer`/sonnet). Server + DB: effort `xhigh`; client: effort `high`. **Skill deviation:** `tdd` was added to both (filter rule and validators; expected values from the R-CLG-009 scenarios). The T-01 forward pointers 1–4 were copied into the briefs.
- **Review mode:** parallel lens reviewers (`akili-reviewer`/opus), A = server/DB, B = client. Diff given as validated files (`t02-server.diff` 3,612 lines, `Brackets` ×7; `t02-client.diff` 959 lines, `appliesTo` ×38). Both Reviewers read them in full.

#### Attempt 1 — files changed (29; `git diff --cached --stat`: +3,442 / −77)
- **DB:** **new** `src/db/migrations/1790900000003-createControlListValuePortfolios.ts`.
- **Server:**
  - New: `entities/control-list-value-portfolio.entity.ts`, `repositories/control-list-value-portfolio.repository.ts` (+spec).
  - Modified: service, types, controller, module, DTOs (create value, update value, by-key query) and their specs (service, controller, validation, global-exceptions, 3 DTO specs).
  - New integration suites: `test/control-lists-applies-to.integration-spec.ts` (30 tests), `test/control-lists-module-wiring.integration-spec.ts` (beyond the brief, accepted), `test/support/control-lists-providers.ts`. The four T-01 suites change only their provider wiring.
- **Client:** page component (ts, html, spec), `control-lists.interface.ts`.

#### Database evidence (server Implementer; host `127.0.0.1`/`stardb` checked before every command)
```
Migration CreateControlListValuePortfolios1790900000003 has been executed successfully.
(down proven: revert → DROP TABLE control_list_value_portfolios → re-executed)
CREATE TABLE `control_list_value_portfolios` (
  `value_id` bigint NOT NULL,
  `portfolio_id` bigint NOT NULL,
  PRIMARY KEY (`value_id`,`portfolio_id`),
  KEY `idx_control_list_value_portfolios_portfolio` (`portfolio_id`),
  CONSTRAINT `FK_control_list_value_portfolios_portfolio_id` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_control_list_value_portfolios_value_id` FOREIGN KEY (`value_id`) REFERENCES `control_list_values` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```
`migration:show` (test config, ANSI stripped): exit 0, applied 349, pending 0, error lines 0. After the integration runs: portfolios 1 and 2 `is_active=1` with `updated_at` unchanged; rows 2/6/23; 0 link rows.

#### Verification
| Check | Who | Result |
| --- | --- | --- |
| `npx jest src/domain/entities/control-lists` + entities.module + main.routes `--silent` | server Implementer | 18 suites / 289 tests passed |
| `npm run test:integration -- control-lists` | server Implementer | 7 suites / 104 tests passed, run twice |
| `npx eslint …control-lists src/db/seeds src/db/migrations/17909000000*.ts test/control-lists-*.ts test/support/control-lists-providers.ts` | server Implementer | exit 0 (probed red once) |
| `npm run build` (server) | server Implementer | exit 0 |
| Targeted client jest (page + data-table) | client Implementer | 2 suites / 91 tests passed; red-first 22/81 before implementing |
| `npm run lint -- --quiet` (client) | client Implementer | All files pass (probed red once) |
| `npx ng build` | client Implementer | exit 0, pre-existing warnings only |
| **Server `npm test -- --silent` (full)** | **Leader, serial, after both reported** | `Test Suites: 2 failed, 433 passed, 435 total` · `Tests: 3 failed, 4250 passed, 4253 total`. The 3 failures are the archive baseline (`capdev-bulk-summary.template` byte-equality; `entity-metadata` ×2), unchanged |
| **Client `npm test -- --silent` (full)** | **Leader, after the server run** | `Test Suites: 345 passed, 345 total` · `Tests: 7973 passed, 7973 total` |
| **Client `npx tsc -p tsconfig.spec.json --noEmit`** (Reviewer B ADVISORY 2; client guide K-002) | **Leader** | exit 2 with **945** `error TS` lines, equal to the pre-existing total recorded in root `CLAUDE.md` §4.3. **0** in the control-lists page spec. 13 in `alliance-sidebar.component.spec.ts` (282, 491–531) and `api.service.spec.ts` (69–70, 2256), on lines outside the blocks this spec changed. **Inference, not a measured before/after set:** the per-file baseline at `0d3dbacf` was not taken. |

#### Falsifiers (each observed red on its own assertion, then reverted byte-identical)
1. A13 without `Brackets` (`.andWhere(NOT EXISTS).orWhere(EXISTS)`) → real MySQL, 5 failed. P1 + `activeOnly=true`: `Expected - 0 / Received + 2`, `Array [74, +81, 78, +79, 80]` (79 = inactive P1-restricted value, 81 = a P1-restricted value of **another list**). P1 + `activeOnly=false` leaks 81. **Differs from the tasks.md prediction** ("P1 + `activeOnly=false` returns an inactive restricted value"), which was itself wrong: with `activeOnly=false` inactive values are legitimate. The observed red is on the row-set assertion and is stronger. Reviewer A accepted it.
2. `@IsOptional` on the create DTO → DTO spec `expected the pipe to reject`; A10 `null` `expected 400 "Bad Request", got 201 "Created"`.
3. Update DTO's own `@ValidateIf` removed → A11 `null` `expected 400 "Bad Request", got 500 "Internal Server Error"`.
4. Writes outside the transaction → A11 `Expected: "atom-original" Received: "atom-renamed"`; A10 `Expected length: 0 Received length: 1`.
5. "No active links" = all → SQL: `Expected value: not 103 Received array: [101,…,107]`; read side: `- "appliesToAll": false + true` (unit + integration). Portfolio restored after each run.
- Extra server reds: omitted `portfolioIds` clears links; links-only PATCH skips the value row (`updated_by Expected: 1 Received: 0`); A13 lookup without `is_active` (`expected 404, got 200`); write validation without `is_active` (`expected 400, got 201`); module without `forFeature([Portfolio])` → wiring suite red.
- Client reds: filter "no active links = all" → 3 failures (`+ "Legacy band"`); `portfolioIds: undefined` when none ticked → 4 failures; *No active portfolio* branch removed → 3 failures; forced `sendPortfolioIds = true` → 2 failures.

#### Sweeps (final leftover)
- Server: migrations `…000–…002` 0 · seed 0 · `test/control-lists-values` 0. Every other hit in the module, `…003` and `test/` is *Applies to* / filter / link-table code, or a T-01 stale-caller / A2-absence test (per-file table in the Implementer report: service 72, module 8, controller 4, DTOs 10/6/6, link entity 9, `…003` 15, applies-to suite 126, wiring suite 22).
- Client: page non-spec hits are all *Applies to* / filter (filter `p-select`, `portfoliosLoadFailed` note, modal fieldset, `portfolioIds`); interface: the `appliesTo` doc comment + `portfolioIds?` on the payloads; control-list methods of `api.service.ts` 0.

#### Swagger (NFR-CLG-003)
Reduced boot, as D-EX-4: the real controller under `main.ts`'s DocumentBuilder with a stub service. A10/A11 bodies have `portfolioIds: array<number>` (example `[2]`). A13 has `portfolioId` query (number, `required: false`), summary "Read a list's values by system key, optionally filtered by portfolio…". The full-app `/swagger` is still owed at T-03.

#### Reviewer A (server/DB) — `STATUS: PASS`
> The server and database half of T-02 matches design §2.1, §3, §4 and §5 rules 4–5, D-CLG-12/13/14 and R-CLG-009 AC.1–AC.5. The migration was executed and its `down` proven, the filter and atomicity are proven on real MySQL with a fixture that can tell a filter from no filter, and falsifiers 1–5 were observed red.

Rulings: (b) service 400 shape `{description, field:'portfolioIds'}` → accepted; (c) A13 always one QueryBuilder, with unit tests that check only the call wiring → accepted (precedence is proven on SQL); (e) extra module-wiring suite → accepted.

**ADVISORY (A, not gating):**
1. RELIABILITY — `assertPortfolioIdsValid` runs before `dataSource.transaction(...)`, not inside it. A portfolio deactivated between the check and the commit can be linked, and D-CLG-14 hides it on read. Harmless.
2. RESILIENCE — two concurrent A11 PATCHes with `portfolioIds` on a link-less value can deadlock (errno 1213), which surfaces as a bare 500. Not executed; low impact on an admin screen.
3. RISK — the applies-to suite toggles `is_active` on the two lowest-id portfolios of local `stardb` (restored in `finally`/`afterAll`, with a precondition). Suggest failing fast on a non-local `ARI_TEST_MYSQL_HOST` instead of only printing it.

#### Reviewer B (client) — `STATUS: PASS`
> The client half meets T-02's screen scope and R-CLG-009 AC.2: Applies to column, A13-equivalent filter on a fixture that can tell filtering from no filtering, checkbox group, export column, and a degraded mode when portfolios fail to load. Omitting `portfolioIds` in two cases is a sound, data-preserving reading of A11's "omitted = unchanged" that the Leader must record as a D-EX.

Rulings: (b) omission → in scope, acceptable gap-fill (D-EX-5); (a) `name` instead of short names → acceptable, the design text should change (D-EX-6); (g) both 400 shapes reach the admin through `extractFieldError` / the toast fallback → not a violation.

**ADVISORY (B, not gating):**
1. RELIABILITY (reachable) — a value linked only to inactive portfolios can never be made "all" from the page. Tick then untick P1 and save: `[]` plus `editingNoActivePortfolio` means the key is omitted, so the value stays *No active portfolio*, while the hint says "None ticked = applies to all portfolios". **Surfaced to the requester; not added to this spec.**
2. VERIFICATION GAP — spec type-check missing from the evidence. **Closed by the Leader** (Verification table above).
3. RESILIENCE — `portfolioId()` falls back to `0`, the same as the "All portfolios" sentinel. Not reachable (`GET_Portfolios` always returns `id`).
4. A11Y — the hint and unavailable note are not linked with `aria-describedby`; the filter's `aria-label` duplicates its `<label>`.
5. TEST GAP — no test for a 400 naming `portfolioIds` in either server shape.
6. DOC DRIFT — design §6 says "portfolio short names"; the field is `name`.

#### Decisions
- D-EX-5 — the client **omits** `portfolioIds` (instead of `[]`) in two states: (1) the portfolios call failed and the field is disabled; (2) editing a value linked only to inactive portfolios with the selection untouched. Reason: under A11 `[]` = "all", so sending it would clear a restriction the admin cannot see, or turn a *No active portfolio* value into "all", which R-CLG-009 forbids. Create sends `[]` whenever the field is available. Departs from the literal tasks.md wording "(`[]` when none)" in those two states only. Reviewer B: sound.
- D-EX-6 — portfolios are labelled by `name`; `Portfolio` has no short-name field. Design §6 wording ("short names") is drift, to be fixed at archive.
- D-EX-7 — `tdd` added to both T-02 Implementers (Leader skill selection).

#### Issues
- tasks.md T-02 falsifier 1 predicted the wrong failing case (see above). The prediction is now known to be wrong; the gate is proven anyway.
- Implementer: the parallel integration suites first collided on a shared `LIKE` cleanup prefix (`__t02_itest__`); the new suite uses `__ap_itest__`. Two clean runs after the fix.

#### Forward pointers → T-03 (HITL)
1. Step 3 (`kpi.direction`, restrict *Maintain within range* to P2): the column shows the portfolio **name** (D-EX-6), not "P2 only".
2. The full-app `/swagger` view (D-EX-4) is still owed. Check A1 (no `portfolioId`), A2 absent, A10/A11 `portfolioIds`, A13 optional `portfolioId`. Booting the full app attaches a RabbitMQ consumer to the shared queue, so do it only with an MQ setting the requester approves.
3. Optional observation for Reviewer B ADVISORY 1: edit a value linked only to an inactive portfolio and check whether it can be set back to "all".

#### Budget tripwire (design §14)
After T-02 the Leader stopped and reported the overrun to the requester: about 2,950 changed lines estimated vs about 8,360 actual (T-01 +2,759/−2,085; T-02 +3,442/−77; mostly new and rewritten test suites). Tasks (4) and review rounds (1 per task, ≤ 2 budgeted) stayed within budget. The requester went ahead with T-03.

---

### T-03 — HITL: roles, menu and mockup

- **Final status:** PASS (HITL — requester observation; the task has no Reviewer)
- **Date:** 2026-10-14
- **Requirements covered:** R-CLG-008 *Center Admin denied* / *Technical Support allowed* in a real browser; R-CLG-005 / R-CLG-009 UI against the mockup; requirements §10 *Mockup drift*.
- **Run by:** the requester (Hector F. Tobón) on the local app pointing at the local DB. Statement: "realicé las pruebas y funcionó todo correctamente". Per step, from the requester's answers to the Leader (KZ-002 — the role and what was seen are named):

| Step | User role used | What the requester reports seeing |
| --- | --- | --- |
| 1 | **Center Admin only** (not Admin, so the Admin bypass does not apply) | The *System admin* group did not show; `/administration/configuration/control-lists` redirected |
| 2 | Technical Support | *Control Lists* after *Prompt Manager*; lists load; `Key:` shown; duplicate key → inline 409 |
| 3 | Admin / Technical Support | On `kpi.direction`, *Maintain within range* restricted to P2: the P1 filter hides it, the P2 filter shows it, the column shows the portfolio name, the export has the column; set back to all |
| Swagger (D-EX-4 owed) | — | Full-app `/swagger` checked: A1 without `portfolioId`, A2 absent, `portfolioIds` on A10/A11, optional `portfolioId` on A13 |
| 4 | — | **Minor differences** from artboard 1, accepted by the requester. **Not itemized** |

**What this evidence covers (KZ-017):** the requester's own observation as reported to the Leader. Nothing here was captured by the Leader (no screenshots or console output). Reviewer B ADVISORY 1 (a value linked only to inactive portfolios cannot be set back to "all") was not reported either way.

---

## Summary

- **Tasks:** T-00 (HITL), T-01, T-02, T-03 (HITL), all PASS. T-01 and T-02 each passed on the first attempt (1 review round each, two parallel lens Reviewers).
- **Commits:** `0d3dbacf` (T-00), `f0da74b3` (T-01), `e081da56` (T-02), plus this closing commit.
- **Suites (Leader, last run after T-02):** server 4,250 passed / 3 failed (archive baseline, unchanged); client 7,973/7,973; integration 7 suites / 104 tests (server Implementer).
- **Execution decisions:** D-EX-1 (four reverts in T-00), D-EX-2 (portfolios load moved to T-02), D-EX-3 (spec-only hits in the route sweep), D-EX-4 (reduced Swagger boot; full app checked at T-03), D-EX-5 (`portfolioIds` omitted in two states), D-EX-6 (`name` instead of short names), D-EX-7 (`tdd` added in T-02).
- **Open for the requester, outside this spec (advisories, never tasks):**
  - kaizen doc P8 (`docs/specs/kaizen/institutional-performance--control-lists.md:125-126`) still describes the old route;
  - a value linked only to inactive portfolios cannot be set back to "all" from the page;
  - mockup differences are not itemized.
- **For `/akili-archive`:**
  - doc drift: design §6 "short names" → `name`; the T-02 falsifier 1 prediction was wrong;
  - RB-3: update `organizational-structure`;
  - CodeGraph re-index (page folder moved; new link entity).

---

### T-04 — Validation follow-up: W-1, W-2, W-3

- **Origin:** `validation-report.md` §11. Requester chose "1 — fix all" on 2026-10-14. Scope added to tasks.md T-04 and design §6 (commit `2709033d`) before dispatch.
- **Dispatch:** two Implementers in parallel (`akili-implementer`/sonnet), effort `medium`: client = W-1, server = W-2 + W-3 (test-only). Review mode `light`: one Reviewer (`akili-reviewer`/opus), diff inline (5 files, +104/−10).

#### Attempt 1 — FAIL
- **Files:**
  - client `control-lists.component.{ts,html,spec.ts}`: `showApplyToAll()`, `applyToAllPortfolios()`, state-specific hint, and `togglePortfolio` clears `editingNoActivePortfolio`;
  - server `test/control-lists-usage.integration-spec.ts` (W-2 test);
  - server `test/control-lists-seed.integration-spec.ts` (W-3 loader `{00,01,02,03}`, four names, both error forms).
- **Implementer verification:**
  - client control-lists suite 83/83, lint clean, `ng build` ok;
  - server integration 7 suites / 105 tests, eslint clean;
  - F2 red (`Expected substring: "Linked only to inactive portfolios"`), F3 red (`expected 200 "OK", got 409 "Conflict"`), F4 red (`+ "CreateControlListValuePortfolios1790900000003"`);
  - F1 red only on the post-click **hint** assertion, before the PATCH-body assertion (the Implementer said so).
- **Reviewer verdict: `STATUS: FAIL`** (verbatim):
  > **Discovered Issue:** The `[]` body assertion for the explicit action (spec :1766, `expect(...calls[0][1].portfolioIds).toEqual([])`) has never been seen red. F1 turned `applyToAllPortfolios()` into a no-op, which leaves the flag set. That stopped the test earlier, on the post-click hint assertion (:1764), so the PATCH-body assertion never ran. The Implementer reports this openly. As it stands, nothing proves the payload assertion can catch a regression where the hint updates but the request still omits the key, for example a change to the `sendPortfolioIds` condition. That is exactly the property W-1 exists to protect.
  > **Violated Rule:** docs/specs/changes/control-lists-global-scope/tasks.md T-04, "Red run: each falsifier observed failing on its own assertion, then reverted" (L172), with falsifier 1 "→ the `[]` body test fails" (L168). Also CLAUDE.md §4.3 K-004 / KZ-014 ("If the red has not been *seen*, it may not be asserted").
  > **Remediation Suggestion:** No production or test code needs to change; only the evidence. Run a falsifier that leaves the hint path alone and only drops the payload. For example, temporarily change the condition at component.ts:766 to `!this.portfoliosLoadFailed() && !(editingId !== null && formValue.portfolioIds.length === 0)`, so every empty edit selection is omitted. Confirm the W-1 test fails at the `toEqual([])` line (:1766) with `Received: undefined` and that the hint assertions before it pass. Revert, and record the verbatim red in execution.md. The :1719 test will also go red under this mutation; that is expected, so note it.
- **Reviewer conformance notes (attempt 1):**
  - W-1 behavior conforms to design §6 sub-bullet and R-CLG-009 AC.2; D-EX-5 still holds.
  - tick → untick → `[]` is consistent with the spec (the generic hint shows and matches the payload).
  - W-2 fixture is really in use (`inUse > 0` asserted first). W-3 conforms.
- **ADVISORY (attempt 1):**
  - W-2 shows "replaced" from an empty starting set only.
  - The W-1 tests save via `component.saveValue()` rather than a DOM click.

#### Leader re-measure (after attempt 1; code then identical to the final code)
- Server `npm test -- --silent`: `Tests: 3 failed, 4250 passed, 4253 total` (archive baseline, unchanged).
- Client `npm test -- --silent`: `Test Suites: 345 passed` · `Tests: 7975 passed, 7975 total`.
- `npx ng build`: exit 0, 0 control-lists mentions.

#### Attempt 2 — PASS (effort bumped `medium` → `high`; evidence only, no code change)
- **Brief:** the Reviewer's FAIL report verbatim, plus "attempt 1 made `applyToAllPortfolios()` a no-op and stopped on the hint — do not repeat".
- **Mutation** (payload only; hint path untouched), `control-lists.component.ts:766`: drop the `this.editingNoActivePortfolio()` conjunct from `sendPortfolioIds`.
- **Red** (`npx jest --config jest.config.ts --coverage=false src/app/pages/platform/pages/administration/configuration/control-lists --silent` → `Tests: 3 failed, 80 passed, 83 total`):
```
ControlListsComponent › applies to (R-CLG-009) › shows a state-specific hint and an Apply to all action for a value linked only to inactive portfolios (W-1)
expect(received).toEqual(expected) // deep equality
Expected: []
Received: undefined
> 1766 |       expect(api.PATCH_ControlListValue.mock.calls[0][1].portfolioIds).toEqual([]);
```
  - Hint assertions :1757, :1758, :1764 passed first.
  - Collateral reds, same effect: `pre-ticks the saved Applies to set…` (:1719) and `values › edits a value and never sends id…` (:1337).
- **Restore:** `cmp` identical to backup; re-run `Tests: 83 passed, 83 total`.
- **Leader check:** staged diff byte-identical to attempt 1 (`diff -q`); no unstaged code change.
- **Reviewer verdict: `STATUS: PASS`**
  > The attempt-1 issue is resolved. A payload-only mutation made the W-1 test fail at :1766 on its own `[]` PATCH-body assertion after all its hint assertions passed, and restoring the code brought it back to green. The code is the same as the attempt-1 diff whose conformance I already confirmed.

#### T-04 final
- **Final status:** PASS (attempt 2 of 3).
- **Requirements covered:** R-CLG-009 AC.2 for the inactive-only state (W-1); R-CLG-009 *Restricting a value already in use* (W-2); design §10 loader over four migrations (W-3); T-01 A-ADV-4 closed.
- **Decision:** D-EX-8 — tick → untick → save now sends `[]` (previously omitted). The admin has made a choice, and the generic "None ticked = applies to all" hint is the one shown at that moment, so payload and hint agree. Reviewer: consistent with the spec.
- **Budget:** review rounds 2 for T-04 (≤ 2 per task); total rounds 1 + 1 + 2 = 4 (≤ 6).
