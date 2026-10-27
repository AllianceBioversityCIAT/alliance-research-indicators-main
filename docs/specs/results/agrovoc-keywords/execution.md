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

### T-03 — Cancellable GET + API method + interceptor exclusion (client) — PASS (attempt 2)

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
  - Execute-time spec edit (no change of requirement meaning): `design.md` §10 row `to-promise.service.spec.ts` amended 2026-10-19 to name the fast-call/no-pending-log case that §9 already states. Carried as a named conformance check in the attempt-2 Reviewer brief and the next task's (T-04)

#### Attempt 2 — PASS

- **Implementer:** same Cursor worker (`term_7be7a3f3-…`), new dispatch `ctx_550bb0377028` (task `task_60585409f1ad`); kept alive through the FAIL per owner rule (worker holds the investigation). Effort bump to xhigh given **in-brief only** — a reused Orca terminal cannot change `--model`, so the model stayed `grok-4.7-high`
- **Feedback passed:** the Reviewer FAIL report verbatim + attempt history ("attempt 1 built `getObservable` without completing after the first value — do not repeat that")
- **Files changed:** `client/research-indicators/src/app/shared/services/to-promise.service.ts` (`take(1)` before `map`; JSDoc that `loadingTrigger` is ignored), `…/to-promise.service.spec.ts` (new `describe` running the real `httpErrorInterceptor`)
- **runtime events:** none
- **Implementer verification (reported):** `npm test -- --silent --coverage=false` on to-promise, http-error, api.service → 3 suites, 333 passed (incl. the existing cancellation test) · lint clean · build exit 0 · spec tsc count 3 (baseline 3; TS1005 0) · Not Done / Assumptions: none
- **Red run (verbatim):** removed `take(1)` → test (a) "completes a fast response and does not log a pending error": `expect(jest.fn()).not.toHaveBeenCalledWith(...expected) / Expected: not ObjectContaining {"status": "pending"} / Received call 0 with status "pending", message "Request is taking longer than 5 seconds to respond" … / Number of calls: 1` at `to-promise.service.spec.ts:530`. Control (b) "logs a pending error when the request is still open at 5 s" green with and without `take(1)`
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** from `client/research-indicators`, with no worker active: `npm test -- --silent --coverage=false <to-promise, http-error, api.service specs>` → `Test Suites: 3 passed` / `Tests: 333 passed` · `npm run lint -- --quiet` → "All files pass linting." · `npm run build` → exit 0 · `npx tsc -p tsconfig.spec.json --noEmit | grep -E 'to-promise.service.spec|http-error.interceptor.spec' | wc -l` → 3 (= baseline) · TS1005 count 0
- **Full suites (Leader, sequential, no worker active — done criterion "Full client suite re-run by the Leader"):**
  - server `npm test -- --silent` → `Test Suites: 424 passed, 424 total` / `Tests: 4035 passed, 4035 total`
  - client `npm test -- --silent` run 1 → `Test Suites: 2 failed, 341 passed` / `Tests: 7935 passed` — both failures `A jest worker process … was terminated by another process: signal=SIGSEGV` (`my-projects.component.spec.ts`, `result-ai-item.component.spec.ts`; neither touched by this spec). Isolated re-run of the two → `2 passed / 18 tests`. Full run 2 → `Test Suites: 343 passed, 343 total` / `Tests: 7953 passed, 7953 total`. Note: `jest.config.ts` no longer carries the `workerIdleMemoryLimit` mitigation recorded 2026-09-22 — out of scope here, flagged for the owner
