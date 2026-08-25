# Requirements — Changes / Dashboard Chart Refinements

- **Module:** changes (agresso server + project-dashboard client)
- **Spec id:** 2026-08-dashboard-chart-refinements
- **Status:** draft
- **Owner:** J. Cadavid / bilateral-visual-improvements
- **Linked PRD section:** docs/prd.md — project analytics; docs/ux-ui/design.md — dashboard visualizations
- **Linked proposal:** ./proposal.md (approved intent, 2026-08-25)
- **Depth:** Standard · **Approval Mode:** gated · **Type:** Change
- **Last updated:** 2026-08-25

---

## 1. Executive Summary

Two chart-quality changes on the project dashboard: (1) the Science Program Alignments panel replaces its illegible force-graph with a **Sankey** of result flows Levers → Science Programs (+ Unaligned), backed by one new degradable server sub-report (`lever_sp_flows`); (2) the geographic-scope card unifies its color encoding — the Top Regions / Top Countries bars adopt the map's **value-mapped sequential ramp** — and fixes two visible defects (axis-label collision, help-button overlap). Top primary levers explicitly stays as bars (owner decision, proposal §2).

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Flow / link | A (lever → SP) pair weighted by the count of primary-contract results carrying both |
| Unaligned | A primary-contract result with a primary lever but no active SP alignment |
| Sequential ramp | The ordered `--ac-viz-*` ramp token family validated by `npm run tokens:validate` |
| Value-mapped | Color chosen by normalized magnitude (value / max), not by rank position |

## 3. System Context & Scope

- **Server:** `agresso-contract` module — one new sub-report inside the existing `GET /api/agresso/contracts/reports/dashboard` aggregation. Read-only SQL over existing tables (`result_levers`, `result_pool_funding_alignment(_sp)`, `clarisa_levers`, `clarisa_science_programs`). No schema change, no migration.
- **Client:** `sp-alignment-graph` (rendering swap), `geo-scope-card` (colors + defects), `viz-chart` (Sankey module registration), chart color constants.
- **Out of scope:** Top primary levers card (stays as bars); Executive Overview feature; the concurrent `chart-explainers` spec's surfaces; map projection/zoom.

## 4. Stakeholders / Personas

Dashboard viewers (project leads, program assistants, admins) reading strategic alignment and geographic reach; the AI-context builder is NOT a consumer of the new block (explicitly out of scope).

## 5. Functional Requirements

### R-DCR-001 — Server: `lever_sp_flows` block on the dashboard report

The dashboard report SHALL include a `lever_sp_flows` block describing, for the contract's primary results, how many results flow from each primary lever to each Science Program, plus each lever's unaligned remainder.

#### Scenario: Mapped flows

- GIVEN contract D514 with primary results carrying primary levers and active SP alignments
- WHEN `GET /api/agresso/contracts/reports/dashboard?contract-id=D514` is called
- THEN `data.lever_sp_flows` contains `links[]` of `{ lever_id, lever_short_name, lever_full_name, sp_code | null, sp_name | null, count }`
- AND one link per lever with `sp_code: null` carries that lever's unaligned result count (owner-confirmed OQ-2: Unaligned is per-lever, not a single sink)
- AND IT MUST count each (result, lever, SP) combination once — a result aligned to two SPs contributes to two links, and the block carries `results_total` and `results_with_alignment` so consumers can state the sum-vs-total relationship honestly
- BUT it must NOT alter any existing block of the report or its consumers.

#### Scenario: Degrade

- GIVEN the sub-report query fails
- WHEN the endpoint is called
- THEN `lever_sp_flows` is `null` and an entry is appended to the report's `errors[]`, exactly like the existing seven sub-reports
- BUT the HTTP status must NOT change and no other block may be affected.

### R-DCR-002 — Client: Sankey rendering in SP Alignments

The SP Alignments panel SHALL render `lever_sp_flows` as a left→right Sankey (lever nodes → SP nodes + per-lever Unaligned links), replacing the force-graph.

#### Scenario: Render

- GIVEN a dashboard report with non-empty `lever_sp_flows.links`
- WHEN the panel renders
- THEN a Sankey shows lever nodes (short names, full name on hover/tooltip) on the left, SP nodes + "Unaligned" on the right, link width proportional to `count`
- AND the existing aligned/unaligned header chips remain
- AND a `tableModel` alternative exposes the same links for accessibility (as every viz-chart does)
- AND IT MUST cap rendered links to the top 12 by count, folding the remainder into per-side "Other" nodes with an on-panel note of how many were folded (K-014: silent truncation is banned — the cap must be visible)
- BUT it must NOT render the old force-graph anywhere.

#### Scenario: Drill-through

- GIVEN a rendered Sankey
- WHEN the user clicks a link or node
- THEN navigation targets the results list filtered consistently with the dashboard's existing chart click-through pattern
- BUT clicks on "Unaligned" nodes/links must NOT navigate to a broken filter — they either apply a valid "no SP alignment" filter or are explicitly non-interactive with no pointer affordance.

