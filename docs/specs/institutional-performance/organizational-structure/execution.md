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
- **Attempt 1 — client Implementer report (2026-10-16):** new `org-unit-form` component + `org-form.util.ts`; page wires the form, `onSaved` reloads B2 then B1 (T-01 B2 advisory applied) and reselects; tree row **+** (hidden on L4 and ended); 5 new `ApiService` methods incl. `GET_ControlListValuesByKey`. ~1,200 LOC (740 prod / 460 spec). Gates: targeted 27 + 21; full `npm test` 348/348 suites, 8037/8037; lint clean; `ng build` ok; `tsc -p tsconfig.spec.json` 945 total (= T-01 baseline), org-structure files 0. Client falsifiers F1–F6 observed red, reverted (payload names, director offered as delegate, Applies-from shown on code-only/delegates-only edits, back-date year list, inactive filter, ended parent).
  - **Contract coded against (to reconcile with the server half):** B3 `GET units/code-proposal` → `{code}`; B4 `GET staff?search=` → `{carnet, name|null, email|null}[]` (client also drops `isActiveStaff === false`); B9 `POST units` body `{code?, levelId, name, acronym?, parentId?, directorCarnet?, delegateCarnets?, appliesFromYear, backdate?}` → `{id}`; B10 `PATCH units/:id` changed fields only, **`parentId: null` and `directorCarnet: null`** to clear, `acronym: ''`, `delegateCarnets: []` clears; levels `GET control-lists/by-key/<key>/values?activeOnly=true`.
  - **Not Done / Assumptions:** toast outcome decided client-side (a year equal to a later scheduled start reads "new version" though the server edits in place); create toasts "Entry created from Y" / "…back-dated from Y" (design names only the three save outcomes); parent self-exclusion untested; delegate-made-director left to the server 400; `levelCode | null` advisory not applied; no tab strip yet (T-03); 21st-delegate refusal, delegate Inactive mark and read-only email asserted but not mutated.
