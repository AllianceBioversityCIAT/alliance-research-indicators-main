# Execution log — Results / OICR Word Template 2026 (filled download)

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/results/oicr-word-template-2026/` |
| Approval Mode | `standard` in `requirements.md`; run as **pre-approved for routine progress** per the owner's standing direction (stop only on FATAL_FAIL / HALT / Pivot / budget tripwire / visual approval) |
| Branch | `AC-1793-US2-Update-the-word-template-with-OICR-data` (spec commit `f1ce7e41`) |
| Started | 2026-10-23 |
| Leader | Claude Code session, `claude-opus-5-5` (T1) |
| Implementer | Cursor CLI, Grok (`grok-4.7-*`), via Orca orchestration — standing user routing ("Grok implements, Claude reviews"); one fresh worker per task, released after Reviewer PASS |
| Reviewer | `akili-reviewer` wrapper (Claude `opus`, read-only `Read/Grep/Glob`) — author ≠ auditor on both axes |
| Budget (design §14) | 8 tasks · ~1 400 LOC added (+ ~1 600 deleted) · 12 review rounds |

### Run notes (Step 0)

- **Persona drift.** The `akili` CLI is not on PATH (`akili not found`), so `akili doctor --agents` could not run. Mitigation (precedent `reports/excel-layout-server-side`): each Cursor brief carries the checkpoint bounds (3 same-failure cycles / 60 tool calls) and the seven checkpoint fields; the Reviewer brief carries the report contract.
- **Model registry.** `cursor-agent models` (2026-10-23) lists `grok-4.7-{low,medium,high,xhigh}[-fast]`; effort is baked into the slug.
- **Skills.** The tasks' skills (`nestjs-expert`, `tdd`, `error-handling-patterns`, `angular-developer`) are Claude Code skills; a Cursor worker cannot load them. Each brief carries their discipline in prose (precedent).
- **Parallelism.** Eligible at start: T-01 (server) and T-05 (client, no deps). Cross-package editing in parallel is allowed (root `CLAUDE.md` §4.3); full-suite runs are serialized by the Leader.
- **Fixture source.** `~/Desktop/OICR-2026-word-export/poc/template-2026.docx`, SHA-1 `e469c79d7f00fe053c975d0d8b6b3a55b6712658` (Leader, `shasum`, 2026-10-23).
- **Working tree at start.** Clean (`git status --porcelain` empty).

---

## Task Execution History

### T-05 — Button visibility: Portfolio 2 only

- **Status:** PASS (attempt 1).
- **Date:** 2026-10-23
- **Effort:** medium (Size S; one predicate flip plus a known spec sweep).
- **Review mode:** lens checklist (single reviewer). Task `Review: checklist`; no `skip-eligible` claim in this spec.
- **Skills deviation:** `angular-developer` could not load on the Cursor host; the brief carried its discipline in prose (transition-first fixtures, no template edits).
- **Parallelism:** ran concurrently with T-01 (server). Cross-package editing only; the full client suite was run by the Leader after both workers reported.

#### First step — P-16 smoke check (Leader)

- **What was run:** a read-only query on the shared test DB (`ARI_MYSQL_*`, `SET SESSION TRANSACTION READ ONLY`): `SELECT result_official_code, report_year_id, indicator_id, get_portfolio_id_by_result(result_id) …`.
- **Result:** `[{"code":554,"yr":2026,"ind":5,"portfolio":2},{"code":626,"yr":2026,"ind":5,"portfolio":2},{"code":120,"yr":2025,"ind":5,"portfolio":1},{"code":122,"yr":2025,"ind":5,"portfolio":1},{"code":128,"yr":2025,"ind":5,"portfolio":1}]`.
- **What it does not cover (KZ-017):** this reads the server's portfolio function, not the client's `…/metadata` response. Reading that response needs an authenticated Dev session, which the Leader does not have. The client metadata uses the same range predicate (P-16, static). The rendered button on Dev is covered by the T-08 HITL download from the button.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-medium`, Orca `run_704dd2d24af9` / `task_8d915fbd75f2` / `ctx_be261f092602` (retained until PASS, released after). Brief: `T-05-brief.md`, report: `T-05-report.md` (session scratchpad).
- **Files changed:** `client/research-indicators/src/app/shared/utils/oicr-template-download.util.ts` · `…/utils/oicr-template-download.util.spec.ts` · `…/components/oicr-header/oicr-header.component.ts` (doc comment) · `…/oicr-header/oicr-header.component.spec.ts` · `…/components/section-header/section-header.component.ts` (doc comment) · `…/section-header/section-header.component.spec.ts`.
- **Consumer grep** (`grep -rnE "OICR_TEMPLATE_DOWNLOAD_PORTFOLIO_2_ENABLED|isOicrTemplateDownloadHidden|resolvePortfolioId" src`): 18 hits before, 13 after. The constant has 0 hits after.
- **Implementer verification:**
  - 3 specs: `Tests: 125 passed, 125 total` (with `--coverage=false`, K-020);
  - `npx tsc -p tsconfig.spec.json --noEmit`: 945 errors before and 945 after, all pre-existing; 0 in the util files;
  - `npm run build`: exit 0.
- **Falsifier red** (new assertion, run against the unchanged util):
  ```
  ● oicr-template-download.util › isOicrTemplateDownloadHidden › shows the download for Portfolio 2
    Expected: false
    Received: true
  ```