- **Reviewer** (`akili-reviewer`, opus, attempt 2): **`STATUS: PASS`** — "Attempt 2 fixes the attempt-1 FAIL and matches the amended `design.md` §10 row for `to-promise.service.spec.ts`. `getObservable` now has `take(1)` before `map`, so the stream finishes on its first value, the same way `firstValueFrom` does in `TP`. That stops the interceptor's 5 s timer, so a fast AGROVOC call no longer logs a false "pending" error (design §9: only slow calls log). Requests that are cancelled or still open behave as before." Checked mapping, cancellation (Disqualifier still met), fast-call no-log test fails without the fix and passes for the right reason, slow-call control; `get`/`TP`, interceptor exclusion, `GET_AgrovocSearch$`, `AgrovocTerm` unchanged since attempt 1. Scope note: T-04's §10 tests use Subject stubs and cannot exercise the interceptor — expected, the fix lives in the primitive
- **ADVISORY (attempt 2, labelled advisory):** READABILITY the interceptor-backed `describe` builds its own mocks for `CacheService`/`ActionsService`/`Router`/`ImpersonationService` — client guide prefers shared mocks in `app/testing/` · READABILITY duplicated header builder `get`/`getObservable` · RELIABILITY test (a) asserts no `pending` log only, not "no `saveErrors` at all" (the spec asks for the former) · RISK `includes('tools/agrovoc')` covers the whole prefix (DD-7 intends it)
- **spawns:** Implementer Cursor/grok-4.7-high attempt 1 — not reported by host, ended complete (spawn failure before it: `ctx_4990b2af3ab8`, ended died) · Implementer attempt 2 — not reported by host, ended complete · Reviewer akili-reviewer/opus: attempt-1 verdict 8 calls / 55 787 tokens, re-adjudication 10 calls / 63 871 tokens, attempt-2 verdict 2 calls / 72 747 tokens, all ended complete
- **Requirements covered:** R-AGV-004 *Typing again cancels* (transport half) · R-AGV-005 *Error* (no stacked generic toast) · R-AGV-002 contract (client side) · design §9 (pending log only for slow calls)
- **Final verification:** VERIFIED (above)
- **Budget:** review rounds so far 4 of 7 (T-01 ×1, T-03 ×3 verdicts incl. re-adjudication); tasks 2 of 5 — within budget
- **Gate:** auto-continue per owner's standing direction


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

### T-02 — Endpoint, module and route wiring (server) — PASS

- **Final status:** PASS (attempt 1) · **Date:** 2026-10-19
- **Skills:** `nestjs-expert`, `api-design-principles` (task defaults) · **Effort:** `grok-4.7-high` (S, wiring)
- **Orca:** task `task_631ae43de10a`, dispatch `ctx_b97310ee5b04` (fresh worker; released after PASS) — ran in parallel with T-04 (cross-package)
- **Attempts:** 1 · **runtime events:** none
- **Files changed:** `server/researchindicators/src/domain/tools/agrovoc/agrovoc.controller.ts` (new), `…/agrovoc.module.ts` (new), `…/agrovoc.controller.spec.ts` (new), `src/app.module.ts` (`AgrovocModule` in `imports`), `src/domain/routes/main.routes.ts` (`{ path: 'agrovoc', module: AgrovocModule }` in `toolsChildren`), `src/app.module.spec.ts` (membership, route-tree, JwtMiddleware-exclude assertions)
- **Implementer verification (reported):** `npm test -- --silent src/domain/tools/agrovoc src/app.module.spec.ts` → 4 suites / 24 tests · `npx eslint …` exit 0 · `npm run build` exit 0
- **Red run (verbatim, reverted):**
  - F1 remove `AgrovocModule` from `AppModule.imports` → `expect(imports).toContain(AgrovocModule);` "Expected value: [Function AgrovocModule]" (`app.module.spec.ts:66`). The worker omitted the received-array dump because Jest printed `TypeOrmModule.forRoot` options including a datasource password — correct handling
  - F2 remove the route node → `expect(agrovocNode).toBeDefined();` "Received: undefined" (`:81`)
  - F3 (optional) add `tools/agrovoc/(.*)` to the exclude list → `.toBe(false)` "Expected: false / Received: true" (`:103`)
