# Requirements — project-detail / Project Dashboard v3 · F1 Hero, Layout & Interactivity

- **Module:** client / project-detail (STAR)
- **Spec id:** 2026-08-project-dashboard-v3-f1
- **Status:** draft
- **Owner:** JuanCode
- **Parent Spec:** `changes/project-dashboard-v3` (`../family.md`, child 1 of 4; depends on none)
- **Linked PRD section:** [`docs/prd.md`](../../../../prd.md) (STAR analytics / project dashboard)
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Extends:** archived `2026-08-22-changes--project-dashboard-redesign`, `--dashboard-advanced-analytics` (layout decisions superseded here are recorded in `design.md` §12 and synced to `docs/ux-ui/design.md` §12.2 at archive)
- **Last updated:** 2026-08-23

---

## 1. Context

The Project Dashboard renders correct data with a fragmented surface: project context appears twice (shell header + `app-project-context-strip`), 3 of 4 KPI tiles are inert, high-value charts sit in the narrow grid column while often-empty top-N cards occupy the wide one, empty widgets render full-size boxes, and spacing is inconsistent. F1 is a **client-only recomposition**: same endpoints, same payloads, same data — reorganized, interactive, and free of duplicates. Endpoint consolidation (F2), per-indicator analytics (F3), and new metrics (F4) are sibling specs in this family.

**Not changing:** consumed endpoints and payload shapes; the Project Results tab; the results table; the AI grounding workflow; any server code.

## 2. Requirement numbering

`R-HL-NNN` (Hero-Layout). Avoids collision with archived `R-PD-*` / `R-DA-*`.

---

## 3. Functional requirements

### R-HL-001 — Unified hero: every context fact rendered exactly once

- **As a** Principal Investigator
- **I want** one hero block with the project's identity, KPIs, and context
- **So that** I understand project state in one glance without reading duplicated panels

**Details:**
- The shell header and the dashboard's context strip merge into a single hero region: identity row (agreement id, title, department, status/pool-funding tags), KPI row (the 4 existing tiles), context chip row (total budget, center budget, funding type, timeline progress with start/end/extension, lever, foundress, division, unit, SDGs, CGIAR entities), contacts aside.
- `app-project-context-strip` is removed as a separate dashboard section; its unique content (center budget, funding type, SDGs, entities, timeline bar) moves into the hero.
- Each fact declares one source: identity/dates/lever/donor/division/unit from `GET results/count` (`GetProjectDetailService`); center budget / funding type / SDGs / entities from the `findOneContract` payload; contacts from `contract-staff`.
- The compact caveat line (with its existing "Learn more" expansion) renders below the hero, single-line at rest.

#### Scenario: No duplicated facts
- GIVEN a project with budget, dates, and status populated
- WHEN the Project Dashboard tab renders
- THEN budget, start date, end date, extension date, funding type, and contract status each appear exactly once on the page
- AND the SDG and CGIAR-entity chips appear exactly once
- BUT it must NOT drop any fact currently displayed by either block (field inventory in `design.md` §5 is the checklist)
- AND IT MUST render a per-region skeleton while each source loads (three sources load independently)

### R-HL-002 — All four KPI tiles are actionable

- **As a** PI or research assistant
- **I want** the headline numbers to take me to their underlying records
- **So that** the dashboard is an entry point, not a dead end

**Details:**
- **Total results** → navigates to the Project Results tab of the same project.
- **Indicators covered** → opens a popover listing each indicator with results (name + count), each row navigating to Project Results pre-filtered by that indicator (`indicatorTab` query param, existing contract).
- **Pending revision** → keeps the existing in-page anchor to the pending-revision table.
- **Partner institutions** → smooth-scrolls to the partners widget (reduced-motion → instant).

#### Scenario: Total results drill-through
- GIVEN a project with N ≥ 0 results
- WHEN the user activates the Total results tile
- THEN the router navigates to `/project-detail/<contractId>/project-results`
- AND IT MUST be a real `<a>`/`<button>` element, keyboard-reachable with visible focus and an accessible name naming the destination
- BUT it must NOT trigger while the tile is in loading/skeleton state

#### Scenario: Indicators-covered popover
- GIVEN a project with 4 of 6 indicator types covered
- WHEN the user opens the Indicators covered tile
- THEN a popover lists exactly the 4 indicators with results, each with its count
- AND selecting one navigates to Project Results with that indicator pre-applied
- AND IT MUST trap focus per the shared overlay behavior and close on Escape
- BUT it must NOT list indicators with zero results

### R-HL-003 — Sections ordered by decision value

- **As a** PI
- **I want** progress and composition charts before ranking widgets
- **So that** the most decision-relevant information is above the fold

