# Execution Log — Institutional Performance / Organizational Structure

## Document Control

- **Spec:** `docs/specs/institutional-performance/organizational-structure` (id `2026-10-organizational-structure`)
- **Branch:** `institutional-kpis` · spec docs committed at `6a991bdb` before execution
- **Approval mode:** `gated` (proposal Document Control)
- **Leader:** Claude Code, `claude-opus-5-5` (T1) · Implementer: `akili-implementer` wrapper (sonnet, T2) · Reviewer: `akili-reviewer` wrapper (opus, T3, read-only)
- **Started:** 2026-10-16
- **Budget (design §14):** ~9,700 LOC incl. tests; ≤ 2 review rounds per task; tripwire at 2,500 LOC per slice or a 3rd review round

## Environment pre-check (2026-10-16)

- `.env`: `ARI_MYSQL_HOST=127.0.0.1`, `ARI_TEST_MYSQL_HOST=127.0.0.1`, `ARI_TEST_MYSQL_PORT=3306`, both `NAME=stardb` — local, per tasks.md *Evidence database*.
- Local DB was down at first check: Docker Desktop engine failed with `Wsl/Service/CreateInstance/CreateVm/HCS/0x80070569` ("Logon failure: the user has not been granted the requested logon type"). Execution paused at the requester's choice. Recovered without reboot by `Restart-Service vmcompute` + `Restart-Service WslService` (elevated; `gpupdate` failed — no domain controller reachable), then quitting and reopening Docker Desktop. Container `ari_local_mysql` up, `127.0.0.1:3306->3306/tcp`, `Test-NetConnection` True.
- Migration baseline on the TEST datasource: `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.test.config.ts` → exit 0; ANSI stripped; **349 applied, 0 pending**; 349 files in `src/db/migrations/*.ts`. The only line matching `error` is the migration name `AddedErrorMessageAiReport1781106535639` (checked, K-014).

## Task Execution History

### T-01 — Slice 1: schema, year view, page shell and menu

- **Status:** in progress
- **Dispatch (2026-10-16):** two Implementers in parallel (cross-package edit, root `CLAUDE.md` §4.3) — server half (effort `high`: new schema/migrations; skills nestjs-expert, api-design-principles, error-handling-patterns) and client half (effort `medium`; skills angular-developer, ui-ux-pro-max). Skills = task list defaults, no deviation. Exemplars: `domain/entities/control-lists/` + migrations `17909…`; client `center-admin/portfolio-management/`. Kaizen rows copied: KZ-001, KZ-014, KZ-015, KZ-017, K-004, K-014. Forward pointers: none (first task).
- **Attempt 1 — client Implementer report (2026-10-16):** ~1,285 LOC (1,172 new + 113 modified; ~600 spec/fixtures) — over the ~1,200 per-half brief tripwire, under the 2,500 slice tripwire. Gates as reported: targeted 26 + 110 tests pass; full `npm test -- --silent` 347/347 suites, 8007/8007 tests; `npm run lint -- --quiet` "All files pass linting." (not proven able to go red, K-004); `ng build` red first (`NG3 … Record<OrgLevelCode, string>` at `org-tree.component.html:38` while jest + lint were green), green after fix. Falsifiers observed red then reverted: F5 (exact-array `toEqual`; the expanded/collapsed render tests did **not** catch it), natural sort, ended filter, DataTable compare, `canMatch` removal (real router + real `RolesService`).
  - **Not Done / Assumptions (verbatim summary, owed to review):** B1/B2/B5 field-shape assumptions (`levelCode` `L1..L4`, B2 `{min,max,current}`, B5 typed `unknown`); ended-entry predicate `status !== 'active' && statusFromYear <= year` re-applied client-side; empty-module variant inferred as "no rows and `min === max`" (no design signal); expander `aria-label` is PrimeNG default "Row Expanded/Collapsed", not name-specific; rejected-promise `catch` paths untested; T-02+ surfaces (form, row "+", dialogs, tabs) not built by design.
