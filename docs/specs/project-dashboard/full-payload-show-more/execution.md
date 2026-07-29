# Execution Log — Project Dashboard / Full-payload migration + Show-more + title alignment

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `project-dashboard/full-payload-show-more` |
| **Spec id** | 2026-07-full-payload-show-more |
| **Module** | project-dashboard (STAR client) |
| **Owner** | d.casanas@cgiar.org |
| **Branch** | `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` |
| **Linked docs** | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) · [`tasks.md`](./tasks.md) · [`judgment.md`](./judgment.md) |
| **Budget (tripwire)** | 8 tasks · ≈1,600 changed LOC · 2 Implementer→Reviewer rework rounds |
| **Rework ceiling** | 3 attempts per task |
| **Execution started** | 2026-07-29 |

### Triad configuration

| Role | Agent | Tier |
| --- | --- | --- |
| Leader (orchestrator, writes no production code) | this session | T1 |
| Implementer | `akili-implementer` | T2 (`sonnet`) |
| Reviewer | `akili-reviewer` | T3 (`opus`) — author ≠ auditor enforced by wrapper binding |

### Standing notes carried into every task

- **RB-1 (from `tasks.md` §7):** the spec's round-4 fix pass was never independently reviewed. The first Reviewer pass in this run is treated as that missing audit, with particular weight on T-06 (AC.6/AC.7 + DD-13).
- **RB-2:** NFR-PDB-004 has no automated gate. The five-step human check in `requirements.md` §7 is the only gate. If it is skipped, NFR-PDB-004 is reported **unverified**, never **passed**.
- **KZ-001 / KZ-003** (active Kaizen lessons, branch `dev`) are copied into every Implementer brief whose task touches a test double or a deletion sweep.
- **Task ordering deviation:** `tasks.md` §2 marks T-01 and T-02 parallelisable. This run executes them **sequentially**. Reason: a shared working tree makes per-task diff attribution fragile, two concurrent client test runs contend for the Karma port, and T-04 consumes T-01's fixture regardless. Sequencing also keeps commits aligned with the PR-1 / PR-2 boundary in `tasks.md` §6.

---

## 2. Task Execution History

<!-- One `### <Task ID> — <title>` entry per task, appended on PASS or HALT. -->

### T-01 — Client data layer: interface, api method, service, shared fixture

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** |
| **Date** | 2026-07-29 |
| **Implementer attempts** | 1 |
| **Requirements covered** | R-PDB-001 (AC.1, AC.3, AC.4), R-PDB-005 (AC.3 — identity field made available), NFR-PDB-001 |
| **Defect classes gated** | DC-1, DC-2 |
| **Changed LOC** | 448 insertions, 0 deletions (design §13 estimate for these rows: ~448) |
| **PR** | 1 of 4 (`tasks.md` §6) — no user-visible change |

#### Attempt 1

**Files changed**

New:
- `client/research-indicators/src/app/shared/interfaces/contract-full-reports.interface.ts` (102) — mirror of all seven `ContractFullReportsDto` sections, `geo_scope` included
- `client/research-indicators/src/app/shared/services/get-full-contract-reports.service.ts` (66) — plain `@Injectable()`, one `payload` signal + six `computed` accessors
- `client/research-indicators/src/app/shared/services/get-full-contract-reports.service.spec.ts` (151) — `HttpTestingController` against the real `ApiService`
- `client/research-indicators/src/app/testing/contract-full-reports.mock.ts` (105) — the shared fixture

Modified:
- `client/research-indicators/src/app/shared/services/api.service.ts` (+8) — `GET_FullContractReports`, no `useResultInterceptor`
- `client/research-indicators/src/app/shared/services/api.service.spec.ts` (+15) — plain and encoded cases
- `client/research-indicators/src/app/shared/interfaces/project-dashboard.interface.ts` (+1) — `ProjectDashboardRankedItem.user_id?: string`

**Implementer verification**

| Command | Result |
| --- | --- |
| `npm run lint` (from `client/research-indicators/`) | clean |
| `npx jest --testPathPattern "get-full-contract-reports.service.spec.ts\|api\.service\.spec\.ts$" --coverage=false` | 3 suites, 238 tests passed |
| Consumer-scoped regression pass (`get-top-*`, `get-geo-scope`, `project-dashboard`, `geo-scope-card`) | 12 suites, 320 tests passed |

`jest.config.ts` sets `collectCoverage: true` globally, so any path-scoped run fails the *global* coverage thresholds by construction. Coverage is T-08's gate (NFR-PDB-005), not T-01's; not treated as a failure here.

**Reviewer verdict — `STATUS: PASS`**

> T-01 conforms on all eleven gates — the interface is an exact mirror of all seven server DTOs, DD-2r/DD-9/DD-12 are honored, the `HttpTestingController` evidence is real rather than decorative, the fixture carries all four invariants that arm T-04 and T-07, and nothing outside the declared file scope moved. All three Implementer assumptions verified true at source, including the load-bearing `ToPromiseService` claim.

The Reviewer re-ran `npm run lint` and both specs independently rather than accepting the Implementer's report, and verified the interface field-by-field against the seven server DTOs rather than against the Implementer's summary.

#### Decisions made

| # | Decision | Basis |
| --- | --- | --- |
| E-01.1 | The failure branch keys on `response.successfulRequest` rather than copying the four `GetTop*Service`s' catch-only pattern | **Verified at source by the Reviewer.** `to-promise.service.ts` uses `catchError(error => [{ ...error, successfulRequest: false, … }])` — the handler returns an **array**, which RxJS coerces to an observable that emits and completes, so `firstValueFrom` **resolves** and never rejects. A catch-only `loadError` path is unreachable in production. Copying the retired pattern would have failed the T-01 AC. |
| E-01.2 | Per-section accessor names `topPartners` / `topPrimaryLevers` / `topMainContactPersons` / `topContributors` / `staff` / `geoScope` | Not a free choice — `design.md` §2 names `topPartners()` verbatim in the architecture diagram; the rest follow that convention. **T-05 must consume these names.** |
| E-01.3 | `ProjectDashboardRankedItem.user_id` is **optional** (`user_id?: string`) | That shape is shared across all four ranked sections and only contacts carry the field; the dedicated contact interface keeps it required. |
| E-01.4 | `GET_FullContractReports` takes no `limit` argument | Confirmed against `agresso-contract.controller.ts` — unlike the four `top-*` handlers above it, `getFullContractReports` declares only `@Query('contract-id')`. |

#### Issues encountered

None. No rework round consumed.

#### Finding of record — pre-existing defect in the code being retired (not actioned)

While adjudicating E-01.1 the Reviewer established that the four `GetTop*Service`s are catch-only, so on an HTTP failure they fall through to `response?.data?.top_partners` → `undefined` → `list.set([])` with `loadError` left **false**. **They render the *empty* state on a 500, never the error state with Try again.** This is a live defect in code T-08 deletes, and the new service does not reproduce it — R-PDB-001 AC.4 is therefore a genuine fix, not just a migration. Recorded because it explains why the new failure path looks different from the pattern it replaces.

#### ADVISORY findings (4R lens — non-gating, recorded and closed here)

Per `/akili-execute` §2.4 these never trigger rework and never become tasks in this spec.

| # | Lens | Finding |
| --- | --- | --- |
| A-01.1 | Reliability | Per-section computeds use `?? []`, covering `null`/`undefined` but not a non-array value. The retired services guarded with `Array.isArray(data) ? data : []`. T-05 will run `[...x].sort()` over these, which throws on a non-array. Low likelihood given the typed contract, but the guard was strictly stronger before. |
| A-01.2 | Resilience | No in-flight sequencing: overlapping `update()` calls (rapid double-click on **Try again**) resolve in completion order, not issue order. Shape-identical to the four services replaced, so no regression — but with one shared service the blast radius is now all four cards at once instead of one. |
| A-01.3 | Readability | `api.service.ts` imports via `@shared/interfaces/…` while the service and fixture use `@interfaces/…`. Both resolve; each file is locally consistent with its neighbours. Cosmetic. |
| A-01.4 | Observability | The 500-path test emits a real `console.error` stack from `ToPromiseService` into Jest output. Harmless and pre-existing, but makes a passing suite log look like a failure on casual inspection. |

#### Final verification

`npm run lint` clean; `get-full-contract-reports.service.spec.ts` 8/8; `api.service.spec.ts` 230/230 — all re-run independently by the Reviewer. Full-suite and coverage verification is deferred to T-08 by design (`tasks.md` §4).

---

### T-02 — Card: presentational contract + encoding pinned to the full list

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** |
| **Date** | 2026-07-29 |
| **Implementer attempts** | 1 |
| **Requirements covered** | R-PDB-002 (AC.1, AC.3, AC.5), R-PDB-003 (AC.1), R-PDB-004 (all) — all satisfied *by construction*; formally gated by T-04 |
| **Defect classes gated** | DC-6 (statically), DC-4 (statically) |
| **Changed LOC** | 39 insertions, 9 deletions across 2 files |
| **PR** | 2 of 4 (with T-03, T-04) — no user-visible change: the new input defaults to today's behaviour |

#### Attempt 1

**Files changed** — exactly the two in scope:
- `…/project-dashboard-card/project-dashboard-card.component.ts` (+30)
- `…/project-dashboard-card/project-dashboard-card.component.html` (+9 / −9)

`project-dashboard-card.component.spec.ts` untouched — T-04 owns it.

**What was added:** `export const COLLAPSED_ITEM_LIMIT = 5` (DD-7) · `visibleLimit = input<number | null>(null)` (DD-12) · `expandToggled = output<void>()` · `visibleItems` computed · `canExpand` computed.

