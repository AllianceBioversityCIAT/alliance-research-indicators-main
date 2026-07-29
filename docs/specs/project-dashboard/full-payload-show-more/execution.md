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