- **Attempt 1 — server Implementer report (2026-10-16):** ~3,140 LOC (≈1,150 prod / ≈1,950 tests, three integration suites). Gates as reported: targeted jest 8 suites / 73 tests; `npm run test:integration -- org-structure` 3 suites / 65 tests, each printing `resolved DB target: 127.0.0.1:3306/stardb`; `npx eslint` on new files exit 0; `npm run build` exit 0. `migration:test:execute` ran the 4 new migrations (ids 384–387); after: ANSI-stripped `migration:show` `[X]` 353, `[ ]` 0. `SHOW INDEX`/`SHOW CREATE TABLE` quoted in the worker report: `Non_unique = 0` on `uq_org_units_code`, `uq_org_unit_versions_unit_from`, `uq_org_unit_delegates_unit_staff`; RESTRICT on level, director, delegate-staff FKs; no FK on `org_unit_change_log`; `portfolio_id` absent on all four tables. Falsifiers 1, 2, 3, 4, 6 observed red on their own assertions, then reverted. `/swagger` on reduced boot: B1/B2/B5 paths present with tags, bearer, params; live `/api/organizational-structure/years` 200; `/api/v1/...` 404. DB cleanup: org tables 0 rows; staff total 3085.
  - **Not Done / Assumptions (summary, owed to review):** staff carnet collation is `utf8mb4_0900_ai_ci` vs new tables `utf8mb4_unicode_ci` — FK columns copy the staff collation read from `information_schema` at migration time; `isActiveStaff = is_active = 1`, and on the local DB **every** staff row has `is_active = 1` (`status='N'` 3046, `NULL` 39) — neither column separates leavers (P-14 escalates in T-02); B2 `min/max` widened with `LEAST/GREATEST(…, current)`; parent of an ended entry resolved at `LEAST(viewYear, lastCoveredYear)`; T-02 constants unused; one untracked-row leak risk in a schema test; AUTO_INCREMENT advanced on local `org_*` tables. Not reached (KZ-017): `EntitiesModule` import on a full `AppModule` boot; real `JwtMiddleware` / envelope on the wire.
  - **Leader check — lint CRLF:** `main.routes.ts` and `main.ts` are `i/lf w/crlf` (`git ls-files --eol`): the eslint `Delete ␍` errors are pre-existing working-tree line endings (autocrlf), not introduced by this task; `main.routes.ts` diff is 5 added lines, `entities.module.ts` 2.

## Budget Tripwire: T-01 (2026-10-16)

- **Measured by the Leader** (`git diff --numstat -- server client`, new files intent-added): **51 files, 4,427 lines added, 1 deleted** — 2,498 in spec/test/fixture files, 1,929 in production files.
- **Budget:** design §14 / tasks.md — tripwire **2,500 LOC per slice**; whole spec ≈ 9,700 LOC (≈ 1,940 per slice). **Delta: +1,927 over the slice tripwire (×1.77); slice 1 alone is 46 % of the whole-spec estimate.**
- **Cause:** tests are 56 % of the diff — three DB integration suites (schema, year view, module wiring) plus fixtures, driven by T-01's falsifier/integration list and KZ-001 (coverage asserted on the real DB, not mocks). Production code (1,929) is near the per-slice average by itself.
- **State:** both halves reported green; **not yet reviewed**; Leader full-suite re-measure not yet run. Execution stopped here for the requester's decision (tasks.md budget tripwire rule).
- **Requester decision (2026-10-16):** *Aceptar y re-basar* — T-01 accepted as is; budget re-based to **~4,500 LOC slice tripwire / ~20,000 LOC whole spec** (review-round cap unchanged). Applied to `design.md` §14 (table row, per-PR line, new *Re-based* paragraph) and the `tasks.md` tripwire note; swept `2,500`/`9,700` across the spec folder — the remaining hits are the dated 2026-10-16 RB-3 record, kept as history.
- **Leader full-suite re-measure (2026-10-16, after both workers reported, no worker active):**
  - Server `npm test -- --silent`: `Test Suites: 2 failed, 439 passed, 441 total` · `Tests: 3 failed, 4313 passed, 4316 total`. Red: `capdev-bulk-summary.template.spec.ts` (byte equality; the `.html` and its migration are `i/lf w/crlf` per `git ls-files --eol`) and `result-innovation-use/entity-metadata.spec.ts:81,91` (`globSync` of the `orm.config.ts` globs matches nothing on Windows). Neither suite's inputs are in the T-01 diff (`git diff --name-only HEAD -- src/db/config src/domain/shared src/domain/entities/result-innovation-use` is empty). Classified **pre-existing environment** by input analysis; not re-run on a clean HEAD.
  - Client `npm test -- --silent`: `Test Suites: 347 passed, 347 total` · `Tests: 8007 passed, 8007 total`.
