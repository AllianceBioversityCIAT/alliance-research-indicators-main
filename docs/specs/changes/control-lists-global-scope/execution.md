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