- **Swagger:** deferred to T-05 (app not booted against the shared Dev DB); a unit test reads decorator metadata (tag `AGROVOC`, bearer security, summary, required `query`, path `search`, GET, no `__version__`)
- **Not Done / Assumptions (verbatim, no owed item):** "Live HTTP reachability and a live `401` are not proved. The unit tier has no booted, authenticated seam (task disqualifier, KZ-017). Owned by T-05." · "Envelope description `'AGROVOC terms found'` and `@ApiOperation` summary `'Search AGROVOC terms'` are not pinned verbatim in the design … The real `ResponseUtils.format` is called (not mocked)."
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** after T-04's worker reported (no worker active): `npm test -- --silent src/domain/tools/agrovoc src/app.module.spec.ts` → `Test Suites: 4 passed` / `Tests: 24 passed` · `npx eslint src/domain/tools/agrovoc src/domain/routes/main.routes.ts src/app.module.ts src/app.module.spec.ts` → exit 0 · `npm run build` → exit 0
- **Full server suite (Leader):** `npm test -- --silent` → `Test Suites: 425 passed, 425 total` / `Tests: 4044 passed, 4044 total`
- **Reviewer** (`akili-reviewer`, opus, checklist): **`STATUS: PASS`** — "The T-02 diff matches tasks.md `## T-02` and design §2.1/§4/§8/§10, and it fully covers P-8, P-15 and P-16. Both registration steps are in place and each is pinned by a test that can fail (KZ-017). The endpoint resolves to `/api/tools/agrovoc/search`, unversioned. Swagger, the envelope and exception propagation all match the spec." Red-run line numbers counted against the diff hunk. Design §10 amendment (carried): client-only, no conflict
- **ADVISORY (labelled advisory):** RISK the AC.3 assertion checks `entry.path.includes('tools/agrovoc')` and cannot catch a broader exclusion (`tools/(.*)`, `(.*)`) that would also make the endpoint public — the live 401 at T-05 item 9 is the real gate · READABILITY description `'AGROVOC terms found'` also returned for `data: []` · READABILITY `.then(...)` vs the guide's usual `async`/`await` · READABILITY `@ApiQuery` lacks `type`/`description` documenting the 3–100 chars rule
- **spawns:** Implementer Cursor/grok-4.7-high — not reported by host, ended complete · Reviewer akili-reviewer/opus 10 calls / 63 664 tokens, ended complete
- **Requirements covered:** R-AGV-001 *Missing host* (envelope) · R-AGV-002 AC.1 (registration part), AC.2, AC.3 (exclude list), *No matches* (200 envelope), *Query too short* (400 envelope) · NFR-AGV-003 (envelope)
- **Final verification:** VERIFIED
- **Budget:** review rounds 5 of 7 after this verdict; tasks 3 of 5
- **Gate:** auto-continue per owner's standing direction

### T-04 — `app-agrovoc-keywords` field component (client) — PASS