**Details:** render order after the hero: (1) Executive Overview (when data), (2) Results over time + Results by status side by side, (3) Results by indicator (wide; an empty layout slot for F3's deep-dive is reserved in the design, not rendered), (4) Geographic scope full-width, (5) Top partners / primary levers / main contacts + SP alignment (bilateral only), (6) Pending revision table, (7) "No data yet" collapsed group (R-HL-004), (8) AI Grounding & Setup (admins).

#### Scenario: Order on a bilateral project
- GIVEN a bilateral project with results in several years
- WHEN the dashboard renders
- THEN the trend and status sections appear before any top-N ranking widget
- AND the geographic section spans the full content width
- BUT it must NOT render any placeholder box for the reserved F3 slot
- AND IT MUST keep the pending-revision table anchor functional from the KPI tile

### R-HL-004 — Empty widgets collapse to a "No data yet" group

- **As a** PI viewing a young or bilateral project
- **I want** widgets without data out of the way, with the reason stated
- **So that** prime screen space always shows information

**Details:**
- An analytics widget whose dataset is empty (post-load, no error) does not render its full card. It contributes one compact row to a "No data yet" group rendered after the pending-revision table: widget name + one-line reason (e.g. Top contributing projects → "No other projects contribute to this one yet").
- Applies to: top partners, top primary levers, top main contacts, top contributing projects, geographic scope, results over time (zero year buckets), results by indicator (zero results), results by status (zero buckets), SP alignment (bilateral with zero alignments).
- Loading and error states keep today's in-place presentation (skeleton / retry) in the widget's normal position; only the confirmed-empty state collapses.
- "Results over time" with exactly one year bucket is **not** empty: it renders in place using its existing single-year compact presentation.

#### Scenario: Bilateral with no contributors
- GIVEN a project where `top-contributors-contracts` returns `[]`
- WHEN the dashboard finishes loading
- THEN no full-size "Top contributing projects" card renders
- AND the "No data yet" group lists it with its reason
- BUT it must NOT collapse a widget while it is loading or in error state
- AND IT MUST re-expand the widget into its normal position if a retry later yields data

### R-HL-005 — Top-N widgets render via viz-chart with drill-through where a filter exists

- **As a** PI
- **I want** the ranking widgets to be real charts with navigation
- **So that** they match the rest of the dashboard and lead to the records behind them

**Details:**
- Top partners, top primary levers, top main contacts, and top contributing projects render through `app-viz-chart` (horizontal bar form) with a `tableModel`, replacing the bespoke HTML bar layouts.
- Drill-through, mapped to filters the results table actually supports (`tableFilters`: indicators, statusCodes, sources, years, contracts, levers):
  - **Primary lever bar click** → Project Results with that lever filter applied.
  - **Contributing project bar click** → Project Results with that contract filter applied.
  - **Partner and contact bars** → no navigation in F1 (no matching table filter exists); they expose tooltips and the accessible table only. Recorded as an accepted gap; F2+ may add filters.
- Lever icons and contact e-mails currently shown must survive (tooltip or axis-label affordance decided in design).

#### Scenario: Lever drill-through
- GIVEN a project whose results span two primary levers
- WHEN the user clicks the bar of one lever
- THEN the router navigates to Project Results with that lever pre-filtered
- AND IT MUST also be achievable via keyboard (chart click handler paired with the accessible table/row links)
- BUT partner and contact bars must NOT navigate anywhere in F1

### R-HL-006 — Trend and status charts are interactive

**Details:**
- Results over time: clicking a year point navigates to Project Results filtered by that report year (`years` filter).
- Results by status: composition-bar segments become interactive with the same target as the existing row links (`statusTab` param); rows keep their current behavior.

#### Scenario: Year drill-through
- GIVEN a trend chart with years 2024–2026
- WHEN the user clicks the 2025 point
- THEN the router navigates to Project Results filtered to report year 2025
- AND IT MUST keep the chart's accessible table as the non-visual path
- BUT it must NOT navigate on hover or on axis-label clicks

### R-HL-007 — Native bars↔heatmap morph enabled

**Details:** `useCrossfadeFallback` defaults to `false`; the ECharts `universalTransition` morph runs on view toggle. Under `prefers-reduced-motion` the crossfade fallback (or no-animation swap) is used — the fallback code path is retained, not deleted.

#### Scenario: Toggle with motion allowed
- GIVEN a user without reduced-motion preference
- WHEN they toggle Bars → Heatmap
- THEN a single chart instance morphs between series (no destroy/recreate flicker)
- BUT it must NOT animate when `prefers-reduced-motion: reduce` is set
- AND IT MUST keep both views' click drill-through working after the toggle

### R-HL-008 — Spacing and container normalization

**Details:** one spacing scale across the dashboard: `gap-5` between sections, `p-5` card padding, `gap-4` within widgets; the geo-scope card's internal `gap-16` becomes `gap-6`; card radii/shadows unified (`rounded-xl`, `shadow-xs`). Token utilities / `var(--ac-*)` only — no hex literals (client guide).

#### Scenario: Geo card internals
- GIVEN the geographic scope card with regions, countries, and sub-national lists
- WHEN it renders at desktop width
- THEN the three ranking lists sit at `gap-6`, not `gap-16`
- AND IT MUST introduce no horizontal page scroll at 1280px or 768px widths

### R-HL-009 — Accessibility and theming parity on every changed region

**Details:** every recomposed region keeps: an accessible name; drill-through elements as real `<a>`/`<button>` with visible focus; non-color-alone encoding; light + dark correctness via tokens; `tableModel` on every viz-chart instance. WCAG 2.1 AA holds on changed screens (PRD C-4).

#### Scenario: Keyboard traversal of the hero
- GIVEN a keyboard-only user on the dashboard
- WHEN they tab through the hero
- THEN every KPI action and popover row is reachable in a logical order with visible focus
- AND IT MUST announce counts and destinations via accessible names
- BUT it must NOT expose any information via `title` attribute alone

---

## 4. Non-functional requirements

### NFR-HL-001 — No new network cost
- **Category:** performance
- **Target:** the dashboard issues the same HTTP requests as today (same endpoints, same counts); no additional request introduced by F1.
- **How verified:** count requests in the network panel during the T-final HITL pass against the pre-change count (11 inventory, `proposal.md` §3 context).

### NFR-HL-002 — Bundle budgets hold
- **Category:** performance
- **Target:** `angular.json` budgets green (initial ≤ 2 MB warn / 3 MB error; component styles ≤ 4 kB warn / 8 kB error); no new chart types registered in F1.
- **How verified:** `npm run build` output (budgets fail the build when exceeded).

### NFR-HL-003 — Coverage floors hold
- **Category:** dx
- **Target:** statements 40 / branches 20 / lines 45 / functions 30 (project-wide floors) stay green; changed components keep co-located specs current.
- **How verified:** `npm run test:coverage` summary.

## Defect classes and their gates

| Defect class F1 can produce | Gate that catches it | Blind spot handling |
|---|---|---|
| Broken computed/signal logic, wrong navigation extras | `npm test -- --silent` — specs assert `Router.navigate` args and query params on the **transition** the product performs (KZ-015: construct initial state, assert negative, then act) | Mock fixtures MUST mirror live payload shapes (KZ-001 — the SDG `[object Object]` escape) |
| Template/type errors in app code | `npm run build` (strictTemplates) | Cannot see `*.spec.ts` |
| Type errors in spec code | `npx tsc -p tsconfig.spec.json --noEmit` | Gate against the **945-error baseline** (K-002) — compare delta, not zero |
| Lint violations | `npx eslint <changed paths>` | `npm run lint` is `--fix` and MUST NOT be cited as a gate (K-001) |
| **Visual/layout/contrast/dark-mode defects, morph rendering** | **No automated gate exists** — jsdom cannot measure layout, contrast, or animation | **Substituted:** mandatory HITL visual verification (light + dark, desktop + `md:` breakpoint) at the final task, per KZ-014 — no `[x]` without the screenshots seen. Presence assertions (classes/options in DOM) are recorded as presence only |
| Empty-collapse misclassification (loading treated as empty) | Component specs arranging load→empty and load→data transitions (KZ-015) | — |
| Regressions in co-rendered shared components (results-center-table, custom-tag, section-sidebar) | KZ-002 scope rule: their rendering on this route is part of the HITL pass checklist | — |

## 5. Data requirements

None. No entities, migrations, or OpenSearch changes.

## 6. API surface delta

None. F1 consumes today's endpoints unchanged (inventory: proposal §3 / family analysis artifact).

## 7. Cross-system impact

None outside STAR client. Server untouched. Family linkage: F2 depends on this spec's final component structure.

## 8. Assumptions, dependencies, risks

- **A-1:** `findOneContract` payload (funding type, center budget, SDGs, entities) remains available to the hero exactly as the context strip consumes it today.
- **R-1 (risk):** merging header + strip crosses the shell/tab boundary (`project-detail.component` owns the header; the dashboard tab owns the strip). Mitigation: design must place the hero ownership explicitly and keep the Project Results tab unaffected.
- **R-2 (risk):** morph enablement re-activates a shipped-but-dormant code path; its specs currently pin the fallback. Mitigation: R-HL-007 scenario + HITL.
- **KZ-013:** archived specs' layout decisions are superseded — design.md must record deltas; no doc may keep citing the strip as current.

## 9. Open questions

- **OQ-1 (closed in this draft):** partner/contact drill target → **no navigation in F1** (no table filter exists); accepted gap, revisit in F2+. Owner: JuanCode.
- **OQ-2:** popover component choice (PrimeNG `popover` vs existing overlay pattern) — resolve in design (owner: design phase, due at Phase 2).

## 10. Sign-off

- [ ] Engineering lead — JuanCode
- [ ] MEL / product owner — —
