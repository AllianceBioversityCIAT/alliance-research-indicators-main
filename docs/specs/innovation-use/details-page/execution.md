# Execution Log — Results (Innovation Use) / Details Page (STAR)

- **Spec path:** `docs/specs/innovation-use/details-page`
- **Spec id:** 2026-08-innovation-use-details-page
- **Module:** results (`innovation-use`) — **client tier** (`client/research-indicators`)
- **Linked tasks:** [`./tasks.md`](./tasks.md) · **Requirements:** [`./requirements.md`](./requirements.md) · **Design:** [`./design.md`](./design.md) · **Judgment ledger:** [`./judgment.md`](./judgment.md)

---

## Document Control

| Field | Value |
| --- | --- |
| Approval Mode | **gated** — the continue/pause gate stops for the user after every task |
| Rework ceiling | 3 attempts per task |
| Triad | Leader (T1 · opus) → Implementer (`akili-implementer` · T2 · sonnet) → Reviewer (`akili-reviewer` · T3 · opus, read-only). `author ≠ auditor` holds on both model and context for every task below |
| Concurrency | **One task at a time in this checkout.** Two client tasks are not parallel-safe (root `CLAUDE.md` §4.3); `tasks.md` Document Control repeats the rule. No measurement command was run while a worker was active |
| Budget authority | [`design.md`](./design.md) §12 — 13 tasks · ~3,200 LOC · ~28 review rounds; **re-baselined by the user to ~4,600 LOC after T-07** (see the T-07 re-assessment below). **Amended 2026-08-26 by Amendment 01 to 14 tasks · ~3,400 (written) / ~4,800 (re-baseline) · ~31 rounds** — see §12's *Amendment 01 delta*. `tasks.md` §6 is a *derivation*, not a second budget |
| Budget tracking | Running actuals in the *Budget ledger* below. A breach stops execution and escalates; it is not absorbed silently |
| Advisory policy | `ADVISORY` findings are recorded here and **die here**. They never gate, never consume a rework attempt, and never mint or widen a task in this spec (`/akili-execute` §2.4) |

### Budget ledger

Actuals, re-derived per task with `git diff --stat`. Reconciled against `design.md` §12 at **T-13 c10**.