- **Transition tests (KZ-015):**
  - `shows the download button after Portfolio 2 metadata arrives` (oicr-header);
  - `renders the download icon after Portfolio 2 metadata arrives` (section-header).
- **Evidence re-run (Leader, inline): VERIFIED.**
  - Same 3 specs: `Tests: 125 passed, 125 total`.
  - Full client suite (`npm test -- --silent`, after both workers reported): `Test Suites: 1 failed, 345 passed, 346 total` · `Tests: 8041 passed, 8041 total`.
    - The failed suite is `dynamic-notion-block.component.spec.ts`: `A jest worker process (pid=34925) was terminated by another process: signal=SIGSEGV`. That is a runner crash with 0 failed tests.
    - Re-run in isolation: `Tests: 31 passed, 31 total`. Known runner flake (failed suite, zero failed tests).
- **Reviewer:** `STATUS: PASS` (`akili-reviewer`, Claude opus).
  - Every R-OWT-008 row has an assertion that would go red: P2 shown, P2 published hidden in oicr-header, P1 hidden, unknown hidden.
  - Every design §13 range was inverted.
  - The oicr-header transition test renders first and only then sets the metadata.
  - No scope creep.
- **ADVISORY (4R, recorded, non-gating):**
  - READABILITY: the stale comment `oicr-header.component.spec.ts:336-337` ("temporarily hidden (DOWNLOAD_TEMPLATE_VISIBLE)") predates the task.
  - RELIABILITY: the section-header transition test starts from non-OICR metadata, so its "absent first" assertion does not isolate the portfolio branch. The computed tests at spec lines 456-470 cover that branch.
  - RISK: unknown → hidden inverts the 2025 fallback. No reachable path was found (design §13).
- **runtime events:** none.
- **spawns:**
  - implementer (Cursor grok-4.7-medium): not reported by host, ended complete;
  - reviewer: 9 calls, 59,965 tokens, ended complete.
- **Requirements covered:** R-OWT-008 (visibility table, both scenarios).
- **Decisions made:** the P-16 smoke check ran on the DB function instead of the Dev metadata response (no authenticated session). Its scope is recorded above.
- **Final verification:** PASS.

### T-01 — Document engine (pure) with fidelity, field and drift suites

