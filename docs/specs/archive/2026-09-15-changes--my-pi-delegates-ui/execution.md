# Execution Log — My PI Delegates (Frontend / STAR)

## Document Control

| Field | Value |
| --- | --- |
| Spec | changes/my-pi-delegates-ui |
| Module | my-pi-delegates-ui (client `research-indicators` only) |
| Backend | shipped + archived (`archive/2026-09-11-changes--my-pi-delegates`) |
| Approval Mode | gated (proposal) — **continue-gate auto-advances on PASS per user standing instruction** (memory: akili-execute auto-continue); grave errors / HALT / Pivot / budget still stop |
| Leader model | opus (T1) |
| Implementer | akili-implementer wrapper (T2/sonnet) |
| Reviewer | akili-reviewer wrapper (T3/opus) — author ≠ auditor enforced |
| Started | 2026-09-11 |

## Task Execution History

### T-UI-01 — API methods + response interfaces — **PASS** (2026-09-11)

- **Attempts:** 1 (PASS on first attempt)
- **Requirements covered:** the 4 shipped endpoints (design §4; requirements §5).
- **Files changed:**
  - `client/research-indicators/src/app/shared/services/api.service.ts` — added `firstValueFrom` import, `pi-delegates.interface` import, and 4 methods (`GET_PIDelegatesByProject`, `GET_PIDelegatesByDelegate`, `POST_PIDelegates`, `DELETE_PIDelegates`) at ~L1211–1265.
  - `client/research-indicators/src/app/shared/interfaces/pi-delegates.interface.ts` — new; exports `DelegateSummary`, `ProjectSummary`, `ProjectDelegates`, `DelegateProjects`.
- **Attempt 1 — Implementer (T2):**
  - Verification: `npx tsc -p tsconfig.app.json --noEmit` → clean; `npx eslint <both files>` → clean.
  - KZ-017 scope note: `tsconfig.app.json` excludes `*.spec.ts`; does not run tests/lint.
- **Attempt 1 — Reviewer (T3): `STATUS: PASS`.** All 6 gates clean. Both GETs use query params (`?projectId=`, `?delegate_user_id=`, not path). POST union + DELETE dual-shape body match design §4 exactly, typed. All 4 DTO interfaces exported and mirror the backend. CRITICAL check verified against `ToPromiseService` source: `http` (`inject(HttpClient)`, L12) and `getEnv` (L142) are public; `getEnv(undefined)` resolves to `environment.mainApiUrl` — same base as every unversioned neighbor — so the DELETE URL is well-formed. `TP.get(url,{})`/`TP.post(url,body,{})` match real signatures. No scope creep, no hex, no HttpClient-in-component (`this.TP.http.delete` lives inside `ApiService`, the sanctioned HTTP layer).
- **Decisions made:**
  - DELETE bypasses the private `TP()` envelope wrapper via `this.TP.http.delete(url, { body })` because `ToPromiseService.delete(url, config)` has no body parameter — the design's literal `TP.delete(url, body)` is not callable. Success path shape/type are correct.
- **ADVISORY (4R lens — non-gating; both owned by T-UI-02):**
  - RELIABILITY: `DELETE_PIDelegates` rejects the promise on HTTP error instead of resolving `{ successfulRequest:false }` like `TP.get`/`TP.post`; success is not stamped `successfulRequest:true`. → T-UI-02 `revokePair`/`revokeById` MUST wrap in try/catch and normalize to `successfulRequest:false` + refetch (R-UI-007 AC.3), or add a body-capable helper to `ToPromiseService` in a later task.
  - RELIABILITY: `start_date`/`end_date` typed `Date | null` but JSON delivers ISO **strings**. Consumers in T-UI-05/06 calling `Date` methods will fail at runtime despite compiling. → consider `string | null` or an explicit parse at the service boundary.
- **Issues:** none blocking.
- **Final verification:** `npx tsc -p tsconfig.app.json --noEmit` clean; eslint clean.

