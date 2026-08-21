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
| **Running total** | **282** | **477** | **3** | Against §12's ~3,200 LOC / ~28 rounds. **No tripwire breach** — 14.9% of the LOC budget and 10.7% of the review rounds spent on 2 of 13 tasks (15.4%). Both tasks ran over their §6 split line for the same reason: the **spec tier** is consistently larger than the derivation assumed, while implementation lines track it closely. If that pattern holds, §12's ~1,500-line spec estimate is the figure that will drift, not the implementation line |

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