**The encoding / structural split — independently re-derived by the Reviewer from the template, not accepted from the Implementer's table.** This split *is* T-02, so it is recorded in full:

| Expression | Location | Class | Reads |
| --- | --- | --- | --- |
| `@else if (items().length)` | `.html:32` | state gate | `items()` — unchanged |
| `[class.justify-center]="… <= 3"` | `.html:49` | **structural** | → `visibleItems()` |
| `grid-template-columns` condition + both `repeat(N, …)` | `.html:51-53` | **structural** | → `visibleItems()` |
| 5× `@for` (`columns`, `rows-partners`, `rows-stacked-lever`, `rows-stacked`, default) | `.html:55,74,93,124,141` | iteration | → `visibleItems()` |
| `maxCount`, `totalCount`, `fillPercent`, `barColor`, `partnerBarWidthPercent` | `.ts:78-125` | **encoding** | `items()` — unchanged |
| `index + 1` rank badges | `.html:99,129` | rank | `$index` over a prefix slice |

`grep` confirms **`.html:32` is the only surviving `items()` in the template**. Zero encoding members were repointed; all four `columns` structural bindings were switched. The central asymmetry holds in both directions, which is what makes R-PDB-004 and DC-6 true by construction rather than by test.

**Implementer verification**

| Command | Result |
| --- | --- |
| `npm run lint` (client) | clean |
| `npm run build` (`strictTemplates`) | succeeded; only pre-existing unrelated warnings |
| `npx jest … project-dashboard-card + geo-scope-card --coverage=false` | 2 suites, 12 tests passed |

**Reviewer verification** — re-ran all of the above independently, and **widened the blast radius** by adding the 848-line `project-dashboard.component.spec.ts`: **3 suites / 52 tests pass**.

**Reviewer verdict — `STATUS: PASS`**

> The encoding/structural split is exactly right in both directions — all five encoding members still read the full `items()` list while all four `columns` structural bindings and all five `@for` loops moved to `visibleItems()`, so R-PDB-004 and DC-6 are both satisfied by construction. `visibleLimit` defaults to `null` (DD-12), `COLLAPSED_ITEM_LIMIT` is exported (DD-7), scope is confined to the two card files with the T-04 spec untouched and the scratch spec genuinely deleted, and lint / build / three adjacent suites all pass cleanly on re-run.

R-PDB-002 AC.5 was verified **structurally, not by inspection**: `grep` for `visibleLimit|COLLAPSED_ITEM_LIMIT|expandToggled|visibleItems` outside the card returns nothing, so the geographic card's three `variant="list"` consumers bind no `visibleLimit` and cannot have changed.

#### Decisions made

| # | Decision | Basis |
| --- | --- | --- |
| E-02.1 | **All five** `@for` loops iterate `visibleItems()`, not just the `columns` branch | Adjudicated CORRECT. Design §5.2 and T-02's Description say "Templates iterate `visibleItems()`" with no layout qualification, and R-PDB-002 AC.1 is stated against the *chart*, not a layout. The two live layouts are `rows-partners` and `rows-stacked-lever` — neither is `columns` — so a `columns`-only slice would deliver nothing at all. RSK-2 exists to require the contract be layout-agnostic. |
| E-02.2 | The outer state gate `@else if (items().length)` (`.html:32`) stays on `items()` | Adjudicated CORRECT **and required**. Design §5.3's structural carve-out enumerates exactly `justify-center` and the two `grid-template-columns` expressions, and pointedly excludes the state gate. DD-3 / §6.2 pin T-03's toggle "inside the `@if (items().length)` arm (`:32-35`)" by naming that expression verbatim — rewriting it would desynchronise the spec's own anchor from the code T-03 must target. Behaviourally equivalent for every value T-06 passes (`5` or `null`). |
| E-02.3 | `toggleLabel` / `toggleAriaLabel` deferred to T-03 despite appearing in design §6.1's member table | Adjudicated legitimate deferral. §6.1 describes the card's end state across T-02+T-03, not T-02's slice. `toggleLabel` is defined as deriving "from `visibleLimit() === null`" — pure toggle caption — and T-03's notes explicitly claim the accessible-name work. Shipping them here would create two unreferenced computeds and put a11y wording in a task with no a11y acceptance check. |

#### Correction of record

The Implementer justified E-02.1 partly on rank-continuity for `rows-stacked-lever`'s `index + 1` badge. The Reviewer established that reasoning is **wrong without changing the verdict**: because the slice is a **prefix**, `$index` yields ranks 1…5 collapsed and 1…N expanded regardless of which list is iterated. What actually forces that loop onto `visibleItems()` is R-PDB-002 AC.1. Recorded so a later reader does not inherit the faulty rationale.

#### Issues encountered

None. No rework round consumed.

#### ADVISORY findings (4R lens — non-gating)

| # | Lens | Finding |
| --- | --- | --- |
| A-02.1 | Risk — **carried into T-04's brief as test-authoring guidance** | `rows-stacked-lever` rows carry `last:border-b-0 last:pb-0` (`.html:95`). Collapsed, row 5 is `:last-child` and renders no bottom border; expanded it gains one. **Not** an R-PDB-004 violation — the glossary scopes "chart encoding" to bar width and colour, and a divider is chrome — but it is a real rendered difference at rank 5 across a limit change. T-04 must assert **colour and width specifically**, as R-PDB-004 AC.1/AC.2 word it, not "row 5 renders identically", or the suite fails on the border and looks like an encoding regression. |
| A-02.2 | Resilience | `visibleItems` does not clamp a negative or zero `visibleLimit`. Nothing reachable passes either (T-06 passes `COLLAPSED_ITEM_LIMIT` or `null`), and design §5.2.3 specifies exactly `items().slice(0, visibleLimit()!)` — a clamp would be a deviation from spec, not an improvement. Recorded as a known property of the public input. |
| A-02.3 | Readability | Comment at `.ts:74-77` ("Encoding members below deliberately keep reading `items()`") spans a run that also contains `linkedResultsLabel`, which is not an encoding member. Reads as a stronger invariant than it states. Cosmetic. |
| A-02.4 | — | `canExpand` and `expandToggled` have no consumer until T-03. Correct per T-02's Description; PR 2 groups T-02/T-03/T-04 so nothing unreferenced reaches a reviewer in isolation. Noted so it is not mistaken for dead code mid-chain. |

**Disposition of A-02.1:** carried into the T-04 Implementer brief as guidance on how to word an assertion. This is not new scope — T-04 already owns the colour/width invariance assertions; the advisory only prevents it from writing one that fails for the wrong reason.

#### Final verification

`npm run lint` clean · `npm run build` succeeded (`strictTemplates` passes) · 3 suites / 52 tests pass including the untouched 848-line dashboard spec — all re-run by the Reviewer. Behavioural acceptance items are formally owed to **T-04**; they are statically true of this code but are not asserted in any surviving file yet.

---

### T-03 — Card: toggle, accessibility, bounded scroll container

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** (on attempt 2) |
| **Date** | 2026-07-29 |
| **Implementer attempts** | **2** — first rework round of this spec. Budget allows 2; **1 remaining.** |
| **Requirements covered** | R-PDB-002 AC.2, R-PDB-003 (AC.3, AC.5), NFR-PDB-003, **NFR-PDB-004 condition 1 — implemented, NOT verified** |
| **Defect classes gated** | DC-7 (statically). **DC-8 remains ungated — by design.** |
| **Changed LOC** | 22 insertions, 1 deletion across 2 files |
| **PR** | 2 of 4 (with T-02, T-04) |

#### Attempt 1 — Reviewer `STATUS: FAIL`

**Files changed:** `project-dashboard-card.component.html`, `.ts` — the complete task: toggle, `toggleLabel`/`toggleAriaLabel` computeds, bounded container, reduced-motion handling.

**Implementer verification:** `npm run lint` clean · `npm run build` succeeded · 3 suites / 52 tests passed · `npm run s-lint` showed 352 errors, verified byte-identical to baseline via `git stash`.

**Reviewer FAIL finding — full text preserved:**

> 1. **Discovered Issue:** `[class.pr-1.5]="visibleLimit() === null"` (`…project-dashboard-card.component.html:35`) **does not apply `pr-1.5`. It applies `pr-1`.** Angular's `createBoundElementProperty` splits the binding name on `.` and takes `parts[1]`, so `class.pr-1.5` → `['class', 'pr-1', '5']` → class name `pr-1`. I confirmed this at the emitted-instruction level with the repo's own compiler 19.1.6:
>
> ```
> ɵɵclassProp('pr-1', ctx.a)      ← from [class.pr-1.5]="a"
> ```
>
> No parse error, no lint error, no build error — it fails exactly the way the brief feared `max-h-[46vh]` might. The result is 4px of scrollbar clearance instead of the 6px the GATE-2 mockup specifies, and a template line that says one thing and does another. It is also a landmine for **T-04**, which is required to assert "the bounded container is present and conditioned": a tester reading this template will write `toContain('pr-1.5')` and get an inexplicable red.
>
>    *   **Violated Rule:** `mockup/index.html:74` — `.listwrap.bounded{max-height:46vh;overflow-y:auto;padding-right:6px}`, designated the layout contract by `tasks.md` §Visual reference and `requirements.md` §7. Also `design.md` §6.3.
>    *   **Remediation Suggestion:** Use a class name containing no `.`. `[class.pr-[6px]]` compiles to `ɵɵclassProp('pr-[6px]', …)` and is an exact match for the mockup's 6px. Do **not** attempt to escape the dot; Angular offers no escape for this split.

Everything else in attempt 1 passed audit: toggle placement, conditioning, a11y, reduced motion, the `46vh` bound, scope hygiene, and both judgement calls.