#### Scenario: Empty / loading / error

- GIVEN `lever_sp_flows` is null, empty, or still loading
- WHEN the panel renders
- THEN it shows the card's existing loading/empty/error states (including Retry on error)
- AND IT MUST treat `links: []` (no levers at all) as empty, not as error.

### R-DCR-003 — Client: geo bars adopt the map's sequential value ramp

Top Regions and Top Countries bars SHALL be colored by the same sequential ramp the choropleth uses, mapped by value share (value / max within the list), so equal magnitudes read as equal colors across map and bars.

#### Scenario: Correspondence

- GIVEN Kenya is the darkest country on the map
- WHEN the Top Countries bars render
- THEN Kenya's bar uses the darkest ramp step and lower values use proportionally lighter steps, in both light and dark themes (token-resolved, never hex)
- AND IT MUST keep bar value labels readable against every ramp step used (contrast-checked at the visual gate)
- BUT rank-based coloring (`projectDashboardBarColor`) must NOT remain in this card.

### R-DCR-004 — Client: geo card defect fixes

#### Scenario: Axis labels

- GIVEN Top Regions / Top Countries bars with 2-digit and 3-digit values
- WHEN the card renders at common widths (1280–1920px) and narrow (768px)
- THEN x-axis tick labels never collide/overlap (fewer ticks, or hidden axis with value labels on bars)
- AND IT MUST hold for the max-value case observed (3-digit counts).

#### Scenario: Help buttons

- GIVEN the "?" help affordances on the card
- WHEN the card renders
- THEN no help button overlaps bars, labels, or values at any supported width
- BUT the help content/behavior must NOT change.

### R-DCR-005 — Accessibility, tokens, budgets

- All new/changed colors via `var(--ac-*)` tokens only (no hex); both themes.
- Sankey nodes/links carry accessible names via the tableModel alternative; interactive elements keep focus visibility.
- The echarts Sankey module SHALL load inside the lazy project-dashboard chunk; initial bundle budgets (C-5) MUST hold.

## 6. Non-Functional Requirements

- **NFR-1 (resilience):** the new block is best-effort; its failure never degrades the other seven blocks (inherits the `Promise.allSettled` contract).
- **NFR-2 (performance):** the new SQL is one aggregation per dashboard call over indexed FKs; no N+1, no client-side join over raw results.
- **NFR-3 (test floors):** server 60% / client 40-20-45-30 hold on touched files.

## 7. Defect classes → gates (mandatory mapping)

| Defect class | Gate that catches it | Named failing input |
| --- | --- | --- |
| Wrong SQL aggregation (bad join, double-count, missing unaligned remainder) | Server unit tests on the repository method with seeded fixture rows asserting exact link counts; **plus live HTTP check against dev DB on a known contract (D514/A631) comparing to hand-computed expectations** | A fixture where one result has 2 SPs — a naive count-by-result returns 1 link count where 2 links are correct |
| Degrade contract broken | Integration spec (K-021 scope) forcing the sub-report to reject → block null + errors entry, others intact | Reject injected into the flows promise; test fails if HTTP status changes or sibling block nulls |
| Malformed Sankey option (nodes/links/cap) | Unit tests asserting the EMITTED echarts option object (KZ-001 — the product, not call sequences) incl. the top-12 cap + "Other" fold and the folded-count note | 13 links in fixture — test fails if 13 render or no note appears |
| Broken drill-through filter | Unit test on the click handler's navigation args; **Unaligned-click** negative case | Click on Unaligned link asserting no invalid-filter navigation |
| Color mismatch map↔bars, theme regressions, label contrast | **Not automatable in jsdom (structurally cannot evaluate rendered color/contrast).** Substitute: HITL visual pass with owner screenshots at the final task, both themes — same workflow that closed prior specs. `npm run tokens:validate` covers ramp monotonicity only | A screenshot where Kenya's bar hue ≠ its map fill family |
| Axis/help overlap regressions | jsdom cannot measure layout — HITL visual pass (same gate as above); unit tests only assert the config emitted (tick count / axis hidden / positioning class) with the presence-assertion limitation recorded | Screenshot at 768px width with 3-digit values |
| Bundle budget breach | `npm run build` — budgets error at 3MB initial (gate proven able to fail by config); plus lazy-chunk placement check via build stats naming the chunk containing the Sankey module | SankeyChart imported eagerly in a shared module — build stats show it in the initial bundle |

Accepted risk (recorded, unsubstituted): per-pixel Sankey label legibility at extreme node counts beyond the cap — mitigated by the cap itself.

## 8. Requirement ID Index

| ID | Title | Tasks |
| --- | --- | --- |
| R-DCR-001 | Server lever_sp_flows block | tasks.md |
| R-DCR-002 | Sankey rendering + drill-through + states | tasks.md |
| R-DCR-003 | Geo bars value-ramp unification | tasks.md |
| R-DCR-004 | Geo card defect fixes | tasks.md |
| R-DCR-005 | A11y, tokens, budgets | tasks.md |
