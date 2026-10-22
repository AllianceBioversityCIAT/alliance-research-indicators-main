# Execution Log — TIP Integration / One result per handle, one version per year

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/tip-prms-phase-2/tip-versioning` (AC-1761 phase 2, family child 2) |
| Leader | Claude Opus 5.5 (session) |
| Implementer | Grok `grok-4.7-high` via Cursor CLI (Orca `/orchestration`) — standing split: Grok implements, Claude reviews |
| Reviewer | Claude `akili-reviewer` wrapper (fresh context, different weights from the Implementer) |
| Mode | Spec `gated`; owner standing rule for routine progress: continue task to task, stop only on HALT / FATAL_FAIL / pivot / budget tripwire |
| Approval | `requirements.md` reads "re-approval pending at the design gate" and `design.md` reads "draft"; the owner invoked `/akili-execute` on 2026-10-22 after the specify commit `ed87cf37` — recorded as the go-ahead |
| Budget | 8 tasks · ~1,600 LOC · 11 review rounds (design §14) |
| Started | 2026-10-22 |

Every task is in the server package, so tasks run one at a time (root `CLAUDE.md` §4.3).

## Task Execution History

Orca run `run_8e754ab6eadc`.

### T-01 — Staging is written completely before it is read — PASS

- **Date:** 2026-10-22 · **Attempts:** 1 · **Effort:** medium · **Skills:** `nestjs-expert`, `tdd` (task default)
- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_5ca108b25fcb` / `ctx_a7d21db870b1` (fresh worker). Brief: scratchpad `t01-brief.md`.
- **Attempt 1:**
  - **Files changed:** `src/domain/tools/tip-integration/tip-integration.service.ts` — `saveTemporalData` awaits each page's saves with `Promise.all` over that page, each save catches its own error (logged `error`, counted 1), returns `Promise<number>`; `getKnowledgeProductsByYear` sums the count over years and logs `TIP run summary: staging failures N, created …, updated …, error …` before `update`/`endSync`. `tip-integration.service.spec.ts` — deferred-save order test; rejected-save test (`staging failures 1`, run continues, `endSync(1)`); `beforeEach` resets the staging `save` mock.
  - **Falsifier** (`forEach(async …)` restored) → `npx jest src/domain/tools/tip-integration/tip-integration.service.spec.ts -t "should read staging only after every deferred staging save resolves" --silent`: `expect(jest.fn()).not.toHaveBeenCalled()` · `Expected number of calls: 0` · `Received number of calls: 1` at spec `:522` (`expect(prmsRepository.findTemporalResults).not.toHaveBeenCalled()`). Order assertion, not a timeout. Reverted.
  - **Implementer verification:** `npx jest src/domain/tools/tip-integration --silent` → 5/5 suites, 72/72; `npx eslint src/domain/tools/tip-integration` 0; `npx tsc --noEmit -p tsconfig.json` 0.
  - **Evidence re-run (Leader-inline):** VERIFIED — same three commands: 5/5, 72/72; eslint 0; tsc 0.
  - **Reviewer (`akili-reviewer`, Claude Opus):** PASS — per-page `Promise.all` is DD-6's shape (not the rejected whole-run form); a rejected save never rejects the page; deferred test discriminates on order (falsifier red at `:522`); per-result loop untouched; missing `skipped` accepted (belongs to T-05).
- **Not Done / Assumptions (Implementer, verbatim excerpt; no owed item):** "La espera es `Promise.all` por página." · "El diseño §9 también nombra \"skipped\"; `CounterResults` no tiene ese contador y contarlo vive en el loop por resultado, fuera de T-01. La línea no inventa un skipped."
- **Forward pointers → T-05:** add `skipped` to the `TIP run summary` line (design §9); consider logging `stagingFailures` in the `catch` too (advisory below).
- **ADVISORY:** reliability — the summary line is written only on the success path; a page-2 TIP error after a page-1 failed save never logs the count (diagnostics only, run already marked failed) · readability — the `mockReset()` in `beforeEach` deserves a one-line reason · resilience — up to 50 concurrent saves per page, unchanged from before.
- **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer 7 calls, 43596 tokens, ended complete.
- **Requirements covered:** R-TVR-005.
- **Decisions made:** none beyond the task.
- **Final verification:** VERIFIED (above). Continue gate: auto-approved (owner standing rule).

### T-02 — A TIP run is refused while another is in progress — PASS

- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_42b90da3463c` / `ctx_1363f1b3be2a` (fresh worker, effort medium, skills `nestjs-expert`, `error-handling-patterns`, `tdd` — task default). Brief: scratchpad `t02-brief.md`. Exemplar: `sync-process-log-stale.service.ts`. Brief asks the worker to reconcile design §4 (async=false caller sees the refusal) with the task's "does not throw `'Error saving temporal data'`", or stop as a blocker.
- **Attempt 1, spawn 1 — blocker (no code written).** Report (scratchpad `report-T02.md`, verbatim excerpt): "The two readings the brief named cannot both hold against `tip-integration.controller.ts` `syncIprData`" — with `async=false` the controller's `.then` always formats HTTP 200 "IPR data synced successfully" for any resolved value; the only error path is a rejected promise. So "log `warn` and return" (§5 step 1, task Tests) makes the `PATCH` caller see success, contradicting §4 ("the `PATCH` caller sees the refusal through the existing error path"); throwing satisfies §4 but contradicts §5's "return". Controller change is outside scope (§4 "No endpoint change").
- **Leader adjudication:** confirmed against `tip-integration.controller.ts:90-115` — a spec tension between design §4 and §5 step 1 / the task's Tests line, not an implementation failure. No attempt consumed. Task `[~]`; worker retained (`worker-retain`). Presented to the owner as a one-line amendment.
- **Owner decision (2026-10-22, AskUserQuestion):** "Error 409 (Recommended)" — refusal rejects with `ConflictException` (409) before the `try`; cron/async calls log it.
- **Execute-time spec edits (decisions made):** `design.md` §4 (refusal = `warn` + `ConflictException` 409; `async=false` caller gets 409, async/RMQ log only) and §5 step 1 ("log `warn` and return" → "reject with `ConflictException` (409) … no `sync_process_log` row is created"); `tasks.md` T-02 Tests line. Reason: §4 vs §5 tension. Sweep: `grep -rn "log \`warn\` and return\|does not throw \`'Error saving"` over the spec folder → only historical lines in this log. Carried to the T-02 Reviewer and to T-03's as named conformance checks.
- **Spawn 2 (same retained worker, resumed with the decision):** see below.
  - Orca `task_18fa5aed4e86` / `ctx_67ca97c3e4dd` (same terminal `term_7382d9e0…`). Brief: scratchpad `t02-resume-brief.md`.
- **Spawn 2 (resume) — files changed:** `sync-process-log.service.ts` — `isInProgressYoungerThan(process, hours)` (`findOne` where `process_name`, `process_status = IN_PROGRESS`, `created_at: MoreThan(cutoff)`) and `markFailed(id)` (writes `process_status = FAILED` + audit; `update()` never writes that column); `sync-process-log.service.spec.ts` — asserts the built `where` (process, status, `moreThan`, cutoff 5.9–6.1 h) and evaluates that same `where` on 1 h / 7 h / `FAILED` / `COMPLETED` rows; `tip-integration.service.ts` — guard before `executionCode` and the `try` (`warn` + `ConflictException('TIP sync already in progress')`), `catch` calls `markFailed` when a row exists (its own failure logged, original error still thrown); `tip-integration.service.spec.ts` — 409 path (no `initiateSync`, no `markFailed`, no `deleteTemporalResults`), failing-run `markFailed(1)`, `initiateSync` throws → no `markFailed`.
- **Falsifiers (verbatim excerpts):** (a) `created_at: MoreThan(cutoff)` removed → `-t "allows when an IN_PROGRESS row is 7 h old"`: `Expected: false` / `Received: true` at spec `:268`. Reverted. (b) `markFailed` removed from the `catch` → `-t "should throw BadRequestException and clean temporal data when TIP API request fails"`: `expect(jest.fn()).toHaveBeenCalledWith(...expected)` · `Expected: 1` · `Number of calls: 0` at `:580`. Reverted.
- **Consumers:** `grep -rn "SyncProcessLogService" src --include='*.spec.ts'` → 4 files (`tip-integration.service.spec.ts`, `prms.opensearch.service.spec.ts`, `sync-process-log.controller.spec.ts`, `sync-process-log.service.spec.ts`), all green.
- **Implementer verification:** `npx jest src/domain/entities/sync-process-log src/domain/tools/tip-integration --silent` → 8/8, 94/94; `npx jest src/domain/tools/open-search/prms --silent` → 13/13, 110/110; eslint 0; tsc 0.
- **Evidence re-run (Leader-inline):** VERIFIED — same four commands, same results.
- **Reviewer (`akili-reviewer`, Claude Opus):** PASS — built `where` asserted directly (KZ-001 met; the row evaluator is fed only the real `where`); guard before the `try` so no row and no staging cleanup on refusal; `markFailed` cannot mask the original error; amended §4/§5 step 1/Tests line met; per-result loop untouched.
- **Not Done / Assumptions (verbatim excerpt; no owed item):** "MySQL execution of the query remains T-07." · "If `markFailed` itself throws, the error is logged and the original `BadRequestException('Error saving temporal data')` is still thrown. If `initiateSync` throws, there is no id and `markFailed` is not called."
- **ADVISORY:** **reliability — `async=true` refusal is an unhandled rejection:** `tip-integration.controller.ts:95-98` fires `getKnowledgeProductsByYear` without `await`/`.catch`, and nothing in `src` handles `unhandledRejection`; under Node's default (`throw` since 15) that can terminate the process. Pre-existing for any failed async run, but the guard adds an easy trigger (`PATCH …?async=true` during a run < 6 h old). Not measured on this deployment's Node. Raised to the owner at this gate · resilience — a DB error in the guard read reaches the caller unwrapped (outside the `try`, as designed) · readability — `6` h is an inline literal; a named constant would tie it to DD-10 · risk — check and `initiateSync` not atomic (accepted in §5 step 1).
- **Forward pointer → T-07:** run the guard query on MySQL (task already lists it).
- **spawns:** implementer (Grok/Cursor) spawn 1 not reported by host, ended fail (blocker, spec tension); spawn 2 not reported by host, ended complete; reviewer 8 calls, 57865 tokens, ended complete.
- **Requirements covered:** R-TVR-001 (*New handle* BUT clause — overlap guard).
- **Final status:** PASS on attempt 1 · **Final verification:** VERIFIED. Continue gate: auto-approved (owner standing rule); the async advisory reported to the owner.