#### Attempt 2 — Reviewer `STATUS: PASS`

**Change:** one line. `.html:35` → `[class.pr-[6px]]="visibleLimit() === null"`.

**Verified two independent ways by the Reviewer**, because the failure mode of attempt 1 was precisely a binding that compiles clean while emitting the wrong name:

1. Hand-compiled the live template through the repo's own `@angular/compiler` 19.1.6 and walked the emitted AST — the only `pr-` string emitted anywhere is `pr-[6px]`.
2. Cross-checked the **real AOT production bundle** from `npm run build`: `Fa("max-h-[46vh]",…)("overflow-y-auto",…)("pr-[6px]",…)`. `grep -rE '\("pr-1"'` across all build output: zero hits.

**Rework containment confirmed:** `diff` of the attempt-1 and attempt-2 diffs differs on exactly two lines — the git blob hash and the one binding. No `.ts` delta. All five fenced-off advisories verified untouched, so no advisory was silently actioned as scope creep.

**Reviewer verification (re-run, not accepted on report):** `npm run lint` clean · `npm run build` succeeded, no `strictTemplates` errors · `npx jest --coverage=false src/app/pages/platform/pages/project-detail` → **5 suites / 98 tests passed**.

**Reviewer verdict — `STATUS: PASS`**

> The sole rejected issue is fixed and independently confirmed at emitted-instruction level in two ways — the repo's own `@angular/compiler` emits `ɵɵclassProp("pr-[6px]", …)`, and the real AOT production bundle contains the same call with zero `("pr-1"` classProp anywhere — matching the mockup's `padding-right:6px`. The rework is a one-token change with no `.ts` delta and no advisory silently actioned; lint, `strictTemplates` build, and the 5-suite/98-test project-detail run all pass at baseline.

#### Decisions made

| # | Decision | Basis |
| --- | --- | --- |
| E-03.1 | Bound value is `max-h-[46vh]`, taken verbatim from the GATE-2 mockup (`mockup/index.html:74`) | Closes **OQ-3** ("bound height: fixed or viewport-relative?") in favour of viewport-relative, as the design default anticipated. |
| E-03.2 | Angular class bindings in this codebase **must not contain a `.` in the class name** | Established by the attempt-1 defect. `[class.pr-1.5]` emits `pr-1` silently. Arbitrary values in square brackets (`max-h-[46vh]`, `pr-[6px]`) are safe because they contain no `.`. **This is a repo-wide trap, not a one-off.** |
| E-03.3 | `toggleLabel` shows no item count | Adjudicated conformant. `mockup/index.html:374` sets the **visible** text to exactly `'Show less' : 'Show more'`; the `— N more` suffix exists only in the mockup's `aria-label` at `:375-376`. NFR-PDB-003 requires only that the accessible name include the chart title. |
| E-03.4 | Hex literal `#1771b3` retained in the template despite root `CLAUDE.md` §4.2 ("No hex literals in component code") | **Adjudicated non-gating, with a doc obligation.** No `--ac-*` token carries this value — nearest are `--ac-light-blue-300: #1689ca` and `--ac-light-blue-400: #035ba9`, both different colours. `design.md` §6.4's factual premise holds: the value is already used 3× in `project-dashboard.component.html`. Satisfying §4.2 literally would require either changing the colour (an unapproved visual change; §6.4 says "No new tokens") or adding a global token plus `src/README.md` and `docs/ux-ui/design.md` §7 updates — all outside T-03's two-file fence. **See the open item below.** |

#### Issues encountered

One rework round, consumed by E-03.2. Root cause: a silent Angular template-compilation behaviour that produces no parse, lint or build error. Caught only because the Reviewer verified at the emitted-instruction level rather than trusting a green build.

#### ADVISORY findings (4R lens — non-gating)

| # | Lens | Finding |
| --- | --- | --- |
| A-03.1 | Reliability | `overflow-visible` stays static on `:33` while `overflow-y-auto` is added conditionally. Both single-class specificity, so the winner is Tailwind's canonical emit order, not template order. Works today but is decided by a stylesheet-ordering detail. Also: `overflow-x: visible` + `overflow-y: auto` promotes overflow-x to `auto` in CSS — a horizontal scrollbar is possible on long partner labels. **Worth a glance during the §7 human check.** |
| A-03.2 | — | `aria-label` drops the mockup's "— N more" count. Conformant (NFR-PDB-003 does not require it), but the count is genuinely useful to a screen-reader user and costs one interpolation. Optional. |
| A-03.3 | Risk | The `#1771b3` exception must be **recorded, not silently carried** — root `CLAUDE.md` §5. See the open item below. |
| A-03.4 | Readability | `variant() === 'card'` in the `@if` is redundant — the whole `<section>` already sits in the `@else` of `variant() === 'list'`. `tasks.md:109` pins the wording, so it stays. Noted so a future reader does not "clean it up" and lose the documented intent. |
| A-03.5 | — | Pre-existing `transition-[width]` / `transition-[height]` on the bars (`.html:73, 93, 158`) do not honour `motion-reduce`. Out of T-03's scope; worth a separate ticket. |
| A-03.6 | Risk — **app-wide, not a T-03 defect** | The toggle's static classes use the **v3-style leading-bang** important modifier (`!mt-3.5 !w-fit !text-[13px] !text-[#1771b3]`). **Tailwind v4 moved the important modifier to a trailing `!`** (`mt-3.5!`). If `@tailwindcss/browser@4.1.6` does not accept the legacy prefix, these declarations no-op and the toggle falls back to default PrimeNG text-button styling instead of the GATE-2 appearance. Not attributable to T-03 — the leading-bang form is the established repo-wide convention and appears in other components' compiled consts. **Step 1 of the T-06 human check will surface it visually either way.** |

#### Open items routed out of this spec (recorded, not actioned)

Per `/akili-execute` §2.4, an advisory may not become a task in this spec. Both of these need a decision from the spec owner:

1. **The `#1771b3` token gap (A-03.3).** Either add an `--ac-*` token in `src/styles/colors.scss` (plus `src/README.md` and `docs/ux-ui/design.md` §7) as a follow-up, **or** add a line to `design.md`'s decision log recording §6.4 as a deliberate, scoped exception to root `CLAUDE.md` §4.2. Doing neither leaves the constitution and the code in undocumented disagreement, which §5 forbids.
2. **Tailwind v4 important-modifier syntax (A-03.6).** A repo-wide question about whether leading-`!` utilities are silently inert under the v4 CDN build. If they are, the blast radius is far larger than this dashboard.

#### Final verification

`npm run lint` clean · `npm run build` succeeded, `strictTemplates` passes · 5 suites / 98 tests pass across `project-detail` · fix confirmed in the AOT production bundle. `project-dashboard-card.component.spec.ts` still unmodified — T-04 owns its assertions.

**NFR-PDB-004 is NOT verified and must not be reported as such.** jsdom computes no box model, so the static reading establishes only that the bounded container exists and is correctly conditioned on `visibleLimit() === null`. Whether the layout actually holds is the five-step human check in `requirements.md` §7, carried by **T-06**.

---

### T-04 — Card spec: the real template, no stub

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** |
| **Date** | 2026-07-29 |
| **Implementer attempts** | 1 |
| **Requirements covered** | R-PDB-002, R-PDB-003, R-PDB-004, NFR-PDB-003, NFR-PDB-005 |
| **Defect classes gated** | DC-3, DC-4, DC-6, DC-7, DC-11 (card side) — **all now genuinely gated** |
| **Changed LOC** | +420 (`project-dashboard-card.component.spec.ts`, 114 → 534) — **+194 over the design's ~340 estimate; see the budget note** |
| **PR** | 2 of 4 — completes it |

#### Attempt 1

**Files changed:** `project-dashboard-card.component.spec.ts` only. Component `.ts` and `.html` verified unmodified **by checksum**, not by trusting the report — the mutation experiments were fully reverted.

**This task is the KZ-001 remediation.** It is the only place R-PDB-002/003/004 can be asserted, because `project-dashboard.component.spec.ts:205-226` replaces the card with a stub that renders none of it.

#### Suite fidelity — the evidence that matters

The task's own bar is that the suite must be able to **fail**. Eight mutations were run against the component: three the Implementer was instructed to run, plus **four the Reviewer invented and the Implementer never anticipated**. All were reverted.

| # | Mutation | Origin | Result |
| --- | --- | --- | --- |
| M1 | `barColor` total → `visibleItems().length` | briefed | **KILLED** — invariance test: `rgb(52, 91, 143)` expected / `rgb(17, 47, 92)` received |
| M2 | `columns` tracks → `items().length` | briefed | **KILLED** — DC-6 test: `repeat(5,…)` expected / `repeat(40,…)` received |
| M3 | bounded-container condition → hardcoded `true` | briefed | **KILLED** — collapsed bounded-container test |
| M4 | drop `&& variant() === 'card'` from the toggle guard | Reviewer | **survived — proven equivalent mutant** (see below) |
| M5 | `toggleAriaLabel` drops `title()` | Reviewer | **KILLED** — accessible-name test |
| M6 | `visibleItems` → `slice(0, limit + 1)` | Reviewer | **KILLED** — 3 tests |
| M7 | disable the top-level `variant === 'list'` arm | Reviewer | **KILLED** — proves the list test is not vacuous |
| M8 | **move the toggle out of the `@else if (items().length)` arm** | Reviewer | **KILLED** — exactly the 3 position tests |

**M4 is not a suite gap.** The template's top-level `@if (variant() === 'list')` routes the list variant to a branch containing no `<section>` at all, so inside the `@else` arm `variant()` is necessarily `'card'` (the input is typed `'card' | 'list'`). The inner guard is unreachable-false, so the mutant is semantically equivalent and **no test can kill it**. M7 independently confirms the behaviour it nominally protects *is* gated.