### T-UI-02 — Client feature service (signals, single source of truth) — **PASS** (2026-09-11)

- **Attempts:** 1 (PASS on first attempt)
- **Requirements covered:** R-UI-010 (single cache, no drift); supports R-UI-004 (counters), R-UI-007 AC.3 (error → refetch), R-UI-008 (revoke reflects, by-project surface).
- **Files changed (both new):**
  - `client/research-indicators/src/app/pages/platform/pages/my-pi-delegates/services/pi-delegates.client.service.ts` (198 LOC)
  - `client/research-indicators/src/app/pages/platform/pages/my-pi-delegates/services/pi-delegates.client.service.spec.ts` (326 LOC, 15 tests)
- **Attempt 1 — Implementer (T2):** `PiDelegatesClientService` (`providedIn:'root'`, signals). `byProjectCache`/`byPersonCache`/`loading`/`error` signals; `computed` `totalProjects`/`totalDistinctDelegates`/`projectsWithoutDelegate` all read the single `byProjectCache`. `loadByProject`/`loadByPerson` aggregate via `Promise.all`, unwrap `res.data` on `successfulRequest`. `assign` POST→refetch; `revokePair`/`revokeById` DELETE (correct body shapes)→refetch, DELETE wrapped in try/catch with refetch in `finally` (absorbs the T-UI-01 DELETE-rejection advisory). `_refetchByProject` is the sole post-write writer.
  - Verification: `tsc -p tsconfig.app.json --noEmit` clean; `tsc -p tsconfig.spec.json --noEmit` clean (pi-delegates); `npm test --coverage=false --testPathPattern=pi-delegates.client.service` → 15/15 pass; eslint service clean (spec file = repo-standard K-002 ignore).
- **Attempt 1 — Reviewer (T3): `STATUS: PASS`.** All 6 gates clean. Spec tests confirmed discriminating (KZ-001/KZ-015): write→refetch asserts `['POST','GET']`/`['DELETE','GET']` order + refetched value (no-refetch and optimistic-mutation impls both fail); single-cache test fails a divergent impl; DELETE-rejection test proves error-set + refetch-still-runs (`GET` called twice). The T-UI-01 DELETE-rejection advisory confirmed real at `api.service.ts:1259-1266` and correctly absorbed.
- **TARGETED CHECK adjudicated → ADVISORY (carry to T-UI-06):** writes refetch only `byProjectCache`, never `byPersonCache`. Not a T-UI-02 FAIL — design §5 scopes refetch to "the affected slice" (project terms), and the By-person tab + its write path are T-UI-06's scope. R-UI-010 is NOT violated (one cache per slice, no *second separately-mutated copy of the same slice*).
- **ADVISORY (4R lens — non-gating):**
  - RELIABILITY/RESILIENCE: **`byPersonCache` goes stale after any write** while the By-person tab is on screen. **T-UI-06 MUST close this** — reload by-person on tab activation, or add a `_refetchByPerson` invoked by the by-person row-X path — so a revoke from By-person visibly reflects (R-UI-008) and counters refresh (R-UI-004). Do NOT assume handled.
  - RELIABILITY: `revokeById` refetches `byProjectCache().map(project_code)`, so a `pi_delegate_id` whose project is not already cached cannot be refreshed. Fine for the row-X flow (X only on loaded rows); note for future callers.
  - READABILITY: `assign` JSDoc says "refetch the affected projects" but leaves `byPersonCache` untouched; a one-line "by-person refresh deferred to T-UI-06" note would help the next maintainer.
- **Issues:** none blocking.
- **Final verification:** tsc app clean; tsc spec clean; 15/15 tests pass; eslint clean.

### T-UI-04 — Page shell + tabs + summary header — **PASS** (2026-09-11)

