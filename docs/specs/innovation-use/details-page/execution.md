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
| **Running total** | **210** | **344** | **1** | Against §12's ~3,200 LOC / ~28 rounds. **No tripwire breach** — 10.8% of the LOC budget spent on 1 of 13 tasks (7.7%) |

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