**M8 settles the toggle-position question empirically.** The Implementer claimed position was proven by asserting the toggle is absent while `loading`/`error`/`empty` even though `canExpand()` is true. Relocating the toggle to after the state-chain `</div>` turns exactly those three cases red — so the tests prove **position**, not coincidence.

#### Verification — every claimed number re-measured by the Reviewer

| Claim | Verified |
| --- | --- |
| `npm run lint` | ✅ "All files pass linting." |
| `npx jest --coverage=false src/app/pages/platform/pages/project-detail` | ✅ **5 suites / 117 tests** (baseline 5/98; +19) |
| Card coverage 97.14 / 85.71 / 84.61 / 100 → **100 / 100 / 100 / 100** (stmts/branches/funcs/lines) | ✅ exact, measured before and after; template stays 100 |

NFR-PDB-005 satisfied — coverage **rises** on both the `.ts` and the template.

**Reviewer verdict — `STATUS: PASS`**

> The suite instantiates the real `ProjectDashboardCardComponent`, asserts against rendered DOM, and demonstrably fails when the behaviour it claims to cover is broken — 7 of 8 mutations killed, including three I invented that the Implementer did not anticipate, with the eighth a provably equivalent mutant. Every R-PDB-002/003/004, NFR-PDB-003 and DC-3/4/6/7/11 case required by T-04 is present, live, and free of both traps R-PDB-004's Note warns about.

Both R-PDB-004 traps were confirmed avoided: the invariance claim is a **state-comparison loop** (`expanded[i] === collapsed[i]` for i<5), not an absolute colour; and `getPartnerBarStyles` extracts only `{color, width}` on the `rows-partners` layout, so `rows-stacked-lever`'s `last:border-b-0` chrome never enters the comparison.

#### Decisions made

| # | Decision | Basis |
| --- | --- | --- |
| E-04.1 | Keyboard activation is gated by the **semantic contract** — native `<button type="button">`, not disabled, plus `.click()` — rather than by a dispatched `keydown` | **Adjudicated correct; jsdom claim verified directly by the Reviewer:** `keydown`/`keyup` with `Enter` and `' '` on a focused native `<button>` produced **0 click events**. A keydown assertion therefore has only two possible forms — `expect(emitted).toBe(1)`, which fails against correct code, or `expect(emitted).toBe(0)`, which passes against a `<div>` too. Both are worse than useless. Asserting the button semantics pins the exact platform property that grants Enter/Space activation. |
| E-04.2 | 37- and 40-row cases are derived from the fixture via `deriveLargeRankedList(size)`, cycling its 7 real institutions with strictly descending counts | Legitimate derivation, not hand-rolled data. The fixture cannot carry 37 partners and `requirements.md:184`'s scenario mandates that number. |
| E-04.3 | 534 lines against a ~340 estimate is **load-bearing, not padded** | Reviewer breakdown: ~99 lines pre-existing kept tests, ~50 helpers (all used), ~90 comments, remainder new cases. No duplicated cases, no dead helpers, no trivially-passing assertions. High comment density is deliberate — each block records *why* an assertion is non-vacuous, which is the point of a KZ-001 remediation. |

#### Finding of record — the coverage-flag contradiction, resolved

T-01, T-02 and T-03's Implementers all reported that a path-scoped jest run fails the global coverage thresholds by construction. T-04's Implementer reported it does **not**. The Reviewer resolved it: **T-01/T-02/T-03 are right.**

`jest.config.ts:7` sets `collectCoverage: true`, and a path-scoped run with default flags fails all four global thresholds (`9.15% / 6.43% / 5.61% / 8.79%`). T-04's Implementer saw no failure **only because `--coverage=false` was passed**, which disables collection and therefore skips threshold evaluation entirely. Both statements are true of different commands; T-04's omitted the causal flag.

**Consequence for T-08, recorded now so it is not rediscovered late:** T-08's coverage gate must be a **full-suite run without `--coverage=false`**, and no path-scoped run may ever be cited as coverage evidence.

#### Issues encountered

None. No rework round consumed.

#### ADVISORY findings (4R lens — non-gating)