- **Final status:** PASS (attempt 1) · **Date:** 2026-10-19 · **Commit:** held — UI change, not committed until the owner sees it working at T-05 (standing owner rule: no commit before visual approval)
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd` (task defaults) · **Effort:** `grok-4.7-xhigh` (concurrency logic — debounce/cancel race)
- **Orca:** task `task_a683559a5786`, dispatch `ctx_3555b8dadea1` (fresh worker; released after PASS) — ran in parallel with T-02 (cross-package)
- **Attempts:** 1 · **runtime events:** none
- **Files changed (all new):** `client/research-indicators/src/app/shared/components/custom-fields/agrovoc-keywords/agrovoc-keywords.component.{ts,html,scss,spec.ts}`
- **Implementer verification (reported):** `npm test -- --silent --coverage=false src/app/shared/components/custom-fields/agrovoc-keywords` → 10 passed · lint "All files pass linting." · `npm run build` exit 0 · spec tsc grep 0, TS1005 0 · hex grep no matches · retention check (component temporarily imported from `app.component` so the app build compiled it; exit 0; import reverted, `git diff` on `app.component.*` empty) · SCSS compiled 940 B (source 942 B)
- **Case map:** 1 `b, e, a, n 100ms apart settle into one search for bean` · 2 `a stale bean response is unsubscribed and never rendered` · 3 `fewer than 3 characters sends no request and shows the hint` · 4 `the same settled text searches once, and again after an error` · 5 `picking beans stores the label and resets the select` · 6 `Beans already selected disables beans and does not add a second chip` · 7 `Enter in the search box with no results leaves keywords unchanged` · 8 `legacy keywords render as chips and one can be removed` · 9 `a disabled field cannot search or remove chips` · 10 `loading hides the empty text, then empty, error, and matched_label`. HTTP stubbed with deferred `Subject`s
- **Red run (verbatim, reverted):**
  - `switchMap` → `mergeMap`, case 2: `Expected value: not "URANIUM_STALE" / Received array: ["URANIUM_STALE"]` at `expect(optionLabels()).not.toContain('URANIUM_STALE');` (`:173`; reads `.agrovoc-keywords__label` in the opened panel)
  - remove `debounceTime(500)`, case 1: `+ "bea",` received alongside `"bean"` at `expect(queries).toEqual(['bean']);` (`:147`) — 2 calls, not the 4 the task predicted (below-3 gate inside `switchMap`)
  - case-insensitive check → `keyword === label`, case 6: `"chips": 2, "disabled": false, keywords ["Beans","beans"]` vs expected `chips: 1, disabled: true` (`:269`)
  - drop the post-error distinct reset, case 4: expected `['bean','bean']`, received `['bean']` (`:232`)
- **Not Done / Assumptions (verbatim, no owed item):** helper copy and the "Max. 4" hint are page chrome placed by T-05 · "The picker does not use `ngModel`. PrimeNG `Select.setDisabledState` runs from `NgModel` and clears `[disabled]`, so case 9 stayed enabled. After a pick, `ViewChild(Select).writeValue(null)` resets the field." · chip remove `aria-label` copied by an `afterRenderEffect` onto `[data-pc-section="removeicon"]` · visual fidelity not provable in jsdom (KZ-017), owned by T-05 HITL · delivered `npm run build` does not type-check a component nothing imports
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** with no worker active: `npm test -- --silent --coverage=false src/app/shared/components/custom-fields/agrovoc-keywords` → `Test Suites: 1 passed` / `Tests: 10 passed` · `npm run lint -- --quiet` exit 0, "All files pass linting." · `npm run build` exit 0 · `tsc -p tsconfig.spec.json` grep `agrovoc-keywords.component` → 0, TS1005 → 0 · hex grep → exit 1 (no matches) · SCSS 942 B. **Scope limit (KZ-017):** the app build does not compile this component until T-05 imports it — the spec tsc grep and the worker's reverted retention build are the only type gates so far; T-05's build is the first real one
- **Review:** parallel lens mode (effort xhigh) — two `akili-reviewer` (opus) contexts
  - Lens A (conformance + reliability/resilience): **`STATUS: PASS`** — "T-04 matches the spec. The search stream follows design §5 in order … All 10 cases are present, and the race tests meet the Disqualifier clauses." `GET_AgrovocSearch$` consumed as-is; the design §10 `to-promise.service.spec.ts` amendment (carried check) is not undone. The remove-`debounceTime` result (2 calls) is correct under §5 and still goes red
  - Lens B (conformance + readability/risk): **`STATUS: PASS`** — "T-04 matches `design.md` §5 and §6, `requirements.md` R-AGV-003 (component part), the R-AGV-005 state table, and §10 OQ-1/3/4." Header mirrors `select.component.html:42-53`; tokens `--ac-grey-200/700/800` (dark variants exist) map to the old chip colours; only the four component files touched; DOM assertions use the real overlay in `document.body`
- **ADVISORY (labelled advisory, not gating):**
  - Lens A RELIABILITY (reachable): close the panel and reopen + retype the same text within 500 ms → `distinctUntilChanged` drops it and the panel shows "Type at least 3 characters" with 4 chars in the box until the text changes. Code follows design §5 (reset only after an error) → **design gap, raised to the owner, not a task**
  - Lens A: 500 ms not pinned from below (`tick(499)` → no call) · no >12 s *Slow upstream* test (holds by construction) · Enter cannot pick a highlighted option (satisfies "Enter on free text: ignored"; keyboard-picking cost)
  - Lens B RISK: chip remove `aria-label` untested and overwritable by PrimeNG on a locale change · chips row `aria-label` on a role-less `div` is ignored (add `role="group"`) · the `aria-live` row lives in PrimeNG's `empty` template, so result arrival is not announced (§6 does not require it) · `pi-search` icon lacks `aria-hidden` · no test for `disabled` turning on after first render (KZ-015) — **relevant to T-05**, whose binding may resolve after render · `text-transform: capitalize` shows `Beans` while `beans` is stored (inherited look)
- **Decisions made:** execute-time spec edit — `tasks.md` §T-04 falsifier note "(4 calls)" corrected to "2 calls (`bea`, `bean`)" (wrong prediction in the task text; no change of requirement meaning)
- **spawns:** Implementer Cursor/grok-4.7-xhigh — not reported by host, ended complete · Reviewer A opus 10 calls / 62 651 tokens, ended complete · Reviewer B opus 15 calls / 76 303 tokens, ended complete
- **Requirements covered:** R-AGV-003 *Pick a term* (chip), *Free text is not accepted*, *Duplicate pick*, *Legacy keywords stay* (render/remove), *Read-only result*, AC.2 · R-AGV-004 all four scenarios · R-AGV-005 every state row + *Slow upstream* · NFR-AGV-002
- **Final verification:** VERIFIED
- **Budget:** review rounds 7 of 7 after these two verdicts (T-01 ×1, T-03 ×3, T-02 ×1, T-04 ×2); tasks 4 of 5. T-05 will need at least one more round → **budget tripwire reached** (see below)

## Budget tripwire — before T-05 (2026-10-19)

| Metric | Budget (design §13) | Actual after T-04 | Projected with T-05 |
|---|---|---|---|
| Tasks | 5 | 4 done | 5 |
| Review rounds | 7 | 7 | ≥ 8 |
| LOC | ~700 | server ~1 060 incl. ~340 lines of captured JSON fixtures; client ~1 060 (T-03 ~370 + T-04 ~700) | + T-05 |

**Cause:** T-03 took 3 verdicts (PASS → Leader-requested re-adjudication → FAIL → PASS) for the interceptor-timer defect, and T-04 was reviewed by two parallel lens reviewers because it ran at `xhigh`. Tests and fixtures, not production code, drive the LOC overrun.

**Status:** stopped for the owner. T-05 also opens with a mandatory owner step (settle P-4: run the app with the owner's `.env` and confirm a search returns terms), so execution is paused regardless.

**Owner decision (2026-10-19):** "dale, lanza T-05" — budget overrun accepted; proceed to T-05. The owner had just observed that General Information still shows the old free-text input (expected: wiring is T-05's scope). P-4 (`ARI_AGROVOC_URL` set, search returns terms) was **not** confirmed before dispatch — T-05's "first step" moves to the start of the HITL check; if the live search fails there, T-05 stops before any commit.

### T-05 — Wire into General Information, clean up, live HITL check (client) — CODE PASS, HITL PENDING

- **Status:** `[~]` — code part PASS (attempt 1); P-4 and HITL items 1–10 pending with the owner; no commit (T-04 + T-05 held for visual approval) · **Date:** 2026-10-19
- **Skills:** `angular-developer`, `ui-ux-pro-max` (task defaults) · **Effort:** `grok-4.7-high` (S, wiring)
- **Orca:** task `task_311474466ea9`, dispatch `ctx_d0e0e6bfa15b` (fresh worker; released after code PASS — a HITL finding will go to a fresh worker with the finding verbatim)
- **Brief narrowing (Leader):** the worker owned code + tests + gates only; P-4's "first step" and the HITL check are run by the Leader with the owner after the code report (owner launched T-05 before confirming P-4). One `[advisory-grade]` item offered: a disabled-after-first-render sub-case (T-04 Lens B advisory) — the worker added it
- **Attempts:** 1 · **runtime events:** none
- **Files changed:** `client/research-indicators/src/app/pages/platform/pages/result/pages/general-information/general-information.component.{html,ts,spec.ts}`, `client/research-indicators/src/styles/styles.scss` (`.keywords-autocomplete` block removed). `create-result-form.component.ts` untouched (keeps its own `AutoCompleteModule`, `:18,49`). Note: `npx prettier --write` also reflowed the rest of the GI template and re-indented one comment block in `saveData` — formatting only (Reviewer-verified)
- **Implementer verification (reported):** targeted `npm test -- --silent --coverage=false` GI + agrovoc-keywords → 2 suites / 45 tests · `grep -rn "keywords-autocomplete\|multiple-ac-2" src` → 0 · lint exit 0 · `npm run build` exit 0, no budget warning for `agrovoc-keywords.component.scss` (942 B) · spec tsc set for `general-information.component.spec.ts` identical before/after (two pre-existing `TS2322`), TS1005 0
- **Red run (verbatim, reverted):**
  - one-way binding `[keywords]` → `Expected: 123, ObjectContaining {"keywords": ["beans"]} / Received: 123, {"description": "Test Description", "keywords": [], …}` at `expect((apiService as any).PATCH_GeneralInformation).toHaveBeenCalledWith(123, expect.objectContaining({ keywords: ['beans'] }));` (`general-information.component.spec.ts:821`)
  - old `<p-autocomplete inputId="multiple-ac-2" />` left in place → `expect(received).toBeNull() / Received: <p-autocomplete inputid="multiple-ac-2" />` (`:800`)
- **Not Done / Assumptions (verbatim):** "P-4 (`UNVERIFIED`) was not settled. This worker did not start the app and did not read `.env`." · "HITL items 1–10 were not observed. None are discharged. They remain for the Leader with the owner. No commit was made." · "Binding used is the task's banana form `[(keywords)]="body().keywords"`. `saveData()` reads the mutated signal object; the beans PATCH assertion is the proof." · sibling templates (input, textarea, select, form-header, navigation-buttons) overridden to `''`; `app-agrovoc-keywords` is real · added the optional disabled-after-first-render sub-case · legacy test loads `['In-Person']` via `getData()` and saves unedited
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** targeted run → `Test Suites: 2 passed` / `Tests: 45 passed` · grep → exit 1 (0 lines) · lint exit 0 · `npm run build` exit 0 (first build that compiles `app-agrovoc-keywords`; no agrovoc lines in the log — closes the T-04 build-scope limit) · spec tsc grep `general-information.component.spec` → 2, TS1005 → 0 · **full client suite** `npm test -- --silent` → `Test Suites: 344 passed, 344 total` / `Tests: 7967 passed, 7967 total`. Full server suite: last run after T-02 (`425/425`, `4044/4044`); no server file changed since
- **Reviewer** (`akili-reviewer`, opus, checklist, code part): **`STATUS: PASS`** — "The T-05 code is correct. `app-agrovoc-keywords` is wired into General Information with a two-way binding that writes back into what `saveData()` sends. The helper text matches the copy in design §6 exactly, and the "Max. 4 keywords" hint is still there. Every DD-8 cleanup item was done and nothing outside it was touched." Prettier reflow compared element by element: same attributes/bindings, no behavior change. Carried spec edits (§10 amendment, T-04 "2 calls"): no conflict
- **ADVISORY (labelled advisory):** RELIABILITY two-way binding mutates the object inside `body()` without notifying the signal — no reactive reader of `keywords` exists today (`:65`, `:113`); switch to `(keywordsChange)` + `body.update(...)` if one is added · READABILITY ~80 % of the template diff is Prettier formatting; consider a separate formatting-only commit
- **spawns:** Implementer Cursor/grok-4.7-high — not reported by host, ended complete · Reviewer akili-reviewer/opus 7 calls / 46 610 tokens, ended complete
- **Budget:** review rounds 8 (owner-approved overrun, see above)
- **HITL record (P-4 + items 1–10):** pending — to be filled with the owner's own words, one line per item; an item the owner did not cover stays open

#### T-05 HITL — item 1 (visual) — FINDING → T-04 attempt 2

- **Owner, verbatim (2026-10-19):** "en el componente del agno la lupa esta a la derecha y por dentro … comoe sta en el componente del agno y el que tu hiciste esta … a la izquierda revisa comoe sta en el agno" (with screenshots of both)
- **Root cause (Leader, verified at source — KZ-007):** Reporting year is `app-select serviceName="getYears"`, not OpenSearch, so `select.component.html:29` enables `[filter]` and PrimeNG renders its built-in filter — `p-iconfield` → `input.p-select-filter` → `p-inputicon` (`primeng-select.mjs:2671-2696`, PrimeNG 19.0.6): icon inside, right. Design §6 and P-14 had pointed at the `isOpenSearch` header (`select.component.html:40-54`, `p-input-icon-left`): icon outside, left. T-04 followed the design faithfully — **design defect, not implementation defect**
- **Execute-time spec edit (no change of requirement meaning — R-AGV-003 already says "looks like the Reporting year selector"):** `design.md` §6 component tree (header line) + "Visual reference" bullet, and §14 P-14, amended 2026-10-19. Sweep: `grep -rn "isOpenSearch\` header\|:40-54" docs/specs/results/agrovoc-keywords/` → only the amended, self-describing lines remain
- **Action:** T-04 reopened as attempt 2 (override e — rework), fresh Cursor/grok-4.7-high worker, task `task_082d6b7f0736`, dispatch `ctx_1c880154e45e`. Scope: the component's header markup + one DOM assertion with a falsifier; `aria-hidden` on the icon (Lens B advisory, tagged in the brief as cheap). T-04's `[x]` status stands only after attempt 2 passes review
- **HITL items 0, 2–10:** not yet reported by the owner — open

#### T-04 attempt 2 — PASS (header matches the Reporting-year built-in filter)

- **Implementer:** fresh Cursor/grok-4.7-high, task `task_082d6b7f0736`, dispatch `ctx_1c880154e45e` (released after PASS) · runtime events: none
- **Feedback passed:** the owner's HITL finding verbatim + Leader root cause + amended design §6/P-14
- **Files changed:** `agrovoc-keywords.component.{html,ts,spec.ts}` (SCSS unchanged — held no rules for the old header)
- **Change:** header rebuilt as `div.p-select-header` (click-stop) → `p-iconfield` → `input #filter pInputText type="text" role="searchbox" autocomplete="off" class="p-select-filter"` → `p-inputicon` with `<SearchIcon />` (`aria-hidden`); imports `IconField, InputIcon, InputText, SearchIcon`; `placeholder="Search..."` dropped (the year filter binds `filterPlaceholder`, which `app-select` leaves unset → no placeholder)
- **Red run (verbatim):** icon moved before the input → `Expected: < 0 / Received: 1` (`agrovoc-keywords.component.spec.ts:343`); restored → green
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** `npm test -- --silent --coverage=false <agrovoc-keywords, general-information>` → `Test Suites: 2 passed` / `Tests: 46 passed` · lint exit 0 · `npm run build` exit 0, no agrovoc lines · spec tsc grep `agrovoc-keywords.component.spec` → 0, TS1005 → 0 · hex grep → none
- **Reviewer** (`akili-reviewer`, opus, checklist): **`STATUS: PASS`** — "The attempt-2 change is limited to the panel header, the four standalone imports it needs, `aria-hidden` on the icon, the header `div` click-stop, and one new DOM test. No stream or state logic changed. The new header matches the PrimeNG built-in filter that design §6 and P-14 (amended 2026-10-19) now name as the visual reference." Diff-vs-diff comparison: `.ts` identical except `imports`; SCSS and the ten cases untouched
- **Scope limit (owed to T-05 HITL):** the DOM test proves structure/order only; jsdom does no layout, so "icon inside, right" is confirmed only by the owner in the running app
- **ADVISORY:** none (single checklist pass, < 50 lines)
- **spawns:** Implementer — not reported by host, ended complete · Reviewer opus 10 calls / 52 467 tokens, ended complete
- **Budget:** review rounds 9 (owner-approved overrun)