- **Attempts:** 1 (PASS on first attempt)
- **Requirements covered:** R-UI-002 AC.1 (opens on By-project), R-UI-003 AC.1 (tab state persists), R-UI-004 (3 counters, reactive), NFR-UI-001/002/003.
- **Files changed (all new):** `my-pi-delegates.component.{ts,html,scss,spec.ts}` under `pages/platform/pages/my-pi-delegates/`. (350-line spec, 14 tests.)
- **Attempt 1 — Implementer (T2):** default-export standalone shell; `p-tabView` By-project(0, default)+By-person(1); `activeTabIndex` signal; 3 counters = `computed` reading service `totalProjects`/`totalDistinctDelegates`/`projectsWithoutDelegate().length`; loading/error/empty states on service signals. `ngOnInit` → `loadByProject(getProjectIds())` where `getProjectIds()` returns `[]` (design §9 fallback — managed-projects endpoint stubbed → empty state, one-line swap point for T-UI-08). STAR tokens only.
  - Verification: tsc app clean; tsc spec clean (this component); `npm test --testPathPattern=my-pi-delegates.component` → 14/14; hex grep on 3 files empty; eslint clean.
- **Attempt 1 — Reviewer (T3): `STATUS: PASS`.** All 6 gates clean. **Token authenticity verified** in `client/research-indicators/src/styles/colors.scss`: `atc-primary-blue-*`/`atc-grey-*`/`atc-red-1` all generated from the `$colors` map; `--ac-grey-100/200` defined at `:root` + `[data-theme='dark']` (light+dark) — no invented token. Hex grep independently zero. A11y: icon+text+aria roles on all states. Spec discriminates: default-tab test asserts index 0 AND panel headers; counter-reactivity arranges the transition (0/0/0 → set cache → 2/1/1 → mutate → 3/2/1 — non-reactive impl fails); mock re-implements the real `computed` derivations (not an empty stub, KZ-001).
- **ADVISORY (non-gating):** RELIABILITY — `getProjectIds()` returns `[]` behind one documented `// TODO(user endpoint)` accessor (design §9 sanctioned fallback). Concrete wiring point for **T-UI-08**; until wired the page renders the empty state by design (covered by the empty-state test).
- **Issues:** none blocking.
- **Final verification:** tsc app clean; tsc spec (this component) clean; 14/14 tests pass; hex grep empty; eslint clean.

### T-UI-05 — By-project tab (enriched table + row "X" + search) — **PASS** (2026-09-11)

- **Attempts:** 1 (PASS on first attempt)
- **Requirements covered:** R-UI-002 (AC.2/AC.3), R-UI-008, R-UI-007 AC.1 (confirm), NFR-UI-002/003.
- **Files changed:** new `tabs/by-project/by-project.component.{ts,html,scss,spec.ts}` (27 tests); edited shell `my-pi-delegates.component.{ts,html,spec.ts}` (import + render `<app-by-project>`, drop now-child-owned `isEmpty`, add `ActionsService` stub in shell spec). Combined suite 41/41.
- **Attempt 1 — Implementer (T2):** standalone `app-by-project` (OnPush), reads `service.byProjectCache()`. `p-table` enriched columns (code/name/pool-funding/status/dates/delegate chips); `formatDate` guards ISO-string dates (T-UI-01/02 advisory). Non-colour cues: pool `pi-check-circle`/`pi-minus-circle`+text, no-delegate `pi-exclamation-triangle`+text. Per-delegate X → `ActionsService.showGlobalAlert` confirm (names delegate+project+effect) → `service.revokePair(code, delegate_user_id)`. Search = `computed` filtered view (person OR project), never mutates cache. Assign button emits `@Output() assignRequested` only (modal = T-UI-07). STAR tokens only, hex clean.
  - Verification: tsc app clean; tsc spec clean (my files); `npm test --testPathPattern=by-project.component` → 27/27; combined with shell → 41/41; hex grep empty; eslint clean.