| # | Lens | Finding |
| --- | --- | --- |
| A-04.1 | Risk | **Budget tripwire needs an entry** — T-04 landed +194 (+57%) on its row. Escalated to the spec owner; see the budget note below. |
| A-04.2 | Readability | Dead guard in already-committed T-03 code: `@if (canExpand() && variant() === 'card')` (`.html:38`) sits inside the `@else` of `@if (variant() === 'list')`, so the second conjunct can never be false (this is M4's equivalence). Matches design §5.2.5 literally and is harmless defensively, but reads as untested to future mutation runs. **Not actioned** — `tasks.md:109` pins the wording. |
| A-04.3 | Reliability | `getBoundedContainer` uses `querySelector('.overflow-visible')`, which also matches the no-items wrapper at `:49` and the per-row inner div at `:92`; it works only because document order puts the bounded container first. M3 proved both assertions are live **today**, but a template reorder could silently retarget them. A `data-testid` would make it robust. |
| A-04.4 | — | `expect(button.tabIndex).toBe(0)` would gate the "keyboard reachable" half of NFR-PDB-003 explicitly and catch a future `tabindex="-1"`. jsdom **does** implement `tabIndex` defaulting, so unlike a keydown assertion this one would be meaningful. |
| A-04.5 | — | `deriveLargeRankedList` synthesizes counts and ids while borrowing only labels. `mockContractFullReports({ top_partners: [...] })` — the override hook the fixture already exposes — would keep the scale-up inside the fixture's own contract. |

#### Final verification

`npm run lint` clean · 5 suites / 117 tests pass · card-component coverage 100/100/100/100 · component sources verified unmodified by checksum · working tree restored exactly.

---

### T-05 — Dashboard: rewire to the single service, titles, keys, sort

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** |
| **Date** | 2026-07-29 |
| **Implementer attempts** | 1 |
| **Requirements covered** | R-PDB-001, R-PDB-004 AC.4, R-PDB-005, R-PDB-007 |
| **Changed LOC** | 47 insertions, 68 deletions across 2 files |
| **PR** | 3 of 4 (with T-06, T-07) — **the first PR a user notices** |

#### Attempt 1

**Files changed:** `project-dashboard.component.ts`, `.html`.

- Four `GetTop*Service` injections replaced by one `GetFullContractReportsService`, provided at **component** level (DD-9) alongside the untouched `GetGeoScopeService`. The load `effect` now makes **one** `main(contractId)` call, replacing four.
- All four item computeds, all four `*Empty()` computeds (each retaining its `!loadError()` guard) and all **16** `[loading]`/`[error]`/`[empty]`/`(retry)` bindings re-sourced — counted and confirmed by the Reviewer.
- Explicit descending sort added to all four; `partnerItems()` had none (R-PDB-004 AC.4). Every sort runs on the array returned by `.map()`, never on a computed's source — no in-place mutation.
- `id` now payload-derived everywhere: partners `institution_id`, levers `lever_id`, **contacts `user_id`** (was the formatted display name — the R-PDB-005 fix), contributors `contract_id`.
- Titles renamed per DD-5.
- `contractId` keeps its `snapshot` derivation (DD-10r) — verified unchanged, no `paramMap` subscription added.

#### The central risk of this task, and how it was cleared

Moving from the old catch-all `ProjectDashboardRankedItem` to T-01's narrower payload mirrors meant **narrowing several field accesses**. Because the suite that exercises this component is legitimately red (see below), no test could have caught a resulting rendering regression. The Reviewer therefore traced each narrowing to the **server SQL**, not to the client mirror.

**The decisive finding:** `agresso-contract.repository.ts:1167` — `getFullContractReports()` **delegates to the same four builders** the four retired endpoints use (`getTopPrimaryLeversReport`, `getTopContributorsReport`, `getTopMainContactPersonsReport`, `getTopPartnersReport`, each with `undefined` limit). Only the `LIMIT` differs; the row objects are byte-identical between the old and new paths. The four old client services were confirmed pure pass-throughs with no enrichment. **Design §5.1's guarantee that label rendering cannot regress is therefore true, and now demonstrated rather than assumed.**

Per-formatter, against the actual `SELECT` aliases:

| Formatter reads | Emitted by the SQL? |
| --- | --- |
| `formatContributorLabel`: `contract_id ?? contract_code`, `contract_description ?? project_name` | `contract_id`, `contract_description`, `project_name` ✅ — **`contract_code` is emitted by nothing**; it was a dead fallback, so `contract_id` was already the label source |
| `formatPartnerLabel`: `institution_name ?? partner_name`, `acronym` | `institution_name`, `acronym` ✅ — `partner_name` never emitted, dead |
| `formatMainContactPersonName`: `name ?? full_name ?? contact_person_name ?? label ?? (first+last)` | only `first_name`/`last_name` emitted → falls through to `first + last`, **exactly as before** ✅ |
| `formatLeverDisplayLabel(short_name, full_name)` | `short_name`, `full_name` ✅ |

**Count narrowing cleared:** all four `SELECT`s alias the magnitude as `COUNT(DISTINCT …) AS count` and all four DTOs declare `count!: number`. Neither `results_count` nor `value` appears anywhere in the server surface — the dropped fallback chain was covering nothing. No bar can render zero-width.

#### Decisions made

| # | Decision | Basis |
| --- | --- | --- |
| E-05.1 | `formatLeverDisplayLabel(item.short_name, item.full_name ?? '')` — coerce `undefined` to `''` at the call site; the formatter itself is byte-unchanged | **Not merely equivalent — necessary.** With `''`: `''.indexOf(':')` → `-1` → `('' \|\| shortName \|\| '—').toUpperCase()` → `shortName`. With `undefined` it would **throw** (`undefined.indexOf`). The new mirror correctly types `full_name?: string`; the old `TopPrimaryLeverItem` typed it as required, which was wrong. The coercion prevents a crash the corrected type now exposes. |
| E-05.2 | `getPartnerItemId` deleted | **Genuinely dead and its removal was mandatory, not cleanup.** Module-local, unexported, zero `grep` hits across all of `src` including specs. It guarded `institution_id === null`, impossible given `INNER JOIN clarisa_institutions` + `GROUP BY clarisa_institution.code`, and its fallback `partner_name` is never emitted. Leaving it would have failed `@typescript-eslint/no-unused-vars` — lint passes, so removal was required by T-05's own edit. |
| E-05.3 | Contributor `id` narrowed from `contract_code ?? contract_id ?? String(index)` to `contract_id` | `secondary_contract.contract_id` is the `GROUP BY` key, so it is unique per row — satisfies R-PDB-005 AC.2/AC.3. `contract_code` was unreachable. |

#### Expected failure — accepted by design, not a defect

T-05 un-injects the four services that `project-dashboard.component.spec.ts` mocks, so that 848-line suite is **red between T-05 and T-07**. The provider block and the card stub must change together, which is why T-07 is a separate task; PR 3 groups T-05+T-06+T-07, so the redness never escapes the PR.

**The Reviewer ran the FULL suite rather than the targeted one to prove no other failure hides behind the expected ones: 308 suites / 6,250 tests — 1 suite failed, 4 tests failed, all four in `project-dashboard.component.spec.ts`. No fifth failure anywhere in the client.**

**T-07's work order — the four failing cases:**
1. `should load project dashboard data for the parent contract` — asserts the four old mocks' `main` were each called with `('C-1', 4)`.
2. `should build and sort ranked service items` — asserts `contributorItems()` against the four old mocks' `.list` signals.
3. `should handle status response without result rows and lever labels with empty prefixes` — sets `topLeversMock.list` and reads `leverItems()[0]`.
4. `should compute empty states from loading, error, and list signals` — asserts the four `*Empty()` computeds against the old mocks' signals.

#### Issues encountered

None. No rework round consumed.

#### ADVISORY findings (4R lens — non-gating)

| # | Lens | Finding |
| --- | --- | --- |
| A-05.1 | Risk — **operationally important** | **T-05 alone leaves the four cards rendering the FULL list.** `visibleLimit` defaults to `null` (DD-12) and T-05 correctly does not bind it, so between T-05 and T-06 a card can render up to ~137 partner rows (GATE-1 worst case) with **no bound and no toggle**. This is the documented decomposition and PR 3 groups T-05+T-06+T-07 — but **T-05 must never ship as a standalone commit to a deployable branch.** |
| A-05.2 | — | `ProjectDashboardRankedItem` is a 47-field catch-all of which these four endpoints emit only 13. Once T-08 deletes the four services, its remaining consumers are the four formatters. A future task could narrow the formatter signatures to the T-01 mirrors and delete the dead branches. Out of scope; T-05 was right not to touch the formatters. **Recorded so T-08 does not resurrect the dead fallbacks.** |
| A-05.3 | Readability | Pre-existing asymmetry, unchanged by T-05: `leverItems` uses `count: item.count` raw while the other three use `Number(item.count ?? 0)`. Harmless with mysql2's `COUNT()` handling, but reads as an oversight. |

#### Final verification

`npm run lint` clean · `npm run build` succeeds, no template or type errors · **full suite 308 suites / 6,250 tests, exactly 4 failures, all expected and all in the dashboard spec** — all re-run by the Reviewer.

---

### T-06 — Dashboard: expansion state + DD-13 independent height

| Field | Value |
| --- | --- |
| **Final status** | 🔶 **BLOCKED — `[~]`. Pivot Protocol triggered.** |
| **Date** | 2026-07-29 |
| **Implementer attempts** | 1 (**no rework attempt consumed — the defect is in the spec, not the diff**) |
| **Requirements delivered** | R-PDB-003 AC.4, AC.6, AC.7 ✅ · **NFR-PDB-004 condition 2 ❌ — not deliverable by the specified mechanism** |
| **Changed LOC** | 60 insertions, 6 deletions across 2 files (uncommitted at the time of the pivot; see below) |

#### Attempt 1 — implementation conforms; Reviewer `STATUS: FAIL` on a spec gap

**All eight conformance gates passed.** The diff is a faithful implementation of T-06 exactly as written:

| Gate | Result |
| --- | --- |
| `ChartKey` exported, 4 members, load-bearing under `strictTemplates` | ✅ |
| New `Set` per toggle; `current` never mutated | ✅ — `expanded.update()` is the only mutation site in the whole `project-detail` tree |
| `visibleLimit` per card from the **imported** `COLLAPSED_ITEM_LIMIT` | ✅ |
| Reset semantics — **absence** of a mechanism is correct (AC.6/AC.7) | ✅ — no `linkedSignal`, nothing keyed to `payload()`; `reports.update()` has no handle on the component, so it *structurally cannot* reach `expanded` |
| DD-13 mutual exclusivity | ✅ — both classes on the same predicate; static `lg:items-stretch` removed |
| Explicit non-solution not taken | ✅ — no extra rows rendered to fill the gap |
| Class bindings actually apply | ✅ — names contain `:` not `.`, so the E-03.2 trap does not bite |
| Scope | ✅ — two files; no scratch survived; four old services intact |

**Verification re-run by the Reviewer:** `npx ng lint` clean · production build succeeds · `project-detail` suite 4 failed / 113 passed, and the four are **exactly** T-05's inherited cases. **No fifth failure — T-06 introduces no regression.**

**The CDN concern I raised was checked and cleared.** The Reviewer fetched `@tailwindcss/browser@4.1.6` and grepped its observer options: `attributes:!0, attributeFilter:["class"], childList:!0, subtree:!0`. The browser build watches `class` mutations subtree-wide, so a class appearing only via runtime binding is still generated. The collapsed default cannot silently lose `items-stretch`.

---

## Pivot Record: T-06

### The blocker

**DD-13, as specified, cannot satisfy NFR-PDB-004 condition 2. The mechanism is incomplete — this is a spec defect, not an implementation defect.**

DD-13 applies `align-items: start` to the **ranked grid only**, which is literally what `design.md` §6.3.1 prescribes. The Reviewer traced the consequence through the real CSS:

1. **`align-items` does not size grid tracks.** An `auto` row is sized to the max of its items' max-content contributions; alignment only decides how a *shorter* item sits inside an already-sized track. So `items-start` stops the **row-mate** being stretched — the half DD-13 correctly fixes — but the track itself still grows to the expanded card.
2. The expanded card is chrome + a `max-h-[46vh]` list + toggle. `46vh` exceeds five rows at any viewport taller than ~470px, so **the ranked grid grows**.
3. The left column (`:154`, `flex flex-col lg:h-full lg:self-stretch`) is content-sized; `lg:h-full` is a percentage against an `auto` track, so it cannot clamp growth. **The left column grows.**
4. The outer grid (`:153`, `lg:grid-cols-[3fr_1fr] lg:min-h-[520px] lg:items-stretch`) sizes its single `auto` row to the max of both columns. **`min-h` is a floor, not a ceiling.** The row track grows.
5. The right column (`:207`) is pulled to that track by **three independent forces**: the outer grid's `lg:items-stretch`, its own `lg:self-stretch`, and `h-full`. Neutralising DD-13's one class on the *inner* grid touches none of them.
6. **The decisive line is `:270`** — *Results by status* is `flex min-h-0 flex-1 flex-col …`. `flex-1` absorbs **all** free space while *Results by indicator* above it is `shrink-0`. The entire increase lands in one bordered, shadowed, white card whose inner list is capped at `max-h-[172px]`, rendering **a large white void**.

**Human-check step 3 ("Confirm the right-hand column does not stretch") will therefore fail.** Step 2 (row-mate) will pass — DD-13 does deliver that half.

### Why three rounds of blind review and a mockup all missed it

**The GATE-2 mockup contains the same blind spot.** It faithfully mirrors `.outer`, `.leftcol`, `.ranked` and `.ranked.independent` — but its right column is two `.sidebox` divs (`mockup/index.html:246`, CSS `:106`) with **no `flex:1`**. In the mockup the column box grows invisibly while the white boxes stay content-sized. So mode 3's banner claim at `:163-164` — *"Sibling cards and the right-hand column keep their height"* — is true **of the mockup** and false **of the real DOM**.

The artefact used to close GATE-2 and to serve as the human-check reference reproduces the defect it was meant to catch. This is precisely the failure mode **RB-1** was filed to guard against.

### The reasoning error in the spec prose

Both `requirements.md:286` and `design.md:188` state: *"An **unbounded** expansion therefore stretches both its row-mate card and, through the outer grid, the right-hand column."*

The spec appears to have concluded that **condition 1 (bounding) removes the outer-grid propagation** and DD-13 need only remove the inner one. But bounding **caps** the growth at `46vh`; it does not **zero** it. A bounded-but-taller card propagates a bounded-but-nonzero stretch through exactly the adjacency the spec itself named.

**Corollary:** condition 1's *"so the page does not grow"* is also literally false, for the same reason. The page grows by `(46vh − collapsed list height)` — bounded, not zero.

### Alternatives (owner decision required)

| # | Option | What it does | Cost |
| --- | --- | --- | --- |
| **(a)** | **Extend DD-13 outward** | Also condition the outer grid, and neutralise `lg:self-stretch` + `h-full` on the right column while expanded. **All three forces, or nothing changes.** | The page still grows. The right column becomes top-aligned and shorter than the left while expanded — a different asymmetry the human check must accept. Small, contained code change. |
| **(b)** | **Freeze the geometry** | Bound the expanded list to the space the card **already occupies** rather than to the viewport, so it scrolls inside its existing grid area and nothing outside it moves. | **The only option that satisfies both conditions literally**, and it makes condition 1's "the page does not grow" true. Reopens **OQ-3** (closed as viewport-relative `46vh`) and touches T-03's already-committed bounded container. |
| **(c)** | **Narrow the requirement** | Accept bounded outward growth. Rewrite condition 2 and human-check step 3 to require *"no empty gap beside the expanded card"* rather than *"no stretch"*. | Cheapest, and an accurate description of what DD-13 actually delivers — but it concedes the *Results by status* void. No code change; spec-only. |

**Required regardless of the choice:** fix `mockup/index.html` — add `flex:1` to the second `.sidebox` so the human-check reference matches the real DOM. Otherwise the next reviewer inherits the blind spot.

### State of the working tree at the pivot

T-06's diff is **committed** despite the `[~]` status, deliberately: it passes all eight conformance gates, regresses nothing, and delivers AC.4/AC.6/AC.7 plus the row-mate half of NFR-PDB-004. Options (a) and (c) keep it unchanged; only (b) amends it. Committing preserves independently-verified work against context loss; the `[~]` in `tasks.md` and this record are what prevent it being mistaken for a completed task.

### ADVISORY findings (4R lens — non-gating)

| # | Finding |
| --- | --- |
| A-06.1 | Requirement prose overclaims condition 1 — *"so the page does not grow"* is false as written. Correct it in the same pivot so both conditions describe the same geometry. |
| A-06.2 | Tailwind's browser build rescans asynchronously after a class mutation, so on the first toggle of a session `lg:items-start` may sit on the element for a frame before its rule is injected. Cosmetic and self-correcting; noted only because DD-13's entire payload is that one class. |
| A-06.3 | `design.md` §5.4 promises Chunk B costs "one union member and one template binding, no new signal". The shipped shape needs a fifth `computed` per card plus the binding. Not wrong — four parallel computeds are readable and T-07 can assert each — but the extensibility claim is slightly overstated. A single `visibleLimitFor(key: ChartKey)` would match the promise literally. **Not actioned.** |
| A-06.4 | `expanded`, `rankedGridIndependent` and the four limit computeds are all public `readonly` — which is what T-07 needs. No action. |

### NFR-PDB-004 status

**UNVERIFIED, and now known to be partly unsatisfiable by the current design.** Two distinct things must not be conflated:
- The **design-reasoning** question was answered from the CSS and **resolves negatively** — condition 2 fails as specified.
- The **rendered outcome** remains unverified and still requires the five-step human check (RB-2), which should be run against a **corrected** mockup once the pivot lands.

---

### T-06 (REVISED under DD-14) — attempt 1: Reviewer `STATUS: FAIL`

| Field | Value |
| --- | --- |
| **Status** | 🔶 still `[~]` BLOCKED |
| **Date** | 2026-07-29 |
| **Rework attempts on the revised task** | 1 of 3 used |
| **Spec rework rounds consumed overall** | **2 of 2 — the budget tripwire is now AT its ceiling.** See the escalation below |

**Mechanism attempted:** static, unconditional `max-h-[280px]` on the bounded container, replacing the conditional `max-h-[46vh]`. `overflow-y-auto` and `pr-[6px]` stayed conditioned on `visibleLimit() === null`.

#### Why it failed — measured, not argued

**This audit was the turning point in method.** Rather than reason about the CSS a third time, the Reviewer built a faithful DOM/CSS model of the real chain (outer grid `:153` → left column `:154` → ranked grid `:157` → `.cell flex flex-1` → host `h-full` → `section.card` → body `:15` → the shipped container) and **measured it in real headless Chrome at 1440px**. Probe retained at `scratchpad/geometry-probe.html` + `probe-out.json`.

| metric (px) | collapsed | expand partners | expand levers | expand contacts | expand contributors |
| --- | --- | --- | --- | --- | --- |
| expanded card's own section | 360 | **412** | **412** | **412** | **412** |
| row-mate card | 360 | **412** | **412** | **412** | **412** |
| ranked grid | 779 | **831** | **831** | **792** | **792** |
| left column / outer grid row | 1219 | **1271** | **1271** | **1232** | **1232** |
| *Results by status* (`flex-1`) | 977 | **1029** | **1029** | **990** | **990** |
| document height | 1307 | **1359** | **1359** | **1320** | **1320** |

Growth is deterministic, not font- or viewport-dependent: **+52px** for either row-1 card, **+13px** for either row-2 card, landing entirely inside *Results by status*, with identical page growth. Collapse restores exactly (step 6 passes); **human-check steps 2, 3, 4 and 5 all fail.**

**The root cause, and it is a clean lesson:** a `max-height` clamps a box's max-content contribution **only when the content exceeds it**. Collapsed, the list is 5 rows and sits *below* 280px, so the container contributes its **natural** height; expanded it contributes exactly **280px**. **The cap binds in one state only**, so the delta `280 − collapsed` propagates through all four links.

The collapsed heights are arithmetic ceilings, not estimates — `line-clamp-2` plus fixed row heights make them exact and font-independent:

| Layout / call site | Derivation | Collapsed height |
| --- | --- | --- |
| `rows-partners` (Results Partners) | 5 × max(2-line label 31.25, bar 24) + 4×12 gap + 4 `pt-1` | **208.25px** |
| `rows-stacked-lever` (Primary Levers) | 4 × 39.25 + 30.25 + 48 + 4 | **239.25px** |
| `rows-stacked-lever` + `[itemHeightPx]="43"` (contacts, contributors) | 5×43 + 48 + 4 | **267px** — only **13px** under the bound |

**A per-call-site pixel constant cannot work: `280px` would have to equal 208.25, 239.25 and 267 simultaneously.**

This is verbatim the error the spec had already named for DD-13: *"Bounding **caps** growth; it does not **zero** it."* Replacing `46vh` with `280px` changed the magnitude of the stretch, not its existence.

**My concern that 280px might clip the collapsed view was wrong** — 208.25 / 239.25 / 267 all fit under 280. And that is precisely *why* the mechanism fails: the bound never binds collapsed.

#### The three FAIL issues

1. **The mechanism is DD-13's failure mode with a smaller number.** Violates `design.md` §6.3.2 ("the card's rendered height is **identical**"), NFR-PDB-004 rev 4 conditions 1 **and** 2, and T-06's acceptance box.
2. **A fixed pixel bound is the one answer OQ-3 was explicitly re-closed against** — "neither fixed nor viewport-relative but **card-area-relative**". `max-h-[280px]` is fixed and references nothing about the card's area.
3. **The template and spec comments now assert a false causal claim in-repo.** `project-dashboard-card.component.html:33-46` and `…spec.ts:492-498` both state the unconditional class keeps the card's height from changing. Measurably false. **DD-13 survived three review rounds precisely because a plausible false rationale was written down as settled** — leaving these hands the next reader the same trap in the same shape. Violates root `CLAUDE.md` §5.

#### Verified clean (checked because I asked)

- Only the two assertions naming the retired `max-h-[46vh]` were touched; nothing else in the 24-case suite was weakened. The selector is not circular. **The Reviewer ran both mutations itself**: re-gating the class → 1 failure; deleting it → 2 failures. Both reverted.
- `rankedGridIndependent` gone; the ranked-grid line is **byte-identical to pre-T-06** (`git diff 01505143`), the only delta being T-06's input/output bindings.
- The audited T-06 internals are untouched — the `.ts` hunk is a pure 8-line deletion.
- Exactly the four files; dashboard spec still failing with **exactly** the 4 known T-07 cases; lint clean.
- Read-only contract honoured: `git diff | shasum` byte-identical to the audited diff.

#### Two mechanisms that would actually work

| # | Mechanism | Why it satisfies DD-14 |
| --- | --- | --- |
| **(i)** | **Measure and freeze** — hold the container in an `ElementRef`, capture `offsetHeight` while collapsed, apply it as an inline `height`/`max-height` while expanded (guarding jsdom's `0`) | The bound **equals** the collapsed height, so the contribution is identical in both states. Exactly card-area-relative, and the applied style is structurally assertable. |
| **(ii)** | **Remove the expanded list from intrinsic sizing** — keep a 5-row in-flow list (which *is* the collapsed geometry) and render the full list while expanded in a `position:absolute; inset:0; overflow-y:auto` overlay inside a `relative` parent | An absolutely-positioned box contributes **nothing** to the track, so growth is structurally zero **with no measurement**. Encoding stays correct — `barColor(index)` and `partnerBarWidthPercent` already read `items()`. |

#### ADVISORY findings (4R lens)

| # | Finding |
| --- | --- |
| **A-06r.1** | **Spec-clarity defect that plausibly caused this failure — and it is mine.** `design.md` §6.3.2's implementation hint said *"a definite height must come from above (the row track)"*. **That is circular:** the ranked grid's rows are `auto`, sized **by** the card, so nothing definite comes from above unless the track is made definite or the collapsed height is captured. The sentence reads like a mechanism and is not one. **Fixed in the spec before re-running** — §6.3.2 now names both viable mechanisms. |
| A-06r.2 | Whatever bound ships, the collapsed state is `overflow-visible`, so a future overshoot (a 6th row, `itemHeightPx ≥ 46`, a third label line) spills **visibly** over the toggle with no gate to catch it — 13px of headroom today on contacts/contributors. Consider making overflow unconditional so an overshoot scrolls rather than spills. |
| **A-06r.3** | **`mockup/index.html` still models `max-height:46vh` + DD-13** (`.listwrap.bounded`, `.ranked.independent`). Post-pivot it is the reference for a **superseded** design, yet `requirements.md` §7 and T-06's acceptance both send the human check to it. The `flex:1` fidelity fix landed; **the DD-14 mechanism was never modelled — and the mockup would have shown this defect had it been updated.** Owner item. |
| A-06r.4 | `pr-[6px]` has no assertion in any suite (pre-existing). Verified manually this pass; one line in the expanded case would make it permanent. |
### Runtime failures — T-06 revised, attempt 2 (environment, NOT work outcomes)

Per `/akili-execute`'s runtime-failure fallback, these are recorded and are **not** work FAILs; they do not consume T-06's rework budget.

| # | Event | Tree state afterwards |
| --- | --- | --- |
| 1 | Implementer spawn for mechanism (ii) terminated by **API 529 Overloaded** before making any edit | Verified untouched — diffstat identical to attempt 1's rejected diff (33 ins / 21 del), `max-h-[280px]` still at `.html:47` |
| 2 | **Retry (the one permitted retry) also terminated by API 529 Overloaded**, again before any edit | Verified untouched again — same diffstat, `max-h-[280px]` still present |
| 3 | Owner authorised one further retry; **also terminated by API 529 Overloaded** before any edit | Verified untouched — diffstat unchanged, `max-h-[280px]` still at `.html:47` |

| 4 | Owner reported a VPN drop as a possible cause and authorised one more retry; **also terminated by API 529 Overloaded** before any edit | Verified untouched |

**Attempt 2 of 3 has therefore still not been executed** — four spawns, zero edits, no work outcome either way. T-06's rework budget is untouched by these.

**The VPN hypothesis was ruled out** by the fourth failure: connectivity had been restored and the error was unchanged. `529` is a server-side overload code from the **Anthropic model API** (which runs the Implementer/Reviewer subagents), not from the ARI backend. Worth recording because the two produce similar-looking stalls but are unrelated: no subagent in this task touches the ARI server — T-06 is client-only CSS/template work, and the geometry probe is a local static HTML file.

---

### T-06 (REVISED under DD-14) — attempt 2: ✅ **Reviewer `STATUS: PASS`**

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** — T-06 closed |
| **Date** | 2026-07-29 |
| **Attempts on the revised task** | 2 of 3 (attempt 1 rejected; five further spawns died on API 529 without editing) |
| **Requirements covered** | R-PDB-003 AC.4, AC.6, AC.7 · **NFR-PDB-004 both conditions — mechanism measured, acceptance still pending the human check** |
| **Changed LOC** | 222 insertions, 50 deletions across 5 files |
| **Routing deviation** | **Implementer ran on `opus`, not `sonnet` (T2).** Five consecutive `sonnet` spawns died on API 529; switching model was the only untried lever and it worked. Consequence: the Reviewer is also `opus`, so **model-level `author ≠ auditor` is waived for this task only.** Recorded per `.agents/leader.md`. Mitigation: the deviation was disclosed in the Reviewer's brief with an instruction to reproduce rather than agree — which it did, building its own probe with a different driver. |

#### The mechanism that finally worked (mechanism (ii), design §6.3.2)

The `variant="card"` list wrapper became `relative`, holding up to two renders of `#rankedList`:

| Render | When | Content |
| --- | --- | --- |
| **In flow — always** | every state | `layoutItems()` = `visibleLimit() === null ? items().slice(0, COLLAPSED_ITEM_LIMIT) : visibleItems()`. A numeric limit is honoured verbatim; the cap only substitutes for `null` |
| **Out of flow — expanded only** | `expandedOverlay() = visibleLimit() === null && canExpand()` | `visibleItems()` (full list) in `absolute inset-0 min-w-0 overflow-y-auto pr-[6px]` |

While expanded, the in-flow render becomes a **layout-only spacer**: `invisible` (`visibility: hidden`, which *keeps the box* — `display: none` would not) plus `aria-hidden="true"`.

**Why the track cannot grow, and why this differs categorically from the two failures:** an absolutely-positioned box is removed from its containing block's flow, so it contributes nothing to any ancestor's **intrinsic size**. The ranked grid's `auto` row therefore measures only the in-flow render — capped at 5 rows in **both** states. `max-height` (attempt 1) is a *clamp on a contribution the box still makes*, so it binds asymmetrically; `align-items` (DD-13) never sizes tracks at all. Mechanism (ii) removes the contribution entirely, which is also why it is **viewport-independent** — the structural reason it cannot fail the way `46vh` did.

#### Measurement — reproduced independently by the Reviewer, not accepted

The Reviewer did **not** accept the Implementer's table. It re-ran that probe, verified its CSS transliteration against class lists dumped from the real rendered component, then **built its own probe with a different driver and scenarios the Implementer's omitted.**

| viewport | CTRL: HEAD (`46vh`, committed) | CTRL: attempt 1 (`280px`) | **DD-14, every scenario** |
| --- | --- | --- | --- |
| 1440×900 | **+186px** all links | **+52px** all links | **ZERO** |
| 1440×1400 | +416 | +52 | **ZERO** |
| 1440×700 | +94 | +52 | **ZERO** |
| 1280×900 | +193 | +59 | **ZERO** |
| 1024×900 | +175 | +41 | **ZERO** |
| 900×900 (below `lg`) | +206 | +72 | **ZERO** |

**Why this table is trustworthy where three prior CSS arguments were not:**

- **Both known failures reproduce as controls.** HEAD's growth **tracks viewport height** (94 → 186 → 193 → 416), exactly as a `46vh` bound must. Attempt 1 reproduces **+52px at 1440×900 — matching the earlier independent audit to the pixel.** A probe that reproduces two known defects and *then* reads flat is measuring something real.
- **Zero on every measured node, in both directions.** Each card, each wrapper, `ranked`, `leftcol`, `outer`, the `flex-1` *Results by status* box, and `document.scrollHeight` — across each card individually, all four at once, collapse-and-reopen, asymmetric row-mates (3-row and 5-row neighbours), and cards one row past the cap. The Reviewer's probe prints deltas both ways: **no growth and no shrink.**
- **The overlay scrolls rather than clips:** partners `1592/228`, contacts `1917/267`, levers `375/228`, contributors `817/267`.

Probes and raw output are committed under [`./evidence/`](./evidence/) so a future reader can re-run them — they were previously only in a machine-local temp path (advisory 3).

#### Conformance gates — all eight verified independently

| # | Gate | How it was verified |
| --- | --- | --- |
| 1 | A11y / duplicate content | Rendered DOM: **0** focusable nodes inside the `aria-hidden` spacer; the toggle is the **only** focusable node in the expanded card and `toggle.closest('[aria-hidden="true"]') === null`. No `aria-hidden` tab stop. |
| 2 | No shrink | **`min-h-[280px]` does NOT apply** — all four call sites pass `[compact]="true"` and render `… min-h-0`. With `compact=false` the binding *does* emit `min-h-[280px]`, so it works and simply never fires. **There is no height floor; the spacer is the only thing preventing shrink** — and zero shrink was measured. |
| 3 | R-PDB-004 encoding | `barColor`, `maxCount`, `totalCount`, `partnerBarWidthPercent`, `fillPercent` all still read `items()`; the `.ts` hunks are purely additive. |
| 4 | **R-PDB-002 AC.5 — geographic card byte-unchanged** | **Proven, not inspected.** Geo `variant="list"` DOM dumped at HEAD (throwaway worktree) and with the diff, for n = 0/1/3/5/6/12/37 plus the outer geo card. **Byte-identical** except Angular's dev-only `ng-reflect-*` attribute (stripped in production). |
| 5 | `layoutItems()` honours a numeric limit | Substitutes only for `null`; R-PDB-002 AC.1 holds. |
| 6 | **Card-spec fidelity — strengthened, not weakened** | Exact counts (5/37/40) and exact rendered `style.backgroundColor`/`style.width` retained; `recollapsed` still `toEqual(collapsed)`. **7 Reviewer-invented mutations, all killed:** drop `absolute` · drop `canExpand()` from `expandedOverlay` · `invisible`→`hidden` · drop `relative` (4 failures) · uncap `layoutItems` · `barColor` over `visibleItems()` · **remove `aria-hidden` → 6 failures**, which proves the new `aria-hidden` discriminator is load-bearing rather than decorative. |
| 7 | Comments do not overclaim | They describe the mechanism, say "measurably failed", quote the +52px figure, and label the Chrome work a **model**. Attempt 1's "the height never changes" assertion is gone. |
| 8 | Scope | 5 files (222/50). `project-dashboard.component.spec.ts` untouched and verified in a HEAD worktree to fail with **exactly** those 4 case names — so the diff is net **+3 passing tests**. `rankedRows` is a justified 1-line type shim (inline `ng-template` context is `any`, verified by a compile experiment both ways). |

**Gates re-run by the Reviewer:** `npm run lint` clean · `npm run s-lint` **352 errors / 0 warnings, unchanged, 0 `.scss` in the diff** · `npm run build` succeeds, `strictTemplates` OK · card spec **27/27**.

**Reviewer verdict — `STATUS: PASS`**

> DD-14 mechanism (ii) is the first of the three attempts whose containment claim survives independent measurement: I reproduced both known failures as controls (+186 HEAD, +52 attempt 1) and then measured **zero delta on all four links of NFR-PDB-004 — in both directions, across six viewports, for every card individually and all four together** — with the expanded list genuinely scrolling inside the card's existing area. All eight conformance gates pass, the T-04 suite is stronger than before (7/7 of my mutations killed, including one that proves the `aria-hidden` discriminator is load-bearing), and R-PDB-002 AC.5 is byte-unchanged for the geographic card.

#### Decisions made

| # | Decision | Basis |
| --- | --- | --- |
| E-06.1 | Implementer model switched to `opus` | Five consecutive `sonnet` spawns died on API 529 without editing. Model choice was the only untried lever. Waiver recorded above. |
| E-06.2 | The in-flow render is kept as an `invisible` + `aria-hidden` **spacer**, not removed | `visibility: hidden` keeps the box, which is what prevents the card **shrinking**. Since `min-h-[280px]` does not apply at these call sites, there is no floor and the spacer is load-bearing. |
| E-06.3 | `aria-hidden` is the discriminator the card spec's DOM helpers filter on, checked from the row outward | Deliberate: the spacer losing `aria-hidden` doubles every row count and the overlay gaining it drops them to zero, so the row-count assertions now **also gate the a11y contract**. The Reviewer's mutation confirmed this — removing `aria-hidden` reddens 6 cases. |
| E-06.4 | Keyboard scrolling of the overlay (WCAG 2.1.1) ruled **out of scope** for NFR-PDB-003 | NFR-PDB-003 is explicitly toggle-scoped (role, `aria-expanded`, accessible name, keyboard activation). The plain-`div` scroll container is pre-existing from committed T-03, so **not a regression**. **Escalated to the owner as a separate decision — see below.** |
| E-06.5 | `layout="columns"` with an overlay left untested in a browser | No live call site uses `columns` with items; it is only the input's default. DC-6 gates its structural bindings in jsdom. |

#### Issues encountered

Attempt 1 rejected (see the entry above). Five spawns lost to API 529 without editing — environment, not work.

#### ADVISORY findings (4R lens — non-gating)

| # | Finding | Disposition |
| --- | --- | --- |
| **A-06ii.1** | **The scroll container is not keyboard-operable.** The overlay is a plain `div` (`tabIndex=-1`, `role=null`), so a keyboard-only user cannot scroll it. Not a regression and not covered by any requirement as written — but DD-14 shrinks the window to ~5 rows while content reaches `1917px` in a `267px` box (measured), so the **impact is now much larger**, and PRD **C-4** (WCAG 2.1 AA on every changed screen) applies to this screen. One line fixes it: `tabindex="0"` + `role="group"`/`region` + an accessible name. | **Escalated to the owner.** Per §2.4 an advisory may not become a task or widen T-06 — the owner decides whether it lands as an addendum or a tracked defect. **Not silently inherited.** |
| **A-06ii.2** | **`mockup/index.html` still models DD-13 / `46vh`.** `requirements.md` §7 names it as *the reference for the six-step human check*, so **the owner cannot run the acceptance gate against it as it stands.** Its `flex:1` fidelity fix landed, but the DD-14 mechanism was never modelled. | **Escalated — this blocks the acceptance gate.** |
| A-06ii.3 | Dangling evidence citations in the shipped comments: the template points at `scratchpad/geometry-probe.html` (attempt 1's probe; DD-14's is `geometry-probe-dd14.html`), and both cite "the T-06 record in `execution.md`" as a forward reference. | **Partly resolved here:** this record now exists with the measurement table, and both probes are committed under [`./evidence/`](./evidence/) so they are resolvable rather than living in a machine-local temp path. **The wrong filename inside the template comment remains** — flagged to the owner rather than edited, since Leader does not write production code. |
| **A-06ii.4** | **Spec gap — R-PDB-003 AC.5 now reads as self-contradictory.** It says *"no dialog or **overlay** opens"*, while design §6.3.2 mechanism (ii) prescribes precisely a `position: absolute` overlay. The code follows the design doc and the evident intent (no modal, no navigation). | **Fixed by the Leader in `requirements.md`** — spec authorship, and root `CLAUDE.md` §5 requires fixing the doc that is wrong rather than letting it drift. |
| A-06ii.5 | Cosmetic: the spacer duplicates 5 `<img>` icon nodes for `rows-stacked-lever` cards (42 vs 37 nodes while expanded). Cached and negligible. | Recorded. |

#### Final verification

`npm run lint` clean · `npm run s-lint` 352/0 unchanged · `npm run build` succeeds with `strictTemplates` · card spec **27/27** · `project-detail` **4 suites, 116 passed** · **zero geometry delta across 6 viewports and every expansion scenario, measured in real Chrome by two independently-built probes.**

**NFR-PDB-004: the mechanism is measured and holds; ACCEPTANCE remains UNVERIFIED** pending the owner's six-step human check (RB-2), which `tasks.md` requires be reported as unverified rather than passed. **A-06ii.2 currently blocks that check** — the reference mockup models the superseded design.

---

## 🅿️ RUN PARKED — 2026-07-29 *(superseded: the run resumed and T-06 closed — see the entry above)*

Parked at the owner's instruction after four consecutive infrastructure failures. **Not a HALT** (no rework ceiling was reached) and **not a Pivot** (the design question is settled — mechanism (ii) is chosen and specified). Purely an environment block.

### State

| Task | Status |
| --- | --- |
| T-01 … T-05 | ✅ **done**, Reviewer PASS, committed |
| **T-06** | 🔶 `[~]` — expansion state committed (`e0311943`); **DD-14 mechanism (ii) not yet implemented** |
| T-07, T-08 | ⬜ not started (both blocked by the same overload — they need the same spawns) |

**Working tree is clean.** Attempt 1's rejected diff was **not** left in place, so nobody resuming can mistake known-bad code for work in progress. It is preserved as `stash@{0}` with an explicit warning label:

> `REJECTED T-06 DD-14 attempt-1 (static max-h-[280px]) — DO NOT APPLY. Measured +52px/+13px growth. See execution.md Pivot Record. Only reusable parts: rankedGridIndependent deletion + ranked-grid restore.`

**Do not `git stash pop` it wholesale.** The mechanism in it is measured-wrong. Only two fragments are worth salvaging, and both are trivial to redo: the 8-line `rankedGridIndependent` deletion from `project-dashboard.component.ts`, and restoring the ranked grid to an unconditional `lg:items-stretch` in `project-dashboard.component.html`.

### To resume

`/akili-resume`, or re-run `/akili-execute project-dashboard/full-payload-show-more`. The next action is **T-06 rework attempt 2 of 3**, implementing **DD-14 mechanism (ii)** exactly as specified in `design.md` §6.3.2 — a 5-row in-flow list for geometry plus a `position:absolute; inset:0; overflow-y:auto` overlay for the expanded list.

**Three things the next Implementer must not rediscover the hard way:**
1. **Measurement is mandatory.** Headless Chrome is available (`~/.cache/puppeteer/chrome-headless-shell/…`, `--headless --dump-dom`, no npm dependency) and a probe of the real four-link chain exists at `scratchpad/geometry-probe.html`. Two plausible CSS arguments (DD-13's `align-items`, attempt 1's `max-height`) have already been wrong. **Every metric must be flat in both directions — no growth and no shrink.**
2. **Pitfall — duplicate content.** `visibleItems()` returns the full list when `visibleLimit() === null`, so a naive overlay yields a 5-row spacer plus a 37-row overlay: 42 DOM rows, the top five announced twice to screen readers, and T-04's row-count assertions broken.
3. **Pitfall — the card must not shrink either.** DD-14 requires *identical*, not "not larger". Check whether `project-dashboard-card.component.html:5`'s `min-h-[280px]` binding applies at these four call sites — if the card already sits on that floor collapsed, the floor may do the work.

### Budget at park

| | Budgeted | Actual |
| --- | --- | --- |
| Tasks | 8 | 5 done · 1 blocked · 2 not started |
| Changed LOC | ≈1,600 | ≈1,100 committed |
| Rework rounds | 2 | **2 — at ceiling**, owner-authorised to continue |
| Pivots | 0 | 1 (DD-13 → DD-14) |

### Still owed, independent of the code

- **The six-step human check** (`requirements.md` §7) — the only gate for NFR-PDB-004 (RB-2). Must be run once T-06 lands, against a mockup that models DD-14.
- **A-06r.3:** `mockup/index.html` still models the superseded `46vh` + DD-13. Its `flex:1` fidelity fix landed, but the DD-14 mechanism was never modelled — **and the mockup would have caught attempt 1's failure had it been updated.**
- **Two doc items from T-03** (`execution.md` § T-03): the `#1771b3` token gap, and the repo-wide Tailwind v4 leading-`!` question.
- **T-08's `s-lint` acceptance criterion** is unachievable as written (352 pre-existing errors) and awaits an owner decision.

**Consequence for the whole run, not just T-06:** the overload is sustained, and **every** remaining task (T-07, T-08) also requires Implementer and Reviewer spawns. So the blockage is not specific to DD-14 — no task in this spec can proceed through the normal triad until the API recovers. The only route that makes progress without a subagent is the Leader-inline fallback, which requires explicit owner approval and costs the `author ≠ auditor` independence that caught the `pr-1.5` silent class bug, T-05's dead-fallback narrowing, and both DD-13/DD-14 mechanism failures. Escalated to the owner. **No code has been written by the Leader.**

### ADVISORY (continued)

| # | Finding |
| --- | --- |
| **A-06r.5** | **A headless Chrome is available on this machine** (`~/.cache/puppeteer/chrome-headless-shell/…`, driven with `--headless --dump-dom`, no npm dependency). The Reviewer's probe is reusable. **This materially changes what DC-8 can gate** — the "no automated gate for rendered layout" premise, which RSK-4 and RB-2 are both built on, is weaker than the spec assumed. Credit also noted: the Implementer reported plainly that jsdom returned `0` for every height and that its equal-height claim was therefore unproven, rather than dressing a vacuous assertion as a green check. That honesty is what made this audit cheap to target. |
