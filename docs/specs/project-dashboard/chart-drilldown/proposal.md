# Proposal — Chunk C1: Chart drill-down (indicator / status / lever)

> Child of [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md) (umbrella). Shared context — problem inventory, decomposition, decisions **D-1…D-7** — lives there and is **not restated here**.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/chart-drilldown/` |
| Type | **Change** |
| Approval Mode | `gated` |
| Created | 2026-07-29 |
| Umbrella | `docs/specs/project-dashboard/analytics-expansion/` |
| Depends on | **Chunk A** — makes the rows A restructures clickable |
| Parallel-safe | **no** — shares `project-dashboard.component.*` and `project-dashboard-card.component.*` with A and B |
| Governing risk | Umbrella **R-7** (drill-down UX trap) |
| Surfaces | **Client only** — no server change |
| Ticket coverage | Covers **exactly** the three examples the ticket names; every other dimension needs Chunk C2 |

## 2. Intent

Let a user click a chart item and land on the project's Results table already filtered to that item — for the three dimensions the results filter supports today, with no backend work.

## 3. Problem / Current Behavior

Umbrella **P-7** and **P-9**. Chart rows are inert: no click target, no route, no filter hand-off. And `ResultFilter` only supports `indicator-codes`, `lever-codes`, `status-codes`, `contract-codes`, `platform-code`, `result-codes`, `years`, `create-user-codes` — so of the ticket's examples, all three named ones (indicator, primary lever, status) are reachable, and nothing else is.

**Favourable finding:** the results table **already renders removable filter chips** — `getActiveFiltersExcludingIndicatorTab()` + `resultsCenterService.removeFilter(label, id)` at `results-center-table.component.html:43-49`, gated by `shouldShowFilterMessage()`. R-7's mitigation therefore reuses existing machinery instead of building it.

## 4. Proposed Outcome

Clicking an item in *Results by indicator*, *Results by status* or *Primary Levers* navigates from `/project-detail/:id/project-dashboard` to `/project-detail/:id` (the Project Results tab — the default child route) with the matching filter applied **and shown as a removable chip**, so the user can see why the table is filtered and undo it.

## 5. Scope

| # | Item |
| --- | --- |
| C1-1 | A `ResultsCenterService` entry point that seeds an arbitrary filter for a project — analogous to the existing `initializeProjectDashboardResultsTable(contractId)` (`results-center.service.ts:755-786`), which today hardcodes `statusCodes: [5]` / Pending Revision. The new one accepts the drill-down dimension + value and must populate **both** `tableFilters` (what the chips read) and `resultsFilter` / `appliedFilters` (what the request reads) — the existing method sets all three, and missing one is the obvious defect mode. |
| C1-2 | Navigation from the dashboard to `/project-detail/:id`, carrying the filter. Mechanism decided in design — see §10. |
| C1-3 | Clickable rows in *Results by indicator* (`indicator-codes`), *Results by status* (`status-codes`), *Primary Levers* (`lever-codes`). Keyboard-accessible (`button` semantics, focus ring, `Enter`/`Space`), accessible name naming both the value and the action (C-4 / WCAG 2.1 AA). |
| C1-4 | Chip verification: the applied filter appears via `getActiveFiltersExcludingIndicatorTab()` with correct display text from `getFilterDisplayText`, and `removeFilter` clears it and refetches. |
| C1-5 | Non-clickable cards stay visibly non-clickable — no hover affordance on *Results Partners*, *Main contact person*, *Contributing projects* or *Geographic Scope* until C2. See C1-R2. |
| C1-6 | Specs: the new service entry point, the navigation, and a chip round-trip (apply → visible → remove → cleared). |

## 6. Non-Goals

- **Any new filter dimension** — partner institution, main contact person, contributing project, geography, and all Chunk B metadata dimensions are **Chunk C2**. This chunk adds no query param, no repository join, no `ResultFilter` field.
- Changing the *Pending revision* embedded table's own default filter (`statusCodes: [5]`).
- Cross-project drill-down.
- Making Chunk B's new cards clickable (they have no filter support).

## 7. Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Modified | `project-dashboard.component.{ts,html,spec.ts}`, `project-dashboard-card.component.{ts,html,spec.ts}`, `results-center.service.{ts,spec.ts}`, possibly `project-detail.component.ts` (receiving side) |
| Reused as-is | `results-center-table.component.html` chip rendering, `removeFilter`, `getFilterDisplayText` |
| Server | **none** |
| Docs | `docs/ux-ui/design.md` — drill-down flow + which chart dimensions are clickable |

## 8. Visual Reference

- **Source:** none.
- **Location:** `docs/specs/project-dashboard/chart-drilldown/mockup/` if needed.
- **Notes:** Lower design risk than A or B — the target (a filtered results table with chips) already exists. What needs designing is the **affordance**: how a clickable row differs from a non-clickable one on the same dashboard (C1-R2), which is a hover/cursor/underline decision, not a new screen.

## 9. Requirement Delta Preview

### ADDED
- Clickable chart items for indicator / status / lever.
- A `ResultsCenterService` entry point seeding an arbitrary project filter.
- Navigation dashboard → Project Results tab with filter state.

### MODIFIED
- Chart rows gain interactive semantics and focus styling.

### REMOVED
- Nothing.

## 10. Approach Options

| | **Option 1 — Query params on the route** | **Option 2 — Service state, then navigate** (recommended) | **Option 3 — Router state / `NavigationExtras`** |
| --- | --- | --- | --- |
| How | `/project-detail/:id?indicator-codes=3` read by a resolver | Call the C1-1 seeder, then `router.navigate(['/project-detail', id])` | Pass the filter in `state`, read via `history.state` |
| Shareable / reloadable | **Yes** — the filtered view survives a refresh and can be pasted to a colleague | No — reload drops the filter | No |
| Fits existing code | Needs new param parsing; `initializeProjectDashboardResultsTable` is state-based | **Matches the existing pattern exactly** | Alien to the codebase |
| Risk of desync | Two sources of truth (URL + service signals) | One | One, but invisible |
| Effort | Higher | Lowest | Low |

**Recommended: Option 2**, because `ResultsCenterService` already owns filter state and already exposes a project-scoped seeder — Option 2 is one more method on a proven path, and the results-center state is signal-based, not URL-derived, so Option 1 would introduce a second source of truth for the same filters.

**Flagging the trade-off honestly:** Option 2 gives up shareable filtered URLs, and a browser refresh on the results tab drops the drill-down filter. If shareable deep links matter to the requester, Option 1 is the right answer and the effort is worth it — this is a product call, recorded as **C1-OQ1** rather than silently decided.

## 11. Risks, Dependencies, And Open Questions

| ID | Item |
| --- | --- |
| **C1-R1** | Umbrella **R-7**, largely de-risked: chips already exist. Residual risk is C1-1 — seeding `resultsFilter` without `tableFilters` produces a table that **is** filtered with **no chip explaining why**, which is exactly the trap. Covered by C1-SC2. |
| **C1-R2** | **Mixed affordance.** After this chunk, 3 of 7 cards are clickable and 4 are not (~13 of 17 after Chunk B). Users will click the inert ones and conclude the feature is broken. Mitigation: distinct hover/cursor only on clickable rows, and consider a short-lived note in the section header. This is the strongest argument for scheduling C2 rather than shelving it. |
| **C1-R3** | *Results by status* is the one chart whose data source **moves** in Chunk B (D-6). If C1 lands before B, the status click handler reads `statusChartItems()`; after B it reads the payload. Ordering A → B → C1 (umbrella §7) avoids reworking it — a reason not to reorder C1 ahead of B despite C1's higher RICE. |
| **C1-R4** | Navigating away from the dashboard discards Chunk A's per-card expansion state (D-2). Acceptable; noted so it is not filed as a bug. |
| **C1-D1** | Depends on **Chunk A**. Best scheduled **after Chunk B** per C1-R3. |
| **C1-OQ1** | Shareable/deep-linkable filtered URLs — worth the extra effort (Option 1), or is service-state navigation (Option 2) enough? Default: **Option 2**. |
| **C1-OQ2** | On arrival, does the drill-down filter **replace** the results tab's existing filters or **merge** with them? Default: **replace**, matching `initializeProjectDashboardResultsTable`'s reset-then-set behaviour, so the user sees exactly what they clicked. |
| **C1-OQ3** | Does the *Results by indicator* click use `indicator-codes` or the tab-scoped `indicator-codes-tabs` / `indicator-codes-filter`? The service distinguishes three indicator fields; picking the wrong one filters silently differently. Resolve against `results-center.service.ts` in design. |

## 12. Success Criteria

Umbrella SC-5, SC-7, SC-8 apply. Chunk-specific:

| ID | Criterion |
| --- | --- |
| C1-SC1 | Clicking an item in each of the three charts lands on `/project-detail/:id` with the table showing only matching results. |
| C1-SC2 | Per C1-R1: the applied filter is **visible as a chip**, and `removeFilter` clears it and refetches — asserted as a round-trip, not just as "the filter was set". |
| C1-SC3 | Clickable rows are reachable and activatable by keyboard, with an accessible name identifying the value (C-4). |
| C1-SC4 | Non-clickable cards expose no interactive affordance (no pointer cursor, no hover highlight, no focusable row). |
| C1-SC5 | Per C1-OQ2: arriving with a drill-down filter leaves no stale filter from a previous results-tab visit. |
| C1-SC6 | `npm test` + `npm run lint` pass; client coverage floors held. |

## 13. Next Step

Schedule **after Chunk B** (see C1-R3), even though RICE ranks it higher.

```text
/akili-specify project-dashboard/chart-drilldown
```

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