- **Attempt 1 — Reviewer (T3): `STATUS: PASS`.** All 6 gates verified at source. `showGlobalAlert` confirmed genuine STAR pattern (`actions.service.ts:178`, `GlobalAlert` iface). Spec discriminates: exact-pair revoke (`'PRJ-001', 1`); **dismiss-confirm guard reddens under guard removal** (revoke wired only inside `confirmCallback.event`); pair isolation (`.not.toHaveBeenCalledWith('PRJ-001', 2)`, Bob real); search person-vs-project negative discriminator real; no-delegate icon+text asserted; real `p-table` under NoopAnimations (KZ-001). Tokens all generated from `--ac-*` (incl. `atc-orange-1`). Shell wrapper (loading/error, By-project default) intact after edit.
- **ADVISORY (non-gating):** (A-1) stale HTML comment says "Status — icon + text" but status cell is text-only — NOT a violation (status uses no colour; NFR-UI-002 not triggered), just fix the comment later. (A-2) dismiss-guard test is by-construction (no `cancelCallback.event`); valid (reddens on guard removal) but a future move of `revokePair` to a cancel path wouldn't be caught. (A-3) Reviewer did not re-run tests (read-only); Leader re-measures the full suite at T-UI-09.
- **Issues:** none blocking.
- **Final verification:** tsc app/spec clean; 41/41 tests; hex grep empty; eslint clean. (Full-suite + coverage-floor measurement deferred to T-UI-09.)

### T-UI-06 — By-person tab (enriched table + row "X" + search) — **PASS** (2026-09-11)

- **Attempts:** 1 (PASS on first attempt)
- **Requirements covered:** R-UI-003 (AC.2), R-UI-008, R-UI-007 AC.1, R-UI-010, NFR-UI-002/003.
- **Files changed:** new `tabs/by-person/by-person.component.{ts,html,scss,spec.ts}` (25 tests); edited shell `my-pi-delegates.component.{ts,html}` (import + render `<app-by-person>`).
- **Attempt 1 — Implementer (T2):** standalone `app-by-person` (OnPush). **DESIGN REFINEMENT:** By-person rows = `computed` inversion of `service.byProjectCache()` (dedupe by `delegate_user_id`, aggregate projects) — NOT `loadByPerson`/`byPersonCache`. Per-project X → `showGlobalAlert` confirm → `service.revokePair(project_code, delegate_user_id)`. Search over derived rows (person OR project). Assign emits `@Output() assignRequested{delegateUserId}` only. STAR tokens, hex clean.
  - Verification: tsc app clean; tsc spec clean (by-person; 935 pre-existing baseline errors elsewhere unchanged); `npm test --testPathPattern=by-person.component` → 25/25; hex grep empty; eslint clean.
- **Attempt 1 — Reviewer (T3): `STATUS: PASS`.** **Inversion deviation adjudicated ACCEPTABLE REFINEMENT:** verified no required datum lost (`ProjectDelegates.delegates` = `{delegate_user_id,name,email}` + project `{code,name}` = exactly the By-person shape; `by-delegate` payload adds nothing the spec requires). Strictly more faithful to R-UI-010/DD-UI-C (one source) and makes R-UI-003 AC.2 STRUCTURAL (inversion of a managed-only cache cannot leak an unmanaged project). Dissolves the T-UI-02 staleness advisory — proven by the KZ-015 reactive-update test (spec.ts:212-239). Spec discriminates: AC.2 negative discriminator, reactive-update transition, dismiss-guard reddens on removal, pair isolation, search person-vs-project. Tokens all resolve.
- **⚠ RECONCILE-AT-ARCHIVE (design drift, not a gate):** `design.md` §5/§6 still name a `byPersonCache` fed by `GET by-delegate` as the By-person source. Shipped view uses neither (`byPersonCache`/`loadByPerson` retained in the service, unused by the tab). At archive, reconcile §5/§6 to record: *"DD-UI-C: By-person is a `computed` inversion of `byProjectCache`; `byPersonCache`/`loadByPerson` retained but unused by the tab."*
- **ADVISORY (non-gating):** RELIABILITY — `PersonRow.projects` not deduped by `project_code`, but one project = one `byProjectCache` entry so it cannot duplicate in practice (relied-on invariant). READABILITY — `PersonRow.name/email` correctly non-null (sourced from `DelegateSummary`, not the nullable `DelegateProjects`).
- **Issues:** none blocking.
- **Final verification:** tsc app/spec clean; 25/25 tests; hex grep empty; eslint clean.