- **Attempt 1 — server Implementer report (2026-10-16):** new service (601), `org-hierarchy.util.ts`, write repository, 3 DTOs; timeline util +185 (`applyChange`, `assertTimeline`, …); controller B3/B4/B9/B10. Gates: targeted jest 12 suites / 217 tests; `npm run test:integration -- org-structure` 4 suites / 89 tests, each `resolved DB target: 127.0.0.1:3306/stardb`, org tables 0 rows after, staff 3085; `npx eslint` exit 0 (gate shown able to go red on a probe file); build exit 0. Falsifiers 1–9 observed red on their own assertions and reverted (table in the worker report: e.g. F1 `["Data Sciences","Data Sciences"]`, F5 inactive last-name match returned on real SQL, F6 versions `[2026,2027]+[2027,null]` after a forced log failure, F9 version count 2). `/swagger` reduced boot: B3, B4, B9, B10 with tags/bearer/params/bodies; `staff?search=a` → 400; `/api/v1/...` 404.
  - **Contract (server):** B3 `{code}`; B4 `{carnet, name, email|null}[]` max 20 (no `isActiveStaff` field — the client's extra filter is a no-op); B9 201 / B10 200 return the **B5 shape** (client reads `data.id` — compatible); B10 `null` clears `acronym`/`parentId`/`directorCarnet` (matches the client); `appliesFromYear` required when a versioned field is sent; errors `{description, field}` (client handles `{description}`). **Leader reconciliation: no contract mismatch found between halves.**
  - **Judgment calls to adjudicate in review:** no-op saves write nothing; children not re-validated when an entry's level changes (§5.3 silent; cycle check is the backstop); R-ORG-004 upper bound (`appliesFromYear ≥ status_from_year` → 400) implemented now although listed under T-03 (avoids an invariant 500); director must exist but need not be active; overlap blame rule; `assertValueInList` wrapped to name `level`; diff-based delegate replace; 1062 → 409 only for the code index; B3 not atomic with create; `org_units` audit bumped only on code change; hierarchy re-checked only when parent/level changes.
  - **Not reached (KZ-017):** `FOR UPDATE` under a real two-session race; `GlobalExceptions` in the DB suite (pinned by a unit spec); full `AppModule` boot; RB-5.

## Budget Tripwire: T-02 (2026-10-16)

- **Measured by the Leader** (`git diff --numstat -- server client`, new files intent-added): **32 files, 5,165 added / 35 deleted** — 2,840 tests, 2,325 prod; server 3,860, client 1,305.
- **Budget (re-based at T-01):** slice tripwire ~4,500 → **delta +665 (×1.15)**. Cumulative after 2 of 5 code slices: **9,592** of the ~20,000 estimate (48 %); T-03 (lifecycle, delete, history) and T-04 (consumer contract, linked data) are of similar weight, T-05 smaller → projection ≈ 20,000–22,000, near the re-based estimate.
- **Cause:** the temporal engine + 9 falsifiers with real-DB proofs (tests 55 %); the server half alone was 3,860 against its ~2,600 brief tripwire (the worker measured only at the end).
- **State:** both halves green as reported; **not yet reviewed**; Leader full-suite re-measure not yet run. Stopped for the requester.
- **Requester decision (2026-10-16):** *Aceptar y seguir* — T-02 accepted at 5,165 LOC; tripwire (~4,500/slice) and estimate (~20,000) unchanged.
- **Leader full-suite re-measure (no worker active):** server `Test Suites: 2 failed, 443 passed, 445 total` · `Tests: 3 failed, 4457 passed, 4460 total` — the same two pre-existing suites (`entity-metadata`, `capdev-bulk-summary`; clean-HEAD-proven at T-01); client `Test Suites: 348 passed, 348 total` · `Tests: 8037 passed, 8037 total`.
- **Review dispatch (attempt 1):** parallel-lens (temporal engine + transaction + PII field, Review `full`): Reviewer A reliability + risk, Reviewer B readability + resilience; fresh spawns; diffs as scratchpad files `t02-server.diff` / `t02-client.diff` (same deviation as T-01).
- **Attempt 1 — Reviewer B (readability + resilience): `STATUS: FAIL`, 2 issues** (both reasoned, not run):
  1. Save toast decided from the *viewed* version's `from`, while the server edits in place whenever any version starts at Y → false "new version from Y" on the R-ORG-004 two-version fixture (viewing 2026 + Applies 2028; viewing 2028 + Applies 2026). Violates design §6.5 and R-ORG-013 AC.2. Remediation: outcome from data that knows every version start (server returns the log action, or client loads B5).
  2. Delegate chips show name only; design §6.5 and R-ORG-017 *Add delegates* require name **and email**.
  - **ADVISORY (recorded, no rework):** Applies-from default (current year) can target a different version than the one viewed, and yields a 400 on an entry first-dated after the current year — design gap, raise at T-06; parent candidates come from the viewed year's B1, not Y's (server 400 is the backstop); no dirty-check on row switch; client `maxLength` 150/30 vs server 255/50; Code marked required but blank allowed on create, `code: ''` on edit → 400; `@for` re-create idiom needs a template comment; raw `p-select`/`p-autoComplete` (design §6.5 names them — spec governs); focus not moved into/out of the form (T-06 keyboard pass); `updateInTransaction` ~150 lines; missing-entry 404 is a bare string vs `{description, field}`; record the create-toast wording in §6.5; parent self-exclusion one-line test; mutation-prove the 20-delegate cap; T-03 must introduce `org-unit-panel` with tabs or amend §2.1.
  - **Unproven per B:** swagger observation paraphrased in execution.md (the worker's report quoted it — Leader to copy verbatim at finalize); the 2027 parent-picker transition asserts an unchanged list (F6 covers the rule).
- **Attempt 1 — Reviewer A (reliability + risk): `STATUS: FAIL`, 2 issues** (reasoned, not run; verbatim in scratchpad `t02-review-attempt1.md`):
  1. Level change does not re-validate **children**' versions → e.g. `PATCH` an L2 to L1 with an L3 child returns 200, leaving an L3 under an L1. Violates design §3.2 **I-3** ("Every version's parent obeys the level rules…" — Leader verified, design.md:140) and R-ORG-003.
  2. Toast — same defect as Reviewer B issue 1 (plus: a no-op save against the version covering Y still toasts success).
  - Held (A): timeline util, transaction + `FOR UPDATE` + in-transaction log with real-DB rollback, back-date via clock, both bounds (judgment call 3 conforms to R-ORG-004 Details), cycle check over boundary years, I-6, DTO whitelist via real `ValidationPipe`, 1062 → 409 `code`, B4 parenthesized + `is_active = 1` on real SQL, roles + Contributor 403 with counts unchanged, PII (carnets only).
  - **ADVISORY (recorded, no rework):** cross-entry concurrency — `FOR UPDATE` locks only the saved entry, graph read unlocked (consider locking parent rows, or accept); 1062 mapping by exclusion → prefer positive match on `uq_org_units_code`; B3/create race 409 text; delegate order — client compares ordered, server as set (no-op toasts success); inactive director accepted via API (conforms; revisit if P-14 invalidates); client maxLength vs DTO.
  - Unproven per A: swagger observation paraphrased (same as B).
- **Leader adjudication → attempt 2 (2026-10-16):** 3 distinct issues, all in scope, none a Pivot. (1) children I-3 check on level change — server; (2) toast — **option (i)**: B9/B10 return an additive `outcome` (the action actually logged; `null` = no-op), client maps it; Leader added the contract note to design §4 ("B9/B10 response `outcome`", after the API table); (3) delegate chip email — client. Both workers resumed with their context; client effort `medium → high`; server stays `xhigh` (the next step up would be `max` on a T2 tier, which the effort dial forbids). Client allowed the trivial set-compare of delegates (A advisory, same file set, same defect family as the no-op toast). Swagger observation to be quoted verbatim this round.
- **Attempt 2 — client Implementer report (2026-10-16):** toast derived only from `outcome` (`edit_in_place` / `new_version` / `backdated` / `create` / `code_change` / `delegates_change`; `null` → info "No changes"; missing `outcome` → generic "Entry saved"); `coveringFrom` removed from the decision; delegate chip shows name + email (`atc-grey-700`); delegates compared as a set. Falsifiers observed red then reverted: old `coveringFrom` logic → `7 failed` in the toast group (e.g. `Expected: "Entry back-dated from 2025"` / `Received: "Entry saved as a new version from 2025"`); chip email on the old template → `Expected substring: "B2@example.org"` / `Received string: " Cira Gone Inactive staff"`; index-wise compare → reorder test red. Gates: form spec 34; full `npm test` 348/348, **8044/8044**; lint clean; `ng build` ok; tsc spec 945 (= baseline), 0 in org-structure. ~+115 LOC.
  - **Not Done / Assumptions:** coded against the design §4 `outcome` note with a mocked `ApiService` — to reconcile with the server's real response; case (a) uses 2027 instead of 2028 (test range); a no-op still reloads the page.
- **Attempt 2 — server Implementer report (2026-10-16):** `findChildLevelConflicts` / `describeChildLevelConflicts` in `org-hierarchy.util.ts`; the service runs the child check when `levelId` changes (graph already loaded); B9/B10 return B5 + `outcome` built from the logged action (version action wins in a multi-action save; no-op → `{action:null, appliesFromYear:null, backdated:false}`); `OrgSaveOutcomeDto` in Swagger. Child-check falsifier (`findChildLevelConflicts(graph).slice(0, 0)`) observed red — unit `2 failed, 80 passed`, integration `Expected: 400 / Received: 200` — then reverted. Gates: targeted 12 suites / 236 tests; integration 4 suites / 91 tests on `127.0.0.1:3306/stardb`; eslint exit 0; build exit 0. Swagger reduced boot quoted verbatim in the worker report (B1, B9 201 + `outcome` schema, B3, B4, B2, B5, B10 200 + `outcome`, `OrgSaveOutcomeDto` with `action` enum nullable / `appliesFromYear` nullable / `backdated`). ~+670 LOC.
  - **Not Done / Assumptions:** rest of `data` described in text only (no full B5 response DTO); conflict message names the last version's level; child check only on a level change; a level change propagated into earlier versions covered only by the util's overlap logic.
- **Leader reconciliation:** server `outcome` shape = client `OrgSaveOutcome` (action enum incl. `null`, `appliesFromYear` nullable, `backdated`); no mismatch.
- **Leader re-measure after attempt 2:** size `git diff --numstat` **5,731 added** (3,198 tests / 2,533 prod) — the rework added 566 to the slice the requester accepted at 5,165; server full `npm test` `2 failed, 443 passed, 445 total` · `3 failed, 4476 passed, 4479 total` (the 2 pre-existing suites); client full 348/348, 8044/8044 (worker run, server worker idle in its own package).
- **Review round 2 dispatched** to both Reviewers (resumed), with interdiffs `t02-server-interdiff.txt` / `t02-client-interdiff.txt`.
- **Attempt 2 — Reviewer B (readability + resilience): `STATUS: PASS`** — "Both attempt-1 issues are fixed, and the interdiff adds no spec or constitution violation in my lens."
  - **ADVISORY (recorded, no rework):** `saveToast` `default:` also catches unknown future actions → add an explicit `edit_in_place` case and a neutral default; `describeChildLevelConflicts` names the last version's level (wording only; rare reachable case); `codes.get(id) ?? '#id'`; skip `saved.emit` on a no-op; attempt-1 advisories carried (Applies-from default, parent candidates from the viewed year, dirty-check, length limits, Code required, focus — T-06).
  - B flags the swagger criterion as still unproven because execution.md paraphrased it. **Leader note:** the criterion asks for a *local reduced boot* (D-EX-4), not a full boot; the server worker's attempt-2 report quoted it verbatim — copied below at finalize.
- **Attempt 2 — Reviewer A (reliability + risk): `STATUS: PASS`** — "Both attempt-1 issues are fixed… The interdiff adds nothing that violates the spec." Child check judged complete for I-3 within T-02 (propagation only copies fields in `diff`; a split keeps levels; a parent's coverage never shrinks in T-02); T-03 lifecycle paths stay guarded by §5.4/§5.5 "active children → 409". No T-02 done criterion left unproven.
  - **ADVISORY (recorded, no rework):** cross-entry race (`FOR UPDATE` on the saved entry only) — **logged as RB-6 for a requester decision**; conflict message names the last version's level; one `findUnit` per conflicting child on rejection (fine at ~500 entries); 1062 mapping by exclusion; delegate emails in chips match R-ORG-017 (admin-only page).

#### T-02 verbatim evidence

P-14 (Leader, 2026-10-16, local `stardb`): see the T-02 *P-14 measurement* bullet above (`N/1` 3046, `NULL/1` 39).

`/swagger` on the local reduced boot (server worker, attempt 2, verbatim excerpt):
```
DB target: 127.0.0.1:3306/stardb
GET /swagger -> 200
{"path":"/api/organizational-structure/units","method":"POST","tags":["Organizational Structure"],"security":[{"bearer":[]}],"summary":"Create an entry with its first version (a first year before the current one needs backdate=true)","parameters":[],"body":"#/components/schemas/CreateOrgUnitDto"}
  responses: {"201":{"description":"data = the B5 shape (entry, versions, delegates) plus `outcome`: what the save actually did","content":{"application/json":{"schema":{"type":"object","properties":{"data":{"type":"object","properties":{"outcome":{"$ref":"#/components/schemas/OrgSaveOutcomeDto"}}}}}}}}}
{"path":"/api/organizational-structure/units/code-proposal","method":"GET","tags":["Organizational Structure"],"security":[{"bearer":[]}],"summary":"Proposed code for a new entry: ORG- plus the next free number","parameters":[]}
{"path":"/api/organizational-structure/staff","method":"GET","tags":["Organizational Structure"],"security":[{"bearer":[]}],"summary":"Staff picker for director and delegates: active staff only, at most 20","parameters":["query:search*"]}
{"path":"/api/organizational-structure/units/{id}","method":"PATCH","tags":["Organizational Structure"],"security":[{"bearer":[]}],"summary":"Change an entry: edits a version in place, splits one, back-dates, changes the code and/or replaces the delegates","parameters":["path:id*"],"body":"#/components/schemas/UpdateOrgUnitDto"}
  responses: {"200":{"description":"data = the B5 shape (entry, versions, delegates) plus `outcome`: what the save actually did","content":{"application/json":{"schema":{"type":"object","properties":{"data":{"type":"object","properties":{"outcome":{"$ref":"#/components/schemas/OrgSaveOutcomeDto"}}}}}}}}}
components.schemas.OrgSaveOutcomeDto: {"type":"object","properties":{"action":{"type":"string","enum":["create","edit_in_place","new_version","code_change","delegates_change"],"nullable":true,...},"appliesFromYear":{"type":"number","nullable":true,...},"backdated":{"type":"boolean",...}},"required":["action","appliesFromYear","backdated"]}
```
Attempt 1 live probes: `staff?search=ab` → 200, `staff?search=a` → 400, `/api/v1/organizational-structure/units/code-proposal` → 404. Scope (KZ-017): no full `AppModule` boot; no `JwtMiddleware`/envelope on the wire.

#### T-02 final record

- **Final status:** **PASS** (2026-10-16) · **Attempts:** 2 · **Review rounds:** 2 (cap 2) · effort server `xhigh`, client `medium → high`.
- **Requirements covered:** R-ORG-001 (write half), 002, 003, 004 (incl. the upper bound brought forward from T-03 — Reviewer A: conforms to R-ORG-004 Details), 005, 009 (create / edit_in_place / new_version / code_change), 012 (B3, B4, B9, B10), 013 (form, first L1, toast), 016, 017 (except the History half → T-03); NFR-ORG-002 (invariant half), 004, 006.
- **Decisions:** P-14 = `is_active = 1` (requester; accepted risk); budget overrun accepted at 5,165 (requester), final 5,731 after review rework; B9/B10 `outcome` contract added to design §4 (Leader, from both Reviewers); children I-3 check on level change; RB-6 opened (cross-entry race — requester decision).
- **Final verification:** server full `npm test` 443/445 suites (2 pre-existing), 4476/4479 tests; targeted 236 + integration 91 on local `stardb`; eslint (gate shown able to go red); build ok. Client full 348/348, 8044/8044; lint; `ng build`; tsc spec 945 = baseline. Falsifiers 1–9 + the child-check falsifier + client falsifiers observed red and reverted.
- **Not reached / carried:** autocomplete overlay positioning at 1,280 px, focus management, Applies-from default, dirty-check → T-06; a real two-session race (RB-6); full `AppModule` boot.
- **Gate:** approval mode `gated` → stop for the requester before T-03.

## Constitution Impact: T-02

- No new module; `organizational-structure` gains a write service, write repository and DTOs; public surface adds B3, B4, B9, B10 and the `outcome` response field (design §4 updated). Client page gains `org-unit-form`. Child guides: no change needed. CodeGraph re-index still pending.