- **Review dispatch (attempt 1):** parallel-lens mode (migrations + auth surface): Reviewer A = reliability + risk, Reviewer B = readability + resilience, both with baseline spec conformance. **Deviation recorded:** the diff (4,824 lines) was written verbatim to scratchpad files `t01-server.diff` / `t01-client.diff` and pointed at, instead of inlined — same bytes, read with the Reviewer's `Read`; the inline rule exists because the Reviewer cannot regenerate a diff, which a saved file does not require.
- **Attempt 1 — Reviewer B (readability + resilience): `STATUS: FAIL`, 2 issues** (full report relayed verbatim to the rework Implementer):
  1. Tree expander `aria-label` always reads "Row Expanded", collapsed rows included — PrimeNG 19 `TreeTableToggler.toggleButtonAriaLabel` reads `this.rowNode.expanded`, and the serialized `rowNode` is `{node, parent, level, visible}` with no `expanded` (`primeng-treetable.mjs:2017-2022`, `:5324-5325`). The spec test only asserts non-empty. Violates NFR-ORG-005, design §6.3, T-01 client test "Tree: expander aria-label". **Leader verified at source (both line ranges read).**
  2. B1 `levelCode` comes from the admin-editable `control_list_values.code`, and the client keys label, count chips, default expansion and the Level column on it; a code edit to value 20 breaks all four. Violates design D-ORG-4 (ids 20–23 are the only immutable reference) and §2.1 constants (`ORG_LEVEL_BY_ID`, defined but unused). **Leader verified D-ORG-4 text (design.md:332).**
  - **ADVISORY (recorded, no rework):** empty-module variant depends on B2 widening (no wrong state constructible); `toStaffRef` returns `''` for blank names while the client falls back only on `null`; rejected-promise `catch` paths untested; ended filter applied server- and client-side; `bg-white` instead of `var(--ac-white-1)` (dark mode); fixed plurals ("1 Divisions", "1 units"); raw `p-select`/native checkbox in the header; Export lives in the `DataTable` toolbar, not the header (confirm at T-06).
  - **Done criteria flagged as not fully proven (KZ-014):** migration/SHOW output recorded as worker summary, not verbatim; server full-suite reds classified without a clean-HEAD re-run; server falsifiers worker-reported.