### T-UI-03 — Nav entry + lazy route — **PASS** (2026-09-11)

- **Attempts:** 1 (PASS on first attempt)
- **Requirements covered:** R-UI-001 (AC.1 visibility fallback, AC.2 lazy+guarded route).
- **Files changed:** `app.routes.ts` (+ child route), `alliance-sidebar.component.{ts,html,spec.ts}` (+ `piGroups()`, PI section expanded+collapsed, +4 tests, 1 pre-existing selector re-scoped). 31/31 sidebar tests.
- **Attempt 1 — Implementer (T2):** route `my-pi-delegates` added as platform-shell child (sibling of `about`), lazy `loadComponent(...).then(m=>m.default)`, `canMatch:[rolesGuard]`, `data:{isLoggedIn:true}` — byte-identical to sibling platform routes. `piGroups()` returns `{id:'pi', label:'Principal Investigator', icon:'pi-users', children:[{label:'My PI Delegates', link:'/platform/my-pi-delegates', icon:'pi-user-edit'}]}` typed `AdministrationNavGroup[]`. Visibility unconditional to authenticated users (design §9 fallback, `// TODO(eligibility)`), no new role. Existing groups untouched.
  - Verification: tsc app clean; `npm test --testPathPattern=alliance-sidebar` → 31/31; eslint clean.
