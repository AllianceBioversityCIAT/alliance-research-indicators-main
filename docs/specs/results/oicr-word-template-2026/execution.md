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