- **Leader closes DC-2 gap (2026-10-16):** the two red server suites re-run on a clean `HEAD` (`6a991bdb`) in a temporary detached worktree (server `node_modules` junctioned, `.env` copied; worktree removed afterwards, `node_modules` intact): `npx jest …capdev-bulk-summary.template.spec.ts …entity-metadata.spec.ts --silent` → `Test Suites: 2 failed, 2 total` · `Tests: 3 failed, 17 passed, 20 total` — the same 3 failures as on the T-01 tree. **Pre-existing, observed** (no longer input-analysis only).
- **Attempt 1 — Reviewer A (reliability + risk): `STATUS: FAIL`, 3 issues** (verbatim issue text in scratchpad `t01-review-attempt1.md`, relayed unchanged to both rework workers):
  1. Carnet FK migrations copy only `COLLATION_NAME`; on Dev `alliance_user_staff` is `utf8mb3` → column/FK creation fails on deploy, leaving `org_units` created but unrecorded. **Leader verified:** `baseline.sql:3` = Dev host `192.168.20.210`; `:928-946` `DEFAULT CHARSET=utf8mb3`; no migration converts that table (the one grep hit, `1787270000000`, only joins it); local `information_schema` = `utf8mb4 / utf8mb4_0900_ai_ci`.
  2. Level keyed on the editable `control_list_values.code` — same defect as Reviewer B issue 2 (D-ORG-4).
  3. No client spec type-check (`npx tsc -p tsconfig.spec.json --noEmit`, client guide K-002).
  - Unproven: migration `down` never executed; the entity-metadata pre-existing claim (closed above by the clean-HEAD run; Reviewer A was right that the suite's globs do include the new entity files — the clean-HEAD red settles it).
  - **ADVISORY (recorded, no rework):** `unitCount` counts leaves, not L4s; B1 carries the entry's *current* status for years before its end (T-04 consumers need the same predicate); B2 loaded once per page (T-02 must refresh); cycle data would drop nodes; untracked row on a regression path in the schema test; `LIKE '__T01_%'` wildcard; fixture docs name `ari_local_mysql` vs `127.0.0.1:3306/stardb`.
  - Reviewer A adjudicated the default PrimeNG label as meeting NFR-ORG-005 "as written"; Reviewer B showed it states the wrong state. **Leader adjudication: B's finding stands** (verified at source; WCAG floor in `docs/ux-ui/design.md` §10).
- **Leader adjudication → attempt 2 (2026-10-16):** all 5 distinct issues in scope, none a Pivot. Issue 2 is fixed on the server only (derive `levelCode` from `level_value_id` via `ORG_LEVEL_BY_ID`, typed `L1..L4`); the client keeps the key, with the type aligned. Expander fix = own toggle with a state-correct name, not a global PrimeNG translation (that would change every tree in the app). Both workers resumed with their prior context, effort bumped one level (server `xhigh`, client `high`). Advisories excluded.
- **Spec amendments by the Leader:** `design.md` §3 exception + **D-ORG-16** (carnet columns inherit the staff charset + collation; *requester to acknowledge at the T-01 gate*); `tasks.md` **RB-5** (human confirms the staff charset on Dev and Prod before merge).
- **Attempt 2 — client Implementer report (2026-10-16):** own toggle in the Name cell (`[attr.aria-label]` "Expand/Collapse <name>", `[attr.aria-expanded]`; childless rows `visibility:hidden` + `aria-hidden`), same node mutation as PrimeNG's toggler; `ttRow` keyboard untouched; no global translation. New transition test observed **red on the old code** (`Expected: "Expand Data Department"` / `Received: "Row Expanded"`), green after. `npx tsc -p tsconfig.spec.json --noEmit`: 945 errors on the T-01 tree; a clean-HEAD worktree gave 995, the 50 extra being `TS2307 …/environment` (gitignored env file absent in a fresh worktree); normalized sets: **0 new lines**, new files 0 errors. `levelCode` already a non-null union client-side — no change. Gates: targeted 28/28; full `npm test` 347/347 suites, **8008/8008**; lint clean; `ng build` complete. ~+60 LOC.
  - **Not Done / Assumptions:** relies on PrimeNG 19 public `updateSerializedValue` / `tableService.onUIUpdate`; screen-reader announcement not verified in a real browser (T-06); lint not proven able to go red.
- **Attempt 2 — server Implementer report (2026-10-16):** new `src/db/helpers/staff-carnet-column.ts` (reads `CHARACTER_SET_NAME` + `COLLATION_NAME`, whitelist on both, emits `CHARACTER SET … COLLATE …`), used by `…001` and `…003`; B1/B5 `levelCode = ORG_LEVEL_BY_ID[level_value_id]` (`OrgLevelCode | null`; ids outside 20–23 → `null`), plus new `levelName` from `lv.value` (not consumed by the client). ~+85 LOC.
  - **Charset probe (local MySQL 8.4.11, throwaway schema `t01_charset_probe` with `alliance_user_staff` from `baseline.sql:930-945`, utf8mb3; dropped afterwards):** the **attempt-1 code did NOT fail** — all four `up()` ok, column came out `CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci` (charset inferred from the collation). The new helper: up ok, FKs created RESTRICT, down ok in reverse. **Correction (KZ-007/KZ-014): Reviewer A issue 1's predicted Dev failure is not reproduced; the Reviewer flagged it as reasoned, not run, and the Leader's "verified" above covered the baseline facts only, not the failure.** The change stands as explicitness; D-ORG-16 text corrected accordingly.
  - Level: new tests observed **red on the old mapping** (`Expected: "L1"  Received: "DIV"`, 6 failed / 25), green after (25/25).
  - `down` on local stardb: four `migration:test:revert` (DROP 003→000, each "reverted successfully"), `SHOW TABLES LIKE 'org_%'` empty, `migration:test:execute` re-ran 4; ANSI-stripped `migration:show` `[X]=353 [ ]=0`.
  - Gates: targeted jest 8 suites / 78 tests; integration 3 suites / 65; eslint exit 0; build exit 0.
  - **Not Done / Assumptions:** Dev/Prod staff charset and MySQL version unconfirmed (RB-5); server `levelCode` may be `null` for ids outside 20–23 while the client type is non-null — safe only once T-02 enforces ids 20–23 on write.
- **Leader full-suite re-measure after attempt 2:** server `Test Suites: 2 failed, 439 passed, 441 total` · `Tests: 3 failed, 4318 passed, 4321 total` — the same two pre-existing suites (clean-HEAD-proven above); client 347/347, 8008/8008 (worker full run, no server worker active in the client package; not re-run by the Leader).
- **Attempt 2 — Reviewer A (reliability + risk): `STATUS: PASS`** — "All three attempt-1 issues are fixed, each with an observed run, and the interdiff adds no spec or constitution violation." The Reviewer withdrew its issue-1 failure prediction against the probe measurement (kept the fix for explicitness); `levelCode | null` vs the client's non-null union judged acceptable for T-01 (no reachable request produces the null; design §4 is silent on nullability).
  - **ADVISORY (recorded, no rework):** align the client type to `OrgLevelCode | null` and handle null (T-02/T-04); `toggle()` depends on PrimeNG internals — PrimeNG-upgrade checkpoint; `levelName` is returned but not in design §4 B1 (doc drift — Leader to reconcile at finalize); RB-5 stays open (probe ran on 8.4.11; the Dev baseline was dumped from 8.0.45); carried attempt-1 advisories unchanged.
- **Attempt 2 — Reviewer B (readability + resilience): `STATUS: PASS`** — "Both attempt-1 issues are fixed, and each fix has a falsifier that was seen red on the old code. The interdiff adds nothing that breaks the spec or the constitution in my lens." Keyboard parity checked against PrimeNG 19 `TTRow` (`primeng-treetable.mjs:5158-5246`): own toggle `tabindex=-1` like PrimeNG's, `onArrowRightKey` reads the first button's inline `visibility`, `stopPropagation` prevents row selection on toggle.
  - **ADVISORY (recorded, no rework):** client `levelCode` non-null vs server `| null` — before T-02 ships, type it nullable with a fallback label or drop/log such rows, and have T-02 tests prove the write path rejects ids outside 20–23; PrimeNG-internals dependency of `toggle()` — the transition test is the upgrade tripwire; `levelName` unused — T-02's Level select may consume it; **`src/db/helpers/staff-carnet-column.ts` is imported by append-only migrations — add a "frozen, fork don't edit" header** (a later edit would silently change merged migrations); attempt-1 advisories stand.

#### T-01 verbatim evidence (Done criteria 1 and 4 — copied from the server Implementer's reports, attempt 1 and 2)

`npm run migration:test:execute` (attempt 2 re-run after four reverts):
```
4 migrations are new migrations must be executed.
Migration CreateOrgUnits1791000000000 has been  executed successfully.
Migration CreateOrgUnitVersions1791000000001 has been  executed successfully.
Migration CreateOrgUnitChangeLog1791000000002 has been  executed successfully.
Migration CreateOrgUnitDelegates1791000000003 has been  executed successfully.
query: COMMIT
```
`SHOW INDEX` (`table|Non_unique|Key_name|columns`, attempt 1):
```
org_units|0|uq_org_units_code|code
org_units|1|idx_org_units_status|status
org_unit_versions|0|uq_org_unit_versions_unit_from|org_unit_id, valid_from_year
org_unit_delegates|0|uq_org_unit_delegates_unit_staff|org_unit_id, staff_carnet
org_unit_delegates|1|idx_org_unit_delegates_staff|staff_carnet
```
`SHOW CREATE TABLE` (attempt 1; carnet column definitions changed in attempt 2 to explicit `CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci` locally):
```
org_unit_versions:
  UNIQUE KEY `uq_org_unit_versions_unit_from` (`org_unit_id`,`valid_from_year`),
  CONSTRAINT `FK_org_unit_versions_director_carnet` FOREIGN KEY (`director_carnet`) REFERENCES `alliance_user_staff` (`carnet`) ON DELETE RESTRICT,
  CONSTRAINT `FK_org_unit_versions_level_value_id` FOREIGN KEY (`level_value_id`) REFERENCES `control_list_values` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_org_unit_versions_org_unit_id` FOREIGN KEY (`org_unit_id`) REFERENCES `org_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_org_unit_versions_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `org_units` (`id`) ON DELETE RESTRICT
org_unit_delegates:
  UNIQUE KEY `uq_org_unit_delegates_unit_staff` (`org_unit_id`,`staff_carnet`),
  CONSTRAINT `FK_org_unit_delegates_staff_carnet` ... REFERENCES `alliance_user_staff` (`carnet`) ON DELETE RESTRICT
org_unit_change_log: no CONSTRAINT / FOREIGN KEY
```
`/swagger` on the local reduced boot (attempt 1):
```
GET /swagger -> 200
PATHS ["/api/organizational-structure/units","/api/organizational-structure/years","/api/organizational-structure/units/{id}"]
LIVE GET /api/organizational-structure/years -> 200
LIVE GET /api/organizational-structure/units?year=2026 -> 200
LIVE GET /api/organizational-structure/units/999999999 -> 404
LIVE GET /api/v1/organizational-structure/years -> 404
```
Scope note (KZ-017): the reduced boot does not reach `EntitiesModule` under a full `AppModule` boot, nor `JwtMiddleware` / the envelope on the wire.

#### T-01 final record

- **Final status:** **PASS** (2026-10-16) · **Attempts:** 2 · **Review rounds:** 2 (cap 2) · effort server `high → xhigh`, client `medium → high`.
- **Requirements covered:** R-ORG-001 (read half), 004 (AC.1 + read half), 006, 012 (B1/B2/B5 + menu/route), 013 (except "create the first L1" → T-02), 014, 016 (read half), 017 (read half); NFR-ORG-002 (index half), 004, 005, 006 for B1/B2/B5.
- **Decisions:** budget re-based (~4,500/slice, ~20,000 total — requester); D-ORG-16 (carnet columns inherit the staff charset + collation — **requester acknowledgement pending**); RB-5 opened; expander = own toggle, not a global PrimeNG translation; level derived from id on the server only; diffs passed to Reviewers as scratchpad files.
- **Design reconciled at finalize:** §4 B1 now names `levelCode` as id-derived (`null` outside 20–23) and the additive `levelName` (Reviewer A advisory — doc drift, not new scope).
- **Issues encountered:** local DB down (WSL HCS 0x80070569, recovered without reboot); budget tripwire at 4,427 LOC; Reviewer A's predicted Dev charset failure not reproduced on the probe (corrected in the record); 2 pre-existing Windows-environment red suites on the server (proven on clean HEAD).
- **Final verification:** server full `npm test` 439/441 suites (the 2 pre-existing), targeted 78 + integration 65 green, eslint new files clean, build ok, migrations `[X]=353 [ ]=0` after down/up; client full 347/347 suites, 8008/8008, lint clean, `ng build` complete, `tsc -p tsconfig.spec.json` 0 new errors. Falsifiers 1–6 observed red and reverted (plus derived client falsifiers and the two attempt-2 reds).
- **Not reached / carried:** real-browser tree behaviour, screen-reader announcement, mockup fidelity → T-06; full `AppModule` boot; Dev/Prod charset (RB-5); P-14 active-staff rule → T-02 (local data: every staff row `is_active = 1`).
- **Gate:** approval mode `gated` → stop for the requester before T-02.

## Constitution Impact: T-01

- **New module:** `server/researchindicators/src/domain/entities/organizational-structure/` (registered in `entities.module.ts` and `main.routes.ts` at `organizational-structure`); new shared folder `server/researchindicators/src/db/helpers/` (first helper imported by migrations — `staff-carnet-column.ts`).
- **New client page:** `client/research-indicators/src/app/pages/platform/pages/administration/center-admin/organizational-structure/` + sidebar item + route.
- **Child guides:** no new child `CLAUDE.md` needed; the server child guide may need a line on `src/db/helpers/` (helpers imported by append-only migrations are frozen — Reviewer B advisory). `## Module Guides` index unchanged.
- **CodeGraph:** re-index pending (new module, page, helper).

## RB-5 measurement (2026-10-16, requester, *testing* environment)

Read-only queries run by the requester:
```
"CHARACTER_SET_NAME","COLLATION_NAME"
utf8mb4,utf8mb4_0900_ai_ci

"VERSION()"
"8.0.46-0ubuntu0.22.04.4"
```
- The D-ORG-16 helper will emit `CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci` there — the same pair proven locally. MySQL 8.0.46 accepts the explicit form.
- `baseline.sql` (dumped 2026-08-14, `utf8mb3`) is **stale** for this server: the table was converted at some point after that dump, or *testing* is not the dumped host. Invalidating condition (K-013): a later conversion of `alliance_user_staff`.
- RB-5 stays **open for Prod** (`main`).
- **Requester gate (2026-10-16):** "ok, continua" — D-ORG-16 acknowledged (design.md decision row updated); proceed to T-02.

### T-02 — Slice 2: save engine, form and staff picker

- **Status:** blocked at the first step (P-14), before any code.
- **P-14 measurement (Leader, 2026-10-16, local `127.0.0.1:3306/stardb`):**
  ```
  status  is_active  n
  N       1          3046
  NULL    1          39
  MIN(updated_at) 2024-11-14 20:51:05   MAX(updated_at) 2026-09-30 13:27:19
  ```
  - Every row is `is_active = 1`; `status` holds only `'N'` and `NULL`.
  - **Sync code read:** `AgressoStaffToolsService.cloneAllAgressoStaff()` pages `ErpEmploymentServices/api/v1/employees` and upserts through `allianceStaffMapper`, which copies `status` raw and never writes `is_active`. Nothing in the sync marks a leaver: either the endpoint returns only current employees (and leavers keep their last row), or leavers come back with an unchanged status.
  - **Verdict:** the output does **not** separate current staff from people who left → T-02's rule: *stop and ask the requester*. No code written.
- **P-14 decision (requester, 2026-10-16):** active staff = **`is_active = 1`** (option chosen over measuring on *testing* first and over `status = 'N'`). Written into design §4 B4 and the P-14 row (settled, accepted risk: the picker offers everyone currently in the table; invalidating condition recorded) **before any code**, as T-02 requires. RB-2 can close with this.
- **Dispatch attempt 1 (2026-10-16):** two fresh Implementers in parallel — server (effort `xhigh`; skills nestjs-expert, api-design-principles, error-handling-patterns, tdd) and client (effort `medium`; angular-developer, ui-ux-pro-max). Skills = task defaults. Per-half LOC tripwires in the briefs: server ~2,600, client ~1,900 (slice ~4,500). Forward pointers copied from the T-01 advisories, scoped "only inside T-02's approved scope": write path rejects level ids outside 20–23; B2 refresh after a save; client `levelCode` nullability; `levelName` optional; `staff-carnet-column.ts` not to be edited.