- **Attempt 1 — Reviewer (T3): `STATUS: PASS`.** Route child-placement + guard idiom confirmed against siblings; default-export target exists; `piGroups()` reuses real interface; nothing removed (tests assert center-admin + system-admin still present). **JUDGMENT 1 (hex):** ACCEPTABLE — NFR-UI-001 grep gate is module-scoped (`alliance-sidebar` is shared, outside my-pi-delegates); PI hex is byte-verbatim copy of the administration section + file-wide pre-existing convention; design §9 mandates mimic; PI primary colours use `atc-primary-blue-400` tokens. **JUDGMENT 2 (modified test):** legitimate intent-preserving fix — PI collapsed button renders `<i class="pi pi-users">` with NO `s3Image`, so the un-scoped `admin-parent--collapsed` selector became ambiguous (PI renders first); re-scope to `[aria-label="System admin"]` restores original intent; no regression masked (KZ-014 satisfied).
- **ADVISORY (non-gating):** the `alliance-sidebar` shared component carries a file-wide hex convention (~16 occurrences) predating this feature. Detoxing to STAR tokens warrants a SEPARATE task with full-suite regression (KZ-003 blast radius — renders on every authenticated screen). Correctly NOT folded into T-UI-03. Reviewer also flagged: confirm `tsc -p tsconfig.spec.json --noEmit` green before final sign-off (K-002 — client tests aren't type-checked) → covered by the T-UI-09 comprehensive gate.
- **Issues:** none blocking.
- **Final verification:** tsc app clean; 31/31 sidebar tests; eslint clean.

### T-UI-08 — Stub the People + Projects picker sources — **PASS** (2026-09-11)

- **Attempts:** 1 (PASS on first attempt)
- **Requirements covered:** DD-UI-STUB / DD-UI-E; supports R-UI-005 AC.1/AC.3/AC.5 (picker shapes + self-exclusion hook deferred to modal).
- **Files changed:** new `services/pi-delegate-picker-stub.service.{ts,spec.ts}` (15 tests); edited shared `service-locator.service.ts` (+2 cases), `services.interface.ts` (+2 union members).
- **Attempt 1 — Implementer (T2):** two `@Injectable({providedIn:'root'})` stub services (`PiDelegatePeoplePickerStubService`, `PiDelegateProjectsPickerStubService`) each `{ list: signal<DelegateSummary[]|ProjectSummary[]>([]), loading, isOpenSearch }` — the real `app-multiselect` service contract, real option shapes, empty by default. Registered under `ControlListServices` keys `'piDelegatePeople'`/`'piDelegateProjects'`. Single swap point = the two `signal([])` initialisers (+ locator cases), all `// TODO(user endpoint)` marked.
  - Verification: tsc app clean; tsc spec clean (stub); `npm test --testPathPattern=pi-delegate-picker-stub` → 15/15; eslint clean.
- **Attempt 1 — Reviewer (T3): `STATUS: PASS`.** All 3 gates clean. **KEY RUNTIME CLAIM CONFIRMED (tsc can't prove):** `MultiselectComponent` resolves via `ServiceLocatorService.getService(serviceName)`, binds `service.list`/`service.loading`, reads `isOpenSearch` defensively (`?.()`), and `loadData()` is guarded `if (!this.service || typeof this.service.main !== 'function') return` — so the `main()`-less stub renders empty without throwing. Locator changes strictly additive (every existing case untouched, KZ-002 clean). Spec discriminates (missing registration → `default`→`null` → `toBeInstanceOf` fails).
- **ADVISORY (non-gating):** READABILITY — stale spec comment (`spec.ts:20-21` says "minimal stub for ServiceLocatorService" but it injects the REAL locator — the thing that makes the proof valid); correct/delete it. RELIABILITY (forward, for the real swap-in): `multiselect.component.ts:370` calls `service.isOpenSearch()` unconditionally in `onFilter` — the real endpoint service MUST keep `isOpenSearch` present or user-typed filtering throws; note in the swap-point comment when wiring.
- **Issues:** none blocking.
- **Final verification:** tsc app/spec clean; 15/15 tests; eslint clean.

### T-UI-07 — Assign/Edit modal (reuse `app-modal`, SYNC-aware) — **PASS** (2026-09-14, 2 attempts)

- **Attempts:** 2 (attempt 1 lens FAIL on one off-token line; attempt 2 fix → PASS). Effort XHIGH; **parallel lens review** (data-loss surface, RB-1).
- **Requirements covered:** R-UI-005 (AC.3 self-excl, AC.4 gating), R-UI-006 (AC.1/2 pre-load), R-UI-007 (AC.1 delta confirm, AC.2 success, AC.3 error+refetch), §5 SYNC.
- **Files changed:** new `assign-modal/assign-pi-delegate.component.{ts,html,scss,spec.ts}` (16 tests); modified `shared/types/modal.types.ts` (+`'assignPiDelegate'`), `shared/services/cache/all-modals.service.ts` (+`assignPiDelegateContext` signal, modalConfig entry), `all-modals.component.{ts,html}` (register modal), shell `my-pi-delegates.component.{ts,html}` (wire both tabs' `(assignRequested)` → set context + open modal).
- **Attempt 1 — Implementer (T2, xhigh):** reuse `app-modal`; two `app-multiselect`s (People `piDelegatePeople` + Projects `piDelegateProjects`); `disabledConfirmIf` computed (≥1 person AND ≥1 project) wired via `modalConfig.disabledConfirmAction`; `preLoadFromContext` seeds current delegates (byProject) / person's projects (byPerson) as the anti-revoke guard; `onConfirm` builds per-project added/removed/unchanged delta + explicit revoke messaging → `showGlobalAlert(severity:'confirm')` → `service.assign(assignments)` (full desired list per project); success toast+close / error toast (no partial success); self-exclusion via `[optionFilter]` on `currentUserId`. Verification: tsc app/spec clean; 16/16; hex grep empty; eslint clean.
- **Attempt 1 — Parallel lens reviewers (T3):**
  - **SPEC-CORRECTNESS (gate): PASS** — all 7 gates at source; `disabledConfirmAction` plumbing confirmed (modal footer reads `getConfig().disabledConfirmAction?.()`); delta set-logic correct; exact POST shape; self-exclusion wired; affordance→context→modal wiring end-to-end. Tests discriminate.
  - **RESILIENCE/DATA-LOSS: PASS** — all 6 revoke vectors closed: pre-load → unedited Save sends current delegates (zero revoke); subset-revoke named; multi-project exposure (project Q's existing delegate named as removed); error path no partial-success; `effect` non-re-entrant (`wasOpen` gates closed→open edge). Advisory: 0-people revoke-all branch is dead-by-design (Accept gated), empty-people fallback for unloaded project.
  - **A11Y/TOKENS: FAIL** — `assign-pi-delegate.component.scss:28` used `var(--ac-blue-50)`, a non-existent token → notice renders transparent both themes (NFR-UI-001 off-token).
- **Adjudication:** tokens FAIL is in-scope (NFR-UI-001 stated req, T-UI-07 authored the file, verified real) → gated → rework.
- **Attempt 2 — Implementer (T2):** replaced with `var(--ac-primary-blue-100)`. **Justified deviation from the Reviewer's remediation:** the Reviewer suggested `--ac-primary-blue-50`, which ALSO does not exist (no `-50` ramp level) — applying it would repeat the defect (KZ-007). Used `--ac-primary-blue-100` (defined at `:root` L10 + dark L128, already used for info/notice in `bilateral-mapping`/`automapper-dialog`). 16/16 tests still green.
- **Attempt 2 — verification:** Leader direct grep confirmed `--ac-primary-blue-100` present in both themes, `--ac-primary-blue-50` absent, scss now has exactly one real `var(--ac-*)`. Punctual factual verification of a single scss line (not a logic re-audit); gate + resilience lenses already PASS on the unchanged logic. **Tokens lens satisfied.**
- **ADVISORY (carried):** add a code comment noting the 0-people revoke-all branch is unreachable-by-design (Accept gated); consider a test for the open-from-unloaded-project empty-people fallback if that flow ever becomes reachable.
- **Issues:** none blocking.
- **Final verification:** tsc app/spec clean; 16/16 tests; hex grep empty; scss tokens all real; eslint clean.

### T-UI-09 — Tests + comprehensive coverage gate — **PASS** (2026-09-14)

- **Attempts:** 1 (PASS). frontend-unit suite, Tester (T2), run in isolation (concurrency rule honored).
- **Requirements covered (aggregate):** R-UI-002/003/005/006/007/008/010, NFR-UI-002/003.
- **Full suite (verbatim):** `Test Suites: 322 passed, 322 total` · `Tests: 6869 passed, 6869 total` · 30.0s.
- **Coverage floors (jest.config.ts):** statements 97.97% (floor 40) · branches 95.66% (20) · lines 98.28% (45) · functions 97.45% (30) — **all PASS**, huge margin. No threshold failure.
- **`tsc -p tsconfig.spec.json --noEmit` (module-scoped):** `my-pi-delegates/**` spec files **CLEAN**. The 7 TS2352 in `alliance-sidebar.component.spec.ts` are **pre-existing** — proven by `git stash` (identical errors at line −36 shift = T-UI-03 inserted 36 lines above them); T-UI-03's own additions used `as unknown as` correctly. Consistent with the K-002 ~935-error baseline. Gate proven live/able-to-fail (K-004).
- **Tests added:** none needed — floors already met; existing ~113 co-located discriminating tests cover every requirement behavior (inversion, gating, pre-load transitions, delta naming, revoke pair-isolation, single-cache no-drift, non-colour cues, states as transitions).
- **KZ-003 blast radius:** CLEARED — all 322 suites incl. `alliance-sidebar` (31) green; no regression outside the module.
- **Issues:** none.

---

## Summary — ALL TASKS COMPLETE (2026-09-14)

| Task | Status | Attempts |
| --- | --- | --- |
| T-UI-01 API methods + interfaces | ✅ PASS | 1 |
| T-UI-02 Feature service (single cache) | ✅ PASS | 1 |
| T-UI-03 Nav entry + lazy route | ✅ PASS | 1 |
| T-UI-04 Page shell + tabs + summary | ✅ PASS | 1 |
| T-UI-05 By-project tab | ✅ PASS | 1 |
| T-UI-06 By-person tab (inversion) | ✅ PASS | 1 |
| T-UI-07 Assign/Edit SYNC modal | ✅ PASS | 2 (tokens FAIL→fixed) |
| T-UI-08 Stub picker sources | ✅ PASS | 1 |
| T-UI-09 Tests + coverage gate | ✅ PASS | 1 |

**Final state:** 9/9 tasks PASS. Full client suite 6869/6869 green; coverage floors met; module spec files tsc-clean; no regressions outside the module. Client-only (no server change; backend shipped + archived).

### ⚠ Carried to `/akili-validate` → `/akili-archive`
1. **RECONCILE design.md §5/§6** (T-UI-06 refinement): By-person is a `computed` inversion of `byProjectCache`; `byPersonCache`/`loadByPerson` retained in the service but UNUSED by the tab. Record as DD-UI-C-derived decision.
2. **Deferred / out of scope (by design):** History panel (R-UI-009 — no read endpoint yet); real People/Projects picker endpoints (stubbed behind `pi-delegate-picker-stub.service.ts` swap point + locator cases); managed-projects source for the page load + nav eligibility (`getProjectIds()` returns `[]` → empty state, per design §9 fallback).
3. **Advisory (separate task):** `alliance-sidebar` shared component carries a file-wide hex/off-token convention predating this feature — detox warrants its own task with full-suite regression (KZ-003).
4. **Minor advisories:** add a code comment that the modal's 0-people revoke-all branch is unreachable-by-design (Accept gated); the pre-existing 7 TS2352 in `alliance-sidebar.spec` are baseline (K-002).

---

## Correction Record — CR-01 (runtime NG04002 nav 404) — 2026-09-14

- **Reported by user (post-completion):** `RuntimeError: NG04002: Cannot match any routes. URL Segment: 'platform/my-pi-delegates'`.
- **Root cause:** design §9 specified the nav link as `/platform/my-pi-delegates`, but this app's platform shell is `path: ''` in `app.routes.ts`, so its children resolve at `/<child>` with **no `/platform/` prefix** (working siblings: `/home`, `/projects`, `/about-indicators`). No `platform` path segment exists anywhere. The route registration (`{ path: 'my-pi-delegates' }` child of the `''` shell → `/my-pi-delegates`) was CORRECT; only the sidebar nav **link string** was wrong. Compiled clean (default-export import, guard idiom all valid) but 404'd at navigation — the exact **KZ-017 gap the T-UI-03 reviewer named** ("`tsc` proves the route COMPILES but not that it RESOLVES at runtime"). A spec assumption error, invisible to build/unit/tsc, caught only by running the app.
- **Fix (Implementer T2, verified):** `alliance-sidebar.component.ts:60` link `/platform/my-pi-delegates` → `/my-pi-delegates`; `alliance-sidebar.component.spec.ts:179,181` assertion + title updated to `/my-pi-delegates` (test passes with the new value, would fail on the old — genuinely checks the link). `app.routes.ts` untouched (already correct). Verification: `grep "'/platform/"` → zero matches; `alliance-sidebar` suite 31/31; tsc app clean; eslint clean.
- **Spec corrected:** `design.md §9` link fixed + a ⚠ CORRECTION note added. Correction-closure sweep (both directions) confirms zero `platform/my-pi-delegates` in code; route path (`app.routes.ts:213`) and link (`sidebar.ts:60`) now agree at `/my-pi-delegates`.
- **Kaizen candidate (for archive):** a route/nav task's verification MUST include a runtime route-resolution check (boot + navigate, or an integration test that exercises the router), not just tsc + unit — a link-string/route-path mismatch is structurally invisible to compile+unit gates. Reinforces KZ-017.
