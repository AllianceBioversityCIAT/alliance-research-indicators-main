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