- **Status:** PASS (attempt 1).
- **Date:** 2026-10-23
- **Effort:** high. Size L, the binary-format core, well specified by design §5 step 7 and the validated POC.
- **Review mode:** lens checklist (single reviewer). Task `Review: full`.
- **Skills deviation:** `nestjs-expert`, `tdd` and `error-handling-patterns` could not load on the Cursor host. The brief carried their discipline in prose: red on the assertion first, literal expected values, one named error class per failure kind, no `@nestjs` import.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-high`, Orca `run_704dd2d24af9` / `task_9e60c6874a1b` / `ctx_09afc0c1f620` (retained until PASS, released after). Brief: `T-01-brief.md`, report: `T-01-report.md` (session scratchpad).
- **Files changed:**
  - new under `server/researchindicators/src/domain/entities/result-oicr/word-template/`:
    - `oicr-word-template.ids.ts` (43 lines);
    - `oicr-word-template.engine.ts` (821);
    - `oicr-word-template.engine.spec.ts` (798);
    - `__fixtures__/oicr-template-2026.docx` (binary);
  - modified: `server/researchindicators/package.json` and `package-lock.json` (+2 lines each: the two direct dependency declarations).
- **Implementer verification:**
  - scoped suite: `Tests: 24 passed, 24 total`;
  - `npx eslint src/domain/entities/result-oicr/word-template`: exit 0;
  - `npm run build`: exit 0;
  - `npm ls`: both libraries are direct dependencies.
- **Falsifiers (a)–(g), each observed red on its behavioral assertion, then reverted** (verbatim from the Implementer report):
  - (a) Text outside a target (`quantify` → `QUANTIFY` in the generated buffer): the `firstDiff` object received `"output": "QUANTIFY the scale and reach of the reported out"` against `"template": "quantify the scale and reach of the reported out"`, where empty strings were expected.
  - (b) One `w:del` dropped: `Expected: 5` / `Received: 3`.
  - (c) Duplicate `w:id`: `Expected: 151` / `Received: 150` (set size against array length).
  - (d) `Multi-regional` written into the geo scope: `- Array []` / `+ Array [ "Multi-regional" ]` from `selectedOptionMismatches`.
  - (e) `styles.xml` changed: `- Array []` / `+ Array [ "word/styles.xml" ]`.
  - (f) `setOption` skips silently: `Expected constructor: OicrWordTemplateMissingOptionError` / `Received value: undefined`.
  - (g) Positional section-15 addressing with swapped columns: `Expected: "Name Value"` / `Received: "Position Value"`.
- **Fixture SHA-1:** `e469c79d7f00fe053c975d0d8b6b3a55b6712658`. It matches the POC template and P-6, and the suite also asserts it.
- **POC vs design:** the ids agree. Where the two differ, the design won:
  - `textId` is copied (the POC forced `77777777`);
  - leaves are addressed by pinned id (the POC used position);
  - errors are named;
  - validation runs before any write;
  - XML 1.0 normalization was added.
- **Evidence re-run (Leader, inline, after the worker reported): VERIFIED.**
  - Scoped suite: `Tests: 24 passed, 24 total`.
  - `npm ls jszip @xmldom/xmldom`: `├── @xmldom/xmldom@0.8.10` and `├── jszip@3.10.1` (direct dependencies).
  - eslint: exit 0. Build: exit 0.
  - `shasum` of the fixture: `e469c79d…`.
  - Full server suite (`npm test -- --silent`): `Test Suites: 442 passed, 442 total` · `Tests: 4298 passed, 4298 total`, exit 0.
- **Reviewer:** `STATUS: PASS` (`akili-reviewer`, Claude opus). Findings:
  - design §5 steps 7.1–7.9 are all met;
  - `validate` runs before `applyFields`;
  - named errors use the §4 wording;
  - N counts none-label rows; fresh `w:id`/`paraId` below `0x80000000`; `textId` copied;
  - the null edit compares against the raw zip string;
  - the drift guards cover all six §10 mutations and assert that no buffer is returned;
  - the engine imports only `@xmldom/xmldom`, `jszip` and the ids module;
  - the lockfile diff holds only the two declarations.
- **ADVISORY (4R, recorded, non-gating):**
  - RELIABILITY: the xmldom parser ignores non-fatal parse errors (`error: () => undefined`), so a hand-corrupted template might parse into the wrong structure. Suggestion: treat errors as fatal.
  - RISK: `cloneItems` gives fresh ids only to `w:sdt` `w:id`s and to paraIds. A `w:commentRangeStart` or `w:permStart` inside an item would duplicate its id, and validation does not scan for those tags. The current fixture is not affected (P-21).
  - TEST COVERAGE: the "no placeholder flag/style" check lists 12 controls. It omits position, affiliation, email, the 3.b rows, the "If other" rows and the cloned 3.a rows. §10 says "every filled control"; it is the same `setText` path.
  - TEST STRENGTH (KZ-001): the special-character check reads re-serialized output. Asserting on the raw `outXml` string would be stronger.
  - READABILITY: a structure error thrown inside `cloneItems` names the control `'repeatingSection'`. It is unreachable through `build`.
  - LOCKFILE: a `deprecated` line written by `npm install` was removed by hand and will return on a later install.
- **runtime events:** none.
- **spawns:**
  - implementer (Cursor grok-4.7-high): not reported by host, ended complete;
  - reviewer: 14 calls, 117,075 tokens, ended complete.
- **Requirements covered:** R-OWT-004, R-OWT-005, R-OWT-006 (template rows), NFR-OWT-003; the engine parts of R-OWT-002 and R-OWT-003.
- **Decisions made:** none beyond the brief.
- **Final verification:** PASS.

## Budget Tripwire — after T-01 (2026-10-23)

| Measure | Budget (design §14) | Actual so far | Delta |
|---|---|---|---|
| Tasks | 8 | 2 closed (T-01, T-05) | on plan |
| LOC added | ~1 400 for the whole spec (≈ 700 server code + tests over engine, mapper and drift guards) | ~1 700 after 2 of 8 tasks: T-01 1 662 (engine 821, spec 798, ids 43) plus T-05 +40/−51 | **exceeded**: T-01 alone is above the whole-spec estimate, with T-02, T-03, T-04 and T-06 still to come |
| Review rounds | 12 | 2 (both PASS on the first attempt) | under |

- **Cause:** the engine and its suite are about 2.4× the per-component estimate. The design §5 step 7 hardening and the §10 suite (24 tests, falsifiers (a)–(g), 6+ drift guards) went past the POC's ~300 lines. The estimate sized the port, not the hardening.
- **Action:** execution stopped and escalated to the owner before T-02, per `/akili-execute` §2.4 (Budget Tripwire).
- **Owner decision (2026-10-23, AskUserQuestion):** "Continue, accept overrun". The LOC budget is re-baselined to about 3 000 added lines for the spec. Execution resumes with T-02 (server) and T-04 (client) in parallel. T-04 builds against the design §4 contract; tasks.md T-04 allows this ("editing can start in parallel against the §4 contract").

### T-04 — Client download through the endpoint

- **Status:** PASS (attempt 1).
- **Date:** 2026-10-23
- **Effort:** medium (Size M, well specified).
- **Review mode:** lens checklist (single reviewer). Task `Review: full`. Override (b) applies: it touches the shared `httpErrorInterceptor` and exported symbols.
- **Skills deviation:** `angular-developer` and `error-handling-patterns` could not load on the Cursor host; the brief carried them in prose.
- **Dependency note:** started before T-03 (endpoint) exists and built against the design §4 contract, as tasks.md T-04 allows. Runs in parallel with T-02 (server).
- **Leader narrowing in the brief:** `pages/oicr-download/oicr-download.component.ts` was changed only enough to compile against `download(code)`. The path route, legacy redirect and navigation stay with T-06. `wasm.service.ts`, `public/go/*`, `angular.json` and `GET_OICRDetails` stay with T-07.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-medium`, Orca `run_704dd2d24af9` / `task_1c4cc6bfff95` / `ctx_716bc0aff235` (retained until PASS, released after). Brief: `T-04-brief.md`, report: `T-04-report.md` (session scratchpad).
- **Files changed** (all under `client/research-indicators/src/app/`):
  - new: `shared/utils/download-blob.util.ts`;
  - services: `shared/services/api.service.ts` (+ spec), `shared/services/oicr-download.service.ts` (+ spec, rewritten);
  - button: `shared/components/download-oicr-template/download-oicr-template.component.{ts,html,spec.ts}`;
  - interceptor: `shared/interceptors/http-error.interceptor.ts` (+ spec);
  - page: `pages/oicr-download/oicr-download.component.ts` (+ spec).
- **Implementer verification:**
  - 5 specs: `Tests: 301 passed, 301 total`;
  - `npm run build`: exit 0;
  - `tsc -p tsconfig.spec.json`: 945 errors before and after, no new errors;
  - `npm run lint -- --quiet`: `All files pass linting.`
- **Falsifiers (verbatim, reverted):**
  - `description` read before `errors`: `Expected substring: "Result is not an OICR"` / `Received message: "BadRequestException"`.
  - Interceptor exclusion removed: `Expected number of calls: 1` / `Received number of calls: 2`.
- **Notes from the report:**
  - Error bodies are read with `FileReader.readAsText`, which works in jsdom (J-27).
  - The generic text is `Could not download the OICR template. Please try again.`
- **Evidence re-run (Leader, inline): VERIFIED.**
  - Same 5 specs: `Tests: 301 passed, 301 total`.
  - Full client suite, after both workers reported: `Test Suites: 1 failed, 345 passed, 346 total` · `Tests: 8065 passed, 8065 total`.
    - The failed suite is `landing-texts.service.spec.ts`: `A jest worker process (pid=85543) was terminated by another process: signal=SIGSEGV`. That is a runner crash with 0 failed tests.
    - Re-run in isolation: `Tests: 1 passed, 1 total`.
    - This is the same runner flake as the T-05 run, this time on a different suite.
  - `npm run build`: exit 0, `Application bundle generation complete.`
  - The button no longer references `WasmService`: grep count 0.
- **Reviewer:** `STATUS: PASS` (`akili-reviewer`, Claude opus).
  - The `errors` → `description` → generic order is asserted with exact strings, and the JSON branch is proven.
  - The server `GlobalExceptions` sets `description = exception.name` and `errors = response.message` (`global.exception.ts:31-44`), which is the order the client relies on.
  - The interceptor exclusion is URL-scoped and tested on a real error path for both URLs.
  - The button spec walks idle → click → loading → one toast, and `httpMock.verify()` shows exactly one request (R-OWT-011).
  - No `X-Use-Year` header is sent (D-OWT-15).
  - Scope stays within the narrowing.
- **ADVISORY (4R, recorded, non-gating):**
  - RELIABILITY (KZ-017): the button spec registers no interceptors, so its "one toast" cannot see an interceptor toast. The no-double-toast claim rests on the button spec and the interceptor spec together.
  - READABILITY: the page component repeats the generic sentence instead of importing `OICR_WORD_TEMPLATE_GENERIC_ERROR`. T-06 rewrites that component.
  - RESILIENCE: if `errors` arrives as an array, `description` (the class name) would be shown. Not reachable for this endpoint.
  - READABILITY: `api.service.spec.ts` asserts the call arguments twice.
- **runtime events:** none.
- **spawns:**
  - implementer (Cursor grok-4.7-medium): not reported by host, ended complete;
  - reviewer: 10 calls, 96,360 tokens, ended complete.
- **Requirements covered:** R-OWT-008 (click downloads, loading, error toast), R-OWT-001 (version line), R-OWT-011 (button clause).
- **Decisions made:** the Leader narrowed the page-component consumer adjustment (see above).
- **Final verification:** PASS.

### T-02 — Modal data query and homologation mapper

- **Status:** PASS (attempt 1).
- **Date:** 2026-10-23
- **Effort:** high. These tables are the business rules BI agreed.
- **Review mode:** lens checklist (single reviewer). Task `Review: full`.
- **Skills deviation:** `nestjs-expert` and `tdd` could not load on the Cursor host; the brief carried them in prose.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-high`, Orca `run_704dd2d24af9` / `task_aef90edbee1f` / `ctx_e7a06f540a8b` (retained until PASS, released after). Brief: `T-02-brief.md`, report: `T-02-report.md` (session scratchpad).
- **Files changed** (all under `server/researchindicators/src/domain/entities/result-oicr/`):
  - modified: `repositories/result-oicr.repository.ts` (+ spec), which adds `getWordTemplateData` with 8 parameterized queries;
  - new: `word-template/dto/oicr-word-template-data.dto.ts`;
  - new: `word-template/oicr-word-template.mapper.ts` (+ spec).
- **Implementer verification:**
  - `npm test -- --silent src/domain/entities/result-oicr`: `Tests: 137 passed, 137 total`;
  - eslint: exit 0;
  - build: exit 0.
- **Falsifiers (verbatim, reverted):**
  - Area 16 mapped to its STAR name:
    - the mapper test failed with `- "PISA"` / `+ "Policy, Inclusion and Socio-economic Analysis for Impact and Learning"`;
    - the e2e test failed with `OicrWordTemplateMissingOptionError: OICR template control raContribDropdown has no option "Policy, Inclusion and Socio-economic Analysis for Impact and Learning"`.
  - 202 removed from the regional set: `Expected: "Regional"` / `Received: "Sub-regional"`. The Eastern Africa case (code 14), which differs only in the code, stayed green.
  - Previous handle filled for tag 1: `expect(received).toBeNull()` / `Received: "https://hdl.handle.net/10568/554"`.
- **Not Done / Assumptions (verbatim from the report; no blocker and no owed item, so not a continuation):**
  - "Countries are not filtered by `country_role_id`. Design §3 and the POC `extract.js` both omit it. The modal's `findGeoLocation` does pass `CountryRolesEnum.GEO_LOCATION` (`2`), and role `1` is trainee nationality. This query follows §3. A result that also stores trainee nationalities would put those names in the Countries block."
  - "'First' linked handle, main contact, main project, and tag are the lowest primary key (`ORDER BY treo.id`, `u.result_user_id`, `rc.result_contract_id`, `rt.id`, then `LIMIT 1`). `/modal` uses TypeORM `find` with no `order`, so this is a stable reading of 'first', not a byte match of that find."
  - "A main-project row with an empty `agreement_id` or an empty `description` becomes no value. A present pair is `\"<agreement_id> - <description>\"`."
  - "'If other, please specify' lists custom names of **primary** area 18 only. A contributing area 18 still maps to the dropdown `Other` and does not add a specify row. An empty custom name is a row whose value is none."
- **Leader check on the countries assumption:** a read-only query on the shared test DB (2026-10-23), `SELECT country_role_id, COUNT(*) … FROM result_countries JOIN results … WHERE indicator_id = 5 AND both is_active = 1 GROUP BY country_role_id`, returned `[{"role":2,"n":113,"results":69}]`. Every active OICR country row is GEO_LOCATION today, so the §3 query and the modal agree on live data. Recorded as advisory, not rework.
- **Evidence re-run (Leader, inline, after both workers reported): VERIFIED.**
  - `src/domain/entities/result-oicr`: `Tests: 137 passed, 137 total`.
  - eslint: exit 0. Build: exit 0.
  - Full server suite: `Test Suites: 443 passed, 443 total` · `Tests: 4343 passed, 4343 total`.
  - The T-01 engine files are unchanged (`git diff --stat HEAD` empty).
- **Reviewer:** `STATUS: PASS` (`akili-reviewer`, Claude opus).
  - All 8 queries are parameterized, with `is_active = 1` on every source table.
  - Every homologation row has a test with a literal expected label, and each fixture varies only its discriminating field.
  - The geo rule and the regions/countries format match R-OWT-003 and design §5 step 6.
  - The previous-handle sources match `TempExternalOicrsService.findResultOicrs`.
  - The e2e test runs the T-01 engine and asserts every R-OWT-002 field.
  - "If other" counts primary area 18 only (R-OWT-002).
- **ADVISORY (4R, recorded, non-gating):**
  - RELIABILITY: the repository spec asserts `is_active = 1` once per query, not once per joined table. Deleting `ac.is_active = 1` (or the same filter on `cr`, `cc`, `sn`, `s`, `teo` or `ro_linked`) would stay green. Every filter was confirmed by reading the SQL.
  - RISK: countries and sub-nationals are not filtered on `country_role_id = 2`. Live data is all role 2 today (see the Leader check above).
  - READABILITY: a main project with an `agreement_id` but an empty `description` gives no value, which also drops the id. This is undocumented as a decision.
  - RESILIENCE: the core query uses `INNER JOIN result_oicrs`, so an indicator-5 result with no active `result_oicrs` row would give a document with an empty title and year instead of an error. Not constructible through the save flow.
  - RELIABILITY: "first" means the lowest primary key, while `/modal` uses `find` with no order. The T-08 Dev download covers this (KZ-017).
- **runtime events:** none.
- **spawns:**
  - implementer (Cursor grok-4.7-high): not reported by host, ended complete;
  - reviewer: 16 calls, 107,100 tokens, ended complete.
- **Requirements covered:** R-OWT-002 (table, empty → no value, previous handle only for tags 2/3), R-OWT-003 (all tables, unmapped → none), R-OWT-004 (STAR order).
- **Decisions made:** the countries role filter was accepted per design §3, based on the live-data check above.
- **Forward pointer → T-03 `[advisory-grade]`:** the service could treat a null core data row (no active `result_oicrs`) as an error instead of filling an empty title and year (RESILIENCE advisory above). Advisory only; T-03 must not widen scope for it.
- **Final verification:** PASS.

### T-03 — pre-start (P-22, RB-1)

- **2026-10-23, Leader probe:** `curl` from the Leader's workstation returns `200 112531`. That is not the runtime the premise is about. The Leader has no route to the Dev host: `~/.ssh/config` has no hosts, and `docs/infrastructure.md:66` gives agents no access to deployment hosts.
- **Owner decision (AskUserQuestion):** "I'll run the curl on Dev". T-03 is held until the owner pastes the Dev-host result. T-06 (client) proceeds in parallel.

### T-06 — Guarded download route, legacy redirect and page states

- **Status:** PASS (attempt 1).
- **Date:** 2026-10-23
- **Effort:** medium.
- **Review mode:** lens checklist (single reviewer). Task `Review: full` (auth routing).
- **Skills deviation:** `angular-developer` could not load on the Cursor host; the brief carried it in prose.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-medium`, Orca `run_704dd2d24af9` / `task_b70b3ced1dc8` / `ctx_4095e355828f` (retained until PASS, released after). Brief: `T-06-brief.md`, report: `T-06-report.md` (session scratchpad).
- **Files changed:**
  - `client/research-indicators/src/app/app.routes.ts` (+ spec);
  - `client/research-indicators/src/app/pages/oicr-download/oicr-download.component.ts` (+ spec);
  - the HTML is unchanged: the loading and error markup already existed.
- **Implementer verification:**
  - 2 specs: `Tests: 26 passed, 26 total`;
  - build: exit 0;
  - `npm run lint -- --quiet`: `All files pass linting.`;
  - `tsc -p tsconfig.spec.json`: 945 errors before and after, with identical normalized sets.
- **Falsifiers (verbatim, reverted):**
  - `canMatch` removed:
    - test `requires login on /oicr/download/:resultCode and declares that route before the legacy entry`;
    - red: `Matcher error: received value must not be null nor undefined` / `Received has value: undefined` at `expect(guarded.canMatch).toContain(rolesGuard)`.
  - Navigate on error:
    - test `shows the service error and does not navigate`;
    - red: `Expected number of calls: 0` / `Received number of calls: 1` / `1: ["/result", "STAR-554", "general-information"]`.
- **Not claimed:** the Cognito round trip (requirements D-6). It is owned by T-08 HITL.
- **Evidence re-run (Leader, inline, no worker active): VERIFIED.**
  - 2 specs: `Tests: 26 passed, 26 total`.
  - Full client suite: `Test Suites: 346 passed, 346 total` · `Tests: 8070 passed, 8070 total`, exit 0.
  - `npm run build`: exit 0.
- **Reviewer:** `STATUS: PASS` (`akili-reviewer`, Claude opus).
  - Neither route has children, so `/oicr/download` and `/oicr/download/554` each match only their own route.
  - `isDeclaredUnder` returns true for a route with no children, so `returnUrl` is `/oicr/download/554` (`roles.guard.ts:29-31`, `:82`).
  - The legacy entry stays unguarded and redirects before the guard runs, as D-OWT-10 requires.
  - `snapshot` is correct for both entries: the redirect moves to a different route config, so a new component instance is created.
  - No claim of the Cognito leg.
- **ADVISORY (4R, recorded, non-gating):**
  - RELIABILITY: the route test checks that the guard is configured, not what it does. Two cases using the existing `navigate()` harness in `app.routes.spec.ts:18-35` would pin P-12 as a test: logged out → `/login?returnUrl=%2Foicr%2Fdownload%2F554`; logged in → stays on the link.
  - READABILITY: the loading test asserts `processing() === true` without a prior negative assertion.
  - RESILIENCE: `snapshot` misses a parameter-only change on a reused component. Not reachable today: there are no in-app links to the route.
- **runtime events:** none.
- **spawns:**
  - implementer (Cursor grok-4.7-medium): not reported by host, ended complete;
  - reviewer: 11 calls, 59,341 tokens, ended complete.
- **Requirements covered:**
  - R-OWT-009 (unit-reachable parts: login required by config, auto-download, navigate on success, loading, error without navigation);
  - R-OWT-010 (redirect; missing parameter → error).
- **Final verification:** PASS.

### T-07 — Retire the WASM generation path

- **Status:** PASS (attempt 1).
- **Date:** 2026-10-23
- **Effort:** medium.
- **Review mode:** lens checklist (single reviewer). Task `Review: checklist`.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-medium`, Orca `run_704dd2d24af9` / `task_d9855703ad10` / `ctx_58e01d2df7c2` (retained until PASS, released after). Brief: `T-07-brief.md`, report: `T-07-report.md` (session scratchpad).
- **Files deleted (`git rm`):**
  - `client/research-indicators/src/app/shared/services/go/wasm.service.ts` (+ spec);
  - `client/research-indicators/public/go/{main.go,main.wasm,wasm_exec.js,WASM-DOCX-README.md}`;
  - `client/research-indicators/src/app/shared/interfaces/gets/get-oicr-details.interface.ts`.
- **Files edited:**
  - `angular.json`: `build.options.scripts` → `[]`;
  - `api.service.ts`: `GET_OICRDetails` and its import removed;
  - `api.service.spec.ts`: its case removed;
  - `environment.example.ts`: `filesStorageUrl` and `oicrTemplateName` removed.
- **Greps before deletion** (raw output in the report):
  - P-15: 31 hits. The WASM ones are all in `wasm.service{,.spec}.ts` plus `angular.json:44`; the `OicrDownloadService` hits are the service that stays.
  - `window.Go`: 2 hits, both in `wasm.service.ts`.
  - P-17: 5 lines, all the method and its spec.
  - P-19: 7 hits. The only runtime reader was `wasm.service.ts:35`.
- **Verification grep after** (`grep -rnE "WasmService|wasm_exec|main\.wasm|processDocxWasm|GET_OICRDetails|GetOICRDetails|oicrTemplateName" src angular.json`): only `src/environments/environment.dev.ts:35` and `src/environments/environment.ts:33`, both gitignored. The Leader re-ran it with the same result.
- **Falsifier red:** a stale `import { WasmService } from '@shared/services/go/wasm.service'` failed the build with `✘ [ERROR] TS2307: Cannot find module '@shared/services/go/wasm.service' or its corresponding type declarations.` (exit 1). The import was then removed and the build went green.
- **Implementer verification:**
  - build: exit 0, `NO_GO_FOLDER` in `dist/research-indicators/browser`;
  - spec tsc: 945 errors before and after;
  - lint: exit 0;
  - `api.service.spec.ts`: 244/244.
- **Evidence re-run (Leader, inline, no worker active): VERIFIED.**
  - `npm run build`: exit 0. `find dist/research-indicators` returns no `go` directory and no `*wasm*` under a go path.
  - Full client suite: `Test Suites: 2 failed, 343 passed, 345 total` · `Tests: 8042 passed, 8042 total`.
    - Both failed suites (`get-clarisa-institutions-type.service.spec.ts`, `scroll-top.service.spec.ts`) are `A jest worker process … was terminated by another process: signal=SIGSEGV`: runner crashes with 0 failed tests.
    - Re-run in isolation: `Tests: 10 passed, 10 total`.
    - The suite count went from 346 to 345 (the WASM spec was deleted) and the test count from 8070 to 8042 (the WASM spec's tests and the `GET_OICRDetails` case removed).
- **Reviewer:** `STATUS: PASS` (`akili-reviewer`, Claude opus).
  - A package-wide search found 0 references to any deleted file or symbol. The search excluded `node_modules`, `dist`, `.angular` and `coverage`, and covered `angular.json`, `public/`, `index.html`, `ngsw-config.json`, `nginx.conf`, `Dockerfile` and `jest.config.ts`.
  - `angular.json` changed only in `scripts`; the budgets are unchanged.
  - `GET_OICRDetails` has no reader left.
  - No server file was touched.
  - Unreachable by the reviewer's search: the gitignored env files (deploy note, design §7) and the browser's runtime requests (T-08 HITL).
- **ADVISORY:** none.
- **runtime events:** none.
- **spawns:**
  - implementer (Cursor grok-4.7-medium): not reported by host, ended complete;
  - reviewer: 11 calls, 45,384 tokens, ended complete.
- **Requirements covered:** R-OWT-011 (the code half; the network clause is owned by T-08).
- **Deploy note (R-B-4):** each host's gitignored `environment.ts` / `environment.dev.ts` still declare `filesStorageUrl` and `oicrTemplateName`. Nothing reads them now; drop them on the next refresh from `environment.example.ts`.
- **Final verification:** PASS.
- **Owner decision, revised (2026-10-23):** "comencemos". Build T-03 now. P-22 moves to the T-08 HITL download from the deployed Dev server; a 502 there triggers the Pivot Protocol.
  - The owner asked whether the Leader could run the curl itself. It can only run it from the workstation, where the result is still `200 112531`, not from the Dev runtime.
  - P-22 stays **UNVERIFIED** until T-08. RB-1 stays open, with owner T-08.
- **P-22, owner attestation (2026-10-23):** the owner wrote, verbatim, "no hay problema en el server de dev funciona bien".
  - Recorded as the owner's statement that the Dev server reaches S3. It is not a quoted command output (KZ-002: tick only what the quoted words cover).
  - P-22 is treated as **settled by owner attestation**. The T-08 HITL download from Dev re-confirms it as observed behavior.
  - T-03 dispatched: Orca `task_8fa1e1cfc1b8` / `ctx_3ad0a8aa0363`, Cursor `grok-4.7-high`.

### T-03 — Endpoint, service, configuration and errors

- **Status:** PASS (attempt 1). One done criterion is still open: the Swagger boot check.
- **Date:** 2026-10-23
- **Effort:** high.
- **Review mode:** lens checklist (single reviewer). Task `Review: full`.
- **Skills deviation:** `nestjs-expert`, `api-design-principles` and `error-handling-patterns` could not load on the Cursor host; the brief carried them in prose.
- **P-22:** settled by owner attestation. See the T-03 pre-start block above. The T-08 Dev download re-confirms it.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-high`, Orca `run_704dd2d24af9` / `task_8fa1e1cfc1b8` / `ctx_3ad0a8aa0363` (retained until PASS, released after). Brief: `T-03-brief.md`, report: `T-03-report.md` (session scratchpad).
- **Files changed:**
  - new: `server/researchindicators/src/domain/entities/result-oicr/word-template/oicr-word-template.service.ts` (+ spec);
  - `result-oicr.controller.ts` (+ spec), adding `downloadWordTemplate`;
  - `result-oicr.module.ts`, adding `HttpModule` and the provider;
  - `shared/utils/app-config.util.ts` (+ spec), adding `ARI_OICR_TEMPLATE_URL`;
  - `.env.example`;
  - `result-status-workflow.repository.ts` (+ spec), with `download_url` now in path form.
- **Implementer verification:**
  - `npm test -- --silent src/domain/entities/result-oicr src/domain/entities/result-status-workflow src/domain/tools/clarisa`: `Tests: 621 passed, 621 total`;
  - `app-config.util.spec`: 13/13;
  - build: exit 0;
  - eslint: exit 0.
- **Falsifiers (verbatim, reverted):**
  - Fetch before the portfolio check: `Expected number of calls: 0` / `Received number of calls: 1` / `1: "https://files.example/a.docx", {"responseType": "arraybuffer", "timeout": 10000}`.
  - Module-level cache: the call sequence ended `"portfolio"` where `- "data", - "fetch"` were expected on the second call.
  - `ResponseUtils.format` instead of `StreamableFile`:
    - as written, this did not compile: `TS2740: Type 'ServiceResponseDto<Buffer<ArrayBufferLike>>' is missing the following properties from type 'StreamableFile'`;
    - with a cast added so the suite would load: `Expected constructor: StreamableFile` / `Received constructor: Object`.
- **Static check:** `app.module.ts` JwtMiddleware `exclude` lists `configuration/:key`, `/`, `/admin(.*)`, `/admin/public(.*)`, `/.well-known(.*)`, `/favicon.ico`, `reports/${RESULT_CODE}/pdf` and `${PRMS_CALLBACK_PATH}(.*)`. `word-template` is absent, so the middleware applies. The 401 itself is evidenced only by T-08.
- **Not Done / Assumptions (verbatim from the report; the two "not done" items are Leader- or T-08-owned, and none is a blocker or a Worker-owed item):**
  - "P-22 (Dev-host GET of the template) skipped, deferred to T-08 by the brief."
  - "Swagger boot not run (Leader)."
  - "A fetch that fails with no HTTP status and is not a timeout becomes 502 `Could not fetch the OICR template (network)`, logged as `result_code=<code> upstream_status=network`."
  - "The file name uses the server process local clock (`getFullYear` / `getHours`), not UTC."
  - "Any portfolio other than 2, including a null function result, gets the Portfolio 2-only 400. The log reason is `portfolio_<id>` or `portfolio_missing`."
  - "A whitespace-only URL is treated as missing after `trim`."
- **Evidence re-run (Leader, inline, no worker active): VERIFIED.**
  - Scoped suites plus the app-config spec: `Test Suites: 62 passed, 62 total` · `Tests: 634 passed, 634 total`.
  - eslint: exit 0. Build: exit 0.
  - Full server suite: `Test Suites: 444 passed, 444 total` · `Tests: 4354 passed, 4354 total`.
  - The T-01/T-02 files are unchanged (`git diff --stat HEAD` empty).
- **Swagger boot check (Leader-owned): NOT YET RUN.**
  - Booting the server starts RabbitMQ consumers and cron jobs against shared infrastructure, so the Leader did not boot it unattended. No local server was running (`:3000` and `:3001` returned `000`).
  - It runs when the owner starts the server for the local download test: `GET /swagger-json` must list `/api/results/oicr/word-template/{resultCode}` with no `/v1`.
  - Static evidence until then: the handler has `@Get('word-template/' + RESULT_CODE)` and no `@Version`, under `results/oicr` (P-3).
- **Local env gap:** the owner's local `server/researchindicators/.env` has no `ARI_OICR_TEMPLATE_URL` (`grep -c` gives 0). Without it, a local download answers 500 `OICR template URL is not configured`, which is R-OWT-007 behaving as designed.
- **Reviewer:** `STATUS: PASS` (`akili-reviewer`, Claude opus).
  - The order is proven by a recorded call sequence.
  - All eight §4 messages match exactly.
  - The §9 log lines are present, and the happy path asserts that no warn or error fires.
  - Nothing is cached.
  - The controller reads `resultUtil` first, the route is unversioned, and the Swagger decorators are present.
  - `StreamableFile` passes through `ResponseInterceptor` unwrapped (P-2).
  - The `download_url` path form is asserted.
- **ADVISORY (4R, recorded, non-gating):**
  - RELIABILITY: a URL that answers 200 with a body that is not a zip makes `JSZip.loadAsync` throw a plain `Error`. That gives a generic 500 that the handler does not log. Mapping it to a named, logged 500 would be cheap.
  - RISK: an indicator-5, Portfolio 2 result with no active `result_oicrs` row still produces a document of placeholders. Carried from T-02.
  - READABILITY: the `upstream_status=network` token would read better as `reason=network`.
  - RESILIENCE: the disposition file name uses the server timezone. The client names its own saved file (D-OWT-8).
- **runtime events:** none.
- **spawns:**
  - implementer (Cursor grok-4.7-high): not reported by host, ended complete;
  - reviewer: 15 calls, 92,864 tokens, ended complete.
- **Requirements covered:**
  - R-OWT-001: 200 type and disposition, not an envelope, version line;
  - R-OWT-006: all rows, and the 2025 → no-fetch scenario;
  - R-OWT-007: missing config, no cache;
  - R-OWT-010: `download_url`;
  - NFR-OWT-002.
- **Final verification:** PASS. The Swagger boot check is pending.

#### T-03 — Swagger boot check (Leader, 2026-10-23, the owner's local server)

- **Server:** native, port `:3001`, process cwd `Heavy-DEV/server/researchindicators` (this worktree, HEAD `17750575`).
- `curl http://localhost:3001/swagger-json` → `200`. The word-template path is `/api/results/oicr/word-template/{resultCode}` (no `/v1`). `get`: summary `Download the filled 2026 OICR Word template`, tags `["Results"]`, 200 content `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- **Anonymous** `GET /api/results/oicr/word-template/554` → `401`. This is local evidence for the R-OWT-001 unauthenticated scenario; T-08 repeats it on Dev.
  - `GET /api/v1/…` also returns `401`, because the JWT middleware answers before routing.
  - So the 401 does **not** prove that `/v1` is absent; the Swagger listing does.
- **Owner's first authenticated request (screenshot):** `{description: "InternalServerErrorException", errors: "OICR template URL is not configured", path: "/api/results/oicr/word-template/554", status: 500}`.
  - This is the R-OWT-007 missing-config row, live, with the exact §4 message.
  - The local `.env` has no `ARI_OICR_TEMPLATE_URL` (`grep -c` → 0).
- The Swagger done criterion is now ticked.

#### Owner local download (2026-10-23)

- The owner added the env var, restarted the server, and downloaded from the button. Quote: "si se descargo bien creo que lo pasare a test".
- **Scope of the quote (KZ-002):** it covers that the download from the button succeeds locally. It does **not** cover any T-08 HITL clause: Word opening without a repair prompt, working "+"/dropdowns, visible revisions, the login round trip, the network check, timing, or the Dev download. Those stay open for T-08.
