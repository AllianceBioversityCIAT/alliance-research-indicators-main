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
