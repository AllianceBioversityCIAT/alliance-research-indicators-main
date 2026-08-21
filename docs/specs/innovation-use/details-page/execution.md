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
| Budget authority | [`design.md`](./design.md) §12 — 13 tasks · ~3,200 LOC · ~28 review rounds. `tasks.md` §6 is a *derivation*, not a second budget |
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
| **Running total** | **1,962** | **2,442** | **10** | Against §12's ~3,200 LOC / ~28 rounds. **No tripwire breach** — 17.7% of §12's ~3,200 LOC and 14.3% of its ~28 review rounds, spent on 3 of 13 tasks (23.1%). **Now tracking ahead of budget, not behind.** The T-01/T-02 overrun pattern (spec tier larger than derived) did **not** hold for T-03, which came in 80 lines under because a `git mv` carries code without authoring it. Cumulative variance is **+178 lines on a 752-line derivation (+23.7%)**, and the cause is now consistent enough to name: **every task whose deliverable includes new spec files over-runs, and the over-run is entirely in the spec tier** (T-01 +134, T-02 +61, T-04 +63; T-03, a move, came in 80 **under**). Implementation lines track the derivation closely. **Projection: §12's ~1,500-line spec estimate is the figure that will drift, not its ~1,700 implementation line.** The trend is now confirmed across five tasks at **+18.8% cumulative** (1,618 actual vs 1,362 derived), and it has *narrowed* from +23.7% because T-05's over-run was proportionally smaller. **Every task shipping new spec files over-runs, always in the spec tier; the one move task came in under.** Implementation lines track the derivation closely. **Projection: §12's ~1,500-line spec estimate is what drifts, not its ~1,700 implementation line — a ~3,800 total.** No tripwire *breach*: §12 gates the total and T-13 c10 owns reconciliation. Review rounds are the healthier number — **8 used against ~28 budgeted for 5 of 13 tasks**, i.e. tracking *under*. Re-assess at **T-07**, the largest task |

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
