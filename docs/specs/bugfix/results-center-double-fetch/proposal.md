# Proposal — The Results Center issues two results requests on every load

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/results-center-double-fetch` |
| **Slug** | `results-center-double-fetch` |
| **Type** | **Bug** (pre-existing production defect; performance + correctness) |
| **Approval Mode** | `gated` (default) |
| **Depends on** | none — but see *Sequencing* below regarding `results-center/url-filters` |
| **Parallel-safe** | **no** with `results-center/url-filters` — that spec's T-11/T-12 own `results-center.component.spec.ts` and the shared-consumer specs this fix must re-run |
| **Source** | Discovered during `/akili-execute` of `results-center/url-filters`, task **T-11**. Full diagnosis: that spec's `execution.md` §9 → *Pivot Record: T-11*; decision recorded as **D-URL-17** in its `design.md` §12 |
| **Date** | 2026-08-13 |
| **Status** | ⚠️ **SEED — not a formalized proposal.** Written by the `/akili-execute` Leader at the moment of discovery so a verified diagnosis would not have to be reconstructed later. It has **not** been through `/akili-propose`: options were not scored, no HITL gate was run, and the fix below is a hypothesis, not an approved design. Run `/akili-propose` (or `/akili-specify` if the diagnosis is accepted as-is) before executing anything here |

## Intent

Make a Results Center page load issue **one** results request instead of two.

## Bug Diagnosis

Every fact below was verified from source during T-11, twice — once by the Implementer against a real rendered component tree, once independently by the Leader.

| # | Fact | Evidence |
| --- | --- | --- |
| 1 | The results table is `[lazy]="true"` with `(onLazyLoad)="resultsCenterService.handleResultsTableLazyLoad($event)"` and **no `lazyLoadOnInit="false"`** | `results-center-table.component.html:60,64` |
| 2 | PrimeNG 19's `lazyLoadOnInit` defaults to `true`, so `onLazyLoad` fires during the table's own init | PrimeNG 19 default |
| 3 | That handler ends in an unconditional `void this.main()` | `results-center.service.ts:594-612` |
| 4 | `ResultsCenterComponent.initializeState` independently fires its own `main()` | `results-center.component.ts` |
| 5 | The dedupe **cannot** collapse the two: the calls carry different filter states, so `fetchKey`s differ | `results-center.service.ts:539` (guard) vs `:580` (key write) |
| 6 | **The wiring predates the url-filters spec** — it is present on `main` | `git show main:…/results-center-table.component.html` |

**Net effect:** two `GetResultsService.fetchPaginated` calls per load. On a URL-seeded load (a CapDev email link) they carry *different* filters — one unseeded, one seeded — so this is not merely a duplicate request: for a window, the table renders results the link did not ask for.

### Why it went unseen until now

`results-center.component.spec.ts` overrode the component's template to `<div></div>`, so **the table that issues the second fetch never rendered in any test.** `results-center/url-filters` T-06 passed a done-check reading *"Exactly one results request on initial load"* inside that harness. This is **KZ-001 at recurrence 5** — *"a test double that doesn't render or evaluate what it stands in for produces a green suite over broken behavior"* — and it was found by the task written to end the pattern.

## Scope

**In:** the init-time duplicate fetch and a regression test that can actually observe it.

**Out:** the URL⇄filter layer (owned and already delivered by `results-center/url-filters`); pagination, sort and rows-per-page behavior, which are `handleResultsTableLazyLoad`'s legitimate job and must not change.

## Candidate fixes — hypotheses for `/akili-propose` to score, not a decision

| # | Approach | Note |
| --- | --- | --- |
| A | `[lazyLoadOnInit]="false"` on the `p-table` | Smallest diff. Must confirm nothing depends on that first event to establish initial paginator state |
| B | Guard `handleResultsTableLazyLoad` against its own first invocation | Keeps the event flowing for paginator setup; adds state to a shared service |
| C | Let the table's event be the *only* fetch trigger and stop `initializeState` from calling `main()` | Arguably the cleanest ownership, but inverts the ordering guarantee url-filters depends on — the filter must be seeded *before* the fetch. **Highest risk** |

**A is the obvious first candidate. Do not treat that as the decision** — this seed exists to preserve evidence, and picking the fix is the proposal phase's job.

## Blast radius — the reason this is its own spec

`ResultsCenterService` is `providedIn: 'root'` and mutated from **five surfaces across four routes**; `results-center-table.component` is rendered by **both** the Results Center and the project dashboard. Per `results-center/url-filters` NFR-RCU-005 and **KZ-003**, a targeted suite is not evidence for a change here — a **full client suite run is mandatory**.

## Sequencing

Land **after** `results-center/url-filters` completes (T-11, T-12). Both touch `results-center.component.spec.ts` and the shared-consumer specs; concurrent work in one checkout would interleave. Nothing in url-filters depends on this fix — its ACs were narrowed by D-URL-17 precisely so it can close without it.

## Open questions

| # | Question |
| --- | --- |
| Q1 | Does anything rely on the table's init-time `onLazyLoad` to establish initial paginator state (`first`, `rows`, sort)? Fix A is only safe if not. |
| Q2 | Does the project dashboard's fixed table (`initializeProjectDashboardResultsTable`) double-fetch the same way? If so, this spec covers both surfaces, and the requirement should say so. |
| Q3 | Is the *interleaving* separately harmful — can the unseeded response land last and leave the wrong rows on screen? That is a race, and it would raise severity from performance to correctness. |
