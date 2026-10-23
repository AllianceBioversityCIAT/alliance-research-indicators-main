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

### T-03 — `saveAllSections` per-call `target`, outcome return, row-only compensation — PASS

- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_78fa430752de` / `ctx_22fd311bb60c` (fresh worker, **effort high** — shared save path used by PRMS; skills `nestjs-expert`, `tdd` — task default). Brief: scratchpad `t03-brief.md`. Consumers widened by the Leader's pre-run grep: `results.service.ts`/spec also reference these symbols. Named conformance check carried: T-02's execute-time edits to design §4 / §5 step 1 (no expected overlap).
- **Date:** 2026-10-22/23 · **Attempts:** 1 · **Effort:** high · **Skills:** `nestjs-expert`, `tdd`
- **Attempt 1 — files changed:** `src/domain/shared/services/save-all-sections.service.ts` — `ExtraData.target` (`SaveSectionTarget`) read, never written back; with `target`: lookup by `result_id` only when `target.resultId != null`, `isAppliedVersion = target.isSnapshot` on create and update, create with `target.officialCode` (no `newOfficialCode`); every completed call returns `SaveAllSectionsResult { resultId, outcome }`; failed create with `compensateRowOnly` → `deleteResultRowById`, otherwise `deleteFullResultById`; failed update not compensated. `save-all-sections.service.spec.ts` — new tests only. `src/domain/shared/utils/query.service.ts` (+ spec) — `deleteResultRowById(id)` = `SELECT full_delete_result_version(?)` for that id, no family resolution. `tip-integration.service.spec.ts` — `saveAllSections` mock now returns `{ resultId, outcome }` (TS2345 otherwise); no `expect` changed.
- **Falsifiers (verbatim excerpts):** (a) `target.isSnapshot` on create only → `-t "updates an existing row with target.isSnapshot"`: `Expected: 500, true` / `Received: 500, false` at spec `:1073` (fixture `is_version_applied = false` vs `isSnapshot: true` — disqualifier avoided). Reverted. (b) row-only branch replaced with `deleteFullResultById` → `-t "deletes only the created row when compensateRowOnly"`: `deleteResultRowById` `Expected: 42` · `Number of calls: 0` at `:1211`. Reverted.
- **Consumers:** `grep -rln "saveAllSections\|bulkSaveAllSections\|deleteFullResultById" src test --include='*.ts'` → 10 files (TIP service + spec, PRMS service + spec, query service + spec, save service + spec, results service + spec); production callers stay TIP (direct) and PRMS (bulk); `results.service.ts` matches `deleteFullResultById` only.
- **K-019:** existing expectations in the save and PRMS specs untouched; only the TIP spec mock body changed (counters kept, return added).
- **Implementer verification:** jest shared 47/383, PRMS 13/110, results 10/326, tip-integration 5/74; eslint 0; tsc 0 (first run TS2345 at `tip-integration.service.spec.ts(931,9)`, fixed by the mock return); `npm run build` 0.
- **Evidence re-run (Leader-inline):** VERIFIED — same seven commands, same numbers, build 0.
- **Review mode:** parallel lens reviewers (data-loss surface: compensation deletes) — 2 lenses.
- **Reviewer A (`akili-reviewer`, Claude Opus; conformance + reliability + risk):** PASS — `full_delete_result_version` (migration `1789583572262`) filters every DELETE on the one `result_id`, so `deleteResultRowById` deletes exactly one row; compensation only on the create branch; no-`target` path behaviorally identical (lookup, code chain, `isAppliedVersion` fallback, compensation, `resultSaved`, counters); outcome correct on every branch; update keeps `result_id`.
- **Reviewer B (`akili-reviewer`, Claude Opus; conformance + readability + resilience, test-evidence focus):** PASS — every new test checked against its reverting change (JD-1, create-uses-C with `newOfficialCode` mocked to 9999, `resultId` skips generic lookup, all four outcomes, row-only both ways, `query.service.spec` 42/43 fixture); TIP spec mock edit weakens no assertion; `target` never written back.
- **Not Done / Assumptions (verbatim excerpt; no owed item):** "a caller that puts `target` on a shared `extraData` object will apply that same target to every `bulkSaveAllSections` item. The service does not clone `extraData`. The design puts the per-call copy on the caller (T-05)." · "`deleteResultRowById` does not pre-check that the id exists."
- **Forward pointers → T-05 (named checks):** (1) every live create passes `compensateRowOnly: true` — own falsifier (without it a failed live create family-deletes the versions just written); (2) per-call copy of `extraData` per save; (3) wrap each handle so a compensation rejection cannot abort the run; (4) act only on `created`/`updated` outcomes — an `error` result can carry an id that compensation already deleted. **→ T-07:** prove on MySQL that `full_delete_result_version(id)` deletes one row (unit tests only see the SQL string, KZ-017).
- **ADVISORY:** risk/resilience — after a compensated create, `resultId` names the deleted row (return `null` or document) · a failed compensation rejects with no outcome, no counter, and skips `clearSystemUser` (pre-existing) · stale `target.resultId` silently creates a new row with `C` — consider a `warn` · readability — `outcomeFor(null)` → `'error'` deserves a comment; "no `resultId` means create" comment; the `skipped` test mixes `prmsExtraData` with `target`.
- **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer A 15 calls, 79631 tokens, ended complete; reviewer B 11 calls, 79836 tokens, ended complete.
- **Requirements covered:** R-TVR-002 (*Version exists*, unit half; MySQL in T-07); NFR-TVR-001 (no-`target` path).
- **Decisions made:** parallel lens review (data-loss surface), recorded per Step 2.3.
- **Final status:** PASS on attempt 1 · **Final verification:** VERIFIED. Continue gate: auto-approved (owner standing rule).

### T-04 — `TipHandleRepository.resolve` — PASS

- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_21c95cad6a96` / `ctx_742cac2d446e` (fresh worker, effort medium, skills `nestjs-expert`, `tdd` — task default). Brief: scratchpad `t04-brief.md`. Exemplar: `repository/tip-integration.repository.ts`. Leader narrowing: return shape usable by T-05 (chosen live, unpicked live rows, versions by year).
- **Date:** 2026-10-23 · **Attempts:** 1 · **Effort:** medium · **Skills:** `nestjs-expert`, `tdd`
- **Attempt 1 — files changed:** `src/domain/tools/tip-integration/repository/tip-handle.repository.ts` (new) — `resolve(handle): Promise<TipHandleResolution>` = `{ live: TipHandleRow | null; otherLive; versions: Record<year, TipHandleRow>; otherVersions }`, row = `result_id, result_official_code, report_year_id, is_snapshot, is_active`; one query `WHERE r.platform_code = 'TIP' AND r.public_link = ?` (no `r.is_active` predicate), `EXISTS` on active `link_results.other_result_id` for the survivor rule; live pick = active first, then exactly-one-linked, else highest `report_year_id`, tie highest `result_id`; duplicate-year versions = active first, then highest `result_id`. `tip-handle.repository.spec.ts` (new). `tip-integration.module.ts` — provider + export.
- **Falsifiers (verbatim excerpts):** (1) `r.platform_code = 'TIP'` removed → `Expected substring: "r.platform_code = 'TIP'"` · `Received string: "WHERE r.public_link = ?"` at spec `:65`. Reverted. (2) `AND r.is_active = 1` added to the outer WHERE → `Expected pattern: not /is_active/` at `:67`. Reverted.
- **Implementer verification:** `npx jest src/domain/tools/tip-integration --silent` → 6/6, 83/83; eslint 0; tsc 0.
- **Evidence re-run (Leader-inline):** VERIFIED — same three commands, same results.
- **Reviewer (`akili-reviewer`, Claude Opus):** PASS — placeholder use safe, no collation hazard, `EXISTS` matches §3.2, platform filter on `results` for both lists, live/versions split by `is_snapshot` (disjoint), survivor rule incl. tie-break, return shape fits T-05 steps 5.2–5.3; T-02 amendments untouched (last carry of that edit).
- **Not Done / Assumptions (verbatim excerpt; no owed item — MySQL proof is T-07 by design):** "El unitario solo ve el SQL que arma el mock. No demuestra que MySQL excluya una fila STAR con el mismo `public_link` o el mismo código. Esa prueba es T-07." · "«None or both» de §3.2 se generalizó a «el número de filas vinculadas no es exactamente 1»" · "Si ninguna viva está activa, la regla de superviviente corre sobre las inactivas (DD-9)".
- **Forward pointers → T-05:** use `live?.result_official_code` / `versions[Y].result_id`; `warn` on `otherLive` and `otherVersions`. **→ T-07:** the STAR-same-code red on MySQL; assert `is_linked` on a really linked row (driver value shape); count `platform_code = 'TIP' AND is_snapshot IS NULL` (NULL is read as live).
- **ADVISORY:** reliability — nullable `is_snapshot`: `NULL` → live (document in TSDoc; count in T-07) · readability — with ≥3 live rows and ≥2 linked, pick is highest year over the whole pool (locked by spec `:183-212`; §3.2 silent) — add a TSDoc line · reliability — `asFlag` accepts `true`/`1`/`'1'` only.
- **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer 11 calls, 52820 tokens, ended complete.
- **Requirements covered:** R-TVR-001 *Equal codes across platforms* (unit half; MySQL in T-07).
- **Decisions made:** none beyond the task.
- **Final status:** PASS on attempt 1 · **Final verification:** VERIFIED. Run paused here at the owner's request ("cuando termines esta tarea actual paramos y seguimos mañana").

## Session pause — 2026-10-23

- Done: T-01 `f07c181e`, T-02 `90569290`, T-03 `0736f851`, T-04 (this commit). All unpushed.
- Review rounds used: 5 of 11 (T-03 ran two parallel lens reviewers).
- Next: schedule RB-3 (async `.catch`, owner-approved scope change) as a task, then T-05 (depends on T-01..T-04, all done). T-06 needs the VPN for the Dev dump.

## Owner decision — async sync unhandled rejection (2026-10-22)

- **Context:** T-02 Reviewer advisory — `tip-integration.controller.ts:95-98` fires `getKnowledgeProductsByYear` without `await`/`.catch` when `async=true`; T-02's 409 refusal (and any failed run) becomes an unhandled rejection that can terminate the process. Not measured on this deployment's Node.
- **Owner answer (verbatim):** "la 1 pero solo dejalo docuemntado magnana lo seguimos" — option 1 = add the fix in this spec.
- **Scope change:** approved by the owner. Controller change: add a `.catch` on the fire-and-forget call that logs the error. **Not implemented yet** — recorded as `tasks.md` RB-3; schedule it as a task at the start of the next session (before or alongside T-05).