#### T-05 HITL — item 1 re-check

- First re-check showed the OLD header: the running `ng serve` (pid 90255, started 15:19) had not rebuilt after the worker's edit — Leader confirmed by fetching the served chunk (`chunk-WZEG6VE4.js`: `p-input-icon-left` 1, `p-select-filter` 0, `Search...` 1); `touch` on the component files made it rebuild (`chunk-BAWITY7G.js`: 0 / 1 / 0)
- **Owner, verbatim:** "tenia que parar el cli y cargarlo de nuevo y ya funciona" — recorded as: after restarting the dev server, the owner reports the field works. Item 1 (looks like Reporting year) accepted on that statement; the owner has not yet reported items 0, 2–10

#### T-05 HITL — item 1 (visual) — FINDING 2 → T-04 attempt 3

- **Owner, verbatim (2026-10-19):** "el drop down del agno tiene algo y es que cuando el dropdown es mas largo que el espacio enpantalla si hacia abajo es muy poco se despliega hacia arriba" (screenshots: ours cut off at the bottom; the year dropdown opening downward when it fits and upward when it does not)
- **Root cause (Leader, at source):** PrimeNG 19.0.6 `Select` only places the overlay at open; its re-align-on-options-change path never fires (`optionsChanged` declared at `primeng-select.mjs:1623`, read at `:1814`, never assigned). Year: full list at open → flips. Ours: small at open (hint), grows on results → stays below, cut off
- **Execute-time spec edit (no change of requirement meaning — part of "looks/behaves like the Reporting year selector"):** `design.md` §6 new bullet "Panel placement", 2026-10-19
- **Action:** T-04 attempt 3 (override e), fresh worker
- **Also observed in the screenshot (owner had not reported it as an issue):** a search for `bean` returned terms (`bean anthracnose`, `bean common mosaic virus`) — evidence toward items 0/2, still to be confirmed by the owner in words

