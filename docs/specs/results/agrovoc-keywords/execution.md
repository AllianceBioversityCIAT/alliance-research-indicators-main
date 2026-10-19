# Execution Log — Results / AGROVOC-backed Keywords

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/results/agrovoc-keywords` (2026-10-agrovoc-keywords, AC-1525) |
| Branch | `AC-1525-Align-result-keywords-to-a-control-list-AGROVOC` |
| Started | 2026-10-19 |
| Leader | Claude Code · `claude-opus-5-5` (T1) |
| Implementer | Cursor CLI · `grok-4.7-*` (T2), dispatched via Orca orchestration (standing owner routing: "Grok implements, Claude reviews") |
| Reviewer | Claude Code `akili-reviewer` wrapper → `opus` (T3), read-only (author ≠ auditor on both axes) |
| Approval mode | Spec says `standard`; owner's standing direction is to keep going task to task and stop only on `FATAL_FAIL` / HALT / Pivot / budget tripwire. Visual HITL (T-05) and commits of UI changes still wait for the owner's eyes |
| Budget (design §13) | 5 tasks · ~700 LOC · 7 review rounds |
| Persona drift check | `akili` CLI not installed on this machine — `akili doctor --agents` could not run; not compared against templates this run |

## 2. Task Execution History

### T-03 — Cancellable GET + API method + interceptor exclusion (client) — IN PROGRESS

- **Date:** 2026-10-19 · **Skills:** `angular-developer`, `error-handling-patterns` (task defaults, unchanged) · **Effort:** attempt 1 `grok-4.7-high`; attempt 2 bumped to `grok-4.7-xhigh` (rework rule)
- **Orca:** run `run_a18f8e8bbdd2`, task `task_fd02933e6a25`

#### Attempt 1 — FAIL

- **Implementer:** Cursor / `grok-4.7-high` · dispatch `ctx_044601d143e5` (terminal `term_7be7a3f3-…`)
- **runtime events:** spawn failure ×1 (first dispatch `ctx_4990b2af3ab8`: prompt pasted into Cursor but never submitted, Orca `stage=dispatch_input`, status `failed`) → rung 1 (retry once immediately via `worker-start --retry-of`); stale worker stopped + released
- **Files changed:** `client/research-indicators/src/app/shared/services/to-promise.service.ts`, `…/to-promise.service.spec.ts`, `…/services/api.service.ts`, `…/interfaces/agrovoc-term.interface.ts` (new), `…/interceptors/http-error.interceptor.ts`, `…/http-error.interceptor.spec.ts`
- **Implementer verification (reported):**
  - `npm test -- --silent --coverage=false` on to-promise, http-error, api.service, impersonation, pool-funding-alignment, mock-services specs → 6 suites, 544 passed (`--coverage=false` declared: targeted runs with `collectCoverage` exit 1 on project floors)
  - `npm run lint -- --quiet` → all pass · `npm run build` → exit 0
  - `tsc -p tsconfig.spec.json` grep for the 2 touched specs: baseline 3 / after 3; TS1005 0
  - Red run (each reverted): (1) `from(this.TP(http.get))` → `expect(request.cancelled).toBe(true)` Expected true, Received false (`to-promise.service.spec.ts:458`); (2) drop `!isAgrovocSearchError` → "Expected number of calls 0, Received 1" (`http-error.interceptor.spec.ts:609`); (3) `isAgrovocSearchError = error.status === 502` → control `toHaveBeenCalled` Expected >= 1, Received 0 (`:634`)
  - Not Done / Assumptions (verbatim): "getObservable does not arm loadingTrigger; apiServiceMock was not extended because no spec calls GET_AgrovocSearch$." — assumptions only, no owed item → not a continuation
- **Evidence re-run (non-author):** deferred — server worker T-01 active in the same checkout (concurrency rule); to run before closure
- **Reviewer** (`akili-reviewer`, opus): first verdict `PASS` with ADVISORY #1 (merge-timer). Leader confirmed the mechanism by reading `http-error.interceptor.ts:55-67` and asked the Reviewer to re-adjudicate it against design §9/§5. Revised verdict **`STATUS: FAIL`** (verbatim):

  > 1. **Discovered Issue:** `getObservable` (`to-promise.service.ts:147-166` in the diff) keeps its subscription open after a response arrives. `httpErrorInterceptor` returns `merge(timeoutCheck, next(req))` (`http-error.interceptor.ts:56-67`), and `merge` only completes when both sources do. So after a fast 200 the `timer(5000)` stays armed, and about 5 s later it fires `api.saveErrors(createErrorObj('pending', 'Request is taking longer than 5 seconds to respond'))`. `get` never had this problem: `TP` wraps the call in `firstValueFrom`, which unsubscribes on the first value and tears the timer down. The diff drops that behaviour without saying so. (Reached by reading, not run.) Design §5 tells T-04 to call `GET_AgrovocSearch$` inside `switchMap` with no `take(1)` … 5 s later a false "pending" report goes to the error collector on almost every search. T-03 owns it: the only place to fix it without a consumer workaround is the primitive this task adds.
  > **Violated Rule:** `design.md` §9 ("will also fire for **slow** AGROVOC calls … requests cancelled before 5 s do not log"), read with the §5 Search-stream row (`switchMap`, no `take`) and the §5 Cancellation row ("the interceptor's `merge(timer, next)` (P-11) is torn down with it"). DD-5 justifies `getObservable` only as an abortable `TP`, not as a change in completion. (§2.2's shape clause not cited.)
  > **Remediation Suggestion:** add `take(1)` in `getObservable` before `map`. Required test in `to-promise.service.spec.ts`, new `describe` with the real interceptor (`provideHttpClient(withInterceptors([httpErrorInterceptor]))` + `provideHttpClientTesting()`; mock `ApiService.saveErrors`, `ActionsService`, `CacheService`, `Router`, `ImpersonationService`): (a) fakeAsync, subscribe `{next, complete}`, flush, `tick(5000)` → `complete` called and `saveErrors` never called with `objectContaining({ status: 'pending' })`; (b) positive control: no flush, `tick(5000)` → `saveErrors` called with `objectContaining({ status: 'pending' })`, then flush. Falsifier: remove `take(1)` → (a) red on the `pending` assertion. Existing cancellation test stays green. Extend design §10 / T-03 tests to record the case.

- **ADVISORY (attempt 1, labelled advisory):** RELIABILITY `catchError` spreads `HttpErrorResponse` into the envelope (inherited from `TP`) · READABILITY duplicated header builder between `get`/`getObservable` · RISK `includes('tools/agrovoc')` covers future `tools/agrovoc/*` routes (intended, DD-7) · `loadingTrigger` silently ignored by `getObservable` (JSDoc note suggested)
- **Decisions made:**
  - Leader path correction in the brief: Consumers' `shared/testing/mock-services.mock.ts` is actually `src/app/testing/mock-services.mock.ts`
  - Execute-time spec edit (no change of requirement meaning): `design.md` §10 row `to-promise.service.spec.ts` amended 2026-10-19 to name the fast-call/no-pending-log case that §9 already states. Carried as a named conformance check in the attempt-2 Reviewer brief and the next task's


### T-01 — AGROVOC config, mapper and service (server) — PASS

- **Final status:** PASS (attempt 1) · **Date:** 2026-10-19
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd` (task defaults, unchanged) · **Effort:** `grok-4.7-high` (task is M; held — well-specified, additive)
- **Orca:** run `run_a18f8e8bbdd2`, task `task_546cb2b670cf`, dispatch `ctx_074c95e402ac` (released after PASS)
- **Attempts:** 1
- **Files changed:** `server/researchindicators/src/domain/shared/utils/app-config.util.ts`, `…/app-config.util.spec.ts`, `server/researchindicators/.env.example`, `src/domain/tools/agrovoc/dto/agrovoc-term.dto.ts`, `…/agrovoc-terms.mapper.ts`, `…/agrovoc-terms.mapper.spec.ts`, `…/agrovoc.service.ts`, `…/agrovoc.service.spec.ts`, `…/__fixtures__/training-results.json`, `…/__fixtures__/bea-25-concepts.json`, `…/__fixtures__/README.md`. (The worker also wrote its report to `docs/specs/results/agrovoc-keywords/t-01-implementer-report.md`; the Leader moved it out of the spec folder to the session scratchpad — not part of the change.)
- **runtime events:** none
- **Implementer verification (reported):** `npm test -- --silent src/domain/tools/agrovoc` → 2 suites / 14 tests PASS; with `app-config.util.spec.ts` → 3 suites / 27 tests PASS · `npx eslint src/domain/tools/agrovoc src/domain/shared/utils/app-config.util.ts` → exit 0 · `npm run build` → exit 0 · `git status` → `.env` not listed; `.env.example:91` = `ARI_AGROVOC_URL=https://agrovoc.fao.org/`
- **Declared scope limits (KZ-017):** no live AGROVOC call (`HttpService.get` stubbed); no e2e / full server suite; the NEVER test does not go red if the timeout is *shorter* than 15 s (sentinel at 15 001 ms); eslint does not inspect `.env.example`
- **Red run (verbatim, each reverted):**
  - (b) rank swap (exact → 3, rest → 0), test `mapAgrovocTerms › ranks an exact label first and collapses synonym duplicates`: `Expected: "training" / Received: "e-learning"` at `expect(terms[0].label).toBe('training');` (`agrovoc-terms.mapper.spec.ts:13`)
  - (c) `catchError` → `of([])`, test `AgrovocService › maps an upstream 503 to BadGatewayException and logs the query`: `Received promise resolved instead of rejected / Resolved to value: []` at `await expect(service.search('bea')).rejects.toThrow(BadGatewayException);` (`agrovoc.service.spec.ts:100`). A first attempt failed at compile — discarded, not counted
  - (d) `timeout(SEARCH_TIMEOUT_MS)` deleted, test `AgrovocService › maps a call that never answers to BadGatewayException`: `Expected constructor: BadGatewayException / Received constructor: Error / Received message: "upstream still pending after 15s"` — assertion `agrovoc.service.spec.ts:127`; Expected/Received output, not a Jest timeout
- **Fixture provenance:** captured 2026-10-19 with `curl -sS 'https://agrovoc.fao.org/browse/rest/v1/search/?query=*training*&lang=en'` (first try reset/503; retry 200 in 11.6 s, 18 rows, all kept, equal to captured `results`; both `skill training` rows and both `e-learning` rows — `online training`, `Web-based training` — present) and `…?query=*bea*&lang=en` (200 in 0.33 s, 200 rows, 139 distinct uri; `bea-25-concepts.json` = prefix up to 25 distinct uri, 28 rows). Settles P-5 against today's payload
- **Not Done / Assumptions (verbatim, assumptions only — no owed item):** "`AgrovocModule`, el controller y la ruta no se crearon: T-01 no los incluye." · "El log usa `LoggerUtil._error` / `_warn` (la API de la clase) con `JSON.stringify({ query, upstreamStatus })`. Los tests espían `Logger.prototype.error` / `warn`, que es lo que esos métodos llaman." · "Se valida el query antes que el host: un query corto responde 400 aunque el host esté vacío." · "Tras quitar `*`, se hace un segundo `trim`."
- **Issues encountered / lookup notes:** the worker reports that the exemplar `prms-normalizer.service.ts:209-226` is a status `switch`, not a `timeout`+`catchError` pipe (that pipe lives in `BaseApi.handleError`, banned by P-9); the service calls `HttpService` directly. Also: `.agents/implementer.md` still says the CodeGraph index lives in `server/researchindicators/.codegraph/`; root `CLAUDE.md` says repo root (correct) — persona drift to fix at archive
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** from `server/researchindicators`, after both workers had reported: `npm test -- --silent src/domain/tools/agrovoc src/domain/shared/utils/app-config.util.spec.ts` → `Test Suites: 3 passed, 3 total` / `Tests: 27 passed, 27 total` · `npx eslint …` → exit 0 · `npm run build` → exit 0
- **Reviewer** (`akili-reviewer`, opus, attempt 1): **`STATUS: PASS`** — "The T-01 diff meets every clause of `tasks.md` §T-01, R-AGV-001, the four service-level scenarios of R-AGV-002, NFR-AGV-001/003, and design §4/§5/DD-2..DD-4. I found nothing that violates the spec." Checked: mapper rules 1–5, URL normalization both ways with exact `toHaveBeenCalledWith`, params, `timeout(15_000)`, every failure → `BadGatewayException` (never empty 200), 503/400 with no call, single log per failure, AppConfig getter + `.env.example`, all three Disqualifier clauses (fixtures in AGROVOC's matched-label order, i.e. captured; every call-asserting test asserts `get` was called; NEVER test guarded by 1 s Jest timeout + sentinel). Design §10 amendment: client-only, no conflict
- **ADVISORY (labelled advisory, not gating):** RELIABILITY query validated before host (empty host + `query=be` → 400 not 503; spec sets no order) · RELIABILITY malformed 200 body logs `upstreamStatus: 200` — consider `'malformed'` · RESILIENCE NEVER test cannot detect a timeout below 15 s; a still-pending-at-14 999 ms assertion would close it · READABILITY deprecated `throwError(value)` form in spec · RISK rank tier 2 splits on whitespace only, so `learn` does not word-prefix `e-learning` (matches design §5's literal "some word of label")
- **spawns:** Implementer Cursor/grok-4.7-high — not reported by host (worker counts not given), ended complete · Reviewer akili-reviewer/opus 11 tool calls, 67 509 tokens, ended complete
- **Requirements covered:** R-AGV-001 (both scenarios, AC.1, AC.2) · R-AGV-002 *Matches found*, *No matches*, *Upstream failure*, *Query too short* (service level) · NFR-AGV-001 · NFR-AGV-003 (logging)
- **Final verification:** VERIFIED (above)
- **Gate:** auto-continue per owner's standing direction (stop only on FATAL_FAIL / HALT / Pivot / tripwire)