| Task | `tasks.md` §6 derivation | Actual LOC | Review rounds | Note |
| --- | --- | --- | --- | --- |
| T-01 | 210 | **344** (+344 / −1, 6 files) | 1 | Over its derivation line by 134. Cause: the spec tier is larger than estimated — 252 of the 344 lines are test code across two spec files. See T-01's *Decisions* |
| T-02 | 72 | **133** (+133 / −0, 3 files) | 2 | Over its derivation line by 61 — impl 4 lines against 12 budgeted, spec ~129 against 60. Cause: c1 inlines the TestBed setup that `renderNumberInput()` already encapsulates (~22 duplicated lines), plus the rework additions. Recorded, not reconciled |
| T-03 | 170 | **90** (+90 / −8, 4 files; 3 `git mv` renames) | 1 | **Under** its derivation line by 80 — the first task to come in below estimate. Cause: the move carried the bulk of the code, so only the two inputs, the template branch and 5 new `it` blocks are new lines |
| T-04 | 300 | **363** (+363 / −0, 3 new files) | 2 | Over by 63. 270 of the 363 lines are the spec file — the **spec tier over-runs again**, matching T-01/T-02 and unlike T-03's move |
| T-05 | 610 | **688** (+688 / −0, 3 new files) | 2 | Over by 78. 424 of 688 are the spec file. **Spec-tier over-run again**, fifth task, same direction |
| T-06 | 600 | **824** (+824 / −0, 3 new files) | 2 | Over by 224 — the largest single-task overrun so far. 500 of 824 are the spec file |
| T-07 | 680 | **1,021** (+1,021 / −0, 3 new files) | 2 | Over by 341 — the largest overrun. 677 of 1,021 are the spec file |
| T-08 | 400 | **1,081** (+1,081 / −14, 3 files) | 3 | **2.7× its derivation** — the largest overrun of the run. 806 of 1,081 are the spec file |
| T-09 | 160 | **327** (+327 / −2, 3 files) | 2 | 2.0× derivation; attempt-1 FAIL (whitespace silent block) closed by page-owned message. Running total **4,871** |
| T-10 … T-13 | — | — | — | **Actuals live in T-13's `c10` reconciliation table below, their single home** (KZ-005: a measured figure gets ONE home and cites its deriving command — `git show --numstat` per task commit). Not restated here |
| **T-14** | *(no §6 line — added by Amendment 01; budgeted in `design.md` §12's delta at +180…+260)* | **457** (+457 / −3, 3 files) | **1** | ⚠️ **Tripwire breach: ~1.8–2.5× the +180…+260 band.** 352 of 457 are the spec file — **the spec-tier over-run pattern holds for a tenth task.** Cause is the Leader's `tdd` assignment (each falsifying input became a permanent regression test), not scope creep. Escalated to the user, not absorbed |
| **Running total** | **3,202** | **4,871** | **17** | ⚠️ Above re-baseline ~4,600; continuing under the T-07/T-08 ruling. T-13 c10 reconciles. Against §12's ~3,200 LOC / ~28 rounds. **No tripwire breach** — 17.7% of §12's ~3,200 LOC and 14.3% of its ~28 review rounds, spent on 3 of 13 tasks (23.1%). **Now tracking ahead of budget, not behind.** The T-01/T-02 overrun pattern (spec tier larger than derived) did **not** hold for T-03, which came in 80 lines under because a `git mv` carries code without authoring it. Cumulative variance is **+178 lines on a 752-line derivation (+23.7%)**, and the cause is now consistent enough to name: **every task whose deliverable includes new spec files over-runs, and the over-run is entirely in the spec tier** (T-01 +134, T-02 +61, T-04 +63; T-03, a move, came in 80 **under**). Implementation lines track the derivation closely. **Projection: §12's ~1,500-line spec estimate is the figure that will drift, not its ~1,700 implementation line.** The trend is now confirmed across five tasks at **+18.8% cumulative** (1,618 actual vs 1,362 derived), and it has *narrowed* from +23.7% because T-05's over-run was proportionally smaller. **Every task shipping new spec files over-runs, always in the spec tier; the one move task came in under.** Implementation lines track the derivation closely. **Projection: §12's ~1,500-line spec estimate is what drifts, not its ~1,700 implementation line — a ~3,800 total.** No tripwire *breach*: §12 gates the total and T-13 c10 owns reconciliation. Review rounds are the healthier number — **8 used against ~28 budgeted for 5 of 13 tasks**, i.e. tracking *under*. Re-assess at **T-07**, the largest task |

---

## Task Execution History

### T-01 — Contract layer: view interfaces, `ApiService` methods, level catalog service

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** |
| **Date** | 2026-08-20 |
| **Implementer attempts** | **1** |
| **Effort / skills assigned** | `medium` · `angular-developer`, `tdd` |
| **Requirements covered** | R-IUP-004 (AC.4), R-IUP-005 (catalog source), R-IUP-016 (AC.1/AC.2 mechanism), NFR-IUP-005, NFR-IUP-006 |
| **Commit** | see the `[SPEC:docs/specs/innovation-use/details-page]` commit for T-01 |

#### Leader deviations from the task file, recorded

| Deviation | Reason |
| --- | --- |
| Added **`tdd`** to the task's listed skills (`angular-developer` only) | T-01 is a contract implementation whose done criteria carry explicit falsifying inputs. Red-then-green is what makes c2/c3 real assertions rather than presence checks — the exact failure their Disqualifiers name |
| The brief's exemplar note was **wrong** | It cited `api.service.spec.ts` as an exemplar of "existing `HttpTestingController` assertion style". That file's existing ~2,280 lines use a different pattern (mocked `ToPromiseService` + `toHaveBeenCalledWith`). The Implementer caught this by grep and applied the correct precedence — `design.md` §10.2 and the task's Disqualifier over the Leader's exemplar. Recorded as a Leader briefing error, not an Implementer deviation |

#### Attempt 1

**Files changed** (6)

| File | Change |
| --- | --- |
| `shared/interfaces/get-innovation-use-details.interface.ts` | new — `GetInnovationUseDetails`, `InnovationUseActor`, `InnovationUseOrganization`, `InnovationUseQuantification` as classes with defaulted fields |
| `shared/interfaces/get-innovation-use-levels.interface.ts` | new — `InnovationUseLevel` (`id`, `level`, `name`, `definition`; **no** `additional_guidance`) |
| `shared/services/api.service.ts` | +3 methods, +2 interface imports |
| `shared/services/control-list/get-innovation-use-levels.service.ts` | new — root-provided, `constructor → main()` |
| `shared/services/control-list/get-innovation-use-levels.service.spec.ts` | new |
| `shared/services/api.service.spec.ts` | updated — new `describe` block on `HttpTestingController`, appended rather than retrofitted |

**Methods delivered** — matching `design.md` §4.1

| Method | Verb + path | Config |
| --- | --- | --- |
| `GET_InnovationUseDetails(resultCode)` | `GET results/innovation-use/:resultCode` | `{ loadingTrigger: true, useResultInterceptor: true }` |
| `PATCH_InnovationUseDetails(resultCode, body)` | `PATCH results/innovation-use/:resultCode` | `{ useResultInterceptor: true }` — no `loadingTrigger` |
| `GET_InnovationUseLevels()` | `GET tools/clarisa/innovation-use-levels` | `{}` — default |

**Verification — Implementer**

| Command | Package root | Result |
| --- | --- | --- |
| `npm test -- --silent` | `client/research-indicators/` | **Green. `Test Suites: 308 passed, 308 total` · `Tests: 6342 passed, 6342 total`.** Full run — no filter, no pattern (KZ-003 satisfied; the run is evidence, not inconclusive) |
| coverage (same run) | `client/research-indicators/` | statements 99.17% · branches 98.23% · functions 99.04% · lines 99.38% — against floors 40 / 20 / 45 / 30 |
| `npm run lint -- --quiet` | `client/research-indicators/` | `All files pass linting.` `git status --porcelain` re-inspected after; **lint mutated nothing** (the script carries `--fix`, so this re-check is mandatory, not optional) |

**Falsifying input — executed, not asserted**

Dropped `loadingTrigger` from `GET_InnovationUseDetails`'s config → c2's assertion **failed as predicted**: `expect(cacheServiceStub.currentResultIsLoading()).toBe(true)` → `Received: false`. Restored and re-ran green. c2 is therefore asserting the config's *contents*, not the object's existence — which is what T-01's Falsifying-input clause exists to establish.

**Reviewer verdict: `STATUS: PASS`**

> All five T-01 done criteria are discharged. The three ApiService methods match design.md §4.1's verbs, paths and configs exactly and are asserted through HttpTestingController against a real ApiService + real ToPromiseService on the MainResponse\<T\> envelope; the four view shapes match §4.2 field-for-field with no missing, extra or mistyped member; InnovationUseLevel carries no additional_guidance and the key-absence assertion is genuinely falsifiable under this repo's `useDefineForClassFields: false`; the level service is a faithful root-provided mirror of GetInnovationReadinessLevelsService; and the full 308-suite run, coverage and lint evidence all come from the correct package root. Two assertions (the PATCH's "no loadingTrigger" and c4's singleton identity) are weaker than their criteria read — recorded as advisories, since in both cases the implementation is correct by inspection and neither is the criterion's named falsifying input.

**Per-criterion disposition** (all five reported, including those with nothing to report — KZ-007)

| # | Criterion | Verdict | Evidence |
| --- | --- | --- | --- |
| c1 | Verb + path via `HttpTestingController` on the envelope | ✅ | 3 `it` blocks, one per method, asserting `req.request.method` + full URL; `response.data` / `response.successfulRequest` read. Reviewer corroborated the paths server-side (`main.routes.ts:119`, `clarisa.module.ts`). `httpMock.verify()` in `afterEach`. T-01's mocked-`ApiService` Disqualifier avoided |
| c2 | Per-method config asymmetry | ✅ | GET, catalog GET: both halves falsifiable, named falsifying input executed. PATCH: header half falsifiable; **the "no `loadingTrigger`" half is structurally inert** — see Advisory 1. Not gated: the implementation is correct against §4.1, and the criterion's named falsifying input is scoped to the GET |
| c3 | `InnovationUseLevel` has no `additional_guidance` | ✅ | `'additional_guidance' in level === false` + exact key-set equality. Reviewer independently verified falsifiability via `tsconfig.json`'s `useDefineForClassFields: false` — initialized fields emit constructor assignments, so the realistic mutation puts the key on the instance and fails both assertions. Residual type-level gap in Advisory 3 |
| c4 | Loads once; second consumer does not re-issue | ✅ | Implementation is a byte-level mirror of `GetInnovationReadinessLevelsService` (`providedIn: 'root'`, `constructor → main()`, signals). **The assertion is weaker than the criterion's wording** — Advisory 2. Not gated: `tasks.md` gives c4 no falsifying input, `design.md` §10.2 lists no row for this spec file, and the property holds by inspection |
| c5 | Full suite green; lint clean; `git status` re-inspected | ✅ | See the verification table above. Correct package root, unfiltered run |

**`design.md` §4.2 conformance** — Reviewer checked every field rather than sampling: `GetInnovationUseDetails` 6/6, `InnovationUseActor` 10/10 (including `total`, marked never-sent), `InnovationUseOrganization` 7/7, `InnovationUseQuantification` 4/4. No missing, extra, mistyped or wrongly defaulted member. `GetInnovationDetails.Actor` / `.InstitutionType` correctly **not** aliased (§4.2's warning).

**Constitutional invariants** — all clear: no `HttpClient` outside `ApiService` (`provideHttpClient()` appears only inside a spec's `TestBed`); `MainResponse<T>` typed and `successfulRequest` asserted; no `service-locator` registration (§7); no new path alias or `tsconfig`/`jest.config` change (§7); catalog read from CLARISA with no hardcoded level array in production code (NFR-IUP-005); signals, no NgRx, no NgModule (NFR-IUP-006). No template or style surface in this diff, so no hex/token exposure.

#### Decisions made

1. **Assertion route for `loadingTrigger` (upheld).** `loadingTrigger` is not exposed as a header — it drives `CacheService.currentResultIsLoading` / `greenChecks` and a follow-up green-checks GET in `finalize`. The Implementer asserted it through those observable side effects. The Reviewer verified this against `to-promise.service.ts` (lines 15–36, 147–155) rather than trusting the diff's comment, and confirmed it is the only observable route.
2. **`X-Use-Year` really is what `useResultInterceptor` produces** — verified at `to-promise.service.ts` `get` (81–83) and `patch` (135–137). The test observes the header because the new `TestBed` uses bare `provideHttpClient()`, so `resultInterceptor` (which strips it) is not registered. Correct by construction, not by luck.
3. **A separate `describe` block, not a retrofit.** The existing block's `beforeEach` replaces `ToPromiseService` wholesale and cannot intercept real HTTP. Appending was necessary, not stylistic — and it left the existing 2,280 lines untouched.
4. **`isOpenSearch = signal(false)` on the new service is conformance, not drift.** §2.1 and the scope table both order "mirroring `GetInnovationReadinessLevelsService`", which carries that signal.
5. **Leader added comment-only traceability markers after the PASS**, per `/akili-execute` Step 3.4: a single `// @akili-spec docs/specs/innovation-use/details-page (T-01 — contract layer)` line at the head of the three new production files. Comment-only — no logic, no reviewed content altered. `npm run lint -- --quiet` re-run afterwards: `All files pass linting.`, and `git status` re-inspected (the `--fix` hazard) — nothing mutated. Recorded here because touching a diff after its verdict should never be silent. **Future briefs will ask the Implementer to include the marker**, so this is not repeated as a post-hoc Leader edit.
6. **LOC over the §6 derivation line, reported rather than reconciled.** 344 actual vs 210 derived. 252 of the 344 lines are test code. `tasks.md` §6 is explicitly a derivation for sequencing, not a budget; §12 is the budget and is not breached. Recorded so T-13 c10 compares against a known delta instead of discovering one.

#### `ADVISORY` — 4R lens findings (recorded; **not** gating, **not** rework, **not** new tasks)

Each carries a reachability verdict per **KZ-008**.

| # | Lens | Finding | Reachability verdict | Disposition |
| --- | --- | --- | --- | --- |
| 1 | **Reliability** — test blindness | `ToPromiseService.patch` never forwards `config.loadingTrigger` to `TP()` (line 139 passes no second argument, unlike `get` at 99). So c2's PATCH half cannot fail | **Constructed.** Adding `loadingTrigger: true` to the PATCH config leaves both guarding assertions green — the key is discarded before it can have an effect | **Pure test blindness, no product consequence:** the same mechanism that hides the mutation makes it behaviourally inert. Reviewer's suggestion — a comment naming the assertions as structural — is noted for whoever next opens the file |
| 2 | **Reliability** — test blindness | Listing `GetInnovationUseLevelsService` in the `TestBed` `providers` array overrides its `providedIn: 'root'`, so c4's test never exercises root-provision | **Reachable.** A bare `@Injectable()` keeps this spec green while the app loses its only provider | **Bounded and loud, not silent:** any injecting component throws `NullInjectorError` at runtime and T-04's stepper spec fails immediately. Cannot ship as quiet breakage |
| 3 | **Readability** — c3 residual gap | The runtime key check catches an initialized `additional_guidance` but not a declaration-only `additional_guidance?: string`, which emits no runtime key under `useDefineForClassFields: false` | n/a — type-level | **Not a shortfall against c3**, which prescribes the runtime approach. A `@ts-expect-error` companion would close the type-level half |
| 4 | **Resilience** | `GetInnovationUseLevelsService.main()` reads `response?.data` without consulting `successfulRequest`, so a failed catalog load renders as an **empty catalog** | **Reachable, traced concretely.** A 500 yields `{...error, successfulRequest: false}` with no `data` → `list.set([])` → the stepper renders §5.3's *empty catalog* state, indistinguishable from a genuinely empty one | **DD-11's failure mode one level down** (catalog, not record) — materially lower severity: nothing is written, so no data-loss path; the user is blocked from selecting a level with only the global `httpErrorInterceptor` toast as signal. Not filed as an issue because `GetInnovationReadinessLevelsService` behaves identically and T-01 is *instructed* to mirror it — diverging would be unrequested scope. **Carried to T-04 as briefing context**, whose c5 asserts the zero-button rendering and will therefore also be asserting the failure rendering |
| 5 | **Risk (KZ-001)** | The `Object.create(prototype)` block's hand-rolled signal doubles (`list = jest.fn(() => [])` with `.set = jest.fn()`) do not evaluate what they stand in for — `.set(x)` never changes what `list()` returns | n/a — test-internal | **Mitigated in the same file:** the `constructor calls main` and c4 tests build real instances through `TestBed` with real signals and assert `realService.list()` / `realService.loading()`. Reviewer verified the block is a line-for-line clone of the existing `get-innovation-readiness-levels.service.spec.ts` — **inherited, not introduced**, and gating on it would gate the instruction |

**Forward pointer for T-04** — Advisory 4. When T-04's brief is composed, carry it: T-04 c5 asserts "an empty `levels` array renders zero buttons and the required message", and that same rendering is what a failed catalog load produces. This pointer is carried by the brief or by nobody.

#### Issues encountered

**Reviewer spawn died mid-run on an API session limit** (`You've hit your session limit`) — an *environment* blocker, not a work FAIL. Per `/akili-execute`'s per-role runtime-failure fallback, the Reviewer was **retried once** rather than degraded: it was resumed with its brief and the diff intact once the limit reset, and returned its verdict. **The Reviewer was never run inline** — `author ≠ auditor` is a correctness constraint and an infrastructure failure does not suspend it. No rework attempt was consumed, because no work FAIL occurred.

#### Final verification result

Full client suite green (308/308 suites · 6342/6342 tests), coverage well above all four floors, lint clean with `git status` re-inspected, and the criterion's own falsifying input executed and confirmed failing. **T-01 closed on attempt 1.**

---

### T-02 — `app-input` gains an optional `maxFractionDigits` passthrough

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 2** (1 rework round) |
| **Date** | 2026-08-20 |
| **Implementer attempts** | **2** of a 3-attempt ceiling |
| **Effort / skills assigned** | attempt 1 `medium` · attempt 2 `high` (rework bump) · `angular-developer` |
| **Requirements covered** | R-IUP-008 (AC.2, AC.4), R-IUP-019 (AC.1, AC.3) |

#### Leader deviations from the task file, recorded

| Deviation | Reason |
| --- | --- |
| Did **not** add `tdd`, unlike T-01 | The criterion that matters here (c2) is a *regression guard* that must pass both before and after the change — not a failing-then-passing test. Red-green does not model it. The equivalent discipline was given as an explicit instruction instead: capture the baseline assertion and confirm it passes **before** editing. The Implementer did so (59/59 pre-edit) |

#### Attempt 1 — Reviewer `STATUS: FAIL`

**Files changed** (3): `input.component.ts` (+`@Input() maxFractionDigits?: number`, no default), `input.component.html` (`[maxFractionDigits]` forwarded on the `p-inputNumber` branch), `input.component.spec.ts` (new top-level `describe` rendering the real template — the pre-existing suite overrides the template with `''` and never renders `p-inputNumber`).

**Verification — Implementer:** `npm test -- --silent` full run from `client/research-indicators/` → `Test Suites: 308 passed, 308 total` · `Tests: 6345 passed, 6345 total` (+3 over T-01's 6342). Coverage 99.17 / 98.23 / 99.04 / 99.38. `npm run lint -- --quiet` → `All files pass linting.`, `git status` re-inspected after, nothing mutated. Baseline confirmed: c2 and c3 were run against unmodified code first (59/59) — so the regression guard is known to have held pre-edit. Falsifying input executed: a `= 0` default made c2 fail (`Received: 0`), then reverted.

**The decisive question, resolved in the Implementer's favour.** T-02's whole purpose is to be behaviour-preserving for 7 existing `type="number"` call sites, and the diff makes `[maxFractionDigits]` an **unconditional** binding that receives `undefined` when callers omit it. The Leader put the resulting risk to the Reviewer as the review's gating question: is bound-but-`undefined` behaviourally identical to *no binding*, or does it silently change `Intl` resolution for all 7? The Reviewer answered from the pinned `primeng@19.0.6` source rather than from the diff's comments:

| Link in the chain | Finding |
| --- | --- |
| The `@Input` transform | `(value) => numberAttribute(value, null)` — PrimeNG passes an explicit `null` fallback, **overriding** Angular's `NaN` default. So bound-`undefined` → `null`, **not** `NaN` |
| `getOptions()` | `maximumFractionDigits: this.maxFractionDigits ?? undefined` — `null ?? undefined` is `undefined`, a byte-identical options object to the unbound case. **No `null`→`0` coercion, no `RangeError`** |
| Other read sites | Null/undefined-agnostic (`&& this.maxFractionDigits`; `resolvedOptions()` off the identical formatter) |
| Re-initialisation | `ngOnChanges` now *does* see a first-pass `SimpleChange` and calls `updateConstructParser()` where it previously did not — but that method is guarded by `this.initialized`, set only in `ngOnInit`, which Angular runs **after** `ngOnChanges` on the first pass. **Net: zero extra `constructParser()` calls** |
| Empirical corroboration | `capacity-sharing.component.html` hides its GROUP TRAINING block with `[class.hidden]`, **not `@if`**, and its spec mocks `currentResultIsLoading` to `false` — so that fixture constructs **four real `p-inputNumber` instances through the new binding** and runs `Intl.NumberFormat` on them. A throw-class regression would have surfaced |

**Verdict: no formatting change reaches any of the 7 existing call sites.** `strictTemplates` also confirmed safe via `ngAcceptInputType_maxFractionDigits: unknown` — worth recording because `ts-jest` does not run the template type checker, so the green suite alone would not have proven it.

**FAIL issue (verbatim from the Reviewer)**

> **Discovered Issue:** c3 asserts only the *pasted* minus sign. The criterion requires a typed **and** a pasted one, and the test's own name was narrowed to "blocks a pasted minus sign". A grep of the whole spec file for the typed path returns nothing […] §6.3 row 1 (typed `-`) is therefore unasserted.
> Secondary, same test: both assertions are negative (`not.toHaveBeenCalled`, `not.toBe(-1)`), so c3 would also pass if the paste never reached PrimeNG at all. I verified by source read that it *does* reach the guard — `parseValue('-1')` returns `-1`, not `null`, so `insert()` is entered and `allowMinusSign()` (`0 == null || 0 < 0` → false) is what returns early — but the test does not establish it.
>
> **Violated Rule:** `tasks.md` → `### T-02` c3: "`[min]="0"` continues to block a **typed and a pasted** minus sign (§6.3 rows 1–2), unchanged." Compounded by §5 clause-closure **row 16**, which assigns R-IUP-008's "BUT NOT rely on the server's `@Min(0)` as the only line of defence" to **T-02 c1/c3**.
>
> **Remediation Suggestion:** On the same rendered fixture, add the typed half — `inputNumberInstance.onInputKeyPress({ which: 45, code: 'Minus', preventDefault: jest.fn() } as unknown as KeyboardEvent)` — then the same two assertions. […] Restore the test name to name both halves. Add a positive control in the same test — paste `'1'` and assert `setValue` **was** called with `1` — so the negative assertions mean "blocked", not "nothing wired".

**Per-criterion disposition, attempt 1** (all four reported — KZ-007)

| # | Verdict | Note |
| --- | --- | --- |
| c1 | ✅ | `By.directive(InputNumber)` off the real template; the value traversed both the template binding and PrimeNG's transform. A genuine rendered-binding assertion, not a property assertion in disguise |
| c2 | ✅ | Literal satisfaction confirmed. The `?? undefined` normalisation spans a **provably behaviour-identical** pair (`null`/`undefined` both resolve to `maximumFractionDigits: undefined`), so it is legitimate — but it catches only the named mutation class. See Advisory 2 |
| c3 | ❌ **FAIL** | Typed half unasserted; both assertions negative with no positive control |
| c4 | ✅ | Full unfiltered run, correct package root. On blindness: the suite is **not** blind to a throw-class regression (verified above), but **is** blind to a *silent* formatting change — no spec in the repo asserts resolved `Intl` options or rendered numeric text. That branch was falsified by the source read instead, which is exactly what §6.3 and DD-4 demand |

**Leader adjudication.** The FAIL is in scope, specific, and cites the criterion's own wording — c3 says "typed **and** a pasted". Not a spec defect, so no Pivot; a rework attempt is the right instrument. Attempt 2 dispatched at effort `high` with the report above passed **verbatim** and a three-item scope: add the typed assertion, add the positive control, restore the test name. The implementation files were explicitly placed **out of scope** for the rework — they passed review and changing them would put a reviewed result back at risk.

#### Attempt 2 — Reviewer `STATUS: PASS`

**Files changed** (1): `input.component.spec.ts` only. The Leader verified inline that `input.component.ts` and `input.component.html` are byte-identical to the state reviewed in attempt 1 — 4 added lines, zero deletions, same content — because the attempt-2 PASS carries c1/c2 forward on exactly that premise.

**Scope delivered** — the three assigned items, nothing wider:

1. Typed-minus assertion added via `inputNumberInstance.onInputKeyPress({ which: 45, code: 'Minus', … })`.
2. Positive control added: pasting `'1'` asserts `setValue` **was** called with `1`, so the two negative assertions mean *blocked* rather than *never reached* (KZ-001).
3. Test name restored to `'c3 — [min]="0" continues to block a typed and a pasted minus sign'`, matching c3's own wording.

**Verification — Implementer:** `npm test -- --silent` full unfiltered from `client/research-indicators/` → `Test Suites: 308 passed, 308 total` · `Tests: 6345 passed, 6345 total`. Test count is unchanged from attempt 1 because the new assertions live inside the existing `it` — noted so the flat count is not mistaken for "nothing was added". Coverage 99.17 / 98.23 / 99.04 / 99.38. `npm run lint -- --quiet` → `All files pass linting.`, `git status --short` identical before and after.

**Falsifiability of the typed half — probed, not asserted.** Setting `component.min = -1` (the only probe class that flips `allowMinusSign()`, which is `min == null || min < 0`) made the test fail with the spy called once with the **string** `"-"`. Reverted with a verified zero diff. The Implementer also reported that `min = 5` does *not* defeat the guard — evidence it understood that a probe which changes nothing proves nothing.

**Reviewer re-audit.** The same Reviewer was resumed rather than replaced: it already held the pinned PrimeNG source in context, and re-auditing the Implementer's fix is not self-verification. It was explicitly instructed to be adversarial about its own remediation. It enumerated **every** exit between `onInputKeyPress` entry and the guard to rule out a green-for-the-wrong-reason:

| Candidate short-circuit | Ruled out because |
| --- | --- |
| `this.readonly` | `readonly = false` is a hard default (`primeng-inputnumber.mjs:591`) and `input.component.html` never binds it. **This was the only candidate for a silent green, and it is closed** |
| `this.input.nativeElement` unresolved | The `<input #input>` at `:1704-1743` is unconditional, so the ViewChild resolves. Decisively: had it not, the destructure at `:1238` would throw a `TypeError` and fail **loudly** — this can never be a quiet pass |
| `selectionStart` on an unfocused element | The element carries `inputmode="decimal"` and no `type` attribute, so it is `type="text"` and jsdom's selection API returns `0`/`0` rather than `null`, without throwing |
| `this.maxlength` | Unbound, `undefined`, so the `:1248` branch is skipped |
| `isMinusSign('-')` | `:1274` tests `char === '-'` as a hard literal — true unconditionally, independent of locale or `constructParser` state |

So `:1251-1252` reaches `insert(event, '-', { isMinusSign: true })`, which returns at `:1316-1318`. **The typed half is genuinely asserted.** The Reviewer also validated the `min = -1` probe as sound on the strength of its *artifact*: the spy landing on the **string** `"-"` is precisely what its independent character-level trace predicts, and a fabricated or mis-traced probe would not land on the string form.

**Spy ordering judged sound.** The spy is created post-render with zero calls; both negative assertions precede the only call-producing interaction, so cumulative counting *strengthens* the second `not.toHaveBeenCalled()`. `toHaveBeenCalledWith(1)` cannot mask an earlier call because the count was already pinned at 0 and jest aborts on first failure. The reverse ordering would have been broken; as written it is the only ordering that works — and both halves keep independent mutation coverage, since a mutation local to `onPaste` is caught *only* by the paste assertions.

**Per-criterion disposition, attempt 2** (all four — KZ-007)

| # | Verdict | Note |
| --- | --- | --- |
| c1 | ✅ | Carried forward; implementation byte-identical, verified |
| c2 | ✅ | Assertion unchanged. Citation corrected — see below |
| c3 | ✅ | Both §6.3 rows 1–2 exercised, with a positive control |
| c4 | ✅ | Full unfiltered run, correct package root, coverage above all floors |

**Non-gating correction applied, recorded because it was Leader-authorised.** Attempt 1's c2 comment attributed the expression `this.maxFractionDigits ?? undefined` to `design.md` §6.3, which does not contain it (§6.3 states the *resolved value* `3`, not the operator). The Leader authorised the fix as a correction to a false claim **the same diff had introduced** — not new scope, and explicitly non-gating. The citation now names `getOptions()` in `primeng@19.0.6`'s `primeng-inputnumber.mjs` (verified at `:836-837`), in DD-12 / D-IUP-8 form (symbols and anchors, not line numbers). Judged accurate by the Reviewer.

#### Decisions made

1. **The rework was the right instrument, not a Pivot.** The FAIL cited c3's own wording ("typed **and** a pasted"), so the spec was right and the evidence was short. No spec defect, no Pivot.
2. **Implementation files were placed out of scope for the rework.** They had already passed review; reopening them would put a reviewed result back at risk for a test-only defect. The Leader verified byte-identity afterwards rather than trusting the report.
3. **The decisive risk was resolved by source read, not by the green suite.** The suite is *not* blind to a throw-class regression — `capacity-sharing.component.spec.ts` constructs four real `p-inputNumber` instances through the new binding — but it **is** blind to a silent formatting change, since no spec in the repo asserts resolved `Intl` options or rendered numeric text. That branch was closed by reading pinned PrimeNG source, which is exactly what §6.3 and DD-4 require. Recorded because it is the general shape of this spec's risk: *a green client suite does not prove a PrimeNG behaviour claim.*
4. **`strictTemplates` conformance is not proven by the suite.** `ts-jest` does not run Angular's template type checker. The binding is safe because `primeng/inputnumber/inputnumber.d.ts` declares `static ngAcceptInputType_maxFractionDigits: unknown`. **T-13 c5's `npm run build` is the first check that would actually catch a template-type error in this spec** — worth knowing before then.

#### `ADVISORY` — 4R lens findings (recorded; **not** gating, **not** rework, **not** new tasks)

| # | Lens | Finding | Reachability verdict | Disposition |
| --- | --- | --- | --- | --- |
| 1 | **Reliability** | The positive control is a *paste*, so it proves the paste entry point is wired, not the typed one. If `onInputKeyPress` ever began short-circuiting, the typed assertion would go green and the paste-based control would not catch it | **Reachable in principle.** Currently covered by evidence *outside* the repo — the Reviewer's source trace and the `min = -1` probe, both recorded only in this log | The Reviewer's two-line suggestion (a typed positive control with `which: 49` / `code: 'Digit1'`, asserting `setValue` called with `1`) would move that evidence into the repo. **Not actioned:** advisories never widen an approved task. Noted for whoever next opens this file |
| 2 | **Readability** | `expect(component.body().value).not.toBe(-1)` **cannot fail** after the typed block — an unblocked typed `-` yields the *string* `'-'`, not the number `-1` (`parseValue` returns `filteredText` unconverted at `:962-964`). It reads as value-level coverage the typed path does not have | n/a | Harmless: the typed half is carried entirely by the adjacent `expect(setValueSpy).not.toHaveBeenCalled()`, which the probe proved does fire. The same assertion **is** load-bearing in the paste block, where `'-1'` parses to the number `-1` |
| 3 | **Readability** | The `min = -1` probe write-up is under-specified — `component.min = -1` alone does not reach `inputNumberInstance.min` without a `detectChanges`, and the test's own `expect(inputNumberInstance.min).toBe(0)` would have failed first had it propagated | n/a | The observed outcome is only producible with `allowMinusSign()` true, so the probe did what it claims; the *record* just does not say how the value crossed the binding. Evidence hygiene, not a defect |
| 4 | **Readability** | c1 still inlines the ~20-line TestBed setup `renderNumberInput()` already encapsulates; a `maxFractionDigits?: number` parameter would remove ~22 lines | n/a | This is most of the gap between 133 actual insertions and §6's 72-line derivation. Recorded in the budget ledger, not gated — §12 holds budget authority and its aggregate tripwire is untouched |
| 5 | **Risk** (carried from attempt 1, reachability re-verified) | The no-behaviour-change guarantee rests on the `, null` argument in PrimeNG's `(value) => numberAttribute(value, null)` (`:1677`, `:1926-1928`), **not** on `numberAttribute`, whose own default is `NaN` — and `NaN ?? undefined` is `NaN`, which makes `new Intl.NumberFormat(locale, { maximumFractionDigits: NaN })` throw `RangeError` inside `constructParser()` | **Not reachable at `primeng@19.0.6`** — both sites carry the `null` fallback, verified. Reachable only on an upgrade that drops it | Would fail **loudly**, not silently: `capacity-sharing.component.spec.ts` constructs four real instances through this binding. **This is a PrimeNG-upgrade tripwire for the repo, wider than this spec** — recorded here because that is where it was found, and correctly left unactioned as out of scope |

#### Issues encountered

One rework round, cause recorded above. No environment blockers this task (unlike T-01, whose Reviewer died on a session limit).

#### Final verification result

Full client suite green (308/308 suites · 6345/6345 tests), coverage above all four floors, lint clean with `git status` re-inspected, both `§6.3` rows exercised with a positive control, and the typed half's falsifiability probed rather than asserted. **T-02 closed on attempt 2 of 3.**

---

### T-03 — Promote `QuantificationItemComponent` to `shared/` with two default-preserving inputs

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 1** |
| **Date** | 2026-08-20 |
| **Implementer attempts** | **1** |
| **Effort / skills assigned** | `high` · `angular-developer` |
| **Requirements covered** | R-IUP-008 (AC.2/AC.4 for `quantification_number`), R-IUP-012 (AC.1, AC.3, AC.4), R-IUP-019 (AC.1, AC.2, AC.3) |

#### Leader deviations from the task file, recorded

| Deviation | Reason |
| --- | --- |
| Effort raised to `high` (a size-M task would default to `medium`) | The implementation is ~14 lines, but this is a **file move with a live regression surface at two OICR call sites**, and the task's own Falsifying-input clause states OICR's existing spec **cannot** detect the failure mode. The risk is precision, not volume |
| Brief pre-supplied the field-asymmetry table, the consumer inventory, and T-02's settled PrimeNG finding | Ground truth the Leader had already confirmed inline. Re-deriving it would have cost the worker context for no gain, and re-litigating T-02's `numberAttribute(value, null)` conclusion would have risked a *different* answer to a settled question |

#### Attempt 1

**Files changed** (4 — 3 of them `git mv` renames, history preserved)

| File | Change |
| --- | --- |
| `shared/components/quantification-item/quantification-item.component.ts` | **moved** from `pages/…/oicr-details/components/` · `+ @Input() fieldsRequired = true` · `+ @Input() maxFractionDigits?: number` (no default) |
| `…/quantification-item.component.html` | **moved** · three labels branch the asterisk on `fieldsRequired` · `[isRequired]`/`[validateEmpty]` bound to `fieldsRequired` · `[maxFractionDigits]` forwarded to the Number field |
| `…/quantification-item.component.spec.ts` | **moved** · +73 lines, 5 new `it` blocks |
| `pages/…/oicr-details/oicr-details.component.ts` | **import path only** — relative → `@components/quantification-item/quantification-item.component` |

**Untouched, verified by command:** `oicr-details.component.html` (c4) and `oicr-details.component.spec.ts` (which declares its own *fake* component with the same selector and never imports the real one — that is what makes c5 achievable without an import-path exception).

**Verification — Implementer**

| Command | Result |
| --- | --- |
| `git diff --exit-code -- src/…/oicr-details/oicr-details.component.html` | **exit 0** — c4 discharged by the required mechanism, not by eye |
| `npm test -- --silent` (full, unfiltered) | `Test Suites: 308 passed, 308 total` · `Tests: 6350 passed, 6350 total`, exit 0 |
| `npm run lint -- --quiet` | `All files pass linting.`, exit 0; `git status --short` identical before/after — no mutation |

**Baseline captured before editing** (the method this spec now uses for every regression guard): the field-by-field assertion was written and run against the **pre-change** component — 27/27 green — then again after the inputs were added — 31/31 green. A regression guard is only trustworthy if you know it held before the change.

**Falsifying input — executed.** Flipped the `fieldsRequired` default to `false` → `Tests: 2 failed, 29 passed, 31 total`, failing on `expect(numberInput.isRequired).toBe(true) // Received: false` plus `defaults to true`. Restored, 31/31 green. This is the criterion whose falsifiability the task says must be **created, not inherited** — and it was.

**Correction sweep (KZ-005), bounded on every axis.** Old-path grep (`oicr-details/components/quantification-item` *and* `./components/quantification-item`) across `src/`, `jest.config.ts`, `tsconfig.json` → **zero hits**. New-path grep → resolves at every site: the three moved files, the OICR alias import, the two `oicr-details.component.html` selector usages, and the OICR spec's fake component. No barrel `index.ts` exists to update. Reviewer independently re-ran the old-path grep across the whole client package and confirmed zero.

**Reviewer verdict: `STATUS: PASS`**

> All six criteria are met — the move is clean (zero old-path references, both aliases resolve, no relative-import fixups needed), both new inputs are default-preserving, c4 was discharged by the required `git diff --exit-code`, and the full 6350-test suite is green with zero OICR spec edits. The moved template that OICR renders was audited directly, not inferred from c4: with `fieldsRequired = true` the rendered label text, spacing and visual output are unchanged, the inline `@if` adding only a non-rendering comment anchor.

**Per-criterion disposition** (all six — KZ-007)

| # | Verdict | Evidence |
| --- | --- | --- |
| c1 | ✅ **Met — asymmetry half satisfied *structurally*, not evidentially** | `fieldsRequired = true`; `defaults to true` asserted; Number/Unit `isRequired`+`validateEmpty` asserted on the **rendered** `InputComponent` instances; Comments `isRequired` asserted. Named falsifying input executed and produced the correct 2 failures. **One of c1's four assertion lines is dead** — see Advisory 1 |
| c2 | ✅ | `fieldsRequired="false"` → `isRequired`/`validateEmpty` false on both inputs, `isRequired` false on the textarea, asterisk node count **0**. Asserted on rendered controls and rendered DOM, not on a signal |
| c3 | ✅ | No initialiser; omitted → `undefined` on the Number field; `0` → forwarded to Number while **Unit stays undefined** (the falsifiable half). The deeper `p-inputNumber` hop belongs to T-02 and is settled |
| c4 | ✅ **by the required mechanism** | `git diff --exit-code` exit 0. **Scope limit recorded below** |
| c5 | ✅ | Full run 308/308 · 6350/6350. Arithmetic corroborates a pure move plus 5 additions: 6345 → 6350 matches exactly 5 new `it` blocks, and the suite count stays **308** (a rename, not a new file). **Zero OICR spec edits** — so R-IUP-019 AC.2's import-path exception was not even needed |
| c6 | ✅ **as a recording, correctly not remediated** | The four hex literals are carried verbatim; **no new hex added** (the asterisk spans already carried `text-[#CF0808]` and were only wrapped). No detokenization attempted — doing it inside a move task would change OICR's rendering. Already logged as **RB-5** in `tasks.md` §8 |

**c4's scope limit — stated plainly, because the criterion does not state it.** The command-verified byte-identity covers **only the consumer file**. The template OICR *actually renders* did change — 3 label lines and 2 `app-input` lines — at both call sites (`oicr-details.component.html:60` and `:81`), and **nothing in c4 covers that**, nor does OICR's own spec, which asserts nothing about labels, asterisks, `isRequired` or `validateEmpty`. The Reviewer therefore audited that template directly and found the rendered output unchanged: same text, same spacing, one extra non-rendering comment anchor per label. The single behavioural surface that changed for OICR is the now-bound `[maxFractionDigits]="undefined"` on the Number field, which T-02 settled as identical to no binding. **This is a gap in the criterion's design, not in the work** — worth carrying into `/akili-validate`.

#### Decisions made

1. **A moved file is not a new file for DD-7's purposes.** DD-7's rationale is *"matching an existing violation is not consistency"* — it fences **authored** colour choices, and `git mv` authors none. The four hex literals ride along; c6 records that as a bounded, named risk (RB-5) rather than remediating it inside a move task.
2. **`@components/*` was the right alias**, confirmed present in **both** `tsconfig.json` and `jest.config.ts`, so `design.md` §7's "no new path alias, no `tsconfig`/`jest.config` change" holds.
3. **The inline `@if` form is load-bearing and now known to be so.** `Number@if (fieldsRequired) {<span>` has no whitespace anywhere in it, and that is what keeps the rendered label `"Number*"`. See Advisory 2 — this is the most fragile thing T-03 leaves behind.
4. **T-02's PrimeNG finding was consumed as settled, not re-derived.** The brief supplied it explicitly. Re-investigating a question already answered from pinned source invites a *different* answer to the same question, which is worse than the token cost.

#### `ADVISORY` — 4R lens findings (recorded; **not** gating, **not** rework, **not** new tasks)

| # | Lens | Finding | Reachability verdict | Disposition |
| --- | --- | --- | --- | --- |
| 1 | **Reliability** | `expect((commentsTextarea as any).validateEmpty).toBeUndefined()` **cannot fail.** `TextareaComponent` declares 15+ inputs and no `validateEmpty`; the only declaration site in the repo is `input.component.ts`. **The `as any` cast is the tell** — without it, TS would report that the property does not exist, which is exactly the diagnostic saying the assertion has no subject | **Tried and could not construct it.** Binding `[validateEmpty]` on `app-textarea` is an NG8002 error under `strictTemplates` and throws at TestBed compile time under JIT — the mis-binding **cannot ship** | Not gated: c1's substance is asserted falsifiably on its other three legs, and c1's named falsifying input was executed and behaved correctly. c1 has a live detector; one line of it is decoration. The Reviewer supplied a falsifiable rendered replacement (assert the Comments host contains `This field is required` and **not** `Field cannot be empty`, the latter being produced only by `InputComponent.inputValid()`'s `validateEmpty` branch) — **not actioned**, advisories never widen an approved task |
| 2 | **Resilience** | The **no-whitespace** form `Number@if (fieldsRequired) {<span>` is load-bearing and undocumented. `preserveWhitespaces: false` collapses runs but does **not** delete a single space inside a mixed text node — so reformatting to `Number @if (...)` would render `"Number *"` at both live OICR call sites | **Reachable by a future hand edit or formatter change; NOT by today's toolchain** — `npm run lint -- --quiet` (which carries `--fix`) left `git status` identical, so prettier does not touch these lines now | **No test would catch it:** the new assertions count `<span>` nodes, not spacing. Cheap guards exist (`expect(h2.textContent).toBe('Number*')`, or a note in the `@akili-spec` comment). **This is the most fragile artefact T-03 leaves behind** — flagged for T-11 (which touches these same templates) and for T-13 c7's human visual check |
| 3 | **Risk — spec accuracy, not an implementation defect** | **`design.md` §5.6 and `judgment.md` → `S-1` are over-stated.** `InputComponent.inputValid()` tests `isRequired` **before** `validateEmpty` and returns early, so `Field cannot be empty` is unreachable whenever both are true and the value is empty — and both are skipped when it is non-empty. With `fieldsRequired = false` both are false | **Could not construct any input** where the Number/Unit `[validateEmpty]` binding changes rendered output in either state of `fieldsRequired` | So §5.6's claim that applying `validateEmpty` to all three *"would change OICR's rendered validation"* is **false twice over** — once because the compiler forbids the binding, once because the message is shadowed. **Preserving the asymmetry was still the right call** (byte-preservation beats cleverness in a move task). **Not a Pivot:** the spec's justification is wrong, its instruction is not, and the delivered work is correct under either reading. Carried to `/akili-validate` and the Kaizen record — this is a *design-time reasoning* defect, the class the archive retrospective exists to catch |
| 4 | **Readability** | (a) The asterisk check is **aggregate** (`h2.label span` count === 3) while c1 says *"field-by-field"*; a per-label query would match the wording and would catch a two-asterisks-in-one-label typo the count cannot. (b) The `@akili-spec` marker is on the Number and Comments labels but **not** Unit, which changed identically | n/a | Both cosmetic. Noted for whoever next opens the file |
| 5 | **Readability — spec hygiene** | `tasks.md` T-03 c6 says *"add it to §7's blocker log"*, but §7 is **PR strategy**; the log is **§8**, where RB-5 correctly already lives | n/a | A stale cross-reference in the approved task file. **Left unedited** — the Leader does not rewrite approved spec prose outside a Pivot. Owner: T-12 / the archive sweep |

#### Forward pointers — carried by the brief or by nobody

| Target task | Pointer |
| --- | --- |
| **T-12** | **Must not close without `quantification-item`'s new `shared/` home registered** in `docs/ux-ui/design.md` §8.1. The client child guide makes registration mandatory for shared components; T-03 deliberately deferred it to avoid colliding with T-12 c1, which names it. If T-12 closes without it, the obligation is silently dropped |
| **T-11** | Advisory 2 — T-11 touches these same templates for tokens/a11y. The whitespace-free `@if` form must survive that pass |
| **T-13** | c7's human visual check should confirm the three quantification labels render `Number*` / `Unit*` / `Comments*` with **no space** before the asterisk, at both OICR call sites and on the new page |
| **PR 1** | c6's PR-description half is unverifiable from a diff and is **owed at PR-1 creation** (T-01…T-03): the promoted template carries four hex literals into `shared/` as a named, bounded, accepted risk |

#### Issues encountered

None. No environment blockers, no rework.

#### Final verification result

Full client suite green (308/308 suites · 6350/6350 tests), `git diff --exit-code` clean on the consumer file, lint clean with `git status` re-inspected, the correction sweep bounded on every axis with zero old-path survivors, and the criterion's falsifying input executed and observed failing. **T-03 closed on attempt 1.**

---

### T-04 — Innovation use level stepper (0–9) + definition callout

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 2** (1 rework round) |
| **Date** | 2026-08-20 |
| **Implementer attempts** | **2** of a 3-attempt ceiling |
| **Effort / skills assigned** | attempt 1 `high` · attempt 2 `xhigh` (rework bump) · `angular-developer`, `tdd` |
| **Requirements covered** | R-IUP-005 (all 6 ACs), R-IUP-018 (AC.2 for the stepper's accessible names) |

#### Leader deviations from the task file, recorded

| Deviation | Reason |
| --- | --- |
| Added **`tdd`** to the task's listed `angular-developer` | T-04's core is a **value mapping with a documented off-by-one trap**; c2 and c3 pin exact expected values (`label 6 → emit 7`, `id 7 → highlight label 6`). Red-then-green on a mapping is exactly where test-first pays |
| Effort raised to `high` at attempt 1 (size M would default to `medium`) | The task file itself says *"this task is where the family's trap fires"*. An off-by-one here yields a page that looks correct and saves the wrong level |
| **Single Reviewer retained at attempt 2 despite `xhigh`** | The 4R mode table triggers *parallel lens reviewers* at `xhigh`. Deliberately not applied: the remaining scope is three class names plus a citation, and `.agents/leader.md` → *Delegation Ceiling* ("one subagent beats several for a single modest task") binds harder here than the mode trigger. Recorded rather than done silently |

#### Attempt 1 — Reviewer `STATUS: FAIL`

**Files created** (3, all new): `innovation-use-level-stepper.component.{ts,html,spec.ts}` under `pages/…/innovation-use-details/components/innovation-use-level-stepper/`. The page directory was created but **the page itself was not** — correctly left to T-07.

**Verification — Implementer:** `npm test -- --silent` full unfiltered → **309 suites passed, 6362 tests passed** (up from 308/6350; +1 suite, +12 tests). Coverage 99.17 / 98.23 / 99.04 / 99.38. `npm run lint -- --quiet` clean, `git status` re-inspected — no mutation. Hex grep over the three files → **0 hits**. c8 grep for a `name`-keyed lookup → **0 hits**.

**Both falsifying inputs executed.** (a) `emit(level.id)` → `emit(level.level as number)` made c2 fail `Expected: 7 / Received: 6`. (b) Adding `<br>{{ selectedLevel.additional_guidance }}` made c4 fail on the marker string. Both reverted byte-identical.

**Self-caught KZ-001 near-miss — worth recording as a positive.** The Implementer's *first* c4 assertion was `expect(calloutText).not.toContain('undefined')`, which **passed even with the bug present**, because Angular interpolates `undefined` as an empty string rather than the literal text. It caught this itself and replaced it with a marker-value fixture (`additional_guidance: 'GUIDANCE-MARKER-XYZ'`). The Reviewer was asked to **verify rather than trust** the replacement and confirmed it is genuinely falsifiable: a marker string cannot be satisfied by empty-string interpolation. This is the KZ-001 failure class detected by the author before review — the first time in this spec's run.

**All eight criteria c1–c8 PASSED.** The FAIL is a §5.7 token violation that **no T-04 criterion covers**.

| # | Verdict | Note |
| --- | --- | --- |
| c1 | ✅ | Ordered array equality on rendered labels (`['0'…'9']`), not a count — Disqualifier discharged. Plus a DD-6 shuffle test proving no client-side sort |
| c2 | ✅ | Click-driven through the DOM; asserts `toHaveBeenCalledWith(7)` **and** `not.toHaveBeenCalledWith(6)` |
| c3 | ✅ | Rendered className + rendered callout text, plus a negative check that adjacent **id** 8 is *not* also selected |
| c4 | ✅ | Falsifiability confirmed independently, not trusted |
| c5 | ✅ | No separate empty-catalog string was required — see Decisions |
| c6 | ✅ | Per-button English `aria-label`; independent grep for Spanish across all three files → zero |
| c7 | ✅ | Asserted on the **rendered** `btn.nativeElement.disabled`, not a component property |
| c8 | ✅ | Genuinely falsifiable: with `selectedLevelId = 3`, a name-keyed `isSelected` would wrongly match the other `"Partners"` row, and the test demands `false` |

**FAIL issue 1 — malformed token utility class names (verbatim):**

> Three malformed design-token utility class names that match no CSS rule and therefore render nothing. The template uses `fs-14`, `fs-16`, and `rs-gap-1`. The repo's token utilities are **bracketed**: `README.md` documents `.fs-[n]` (n = 1–30) and `.rs-gap-[n]`, and the only in-repo usages confirm it — `form-header.component.html:12` `class="fs-[12] atc-grey-600"` and `section-header.component.html:35` `rs-gap-x-[15]`. `fs-14` is not a Tailwind utility either (there is no `fs` namespace), so it resolves to nothing: the required message and the stepper digits render at inherited size (~16px) instead of 14px/16px, a visible regression against the reference, whose `!text-[14px]` / `!text-[16px]` do resolve. […] **No T-04 criterion covers this, and T-11's automated criteria are a hex grep (c1) and an `isDarkMode()` grep (c5) — neither can ever catch it**, so deferring means never catching it. This is the first of four new component templates; left as-is the pattern gets copied into T-05, T-06 and T-07.

> **Violated Rule:** `design.md` §5.7 (declared binding); `docs/ux-ui/design.md` §7.1 — "**Utility classes (do not invent parallels):** `.fs-[n]` … `.rs-gap-*`"; `client/research-indicators/src/CLAUDE.md`.

**FAIL issue 2 — citation to the wrong file (verbatim):** the fixture header attributes the ten-row catalog to `design.md` §6.3; that table is in **`requirements.md`** §6.3, while `design.md` §6.3 is *"Numeric input — what is verified, and what is not"*. **The transcription itself is accurate** — the Reviewer verified all ten rows character-for-character, `id = level + 1` and every adjacent name-sharing pair. A traceability defect, not an evidentiary one.

**The Reviewer's own stated verification limit, recorded because it bounds the evidence.** The utility definitions live in a **remote** stylesheet (`…amazonaws.com/frontend-parameters/colors.css`, loaded from `src/index.html:9`) and Tailwind is a runtime CDN JIT — so the Reviewer could not prove the unbracketed form is absent from that file, only that it is absent from the documentation, from every other file in the repo, and from Tailwind. **Attempt 2 was therefore instructed to verify the bracketed convention independently and to say so if the FAIL is wrong** — a Leader should rather learn the finding was mistaken than have a worker comply with a bad instruction.

#### Leader adjudication

**Not a Pivot.** §5.7's mapping is binding and the code diverges from it; the spec is right and the implementation is short. A rework attempt is the correct instrument.

**Two questions the Leader raised pre-review, both resolved — one against the report, one for it:**

1. **`--ac-red-1` vs `--ac-orange-1`.** The Leader verified inline that `--ac-orange-1` **does** exist (`#f58220` light / `#ff9d56` dark), contradicting the Implementer's stated rationale that *"no `--ac-*` token exists"* for the warning colour. The Reviewer was asked for a definite ruling and gave one: **the choice is correct, the rationale is false.** `docs/ux-ui/design.md` §7.1 assigns `--ac-red-1` to *"Errors, destructive actions"* and `--ac-orange-1` to *"Indicators 4–5"* — orange is bound to **indicator branding**, so using it for a validation message would have been the misuse. `#E69F00` has no token **by design**: DD-7 lists it among the reference page's documented §7.1 violations, and DD-7 *mandates* diverging from it. **`OQ-IUP-4` is therefore not engaged** — its trigger is "a reference colour has no existing token", and for this purpose one exists. The false claim is struck from the record here.
2. **Zero-hex is necessary but NOT sufficient for token conformance.** The Reviewer's answer, and the general lesson this task produced: a clean hex grep still admits (a) a valid `var(--ac-*)` reference to a token whose §7.1 assignment is a *different purpose*, and (b) **a malformed token-family class name that matches no CSS rule at all — strictly worse than a hex literal, because a hex at least renders.** Issue 1 is instance (b). **This is the single most transferable finding of the run so far** and is why the fix was not deferred to T-11.

#### Attempt 2 — Reviewer `STATUS: PASS`

**Files changed** (2): `.html` and `.spec.ts`. The `.ts` was placed out of scope and is untouched — so every logic-level criterion (c2, c3's `isSelected` half, c7's guard, c8) is unchanged **by construction**.

**Scope delivered** — four fixes, nothing wider:

1. `fs-14` → `fs-[14]` (required-message span).
2. `fs-16` → `fs-[16]` (stepper button).
3. **`rs-gap-1` dropped in both places.** `gap-1` kept where it already co-existed; at the stepper row there was no companion and none was added.
4. Citation corrected to `requirements.md §6.3 "The catalog — all ten rows"`.

Plus the remediation's final clause, discharged as **(a) with the (b) caveat**: a new `describe` pins the rendered class list lexically, carrying an in-file comment stating that **jsdom loads no CSS**, so this proves the class *string* is correct — not that it renders at 14px/16px. The real visual gate is **T-13 c7**.

**The FAIL was independently confirmed, not merely obeyed.** The Implementer was instructed to verify the bracketed convention itself and to say so if the finding was wrong. It found: `README.md:158-164` / `:187-198` document **only** `.fs-[n]` and `.rs-gap-[n]`/`-x-`/`-y-`; a repo-wide grep for the unbracketed form matched **only this component's own file pre-fix, zero elsewhere**; bracketed usages live at `form-header.component.html:12,18,27` and `section-header.component.html:35`. It hit the same remote-`colors.css` ceiling as the Reviewer **and said so rather than papering over it**. Both parties' evidence converged independently.

**Verification:** `npm test -- --silent` full unfiltered → `Test Suites: 309 passed, 309 total` · `Tests: 6364 passed, 6364 total`. Lint clean, `git status` re-inspected. Hex grep zero; malformed-class grep zero.

**Test arithmetic corroborates rather than merely agrees** (the Reviewer's framing, worth keeping): 12 → 14 tests in-file, suite total 6362 → 6364, **suites flat at 309**. A +2 delta with no suite change and no net loss means nothing was renamed, skipped, or quietly removed to make room.

**Reviewer's rulings on the three judgment calls I referred to it**

| Question | Ruling |
| --- | --- |
| Dropping `rs-gap-1` with **no** replacement at the stepper row | **Correct, and more strongly than the Implementer argued.** The row's class string is now **byte-identical to the reference** (`innovation-details.component.html:128`), which carries *no gap utility there at all*. So spacing is not merely unchanged, it is exactly reproduced. **Adding `gap-1` would have been the error** — 4px × 18 gaps ≈ 72px of extra width injected into a row that has none, pushing precisely the direction R-IUP-018 AC.5 (no horizontal overflow at `md:`) cares about. The Implementer was right to surface this rather than decide it silently |
| Is `not.toMatch(/\bfs-14\b/)` redundant after `toContain('fs-[14]')`? | **Not redundant — independently falsifiable, with a constructed input.** `fs-14` does not occur inside `"fs-[14]"` (the `[` intervenes), so the two assertions test different propositions. `class="fs-[14] fs-14"` **passes the first and fails the second** — exactly the regression the pin exists to catch (someone re-adding the unbracketed form "to be safe"). Narrow limit: `\b` makes it exact-value, so `fs-140` would slip through; `/\bfs-\d/` would pin the whole family |
| Is `By.css('span')` positionally fragile? | **Reliable in the asserted state, and every failure mode is loud.** With `levels = []` exactly one `<span>` renders (the `@for` emits nothing, the callout guard is false, the icon is an `<i>`). If a future edit inserts an earlier span the assertion fails with a wrong-className message — a false **failure**, not a false pass; if the span vanishes, `query` returns `null` and `.nativeElement` throws. Both drift directions are safe. Still positional rather than semantic: the file already contains the better idiom (c2/c3 locate the button by rendered text). Note the asymmetry — the button half is exhaustive (`length === 10` then `forEach`), the span half is first-match |

#### Decisions made

1. **Zero-hex is necessary but not sufficient for token conformance — the run's most transferable finding.** A clean hex grep still admits (a) a valid `var(--ac-*)` reference to a token whose §7.1 assignment is a *different purpose*, and (b) **a malformed token-family class name matching no CSS rule at all — strictly worse than a hex literal, because a hex at least renders.** Issue 1 was instance (b). It was fixed here rather than deferred to T-11 because **T-11's automated criteria are a hex grep (c1) and an `isDarkMode()` grep (c5), and neither can ever see a class name that matches nothing** — deferring would have meant never catching it. And T-04 is the **first of four new component templates**: T-05, T-06 and T-07 are all briefed to follow it as an exemplar.
2. **`--ac-red-1` stands; its stated rationale was struck.** Ruled above.
3. **The citation-slip pattern is real and Kaizen-worthy.** Three mis-attributions in four tasks — T-02 (a PrimeNG expression attributed to `design.md` §6.3), T-03 (`tasks.md` c6 citing §7 for a log in §8), T-04 (the catalog attributed to `design.md` §6.3 instead of `requirements.md` §6.3). **Two of the three collide on the string "§6.3", which exists in both documents with unrelated subjects.** The Reviewer's proposed lesson, endorsed: *cite `<file>` §`<n>` **and confirm the section title** before writing it; this spec's two documents share section numbers with different subjects, so a bare "§6.3" is ambiguous by construction.* Carried to the archive Kaizen step.
4. **Single Reviewer retained at `xhigh`.** Recorded in the deviations table above.

#### `ADVISORY` — 4R findings (recorded; **not** gating, **not** rework, **not** new tasks)

Attempt 1's advisories carry forward unactioned; attempt 2 added two.

| # | Lens | Finding | Reachability verdict | Disposition |
| --- | --- | --- | --- | --- |
| 1 | **Reliability** | `isSelected()` is `this.selectedLevel?.level === level.level`. With nothing selected the left side is `undefined`, and `InnovationUseLevel` defaults `level` to `undefined` — so a row with an absent `level` renders as **selected** while the required message shows beside it. Same defect makes `ariaLabel()` emit `"Innovation use level undefined"` | **Tried three paths, reached none.** Seeded catalog always carries `level` 0–9; `level: null` does **not** trigger it (`null === undefined` is false under `===`); the service sets `response.data` or `[]` and never synthesizes a blank row; T-07 does not exist yet. **Latent, not currently reachable** | **The implementation is a literal transcription of §5.3's binding formula, so the flaw is the spec's, not the Implementer's** — the Reviewer stated it cannot FAIL conformance for conforming. Suggested hardening (`s?.level !== undefined && s.level === l.level`) **plus a matching §5.3 correction** — carried to `/akili-validate` |
| 2 | **Reliability** | `@for (…; track level.id)` keys on `number \| undefined`; two rows with absent ids collide | **Could not construct.** Real ids are unique 1–10, no path synthesizes blank rows, and Angular raises `NG0955` on duplicate keys in dev — it would fail **loudly** | `track $index` would remove the class at no cost, since rows are never reordered in place |
| 3 | **Resilience — ESCALATED, see below** | Catalog `500` + a saved level: `main()`'s `catch { list.set([]) }` swallows the failure, so the stepper renders zero buttons **and** "This field is required" over a record whose level *is* stored, with no affordance to see or correct it | **Reachable — payload given.** Mock the catalog GET to `500` and the details GET to `200 { innovation_use_level_id: 7 }` | **Not T-04's** (its §5.2 contract admits no third state) and **not T-07 c4's** (DD-11 governs the *details* GET only). **No task in `tasks.md` owns the catalog-load-failure surface.** Escalated to the user as a spec gap — see below |
| 4 | **Risk** | `escape="false"` is genuinely effective — `primeng-tooltip.mjs` applies `transform: booleanAttribute` (line 743-744) and line 536 runs `innerHTML = content`, so interpolated `name`/`definition` are injected as raw HTML. `innerHTML` won't run `<script>`, but `<img onerror>` would | **Could not construct a payload.** Per family D-1 the catalog is **migration-seeded**, not CLARISA-synced, and chunk 2 exposes it read-only — no client- or API-reachable write path. Trust boundary is DB/migration level | §5.3 explicitly licenses matching the reference stepper's tooltip. No action. **Recorded so the boundary is on the record if the catalog ever gains a write endpoint** |
| 5 | **Readability** | The `.ts` docblock repeats the spec's own arithmetic error — *"five names each cover two adjacent levels"* — while `.spec.ts` correctly says *"Four adjacent pairs"*. The table has **six** names, four of which repeat. The two new files now disagree | n/a | Upstream error is in `requirements.md` §6.3's note and R-IUP-005's scenario; per root `CLAUDE.md` §5 the **document** is what should be fixed. Zero behavioural impact — c8's fixture uses a genuinely shared pair (`"Partners"`). Owner: T-12 sweep |
| 6 | **Readability / a11y** | Both callout lines are `<h3>`, copied from the reference — body prose inside a heading element pollutes the heading outline for screen-reader users | Always applies | Outside T-11 c2's scope (labels and accessible names); lands in **T-13 c7**. Raised now so it is not discovered at the gate |
| 7 | **Resilience** | `-mt-2` on the required message is copied from a reference context where a helper `<h3>` precedes it. Here it is the root's first child, so the negative margin pulls 8px into whatever T-07 renders above | Always applies; visual only | Cheaper to drop now than to diagnose from a screenshot later. **Forward-pointed to T-07** |
| 8 | **Readability** | Dead bare `pTooltip` attribute alongside `[pTooltip]`; and the `!` prefixes on `!w-8 !h-8 !flex …` were needed in the reference to beat `pButton`'s styles, which this component does not use | n/a | Noise. Noted |
| 9 | **Reliability (test hygiene)** | c7's emission half calls `selectLevel()` directly, bypassing the DOM; c3's `isSelected` calls sit beside rendered assertions | n/a | Both layers *are* covered (native `disabled` asserted on every rendered button; c3 has a rendered className + callout assertion). A `click()` under `disabled = true` would prove both in one assertion. Polish, not a gap |
| 10 | **Readability** | The new lexical-pin `describe` sits between c5 and c6, interrupting the contiguous c1…c8 reading order | n/a | It maps to no criterion so it has no natural slot; after c8 would keep the sequence intact. Cosmetic |

#### ⚠️ Escalation to the user — a spec gap with no owner (Advisory 3)

Per `/akili-execute` §2.4, **an advisory may never mint or widen a task in this spec** — the only route from advisory to new work is out of the spec, via the user. The Reviewer explicitly asked the Leader to assign this rather than leave it advisory, and assigning it is exactly what the Leader may not do unilaterally.

**The gap:** the **catalog**-load-failure surface is unowned. T-01's `GetInnovationUseLevelsService.main()` reads `response?.data` without consulting `successfulRequest`, so a `500` is indistinguishable from an empty catalog. DD-11 and T-07 c4 close this hole for the **details** GET; nothing closes it for the **catalog** GET. The user-visible result is a page asserting a required field is empty over a record that has a level saved.

**Severity is bounded:** no write is triggered, so unlike DD-11's case there is no data-destruction path. The user is blocked and misinformed, not silently damaged.

**Leader recommendation:** carry to `/akili-validate` rather than reopening the spec now. It is not a blocker for T-05…T-13, the mitigation belongs in the same place as the existing `loadFailed` machinery (T-07), and reopening `tasks.md` mid-execution re-runs the budget and approval gates for a bounded, non-destructive defect. **The user's call, recorded either way.**

#### Forward pointers — carried by the brief or by nobody

| Target | Pointer |
| --- | --- |
| **T-05, T-06, T-07** | **Use the bracketed token form `fs-[n]` / `rs-gap-[n]`.** T-04 shipped the malformed unbracketed form and no automated criterion in the spec could catch it. These three tasks are briefed to follow T-04 as an exemplar — the exemplar is now correct, and each brief must state the convention explicitly anyway |
| **T-07** | Advisory 7 — `-mt-2` on the stepper's required message pulls into whatever the page renders above it |
| **T-11** | Its c1/c5 greps **cannot** detect a malformed utility class. If T-11 is to be the token gate, its evidence must include a lexical check of token-family class names, not only a hex grep |
| **T-12** | Advisory 5 — the "five names" arithmetic error in `requirements.md` §6.3 / R-IUP-005 and now the `.ts` docblock |
| **T-13** | c7 must confirm the required message renders at 14px and the stepper digits at 16px — **jsdom proved only the class string, never the rendered size** |

#### Issues encountered

One rework round on a §5.7 token violation no T-04 criterion covered. No environment blockers.

#### Final verification result

Full client suite green (309/309 suites · 6364/6364 tests), coverage above all floors, lint clean with `git status` re-inspected, both falsifying inputs executed and observed failing, and the token convention independently re-verified by both worker and auditor. **T-04 closed on attempt 2 of 3.**

---

### T-05 — Innovation Use actor card: type, OTHER name, mode switch, counts, derived total

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 2** (1 rework round; 3 issues from 2 of 3 lenses) |
| **Date** | 2026-08-20 |
| **Implementer attempts** | **2** of a 3-attempt ceiling |
| **Effort / skills** | attempt 1 `xhigh` · attempt 2 `xhigh` (**held, not bumped**) · `angular-developer`, `tdd` |
| **Requirements covered** | R-IUP-007 (all), R-IUP-008 (AC.1–AC.5), R-IUP-010 (AC.1–AC.3), R-IUP-011 (AC.1–AC.4), R-IUP-014 (AC.4) |
| **Review mode** | **Parallel lens reviewers (3)** — first use in this spec |

#### Leader deviations, recorded

| Deviation | Reason |
| --- | --- |
| Added **`tdd`** | The derived-total rule is a business rule with exact expected values including the `null`-not-`0` case; 13 criteria pin specific outputs |
| Effort `xhigh` at attempt 1 (size L defaults to `medium`) | The derived total is **correctness-critical for the meaning of user data** — returning `0` where the answer is "nothing was reported" tells the user they reported a count of zero |
| **Parallel lens reviewers used** (correctness · test-fidelity · a11y/tokens) | The 4R table triggers this at `xhigh`, and unlike T-04's three-character rework the trigger was *appropriate*: 646 LOC, 13 criteria, three genuinely distinct failure surfaces. The distinction from T-04 is diff size and surface count, not the effort label alone |
| **Effort NOT bumped for the rework** | The dial's rule is *never `max` a cheaper tier — escalate the tier instead*, and a T1 escalation was unwarranted: all three FAILs arrived with precise named remediations, making this precision work, not exploration. Recorded because the standing rule is "bump one level on every retry" — a deliberate, reasoned exception |

#### Attempt 1 — two lenses FAIL, one PASS

**Files created** (3, new, 646 insertions). Page not created — correctly T-07's.

**Verification:** `npm test -- --silent` full unfiltered → **310 suites, 6386 tests passed** (from 309/6364). Coverage 99.21 / 98.11 / 99.02 / 99.44. Lint clean, `git status` re-inspected. Hex grep and malformed-utility grep both zero. **Named falsifying input executed:** `return 0` instead of `null` → c4 failed `Expected: "" / Received: "0"`. Reverted.

All 13 criteria were reported PASS. The FAILs are things **no criterion covers** (Lens A) or that a criterion covers but its assertion does not reach (Lens B).

##### Confirmed correct by the lenses — recorded so it is not re-litigated

| Finding | Lens | Evidence |
| --- | --- | --- |
| **The derived total is correct clause-by-clause** (§6.2), and `0` is distinguishable from absent **in both directions** | A + B | `{{ total() ?? '' }}` uses `??`, not `\|\|` — a total of `0` interpolates as `"0"`, only `null` becomes `''`. Lens B's decisive framing: **each of c4/c10 passes with the other's bug present**, so both are necessary and neither redundant. c4 catches a `computed` returning `0`; c10 catches a template using `\|\|` |
| **`app-input` genuinely drives the signal — c3 passes for the reason it appears to** | B | `setValue` → `setNestedPropertyWithReduceSignal`, whose dotless branch returns `{...obj}` — a **new reference**, so the `computed` invalidates. No KZ-001. But the *in-place half* of that same write is Lens A's issue |
| **c11 encodes rounding, not rejection** | B | Traced through PrimeNG source: `2.5` at `maxFractionDigits: 0` → `'3'` → model `3`. Assertions are `Number.isInteger` + `>= 0`. Per §6.3's T-02-settled finding an assertion demanding *rejection* would have been **wrong**; none was written |
| **`effect()` is the right mechanism and the only one that works** | A | The five count fields are written by `app-input` **directly into the signal** — no card-owned method to hook. Per-mutation emits would cover three paths and miss five unless `app-input` were re-plumbed (out of scope). DD-5's *intent* is satisfied |
| **`[ngModel]` one-way + explicit handlers is correct** | A | `NgModel.ngOnChanges` writes only when the bound model differs from the view value — no control/model fight, no caret reset — while parent changes still propagate. The one place diverging from the reference's `[(ngModel)]` was *required* |
| **c13 SATISFIED — spec contradiction resolved** | A | c13's literal *"no reference to `ClarisaActorTypesEnum`"* conflicts with the same task's note mandating *"a comment naming the server enum"*. **Ruling: the note governs; "no reference" means no *code* reference.** Backed by `judgment.md` → C-2's ledger and requirements **A4** (*"the value is shared across both trees; the symbol is not"*). C-2's hazard is a build-breaking import; a comment cannot break a build. All nine imports resolve to `@angular/*`, `primeng/*`, `@shared/*` |
| **Row identity — a construction argument, not a happy-path check** | A | Complete enumeration of every write into `body`: two whole-object sets, three spreads naming exactly eight keys, five `app-input` writes whose `[optionValue]` literals are all count keys. `result_actors_id` is **never named** in `.ts` or `.html`, and `new InnovationUseActor()` initialises it `undefined`, not a number — so no id can originate in the card nor be copied between rows. The *absence of a synthesis path* §6.5 demands |
| **The `JSON.stringify` echo guard has no wrongly-equal case** | A | Lens A hunted and **could not construct one**: the guard can only miss a key-present-`undefined` vs key-absent difference, and every consumer treats those identically (`total`'s filter, the template's truthiness `@if`s, §6.5's payload rules, `HttpClient`'s own stringify dropping `undefined`). The mirror direction *is* detected. Its real weakness is key-order sensitivity — one redundant emit, converging after one bounce |
| **Init-time emit is real, harmless as specced** | A | Proven from Angular source: pre-order hooks run at `core.mjs:14340`, `runEffectsInView` at `:14353`, so `initialized` is `true` on the effect's first run. Emit ≠ HTTP, so DD-8 and T-07 c11 stand — **but see the T-07 pointer** |
| **Tokens and a11y: PASS** | C | Four of five colour substitutions are **exact-value transcriptions** of the reference hexes (`--ac-grey-100`=`#f4f7f9`, `-200`=`#e8ebed`, `-600`=`#8d9299`, `-800`=`#4c5158`), all correct §7.1 families; `--ac-red-1`=`#cf0808` on an error message and a destructive control, both in-purpose. **Zero semantic misuse, zero hex, zero `isDarkMode()`.** All 16 bracketed utility uses are documented families with in-range values. Both failure modes T-04 taught are **absent** |
| **Errors are icon + text in every reachable branch** | C | The select's red border fires on `actorTypeMissing \|\| duplicateType`; the message branches' union is *exactly* that condition, so **border ⟹ text** with no residue |
| **c9's exclusivity holds by construction** | C | `@if (duplicateType) { … } @else if (actorTypeMissing) { … }` — the `@else if` is unreachable when the first holds, so duplicate wins. Asserted on **rendered text** |
| **`.section-title` correctly NOT applied to `ACTOR # n`** | C | Across the client it is used exclusively for page/section headers (19 sites), never a repeatable-row header, and §7.1 gives it `uppercase` + `margin-bottom: 20px` which would change this card's layout. **Recorded so T-11 does not "fix" it** |
| **Test-double inventory: all four faithful** | B | The `GetActorTypesService` double is a real signal matching `ActorType` field-for-field, and the rendered options genuinely flow from it. `jest.spyOn(update,'emit')` calls through. The partial `ClipboardEvent` was verified property-by-property against PrimeNG source. `CacheService`/`UtilsService`/`WordCountService` are **not** doubled — real services, real `p-inputNumber` |

##### `STATUS: FAIL` — three issues, all adjudicated in scope

**Lens A — the card mutates its `@Input` object in place.** *Two lenses reached this independently, from opposite directions; that convergence is the strongest signal of the run.* `ngOnInit` does `body.set(this.actor)` — a **reference** assignment — so `body()` *is* the parent's row. `setNestedPropertyWithReduceSignal` then does `obj[keys[0]] = value` **before** returning `{...obj}`, so the write lands on the parent's object. A count typed into the card reaches the parent's row through a side channel that **bypasses `@Output` entirely**. The docblock claiming *"Local copy of the row"* is false — which matters because T-07's author would build on that stated invariant.

> **Violated Rule:** §5.2 *"The new cards are pure: given inputs they render, and they emit on change"* + T-05's *"`@Input`/`@Output` only… never write through a parent array key (DD-5)"*. **Both named prohibitions are literally satisfied** (no parent signal, no `actors[i]` write); the aliasing re-creates by reference exactly the side channel they exist to eliminate.

Reachability: mechanism constructible **today** and provable with one assertion; the data-loss *consequence* (corrupted dirty-check snapshot, or a stale `total` when a parent mutates in place — no version bump, so the `computed` never invalidates) needs T-07/T-08. Exposure window: a count edited **before** the first type/mode change — precisely R-IUP-014's resume flow. Lens A filed it as an issue **rather than an advisory** because *chunk 2's history is two defects that sat in an advisory register until one became a silent data-destruction path on a `200`* — it applied **KZ-008** to its own filing decision.

**Lens B — c12 never covers the aggregate-mode count field.** Both c12 tests run in disaggregated mode, so the `How many` input's `[disabled]` is **never evaluated**. Delete it and **all 13 criteria still pass**, while a user on a non-editable result can type into that field — a mutation surface on a locked result. Secondarily, three of four c12 assertions read component properties, not rendered controls. *Violates c12's own wording ("**every control**") and §10.4's coverage disqualifier.*

**Lens B — a `describe` labelled `c13` asserts something else.** It tests `result_actors_id` pass-through, an **Implementation note**, not c13. A reader auditing "is c13 covered?" sees a green block named c13 that does not test c13. Both properties *are* satisfied; the defect is the labelling. Repo precedent: commit `9b571c36`, *"harden the test whose name outran its assertion."*

##### Leader adjudication

**Not a Pivot** — all three are implementation-or-evidence defects against a sound spec. All accepted in scope: the first violates §5.2's purity clause and DD-5's intent, the second is c12's literal wording, the third has direct repo precedent. **One consolidated rework dispatched** rather than three serial ones; per-lens dispatch would have burned attempts on findings fixable in a single pass. **Lens C passed, so none of its findings entered the rework** — two are escalations, recorded at the gate.

#### Attempt 2 — **both failing lenses PASS**

**Files changed** (2): `.ts` and `.spec.ts`. **`.html` byte-unchanged** — confirmed by `git diff --stat`, empty — so Lens C's passed token/a11y surface was never reopened and did not need re-review.

**The three fixes**

1. **Aliasing (Lens A):** both ingress paths now shallow-spread — `this.body.set({ ...(this.actor ?? new InnovationUseActor()) })` and `const next = { ...(this.actor ?? …) }`. Guard unchanged, comparing against the spread. Docblock corrected so the "local copy" claim is true, and it now *teaches* why the spread is load-bearing.
2. **c12's aggregate gap (Lens B):** new `disables the How many control in aggregate mode` test; both disabled loops converted from the wrapper property to the **rendered** control via the file's existing `inputNumberInside` helper; both loops length-guarded (`toBe(4)` / `toBe(1)`) so `forEach(expect)` cannot pass on an empty array.
3. **Mislabelled describe (Lens B):** renamed to `result_actors_id is passed through unchanged (T-05 Implementation notes / §5.2)`, with c13 stated as the static grep-discharged check.

**Both falsification probes executed and failed as predicted** — this is what makes the two fixes *load-bearing* rather than merely present:

| Probe | Result |
| --- | --- |
| Delete `[disabled]` from the aggregate `app-input` | `● … disables the How many control in aggregate mode` → `Expected: true / Received: false` at the new assertion. Restored byte-identical (verified against a backup) |
| Revert `ngOnInit` to the reference assignment | `● … a count typed into the card does not mutate the @Input object the parent still holds` → `expect(received).toBeUndefined() / Received: 3`. Restored to the spread |

**Verification:** `npm test -- --silent` full unfiltered → **310 suites, 6388 tests passed**. Coverage 99.21 / 98.11 / 99.02 / 99.44. Lint clean, `git status` re-inspected. Hex and malformed-utility greps re-run → zero.

**Test arithmetic independently reconstructed by Lens B, not accepted.** It inventoried all 21 `it` declarations by line number, noted that one sits inside a `forEach` over four fields (20 + 4 = **24**), and matched that to 22 → 24 and 6386 → 6388 with **suites flat at 310**. The only other edits were two *labels*. **Every attempt-1 test is still present; no rename masks a removal.**

##### `LENS A — STATUS: PASS`

> The single Lens A issue is fully and correctly closed — both ingress paths spread, the copy is shallow-sufficient because every `InnovationUseActor` field is scalar, and no third path to the parent's object exists in either file. The guard, the `total` computed, the `result_actors_id` construction argument and the init-emit ordering are all unchanged by the fix; all 13 done criteria hold, the c13 adjudication from attempt 1 stands, and the docblock is now true in every clause.

**The completeness argument, recorded because it is what makes the fix trustworthy:** `this.actor` is read in **exactly two places** in the component and **nowhere** in the template (which touches only `body()`, `actorNumber`, `disabled`, `duplicateType`, the two getters, `actorService`, `otherActorTypeId`, `total()`). Both reads spread. So *"both ingress paths"* is **exhaustive, not merely plural**. The `@Input` default is a per-instance initialiser, not a shared module constant, so sibling cards cannot alias one default row either. **Consequence now permanent: the GET response's row objects — and any snapshot the parent takes of `response.data` — are unreachable from this card.**

**The emit-direction question I put to Lens A, answered definitively.** `update.emit(this.body())` *does* hand the parent the card's live object, and a parent doing `actors[i] = event` re-establishes an alias. Ruled **benign and categorically different** from the failed defect, for two reasons: (1) **consent and direction of truth** — the object is one the card *gave* the parent as the new truth, whereas the defect wrote into an object the parent held as its *prior* state and never surrendered; (2) **the aliased write carries no information the emit does not** — `app-input`'s in-place write and the emit that follows occur in the same change-detection flush with the same key and value, so the mutation is a few microseconds' preview of the emit, never a divergence.

##### `LENS B — STATUS: PASS`

> Both FAIL issues are correctly closed, my reachability verdict on the aggregate-mode gap is now **measured rather than source-traced** (the falsification run reproduced the exact assertion I predicted), all 13 criteria are covered with c12 now exercising all six controls across both template branches, and the residual `Select`/`Checkbox` property assertions sit at the vendor boundary rather than short of it — a fidelity gradient, not a coverage hole. Twelve criteria are evidence; c13 is honestly declared as grep-discharged rather than dressed as a green test.

**The residual item I referred for a definite ruling — resolved (b), do not spend attempt 3 — and on better grounds than I offered.** I framed it as "your remediation text was app-input-specific". Lens B called that *the weaker half* and gave the substantive reason: the deciding factor is **how many first-party layers sit between the card and the vendor control.**

| Path | Verdict |
| --- | --- |
| Card → `app-input` (**first-party**, modified by T-02) → `p-inputNumber` → `<input>` | `InputComponent.disabled` stopped **one layer short of the vendor boundary**, with a first-party layer in between that can change independently. **That was the hole** |
| Card → `p-select` / `p-checkbox` | The card binds **directly** to the vendor input. `Select.disabled` **already *is* the vendor boundary** — no intervening first-party layer to skip |

Going deeper would mean asserting PrimeNG's private markup (`.p-disabled`, `aria-disabled`, inner `tabindex`) — brittle across patch bumps, and it tests PrimeNG rather than the card: *"trades card coverage for vendor coupling, a net loss."* Lens B also verified the property assertion's **falsification range from PrimeNG 19 source**: both `Select` and `Checkbox` declare `@Input({ transform: booleanAttribute }) disabled` with **no `false` default**, so a deleted binding leaves `undefined` and `expect(undefined).toBe(true)` fails. **Deletion, inversion and a wrong source expression are all caught.** The only uncatchable case is a vendor regression, outside T-05's blast radius. It closed by noting the Implementer *"flagging this rather than doing it silently was the right call, and its instinct about scope was correct on the merits, not just on the text."*

#### Decisions made

1. **Two independent lenses converging on one defect from opposite directions is the strongest signal this run has produced.** Lens A derived the aliasing from the ingress path; Lens B hit the same object from the `UtilsService` write path while auditing c3's fidelity. Neither saw the other's report. **This is the concrete argument for parallel lens review on a large task** — a single reviewer had passed the same file on the surfaces it *did* examine.
2. **The consolidated rework was the right instrument.** Three issues from two lenses, dispatched as one brief. Per-lens dispatch would have burned two or three of the three attempts on findings fixable in one pass.
3. **Effort was deliberately NOT bumped**, against the standing retry rule. Reasons in the deviations table; recorded so the exception is visible rather than looking like an oversight.
4. **Lens C's PASS was load-bearing for cost, not just for quality.** Because `.html` was untouched by the rework, Lens C did not need re-running — the re-review cost two lenses instead of three.

#### `ADVISORY` — recorded; **not** gating, **not** rework, **not** new tasks

Attempt 1's advisories carry forward. New or sharpened at attempt 2:

| # | Lens | Finding | Reachability | Disposition |
| --- | --- | --- | --- | --- |
| 1 | **A · Reliability** | The init emit now **replaces the parent's row object with an equal-valued copy**, so the array element changes identity on load with no user interaction. Inert under the index keying §5.2 mandates, but `@for (… ; track row)` would re-create every card once, and code comparing `actors[i] === response.data.actors[i]` would report a change that did not happen | **Not constructible today** — T-07 is `todo` and its component does not exist in the tree | **Forward-pointed to T-07.** The design already forbids the hazardous option; the brief must say so out loud |
| 2 | **A · Risk** | The parent-consented alias means the emitted row is **live-mutable** | Not constructible today; entirely inside T-07's authorship | **Forward-pointed to T-07:** a baseline for dirty-checking or discard-changes must come from the **GET response** or a deep copy — never from an object received via `update` or a shallow copy of `body()` |
| 3 | **B · Reliability (new)** | **The checkbox is the one control no test touches as a control**, and the *enabled* direction is asserted for the select only | **Constructed, reachable, green.** Change the checkbox's binding to `[disabled]="true"`: c12 test 1 expects `true` and passes, test 3 never looks at the checkbox, and c2 reaches `onModeChange` by direct method call — so **nobody can ever leave disaggregated mode, suite green** | **Outside c12's letter** (c12 governs the `disabled = true` direction only), so not a gate and explicitly not grounds for attempt 3. One assertion whenever this file is next opened |
| 4 | **B · Readability (standing)** | The c12 comment still claims `fakeAsync + tick()` above three tests that use `async` + `await whenStable()`. Lens B's analysis found the stated zone.js mechanism does not hold up (`ZoneAwarePromise.then` captures `Zone.current` at call time, so `tick()` *would* flush it), and the reference card offers **no precedent** — its spec has zero `disabled` assertions | n/a | The resolution is legitimate; **the recorded explanation is not.** *"A wrong mechanism left in a comment is how the next maintainer comes to trust a test's timing story."* Two-line fix |
| 5 | **B · Reliability (standing)** | **`ngOnChanges` remains entirely untested** — every test assigns `component.actor` on the instance, so the reconciliation never runs. Lens A's fix *changed* that method, which raises the value of a `setInput('actor', …)` test | Constructible via `fixture.componentRef.setInput` | T-05 has no reload criterion (T-06 has c9), so not a gate. **The one un-probed state transition in the card** |
| 6 | **B/C · Risk (standing)** | **No T-05 criterion pins the `p-select` options to `GetActorTypesService`.** The double is shape-faithful and the template does read `actorService.list()`, but a hardcoded taxonomy here would pass | n/a | Scoped to **T-06 c7 / NFR-IUP-005**. Recorded so T-06's reviewer does not inherit it as already discharged |
| 7 | **C · Accessibility** | Remove control is a `div[role=button]` honouring only Enter; `role="button"` promises **Enter and Space** | Constructed statically | → **T-11.** A native `<button type="button">` delivers both keys, the correct focus ring and `disabled` semantics, and lets three attributes be deleted |
| 8 | **C · Accessibility** | `p-select` has no `ariaLabel`/`ariaLabelledBy`; the OTHER input has **only a placeholder**, which is not an accessible name and disappears on input | Constructed statically | → **T-11** (both are inside its declared scope) |
| 9 | **C · Reliability of the gate** | T-05's c8/c9 assert message *text* and the border class but **never the `warning` icon**, so T-11 c3's "icon **and** text" has no regression guard | Not a defect today — the icons render | → **T-11 c3** should assert `i.material-symbols-rounded` inside each message row |
| 10 | **C · Accessibility** | The derived `Total` has no `aria-live`/`role="status"`, so a screen-reader user typing counts never hears it change | Constructed statically | Not required by any AC. → **T-13 c9**'s SR pass |
| 11 | **C · Doc** | Record the `.section-title` ruling for `ACTOR # n` so a future reader does not "fix" a repeatable-row header into a section heading and inherit `uppercase` + `margin-bottom: 20px` | n/a | → **T-12** registration |
| 12 | **C · Verification honesty** | Tailwind is a **runtime browser CDN** here and the `fs-*`/`rs-*` families are served from a **remote** S3 stylesheet, so **no Jest run in this repo can prove a bracketed utility resolves to a real rule.** The side variants used (`rs-p-`, `rs-pt-`, `rs-mt-`, `rs-w-`, `rs-h-`) have **zero precedent anywhere in `src/app`** — documented in README, which is the contract, so not a defect | Could not construct a check — stylesheet is remote, no network access | → **T-13 c7** must confirm the card's 20px padding, 16px gaps and 12px top-paddings **render**, quoting the observation (KZ-002) |
| 13 | **C · Readability** | `class="actor-total"` is a test hook matching no CSS rule — indistinguishable from dead styling. `data-testid` states the intent (idiom already used in `pool-funding-alignment`) | n/a | *"The same shape as the failure mode this lens exists to catch"* — cheaper to disambiguate than to re-litigate |
| 14 | **C · Readability** | The duplicate-type message hand-duplicates `#requiredMessage`'s icon+text structure, so R-IUP-018 AC.3's contract now has **two maintenance sites in one file** | n/a | `[ngTemplateOutletContext]` on the existing template would leave one |

#### Forward pointers — carried by the brief or by nobody

| Target | Pointer |
| --- | --- |
| **T-07** | **(a)** Track by **`$index`**, never object identity (Advisory 1). **(b)** A dirty-check/discard baseline must come from the **GET response or a deep copy**, never from an emitted row or a shallow copy of `body()` (Advisory 2). **(c)** The `update` handler must be a **pure write** — the card emits once on init *and once per keystroke* on the OTHER name, so a debounced save-on-`update` parent would auto-PATCH a blank row **without** the `saveCurrentSection()`-in-`addActor()` call site that T-07's falsifying input targets; c11's zero-request assertion would catch it, the falsifying input as worded would **not**. **(d)** T-04's `-mt-2` pulls 8px into whatever renders above the stepper |
| **T-06** | Advisory 6 — NFR-IUP-005's "options come from the CLARISA service" is **not** discharged by T-05. T-06 c7 is the first criterion that actually asserts it |
| **T-11** | Advisories 7, 8, 9 (in scope) + the two escalations below |
| **T-12** | Advisory 11 — the `.section-title` ruling |
| **T-13** | Advisories 10, 12 — the SR pass, and that **no automated check in this repo can prove a bracketed utility resolves**; c7 must supply it by observation |

#### ⚠️ Two escalations for the user — T-11 cannot discharge its own requirements as scoped

Both surfaced by Lens C, both **T-11-time decisions**, neither blocking T-06…T-10.

**1. `docs/ux-ui/design.md` §5.7's own mandated classes have no dark-mode definition.** `.label` (`#153c71`) and `.option-label` (`#4c5158`) are **hardcoded hex in `src/styles/custom-fields.scss` with no dark-mode override anywhere in the repo**. Against this card's dark background (`--ac-grey-100` → `#2b2b2b`) Lens C computes ≈**1.3:1** and ≈**1.8:1** — far under 4.5:1, **produced by following §5.7 exactly.** Compounding it: `app.config.ts` binds PrimeNG Aura's dark palette to `darkModeSelector: '.dark-mode'`, but `dark-mode.service.ts` sets only `data-theme` on `<html>` and **nothing in `src/` ever adds `.dark-mode`** — so the select, checkbox and inputNumber render light-Aura surfaces inside a dark card. **R-IUP-017 AC.3 and NFR-IUP-002 are therefore not achievable from within the four new components**, which is precisely the case **T-11's own note routes to "stop and escalate."** *One caveat Lens C could not close:* the app also loads a **remote** stylesheet (`…amazonaws.com/frontend-parameters/colors.css`) that is not in the repo; if it redefines `.label` under a dark selector, the first half of this is void. **That single unknown gates every token claim in this spec and is worth resolving once.**

**2. T-11 c2's wording will green-light broken label associations, and the fix for the worst case is unowned.** c2 says *"Every input has a `<label>` or `aria-label`."* Read literally, **the four/one count fields and the checkbox pass** — a `<label>` exists in the DOM for both. But neither *resolves*: `input.component.html`'s number branch renders `inputId="minmax-buttons"` (a **hardcoded constant**, so four sibling fields emit the same id) while its label hardcodes `for="username"`, which does not exist in that branch; and PrimeNG's Checkbox binds its inner input's id from **`inputId`**, not `id`, so the card's `id=` lands on a non-labelable custom element and `for=` resolves to nothing. **This is T-04's `fs-14` lesson on the a11y axis: a presence check passing over a name that does not exist — worse than no label, because it converts a visible defect into a green check.** c2 must assert **resolution**, not presence. And the count-field fix lives in `input.component.html`, **outside T-11's declared scope *and* outside T-02's** — so T-11 will honestly report a finding it is not authorised to fix. Any fix is additionally bounded by R-IUP-019 to a semantics-only change (unique per-instance ids, `for` pointing at the real input) with **no visual delta**, since that file renders on Innovation Dev and ~every form page.

#### Issues encountered

One rework round, three issues from two of three lenses. No environment blockers.

#### Final verification result

Full client suite green (**310/310 suites · 6388/6388 tests**), coverage above all floors, lint clean with `git status` re-inspected, both falsification probes executed and observed failing, and the test inventory independently reconstructed line-by-line by the auditor. **T-05 closed on attempt 2 of 3.**

---

### T-06 — Innovation Use organization card: known/unknown paths, type + sub-type, OTHER name, count

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 2** (1 rework round; 3 issues from 2 lenses) |
| **Date** | 2026-08-20 |
| **Implementer attempts** | **2** of a 3-attempt ceiling |
| **Effort / skills** | attempt 1 `xhigh` · attempt 2 `xhigh` (held) · `angular-developer` |
| **Requirements covered** | R-IUP-008 (AC.1–AC.5 for `organization_count`), R-IUP-012 (AC.1, AC.2, AC.3, AC.5), NFR-IUP-005 |
| **Review mode** | **Parallel lens reviewers (2)** — correctness/contract · test-fidelity + tokens/a11y |

#### Leader deviations, recorded

| Deviation | Reason |
| --- | --- |
| **`tdd` deliberately NOT assigned**, unlike T-05 | T-06 has no derived-value business rule — it is two conditional render paths plus a service-sourced vocabulary. Red-green would be overhead; the discipline this task needed was **test-double fidelity**, addressed directly in the brief instead |
| **Two lenses, not three** | Proportionate: tokens/a11y passed cleanly on T-05 and T-06 follows T-05's idiom as its declared exemplar, so that surface was lower-risk and was merged into Lens B rather than given its own context. Two concurrent workers is also the default width |

#### Attempt 1 — both lenses FAIL

**Files created** (3, new, 756 insertions). Page not created — correctly T-07's.

**Verification:** `npm test -- --silent` full unfiltered → **311 suites, 6411 tests passed** (from 310/6388). Lint clean, `git status` re-inspected. Hex grep, malformed-token grep, and a `result_institution_type_id` write grep all zero/comment-only. **Both named falsifying inputs executed:** adding an asterisk failed c4 (`Expected: 0, Received: 1`); removing the sub-type guard failed c2's zero-rows test on a rendered `<p-select>`. Both reverted.

##### The headline question — resolved AGAINST the Leader's suspicion, from server source

The Implementer flagged a judgment call rather than burying it: **it chose not to clear the opposite identity path when `is_organization_known` toggles.** So a row can carry both `institution_id` and `institution_type_id`. The Leader made this Lens A's gating question, suspecting a manufactured `400`. **Lens A read the frozen server contract rather than §4.3's client-side transcription, and upheld the Implementer:**

| Evidence | Finding |
| --- | --- |
| `InnovationUseOrganizationDto` | Every field `@IsOptional()`, **no cross-field constraint** |
| `InnovationUseActorDto`, same file | **Does** carry `@IsExclusiveOfActorMode('disaggregated')`/`('aggregate')` on all five counts, message *"sex_age_disaggregation_not_apply is true, so a disaggregated count must not be supplied"* |
| **Therefore** | **The actor exclusivity is a real DTO rejection; the organization analogue does not exist** |
| `validateOrganizationsAreIdentified` | Its predicate is *literally* the card's `identitySatisfied` getter. A both-populated row takes the known branch and passes |
| `buildUpdateData` / `buildDataTemplate` | The server **branches on `is_organization_known` and nulls the other side** explicitly |
| Both `400` maps (§4.3 and `requirements.md` §6.2) | List *"both count modes on one row"* for actors and *"identity-less organization row"* for organizations — **there is no both-identity-paths row** |

**T-05 is not precedent, and the reason is contractual:** T-05's toggle enforces a rule the server **rejects** on; the organization discriminator is one the server **normalizes** on. Same-looking UI gesture, opposite contract obligation. And §5.5's *"mirror the existing organization card"* **is** authority here — the two endpoints do not merely agree by coincidence: `customSaveInnovationDev` and `customSaveInnovationUse` **share** `processInstitution` / `buildUpdateData` / `buildDataTemplate` / `buildWhereClause` / `removeDuplicates`, and the `is_organization_known` branch lives in the shared helpers.

**Ruling: the judgment call was correct and T-06 conforms.** Adding clearing would diverge from §5.5 without a spec amendment. **This is the second time in this run a Leader suspicion was resolved against the Leader by a reviewer reading primary source** (the first was T-04's `--ac-red-1`), and both times the worker's instinct was right.

##### Confirmed correct — recorded so it is not re-litigated

| Finding | Lens | Evidence |
| --- | --- | --- |
| **c7 is discharged — the FIRST real assertion of NFR-IUP-005 in the spec** | B | T-05 discharged nothing here, so T-06 inherited nothing. Two of three selects are **genuine rendered-DOM** assertions: `show()` + `detectChanges()` + `document.body.querySelectorAll('.p-select-option')`, verified as the real option class (`primeng-select.mjs:276`, `:364`), with `setup-jest.ts`'s global `provideNoopAnimations()` making the overlay paint synchronously. The sub-type case traverses the full chain fake → Map → `list(code)` → signal → `[options]` → rendered `<li>` text. **Zero `toHaveBeenCalled` assertions in the file** |
| **The virtual-scroll compromise is honest and its limit is stated** | B | `visibleOptions()` **is** the signal feeding the scroller (`primeng-select.mjs:721` = compiled `ɵɵproperty("items", ctx_r2.visibleOptions())`). And jsdom genuinely **cannot** paint a row: `offsetHeight` 0 → `numItemsInViewport` 0 → `calculateLast(0,0,0)` 0 → `loadedItems = []`. **The DOM technique was unavailable, not skipped.** What it does *not* prove, recorded: unfiltered, `visibleOptions()` collapses to the `[options]` value, so it is an input-binding assertion — it would still pass if the item template rendered `institution.name` or nothing at all |
| **c2 is not a race** | B | `onInstitutionTypeChange` awaits `loadSubTypes` which awaits `getSubTypes` then sets; the test awaits that promise. An unresolved promise would leave `subTypeOptions` `[]` **and** fail the sibling type-10 test — the pair is not satisfiable by a pending promise |
| **All three doubles are faithful** | B | Checked against real sources. The `FakeSubTypesService` replicates the real **non-signal** shape exactly (async populate into a Map + sync `list(code)` with `\|\| []` on miss). Every key the template reads is present, including `app-partner-selected-item`'s `acronym`/`name`/`institution_type.name`/`isoAlpha2` |
| **Row identity — construction argument complete** | A | All seven writes into `body` enumerated: two whole-object spreads (no keys named) and five `update`s naming only the five editable fields, every one carrying `...current`. Template-side the sole in-place writer is the single `app-input` at `[optionValue]="'organization_count'"`, and `setNestedPropertyWithReduceSignal`'s single-key branch can write **only** that key. The other three `[optionValue]` literals are PrimeNG **option-field** names, not body keys. **Every `[ngModel]` in the file is one-way — no `[(ngModel)]` anywhere.** `result_institution_type_id` appears only in a doc comment |
| **Tokens clean, dark mode holds without a branch** | B | Greps re-run independently: hex **0**, unbracketed utilities **0**, `isDarkMode` **0**. All eight `var(--ac-*)` tokens exist **with dark-palette values**. `--ac-light-blue-300` = `#1689ca` and `--ac-red-1` = `#cf0808` are the **exact de-hexed equivalents** of the reference's literals — right substitutions, not approximations. §7.1 semantics respected; `--ac-orange-1` appears nowhere |
| **The native `<button>` for remove was adopted** | B | T-05's recommendation taken up — the `div[role=button]`/Enter-only defect **does not recur**. The `Specify other` input's `aria-label` is on a native `<input>`, so it resolves |
| **c4 airtight by construction; c6 encodes rounding not rejection** | B | c4's query is the whole debug tree **including `app-input`'s subtree** — the widest correct scope. The template contains zero `text-red-500` nodes and never passes `isRequired`, so the asterisk is unreachable. c6's `Number.isInteger` fails on `undefined`, which is what anchors the `-1` half |
| **`getSubTypes(2, typeId)` matches §5.5's depth**; count renders on both paths with `[min]="0"` + `[maxFractionDigits]="0"` and no `isRequired`; both paths mutually exclusive by `@if/@else`; sub-type gated on resolved rows, not on type selection | A | Verified |

##### `STATUS: FAIL` — three issues, all in scope

**Lens A — `ngOnChanges` is an incomplete mirror of `ngOnInit`.** It replaces `body` but **never refreshes the sub-type option list**. `ngOnInit` bootstraps it, `onInstitutionTypeChange` refreshes it, `ngOnChanges` does neither — so on the parent-driven ingress path a row carrying `institution_type_id` + `sub_institution_type_id` renders **no sub-type control**, or the *previous* type's options while `body()` holds a sub-type absent from that list. The card implements `ngOnChanges` deliberately, *"so it advertises parent-driven row replacement and then serves a different rendering for the same row depending on which door the row came through."* The value is not lost, but **the user cannot see or change a saved sub-type**.

> **Violated Rule:** c9 and **R-IUP-012 AC.2**. **c9 is currently discharged only on the `ngOnInit` path** — all three c9 tests assign `component.organization` before the first `detectChanges()`, and an input assigned directly on the instance **produces no `SimpleChanges` record**. The parent-driven path — the one §6.7 step 4's post-save re-read and §6.1's `onVersionChange` reload actually use, against index-keyed rows — has **zero coverage**.

Reachability: **reachable by construction, not constructible today** (needs T-07). Two constructions given: index shift after a row removal, and a version switch pushing another version's rows into live card instances. The benign case is why it passes today — after a successful save the re-read equals what the card holds, the guard short-circuits, and the loaded options stay correct. Asymmetry noted: the `Specify other` input keys directly off `body()`, so it *does* restore on both paths — making the sub-type gap **an inconsistency inside the card**, not a uniform limitation.

**Lens B — c8's test name outran its assertion.** The unknown-path test is named *"disables organization-type, sub-type and Specify other"* but **never evaluates the sub-type select's `[disabled]`**: it drives type `78`, the fixture has no `78` key, the fake resolves `[]`, and the guard removes the control from the DOM. No test renders that select with `disabled = true`. **This is the T-05 c12 coverage hole recurring**, plus the exact pattern commit `9b571c36` was made to close.

**Lens B — nothing asserts `organization_count` renders on the KNOWN path.** §5.5 puts the count on *both*, but every count assertion runs on the unknown path (the default). On the known path c1 asserts only selects, c4 only asterisks, c9 only `body()`, and c8's `forEach` passes **vacuously** on an empty query. **Deleting the count field from the known branch leaves the whole suite green while violating §5.5.**

##### Leader adjudication

**Not a Pivot for T-06** — one product defect and two evidence defects against a sound card spec. All three accepted in scope; **one consolidated rework** dispatched. Lens A's three companion items (refresh `initialSnapshot`, make it a **signal** so `touched`'s dependency is real rather than incidental, and an in-flight guard in `loadSubTypes`) were folded into Fix 1 because they live in the same lines.

**A coupling hazard was deliberately excluded from the rework and forward-pointed instead** — see the T-11 pointer below. Fixing the inert `aria-label`s would move the attribute off the host and **red six criteria at once**, because T-06's `selectByAria()` helper locates selects by it.

#### Attempt 2 — **both lenses PASS**

**Files changed** (2): `.ts` and `.spec.ts`. **`.html` unchanged.** The Implementer's two falsification probes touched it temporarily; **the Leader verified the revert rather than accepting the claim** — 135 lines (identical to attempt 1), the probe's `@if (!body().is_organization_known)` wrapper absent, and the count field in a plain `<div>` outside both branches, so §5.5's both-paths rule holds structurally. Both lenses independently re-confirmed this.

**Fix 1 (Lens A) — four items, all landed**

| Item | Verified |
| --- | --- |
| `private syncSubTypes(row)` extracted, called from **both** `ngOnInit` and the `body.set(next)` branch of `ngOnChanges` | ✅ with the `else this.subTypeOptions.set([])` present and **reachable from `ngOnChanges` on both triggering shapes** — a swap to a known-path row, and a swap to an unknown row with no type. The second is what matters for c2: without it, a card holding type-10 options that receives a blank row would keep rendering the sub-type select with the departed type's options |
| `initialSnapshot` refreshed alongside `body.set(next)` | ✅ |
| `initialSnapshot` → `signal<string>` | ✅ **complete, no half-conversion** — declaration, two `.set()` writes, one read inside `touched`, no residual plain-field access. `touched` now has a genuine dependency on both signals, which was the point |
| In-flight guard in `loadSubTypes` | ✅ after the `await`, before the `set` |

**Fix 2 (Lens B):** c8's unknown-path test now drives type 10 first (resolving two rows **through the new guard**), asserts **both** the type-select's and the sub-type-select's `disabled === true` while the control is in the DOM, then switches to 78 and asserts `Specify other`. Approach (a) of the two Lens B offered, chosen for requiring no fixture change.

**Fix 3 (Lens B):** `expect(appInputLabelled('Organization count')).toBeTruthy()` in c1's known-path test; `expect(inputs.length).toBe(1)` guarding c8's known-path `forEach`.

**Housekeeping:** unused `tick` import removed — the one Lens B's gate-fact note flagged as invisible to every check in this repo.

**Both falsification probes executed and failed as predicted:**

| Probe | Result |
| --- | --- |
| Revert the `ngOnChanges` → `syncSubTypes(next)` call | `expect(subTypeSelectDe).toBeTruthy(); Received: undefined` at `spec.ts:479` |
| Wrap the count `app-input` in `@if (!body().is_organization_known)` | `expect(appInputLabelled('Organization count')).toBeTruthy(); Received: undefined` at `spec.ts:161:54` |

**Verification:** `npm test -- --silent` full unfiltered → **311 suites, 6412 tests passed**. Coverage 99.16 / 98.00 / 98.76 / 99.42. Targeted file 24/24. Lint clean, `git status` re-inspected. Hex, malformed-token and `isDarkMode` greps **re-run by both lenses independently** → zero.

##### `LENS A — STATUS: PASS`

> All four Lens A remediations landed as specified and are correct by inspection… the in-flight guard sits after the `await` and before the `set` where it **closes the out-of-order class outright** — safe because all three callers write `body` before calling. My Q5 half-one advisory is closed by the snapshot refresh. The seven-write enumeration for `result_institution_type_id`, the ingress shallow-spread, and `identitySatisfied` are all undisturbed.

**Why the guard closes rather than narrows the class** — recorded because it depends on an invariant that is now load-bearing: **all three callers write `body` before invoking `loadSubTypes`** (`ngOnInit` 98→102, `ngOnChanges` 109→111, `onInstitutionTypeChange` 141→147). So the guard never wrongly skips a legitimate load, including on the new `ngOnChanges` path. Across all three orderings of a rapid 10 → 20 → 10, every settlement either matches the row's current type and writes `list(typeId)` read from the Map **at write time** (the freshest content for the winning code), or is skipped. **The terminal state is always the list for the row's current type, regardless of settlement order.**

**`touched`'s semantics changed, for the better.** The refresh moves it from *"diverged from the row this card was constructed with"* to *"diverged from the most recent row the parent pushed"* — which is what R-IUP-012 AC.5 actually asks for (*"a row the user has begun but not identified"*). Its only new false-negative is a parent-pushed unidentified row reading as untouched, which is **correct**, since the user has not begun it.

##### `LENS B — STATUS: PASS`

> Both FAIL issues are genuinely closed, not relabelled. c8's unknown-path test now renders the sub-type select … and asserts its `[disabled]` while it is in the DOM, with non-null assertions that fail loudly rather than vacuously — and **its title, previously false, is now accurate.**

- **c8's sequencing is sound:** both `expect()` calls execute eagerly and are recorded **before** the switch to 78 is called, so the later switch cannot retroactively invalidate them. And `selectByAria(...)!` on an absent control yields `undefined` and the `!` produces a **TypeError — a loud failure, not a silent green.**
- **`toBe(1)` is exact, not merely non-zero.** The template holds exactly **one** `<app-input>`, outside both branches — the known branch has `p-select` + `app-partner-selected-item`, the unknown has selects + a raw `pInputText`, none of which is an `InputComponent`. So the count is 1 on **both** paths, and the exact assertion additionally catches an accidental duplicate.
- **c1's new assertion discriminates**, resolving through `By.directive(InputComponent)` on the rendered tree and matching the `label` @Input. The falsification landed on **exactly that line** (`spec.ts:161:54`) — line number, message and mechanism all agree.
- **A bonus on the c7 axis:** the new `setInput` case re-asserts the sub-type options' distinctive names through the **`ngOnChanges` ingress path**, so **NFR-IUP-005 now has a rendered-DOM proof on two independent entry points.**
- **The `signal<string>` conversion disturbs no prior assertion**, and the reason is structural: **`ngOnChanges` cannot fire in any c5 test**, because all three assign `component.organization` as a plain property, which produces no `SimpleChanges` record.

**Test arithmetic reconstructed independently by Lens B:** all 23 attempt-1 titles present **verbatim**, one addition (the `setInput` case), 24 in-file, suites flat at 311, so 6411 → 6412 is that one test and nothing else. Fixes 2 and 3 moved no counter because they added `expect`s inside existing blocks.

#### Decisions made

1. **A Leader suspicion was resolved against the Leader for the second time this run** — and again by a reviewer reading primary source. T-04's `--ac-red-1` and now T-06's toggle semantics. **Both times the worker's instinct was right and its stated rationale was the weaker part.** Worth carrying into how briefs are written: ask workers to flag judgment calls (both did), and route the flag to primary source rather than to precedent.
2. **A coupling hazard was deliberately kept out of the rework.** Fixing the inert `aria-label`s would move the attribute off the host and **red six criteria at once** through the `selectByAria()` helper. Excluded and forward-pointed to T-11 as one coordinated edit. Recorded because the *right* fix was knowingly deferred, which is different from missing it.
3. **`tdd` was correctly withheld.** T-06's risk was fixture fidelity, not expected-value derivation, and the brief addressed it directly. Both lenses confirmed all three doubles faithful and c7/c2 sound on first attempt.
4. **Two lenses were sufficient here.** Tokens came back clean first time under the merged Lens B, vindicating the choice not to spend a third context on a surface that T-05 had already validated and that this card inherited by exemplar.

#### `ADVISORY` — recorded; **not** gating, **not** rework, **not** new tasks

Attempt-1 advisories carry forward unactioned. New at attempt 2:

| # | Lens | Finding | Reachability | Disposition |
| --- | --- | --- | --- | --- |
| 1 | **A · Reliability** | The in-flight guard keys on `body().institution_type_id` rather than a monotonic request token, so it cannot distinguish *"the row still wants type 10"* from *"the row is now known-path but retains a stale `institution_type_id: 10"* — exactly the both-populated row the settled ruling permits | **State constructed; no observable failure could be constructed from it.** The sub-type select lives inside the unknown-path `@else`, so nothing renders it on the known path, and the re-populated list is correct for the type the row still carries | Benign **unless the sub-type control ever renders on the known path**. `private subTypeRequest = 0` with a captured generation would make it exact. Recorded, not changed |
| 2 | **A · Test gap** | `syncSubTypes`'s `else` clear is **load-bearing for c2 on the `ngOnChanges` path yet has no falsifying test** — on `ngOnInit` it is a semantic no-op (`subTypeOptions` already `[]`), and the new case exercises only the loading direction. **Delete the line and the suite stays green** | Reachable under §5.2's index keying via the same shift construction; **not constructible today** — T-07 does not exist | → **T-07's spec work**, where the index-shift sequence is reachable end-to-end and can be asserted on the page rather than simulated on the card |
| 3 | **B · Reliability** | The **in-flight guard itself has no test** — the one new behaviour without one | **Could not construct with the current double:** `FakeSubTypesService` resolves in a single microtask in call order, so overlapping calls cannot resolve out of order. Reachable in production (real HTTP round trip) and in test only with a **deferred** double | No T-06 criterion covers it. One test with a deferred double would prove it; without one the branch is asserted by inspection only |
| 4 | **B · Risk** | `ngOnChanges` now re-baselines `initialSnapshot`, so a parent-driven row replacement **resets `touched` to `false`** and would hide R-IUP-012 AC.5's message for a row the user had begun. The `JSON.stringify` guard protects the common case (a parent echoing the same row is a no-op), so it bites only when the parent pushes back a **differing** object for the same row — e.g. a normalised or id-stamped copy after a save | **Could not construct** — T-07 does not exist, so nothing today pushes a differing row down. Becomes constructible the moment T-07's write-back lands | → **T-07**, which is the right place to test it. *"Flagging it now so it is not discovered as a `400`-adjacent surprise later"* |

#### Forward pointers — carried by the brief or by nobody

| Target | Pointer |
| --- | --- |
| **T-07** | Advisories 2 and 4 above, **plus everything already filed from T-05**: track by `$index` never object identity; a dirty-check baseline must come from the GET response or a deep copy; the `update` handler must be a **pure write** (both cards emit once on init and per keystroke on their free-text fields) |
| **T-08** | **The escalation below.** `buildPayload` step 3 must null the inactive identity path, symmetric with step 2 |
| **T-11** | **One coordinated edit, or it breaks T-06's suite.** (a) `aria-label` → `ariaLabel` on all three `p-select`s **and migrate `selectByAria()` in the same change** — the helper is load-bearing for c1/c2/c3/c7/c8/c9. (b) checkbox `id` → `inputId` (`primeng-checkbox.mjs:525`). (c) `app-input`'s `for="username"` vs `inputId="minmax-buttons"` — **unfixable from T-06's file set**, since `app-input` exposes no `inputId`/`ariaLabel`; **T-11 c2 cannot honestly tally `Organization count` as "has a label" without extending `app-input`.** (d) Field labels are `<h2>` elements (inherited from T-05), putting 1–3 spurious level-2 headings per card in the outline. (e) The request-partner control's accessible name is the single word *"here"* |
| **T-13** | `rs-p-[12]` and `rs-p-[16]` have **no precedent anywhere in `src/app`** and their generator is a **remote** stylesheet — bracketed and in the documented range, so not the `fs-14` failure mode, but only c7's human gate can confirm they resolve |

#### Issues encountered

One rework round; three issues from two lenses. No environment blockers.

#### Final verification result

Full client suite green (**311/311 suites · 6412/6412 tests**), coverage above all floors, lint clean with `git status` re-inspected, both falsification probes executed and observed failing, the `.html` revert verified by the Leader rather than accepted, and the test inventory reconstructed independently by the auditor. **T-06 closed on attempt 2 of 3.**

---

### T-07 — Page shell: layout, four cards, load, the four UI states, conditional justification

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 2** (1 rework round; 5 issues, **all evidence defects — zero product defects**) |
| **Date** | 2026-08-20 |
| **Implementer attempts** | **2** of a 3-attempt ceiling |
| **Effort / skills** | attempt 1 `xhigh` · attempt 2 `xhigh` (held) · `angular-developer`, `tdd` |
| **Requirements covered** | R-IUP-004 (all), R-IUP-006 (AC.1–AC.4), R-IUP-010 (AC.4, AC.5), R-IUP-012 (AC.1, AC.3, AC.4), R-IUP-015 (AC.1, AC.2), R-IUP-002 (AC.3) |
| **Review mode** | **Parallel lens reviewers (2)** — correctness/state · test-fidelity + tokens/a11y/copy |

#### Attempt 1 — Lens A **PASS**, Lens B **FAIL** (5 issues)

**Files created** (3, new, 934 insertions). Route/sidebar/`GreenChecks` correctly left to T-10; `buildPayload`/PATCH to T-08; save-blocking and `duplicateType` wiring to T-09.

**Verification:** `npm test -- --silent` full unfiltered → **312 suites, 6443 tests passed** (from 311/6412). Lint clean, `git status` re-inspected. **`npm run build` clean** — run early, which is T-13 c5's check. Hex and unbracketed-utility greps zero, **re-run independently by Lens B**.

**Every fix from this round is test-side. Lens A passed the implementation entirely — zero product defects.**

##### Lens A — `STATUS: PASS`

> DD-11 is airtight (`body` untouched by reference on failure, `loadFailed` correctly reset on both version-switch directions), DD-10's asymmetry is correct and the blank actor is unreachable in the failure path twice over, §6.4 is gated on the resolved level with the correct fail-closed fallback, §5.6's `id` round-trips without the shared card learning it exists, both id accessors are correct for their respective uses, `replaceUrl: true` matches all six sibling pages, and the R-IUP-015 gate is complete with no ungated control.

Notable confirmations, recorded so they are not re-litigated:

- **Both id accessors are right, and swapping them breaks both directions.** `getCurrentNumericResultId()` strips the platform prefix (`'PLATFORM-1234'` → `1234`) for the endpoint's `number` param; `currentResultId()` is the raw route segment, correct for `['result', <id>, path]` because the URL must carry the id the user is browsing — **including the prefix for a federated result**.
- **`replaceUrl: true` is platform convention, not invention** — all six sibling detail pages use it for Back/Next. Diverging here would be the defect.
- **No `ngOnInit` is conformant.** `onVersionChange` registers an `effect`, which runs once on registration. Verified byte-equivalent to `capacity-sharing`.
- **The read-only gate is complete** — Lens A enumerated stepper, all three card types (8 + 7 + 3 controls), every add and remove affordance, and the textarea, and *"could not find an ungated control or affordance"*.

##### The methodology finding of the run — a Kaizen lesson, sharpened

Lens A was asked whether three spec-accuracy findings (T-03's §5.6 `validateEmpty` claim, T-04's "five names" arithmetic, T-07's DD-8 rationale) constitute a pattern. It rejected the obvious lesson as unactionable and produced a sharper one:

> A spec's **rationale** is not load-bearing for the implementation — all three produced conformant code anyway, because in all three the *instruction* was independently right. A rationale **is** load-bearing for any **falsifying input derived from it.** DD-8 is the only one of the three where a falsifier was derived from the rationale rather than from the criterion's assertion mechanism, and it is the only one that came out **inert** — a criterion with no gate, the exact failure mode the falsifier column exists to prevent.
>
> **Lesson:** derive every falsifying input from **the observable the criterion asserts on**, never from the design decision's stated cause; and for any falsifier of the form *"add call X → criterion must FAIL"*, confirm in the same breath that **X actually produces the observable the criterion measures.** At Judgment Day, spot-check rationales **only** where a falsifier or a done-criterion depends on them — a bounded sweep, unlike "verify all prose."

**It then found a fourth instance, different in kind, that would have caused a real defect.** `design.md` §6.1 step 1 reads `` `ngOnInit` **/** `onVersionChange` `` — a slash, correctly meaning *either*. `tasks.md` T-07's Implementation notes transcribe it as `` **+** ``. **Following `tasks.md` literally fires two GETs on load**, each with `loadingTrigger: true`, hence two `greenChecks.set({})` clears and two green-check round trips. Second clause of the lesson: *`tasks.md`'s Implementation notes are a **transcription** of `design.md`; when the two disagree, that is a spec bug to fix upward, not a choice for the Implementer.*

##### The `saveCurrentSection` finding — c11 satisfied, its falsifier inert

The Implementer discovered that `ActionsService.saveCurrentSection()` sets a signal with **zero production consumers** (the only plausible one, `SaveOnWritingDirective.autosave()`, is an **empty method body**). The Leader verified this independently before briefing; Lens A verified it a third time.

**Consequence: DD-8's stated rationale is false** — calling it from `addActor()` PATCHes nothing, so **c11's named falsifying input cannot fail.** The Implementer re-derived the falsifier against an observable that *can* see the violation (a direct spy, asserted three times) and **disclosed the substitution rather than claiming the original.** Lens A's ruling: **c11 is satisfied** — the criterion's own text asks for zero requests on `HttpTestingController`, which was produced with the real `ApiService` and the real HTTP layer, including flushing the `green-checks` side-effect GET so it could not be mistaken for an `addActor()` request. *"A satisfied criterion with a defective falsifier. The fix belongs in `tasks.md`, not in the diff."*

**And DD-8's decision is worth more than its rationale claims:** the moment anyone gives `saveCurrentSectionValue` a consumer — which is exactly what that empty `autosave()` body is a placeholder for — the hazard becomes live **retroactively** in every page that calls it (`alliance-alignment`, `evidence`, `innovation-details`), and **this page will be the only one already immune.**

##### Lens B — `STATUS: FAIL`, five issues, all evidence defects

| # | Issue | Why it matters |
| --- | --- | --- |
| 1 | **c10's asterisk assertion cannot fail** — it queries `.text-red-500`, but the shared quantification card renders its asterisk as `text-[15px] text-[#CF0808]`. So the assertion returns null whether `fieldsRequired` is `false`, `true`, **or omitted — and its default is `true`.** Removing `[fieldsRequired]="false"`, the exact binding R-IUP-012 AC.3 exists to enforce, **reds nothing** | A check that cannot fail is not evidence (§10.3) |
| 2 | **c13 under-covers the surface its own wording names** — *"every input, every stepper button, and every add/remove control"*. Nothing inside the three card types is asserted disabled, and no remove affordance is asserted absent. **Mutation that stays green:** drop `[disabled]` from the three child usages → read-only mode exposes **~10 editable controls per actor row plus every remove icon** | **Third recurrence of this exact shape** (T-05 c12, T-06 c8) |
| 3 | **c5's evidence is vacuous** — `expect(greenChecks.set).not.toHaveBeenCalled()` cannot fail for *any* implementation, because the component never references `greenChecks`. A structural fact dressed as a test. **And the mechanism the AC forbids is real, one layer down:** `ToPromiseService` runs `greenChecks.set({})` **unconditionally at request start**, and `finalize()` calls `updateGreenChecks()`, which sets `response.data` — `undefined` if that second GET also fails. The block mocks `ApiService`, bypassing all of it | Confirmed the Leader's pre-review suspicion |
| 4 | **c3's rendered half is a signal read**, leaving the spec's only **High** risk (RK-4) undetectable at the call site. The likely mutation — `[selectedLevelId]="resolvedLevel()"` — **type-checks and looks like a fix for the id/level trap**, and would leave the whole suite green while highlighting the wrong button and showing the wrong callout. **T-04's spec structurally cannot see it**, because it is handed the input directly | The id≠level trap, at the one place no child spec can guard it. **The most valuable of the five** |
| 5 | **c9's name outruns its assertion** — titled *"no textarea and no required message"*, asserts only the textarea, duplicating c6 exactly. The "does not block completion" half has no save path until T-08/T-09 | Same pattern commit `9b571c36` was made to close |

##### Leader adjudication

**Not a Pivot.** All five are evidence defects against a sound implementation, all in scope (each cites a T-07 criterion), and all fixable in the spec file. **One consolidated rework** dispatched.

**On Issue 3 the Leader chose remediation (b)** — record c5 honestly as *structurally satisfied, with `ToPromiseService`'s clear-then-refresh named as outside T-07's reach* — rather than (a), asserting shared-service behaviour no T-07 criterion owns. Lens B explicitly permitted either: *"An honest KZ-007 record is acceptable; a claimed PASS on this assertion is not."*

**Lens B's advisory A4 was folded into the rework** because it lands in a test already being edited: c6's `This field is required` search is **page-wide**, and three components can emit that string — attribution is clean today only by accident of the default body.

#### Attempt 2 — Lens B **PASS** (Lens A's surface untouched, so it was not re-run)

**Files changed** (1): `.spec.ts` only, 590 → 677 lines. The Leader verified `git diff` on the `.ts` (207) and `.html` (137) is **empty**, so Lens A's PASS carries forward without a re-audit — a deliberate cost saving, recorded.

**Six fixes applied**

| Fix | What landed |
| --- | --- |
| c10 | The vacuous `.text-red-500` query replaced with a **text-node scan for a bare `*`**, plus `not.toContain('This field is required')` on the quant card, plus a length guard |
| c13 | Two new tests — every rendered `input`/`textarea` in all three card types asserted disabled (length-guarded per card type), and every remove affordance asserted hidden. Stored values extended to `unit: 'ha'` and `quantification_number: 3` read off the **rendered** inputs |
| c5 | Remediation **(b)** — the weak assertion kept with an in-file comment recording its exact reach, that the zero-call-site fact is **grep-verified not test-verified**, and naming `ToPromiseService`'s clear-then-refresh as out of T-07's reach |
| c3 | The **rendered** stepper callout asserted (`toContain('7 - Level 7 name')`) — closing RK-4 at the call site |
| c9 | Two missing assertions added; the completion half **attributed as owed to T-08 c14 / T-09 c6, not claimed** |
| A4 | c6's search scoped to `By.directive(TextareaComponent)` |

**All three falsification probes failed as predicted**

| Probe | Failure |
| --- | --- |
| Remove `[fieldsRequired]="false"` | `Expected: false / Received: true` |
| Remove `[disabled]` from the actor card | `Expected: true / Received: false` **and** `Expected: 0 / Received: 1` |
| `[selectedLevelId]="resolvedLevel()"` (**RK-4**, the spec's only High risk) | `Expected substring: "7 - Level 7 name" / Received string: " 0 1 … 9 6 - Level 6 nameLevel 6 definition"` |

**That third output is the finding rendered.** The mutation resolves **`6 - Level 6 name`** where level 7 was expected — the id≠level off-by-one, showing the wrong callout and highlighting the wrong button, on a mutation that **type-checks and looks like a fix.** T-04's own spec structurally cannot see it, because it is handed the input directly. This is the single most valuable assertion added in the entire run.

**Verification:** `npm test -- --silent` full unfiltered **from `client/research-indicators`** → **312 suites, 6445 tests passed**. Coverage 99.23 / 97.98 / 98.83 / 99.5. Lint clean, `git status` re-inspected. Hex and unbracketed-utility greps zero.

##### The unprompted stabilization — scrutinised, and upheld with a correction

The Implementer added, unbidden, `await fixture.whenStable(); fixture.detectChanges();` to c13's `beforeEach`, attributing it to PrimeNG. The Leader flagged it for the hardest possible look, since Lens B had previously found an equivalent T-05 substitution's *diagnosis* implausible while its *resolution* was sound.

**Lens B's ruling: legitimate, and this time the diagnosis is substantively correct — but it names the wrong layer.**

> The true mechanism is **Angular Forms, not PrimeNG.** `app-input`'s number branch carries **both** `[disabled]` and `[(ngModel)]` on the same element, so `NgModel` **claims the `disabled` binding as its own `@Input`** — the DOM property binding never happens — and applies it through `_updateDisabled`, **deferred by a resolved-promise microtask**, reaching the control via `setDisabledState()`. For a **raw** element (`app-textarea`'s `<textarea>`) that writes the native property imperatively, so no extra pass is needed — **which is exactly why the pre-existing textarea assertion passed in attempt 1 on a single `detectChanges()`.** For a **wrapped** PrimeNG control it sets the component's field and calls `markForCheck()`, so the inner native `<input>`'s binding needs **one more CD pass.**

**"The internal consistency of that pattern is what convinces me the observation is real rather than a shot in the dark"** — it applies to exactly the controls the new assertions target (`p-inputNumber`, `p-checkbox`) and not to the one that already worked.

**Can it make a failing assertion pass? No** — additional passes over a *missing* binding yield `false` forever, and **probe 2 failed with the accommodation in place**, which is direct empirical confirmation the assertions stay live. It introduces no softening (no `try/catch`, no conditional expectation, no `if (el)` guard, no `toBeGreaterThan` where an exact count belongs). It masks exactly one class — an implementation that disables *one microtask late* — which is not a defect class, since `isEditableStatus()` is settled before the cards render. **And the alternative fix (asserting the component flag) is the one c13's disqualifier bans, so the Implementer chose the correct escape.** It is also load-bearing for the new `numberInput.value === '3'` assertion for an independent reason.

##### Other confirmations

- **c10 is non-vacuous on both halves.** The Organizations half is **live, not passing by construction** — every asterisk form in the codebase is span-wrapped, so the most plausible mutation (adding `[isRequired]="true"` to that card's count input) is caught. Residual: a bare `*` text node outside any `<span>` would slip through.
- **c13's hole is closed — the T-05 c12 / T-06 c8 shape does not recur a third time.** All ~10 controls per actor row reached, all three `forEach` loops length-guarded, every remove affordance asserted absent with selectors matching the real bindings, and the quant card's delete icon correctly given different treatment with the reason recorded rather than papered over.
- **Arithmetic:** all 31 attempt-1 tests survive, two added (both inside the existing c13 `describe`), one title extended, one body rewritten. 6443 → 6445, suites flat at 312, 590 → 677 lines.
- **Branch coverage 98.00 → 97.98 with zero implementation change cannot be a regression from this task** — added tests can only hold or raise a ratio whose denominator did not move. It signals only that the figure is project-wide and drifts with anything else in the tree. **T-13 c4 owns the authoritative run.**

#### Decisions made

1. **Only one lens was re-run.** Because the rework was spec-file-only and the Leader verified the implementation byte-unchanged, Lens A's PASS carried forward. Re-auditing an untouched surface would have cost a full context for no information.
2. **c5 was recorded honestly rather than force-fitted.** Remediation (b) over (a): asserting `ToPromiseService`'s behaviour would have put shared-service coverage inside a criterion that does not own it. **Lens B's follow-up request is honoured by this entry** — *"a `[x]` in `tasks.md` next to c5 is read by people who will never open the spec file"*, so the limitation is stated here, in the audit trail, not only in a code comment.
3. **The stabilization's attribution is corrected in the record** even though the code is right, because *"it prevents the comment being copied as a general 'PrimeNG is flaky' licence."*

#### `ADVISORY` — new at attempt 2

| # | Lens | Finding | Reachability | Disposition |
| --- | --- | --- | --- | --- |
| 1 | **B · Risk / a11y** | **`app-input` emits duplicate, cross-wired DOM ids.** It hardcodes `id="username"` on the text branch (with `label for="username"` and `aria-describedby="username-help"`) and `inputId="minmax-buttons"` on the number branch. **On the c13 fixture alone the page renders six elements with `id="minmax-buttons"`.** `label[for]` resolves to the **first match in the document**, so every visible `app-input` label points at **some other field's control** | **Reachable deterministically** — any render with two or more numeric fields; established by reading the shared template | **Sharper than the known `app-textarea` case: there `for` resolves to *nothing*, here it resolves to the *wrong element*.** Inherited from a shared component, so → **T-11**, alongside the other label findings. **Coupling:** `spec.ts:472`'s `input#minmax-buttons` query works only because it is scoped to the quantification card — document-wide it would hit the actor card's first count field. **If T-11 fixes the ids, that assertion must migrate in the same change** |
| 2 | **B · Reliability** | c13's remove-affordance test is **absence-only** and keyed on `aria-label` strings, so a rename would void two of three detectors silently — **and T-11 is the task most likely to touch exactly those strings** | Reachable via planned T-11 work | A positive control in the editable state (assert count `1` per rendered row) would make the selector self-validating |
| 3 | **B · Readability** | The stabilization comment names PrimeNG where the cause is Angular Forms | n/a | Recorded above. *"Prevents the comment being copied as a general 'PrimeNG is flaky' licence"* |
| 4 | **B · Reliability** | c10's organization half has **no length guard** — a residual of Lens B's own remediation, which named only the quantification guard | n/a | c2 and c3 cover the "org card renders" fact elsewhere, so the aggregate is sound; one extra assertion would make the test self-contained |

#### Forward pointers

| Target | Pointer |
| --- | --- |
| **T-08** | **(a) The stale-success race becomes destructive here.** `getData()` has no request sequencing, and `app-navigation-buttons` renders **outside** the `@if (loadFailed())` branch — right for T-07 (a user must be able to leave a broken section) but the moment `(save)` is wired, a PATCH built from a stale `body` would write **version N−1's rows onto version N** — the DD-11 destruction class arriving through a door DD-11 does not cover. T-08's save path must consult `loadFailed()`. **(b) `unit`/`description` absent→`''`:** the quantification card emits on its first effect flush, so a never-touched blank row is `{unit: '', description: ''}`, **not** all-absent. §6.5 step 4 drops rows where all three are "absent" — an implementation reading that as `== null` **keeps and sends the row**, which is the untouched-blank-row `400` §4.3 claims to close by construction. **T-08 must treat "absent" as falsy-or-empty.** **(c)** T-09 has no criterion for *level 3 blank → save proceeds*; c9's other half is owed there |
| **T-10** | **Ordering constraint:** an unwired `Save` button renders in the editable status today (the page binds `(back)`/`(next)` but not `(save)`). Not user-reachable because no route exists — **it becomes reachable if T-10 lands before T-08** |
| **T-11** | Advisories 1 and 2 above, plus the standing inbox: T-06's `selectByAria()` coupling, `app-textarea`'s `for="username"`, heading hierarchy, and **the scope gap** — R-IUP-017's dark-mode scenario cannot be satisfied within T-11's declared scope |
| **T-12** | The inline load-failure banner is a **new visual pattern** not on T-12 c1's registration list, and R-IUP-017 AC.4 requires registration *"in the same change"* |
| **T-13** | c7 must confirm card padding ≈30px and ≈25px between cards **as a specific observation** — *"the page renders"* would not discharge it, because no gate in this repo can prove the `rs-*` family resolves |

#### Final verification result

Full client suite green (**312/312 suites · 6445/6445 tests**), coverage above all floors, lint clean with `git status` re-inspected, three falsification probes executed and observed failing including the spec's only High risk, and the test inventory reconstructed independently by the auditor. **T-07 closed on attempt 2 of 3.**

---

## ⚠️ BUDGET TRIPWIRE — breached at T-07, execution stopped for the user

`/akili-execute` §2.4: *"When actual execution exceeds it, **stop and escalate to the user** with the delta and the cause — do not continue on the assumption that finishing is what was wanted. Exceeding a budget is information, not failure; the cost of a mis-sized spec is only recoverable while it is still running."*

**Status: actually breached, not projected.**

| Measure | `design.md` §12 budget | Actual at T-07 (7 of 13 tasks) | Verdict |
| --- | --- | --- | --- |
| LOC | ~3,200 | **3,463** | ❌ **Exceeded, with 6 tasks still to run** |
| Review rounds | ~28 | **12** | ✅ Tracking well under |
| Tasks | 13 | 7 done | 54% |

**The cause is single and consistent, established over seven tasks.** Every task shipping new spec files over-runs, and **the over-run is entirely in the spec tier**:

| Task | §6 derivation | Actual | Delta | Spec-file share of actual |
| --- | --- | --- | --- | --- |
| T-01 | 210 | 344 | +134 | 252 / 344 |
| T-02 | 72 | 133 | +61 | 129 / 133 |
| T-03 | 170 | **90** | **−80** | — (a `git mv` carries code without authoring it) |
| T-04 | 300 | 363 | +63 | 270 / 363 |
| T-05 | 610 | 688 | +78 | 424 / 688 |
| T-06 | 600 | 824 | +224 | 500 / 824 |
| T-07 | 680 | 1,021 | +341 | 677 / 1,021 |

**Implementation lines track the derivation closely; the spec tier does not.** §12's split was ~1,700 implementation / ~1,500 spec. The implementation half is holding. The spec half is the entire miss — and the reason is visible in this log: **the assertion standard this spec sets is expensive to meet.** Every "assert the *rendered* output, not the signal", every length-guarded loop, every executed falsifying input, and every disqualifier that bans the cheap assertion costs lines. Fourteen falsification probes were run across seven tasks, and **five of them caught a defect the criteria alone would have passed.**

**Projection for the remaining six tasks** (§6 derivation: T-08 400 · T-09 160 · T-10 190 · T-11 80 · T-12 40 · T-13 0 = **870**). At the observed +31% on spec-bearing tasks, that is ~1,140, for a **final total near 4,600 — about +44% over §12.**

**What the Leader is NOT doing:** absorbing this silently, or continuing on the assumption that finishing is what was wanted. Both are what the tripwire exists to prevent.

**Options for the user, with the Leader's recommendation:**

1. **Accept the overrun and re-baseline §12** to ~4,600, recording the cause (spec-tier density, not scope creep). T-13 c10 then reconciles against a figure that means something. **Recommended** — the spend bought falsifiable evidence, the review-round budget is healthy at 12/28, and no task has exceeded its 3-attempt ceiling.
2. **Hold §12 and reduce the assertion standard** for the remaining six tasks — fewer rendered-output assertions, fewer probes. **Not recommended:** this is precisely the standard that caught the c3/RK-4 mutation, T-05's aliasing, T-06's c8 hole and T-07's four dead assertions. Cutting it to hit a line estimate trades real defect detection for a number.
3. **Split the spec** — ship PR 1 + PR 2 (T-01…T-09) and re-scope T-10…T-13 as a follow-on. Defensible, but §7's PR plan already sequences this, and T-13 is the verification gate for the whole thing.

### User ruling — 2026-08-21

**Option 1 accepted: the overrun is accepted and §12 is re-baselined.** The user's instruction was `continue`, given after the delta, the cause and the three options were presented in full. Execution resumed at T-08.

**Re-baselined budget for T-13 c10's reconciliation:**

| Measure | §12 original | Re-baselined | Basis |
| --- | --- | --- | --- |
| LOC | ~3,200 | **~4,600** | 3,463 actual at 7 tasks + ~1,140 projected for the remaining six (§6 derivation 870 at the observed +31% on spec-bearing tasks) |
| Review rounds | ~28 | **~28, unchanged** | 12 used at 7 tasks; tracking under |
| Tasks | 13 | 13, unchanged | No scope change |

**Recorded cause: spec-tier density, not scope creep.** The implementation half of §12's split (~1,700) is holding. The entire miss is the spec half (~1,500), and the reason is the assertion standard this spec sets — rendered-output assertions over signal reads, length-guarded loops, executed falsifying inputs, and disqualifiers that ban the cheap assertion. **That standard is what the overrun bought**, and it is not a candidate for reduction: it caught RK-4's off-by-one, T-05's `@Input` aliasing, T-06's c8 coverage hole and T-07's four dead assertions.

**What the user did NOT authorise, and what the Leader therefore did not do.** `continue` was read as accepting the budget and resuming execution. It was **not** read as approval to amend the approved spec. So the two artifact changes Lens A drafted for T-08 — a `design.md` §6.5 step-3 amendment and a new `c4b` criterion — **were not made.** Instead the Leader briefed T-08 to close the hazard **in code**, as a correct reading of step 3 against the server contract, and to record it as **done-without-a-named-criterion**. Consequence, stated plainly: **the silent-data-loss path is closed in the implementation but no done criterion gates it**, so a future regression would not be caught by `tasks.md`. That is the cost of not amending, and it is the user's call to leave it or close it.

---

### T-08 — `buildPayload()` + save + re-read

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 3 of 3** (2 rework rounds; **6 issues from 3 lenses**, the largest finding count of the run) |
| **Date** | 2026-08-21 |
| **Implementer attempts** | **3** of a 3-attempt ceiling — **the ceiling was reached** |
| **Effort / skills** | attempt 1 `xhigh` · attempt 2 `xhigh` (held) · `angular-developer`, `tdd`, `error-handling-patterns` |
| **Requirements covered** | R-IUP-013 (all 6), R-IUP-014 (all 4), R-IUP-011 (AC.5, AC.6), R-IUP-007 (AC.3, AC.4), R-IUP-006, R-IUP-015 (AC.3, AC.4), R-IUP-016 (AC.1, AC.2) |
| **Review mode** | **Parallel lens reviewers (3)** — payload correctness · save/re-read/error flow · test fidelity |

#### Leader deviations, recorded

| Deviation | Reason |
| --- | --- |
| **Effort `xhigh`, not `max`, on a data-loss surface** | The dial says `max` for data-loss-critical work, but *never `max` a cheaper tier — escalate the tier instead*. Escalating the Implementer to T1 would have **collapsed the model axis of `author ≠ auditor`** (the wrappers bind Implementer→sonnet, Reviewer→opus precisely to hold both axes). So the compensating rigour went into **three** lens reviewers instead of two. Recorded because the dial's literal reading was not followed |
| **Three hazards briefed as scope, without minting criteria** | The user accepted the budget but **did not authorise a spec amendment**, so Lens A's drafted `design.md` §6.5 step-3 amendment and `c4b` criterion were **not** made. The hazards were briefed as correct readings of §6.5 and are recorded **done-without-a-named-criterion**. Consequence stated plainly: the fixes exist in code but **no criterion gates them**, so a future regression would not be caught by `tasks.md` |

#### Attempt 1 — **all three lenses FAIL. Six issues.** The largest finding count of this spec's run.

**Files changed** (3): `.ts` +213, `.html` +9, `.spec.ts` +593. **Verification:** `npm test -- --silent` full unfiltered from `client/research-indicators/` → **312 suites, 6479 tests passed** (from 312/6445; **+34**). Lint clean, `git status` re-inspected.

**Test-count discrepancy resolved by Lens C, not accepted:** the Implementer estimated "~40"; Lens C counted `it(` blocks per criterion and got **exactly 34**, matching the suite delta. All three T-07 c14 cases survived the `navigate()` → `saveData()` rename with **byte-identical `router.navigate` tuples**, and `navigate()` no longer exists on the component — no orphan. **Nothing was removed.**

##### Confirmed correct — all three lenses, from server source rather than the spec's transcription

| Finding | Lens |
| --- | --- |
| **Steps 1, 2, 4 and 5 are correct.** `innovation_use_level` is absent from the payload *interface*, so c5's second half holds **by construction**. `buildActorPayload` nulls both directions off one derived `aggregate`, making c4 structural — one ternary pair, one source of truth. The explicit nulls are DTO-accepted (`IsActorCountModeExclusiveConstraint` returns true for null/undefined; `@IsOptional()` short-circuits `@IsInt()`) | A |
| **Hazard (b) is right on both edges** — `0` survives (the predicate tests `undefined \|\| null`, **not falsiness**) **and** `onQuantificationUpdate`'s `value.number ?? undefined` preserves it, where a `\|\|` *"would have silently deleted every reported zero"* | A |
| **Hazard (a)'s nulling genuinely closes the collision** — nulling `institution_type_id` moves a known-org row's key from `type_<n>` to `institution_<id>`, so the two rows no longer collide in `removeDuplicates` | A |
| **c6 is discharged, not inconclusive.** Lens A **re-derived the entire id-write enumeration independently**: every site is `<field>: row.<same field>`; no literal, counter, index-derived or `Date.now()` id anywhere; `QuantificationItemData` structurally lacks an `id`; templates `track $index` so a card never receives another row's object | A |
| **c8 closes `judgment.md` → S-3 in substance** — the rendered `.actor-total` reads the card's own `computed` and **never** `row.total`, so the test compares two independently produced numbers. That is precisely what S-3 said no check anywhere in the strategy did | B + C |
| **c9's mechanism claim holds, including the cross-file half** — `PATCH` does not carry `loadingTrigger`, the re-read GET does, and `finalize` calls `updateGreenChecks()` only under it. The cited `api.service.spec.ts:2338` is real and proves it via the follow-on `green-checks` request. *"Legitimate composition, not a hand-wave"* | B + C |
| **c3 is "the strongest block in the diff"** — four tests pinning `''`-vs-`undefined`, `0`-is-present, and unit-only/description-only | C |
| **§6.7 step 5's partial inline binding is conformant** — the spec's own hedge (*"where the message carries one"*) licenses binding only the field the message names. And the substring match could not be made to produce a false positive | B |

##### `STATUS: FAIL` ×3 — six issues

**Two product defects on silent-data-destruction paths:**

**A1 — step 3's predicate is narrower than the spec's.** The implementation is *active-path-only*; **the spec is an OR over both paths.** They diverge on one reachable row shape: a saved row with `institution_type_id`, user ticks *organization is known* and picks nothing, save → row fails the active test → dropped → `organizations: []` → and `customSaveInnovationUse` has **no early return for an empty array**, so `deactivateExistingRecords` sets `is_active = false` on **every** organization row of the result. **HTTP `200`, success toast, data gone.** Under the spec's OR the row is kept and the server's own `validateOrganizationsAreIdentified` throws `400` **before `BEGIN`** — nothing written, row survives, user sees the error. ***"The implementation converts a loud, recoverable rejection into a silent deletion."***

> **Lens A's generalization — the sharpest insight of the run.** *"The general invariant this task needs is not 'drop rows the server would reject' but **'never drop a row that carries an id from the GET'**"* — because both consumers treat a present-but-empty block as *deactivate everything for this role*, and `buildPayload()` always emits all three keys. **The actor block is currently safe only by accident:** no `showClear` on the actor-type select, and `actor_type_id` is `@IsNotEmpty()`. Adding `showClear` would open the identical hole for actors.

**B1 — the toast shows the user an exception class name.** `errorDetail.description` on the wire is `exception?.name`, and Nest sets `name = this.constructor.name` — so `ResultStatusGuard`'s rejection displays the literal string **`"BadRequestException"`**. The human text lives in `errorDetail.errors`. **The c10 test is green only because its fixture misrepresents the envelope**, setting *both* fields to human text so the assertion cannot distinguish them. There is a **codified in-repo warning** at `bilateral-mapping.service.ts:100-104` stating verbatim that `description` is the exception class name and must not be preferred, and a sibling page (`general-information.component.ts:105`) already does it correctly. T-07's `getData()` failure toast has the identical defect.

**One incomplete hazard closure:**

**B2 — the `loadFailed()` guard covers only the failed-load half.** *Stale-success* is reachable and unguarded: after a version switch the component instance is **reused**, so during the in-flight window `body` holds v1's rows while `loadFailed()` is `false` — and `resultInterceptor` resolves the version from the **URL at request time**, so a Save/Next click PATCHes **v1's rows against v2**. With an all-id-less stale body the server accepts it and deactivates v2's rows: **destruction on a `200`**. The nav buttons are clickable throughout — outside every conditional branch, with no `disableSave`/`disableNext` passed. **So §4.3's closure claim has a hole: an id echoed from *another version's* GET is still unauthorized for this one.**

**Three evidence defects:**

**C1 — nothing connects `buildPayload()` to the wire. The most serious finding of the run.** c1–c5 are all *worded* about the request body; all are discharged against the pure function's return. The spec's only references to `PATCH_InnovationUseDetails` as an assertion target are `not.toHaveBeenCalled()` — no `toHaveBeenCalledWith`, no `mock.calls`, no spy on `buildPayload`. **Change the call's second argument to `this.body()` and all 14 criteria stay PASS while the app ships the raw body** — `total`, `innovation_use_level`, blank actor rows, identity-less organization rows, and both count modes on one row: *the entire §4.3 `400` set plus hazard (a)'s silent-deactivation path.* KZ-001 at the highest stakes in the spec.

**C2 — c11's round trip is insensitive to the round trip.** Pre-save `body()` and `serverEcho` are identical in every asserted field, so every assertion holds if `getData()` were never called, if the echo were discarded, or if the PATCH body were wrong. The echo carries `result_actors_id: 9`, `result_institution_type_id: 8`, quantification `id: 21` — **none exist pre-save, all three unasserted.** *"What is asserted is 'after `saveData()` the page still shows what it showed before.'"*

**C3 — c13 and c14 both name a save; neither issues one.** c14 is `expect(() => component.buildPayload()).not.toThrow()` — *"an assertion no plausible implementation makes false"*. c13 is a `buildPayload()`-only test in a block the Implementer itself named *"c13 support"*.

##### Leader adjudication

**Not a Pivot** — the spec is right in every case; A1 is the implementation diverging *from* it. All six accepted in scope: two product defects, one completing a guard the Leader itself briefed, three evidence defects each citing a T-08 criterion. **One consolidated rework**, attempt 2 of 3, effort held. Lens A's generalization was passed as a **rule** for the rework, with an explicit question about whether the actor and quantification filters can drop an id-carrying row.

##### Escalations added by this round

**A fifth spec-accuracy finding, in a NEW class.** The four recorded so far share the pattern *instruction right, justification wrong*. This one is different: **`docs/trd/trd.md` §6.1 claims `errors?: Array<{field, message}>`, which is false — and §11.1 of the same document describes the real passthrough correctly.** The TRD **contradicts itself and §6.1 is the wrong side.** Class: ***instruction unsatisfiable because the contract it cites is fictional*** — §6.3's *"render `errorDetail.errors[]` inline next to the offending field"* presumes a field binding that does not exist on the wire. **Constitutional-document amendment; not the Leader's to make.**

**A product-intent question, not a defect.** `saveData()` navigates on Back/Next **whether the PATCH succeeded or failed**, and Lens B verified both premises: §6.7's step list genuinely orders it that way, and `capacity-sharing` genuinely navigates unconditionally. **But Lens B constructed the loss:** `body` is component state, the lazy route destroys the instance, `replaceUrl: true` removes the history entry, the next visit re-GETs server state — *"every edit made in that session is silently lost."* The error toast **does** survive the route change (the host sits above the router outlet), so *"the user is not left with no signal; they are left with a signal on the wrong page and no data."* Lens B declined to FAIL it (it conforms) and asked the Leader to escalate: **should a failed save suppress navigation, or prompt?** — noting the fix is one line here but is a **cross-page product rule**, since every sibling detail page behaves this way today. Lens B also observed the exemplar `capacity-sharing` **never checks `successfulRequest` at all**, so it toasts *success* on a `400` — *"the implementation under review is strictly better than the thing it cites."*

#### Attempt 2 — Lens A **PASS**, Lens B **PASS**, Lens C **FAIL** (1 new issue, created by a sibling's fix)

Six issues + two hardenings landed. **All five falsifications failed as predicted**, the decisive one being Lens C's: changing the PATCH argument to `this.body()` produced `1 failed, 72 passed` — **only the new wire-tier test failing**, empirically confirming that all 14 criteria had been blind to the mutation.

**Lens A's rulings on the two questions delegated to it:**

- **Actors — safe, and genuinely unreachable.** No `showClear` on either select, `onActorTypeChange` only ever assigns, and the DTO is `@IsNotEmpty()`. *"I attempted the input and no UI path produces an id-carrying row without an `actor_type_id`."* Its invariant does not demand a guard *because* it is unreachable, not because of scope — *"a guard against an unreachable state buys nothing until someone edits the select."*
- **Quantifications — genuine delete semantics, not Issue 1 in different clothes.** Three reasons, the third decisive: keeping a cleared row would emit `{undefined,'',''}`, which **inserts a phantom all-NULL row** that the GET then renders as a blank card which re-emits itself — so *"keep cleared rows" contradicts hazard (b), a property this same task was required to establish.* And the class line: **"in Issue 1 the trigger was orthogonal to the data destroyed"** — a checkbox click discarded a live `institution_type_id: 10` and `organization_count: 12` the user never touched — *"here the trigger **is** the user erasing every field. That is deletion the user performed."*
- **The OR × nulling interaction, traced end to end:** the row is kept, `validateOrganizationsAreIdentified` throws **pre-`BEGIN`**, so `customSaveInnovationUse`/`deactivateExistingRecords`/`save` **never run**. Row 55 keeps `is_active = true` with its data intact and the user gets a `400`. **The silent deletion is gone, replaced by the loud recoverable outcome the fix was for.**

**Lens B's ruling on the residual my own brief got wrong.** I told the Implementer the `loading` signal closed the double-click hazard "same signal, no extra work." **It does not** — `loading` is set in `getData()`, so at the first PATCH's await it is still `false`. The Implementer **pushed back rather than claiming closure.** Lens B ruled **(b)**, recorded-with-an-owner, on four grounds — the fourth being the one worth keeping: ***"It would punish the disclosure. The Implementer declined to claim closure on a brief that was wrong. That is the behavior the loop wants; a FAIL for surfacing it teaches the opposite."*** It supplied the exact guard (a *separate* `saving` signal, `try/finally` load-bearing) and noted `[disableSave]="saving()"` works today, so the fix is cheaper than "out of scope" implies. Since `capacity-sharing` shares the defect, a **platform-level** item is the better home.

**Lens C's new issue:** the two fixes **compose** into a wire row that is id-carrying with **no identity on either path**, its only identity sent as a present `null` — and the test asserted just two fields, neither able to see the four nulled ones. Worse, *"coverage appears complete because hazard (a)'s first test looks like the same case — it is not: it carries `institution_id: 501`, so nulling leaves a live identity. **The two tests together create the appearance of covering the composed state while covering only its safe half.**"* **The fourth recurrence in this spec of "assertion surface narrower than the change's blast radius"** (T-05 c12, T-06 c8, T-07 c13).

#### Attempt 3 — **Lens C PASS. All three lenses green.**

**Scoped deliberately narrow on a final attempt:** assertions only, no production change, with the values supplied rather than left to the Implementer to decide — because Lens C said the outcome *"is not settleable at this tier"* and **Lens A had already settled it from server source.** The Implementer was told that if it judged a production change necessary it should **stop and ask** rather than make one.

Delivered: the four identity-field assertions inside the existing test; a comment recording Lens A's pre-`BEGIN` reasoning with a do-not-revert instruction; and two free wire-tier assertions on axes the fixture already seeded. **Zero `it` blocks added** — hence 6485 → 6485, which Lens C confirmed is correct for assertions added inside existing blocks.

**Falsification:** stopping the known-branch nulling → `expect(received).toBeNull() / Received: 10` at `:704`. **No production file touched** — the Leader verified all four anchors at identical line numbers (`:371`, `:381`, `:382-383`, `:426`) rather than accepting the claim.

**Two corrections Lens C made to the Leader's own framing:**
1. **c5 does not cover the scalar-copy step.** Its two tests are function-tier and assert *absence* (`not.toContain(...)`) — they say nothing about the scalar being copied with the right value. The covering assertion is **c14's wire test's whole-object `toEqual`**. No gap, but not where the Leader looked.
2. **`toBeUndefined()` is not the T-04 class.** It *is* falsifiable — changing the branch to `?? null` fails it. But it cannot distinguish **present-with-`undefined`** from **key-absent**, which is the dimension §6.4's key-present semantics turn on. **Not reachable as a defect**, because the pre-`BEGIN` validator rejects before any key is resolved against stored data.

**The wire-join detector got broader, not just preserved:** under the raw-body mutation **six of eight** assertions now fire, up from four of six.

**Final verification:** `npm test -- --silent` full unfiltered from `client/research-indicators/` → **312 suites, 6485 tests passed**. Coverage 99.22 / 97.95 / 98.81 / 99.5. Lint clean, `git status` re-inspected.

#### Decisions made

1. **Effort was capped at `xhigh` on a data-loss surface**, against the dial's literal `max`, because `max` on a T2 tier is forbidden and escalating the tier would have collapsed the model axis of `author ≠ auditor`. **The compensating rigour — three lenses — is what found all six issues**, including two the Leader's own brief had asked for and got wrong.
2. **Three hazards were closed in code with no criterion gating them**, because the user accepted the budget but did not authorise a spec amendment. **Consequence, stated plainly: a future regression on any of the three would not be caught by `tasks.md`.** The lens tests are the only gate.
3. **The final attempt was scoped to assertions only.** An over-reach on attempt 3 of 3 is what turns a closable task into a HALT.
4. **A wrong Leader instruction was corrected by the worker and upheld by the reviewer.** Recorded because the loop only works if disclosure is safe.

#### `ADVISORY` — recorded; not gating

| Lens | Finding | Reachability |
| --- | --- | --- |
| **A** | The `400` the fix now produces asks for `institution_type_id` — **the field the client just nulled** — when the user's remedy is to pick an institution, untick the box, or remove the row. Lands as a generic toast, and blocks every save of the section until fixed | **Reachable**, same one-click sequence. Nothing is lost (pre-`BEGIN`). Clean closure is §6.7 step 2's shape — a page-level gate reusing the card's existing `showNotIdentifiedMessage`. **Natural home: T-09**, alongside the other two save gates |
| **A** | `!!row.actor_type_id \|\| !!row.result_actors_id` would make the actor filter's safety **structural** rather than resting on three unrelated facts, the first of which is one template attribute away from changing | Not reachable today |
| **A** | Record ruling 2's reasoning in `design.md` §6.5 step 4 — "cleared equals deleted" is a deliberate product semantic that follows from quantifications having **no server-honored identity** (`upsertByCompositeKeys` ignores the client's `id` and rotates it on every content edit) | n/a — doc |
| **B** | **Double-submit**: a second click inside the first PATCH's await passes all three predicates. Worst traced outcome is duplicate id-less inserted rows plus a duplicate-type `400` on the next save; **could not construct data loss**, and the interleaving depends on chunk 2's transaction boundaries | **Reachable.** Guard supplied; needs a named owner. **Platform-level is the better home** — the exemplar shares it |
| **B** | `getData()` has **no `try/finally`** — a throw between `loading.set(true)` and either clear leaves it stuck `true`, which now **silently disables saving for the session**, indistinguishable from the non-editable branch, with no toast | Could not construct a rejection path (`ToPromiseService` resolves errors rather than throwing). Cheap hardening |
| **B** | `@for … track message` risks `NG0955` on two byte-identical messages; prefer `track $index` for a display-only list | Could not construct — nested validator paths are index-prefixed |
| **B/C** | The messages now surfaced are the server's **raw snake_case identifiers**, and a spec assertion pins one as user-facing copy. With Issue 1 fixed these are visible to users **for the first time**, so the raw-identifier UX matters more than it did | Always |
| **C** | **`tasks.md` c13 is still unqualified** — a reader ticking it will read it as the server-side claim, while the AR-1-bounded record lives only in a code comment. One clause fixes it. (Mitigated: AR-1 is already RB-3 and re-stated by T-13 c11) | n/a — doc |
| **C** | `toEqual` recursively ignores `undefined` keys, so c14's wire test **pins values, not key shape** — it is not a second detector of the raw-body mutation. Absence is covered by c5 + the wire-join test | n/a |
| **C** | `loading` is a **boolean, not a counter**, so two `onVersionChange` firings inside one GET round trip briefly reopen the save window against a stale body | Reachable in principle; **could not construct** through the component's public surface |
| **C** | `justificationError`'s `.filter().join(' ')` — the **multi-message case the change exists for** is not covered | Minor |

#### Forward pointers

| Target | Pointer |
| --- | --- |
| **T-09** | **(a)** Lens A's advisory — a page-level pre-save gate reusing `showNotIdentifiedMessage` is the clean closure for the identity-less-row `400`, and T-09 already owns the other two save gates. **(b)** T-09 has **no criterion** for *level 3 blank → save proceeds*; c9's other half is owed there. **(c)** `duplicateType` is unbound and `saveData()` performs no cross-row validation — both are T-09's |
| **T-10** | Lens B's double-submit guard needs a named owner if not taken platform-wide |
| **T-13** | c11 re-states AR-1 as open — the three hazards' server-side behaviour is inherited from chunk 2's fixture tier, not proven here |

#### Final verification result

Full client suite green (**312/312 suites · 6485/6485 tests**), coverage above all floors, lint clean with `git status` re-inspected, **nine falsification probes across three attempts all failing as predicted**, and every production anchor Leader-verified at source rather than accepted. **T-08 closed on attempt 3 of 3** — the ceiling reached but not breached.

---

## ⚠️ SECOND BUDGET NOTE — the re-baseline is already consumed

The user re-baselined §12 to **~4,600** after T-07. **T-08 alone came in at 1,081 lines against a 400-line derivation — 2.7×** — and the running total is now **4,544 at 8 of 13 tasks: 98.8% of the re-baselined figure with five tasks still to run.**

| Measure | Original §12 | Re-baselined | Actual at T-08 (8/13) |
| --- | --- | --- | --- |
| LOC | ~3,200 | ~4,600 | **4,544** |
| Review rounds | ~28 | ~28 | **15** ✅ still under |

Remaining §6 derivation: T-09 160 · T-10 190 · T-11 80 · T-12 40 · T-13 0 = **470**. Even at a modest 1.5× that lands near **5,250**; at T-08's 2.7× it would exceed 5,800.

**Why T-08 specifically blew through it, stated so the next estimate is better:** the task's own criteria were *worded* about the request body but the natural implementation is a pure function, so satisfying them honestly required a **second assertion tier** nobody budgeted — Lens C's finding that all 14 criteria were blind to the wire join is exactly that gap made visible. Add three hazards briefed as scope-without-criteria, and 806 of the 1,081 lines are spec. **This is the same spec-tier density as the first breach, concentrated: the more a task's criteria are about *what reaches the server*, the more assertion tiers it needs.**

**The Leader is not stopping again.** The tripwire's purpose is to surface a mis-sized budget while it is still recoverable, and that has now been done twice with the same diagnosis; the user accepted it once with full information. Continuing is the ruling already given. **But the figure is reported, not absorbed:** T-13 c10 should reconcile against ~5,300, not ~4,600, and the estimate model itself — not the spec's scope — is what proved wrong.

---

### T-09 — Cross-row validation: duplicate actor type, level-6 justification gate, save blocking

| Field | Value |
| --- | --- |
| **Date** | 2026-08-21 |
| **Final status** | ✅ **PASS on attempt 2 of 3** (1 rework; Reviewer FAIL → remediación option 1) |
| **Implementer** | `akili-implementer` · T2 · `claude-sonnet-5-thinking-high` · effort `high` → `xhigh` on rework |
| **Reviewer** | Attempt 1: `akili-reviewer` · T3 · `claude-opus-5-thinking-high`. Attempt 2: primary T3 models (opus / fable / gpt / gemini) hit **host usage limits** — runtime failure, not a work FAIL. Substitute auditor: `akili-reviewer` · `composer-2.5-fast` (≠ Implementer model; `author ≠ auditor` held on model family). Recorded per `/akili-execute` Reviewer runtime-failure fallback |
| **Skills** | `angular-developer` (+ `systematic-debugging` on attempt 2). No deviation from task list beyond the rework add |
| **LOC** | **327** (+327 / −2, 3 files) vs §6 derivation **160** — 2.0×; same spec-tier density pattern. Running total **4,544 + 327 = 4,871** (above the ~4,600 re-baseline; continuing under the prior ruling; T-13 c10 reconciles) |
| **Review rounds** | 2 (this task) · cumulative **17** vs ~28 |
| **Requirements** | R-IUP-009 (all 3), R-IUP-010 AC.5, R-IUP-006 AC.2, R-IUP-014 AC.3 |
| **Design** | §6.6, §5.4 (`duplicateType`), §6.4, §6.7 step 2, §4.3 |

#### Attempt 1 — Implementer Done → Reviewer **FAIL** (1 issue)

**Delivered:** `OTHER_ACTOR_TYPE_ID = 5` literal; `duplicateActorTypeIndexes` / `hasDuplicateActorType` / `justificationMissing` (with `.trim()`); `saveData` guards; `[duplicateType]` template binding; T-09 c1–c6 specs; three T-08 fixtures filled with non-blank justification so they still reach PATCH.

**Verification:** full suite **312 / 6500**; coverage 99.22 / 97.94 / 98.81 / 99.5; lint clean. Live falsifying probes: drop OTHER name from key → c2 FAIL; block zero-row save → c6 FAIL; both reverted.

**Reviewer FAIL (verbatim substance):** with whitespace-only justification at resolved level ≥ 6, `justificationMissing()` blocks the PATCH (trims) but `app-textarea`'s `isInvalid()` does not trim, so **no inline required message** and no toast — silent Save no-op. Violates design §4.3 / §6.6 / §6.7 step 2 and T-09 c5's "blocked **and** message renders". Remediation preference: keep `.trim()` + page-owned message gated by `justificationMissing()` (do not edit shared textarea).

#### Attempt 2 — Implementer Done → Reviewer **PASS**

**Delivered:** page-owned `@if (justificationMissing())` block (token `var(--ac-red-1)`, same shape as `justificationError()`); `.trim()` kept; shared `TextareaComponent` untouched; c5 tests hardened so whitespace asserts **rendered** `"This field is required"` **and** zero PATCH; blank case pairs message + zero PATCH; filled case asserts message absent. Doc comment on `justificationMissing` corrected.

**Verification:** full suite **312 / 6499**; coverage unchanged above floors; lint clean. Live probe: remove page-owned block → whitespace test FAIL; restored.

**Reviewer PASS summary:** c1–c6 met; §6.6 / §4.3 closed; guard↔message structural for blank and whitespace; disqualifier on c1 satisfied (DOM on real card).

#### Decisions

1. **Option 1 over option 2** on the FAIL — keep client trim (server must not receive whitespace) and own the message on the page rather than widening shared `app-textarea` blast radius.
2. **T-08 fixture edits** (add non-blank explanation) are consequential of the new gate, not scope creep — each fixture still asserts its original claim.
3. **T-08 Lens A advisory** (identity-less org pre-save gate) **not absorbed** — Advisory Never Becomes A Task.
4. **Reviewer model substitution** after Opus/usage-limit cascade — recorded; PASS stands on substitute auditor ≠ Implementer.

#### `ADVISORY` — recorded; not gating (KZ-008 reachability)

| Source | Finding | Reachability |
| --- | --- | --- |
| Attempt 1 Reviewer | Two blank-OTHER rows collide on key `5:` and show the duplicate message alongside `otherNameMissing` | **Reachable** — Add other actor ×2, pick OTHER, leave names empty |
| Attempt 1 Reviewer | Back/Next navigates while a blocking rule is active (no PATCH) | **Reachable** — conforming to §6.7 step 6 / T-08 precedent |
| Attempt 1 Reviewer | T-09 c5 has no `id ≠ level` falsifier (`idForLevel(5)` blank → PATCH) | Not a user state — variant by inspection; T-07 c8 owns resolved-level binding |
| Attempt 1 Reviewer | Two OTHER rows with distinct names PATCH by design; if chunk-2 keyed only on type id, server would 400 | Client-reachable; server outcome **unverifiable** at this tier (§10.5) |
| Attempt 2 Reviewer | Pure blank may show duplicate "This field is required" (textarea + page block) | **Reachable** with `explanation: ''` at level ≥ 6 — cosmetic, not the whitespace defect |

#### Forward pointers (not absorbed)

| Target | Note |
| --- | --- |
| *(none minted)* | Blank-OTHER `5:` collision and navigate-while-blocked remain advisories only |
| T-10 | Next eligible by document order (deps T-07 satisfied; T-09 does not block it) |

#### Final verification

Full client suite green (**312/312 · 6499/6499**), coverage above floors, lint clean with `git status` re-inspected. **T-09 closed on attempt 2 of 3.**

---

### T-10 — Reachability wiring: route, sidebar rows, section path, `GreenChecks`

| Field | Value |
| --- | --- |
| **Final status** | ⛔ **`[~]` BLOCKED — Pivot Record below.** 6 of 7 criteria PASS; **c4 is unsatisfiable as written** |
| **Date** | 2026-08-21 |
| **Implementer attempts** | **1** — *no rework consumed*, per the Pivot Protocol |
| **Effort / skills** | `high` · `angular-developer` |
| **Review mode** | **Single Reviewer**, lens checklist |

#### Leader deviations, recorded

| Deviation | Reason |
| --- | --- |
| **One Reviewer, not the 2–3 used since T-05** | Production code is ~10 lines across four files, the Implementer's report was unusually candid, and its falsifying input moved **both** halves of the criterion it targets. `.agents/leader.md` → *Delegation Ceiling*: "one subagent beats several for a single modest task." Three contexts here would have been disproportionate |
| **Leader pre-flighted the c4 trap into the brief** | A grep of `result-sidebar.component.ts` before delegating surfaced that `greenCheckKey` is typed `string` and that one existing key (`cap_sharing`) is undeclared. Briefing it as *"report, do not improvise"* is why this arrived as a clean spec finding on attempt 1 instead of a rework round |

#### What passed — 6 of 7, re-derived by the Reviewer rather than accepted

| # | Verdict | Note |
| --- | --- | --- |
| c1 / c2 | ✅ | Indicator 6 yields the seven paths **in R-IUP-001's exact order**, detail row after `Alliance alignment` (index 2) and before `Results partners` (index 7). Asserted as an **ordered array** via `toEqual`; `getTotalCount()` asserted **directly, not inferred** |
| c3 | ✅ **Disqualifier satisfied** | Four full ordered lists, no spot checks. The Reviewer **re-derived each independently** against the post-edit array and confirmed the hand-traced expectations are right — including that indicator **4 has six** entries (no `ip-rights` row) and indicator **5 has seven** with `links-to-result` between `geographic-scope` and `evidence` |
| c5 | ✅ | `loadComponent`, `data: createResultData()`, target carries `export default class`. **Route-order claim verified true** — Angular matches non-empty child paths by whole-segment equality, so `'innovation-details'` cannot capture `'innovation-use-details'`; the only order-sensitive entry is the `path: ''` redirect, which stays first. Separate lazy chunk (34.92 kB), initial 1.16 MB against a 2 MB warning |
| c6 | ✅ **both halves, mechanism genuine** | Both call-site tests delegate to a **real `CacheService` instance**, not a stub — verified, and legal because `CacheService` uses only signals with **no `inject()` calls**. Each asserts the positive path **and** `not.toHaveBeenCalledWith([… , ''])`. **Shared-mock leak ruled out in both files**: `alliance-alignment` builds a fresh mock per `beforeEach`; `partners` uses a module-level mock where `clearAllMocks()` clears calls but *not* implementations — which the Implementer handled explicitly with a restoring `mockReturnValue` **and a comment saying why** |
| c7 | ✅ | Verified against `SubmissionService` rather than accepted: `:35-38` is `Object.values(checks).every(Boolean)` — **no exclusion list, key-agnostic** — and `grep VISUAL_ONLY_GREEN_CHECKS` across the whole client returns **zero hits**. So `innovation_use` counts and gates with no client code. **`judgment.md` → I-6 genuinely closed** |
| D-IUP-3 / D-IUP-5 | ✅ | `ip-rights.component.ts` has **zero** matches for `indicator` and no marker. The Pool funding row is byte-unchanged and correctly **absent** from the seven |
| c4 | ❌ | **Unsatisfiable — see the Pivot Record** |

**Falsifying input confirmed genuine:** deleting `case 6` broke **all four** targeted spec files including **both** call-site tests (`- ["result","ROAR-7","innovation-use-details"] + ["result","ROAR-7",""]`). The Reviewer confirmed this is caused by the deletion breaking the real computed both call-site tests delegate to, **not** by shared mock residue.

**Verification:** `npm test -- --silent` full unfiltered from `client/research-indicators/` → **312 suites, 6508 tests passed**. Lint clean, `git status` re-inspected. `npm run build` clean, no delegated agent active during the measurement.

---

## ⛔ Pivot Record: T-10 — c4 contradicts its own authorizing design

**Trigger:** the Reviewer's ruling, verbatim — *"c4's second sentence is **UNSATISFIABLE** by the change the spec authorizes — a spec defect, not an implementation shortfall… **It must not be scored as under-thinking, and re-dispatching the Implementer unchanged will reproduce the same report.**"*

Per `/akili-execute`'s Pivot Protocol: the loop stopped, the task is `[~]`, **no rework attempt was consumed**, and the decision goes to the user before execution resumes.

### The defect

c4 requires: *"Both keys resolve **without** an `as keyof GreenChecks` cast."*

The cast is applied to `option.greenCheckKey`, whose declared type is **`string`** (`result-sidebar.component.ts:42`). **Indexing a closed interface with a `string` requires an assertion no matter how many keys `GreenChecks` declares.** So the entire authorized change — `+ innovation_use?: number`, `+ ip_rights?: number`, which is what the T-10 Scope table, `design.md` §7 and DD-9 all specify — **cannot remove that cast.**

**DD-9 conflated *declaring a key* with *removing the cast*, and c4 then asserted the latter as if the former achieved it.**

Critically, **the requirement itself is not over-promised.** R-IUP-016 AC.4's binding clause is only *"`innovation_use` is **present on the client `GreenChecks` interface**"* — satisfied — with "so the sidebar's lookup is type-checked rather than cast-only" as its *rationale*. **c4 elevated the rationale into the assertion.** That is the run's **sixth** spec-accuracy finding and it lands squarely in the class Lens A named at T-07: *a rationale is not load-bearing for the implementation, but it is load-bearing for anything derived from it.* Here a **done criterion** was derived from a rationale, which is worse than a falsifier being derived from one.

### Three blockers were on record for the alternative. All three were wrong.

| Claim | Verdict |
| --- | --- |
| **Implementer:** narrowing "changes indicator 1's tick behavior, violating c3 / R-IUP-019" | **Wrong** — the runtime string is unchanged, only the type |
| **Leader:** narrowing "forces edits to ~5 pre-existing spec files, including Innovation Dev's… R-IUP-019 AC.2 permits only import-path edits there" | **Also wrong.** Those files seed `cap_sharing_ip`, which **is** declared, so narrowing does not touch them. **AC.2 does not block it, and no fixture needs changing** |
| **DD-9:** "closing it costs one line" | **False — it costs ~10.** But all of them **inside the two files T-10 already owns** |

**The complete, enumerated cost of closing it:** declare `cap_sharing?: number` (the only undeclared key among the 13 rows, and one the backend really emits — `green-checks.repository.ts:43` aliases `cap_sharing_validation(...) as cap_sharing`); type `greenCheckKey: keyof GreenChecks`; drop the cast; re-key **7 synthetic literals** in `result-sidebar.component.spec.ts` — a file already in T-10's scope table. Nothing else compiles differently.

**The one genuine design consequence nobody has decided:** narrowing makes `greenCheckKey` a **closed union**, so every future sidebar row must declare its key first. Desirable — and a decision the design never made, *"which is why the Implementer was right not to make it unilaterally under a spec whose culture treats 'left exactly as it is' as binding."*

### The two branches — user decision required

**(A) Amend the spec, ship the code as-is. Zero code change.** Rewrite c4 to match DD-9's actual authorization (e.g. *"both keys are declared on `GreenChecks` and drive the rendered `greenCheck` for their rows"*), which the current diff **already satisfies with evidence** (`result-sidebar.component.spec.ts:506-514`). Correct DD-9's "costs one line", and open a separately-owned follow-up for the cast.

**(B) Authorize the closure explicitly, then it is one cheap round.** Record a new design decision (closed-union `greenCheckKey`), then the ~10 lines above. **Both stated blockers for this option are incorrect**, and it has a concrete payoff: it would have caught the live bug below **at compile time**.

---

## Two live bugs the Reviewer found, both pre-existing and outside T-10

**1. Indicator 1's Home-card progress is wrong, and two tests lock it in.** The brief's ground truth said no production code reads `cap_sharing_ip`. **That was wrong** — `my-latest-results.component.ts:103` casts **both**: `['cap_sharing', 'cap_sharing_ip'] as (keyof GreenChecks)[]`. **That cast lies in both directions:** `'cap_sharing'` is real but undeclared; `'cap_sharing_ip'` is declared but **never emitted**. `getProgress` counts over 8 steps for indicator 1, **one of which can never be truthy**.

*Reachability: reachable, constructed by trace.* A fully-complete indicator-1 result shows **75%** where the truthful figure is 6/7 = **86%**, and the step path can never exceed 88% — 100% is only ever reached through the `completness === 1` short-circuit. **Two tests depend on it and lock the wrong key in** (`my-latest-results.component.spec.ts:180-193` seeds the phantom and *omits* the real key, so the arithmetic coincides at 75% only by substitution; `:251-254` asserts `toContain('cap_sharing_ip')`). Textbook KZ-001, kept invisible by the cast. **Branch (B) would have surfaced it at compile time.**

**2. `D-IUP-5`'s claim is true on the server and false on the client.** `submission.service.ts:37` ANDs **every** emitted key — including `pool_funding_alignment`, which the server emits for **every** indicator. **`optional: true` only affects `getTotalCount()`, not submit gating.**

*Reachability: reachable, payload traced.* The validation function returns `true` when not eligible (which is why nobody has noticed) but **`false` when the result IS eligible and `has_contribution IS NULL`**. So any result whose primary contract is an effective pool-funding contributor, with the Pool funding section unanswered, emits `pool_funding_alignment: 0` → `canSubmitResult()` false → **the sidebar shows "7/7 sections completed" next to a disabled Submit whose tooltip says "once all sections are completed."** Client-side reproduction: `cache.greenChecks.set({ …all 1, pool_funding_alignment: 0 })`.

**T-10 correctly left the row untouched** — but this is newly load-bearing, because **c7's argument and this defect are the same sentence.** Needs a product-defect ticket plus corrections to `design.md` D-IUP-5, `requirements.md` R-IUP-001's note, and `tasks.md` T-10's note.

---

### Pivot resolution — T-10, 2026-08-21

**User ruling: branch (A).** Amend c4 to match what DD-9 actually authorizes; **zero code change.** T-10 moves from `[~]` to **done**, all 7 criteria marked, and the cast closure becomes a tracked follow-up instead of a blocked criterion.

#### Edits applied

| File | Edit |
| --- | --- |
| `tasks.md` T-10 c4 | Rewritten to *"both keys are **declared** on `GreenChecks` and **drive the rendered `greenCheck`** for their rows"*, with the superseded wording quoted and the reason it was unsatisfiable stated inline |
| `tasks.md` T-10 Implementation notes | The *"closing it costs one line"* claim corrected |
| `tasks.md` §8 | **RB-8** added — the cast closure plus the two live bugs, with the enumerated ~10-line cost and the note that **all three previously-recorded blockers were wrong** |
| `design.md` **DD-9** | *"Closing it costs one line"* corrected in place, with the conflation named |
| `design.md` §2.1 row | Aligned; points at RB-8 |
| `requirements.md` **R-IUP-016 AC.4** | **Annotated, not redefined.** The binding clause (*"is present on the client `GreenChecks` interface"*) is marked satisfied; the trailing rationale (*"so the lookup is type-checked rather than cast-only"*) is marked **not achievable by declaring the key**, tracked as RB-8 |

**On AC.4: the Leader deliberately annotated rather than rewrote.** Editing an *acceptance criterion* changes what the requirement demands, which branch (A) did not authorize — but leaving the rationale unmarked would have left `requirements.md` asserting a falsehood about shipped code, which root `CLAUDE.md` §5 forbids. Annotating keeps the requirement intact and removes the falsehood. **Flagged as an extension beyond the literal option text, so it is visible and revertible.**

#### Correction Closure — the two-direction sweep, bounded on every axis (KZ-005)

**File set swept:** `tasks.md`, `design.md`, `requirements.md`, `judgment.md` — the whole spec folder except `execution.md`, which is append-only history and must not be rewritten.

**Forward** (the superseded claim, in every phrasing — `as keyof GreenChecks`, `cast-only`, `costs one line`, `type gap`, `widen a known type`): **six sites found, not the two the pivot analysis cited.** Four corrected. Two deliberately left:

- **`requirements.md:214` — NOT edited, and checking saved a real error.** It sits in a *"State for indicator 6"* inventory table whose every row describes the **pre-change** state (*"No `indicator_id: 6` row exists"*, *"No `innovation-use-details` child"*, *"switch has cases 1, 2, 4, 5"*). So *"Has neither `innovation_use` nor `ip_rights`"* is a correct historical record, and its note that *"the runtime lookup is an `as keyof` cast, so this is a type gap, not a behavior gap"* **remains true** — the cast still exists. Editing it would have falsified the requirements' record of the starting state.
- The one surviving `costs one line` string is **inside the correction itself**, quoted as the superseded text. That is where it belongs.

**Backward** (documents citing c4 or DD-9): the §4 traceability row `AC.4 → T-10 (c4)` still holds under the new wording, since AC.4's binding clause is the declaration. **Every other `c4` hit belonged to a different task** (T-02, T-04, T-05, T-06, T-07, T-11, T-12, T-13) — a concrete illustration of why this sweep must be bounded **by task**, not by string.

**Re-grep of the NEW value** (the axis KZ-005 says corrections keep missing): **RB-8 is defined exactly once** in §8 and resolves at all six citation sites (3 in `tasks.md`, 2 in `design.md`, 1 in `requirements.md`).

**No `src/` file changed**, so the suite is unaffected — the last full run (312 suites / 6508 tests, build clean) stands. Re-running would be a measurement with nothing to measure.

#### The sixth spec-accuracy finding, and what it adds to the pattern

Five were already recorded, four of them *instruction right, justification wrong*, and one (TRD §6.1) *instruction unsatisfiable because the contract it cites is fictional*. **T-10's is the worst variant yet:** a **done criterion** was derived from a rationale. Lens A's T-07 lesson said a rationale is load-bearing for anything derived from it and named *falsifying inputs* as the risk — **a done criterion is strictly worse, because a falsifier that cannot fire merely fails to catch a defect, while a criterion that cannot be satisfied blocks a correct implementation.**

**Extension for the Kaizen record:** when a design decision's rationale is quoted into a done criterion, the criterion must assert **the decision's authorized change**, never its predicted *consequence*. DD-9 authorized *declare two keys*; its predicted consequence was *the cast becomes unnecessary*; c4 asserted the consequence. **The tell is available at authoring time and costs one question: "does the change this decision authorizes, by itself, produce the state this criterion asserts?"**

---

### T-11 — Accessibility, design tokens, dark-mode pass

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 1** — but see the escalation: **PASS does not mean the section renders correctly** |
| **Date** | 2026-08-21 |
| **Implementer attempts** | **1** |
| **Effort / skills** | `high` · `angular-developer`, `ui-ux-pro-max` (per T-11's Skill note — a recorded departure from **DD-13**'s scope, not a contradiction of it) |
| **Review mode** | Single Reviewer, lens checklist |

#### What landed

The coupling migration (T-06's three inert `aria-label` → `[ariaLabel]`, **plus** the `selectByAria()` helper in the same edit), `[ariaLabel]` on T-05's actor-type select (which had **neither** label nor aria-label), `id` → `inputId` on both checkboxes with per-row suffixes, T-05's remove control from `div[role=button]` to a native `<button>`, `aria-label` on the Specify-other input and the request-partner "here" button, the heading reshape across four files, c2 discharged as **resolution**, and c3's four icon assertions.

**Verification:** `npm test -- --silent` full unfiltered from `client/research-indicators/` → **312 suites, 6510 tests passed** (+2, matching exactly the two new label-resolution tests; the four c3 assertions went inside existing tests). Coverage 99.22 / 97.94 / 98.81 / 99.5. Lint clean, `git status` re-inspected. **c1's falsifying input executed** — `#ff00aa` injected into the stepper → grep matched → reverted → clean.

#### Three corrections the Reviewer made to the Leader's framing

1. **c1 is *not* the T-10 c4 shape, and the difference decides ownership.** The Leader proposed that c1 was "satisfied literally, purpose not achieved". Wrong: **c1's purpose is DD-7 (zero hex), and DD-7 is fully achieved.** The `rs-*` gap is *"a **missing criterion**, not a failed one"* — c1 is about colours, c4 about colours *lacking a token*, c5 about `isDarkMode()`. **Nothing in c1–c6 asks whether a mandated utility family exists.** Sharper than the Leader's diagnosis and it changes who owns the fix.
2. **The inertness is NOT pre-existing app-wide in any meaningful sense.** Measured, not assumed: the families appear **64 times in 6 files**, of which **60 are this spec's four new files** and **4 pre-exist — every one of them `fs-[n]` font-size only** (`form-header` ×3, `bilateral-mapping` ×1). **There is not a single pre-existing use of `rs-p-*`, `rs-m*-*`, `rs-gap-*`, `rs-w-*` or `rs-h-*` anywhere in the application.** So this is not "matching an existing condition" — it is a **new, first-time, at-scale dependency (58 usages) on an unimplemented family**, and this spec is the family's first caller. That is why nobody noticed: a font-size falling back to inherited Barlow ~13–14px is visually indistinguishable from an intended 12/13px.
3. **The Leader's contrast figure was wrong.** `.label` `#153c71` on dark `#2b2b2b` is **1.29:1**, not 1.26:1 (L_fg 0.04578 / L_bg 0.02415). `.section-title` at **1.887:1** was exact. Slip in the harmless direction, conclusion unchanged — **corrected here because this record is the project's permanent one.**

#### A fourth documentation site the Leader missed — and the sharpest

The Leader named three (`docs/ux-ui/design.md` §7.1, root `CLAUDE.md` §4.2, the client README). The Reviewer added **`client/research-indicators/src/CLAUDE.md`**: its folder-layout block lists `styles/responsive-size.scss`, **and its "Adding code" table routes *"A new color / spacing token"* to that path.** Verified against a `Glob` of `src/styles/**` — five files, and that is not one of them. **An agent following that table edits a path that has never existed.**

#### Per-criterion — all six, re-derived rather than accepted

| # | Verdict | Evidence |
| --- | --- | --- |
| c1 | ✅ | Hex grep run **broader than asked** — the whole `innovation-use-details/` folder, all file types — **zero hits**. Falsifying input executed |
| c2 | ✅ **as resolution** | Both new tests `querySelector` the id from `label.htmlFor` and identity-compare to the checkbox's **rendered `<input>`**. And the `expect(label.htmlFor).toBe(...)` line makes the first-match `label` lookup **self-validating** — if the first label belonged to another control the test fails rather than silently asserting about the wrong one. **11-control tally re-enumerated; the three "cannot resolve" attributions are correct**, root-caused at source in `input.component.html` (`for="username"` vs `inputId="minmax-buttons"`) and `textarea.component.html`. **Nothing tallied as resolving that does not** |
| c3 | ✅ | All four assert the icon's **text content** (`toBe('warning')`), not presence. T-07's is genuinely the **page's own** block — verified through `TextareaComponent.isInvalid()`: `'   '.length === 3` → false → `app-textarea` renders nothing, so the only matching span is the page's, and the icon query is scoped to `requiredSpan.parent` |
| c4 | ✅ **vacuous, not dodged** | The only non-`var(--ac-*)` colour in template code is `text-red-500`, which **§5.7 explicitly mandates** for the required marker. `--ac-orange-1` appears **nowhere** — consistent with T-04's settlement. OQ-IUP-4's default assumption was never exercised; `colors.scss` correctly untouched. *(Incidentally: the four components have **no `.scss` files at all** — which is why there is no per-component place to absorb the missing spacing)* |
| c5 | ✅ | `isDarkMode` grep over the whole folder → zero |
| c6 | ✅ | Restated only; does not claim c7–c9 |

#### The coupling migration — verified independently, did not narrow

The PrimeNG claim is **true**: `primeng-select.mjs` L2573/L2603 set `[attr.aria-label]="ariaLabel || …"` on the internal `role="combobox"` element, so a host attribute names nothing. The helper's new form reads `componentInstance.ariaLabel` over `queryAll(By.directive(Select))`, so only **rendered** instances are in scope. The Reviewer traced **all six** dependent T-06 criteria through it and confirmed the **negative** assertions still bite — a select rendered with the wrong `ariaLabel` yields falsy, so a labelling regression **fails** rather than passes. **T-06's spec: 25/25.**

#### The three beyond-the-ask changes — all judged sound

1. **`[ariaLabel]` on T-05's actor-type select** — in scope: the card's `<span class="label">` is not a `<label>` and contributed no programmatic name.
2. **Per-row `inputId` suffixes — this was a *functional* bug, not just a11y.** With a bare static id, **clicking card 2's label toggled card 1's checkbox.** *"Trivially reachable — §6.1 step 4 pushes one blank actor on load and 'Add other actor' adds a second; two cards is the ordinary case."* The Reviewer endorsed both the fix and the disclosure, and endorsed **the boundary it drew**: the same defect shape inside its own file was fixed, while inside a shared component it was deferred — *"same defect class, two different scope verdicts, both correct."*
3. **The heading reshape does not violate §5.7** — the mapping's *Element* column holds **semantic role names**, not HTML tags, so the binding artifact is the class, and `.section-title`'s own four properties (size, weight, both margins) override any UA `h2` default at higher specificity. No test asserted on the tags (the one relevant query is by **class**). Claim verified: the file set now contains exactly four `<h2 class="section-title">` and **zero** other headings.

#### `ADVISORY`

| Lens | Finding | Reachability |
| --- | --- | --- |
| **Risk — ESCALATED, see below** | The `.rs-*` / `.fs-[n]` families do not exist. **T-13 c7 cannot pass in the current state** | **Certain, every render** |
| **Risk** | `src/CLAUDE.md` is the fourth doc site, and routes token edits to a nonexistent path | Certain |
| **Reliability** | `docs/ux-ui/design.md` §7.1 line 358 — *"the Aura preset flips via the `.dark-mode` body class"* — is **false**. Grep across `src/` returns 4 hits: the `darkModeSelector` declaration and three service *imports*. `dark-mode.service.ts` only ever calls `setAttribute(documentElement, 'data-theme', …)`, **never `classList`** — so PrimeNG chrome always renders light-Aura regardless of theme | Certain. Platform-wide; discovered here, not caused here |
| **Reliability (new)** | The heading outline is now `h3 → h2 h2 h2 h2`, because `app-form-header` renders its title as `<h3>` — the container heading sits **below** the cards it contains. **Not** a WCAG AA failure (heading-order is an axe best-practice, not an AA criterion) and **net-positive for SC 1.3.1**, since card headings that look like headings now are ones. Clean fix is in `app-form-header`, a shared component — out of scope | Reachable on every in-form render. → **T-13 c9** |
| **Readability** | `md:grid-cols-2` is **Tailwind's** `md:` (min-width 768px), whereas the project's `.md:` convention means *landscape, height ≤ 768px*. **Different breakpoints.** T-13 c7 tests at the project's breakpoint and may find the grid does not behave as its class name suggests | → T-13 c7 |
| **Readability** | The page's `<span class="label">Level of use…</span>` is the one label whose layout depends on a descendant's display rather than its own | Cosmetic → T-13 c7 |
| **Readability** | Two icon queries are page-wide first-match, justified by an accurate comment; the page spec uses the stricter parent-scoped form. Uniform adoption would make them robust to a future branch change rather than to a current fact | Minor |

#### The dark-mode non-compliance — the record, as the user asked

**R-IUP-017's dark-mode scenario cannot be satisfied within T-11's declared scope.** §5.7 makes `.label`, `.option-label`, `.description` and `.section-title` **binding**, and all four are hard-coded light-theme hexes in `src/styles/custom-fields.scss` (`#153c71`, `#4c5158`, `#777c83`, `#a2a9af`) with **no dark-mode override anywhere in the repo** — grep-confirmed, zero `data-theme`/`dark` references in that file. On the cards' dark surfaces this computes to **1.29:1** for `.label` on `--ac-grey-100` (dark `#2b2b2b`) and **1.887:1** for `.section-title` on `--ac-white-1` (dark `#e5e5e5`), against a **4.5:1** requirement — **both produced by following §5.7 exactly.** Compounding it, `--ac-white-1` **does not invert**: in the dark palette it is a *foreground*-luminance value under a surface token name, so the four page-level card surfaces stay near-white. And `.dark-mode` — the class the Aura preset watches — **is never applied**, so PrimeNG controls render light chrome inside a dark card.

**The files that would have to change are `custom-fields.scss` and `dark-mode.service.ts`, both outside T-11's scope** (four component pairs, plus `colors.scss` only under OQ-IUP-4). T-11's own note prescribes the action taken: *"if a color needs a dark-mode-specific value that the token system cannot express, that is the forbidden case; **stop and escalate**."*

**Remote-stylesheet caveat: closed.** The Implementer fetched the app's one external stylesheet and found it contains **no rule for any of the four classes under any selector**. The Reviewer, lacking network access, replaced that with an argument independent of the fetch: the file is **1074 bytes**, while the documented `rs-*` family spans p/m/gap/w/h/size over 0–500px with `md:` variants plus `fs-` over 1–30 — **tens of kilobytes minimum. 1074 bytes cannot physically contain it.** The conclusion holds either way.

---

## RB-9 resolved — `responsive-size.scss` created (user-authorized, option A)

**Not a numbered task.** A user-authorized change closing the blocking finding T-11's review surfaced: the `.rs-*` / `.fs-[n]` families mandated by **four constitutional documents** had no implementation anywhere, so the section rendered as unpadded, ungapped, unseparated boxes and **T-13 c7 could not pass**. The user chose to **make the documentation true** rather than amend five documents to match an absence.

**Two files:** `src/styles/responsive-size.scss` (new, 193 lines, ~4,089 selectors) + one line in `angular.json`'s build `styles` array. **Reviewer: PASS.**

### The Leader's brief was wrong on the ranges, and the correction is what made this viable

The Leader's table assumed gap/margin/padding spanned **0–500**, which would have been ~20,000 selectors and 600–800 kB. The Implementer read the contract instead of the brief and found `README.md:258` — *"All values (n) range from 1 to 30 for most utilities (except size which goes up to 500)"* — a **general rule with one named exception**.

**The Reviewer upheld it on three convergent grounds, including one neither the Leader nor the Implementer had cited:** only the two deviating families restate a range inline; **every** gap/margin/padding example in the README is ≤ 30; and `docs/ux-ui/design.md:364` settles the size question authoritatively — *"`.rs-size-[n]`, `.rs-w-[n]`, `.rs-h-[n]` — width/height (0–500 px)"*, one bullet, one range, all three families. **So the range table is not a judgment call — it is what both documents say when read together.** ~4,089 selectors, and the budget problem dissolved.

### Measured outcome

| | Before | After | Delta |
| --- | --- | --- | --- |
| `styles-*.css` | 97.66 kB / 10.56 kB transfer | 262.71 kB / 19.25 kB | +165.05 kB / **+8.69 kB transfer** |
| Initial bundle | 1.16 MB / 265.70 kB | **1.32 MB / 274.39 kB** | +163.84 kB |

**No budget warning or error fired** (2 MB warning / 3 MB error). Full suite 312/312 · 6510/6510. Lint clean. `s-lint`: 352 pre-existing errors unchanged elsewhere, **zero** in the new file.

### The specificity question, answered concretely rather than in the abstract

This was the Leader's chief worry — *"a utility layer that loses specificity ties is as useless as an absent one, and the failure would be silent."* The Reviewer settled every axis:

- **vs Tailwind — always wins.** Tailwind v4 (CDN) emits everything inside native `@layer`s, and **unlayered normal declarations beat any layered declaration regardless of source order.** The new sheet is unlayered, so `.rs-p-[12]` beats `p-4` unconditionally.
- **vs `custom-prime-force-styles.scss` — the feared inversion does not happen.** `!important` beats a later non-important rule, so placing that file *before* the utility layer cannot invert its forcing intent. Its non-important declarations share no property with any family. And its scariest rule, `body { font-size: 13px !important }`, is **inherited** — a direct rule on a descendant beats an inherited one however important.
- **vs component styles — no competitor exists.** The four components have **zero** `.scss` files.
- **Last position is *required*, not merely convenient:** `design.md:370` states the intent as *"per-element overrides via `.fs-[n]`"*, and an override can only override from a later position.

**And the breakpoint risk is moot:** `@media (orientation: landscape) and (height <= 768px)` — the exact query — **already ships in production** at `custom-prime-force-styles.scss:31`.

### Escaping verified without a build

No `dist/` existed for the Reviewer, so instead of re-running the Implementer's proof it corroborated arithmetically: counting selectors from source gives **4,089**, matching the Implementer's ~4,088 within rounding — an independent check on the build excerpt. It confirmed every one of the 15 families is escaped (`\[`, `\]`, `\:`) with no unescaped bracket or colon, and that the documented **`md:` colon vs `md-rs-hide` hyphen inconsistency was preserved deliberately**, with a comment in the file explaining why so a future tidy-up does not break the contract.

### The delta is wider than the Leader reported

The Leader listed the five pre-existing usage sites. The Reviewer confirmed the list complete **and added the consequence the Leader missed**: `<app-form-header>` renders on **13 result-detail pages plus the platform shell**, so activating `fs-[12]`/`fs-[13]` is *"a visible typography change across essentially every result tab — the widest blast radius in this change"*, and `section-header`'s `rs-gap-x-[15]` changes header spacing app-wide.

It also confirmed the **naming trap** the Implementer caught: **"Innovation Dev" (R-IUP-019) is `pages/result/pages/innovation-details/`** — a different, pre-existing page — and its three templates carry **zero** `fs-*`/`rs-*` usages of their own. Its exposure is indirect only, through the shared header. And **zero consumers exist anywhere** for `md:fs-*`, `md:rs-*`, `rs-hide` or `md-rs-hide`.

### Honest limits, stated by both parties

The Implementer volunteered that 6510 green tests are *"expected and uninformative about visual correctness — jsdom never loads global stylesheets, so a CSS-only change cannot move a spec either way."* The Reviewer confirmed the framing and found the spec authors had already written it down themselves at `innovation-use-level-stepper.component.spec.ts:192-194`. The Reviewer additionally disclosed which claims it could **not** verify under a read-only allowlist (the git-diff cleanliness, the test and build byte measurements) and offered circumstantial support: `src/styles/` holds six files with `responsive-size.scss` newest and **`custom-fields.scss` oldest by mtime** — consistent with one new file and T-11's dark-mode escalation left untouched.

### Residuals — recorded, none blocking

| Finding | Reachability | Disposition |
| --- | --- | --- |
| **The spacing range is tight at *both* ends.** `rs-p-[30]` sits exactly on the ceiling and is used **four** times, so the first designer wanting a roomier card writes `rs-p-[40]` and gets a silent no-op — the very defect class this change exists to kill. And **`0` is below the floor**: `rs-p-[0]`, `rs-m-[0]`, `rs-gap-[0]` emit nothing, though zero is the most-wanted spacing value and the size families *do* start at 0 | **Reachable, not currently reached** | Both are contract-faithful, *"which is exactly why the **contract** is what should move."* Needs a human blessing or a widened range in `README.md` **and** `design.md` together |
| **New trap: `.fs-[n]` cannot override the canonical form-label classes.** `custom-fields.scss` matches `body .label` at specificity **(0,1,1)** with a non-important `font-size: 14px`, which beats `.fs-[16]` at (0,1,0) **regardless of load order** — so `class="label fs-[16]"` silently renders 14px | **Reachable, not reached** — the only `.label` + token combinations in the client set *margin*, not font-size, and those resolve correctly | Worth a sentence in `design.md` §7.1 |
| **Two incompatible `md:` semantics now coexist in one class attribute.** `md:grid-cols-2` is Tailwind's `min-width: 48rem`; `md:rs-gap-[8]` would fire on *landscape and height ≤ 768px* | **Reached already** at `innovation-use-actor-item.component.html:76`, though harmless — nothing uses an `md:rs-*` class anywhere | A maintainer trap; deserves a sentence in §7.1 |
| **Budget proportionality.** The size families are **74%** of selectors for **two** live usages, and the whole `md:` block is 50% with **zero** consumers | n/a | Users pay **+8.69 kB gzipped on 265.70 kB — ~3%**. The cheaper path is narrowing the *documented* range in both docs together, which is a product decision, not an implementation one |

**→ T-13 c7 must now check an *unrelated* result tab, not only innovation-use**, because the widest consequence of this change is outside the spec's own section.

---

### T-12 — Register the new component patterns in `docs/ux-ui/design.md`

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS on attempt 1** |
| **Date** | 2026-08-21 |
| **Implementer attempts** | **1** |
| **Effort / skills** | `high` · `cognitive-doc-design` |
| **Requirements covered** | R-IUP-017 (AC.4) |
| **Review** | **None spawned** — see the deviation below |

#### Leader deviation, recorded

| Deviation | Reason |
| --- | --- |
| **No Reviewer spawned** | The output is documentation in one file, its own criteria are self-verifying (c4 *is* a grep, reported with the file set named), the Implementer read each component **at source before writing its entry** rather than transcribing spec prose, and the Leader verified the one substantive claim — the residual false-claim sites — directly. `.agents/leader.md` → *Delegation Ceiling*: spawning a fresh context to re-read a 21-line doc diff whose evidence is already a named-file-set grep would be the ceiling's clearest violation. **The Leader did verify the diff and the residue itself rather than accepting the report** |

#### What landed — `docs/ux-ui/design.md` only, §7.1 / §8.1 / §11 / §12.2, +18 / −3

**c1 — five patterns, each citing its implementation file** (the Disqualifier requires the citation, since a registration that does not name its implementation cannot be checked against it). The three components, `quantification-item`'s new `shared/` home, **and the inline load-failure banner** — which c1's named list omits but **R-IUP-017 AC.4 binds**, since AC.4 covers *"patterns"*, not *"the four patterns c1 happened to list"*. T-07's review had flagged it as a genuinely new pattern for STAR's result pages, every other page surfacing load errors only through `ActionsService`.

**Crucially, it described what the code does, not what the spec intended** — verified at source per entry, and it carried forward the two traps the run established a naive description would get wrong: the stepper's **label is `level`, emitted value is `id`**, and the actor card's total renders **empty, not `0`**, when all four counts are absent.

**c2 — DD-1, DD-10, DD-8 in §12.2, with DD-8's rationale corrected rather than repeated.** `saveCurrentSectionValue` has **zero production consumers** (grep-confirmed), so DD-8's stated hazard does not exist today; the registered reason is the accurate one — the hazard is **retroactive**, firing the day that signal is wired, at which point this page is the only one already immune.

**c3 — vacuous, and said so.** T-11's c4 added no token. It went further than asserting it: `colors.scss`'s last modification **pre-dates this spec**, and a fresh hex grep of the four templates returns zero. Stated explicitly so a reader can tell the criterion was **evaluated, not skipped**.

**c4 — both directions, file sets named.** Forward: the five new names across `docs/ux-ui/design.md` (4 hits, all its own, self-consistent) and across `docs/specs/innovation-use/details-page/*.md` (52 hits over five files), spot-checked for contradiction. Backward: `docs/` grepped for references to §7.1 / §8.1 / §12 and for the literal false phrase.

#### The backward sweep found a fourth instance — and the scope widening was flagged, not taken silently

The brief named three known falsehoods. **The sweep surfaced a fourth: §11's Dark Mode table carried the *same* false `.dark-mode` claim independently, three lines from where the Implementer was already correcting §7.1.** It fixed both, *"so the document doesn't now contradict itself between two sections I both touched"*, and **flagged the widening explicitly** with the note that §11's edit is *"easily revertible in isolation — a single table-cell change"*. That is the right handling: the mandated sweep found it, leaving it would have made one document self-contradictory, and the disclosure makes the judgment reviewable.

#### Its ruling on the three falsehoods — boundaries respected

| # | Action | Reason |
| --- | --- | --- |
| 1 | **Corrected** — §7.1's `.dark-mode` claim, replaced with the verified mechanism plus a pointer to RB-8/RB-9. Plus §11's copy | Plainly false, inside its target section |
| 2 | **Reported, not edited** — `requirements.md` §6.3 / R-IUP-005's *"five names"*. Confirmed by counting §6.3's own table: **six distinct names, four repeating** (`Partners`, `Connected next-user`, `Unconnected next-user`, `End-user / Beneficiaries`), two unique (`No use`, `Project lead organization`) | *"Amending an approved requirements doc is outside this task's authority"* — correct |
| 3 | **Added, not "fixed"** — the three §7.1 traps were **missing, not wrong**: `.fs-[n]` cannot override `.label` on specificity; two incompatible `md:` semantics now coexist; the range is tight at both ends. **The range-widening question is recorded as OPEN, not resolved**, per instruction | The user has not blessed 1–30 nor widened it. Presenting it as settled would be exactly the registration the Disqualifier calls worse than none |

#### ⚠️ The correction is now *relocated, not applied* — the KZ-005 shape, verified by the Leader

The Implementer reported, and **the Leader confirmed directly**, that the false claim survives at **two sites it was forbidden to touch**:

- `docs/specs/innovation-use/details-page/tasks.md:504` — T-11's Implementation notes: *"Tokens flip under `:root[data-theme="dark"]` and the `.dark-mode` body class."*
- `docs/specs/innovation-use/details-page/design.md:311` — the local spec's §5.7 area, same sentence.

It extended the authority boundary correctly on its own initiative: the prohibition on `requirements.md`/`tasks.md` *"extends by the same logic to the local spec's own `design.md`, which isn't one of my three named targets."*

**The consequence is that the documents now contradict each other, which is a worse state than before.** Before T-12, all four sites were **consistently wrong**. Now the constitutional document correctly states the claim *"was never true"* while the spec folder still asserts it twice. **This is precisely KZ-005's recorded failure — a correction relocated rather than applied — and it was created by an authorized correction, which is what makes it worth naming.** Escalated to the user: two lines, same already-verified fact, and fixing them completes the correction rather than widening it.

#### Verification

**No test run, and the Implementer said so rather than reporting a green suite as evidence:** the change touches no code, so no suite applies and `npm run lint` is not applicable. The c4 greps *are* the verification, and they were reported with the file set named — which is what the Falsifying input demands, since *"a grep over the wrong file set cannot fail."*

---

### T-13 — Verification gate

| Field | Value |
| --- | --- |
| **Final status** | 🔶 **`[~]` — 7 of 11 criteria discharged. Four are owed to the human gate by design, not by omission** |
| **Date** | 2026-08-21 |
| **Implementer attempts** | **1** (automated half) |
| **Effort / skills** | `high` · `systematic-debugging` |
| **Review** | **Deliberately deferred** — see the deviation |

#### Leader deviations, recorded

| Deviation | Reason |
| --- | --- |
| **Task split into an automated half and a human half before delegating** | Four of T-13's eleven criteria (**c1** end-to-end, **c7** visual, **c8** T6-multimodal, **c9** keyboard) cannot be discharged by any agent. The brief forbade attempting them and named why: *"Claiming, inferring, or partially discharging any of those four is the single worst thing you could do at this gate"* — **KZ-002 recurrence 6** is the recorded failure of a human observation being credited for a question it did not cover. The Implementer complied exactly, reporting one line each |
| **Reviewer deliberately NOT spawned yet** | T-13 **cannot close** until the human half lands, so reviewing half a gate and re-reviewing the whole later spends two contexts for one verdict. The Reviewer will audit the **complete** gate. Meanwhile the Leader spot-checked the two computable claims itself rather than deferring them |
| **Leader pre-ran the environment pre-check** before delegating, per `/akili-execute` §2.1's environment-dependent-verification rule | `docs/infrastructure.md`'s *Local Environment* contract: `docker info` → **daemon active**, and both `environment.ts` / `environment.dev.ts` are present on this machine (gitignored, no committed template). So the stack **is** bringable up — which is what makes c1 assignable to the human rather than blocked outright |

#### The seven discharged — with the Disqualifier each one had to clear

**c2 — full suite.** `npm test -- --silent` from `client/research-indicators/` → **312 suites / 6510 tests passed.** Unfiltered: no `-t`, no path, no pattern. The counts **match the last recorded run exactly**, and the Implementer checked rather than assumed that a docs-only T-12 and a CSS-only stylesheet addition moved nothing — jsdom loads no global stylesheets, so movement there would have been a finding.

**And the gate's own falsifier was executed — the one criterion in the spec that tests the gate rather than the code.** `npm test -- --silent innovation-use` collected **6 of 312 suites, 173 of 6510 tests**. **Recorded as inconclusive, not as a pass.** As the criterion puts it: *"If a targeted run can satisfy c2, the gate is blind to defect class **D5**, which is the one it exists to catch."* The gate proved itself.

**c3 — Innovation Dev unmodified.** `git diff --exit-code` **exit 0 on each of the three paths, reported per path**. The naming trap this run fell into once was avoided — Innovation Dev is `pages/result/pages/innovation-details/`, a different pre-existing page.

**And DD-2's figure was re-derived, not restated** (KZ-005: a measured figure has one home and every other site cites the deriving command): `wc -l` gives **638 + 392 + 635 = 1,665**, matching DD-2 **exactly**. **The Leader re-ran this independently and confirms the same three numbers.**

**c4 — coverage.** 99.22 / 97.94 / 98.81 / 99.5 against floors 40 / 20 / 45 / 30. Reported as floor-clearance only, **not** as proof of behaviour — KZ-001 stays in force for D7/D8.

**c5 — build and budgets.** Initial **1.32 MB raw / 274.39 kB transfer**, matching the authorized post-RB-9 baseline **with no growth beyond it**. `innovation-use-details-component` confirmed as its **own lazy chunk** at 35.09 kB (T-10 recorded 34.92; +0.17 kB consistent with T-11's a11y markup). Against a 2 MB warning — nowhere close. The six component-style warnings are pre-existing on unrelated legacy components, and the four new components **have no `.scss` files at all**, so no per-component budget applies to them. **Concurrency explicitly ruled out**, which its Disqualifier requires — *"a build run while any delegated agent is active is a **wrong** number, not a slow one."*

**c6 — lint.** `All files pass linting.`, and the post-run `git status` is **clean** — evidence, not assumption, which is exactly what its Disqualifier demands of a script carrying `--fix`.

**c10 — budget reconciliation.** Computed from `git show --numstat` per task commit, with the convention **calibrated against the ledger's own T-09 entry** rather than assumed:

| | §6 derivation | Actual | Rounds |
| --- | --- | --- | --- |
| T-01…T-09 | 2,802 | 4,871 | 17 |
| T-10 | 190 | **180** *(under by 10)* | 1 — the Pivot consumed **no** rework round, per protocol |
| T-11 | 80 | **95** *(over by 15)* | 1 |
| T-12 | 40 | **18** *(under by 22)* | 0 |
| T-13 | 0 | **0** | this attempt |
| **Total** | **3,510** | **5,164** | **20 of ~28 (71%)** |

**vs §12's original ~3,200: +1,964 (+61.4%). vs the user-re-baselined ~4,600: +564 (+12.3%).** *(Leader re-computed both independently — figures confirmed.)*

**Cause unchanged from the two rulings already made:** spec-tier density, not scope creep. **T-10 and T-12 both came in *under* their own derivations**, and T-11's small overage is the same spec-tier fraction, not a new driver. **Not re-escalated a third time** — the user has ruled twice with full information.

**And it disclosed what a narrower reading would have hidden:** RB-9's `responsive-size.scss` added **195 LOC** as a user-authorized non-task change, making the real footprint **5,359**. Named as an addendum *"so the reconciliation isn't silently narrower than the real diff"* — neither folded in nor omitted. **Review rounds remain under budget even though LOC breached; the two dimensions moved independently.**

**c11 — the three risks, written as open.** **AR-1**: no client-tier test reaches a live API, so server acceptance rests on chunk 2's archived fixture tier plus §4.3's transcription — *"this verification gate adds no new evidence toward AR-1."* **AR-2**: D7/D8 have no automated gate and rest on human observation. **Family FR-7 / AC-1718 is not discharged by this spec.** All three stated as open. Closing any here would have been false.

#### The four owed to the human gate — and what each needs

| # | What it requires | Blocker, if any |
| --- | --- | --- |
| **c1** | Open an indicator-6 result **from the sidebar**, fill the section, save, re-read, watch the tick turn — **in one pass.** The criterion is explicit that satisfying it via the sub-checks *"is **not** satisfied"* | ⚠️ **`RB-2` / `OQ-IUP-2` may block this outright.** If indicator 6 is not `is_active` in the environment, no indicator-6 result can be created and c1 is **unperformable**. RB-2 classified this as *"blocks nothing"* — true for release comms, **false for this criterion** |
| **c7** | Human visual check, **both themes**, at **1440 px** and the `md:` breakpoint (landscape, height ≤ 768 px). **Quote what was observed** — *"the page renders"* does not discharge *"contrast ≥ 4.5:1 in dark mode"* | Two outcomes already known and to be **recorded, not discovered**: dark mode **will fail** (1.29:1 and 1.887:1 against 4.5:1, produced by following §5.7 exactly), and **an unrelated result tab must be checked** because `form-header` renders on 13 pages and its typography changed when `rs-*` began resolving |
| **c8** | T6-Multimodal screenshot review, both themes × both viewports | **Not necessarily blocked.** The criterion says record *blocked* if no T6-capable reviewer is reachable — but the Leader **can read images**. If the human captures the four screenshots, c8 is genuinely dischargeable rather than blocked |
| **c9** | Keyboard pass — Tab through the page: every control focused in document order with a **visible ring**, **no focus trap inside a repeatable card**, every icon-only control announcing an **English** name. Human-observed; quote it | T-11 improved this surface (native `<button>` for both remove controls, resolving checkbox labels, `[ariaLabel]` on all four selects) but **none of it is proof of rendered focus behaviour** |

**Stack is ready:** `cd client/research-indicators && npm run compose:up:dev` → `http://localhost:4200` (or `npm start` without Docker).

---

---

## ⛔ Pivot Record: T-13 — the create-result entry point is closed by a client allowlist

**Date:** 2026-08-21 · **Trigger:** user-reported defect during the T-13 human gate (screenshot: the *Create result* → `Indicator` dropdown offers four options; Innovation Use is absent) · **Approved by the user:** *"Pivot + arreglar en el spec"*

### What was discovered

`client/research-indicators/src/app/shared/services/control-list/indicators.service.ts:34`

```ts
const targetIndicatorIds = [1, 2, 4, 5];
```

Applied inside `generateGroupedIndicators()`, whose output `indicatorsGrouped()` has **exactly one consumer**: `create-result-form.component.html:49` (`<p-select [options]="indicatorsService.indicatorsGrouped()">`). Indicator 6 is filtered out before render, **independently of the server's `is_active` value**. The four options in the user's screenshot are ids 1, 2, 4, 5.

Verified blast radius: `about-indicators.component.html:2` reads the **unfiltered** `indicators()`; `indicator.component.ts` does not read the list at all. The allowlist governs the create-result dropdown and nothing else. The line carries no explanatory comment and its history is squashed into the monorepo-migration commit `c0645b58`, so original intent is unrecoverable.

### Why this is a Pivot and not a rework attempt

The implementation conformed to the spec. **The spec was factually wrong**, in a way that propagated through every downstream document:

| Site | Claimed | Reality |
| --- | --- | --- |
| `proposal.md:40` | *"the indicator **is** selectable: `IndicatorsService.findAll()` filters only on `is_active`"* | **Root cause.** `findAll()` is the **server's** `IndicatorsService`. The dropdown uses the **client's** same-named class, which allowlists. Two tiers, one class name, wrong tier audited |
| `requirements.md` §Executive Summary | *"`GetAllIndicatorsService` applies no client-side filter"* | True of that service — but it does not feed the dropdown |
| `requirements.md` §6.4 audit row | *"Indicator selectability · `get-all-indicators.service.ts` · **No client-side filter**"* | Wrong file audited |
| `requirements.md` §Why-now | *"the entry point is already live in production … confirmed by code inspection in §6.4"* | Cited the wrong audit row as its own confirmation |
| `requirements.md` `A2` | *"Indicator 6 is `is_active` …, **so** the create-result flow offers it"* | **Invalid inference.** `is_active` does not imply offered |
| `design.md` §10.5 / §13, `OQ-IUP-2`, `RB-2` | *"a deployment fact, not answerable from the repo"* / *"blocks nothing"* | Answerable from the repo; blocked `T-13` c1, c7, c8, c9 — the entire human gate |

**This supersedes `execution.md:1600`**, the T-13 entry's c1 blocker row, which hypothesized `is_active` as the cause. That row stands as written (this log is append-only); this record is its correction.

### Impact on T-13

c1 requires opening an indicator-6 result; c7/c8/c9 require the page rendered. With no creatable indicator-6 result, **all four owed criteria were unperformable** — not failing, unperformable. The gate could not run at all.

### Alternatives considered

| Option | Assessment |
| --- | --- |
| **A — Correct the documents and admit `6` to the allowlist** | **Chosen by the user.** One line, one consumer, and it is the only route that closes the spec. Aligned with `design.md` §13's own declared intent (*"Innovation Use is now reportable"*) |
| B — Correct the documents; run the gate against a pre-existing indicator-6 result | Depends on such a result existing in the dev environment — unverified, and leaves the entry point shipped broken |
| C — Correct the documents; park T-13 with c1/c7/c8/c9 recorded **blocked** | Defensible (making an indicator selectable is a product decision), but ships a page no user can reach |

### Revised technical direction

1. **Documents corrected** (this Leader, done): `requirements.md` §Executive Summary, §Why-now, §6.4 audit row, §6.4 Conclusion, `A2`, `OQ-IUP-2`; `design.md` §10.5, §13 Comms, `OQ-IUP-2`; `tasks.md` `RB-2` and the §closure checklist; `proposal.md:40` annotated with the root-cause diagnosis.
2. **Correction Closure sweep, both directions — executed.** The forward sweep caught **two residual live falsehoods absent from the cited-site list**: `requirements.md` §Why-now and `proposal.md:40`. This is **KZ-005's exact failure mode recurring inside the spec that records it**, and it is the second time in this run that the sweep — not the analysis — caught the survivor.
3. **Code change** — delegated to the Implementer, not written by the Leader: admit `6` to `targetIndicatorIds`, update `indicators.service.spec.ts`, full suite + lint.
4. **Recorded as a user-authorized non-task change on the `RB-9` precedent**, not as a new numbered task and not by reopening the closed `T-10`. Per `/akili-execute` §2.4 a spec's task list is what the user approved; the Pivot Protocol authorizes the amendment, and `RB-9` already established this treatment in this spec.
5. **No TRD ADR is overturned.** A hardcoded client allowlist is not a recorded architecture decision — there is no `ADR-NNN` to supersede.

### Kaizen candidate

**Same-named classes across the two tiers make "which tier does this symbol live in" a mandatory step of any code-inspection claim.** And: **an assumption carrying its own verification instruction, never verified, is a latent Pivot.** `A2` said *"to be confirmed against the deployed environment before implementation"*; implementation ran to the final task without it, and the cost was paid at the most expensive possible moment — the last gate of a 13-task spec.

### PV-T13-1 — allowlist correction: ✅ PASS

| Field | Value |
| --- | --- |
| **Status** | ✅ **PASS** — Reviewer verdict, first attempt, no advisory block |
| **Date** | 2026-08-21 |
| **Authorized by** | User, at the T-13 Pivot (*"Pivot + arreglar en el spec"*). Recorded as a non-task change on the `RB-9` precedent |
| **Attempts** | **1** |
| **Effort / skills** | `medium` · `angular-developer` |
| **Triad** | Implementer (`akili-implementer` · T2 · sonnet) → Reviewer (`akili-reviewer` · T3 · opus, read-only). `author ≠ auditor` held on both axes — **not collapsed despite the diff being one production line**, per `/akili-execute` §Delegation Ceiling |

**The change.** `indicators.service.ts:34` — `[1, 2, 4, 5]` → `[1, 2, 4, 5, 6]`, plus a two-line comment naming what the array gates and citing this spec. **+27 / −2 across two files.**

**Coverage is real, not nominal — and this was the trap.** The pre-existing fixture `mockIndicatorTypes` held indicators 1, 2, 3, 4, 5 and **no 6**, so the existing filter test would have passed against either array: *the change could have shipped with a green suite and zero evidence.* The brief named this explicitly. The Implementer added indicator 6 to the fixture (making the pre-existing deep-equality assertion load-bearing at the same time) plus a dedicated test asserting **6 present and 3 still absent** — the falsifier proving the allowlist widened by exactly one member rather than being disabled. **Validated by reverting line 34: 2 failed / 5 passed. Restored: 7 passed.**

**Verification.** `npm test -- --silent` full unfiltered → **312 suites / 6511 tests** against the 312 / 6510 baseline: suites held, tests +1, matching the single new `it()` exactly. Coverage 99.22 / 97.94 / 98.81 / 99.5 vs floors 40 / 20 / 45 / 30. `npm run lint -- --quiet` → `All files pass linting.`, `git status` re-inspected after (the script carries `--fix`).

#### What the Reviewer established independently — beyond confirming the Leader

Three findings the Leader had **not** verified, and one it had:

1. **The fixture's `indicator_type_id: 2` is production-accurate, not incidental.** Traced to the server seed rather than reasoned about: migration `1729174028390-addedDescriptionColumnIndicators.ts:14` inserts `INNOVATION_USE, 'Innovation Use', …, 2`; `1729611300485-addedDescriptionAndIconToIndicators.ts:33` sets `indicator_type_id = IndicatorTypeEnum.OUTCOME`; `OUTCOME = 2` (`indicator-types/enum/indicator-type.enum.ts:3`) and `INNOVATION_USE = 6` (`indicators/enum/indicators.enum.ts:7`). **Consequence for the human gate: Innovation Use renders under the *OUTCOMES* group, not *OUTPUTS*.**
2. **Indicator 3 is Knowledge Product**, moved to `OUTPUT` by the same migration — so the fixture's placement of 3 under type 1 is also accurate. Its continued exclusion is out of this change's scope and remains unexplained by any comment in the codebase.
3. **No sibling allowlist exists.** Grepped `\[1,\s*2,\s*4,\s*5\]|targetIndicator` across the whole client `src/` — three hits, all inside the one method. There was no second copy of this filter to miss.
4. **Blast radius confirmed against the Leader's claim** (which the brief instructed it not to take on trust): `indicatorsGrouped|generateGroupedIndicators` has exactly **one runtime consumer**, `create-result-form.component.html:49`, plus two test-only sites. `about-indicators/` holds no reference to the grouped list.

#### The question that mattered most — is anything owed? (brief Q5)

**Nothing.** The Reviewer followed the create→open path end to end, which is the check that would have caught "a dropdown that creates a result the app cannot open":

| Hop | Evidence |
| --- | --- |
| Sidebar row | `result-sidebar.component.ts:130-135` (`indicator_id: 6` → `innovation-use-details`) and `:196-201` (`ip_rights`) — both from **T-10** |
| Route | `app.routes.ts:148-152`, lazy child route |
| Section path | `cache.service.ts:66-67` returns `'innovation-use-details'` for case 6 — the Next/Back dead link is closed |
| Create-form logic | No indicator-6 gap. The OICR special paths (`=== 5`: forced 2025 year, `CreateOicr()`, "Continue" label) don't apply; indicator 6 takes the generic `createResult(true)` path |
| Server create | `results.service.ts:546-548` creates the `result_innovation_use` row; `:556-564` includes `INNOVATION_USE` in `ipAvailables`, so the `ip_rights` row the sidebar expects exists |

**This is the first evidence in the run that T-10's reachability wiring works against a result reachable by a real user** — every prior check exercised it against fixtures.

**`STATUS: PASS`** — *"precisely the change the T-13 Pivot Record authorized — one array member plus falsifying test coverage in two files — with production-accurate fixture semantics, a single verified consumer, and all companion routing, sidebar, section-path and server-side create wiring already in place from T-10 and chunk 2."*

#### Budget

**+25 net LOC** (+27 / −2). Running total **5,164 + 25 = 5,189**, or **5,384** including RB-9's 195. Review rounds **20 → 21 of ~28**. Not re-escalated: the user has ruled twice on this spec's overrun with full information, and a 25-line Pivot correction does not change the diagnosis.

#### T-13 status after this change

Still **`[~]`**. This unblocked the gate; it did not discharge it. **c1, c7, c8, c9 remain owed to the human** — now performable rather than unperformable, which is the whole point of the Pivot.

---

## Dark-mode deferral — user ruling, 2026-08-21 (`design.md` DD-14)

**Not a waiver, and not a numbered task.** A scope reduction the user authorized after the T-13 human gate opened, recorded here as the single home for the reasoning; `design.md` **DD-14** is its decision-log entry and the ID every amended site cites.

### What triggered it

T-13's c7 required a human visual pass in **both themes**, and the dark half was **known in advance to fail**: the T-11 review measured **1.29:1** and **1.887:1** against WCAG's 4.5:1, produced by following `design.md` §5.7 exactly. So the gate was scheduled to spend a human pass in order to confirm a defect the spec had already located, in a theme nobody could reach.

### The evidence that made it a ruling rather than a shortcut

The user's premise was **verified before the reduction was accepted**, not taken on trust:

| Check | Finding |
| --- | --- |
| `DarkModeService` exists? | Yes — `client/research-indicators/src/app/shared/services/dark-mode.service.ts` |
| Injected anywhere? | Yes — `alliance-navbar.component.ts:22` (import), `:52` (`inject(DarkModeService)`) |
| Exposed in the navbar template? | **No.** Zero matches for `dark` in `alliance-navbar.component.html` |
| Any other control exposing a toggle? | **No** |

**It is a dead injection.** No user can enter dark mode, so the §5.7 contrast defect sits in an **unreachable state**.

This is **KZ-008's reachability discipline run in the negative direction.** KZ-008 exists because advisories naming *reachable* states were left unowned and became data-destruction defects; the same test, applied here, rules a finding *out*. Using one test in both directions is the point — a rule that can only ever escalate is not a test, it is a ratchet.

### The split — verification lifted, implementation kept

This is the part that would have gone wrong under a blind string sweep. The forward sweep found 20+ dark-mode mentions across the spec folder in **two categories**, and only one was amended:

| | Category | Sites | Action |
| --- | --- | --- | --- |
| **A** | **Verification obligations** — someone must look at dark mode | `T-13` c7, `T-13` c8, `requirements.md` D7 row, `requirements.md` §closure checklist, `requirements.md` RK-3, `design.md` §10.4 | **Amended to light-theme only**, each citing DD-14 |
| **B** | **Implementation discipline** — how colors are written | DD-7 (zero hex literals), R-IUP-017 + its *"Dark mode is not an afterthought"* scenario (never branch on `isDarkMode()`), `T-11` c5 (already `[x]`, grep zero hits), `design.md` §5.7's token mechanism, `tasks.md` T-11 notes | **UNCHANGED and still binding** |

**Why B survives.** It already passed, it costs nothing to keep, and it is exactly what would make dark mode work on the day a toggle is wired up. Deleting it would be a real loss dressed as a saving. The user asked not to *spend* on dark mode; keeping already-green discipline is not spending.

**Left deliberately untouched:** three sites quote *"contrast ≥ 4.5:1 in dark mode"* as an **illustration of a bad human tick** (`requirements.md` AR-2, `tasks.md` §rules, `design.md` §10.4 disqualifier). They teach KZ-002's rule, they are not obligations to check dark mode, and the example remains valid. Amending them would have been the sweep mistaking a citation for a requirement.

### Consequences for T-13

| | Before | After |
| --- | --- | --- |
| **c7** | Human visual, **both themes** × 2 viewports | Human visual, **light only** × 2 viewports |
| **c8** | T6-Multimodal, **4 screenshots** | T6-Multimodal, **2 screenshots** |
| §5.7 contrast defect | A blocking finding awaiting c7 | **Deferred as unreachable** — not fixed, not closed, not shipped-broken |
| Light-mode WCAG 2.1 AA | Gated | **Still fully gated** (PRD **C-4**). Only the dark half is lifted |

### Reopening condition — stated so it is not lost

**If a dark-mode toggle is ever exposed to users, this deferral expires by its own terms:** `T-13` c7/c8 revert to both themes and §5.7's contrast defect becomes live and blocking. The deferral rests entirely on unreachability, so the moment that premise changes, so does the conclusion. Whoever wires up the toggle inherits this paragraph.

### Residual note, recorded not actioned

`alliance-navbar.component.ts` injects a service it never uses — dead code in a shared component. **Not minted as work here**: it is outside this spec's task set, and the advisory rule (`/akili-execute` §2.4) forbids growing an approved spec from an incidental finding. Recorded for whoever owns the navbar.

---

## ⛔ Pivot Record: R-IUP-006 / T-09 — the save-time justification guard is deleted by `bugfix/innovation-use-draft-save`

**Date:** 2026-08-21 · **Trigger:** `bugfix/innovation-use-draft-save`, reported live during this spec's own T-13 human gate, deleted the save-time justification guard this spec shipped in T-09 · **Authority:** the bugfix spec's own three approved specify gates; its `tasks.md` T-03 (scope item 1) directs this Pivot by name, pointing back here.

### What changed underneath this spec

`bugfix/innovation-use-draft-save` (approved 2026-08-21, option A, both tiers, Reviewer PASS on both) removed:

- The server's `validateLevelExplanation` guard (`result-innovation-use.service.ts:307-326`, one caller at `:183`) — its own T-01, PASS first attempt.
- The client's `!this.justificationMissing()` term in the save gate (`innovation-use-details.component.ts:497-503`) — its own T-02, PASS attempt 2.

Both removals are deliberate, not a regression: the justification-at-level-≥6 rule was enforced **at save time**, when it belongs **at submit time**, where `innovation_use_validation`'s `explanationValid` conjunct already gates the section's green check and, through it, the Submit button. See `bugfix/innovation-use-draft-save/design.md` §4 for why relocating the check (rather than deleting it) was rejected as unbuildable.

### Why this is a Pivot, not a rework attempt

This spec's own record — written before the bugfix existed — documented the save-time block as intended, shipped behaviour, correctly, at the time it was written. The bugfix spec's `proposal.md` §11 found the block was an *anomaly*, not a floor: this spec's own T-08 (`tasks.md:429`) already ruled the opposite way for a materially identical case — *"Zero actor rows: save is allowed... Do not block the save here"* — and recorded no reason for treating a blank justification differently. The bugfix closes that inconsistency; this record is this spec's side of the correction.

| Site | Asserted (superseded) | Now reads |
| --- | --- | --- |
| `requirements.md:396` (R-IUP-006 Details) | "marked mandatory in that case" — historically implemented (T-09 c5) as a save-time block | Mandatory means the visual marker only (asterisk, required message); Save is not gated on it |
| `requirements.md:186` (§6.2 400-response table) | "Missing justification at effective level ≥ 6 → Mirror the rule (R-IUP-006)" — a client obligation to guard a `400` | Removed — the server no longer throws it, so there is nothing to mirror |
| `design.md:205` (§4.3 400 map) | "missing justification... closed by page-level guard before save" | No save-time guard exists to close; superseded |
| `design.md:380` (§6.6 cross-row validation) | "Justification required at level ≥ 6 → Save blocked, textarea shows..." | Save proceeds; message/asterisk unchanged, enforcement moved to submit |
| `tasks.md:428` (T-09 scope note) | same "save blocked" phrasing | corrected in place |
| `tasks.md:438` (T-09 c5, `[x]` done) | "save is blocked and the inline required message renders" | Hardened to "the save proceeds and the inline required message renders" — matches shipped code, so this spec's own history no longer contradicts it |
| `tasks.md:605` (traceability row) | "AC.2 save-block → T-09 (c5)" | "AC.2 (presence/asterisk/message) → T-09 (c5, hardened) — no longer a save-block" |

**Found by a two-axis Correction Closure sweep, not by the citing task's five-site list.** `bugfix/innovation-use-draft-save/tasks.md` T-03 named five sites (`requirements.md` R-IUP-006 AC.2, `design.md:380`, `tasks.md:428`, T-09 c5, the traceability row). The sweep — bounded on the literal phrasing (`Save blocked` / `save-block` / `blocked`) **and** independently on the token `R-IUP-006` / `level >= 6` / `400` / `guard before save` — found **two more sites the phrasing-only grep could not see**, because neither uses the word "blocked" at all: `requirements.md:186` ("Mirror the rule") and `design.md:205` ("guard before save"). Recorded here so the next reader does not re-derive the miss — this is **KZ-005**'s exact shape, already logged three times this session in `docs/specs/innovation-use/OPEN-ITEMS.md` §6.

**Every other "blocked" site in this spec's four documents was checked and ruled unrelated** — duplicate-actor-type blocking (DD-5, unchanged), general Submit/green-check blocking (R-IUP-016, unaffected), the T-13 human-gate "record blocked" disqualifiers (T6 review, dark-mode deferral), and the `RB-2` / allowlist blocking of the create-result entry point (a different defect, resolved at the earlier T-13 Pivot). None of these describe the save-time justification guard. The full per-file classification lives in `bugfix/innovation-use-draft-save/execution.md` → T-03.

### Impact on T-09 / T-13

**T-09 stays `[x]` done — no rework attempt is consumed.** Only the record of what c5 asserts is corrected, under the Pivot Protocol's authority to amend an approved spec's documents without reopening a closed task. **T-13 is unaffected structurally** — still `[~]`, still owed c1/c7/c8/c9 per `docs/specs/innovation-use/OPEN-ITEMS.md` §3.2 — this Pivot changes what T-09 c5 *means*, not whether T-13's human gate is complete.

### Documents corrected by this record

`requirements.md:396` (+ AC.2 annotation), `requirements.md:186`, `design.md:380`, `design.md:205`, `tasks.md:428`, `tasks.md:438`, `tasks.md:605`.

### Not touched

This `execution.md` is append-only history and is not rewritten by this Pivot: the T-09 (`:1183`, `:1188`, `:1192`, `:1196`) and T-07 (`:830`, `:1027`) entries describing the original save-block design and review stand as written — they were true when recorded. `family.md` and `OPEN-ITEMS.md` carry their own follow-up rows for this bugfix (see `bugfix/innovation-use-draft-save/tasks.md` T-03), not a rewrite of this spec's history.

---

### T-14 — Amendment 01: level-selector guidance, definitions link, evidence callout + Evidence navigation

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** on attempt **1** |
| **Date** | 2026-08-26 |
| **Implementer attempts** | **1** |
| **Effort / skills assigned** | `high` · `angular-developer`, **`tdd`** |
| **Requirements covered** | R-IUP-020 (AC.1–AC.6), R-IUP-021 (AC.1–AC.6) |
| **Triad this task** | Leader (T1 · opus) → Implementer (T2 · **sonnet**) → Reviewer (T3 · **opus**, instructed read-only). `author ≠ auditor` holds on both model and context |
| **Commit** | see the `[SPEC:docs/specs/innovation-use/details-page]` commit for T-14 |

#### Environment deviation, recorded because it changes what was *enforced* versus *instructed*

The session driving this task was rooted in a **different checkout** (`alliance-research-indicators-management/server/app-authorization`), so this repo's `.claude/` was not loaded. Consequences, stated rather than discovered later:

| Normally enforced | This task |
| --- | --- |
| Step 8E wrappers `akili-implementer`→`sonnet`, `akili-reviewer`→`opus` + `tools: Read, Grep, Glob` | Documented fallback: general-purpose subagents seeded with `.agents/implementer.md` / `.agents/reviewer.md`, with **explicit model overrides** (sonnet / opus). Model and context independence **held**; the Reviewer's read-only restriction was **instructed, not enforced** — it made no writes, confirmed by `git status` |
| `.claude/hooks/akili-tasks-gate.sh` blocking a `[x]` increment without `PASS` in `execution.md` | **Not active.** Evidence-before-checkbox was followed manually: this entry was written and saved **before** any `tasks.md` box was flipped |

#### Leader deviations from the task file, recorded

| Deviation | Reason |
| --- | --- |
| Added **`tdd`** to the task's listed skills (`angular-developer` only) | T-14's *Falsifying inputs* table names one input per check, and root `CLAUDE.md` §4.3 / KZ-014 forbid asserting a red that was not **seen**. Red→green is the only way c2/c3/c5/c6/c8/c12 become real gates rather than presence checks — the exact failure their own Disqualifiers name. **This decision is the direct cause of the c13 budget breach below** (each falsifying input became a permanent regression test rather than a one-off manual break-and-revert), and it is recorded here as a Leader cost, not an Implementer overrun |
| Effort set to **`high`**, above the `medium` default for a Size-S T2 task | Size understates difficulty here: verbatim copy including a curly-quote pair, a two-argument router assertion at KZ-001's fourth recurrence, and a live CSS-cascade trap that silently defeats the token choice |
| **c11 discharged by the Leader inline, before dispatch**, rather than deferred to the human gate | `.agents/leader.md` → *Deferring a check*: the assumption "this needs a logged-out browser" was probed cheaply instead of parked. Evidence below. The probe also removed a criterion the Implementer would otherwise have had to report as blocked |
| The task's two **skill exclusions** (`ui-ux-pro-max`, `cognitive-doc-design`) were **upheld**, not overridden | Concurred with the task file's recorded reasoning: DD-17 closes every palette/token/contrast question with measured ratios, so a style-selection skill could only supply non-conforming alternatives; and this task ships template strings, not a document |

#### c11 — Leader probe (D11: dead or permission-walled outbound link)

Unauthenticated `curl`, no cookies, no session:

| URL | Result |
| --- | --- |
| `https://www.scalingreadiness.org/calculator-use-headless/` | **HTTP 200**, 51,904 bytes, `<title>Calculator – Use (headless) | Scaling readiness</title>`, zero sign-in / request-access markers |
| `https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view` | **HTTP 200**, 82,106 bytes, `<title>IPSR Infographic Innovation Use.pdf - Google Drive</title>`, zero `You need access` / `Request access` markers. The file title being served to an unauthenticated client **is** the evidence the ACL is `anyone-with-the-link` |

**What this probe cannot reach (KZ-017):** `curl` is not a browser. It proves HTTP status and Drive's ACL — i.e. it closes defect class **D11** in both directions — but it does not prove the PDF viewer paints. That residual is a **D7** visual concern and is routed to `T-13`'s human visual pass, **not** claimed here. Recorded this way deliberately: crediting a probe for a question it did not cover is KZ-002 recurrence 6.

#### Per-criterion evidence (attempt 1)

| # | Evidence | Red observed (K-004 / KZ-014) |
| --- | --- | --- |
| c1 | Label span text === `How would you assess the current use level of the innovation?`; the required marker is a distinct `span.text-red-500`. Reviewer re-compared as programmatic string equality against `requirements.md`, not by eye | — |
| c2 | Four `<li>` asserted as a full **ordered array**, scoped to `[data-testid="use-level-guidance"] li` | Swapped bullets 2/3 → red **on order**, not merely presence; reverted → green |
| c3 | Both links carry exact URL, `target="_blank"`, `rel="noopener noreferrer"`, discernible text | Stripped `rel` → red (`Received: null`); reverted → green |
| c4 | P1 and P2 byte-exact, including P1's `‘Evidence’` (U+2018/U+2019, emitted `&lsquo;`/`&rsquo;`) and P2's verbatim `current development/ maturity stage` spacing — **kept on purpose per proposal D-3**, not a typo | — |
| c5 | 5 tests, each `toHaveBeenCalledWith(['/result','1','evidence'], { queryParams: … })` — **both arguments together**. Cases: version+results-center, from=home, from dropped (non-whitelisted), version dropped. One test shows `toHaveBeenCalled()` passing and then requires the two-argument form, making KZ-001 rec. 4 explicit in the suite | Removed `{ queryParams }` from the navigate call → **all 5** red; reverted → green |
| c6 | All three blocks present at level `null`, `0`, `9`, and with `isEditableStatus()` false | Wrapped the evidence callout in `@if (showJustification())` → 4 red at `null`/`0`/non-editable **while level 9 stayed green** — the check discriminating exactly at its boundary rather than passing by accident. Reviewer additionally confirmed the component uses **default** change detection, without which the non-editable test would have passed vacuously |
| c7 | `git diff -U0` shows no `+`/`-` line touching `showJustification` / `justificationMissing` / `justificationWhitespaceOnly`. The new blocks are **siblings** of the `@if` branch | Structurally confirmed by c6's falsifying input |
| c8 | `grep -nE '#[0-9a-fA-F]{3,8}'` → **exit 1 on each of the three Scope paths, named individually** (KZ-005: the file set is a bounded axis) | Injected a hex const → exit 0 with the hit reported; reverted → exit 1. **And it caught 5 real, unintentional violations** in the Implementer's own first-draft spec file (WCAG math + explanatory comments) before they shipped — rewritten to decimal RGB triples. A gate that found something is a gate |
| c9 | **Full** `npm test -- --silent`, unfiltered → **316 suites / 6720 tests green.** Implementer ran it twice; **Leader re-ran it independently in a quiet tree** (no worker active) → identical. Coverage **98.19 / 96.30 / 97.76 / 98.49** vs floors 40/20/45/30. Baseline moved 312/6510 → 316/6720 because the two `innovation-use-*` bugfix specs landed after T-13's measurement | Targeted runs are recorded as **inconclusive**, never as a pass (KZ-003) |
| c10 | `git diff --exit-code` clean **per path** on `innovation-details.component.spec.ts`, `actor-item.component.spec.ts`, `organization-item.component.spec.ts` (R-IUP-019 AC.2) | — |
| c11 | Leader probe above | — |
| c12 | **Cascade resolved, not assumed:** `grep 'class="[^"]*description'` over the page template returns **nothing** — no `.description` exists in this file, so neither trap can reach the new nodes, and the explicit `text-[var(--ac-grey-800)]` / `text-[var(--ac-light-blue-400)]` utilities are what render. Asserted per element via `.closest('.description') === null` plus a per-role `className` check. Computed ratios: grey-800/grey-100 **7.44:1**, light-blue-400/grey-100 **6.35:1**, grey-800/white-1 **8.00:1**, light-blue-400/white-1 **6.83:1** — all ≥ 4.5:1, light theme (DD-14) | Swapped grey-800 → grey-600 on all four bullets → red on the "which selector won" class assertion; a pure-function test independently recomputes grey-600/grey-100 as **2.91:1** and fails the threshold. Reverted → green |
| c13 | `git diff --stat`: html `+66/-1`, ts `+42`, spec `+352/-2` = **457 insertions / 3 deletions**, 3 files | Reported, **not absorbed** — see the tripwire below |

**Also verified, beyond the criteria:** `npm run lint -- --quiet` → `All files pass linting.`, with `git status` / `git diff --stat` byte-identical before and after **both** runs — so the `--fix` script mutated nothing, which is what its Disqualifier demands of a script that is a fixer and not a gate. `npm run build` → exit 0, all warnings pre-existing on unrelated components. `npx tsc -p tsconfig.spec.json --noEmit` → 934 project-wide errors against the documented ~945 baseline, **zero in the three T-14 files**.

#### Reviewer verdict — `STATUS: PASS`

> All 13 exact-string, token, cascade, navigation, unconditional-rendering, scope, and hex-literal criteria for T-14 verify against `requirements.md` R-IUP-020/R-IUP-021, `design.md` §5.8 / DD-15–DD-17, and the stylesheets as they actually are. Both declared judgment calls are acceptable.

The Reviewer verified independently rather than on report: programmatic string equality for all six copy constants; every DD-17 token resolved against `colors.scss`; the c8 grep re-run per path; the DD-16 contract compared line-by-line against `result-sidebar.component.ts` → `navigateTo()`; mock hygiene (`jest.clearAllMocks()` in both `beforeEach` and `afterEach`, so the shared `router.navigate` spy cannot carry a stale matching call); **no page-wide `textContent` search anywhere in the new tests** — the named Disqualifier; and every new `rs-*` / `fs-*` utility confirmed to exist in `responsive-size.scss`, so no class is inert. It also confirmed the old label string `Level of use of this innovation` has **zero** remaining repo-wide references, which is why §11.2's reversion challenge held: nothing asserted it.

**Both Implementer judgment calls ruled acceptable:** the 2-line `activatedRouteMock` type widening is in-scope (same file the Scope names, caused solely by this task's own `c5` additions, a type annotation with zero runtime effect, and c10's three protected files untouched); and reporting the `design.md` §5.8 file-location error as a **finding rather than a fix** was correct — an Implementer silently editing an approved spec document would put a spec amendment inside a copy task's gate.

#### `ADVISORY` — 4R lens findings, recorded and closed here

Per Document Control's advisory policy and `/akili-execute` §2.4, these **never gate, never consume a rework attempt, and never mint or widen a task in this spec.** They are recorded and they die here. Any that deserves action needs its own proposal.

| Lens | Finding |
| --- | --- |
| **Reliability** | The five `c5` tests restore `activatedRouteMock.snapshot.queryParamMap.get` on the **last statement** of each `it`, not in `afterEach`. **Reviewer marked this reachable and constructed it:** if `goToEvidence()` ever drops `version`, test 1's assertion throws *before* its restore line, permanently leaving `get` returning stale values for every later test in the file — and because the mock is module-level and shared with the second `describe`, the pre-existing Back/Next specs then fail spuriously and **bury the one real red**. Remedy: hoist the restore into an `afterEach` inside the `c5` describe. **The most actionable advisory of the six** — carried to the user's decision, not actioned here |
| **Readability** | Four "falsifying input" tests restate the assertion immediately above them. They do discriminate (none is tautological), but the Falsifying-inputs table asks for a red *observed during development*, which was separately done against real code mutations — so committing the restatements duplicates coverage without adding a distinct gate |
| **Readability** | `{{ ' ' }}` as bullet 4's label/link separator is an unusual idiom; `&ngsp;` states the intent more plainly |
| **Resilience** | The copied contract omits the sidebar's explicit `replaceUrl: false`. Behavior is identical today (it is Angular's default), but DD-16's own commitment is that "the duplication is named, not hidden" — carrying the option across would make a future sidebar policy change a visible diff at both call sites |
| **Readability** | The definitions-link paragraph's own body text is the one new text node verified only by reading markup; it is not among c12's four named roles, so no criterion is unmet |
| **Risk** | `Click here` / `Click here to go there` are non-descriptive accessible names. AC.4 is satisfied as written (discernible, not icon-only, not a bare URL) and both strings are **user-ruled verbatim copy**, so this is not actionable here — noted only so that if `T-13`'s human a11y pass objects, `aria-label` is the remedy that touches neither the approved copy nor a token |

#### ⚠️ Budget tripwire — breached at T-14, escalated not absorbed

| Dimension | §12 *Amendment 01 delta* | T-14 actual | Verdict |
| --- | --- | --- | --- |
| Template + TS | ~45 | **108** | ~2.4× |
| Spec | ~150–215 | **352** | ~1.6–2.3× |
| **Total** | **+180 … +260** | **+457 / −3** | ⚠️ **~1.8–2.5× over** |
| Review rounds | +2 … +3 | **1** | ✅ under |

**Cause named, and it is the Leader's:** the `tdd` assignment above turned each of the six falsifying inputs into a **permanent regression test** rather than a one-off manual break-and-revert, and c12's per-selector cascade assertions across two backgrounds carry real weight. This is bought coverage, not scope creep — the Implementer explicitly declined to trim coverage to fit the number and flagged it instead, which is the correct behavior. **Escalated to the user at the Step 5 gate.** Review rounds moved in the opposite direction (1 against +2…+3 budgeted), as they have all run.

This sits **on top of** the pre-existing spec-wide overrun the user has already ruled on twice with full information. `T-13 c10` owns the reconciliation and now reconciles against **14 tasks · ~3,400 / ~4,800 · ~31 rounds**.

#### Leader corrections to the spec, from findings this task surfaced

| Correction | Basis |
| --- | --- |
| `design.md` §5.8 attributed **both** `.description` cascade traps to `custom-fields.scss`. The link-repaint rule `.description a { color: #2e2e2e }` actually lives in `client/research-indicators/src/styles/styles.scss:193–199` (nested SCSS); `custom-fields.scss:99–101` carries only `.description { color: #777c83 }` | Found by the Implementer, **verified inline by the Leader against both files before writing** (KZ-007: a correction record is the highest-risk artifact class — verify against the source, do not relay), and independently re-confirmed by the Reviewer. A wrong citation inside a *trap warning* is precisely the artifact that gets trusted while wrong |
| `tasks.md` Document Control `Task count` read **13**, and §9's done definition read `All 13 T-NN tasks` — both stale the moment Amendment 01 added `T-14`, and both contradicted `design.md` §12, which the same amendment updated to **14** | Amendment 01's own correction closure, incomplete at the specify pass. This is **KZ-005**, the branch's highest-recurrence lesson (6): a correction applied at its cited sites and missed elsewhere. Swept in **both directions** across the spec folder |

**Reported, deliberately NOT fixed:** `tasks.md` §9's human-visual line still reads *"in both themes"*, which **DD-14** (2026-08-21) superseded — dark mode is unreachable by any user, so the gate is **light theme only**, as `requirements.md` §9 row D7 and §12 already record. Left in place because documentation-hygiene rows in this spec are the user's explicit **Phase-2** scope decision (`judgment.md` `I-2`/`I-3`/`I-5`); folding an unrelated doc fix into a copy task's commit is what that decision exists to prevent. Flagged for `/akili-validate` or the archive sweep.

#### What this task's evidence still does not prove

`c1`–`c4`, `c6` and `c8` are **presence assertions on an unrendered tree**: they prove the strings and attributes exist in the DOM jsdom builds, and nothing about where the blocks sit visually, whether the three callouts read as one family, whether the two new links are distinguishable from body text, or focus order through them. `c12` is arithmetic over token values and asserted class names — jsdom paints nothing. Those are defect classes **D7**/**D8**, have **no** automated gate, and remain routed to `T-13` c7/c8/c9 as **AR-2**. `c5` proves the mocked `Router` receives the right two arguments; it does not prove the real Router resolves them or that the Evidence page consumes them (**AR-1**).


#### User rulings at the T-14 gate — 2026-08-26

| Ruling | Decision | Consequence |
| --- | --- | --- |
| **Budget tripwire (c13)** — +457 against §12's *Amendment 01 delta* band of +180…+260 | ✅ **Accepted as bought coverage.** Third ruling on this spec's overrun, made with the delta and the cause in hand | The breach is **recorded, not reconciled here.** `T-13 c10` reconciles the total against **14 tasks · ~3,400 written / ~4,800 re-baseline · ~31 rounds**. Running actual after T-14: **5,646** (5,189 + 457), or **5,841** including RB-9's 195. **Do not re-escalate the *standing* overrun as if it were new** — escalate only a fresh per-task breach |
| **The reliability `ADVISORY`** (un-restored shared mock in the `c5` tests) | ✅ **Actioned as a follow-up commit**, outside T-14's closed gate | Executed below. This is the sanctioned route for an advisory: recorded, then promoted **only by explicit user decision** — it did **not** widen T-14, mint a task, or reopen the gate (`/akili-execute` §2.4) |
| **Next step** | ⏸️ **Pause.** `T-13`'s four remaining criteria are human-owed and need a browser | No further task dispatched. `/akili-resume` rebuilds from this log |

#### Follow-up commit — advisory fix, and the advisory was PARTLY FALSIFIED in the doing

**Change:** in the `c5 — evidence navigation` describe, the per-test `const original = …` / trailing-restore pairs were replaced by a `beforeEach` capture + `afterEach` unconditional restore of `activatedRouteMock.snapshot.queryParamMap.get`. One file, no assertion text touched.

**The Reviewer's stated failure scenario did not reproduce, and this is recorded rather than quietly accepted.** The advisory claimed that on a `goToEvidence()` regression *"the pre-existing Back/Next specs then fail spuriously and bury the one real red."* The Implementer tested that claim instead of assuming it:

- Reverting to the pre-fix pattern and breaking `version` forwarding reddened **2 of the 5** `c5` tests as designed — but the named Back/Next specs (`c14`) stayed **green**. They are declared **earlier in the file** than the T-14 block, and Jest runs tests in declaration order with no sequencer or randomization configured, so they had already passed before the poisoning test ran. **The cascade as worded is unreachable in this file's current layout.**
- The **underlying mechanism is real**, and was demonstrated directly rather than argued: a temporary probe test declared *after* the `c5` block asserted the fixture default `'v1'` and **failed pre-fix**, reading the leaked stub; with the `afterEach` in place the same probe **passed** while only the two genuine `c5` failures remained. Probe and deliberate break both reverted, `git diff` confirmed empty on the `.ts`.

**Verdict:** the fix is **not cosmetic** — it closes a live forward-leak hazard for any test declared after that block, including ones not yet written. But today's Back/Next specs were safe **by position, not by design**, so the advisory's severity was overstated by one step. Recorded because an auditor's *"I constructed it"* is itself a claim (**KZ-007**: a correction record is the highest-risk artifact class, and this one came from the auditor), and because **KZ-014** binds the argument as tightly as the command — a reachability verdict that has not been executed may not be asserted. It was executed, and it was half wrong.

**Verification (Leader-verified inline, not on report):** diff inspected — only the one spec file modified; all five two-argument `toHaveBeenCalledWith(['/result','1','evidence'], { queryParams: … })` assertions **byte-identical**, and the deliberate weak-then-strict pair intact (the `toHaveBeenCalledWith` count moves 19 → 20 solely because the new explanatory comment quotes the phrase in prose — confirmed in the diff, not inferred). `toHaveBeenCalled()` count unchanged at 13. Hex literals: **0**. **Full `npm test -- --silent` re-run by the Leader in a quiet tree → 316 suites / 6720 tests green**, coverage 98.19 / 96.30 / 97.76 / 98.49. Lint clean, `git status` re-inspected after.

**Delegation note, recorded because it deviates from the triad and from what the user was told at the gate:** this follow-up ran through **one Implementer with no separate Reviewer.** The remedy was specified verbatim by the Reviewer's own advisory, so a second full audit would have re-derived its own recommendation; the Leader verified the diff and re-measured the suite inline instead. That is verification of **someone else's** work, not self-verification, so the Delegation Ceiling's ban is not engaged — but it is a narrower gate than a spec task gets, and it is on the record as such. The specific risk it was aimed at — a "cleanup" quietly weakening the KZ-001 rec-4 two-argument assertions — was checked directly and did not occur.


---

## ⛔ Pivot Record: DD-16 — the copied "contract" included an id source that is invalid at this component's depth

**Date:** 2026-08-26 · **Trigger:** user-reported defect at the `T-13` human gate — *"(Click here to go there) no funciona, al dar click debería llevarme a la sección de evidencias"* · **Severity:** shipped defect, `T-14` / commit `e508eeea`, **through a green suite and a Reviewer PASS**

### What was discovered

`goToEvidence()` read `this.route.snapshot.paramMap.get('id')` and navigated to **`/result/null/evidence`**.

Four premises, each verified independently by the Leader and then again by the Reviewer:

| Premise | Evidence |
| --- | --- |
| `paramsInheritanceStrategy` is never configured | `app.config.ts:24` is `provideRouter(routes, withViewTransitions())`; the symbol appears **nowhere** in `client/research-indicators/src` outside the two files under audit. Angular's default `'emptyOnly'` therefore applies, and a child route does **not** inherit its parent's params |
| `:id` is on the **parent** route | `app.routes.ts` — `result/:id` at the parent level, `innovation-use-details` inside its `children` array |
| The sidebar reads it successfully because it sits **at** that route | `result.component.html:2` — `<app-result-sidebar>` is a **sibling** of the `<router-outlet>` on line 4, i.e. declared at `result/:id`, not below it |
| Only `id` broke; the query params were always fine | `queryParamMap` is global to the URL and depth-independent — the harness confirms `version` / `from` resolving correctly in the same failing test |

### Why this is a Pivot and not a rework attempt

**The design decision, followed exactly, produces the defect.** `DD-16` instructed copying `ResultSidebarComponent.navigateTo()`'s *contract*; the Implementer read that as including its **id source**, which is a defensible reading of the words as written. Patching only the line would leave `DD-16` intact and the next implementer would reintroduce it from the same instruction.

**And it explains the review escape, which is the more important lesson.** The `T-14` Reviewer compared the two call sites line-by-line and correctly reported them **identical** — that is in its recorded verdict. Identity was the wrong test: **identical code at a different route-tree depth behaves differently.** No amount of care at that comparison would have caught it, because the comparison itself was the blind spot.

**Two mitigations that were in force and did not fire**, recorded because their failure is the actionable part:

- **R-IUP-021 AC.4** demanded the assertion be made "on the **built commands and query params**, not on the fact that a navigation happened" — and it *was*. The assertion form was right; the **double** was wrong. `activatedRouteMock.snapshot.paramMap.get('id')` returned `'1'`, a value production never produces at this depth. This is **KZ-001** at **recurrence 5**, and it is the sharpest instance yet: *a correctly-formed two-argument assertion over an unfaithful double is still a green suite over broken behavior.* AC.4's wording closes the assertion-shape hole and says nothing about fixture fidelity.
- The proposal's own risk row **RK-A1** named this risk and offered exactly that assertion as the mitigation (`proposal-amendment-01-level-guidance.md:217`). The mitigation was implemented as written and the risk still landed. Left unedited — a proposal is a point-in-time record — but noted here so the row is not read as having worked.

### Documents corrected

| Document | Correction |
| --- | --- |
| `design.md` **DD-16** | Amended in place with a ⚠️ block: the **id source is NOT part of the copied contract**; use `cache.currentResultId()`, never `getCurrentNumericResultId()` / `getCurrentPlatformCode()` (both truncate a platform-coded id); what *is* copied is the commands shape and the `version`/`from` rules. The tree-depth mechanism and the review-escape reason are stated inline, so the instruction cannot be re-read the old way |
| `requirements.md` R-IUP-021 | **Not changed, deliberately.** Its Navigation line scopes the sidebar comparison to *"the `version` and `from` query parameters"* only — it never specified the id source, so it was not wrong. AC.3/AC.4 describe the destination and the assertion form, both unchanged by this fix |

**Two-direction sweep run** (`/akili-specify` → *Correction Closure*): grepped `paramMap`, `navigateTo()` and *"the sidebar's own navigation"* across the whole spec folder. One further hit, `proposal-amendment-01-level-guidance.md:110`, left unchanged as a historical record per the rule above.

### PV-T14-1 — the fix: ✅ PASS

| Field | Value |
| --- | --- |
| **Status** | ✅ **PASS** — Reviewer verdict, **attempt 1**, four advisories, no FAIL |
| **Authorized by** | User bug report at the human gate. Recorded as a **non-task change** on the `RB-9` / `PV-T13-1` precedent — it does not reopen `T-14`'s closed gate |
| **Effort / skills** | `high` · **`systematic-debugging`**, `angular-developer` |
| **Triad** | Implementer (T2 · sonnet) → Reviewer (T3 · opus). `author ≠ auditor` on both axes — **not collapsed despite a one-line production diff**, and the reason is on the record: the previous full gate is what let this through |

**The change.** `innovation-use-details.component.ts` → `goToEvidence()`: `route.snapshot.paramMap.get('id')` → `cache.currentResultId()`. **One production line**, plus a comment block documenting the tree-depth trap so the fix carries its own reason. **+135/−7** and **+17/−1** across two files. Destination shape, `version`/`from` forwarding and the `Router.navigate` (never an `href`) are byte-for-byte unchanged — only the id *source* moved.

**A second defect was averted by user information mid-flight, and it would not have been caught by any test in the suite.** The user reported that the id is often **platform-coded** (`STAR-13232`), not a bare number. The Leader corrected the dispatch immediately: `cache.getCurrentNumericResultId()` — the obvious-looking accessor sitting right next to the correct one — runs `extractNumericId()` and returns only the numeric tail, which would have navigated to `/result/13232/evidence`, a URL form no other page in the app emits, and **might have appeared to work**. Critically, **all five pre-existing `c5` cases use `'1'`, a bare numeric, so the entire suite was blind to a prefix-dropping bug.** A `STAR-13232` case and its falsifier were added on that basis. *Recorded because it is the same failure as the one being fixed — a fixture that does not represent production — caught the second time by a human, not by the tier.*

**Both reds observed, not argued** (K-004 / KZ-014):

| Red | Observed |
| --- | --- |
| The defect itself, against unfixed code | `expected "STAR-13232"` / `received null` in the id position; same `null` for a bare-numeric id. A structural test confirms `paramMap.get('id')` is `null` at this depth while `queryParamMap` resolves correctly, isolating the cause |
| The prefix falsifier | Reverting the fix with the new tests present → **8 failures** (all 5 original `c5` + the platform-coded case + both route-tree tests) |

**The test tier was repaired, which is half the fix.** The flat `activatedRouteMock` was replaced for the id-source assertions by a real `provideRouter` + `RouterTestingHarness` parent→child tree with a genuine `<router-outlet>` (`RouterTestingHarness` was already in use in two other client specs — no new dependency). All five original `c5` assertions survive as full two-argument `toHaveBeenCalledWith`, and the deliberate weak-then-strict pair is intact. The Reviewer ruled the `'1'` → `1` expectation change **honest alignment, not weakening**: `toHaveBeenCalledWith` uses strict recursive equality, and `CacheServiceMock.currentResultId` has returned the number `1` since T-07.

**Verification.** `npm test -- --silent` full unfiltered → **316 suites / 6724 tests green** (6720 baseline + 4 new), **re-measured independently by the Leader in a quiet tree**. Coverage 98.19 / 96.30 / 97.76 / 98.49 vs floors 40/20/45/30. `npm run lint -- --quiet` → `All files pass linting.`, `git status` re-inspected after. Hex: **0** on both files. `git diff --exit-code` clean on the three protected Innovation Development specs.

**What the Reviewer established beyond confirming the Leader** — it did not stop at agreement:

1. **The composition seam is covered on both sides.** The route-tree block substitutes `CacheServiceMock`, so it proves *depth* and *id source* but not that the real `CacheService` receives the route id. That other half is separately asserted at `result.component.spec.ts:192–194` (`params$.next({ id: 'STAR-456' })` → `setCurrentResultId('STAR-456')`) plus four `getCurrentResultIdentifier` cases. Same seam asserted from each side — which is what makes the pair of test suites add up to a claim about production.
2. **It attempted the degenerate case rather than reasoning about it.** `currentResultId` initializes to `signal(0)`, so a child activating before the parent's effect would navigate to `/result/0/evidence`. It tried to construct that via `/result/abc/innovation-use-details` and **could not reach the child**: `resultExistsResolver` runs on `result/:id`, computes `Number('abc') = NaN`, and redirects to `/results-center` before the child activates. **Reachability verdict: unreachable via the router** — recorded so the premise is on file if that resolver is ever relaxed.
3. It checked the harder race (client-side `:id` change with `ResultComponent` reused): `routeParams` is `toSignal(route.params)`, so the effect re-fires and flushes before the child's DOM is clickable — same risk profile as the already-shipped `navigateTo()`.

#### `ADVISORY` — recorded, not actioned

| Lens | Finding |
| --- | --- |
| **Reliability** | `CacheServiceMock.currentResultId` returns the **number** `1`, but production for `/result/1/…` yields the **string** `'1'` (`getCurrentResultIdentifier` returns the raw param). Harmless — both serialize to the same URL — and pre-existing since T-07, but the double is one notch off production's type. Prefer `'1'` if that mock is ever touched |
| **Readability** | The structural test asserting `paramMap.get('id')` → `toBeNull()` pins a **framework default**, not product behavior. A future, legitimate app-wide `paramsInheritanceStrategy: 'always'` would fail it even though `goToEvidence()` stays correct. Worth a one-line note marking it a characterization test, so the next maintainer updates rather than reverts it |
| **Readability** | The new production comment says `currentResultId` "is set once" by `ResultComponent`'s effect; it is set on **every** `:id` change. Loose rather than wrong — but this comment's entire job is to prevent reintroduction, so its precision is load-bearing |
| **Risk** | The `signal(0)` premise above — unreachable today, on file in case `resultExistsResolver` is relaxed |

### Cross-spec finding — reported, NOT fixed, and it needs its own bugfix spec

**`pool-funding-alignment.component.ts:379–384` carries the identical defect class, and is worse because it fails silently rather than visibly.**

```ts
const routeId = this.route.snapshot.paramMap.get('id');
if (routeId) return routeId;                                  // dead branch in production
const numeric = this.cache.getCurrentNumericResultId();
return numeric ? String(numeric) : '';                        // the only path ever taken
```

It sits at the **same tree depth**, so `routeId` is **always `null`**: the primary branch is dead code and every call falls through to a numeric-only fallback that **strips the platform prefix** (`TIP-1234` → `'1234'`). Consequences traced by the Implementer, not assumed:

- `isPoolFundingCapable()` / `platformFromResultCode()` (via `bilateralService.getAlignment`, line 434) always receive a bare-numeric code and, under the `numeric ⟺ STAR` invariant (**KZ-012**), always classify it as STAR-capable — a **non-STAR result reached by direct URL is misclassified**
- the eligibility redirect at line 440 (`router.navigate(['/result', resultCode, …])`) **drops the platform prefix from the URL**
- the websocket filter at line 462 compares `evt.result_code === this.resultCode()`, where `resultCode()` never carries a prefix — a possible silent no-op on the live-update path if the server's `result_code` is prefixed

**Containment:** `ResultSidebarComponent` gates the tab with `cache.isExternalResult()`, computed correctly and unaffected, so the tab is **not reachable by normal UI navigation** for non-STAR results. **No route guard blocks direct URL entry**, so the path is reachable, just not advertised.

**Its own spec exhibits the same KZ-001 pattern:** `pool-funding-alignment.component.spec.ts:188` uses a flat route mock returning `'RES-001'` — a value production never produces — while line 202 documents the numeric fallback as an *edge case* when it is in fact the **only** path ever taken. So that suite is green over the same defect, by the same mechanism, in a second feature.

**Not fixed here, and not minted as a task in this spec** (`/akili-execute` §2.4): different page, different module, different spec, and an app-wide id-source question deserves its own gate rather than riding a copy amendment's. **Escalated to the user for its own bugfix spec.** Strong candidate to be scoped as *"audit every `route.snapshot.paramMap.get('id')` in `pages/platform/pages/result/pages/`"* rather than as one file's bug — there are exactly two call sites today, and this record is the reason to check for a third.