#### T-04 attempt 3 — PASS (panel re-aligns while open)

- **Implementer:** fresh Cursor/grok-4.7-high, task `task_5e7e8992b746`, dispatch `ctx_3b6224af439e` (released after PASS) · runtime events: none
- **Files changed:** `agrovoc-keywords.component.{ts,spec.ts}` (HTML/SCSS unchanged)
- **Change:** a second `afterRenderEffect` tracks `state()` and calls `realignOpenPanel()`; guard: only when the `ViewChild` `Select` has `overlayVisible` and `overlayViewChild`. `alignOverlay()` is wrapped so only a `ReferenceError` whose message contains "origin" is swallowed; anything else is rethrown
- **Red run (verbatim):** realign call removed → `Expected number of calls: 1 / Received number of calls: 0` at `expect(align).toHaveBeenCalledTimes(callsBeforeResults + 1);` (`agrovoc-keywords.component.spec.ts:424`); restored → green
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** `<agrovoc-keywords, general-information specs>` → `Test Suites: 2 passed` / `Tests: 47 passed` · lint exit 0 · build exit 0 · spec tsc grep `agrovoc-keywords.component` → 0, TS1005 → 0
- **Reviewer** (`akili-reviewer`, opus, checklist): **`STATUS: PASS`** — "The attempt-3 change does what design.md §6 "Panel placement" asks: after each state change renders while the panel is open, it calls the overlay's `alignOverlay()`. The change stays inside the scope you set, and the effect cannot loop." (effect tracks only `state()`; `overlayVisible` is a plain field; `alignOverlay` writes only `element.style`)
- **Correction record (KZ-007) — the "origin" error:** `primeng-dom.mjs:160/:190` reads a bare `origin` after writing `transformOrigin`/`top`/`left`. The worker measured a `ReferenceError` **in jsdom**, and the Leader told the owner the error "always" fires and also hits the year selector. **That was overstated.** Per the Reviewer (not run): in a real browser a bare `origin` resolves to the global `window.origin` (a string), so it does not throw there — the comparison is just false and the downward-gutter `marginTop` is applied, the same few pixels the year dropdown shows. The catch is therefore most likely jsdom-only and harmless in production. Corrected to the owner in the next message
- **Scope limit (owed to T-05 HITL):** the real up/down flip is not provable in jsdom; only the owner's view settles it
- **ADVISORY:** none (delta < 50 LOC)
- **spawns:** Implementer — not reported by host, ended complete · Reviewer opus 10 calls / 57 659 tokens, ended complete
- **Budget:** review rounds 10 (owner-approved overrun)

#### T-04 + T-05 client commit — owner instruction

- **Owner, verbatim (2026-10-20):** "haz commit"
- **Scope:** T-04 component (attempts 1–3) + T-05 General Information wiring + spec docs, committed together. No push
- **Still open:** T-05 stays in progress — HITL items 0, 2–10 and P-4 have not been confirmed by the owner in words, so T-05 is not marked done

#### T-05 HITL — owner approval — PASS

- **Owner, verbatim (2026-10-20):** "ya se abre hacia arriba, todo funciona bien" — in reply to the Leader's message that listed the panel flip plus items 0, 2–10 (search with `bean`, cancellation in DevTools, chips and duplicates, save and reload, legacy keywords, read-only, offline without toast, 401 without token, Swagger)
- **Item 1 (look + panel placement):** confirmed specifically ("ya se abre hacia arriba"; earlier: icon right/inside re-checked "ya funciona")
- **Items 0 (P-4), 2–10:** covered by the owner's blanket "todo funciona bien" in reply to the itemized list. Recorded as such (KZ-002): the owner did not describe each item separately, so items 3, 8 and 9 rest on that blanket confirmation, not on an individually quoted observation. P-4 also has screenshot evidence (`bean` returned `bean anthracnose`, `bean common mosaic virus`)
- **Leader full-suite re-run (after T-04 attempt 3, no workers active):** client `npm test -- --silent` → `Test Suites: 344 passed, 344 total` / `Tests: 7969 passed, 7969 total`. Server: last full run after T-02 (`425/425`, `4044/4044`); no server file changed since
- **Status:** T-05 `[x]`

## 3. Summary

- **Result:** all 5 tasks PASS (T-01, T-02, T-03, T-04, T-05). Commits: `1e9827a35` (T-01), `3f3ed10ac` (T-03), `1e4a61e91` (T-02), `e3ba7f8ee` (T-04 + T-05). Not pushed
- **Rework:** T-03 attempt 2 (`take(1)` — interceptor merge-timer false "pending" log); T-04 attempts 2 and 3, both from owner HITL findings traced to design gaps (wrong visual reference in §6/P-14; PrimeNG 19.0.6 never re-aligns an open overlay), design amended at execute time
- **Budget:** 5/5 tasks; review rounds 10 vs. 7 budgeted (owner-approved overrun, "dale, lanza T-05")
- **Corrections recorded:** KZ-007 — the Leader overstated the PrimeNG bare-`origin` `ReferenceError` as always firing; it is jsdom-only. Corrected to the owner
- **Open owner decisions (not blocking):** (a) the close/reopen-within-500 ms "Type at least 3 characters" glitch (needs a design §5 amendment); (b) restore `workerIdleMemoryLimit: '1GB'` in `client/research-indicators/jest.config.ts` (SIGSEGV on unrelated suites returned once at T-03)
- **Reviewer advisories carried:** two-way binding mutates `body().keywords` without signal notification (no reactive reader today); Prettier reflow of the GI template could be a separate formatting commit
- **Kaizen/persona drift (advisory):** `.agents/implementer.md` still places the CodeGraph index in `server/researchindicators/.codegraph/`; the root guide says the repo root
